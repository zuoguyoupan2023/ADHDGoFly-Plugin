// content/storage/enhanced-cache-manager.js
/**
 * 增强缓存管理器 - 支持分层存储和多语言增量更新
 * 核心原则：存储功能不影响基本高亮功能
 */
class EnhancedCacheManager {
  constructor() {
    this.dbName = 'ADHDHighlightCache';
    this.version = 2; // 升级版本支持分层存储
    this.db = null;
    this.fallbackMode = false; // 降级模式标志
    this.cacheEnabled = true; // 缓存功能开关
    this.cacheRetentionDays = 7; // 默认缓存保留天数
    
    // 支持的语言列表
    this.supportedLanguages = ['zh', 'en', 'ja', 'es', 'fr', 'ru'];
    
    // 加载用户设置
    this.loadSettings().then(() => {
      // 初始化数据库
      this.initDatabase().catch(error => {
        console.warn('缓存数据库初始化失败，启用降级模式:', error);
        this.enableFallbackMode();
      });
    });
    
    // 监听设置变更
    this.setupSettingsListener();
  }

  /**
   * 加载用户存储设置
   */
  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get({
        cacheEnabled: true,
        cacheRetentionDays: 7
      });
      
      this.cacheEnabled = settings.cacheEnabled;
      this.cacheRetentionDays = settings.cacheRetentionDays;
      
      console.log('缓存设置已加载:', { 
        enabled: this.cacheEnabled, 
        retentionDays: this.cacheRetentionDays 
      });
    } catch (error) {
      console.warn('加载缓存设置失败，使用默认值:', error);
    }
  }

  /**
   * 设置监听器，响应设置变更
   */
  setupSettingsListener() {
    // 监听来自设置页面的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'storageSettingsChanged') {
        this.updateSettings(message.data);
      }
    });
  }

  /**
   * 更新缓存设置
   */
  async updateSettings(newSettings) {
    if (newSettings.hasOwnProperty('cacheEnabled')) {
      this.cacheEnabled = newSettings.cacheEnabled;
    }
    if (newSettings.hasOwnProperty('cacheRetentionDays')) {
      this.cacheRetentionDays = newSettings.cacheRetentionDays;
    }
    
    console.log('缓存设置已更新:', { 
      enabled: this.cacheEnabled, 
      retentionDays: this.cacheRetentionDays 
    });
    
    // 如果缓存被禁用，清理现有缓存
    if (!this.cacheEnabled) {
      await this.clearAllCache();
    }
  }

  /**
   * 初始化数据库结构 - 分层存储设计
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 页面基础信息表
        if (!db.objectStoreNames.contains('pages')) {
          const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
          pageStore.createIndex('url', 'url', { unique: false });
          pageStore.createIndex('domain', 'domain', { unique: false });
          pageStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
        
        // 分语言高亮数据表
        if (!db.objectStoreNames.contains('highlights')) {
          const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
          highlightStore.createIndex('pageId', 'pageId', { unique: false });
          highlightStore.createIndex('language', 'language', { unique: false });
          highlightStore.createIndex('pageLanguage', ['pageId', 'language'], { unique: false });
        }
        
        // 语言配置状态表
        if (!db.objectStoreNames.contains('languageStates')) {
          const langStore = db.createObjectStore('languageStates', { keyPath: 'id' });
          langStore.createIndex('pageId', 'pageId', { unique: false });
        }
      };
    });
  }

  /**
   * 启用降级模式 - 确保核心功能不受影响
   */
  enableFallbackMode() {
    this.fallbackMode = true;
    this.cacheEnabled = false;
    console.log('缓存功能已降级，核心高亮功能正常运行');
  }

  /**
   * 检查缓存是否可用
   */
  isCacheAvailable() {
    return this.cacheEnabled && !this.fallbackMode && this.db;
  }

  /**
   * 插件启动时的缓存恢复
   */
  async restoreOnStartup(url, enabledLanguages) {
    if (!this.isCacheAvailable()) {
      return { success: false, reason: 'cache_disabled' };
    }

    try {
      const pageId = await this.generatePageId(url);
      const pageData = await this.getFromStore(
        this.db.transaction(['pages'], 'readonly').objectStore('pages'),
        pageId
      );

      if (!pageData || this.isExpired(pageData)) {
        return { success: false, reason: 'no_cache_or_expired' };
      }

      // 获取可用的缓存语言
      const cachedLanguages = await this.getCachedLanguages(pageId);
      const availableLanguages = enabledLanguages.filter(lang => 
        cachedLanguages.includes(lang)
      );

      if (availableLanguages.length === 0) {
        return { success: false, reason: 'no_matching_languages' };
      }

      // 应用缓存的高亮
      const highlights = await this.applyCachedHighlights(pageId, availableLanguages);
      
      return {
        success: true,
        highlights,
        cachedLanguages: availableLanguages,
        missingLanguages: enabledLanguages.filter(lang => 
          !availableLanguages.includes(lang)
        )
      };
    } catch (error) {
      console.error('缓存恢复失败:', error);
      return { success: false, reason: 'error', error };
    }
  }

  /**
   * 存储页面高亮数据 - 按语言分层存储
   */
  async storePageHighlights(url, language, highlightData, pageFingerprint) {
    if (!this.isCacheAvailable()) {
      return false;
    }

    try {
      const pageId = await this.generatePageId(url);
      
      // 更新或创建页面基础信息
      await this.upsertPageInfo(pageId, url, pageFingerprint);
      
      // 存储特定语言的高亮数据
      await this.storeLanguageHighlights(pageId, language, highlightData);
      
      console.log(`页面 ${url} 的 ${language} 语言高亮已缓存`);
      return true;
    } catch (error) {
      console.error('存储高亮数据失败:', error);
      return false;
    }
  }

  /**
   * 增量处理新启用的语言
   */
  async processIncrementalLanguage(url, newLanguage, highlightData) {
    if (!this.cacheEnabled) return false;
    
    try {
      const pageId = await this.generatePageId(url);
      
      // 检查页面是否已缓存
      const pageExists = await this.pageExists(pageId);
      if (!pageExists) {
        console.log('页面未缓存，执行完整处理');
        return false;
      }
      
      // 检查该语言是否已处理
      const languageExists = await this.languageExists(pageId, newLanguage);
      if (languageExists) {
        console.log(`${newLanguage} 语言已缓存，跳过处理`);
        return true;
      }
      
      // 存储新语言的高亮数据
      await this.storeLanguageHighlights(pageId, newLanguage, highlightData);
      await this.updateLanguageState(pageId, newLanguage, true);
      
      console.log(`增量添加 ${newLanguage} 语言高亮数据`);
      return true;
      
    } catch (error) {
      console.warn('增量处理失败:', error);
      return false;
    }
  }

  /**
   * 获取页面的缓存状态和可用语言
   */
  async getPageCacheStatus(url, requestedLanguages) {
    if (!this.cacheEnabled) {
      return {
        cached: false,
        availableLanguages: [],
        missingLanguages: requestedLanguages,
        needsFullProcessing: true
      };
    }
    
    try {
      const pageId = await this.generatePageId(url);
      const cachedLanguages = await this.getCachedLanguages(pageId);
      const missingLanguages = requestedLanguages.filter(lang => !cachedLanguages.includes(lang));
      
      return {
        cached: cachedLanguages.length > 0,
        availableLanguages: cachedLanguages,
        missingLanguages,
        needsFullProcessing: cachedLanguages.length === 0,
        needsIncrementalProcessing: missingLanguages.length > 0 && cachedLanguages.length > 0
      };
      
    } catch (error) {
      console.warn('获取缓存状态失败:', error);
      return {
        cached: false,
        availableLanguages: [],
        missingLanguages: requestedLanguages,
        needsFullProcessing: true
      };
    }
  }

  /**
   * 应用缓存的高亮数据到页面
   */
  async applyCachedHighlights(pageId, languages) {
    if (!this.cacheEnabled) return [];
    
    try {
      const allHighlights = [];
      
      for (const language of languages) {
        const highlights = await this.getLanguageHighlights(pageId, language);
        if (highlights) {
          allHighlights.push(...highlights);
        }
      }
      
      // 按位置排序，确保正确的DOM应用顺序
      allHighlights.sort((a, b) => {
        if (a.position.top !== b.position.top) {
          return a.position.top - b.position.top;
        }
        return a.position.left - b.position.left;
      });
      
      return allHighlights;
      
    } catch (error) {
      console.warn('应用缓存高亮失败:', error);
      return [];
    }
  }

  /**
   * 清理特定语言的缓存（当词典被禁用时）
   */
  async clearLanguageCache(url, language) {
    if (!this.cacheEnabled) return;
    
    try {
      const pageId = await this.generatePageId(url);
      
      // 删除该语言的高亮数据
      await this.deleteLanguageHighlights(pageId, language);
      
      // 更新语言状态
      await this.updateLanguageState(pageId, language, false);
      
      console.log(`已清理 ${language} 语言缓存`);
      
    } catch (error) {
      console.warn('清理语言缓存失败:', error);
    }
  }

  // ==================== 私有方法 ====================

  async generatePageId(url) {
    const normalizedUrl = this.normalizeUrl(url);
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedUrl);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // 移除查询参数和片段标识符
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  async upsertPageInfo(pageId, url, fingerprint) {
    const transaction = this.db.transaction(['pages'], 'readwrite');
    const store = transaction.objectStore('pages');
    
    const existingPage = await this.getFromStore(store, pageId);
    const now = Date.now();
    
    const pageData = {
      id: pageId,
      url: this.normalizeUrl(url),
      domain: new URL(url).hostname,
      fingerprint,
      createdAt: existingPage ? existingPage.createdAt : now,
      lastAccessed: now,
      accessCount: existingPage ? existingPage.accessCount + 1 : 1
    };
    
    await this.putToStore(store, pageData);
  }

  async storeLanguageHighlights(pageId, language, highlightData) {
    const transaction = this.db.transaction(['highlights'], 'readwrite');
    const store = transaction.objectStore('highlights');
    
    const highlightRecord = {
      id: `${pageId}_${language}`,
      pageId,
      language,
      data: highlightData,
      createdAt: Date.now(),
      size: JSON.stringify(highlightData).length
    };
    
    await this.putToStore(store, highlightRecord);
  }

  async getCachedLanguages(pageId) {
    const transaction = this.db.transaction(['highlights'], 'readonly');
    const store = transaction.objectStore('highlights');
    const index = store.index('pageId');
    
    const highlights = await this.getAllFromIndex(index, pageId);
    return highlights.map(h => h.language);
  }

  async getLanguageHighlights(pageId, language) {
    const transaction = this.db.transaction(['highlights'], 'readonly');
    const store = transaction.objectStore('highlights');
    
    const highlight = await this.getFromStore(store, `${pageId}_${language}`);
    return highlight ? highlight.data : null;
  }

  async languageExists(pageId, language) {
    const transaction = this.db.transaction(['highlights'], 'readonly');
    const store = transaction.objectStore('highlights');
    
    const highlight = await this.getFromStore(store, `${pageId}_${language}`);
    return !!highlight;
  }

  async pageExists(pageId) {
    const transaction = this.db.transaction(['pages'], 'readonly');
    const store = transaction.objectStore('pages');
    
    const page = await this.getFromStore(store, pageId);
    return !!page;
  }

  calculateMissingLanguages(requested, cached) {
    return requested.filter(lang => !cached.includes(lang));
  }

  isExpired(pageData) {
    const maxAge = this.cacheRetentionDays * 24 * 60 * 60 * 1000; // 使用用户设置的天数
    return (Date.now() - pageData.createdAt) > maxAge;
  }

  /**
   * 清理所有缓存数据
   */
  async clearAllCache() {
    if (!this.db) return false;

    try {
      const transaction = this.db.transaction(['pages', 'highlights'], 'readwrite');
      const pageStore = transaction.objectStore('pages');
      const highlightStore = transaction.objectStore('highlights');
      
      await Promise.all([
        new Promise((resolve, reject) => {
          const request = pageStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
        new Promise((resolve, reject) => {
          const request = highlightStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      ]);
      
      console.log('所有缓存数据已清理');
      return true;
    } catch (error) {
      console.error('清理缓存失败:', error);
      return false;
    }
  }

  // IndexedDB 操作辅助方法
  async getFromStore(store, key) {
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async putToStore(store, data) {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFromIndex(index, key) {
    return new Promise((resolve, reject) => {
      const request = index.getAll(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// 导出增强缓存管理器
window.EnhancedCacheManager = EnhancedCacheManager;