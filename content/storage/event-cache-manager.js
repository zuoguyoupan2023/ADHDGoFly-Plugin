// content/storage/event-cache-manager.js
/**
 * 事件监听式缓存管理器
 * 采用事件驱动模式，不拦截正常高亮流程，只在高亮完成后异步缓存数据
 */
class EventCacheManager {
  constructor() {
    this.dbName = 'ADHDEventCache';
    this.version = 1;
    this.db = null;
    this.cacheEnabled = true;
    this.cacheRetentionDays = 7;
    
    // 初始化数据库
    this.initDatabase().catch(error => {
      console.warn('⚠️ 事件缓存数据库初始化失败:', error);
      this.cacheEnabled = false;
    });
    
    // 加载缓存设置
    this.loadCacheSettings();
  }

  /**
   * 初始化数据库
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ 事件缓存数据库初始化成功');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 高亮缓存表
        if (!db.objectStoreNames.contains('highlights')) {
          const store = db.createObjectStore('highlights', { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('language', 'language', { unique: false });
          store.createIndex('urlLanguage', ['url', 'language'], { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * 存储高亮数据
   */
  async storeHighlightData(highlightData) {
    if (!this.cacheEnabled || !this.db) {
      console.log('📝 缓存未启用，跳过存储');
      return;
    }

    try {
      const url = window.location.href;
      const language = highlightData.language || 'unknown';
      
      const transaction = this.db.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      
      // 创建缓存记录
      const cacheRecord = {
        id: `${url}_${language}_${Date.now()}`,
        url: url,
        language: language,
        data: this.serializeHighlightData(highlightData),
        dictSignature: (highlightData && highlightData.dictSignature) ? highlightData.dictSignature : '',
        createdAt: Date.now(),
        size: JSON.stringify(this.serializeHighlightData(highlightData)).length
      };
      
      await this.putToStore(store, cacheRecord);
      
      if (window.__LOG_DEV_MODE) console.log('💾 高亮数据已缓存:', {
        url: url,
        language: language,
        size: cacheRecord.size,
        elementCount: highlightData.elements?.length || 0
      });
      
    } catch (error) {
      console.error('❌ 存储高亮数据失败:', error);
    }
  }

  /**
   * 序列化高亮数据，移除不可序列化的DOM元素
   */
  serializeHighlightData(highlightData) {
    if (!highlightData.elements) return highlightData;
    
    const serializedElements = highlightData.elements.map(element => ({
      content: element.content,
      language: element.language,
      className: element.className,
      position: element.position,
      styles: element.styles,
      metadata: element.metadata
    }));
    
    return {
      ...highlightData,
      elements: serializedElements
    };
  }

  /**
   * 获取所有匹配的缓存高亮数据
   */
  async getAllCachedHighlights(url, language) {
    if (!this.cacheEnabled || !this.db) return [];
    
    try {
      const transaction = this.db.transaction(['highlights'], 'readonly');
      const store = transaction.objectStore('highlights');
      const index = store.index('urlLanguage');
      
      const records = await this.getAllFromIndex(index, [url, language]);
      
      if (records.length === 0) return [];
      
      // 过滤掉过期的记录
      const validRecords = [];
      const cutoffTime = Date.now() - (this.cacheRetentionDays * 24 * 60 * 60 * 1000);
      
      for (const record of records) {
        if (record.createdAt > cutoffTime) {
          validRecords.push(record.data);
        } else {
          // 删除过期记录
          await this.deleteCacheRecord(record.id);
        }
      }
      
      if (validRecords.length > 0) {
        console.log(`🎯 找到 ${validRecords.length} 条有效缓存记录:`, {
          url: url,
          language: language,
          records: validRecords.length
        });
      }
      
      return validRecords;
      
    } catch (error) {
      console.warn('⚠️ 获取缓存数据失败:', error);
      return [];
    }
  }

  /**
   * 获取缓存的高亮数据（单条记录，保持向后兼容）
   */
  async getCachedHighlights(url, language) {
    if (!this.cacheEnabled || !this.db) return null;
    
    try {
      const transaction = this.db.transaction(['highlights'], 'readonly');
      const store = transaction.objectStore('highlights');
      const index = store.index('urlLanguage');
      
      const records = await this.getAllFromIndex(index, [url, language]);
      
      if (records.length === 0) return null;
      
      // 返回最新的记录
      const latestRecord = records.sort((a, b) => b.createdAt - a.createdAt)[0];
      
      // 检查是否过期
      const isExpired = (Date.now() - latestRecord.createdAt) > (this.cacheRetentionDays * 24 * 60 * 60 * 1000);
      if (isExpired) {
        console.log('⏰ 缓存已过期，删除记录');
        await this.deleteCacheRecord(latestRecord.id);
        return null;
      }
      
      console.log('🎯 找到缓存数据:', {
        url: url,
        language: language,
        age: Math.round((Date.now() - latestRecord.createdAt) / (60 * 1000)) + '分钟'
      });
      
      return latestRecord.data;
      
    } catch (error) {
      console.warn('⚠️ 获取缓存数据失败:', error);
      return null;
    }
  }

  /**
   * 应用缓存的高亮结果到页面
   */
  async applyCachedHighlights(cachedData) {
    if (!cachedData) {
      console.warn('⚠️ 缓存数据无效，无法应用');
      return false;
    }

    try {
      console.log('🔄 开始应用缓存的高亮结果...');
      console.log('📊 缓存数据结构:', cachedData);
      
      // 缓存数据应该包含 originalText 和 segmentedHtml
      if (!cachedData.originalText || !cachedData.segmentedHtml) {
        console.warn('⚠️ 缓存数据缺少必要字段 (originalText, segmentedHtml)');
        return false;
      }

      // 获取页面中的所有文本节点
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // 跳过已处理的节点和脚本、样式节点
            if (node.parentElement.closest('.adhd-processed') ||
                node.parentElement.tagName === 'SCRIPT' ||
                node.parentElement.tagName === 'STYLE' ||
                node.parentElement.tagName === 'NOSCRIPT') {
              return NodeFilter.FILTER_REJECT;
            }
            return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        }
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      console.log(`📝 找到 ${textNodes.length} 个文本节点`);

      // 应用缓存的高亮结果
      let appliedCount = 0;
      for (const textNode of textNodes) {
        // 检查文本节点是否匹配缓存的原始文本
        if (textNode.textContent.trim() === cachedData.originalText.trim()) {
          console.log('🎯 找到匹配的文本节点:', textNode.textContent.substring(0, 50) + '...');
          
          // 创建临时容器来解析HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cachedData.segmentedHtml;
          
          // 创建文档片段
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          
          // 标记父元素为已处理
          if (textNode.parentElement) {
            textNode.parentElement.classList.add('adhd-processed');
          }
          
          // 替换文本节点
          textNode.parentNode.replaceChild(fragment, textNode);
          appliedCount++;
          
          console.log('✅ 成功应用缓存到文本节点');
        }
      }

      console.log(`✅ 成功应用 ${appliedCount} 个缓存的高亮结果`);
      return appliedCount > 0;

    } catch (error) {
      console.error('❌ 应用缓存高亮失败:', error);
      return false;
    }
  }

  /**
   * 删除缓存记录
   */
  async deleteCacheRecord(id) {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      await store.delete(id);
    } catch (error) {
      console.warn('⚠️ 删除缓存记录失败:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      const index = store.index('createdAt');
      
      const cutoffTime = Date.now() - (this.cacheRetentionDays * 24 * 60 * 60 * 1000);
      const expiredRecords = await this.getAllFromIndex(index, IDBKeyRange.upperBound(cutoffTime));
      
      for (const record of expiredRecords) {
        await store.delete(record.id);
      }
      
      console.log(`🧹 清理了 ${expiredRecords.length} 条过期缓存记录`);
      
      // 更新上次清理时间
      try {
        await chrome.storage.local.set({ lastCleanupTime: Date.now() });
      } catch (error) {
        console.warn('更新清理时间失败:', error);
      }
      
    } catch (error) {
      console.warn('⚠️ 清理过期缓存失败:', error);
    }
  }

  /**
   * 手动清除所有缓存
   */
  async clearAllCache() {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['highlights'], 'readwrite');
      const store = transaction.objectStore('highlights');
      await store.clear();
      
      console.log('🗑️ 所有缓存已清除');
      
      // 更新上次清理时间
      try {
        await chrome.storage.local.set({ lastCleanupTime: Date.now() });
      } catch (error) {
        console.warn('更新清理时间失败:', error);
      }
      
    } catch (error) {
      console.warn('⚠️ 清除缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    if (!this.db) return { enabled: false };
    
    try {
      const transaction = this.db.transaction(['highlights'], 'readonly');
      const store = transaction.objectStore('highlights');
      
      const allRecords = await this.getAllFromStore(store);
      const totalSize = allRecords.reduce((sum, record) => sum + (record.size || 0), 0);
      
      // 从 chrome.storage.local 获取上次清理时间
      let lastCleanup = null;
      try {
        const result = await chrome.storage.local.get(['lastCleanupTime']);
        lastCleanup = result.lastCleanupTime || null;
      } catch (error) {
        console.warn('获取上次清理时间失败:', error);
      }
      
      return {
        enabled: this.cacheEnabled,
        totalRecords: allRecords.length,
        totalSize: totalSize,
        retentionDays: this.cacheRetentionDays,
        oldestRecord: allRecords.length > 0 ? Math.min(...allRecords.map(r => r.createdAt)) : null,
        newestRecord: allRecords.length > 0 ? Math.max(...allRecords.map(r => r.createdAt)) : null,
        lastCleanup: lastCleanup
      };
      
    } catch (error) {
      console.warn('⚠️ 获取缓存统计失败:', error);
      return { enabled: false, error: error.message };
    }
  }

  // 数据库操作辅助方法
  async putToStore(store, data) {
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFromIndex(index, key) {
    return new Promise((resolve, reject) => {
      const request = key ? index.getAll(key) : index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFromStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 加载缓存设置
   */
  async loadCacheSettings() {
    try {
      const result = await chrome.storage.sync.get({
        cacheEnabled: true,
        cacheRetentionDays: 7
      });
      
      this.cacheEnabled = result.cacheEnabled;
      this.cacheRetentionDays = result.cacheRetentionDays;
      
      // 特殊处理：3分钟测试模式
      if (this.cacheRetentionDays === 0.002) {
        console.log('🧪 启用3分钟测试模式');
        this.startTestModeCleanup();
      }
      
      console.log('📋 缓存设置已加载:', {
        enabled: this.cacheEnabled,
        retentionDays: this.cacheRetentionDays,
        retentionMinutes: this.cacheRetentionDays * 24 * 60
      });
    } catch (error) {
      console.warn('⚠️ 加载缓存设置失败，使用默认设置:', error);
      this.cacheEnabled = true;
      this.cacheRetentionDays = 7;
    }
  }

  /**
   * 更新缓存设置
   */
  async updateCacheSettings(settings) {
    try {
      if (settings.hasOwnProperty('cacheEnabled')) {
        this.cacheEnabled = settings.cacheEnabled;
      }
      
      if (settings.hasOwnProperty('cacheRetentionDays')) {
        this.cacheRetentionDays = settings.cacheRetentionDays;
      }
      
      console.log('🔧 缓存设置已更新:', {
        enabled: this.cacheEnabled,
        retentionDays: this.cacheRetentionDays
      });
      
      // 如果缓存被禁用，清理所有现有缓存
      if (!this.cacheEnabled) {
        console.log('🗑️ 缓存已禁用，清理所有现有缓存...');
        await this.clearAllCache();
      }
      
      // 如果保留时间缩短，清理过期缓存
      if (this.cacheEnabled && settings.hasOwnProperty('cacheRetentionDays')) {
        console.log('🧹 保留时间已更改，清理过期缓存...');
        await this.cleanupExpiredCache();
        
        // 处理测试模式
        if (this.cacheRetentionDays === 0.002) {
          console.log('🧪 切换到3分钟测试模式');
          this.startTestModeCleanup();
        } else {
          // 停止测试模式
          this.stopTestModeCleanup();
        }
      }
      
    } catch (error) {
      console.error('❌ 更新缓存设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前缓存设置
   */
  getCacheSettings() {
    return {
      enabled: this.cacheEnabled,
      retentionDays: this.cacheRetentionDays
    };
  }

  /**
   * 启动测试模式的自动清理（仅用于验证）
   */
  startTestModeCleanup() {
    // 清除之前的定时器
    if (this.testCleanupTimer) {
      clearInterval(this.testCleanupTimer);
    }
    
    // 每30秒检查一次过期缓存（测试模式下更频繁）
    this.testCleanupTimer = setInterval(async () => {
      try {
        console.log('🧪 测试模式：检查过期缓存...');
        const statsBefore = await this.getCacheStats();
        await this.cleanupExpiredCache();
        const statsAfter = await this.getCacheStats();
        
        if (statsBefore.totalRecords !== statsAfter.totalRecords) {
          console.log(`🧪 测试模式：清理了 ${statsBefore.totalRecords - statsAfter.totalRecords} 条过期缓存`);
        }
      } catch (error) {
        console.error('🧪 测试模式清理失败:', error);
      }
    }, 30000); // 30秒检查一次
    
    console.log('🧪 测试模式自动清理已启动，每30秒检查一次');
  }

  /**
   * 停止测试模式的自动清理
   */
  stopTestModeCleanup() {
    if (this.testCleanupTimer) {
      clearInterval(this.testCleanupTimer);
      this.testCleanupTimer = null;
      console.log('🧪 测试模式自动清理已停止');
    }
  }
}

// 导出事件缓存管理器
window.EventCacheManager = EventCacheManager;