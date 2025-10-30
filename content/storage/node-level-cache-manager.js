/**
 * 节点级缓存管理器
 * 实现基于DOM节点的精细化缓存策略
 * 解决流式处理与页面级缓存的冲突问题
 */
class NodeLevelCacheManager {
  constructor() {
    this.db = null;
    this.cacheEnabled = true;
    this.fallbackMode = false;
    
    // 性能统计
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheStores: 0,
      validationFailures: 0,
      totalQueries: 0,
      averageQueryTime: 0
    };
    
    // 缓存配置
    this.config = {
      maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7天
      maxCacheSize: 1000, // 最大缓存节点数
      enableValidation: true,
      compressionEnabled: true
    };
    
    this.initDatabase();
  }

  /**
   * 初始化IndexedDB数据库
   */
  async initDatabase() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('ADHDGoFly_NodeCache', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // 节点缓存表
          if (!db.objectStoreNames.contains('nodeCache')) {
            const store = db.createObjectStore('nodeCache', { keyPath: 'id' });
            store.createIndex('pageUrl', 'pageUrl', { unique: false });
            store.createIndex('contentHash', 'contentHash', { unique: false });
            store.createIndex('language', 'language', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          }
          
          // 页面指纹表
          if (!db.objectStoreNames.contains('pageFingerprints')) {
            const store = db.createObjectStore('pageFingerprints', { keyPath: 'url' });
            store.createIndex('fingerprint', 'fingerprint', { unique: false });
            store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          }
        };
      });
      
      console.log('节点级缓存数据库初始化成功');
    } catch (error) {
      console.error('节点级缓存数据库初始化失败:', error);
      this.enableFallbackMode();
    }
  }

  /**
   * 启用降级模式
   */
  enableFallbackMode() {
    this.fallbackMode = true;
    this.cacheEnabled = false;
    console.log('节点级缓存已降级，功能正常运行');
  }

  /**
   * 检查缓存是否可用
   */
  isCacheAvailable() {
    return this.cacheEnabled && !this.fallbackMode && this.db;
  }

  /**
   * 生成节点指纹
   * @param {Node} textNode 文本节点
   * @param {string} pageUrl 页面URL
   * @returns {Object} 节点指纹对象
   */
  generateNodeFingerprint(textNode, pageUrl) {
    const content = textNode.textContent.trim();
    const parent = textNode.parentElement;
    
    return {
      // 内容哈希
      contentHash: this.hashContent(content),
      
      // DOM路径（轻量级XPath）
      domPath: this.generateLightXPath(textNode),
      
      // 父元素特征
      parentSignature: this.getParentSignature(parent),
      
      // 页面URL
      pageUrl: this.normalizeUrl(pageUrl),
      
      // 内容长度（用于快速过滤）
      contentLength: content.length,
      
      // 生成时间戳
      timestamp: Date.now()
    };
  }

  /**
   * 生成内容哈希
   * @param {string} content 文本内容
   * @returns {string} 哈希值
   */
  hashContent(content) {
    let hash = 0;
    if (content.length === 0) return hash.toString();
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成轻量级XPath
   * @param {Node} node 节点
   * @returns {string} XPath字符串
   */
  generateLightXPath(node) {
    const path = [];
    let current = node;
    
    while (current && current.nodeType !== Node.DOCUMENT_NODE) {
      if (current.nodeType === Node.TEXT_NODE) {
        // 文本节点：记录在父元素中的位置
        const parent = current.parentElement;
        const textNodes = Array.from(parent.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
        const index = textNodes.indexOf(current);
        path.unshift(`text()[${index + 1}]`);
        current = parent;
      } else if (current.nodeType === Node.ELEMENT_NODE) {
        // 元素节点：记录标签和位置
        const tagName = current.tagName.toLowerCase();
        const siblings = Array.from(current.parentNode.children).filter(e => e.tagName === current.tagName);
        const index = siblings.indexOf(current);
        
        let selector = tagName;
        if (current.id) {
          selector += `[@id="${current.id}"]`;
        } else if (current.className) {
          const classes = current.className.split(' ').filter(c => c.trim()).slice(0, 2);
          if (classes.length > 0) {
            selector += `[@class*="${classes[0]}"]`;
          }
        } else if (siblings.length > 1) {
          selector += `[${index + 1}]`;
        }
        
        path.unshift(selector);
        current = current.parentElement;
      } else {
        current = current.parentNode;
      }
      
      // 限制路径深度，避免过长
      if (path.length >= 8) break;
    }
    
    return '//' + path.join('/');
  }

  /**
   * 获取父元素特征
   * @param {Element} element 父元素
   * @returns {string} 父元素特征字符串
   */
  getParentSignature(element) {
    if (!element) return 'no-parent';
    
    const features = [];
    
    // 标签名
    features.push(element.tagName.toLowerCase());
    
    // ID
    if (element.id) {
      features.push(`#${element.id}`);
    }
    
    // 主要类名（最多2个）
    if (element.className) {
      const classes = element.className.split(' ')
        .filter(c => c.trim())
        .slice(0, 2);
      features.push(...classes.map(c => `.${c}`));
    }
    
    // 特殊属性
    ['data-role', 'role', 'data-component'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        features.push(`[${attr}="${value}"]`);
      }
    });
    
    return features.join('');
  }

  /**
   * 标准化URL
   * @param {string} url 原始URL
   * @returns {string} 标准化后的URL
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // 移除fragment和某些查询参数
      urlObj.hash = '';
      
      // 移除常见的跟踪参数
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
      paramsToRemove.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  /**
   * 生成缓存键
   * @param {Object} fingerprint 节点指纹
   * @param {string} language 语言
   * @param {Object} renderingContext 渲染上下文（颜色方案、高亮开关等）
   * @returns {string} 缓存键
   */
  generateCacheKey(fingerprint, language, renderingContext = {}) {
    // 基础键值
    let cacheKey = `${fingerprint.contentHash}_${language}_${fingerprint.parentSignature}`;
    
    // 添加颜色方案参数
    if (renderingContext.colorScheme) {
      cacheKey += `_scheme_${renderingContext.colorScheme}`;
    }
    
    // 添加高亮开关参数
    if (renderingContext.highlightingToggles) {
      const toggles = renderingContext.highlightingToggles;
      const toggleString = `${toggles.noun ? 'n' : ''}${toggles.verb ? 'v' : ''}${toggles.adj ? 'a' : ''}${toggles.comparative ? 'c' : ''}`;
      cacheKey += `_toggles_${toggleString}`;
    }
    
    console.log('🔧 [DEBUG] 节点缓存键值生成:', {
      基础键值: `${fingerprint.contentHash}_${language}_${fingerprint.parentSignature}`,
      颜色方案: renderingContext.colorScheme || 'default',
      高亮开关: renderingContext.highlightingToggles || '未提供',
      最终键值: cacheKey
    });
    
    return cacheKey;
  }

  /**
   * 获取节点缓存
   * @param {Object} fingerprint 节点指纹
   * @param {string} language 语言
   * @param {Object} renderingContext 渲染上下文（颜色方案、高亮开关等）
   * @returns {Object|null} 缓存数据
   */
  async getNodeCache(fingerprint, language, renderingContext = {}) {
    console.log('🔧 [DEBUG] 节点缓存查询开始:', {
      缓存可用性: this.isCacheAvailable(),
      缓存开关: this.cacheEnabled,
      降级模式: this.fallbackMode,
      数据库状态: !!this.db,
      渲染上下文: renderingContext
    });
    
    if (!this.isCacheAvailable()) {
      console.log('🔧 [DEBUG] 节点缓存不可用，跳过查询');
      return null;
    }

    const startTime = performance.now();
    this.stats.totalQueries++;

    try {
      const cacheKey = this.generateCacheKey(fingerprint, language, renderingContext);
      const transaction = this.db.transaction(['nodeCache'], 'readonly');
      const store = transaction.objectStore('nodeCache');
      
      console.log('🔧 [DEBUG] 查询节点缓存:', {
        缓存键值: cacheKey,
        内容哈希: fingerprint.contentHash,
        语言: language
      });
      
      const result = await new Promise((resolve, reject) => {
        const request = store.get(cacheKey);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (result && this.validateCacheEntry(result, fingerprint)) {
        // 更新访问时间
        this.updateLastAccessed(cacheKey);
        
        this.stats.cacheHits++;
        this.updateAverageQueryTime(performance.now() - startTime);
        
        console.log('🔧 [DEBUG] 节点缓存命中:', {
          缓存键值: cacheKey,
          缓存创建时间: new Date(result.createdAt).toLocaleString(),
          缓存大小: result.size
        });
        
        return result.data;
      } else {
        this.stats.cacheMisses++;
        console.log('🔧 [DEBUG] 节点缓存未命中:', {
          缓存键值: cacheKey,
          查询结果: !!result,
          验证通过: result ? this.validateCacheEntry(result, fingerprint) : false
        });
        return null;
      }
    } catch (error) {
      console.warn('获取节点缓存失败:', error);
      this.stats.cacheMisses++;
      return null;
    }
  }

  /**
   * 存储节点缓存
   * @param {Object} fingerprint 节点指纹
   * @param {string} language 语言
   * @param {Object} cacheData 缓存数据
   * @param {Object} renderingContext 渲染上下文（颜色方案、高亮开关等）
   */
  async storeNodeCache(fingerprint, language, cacheData, renderingContext = {}) {
    console.log('🔧 [DEBUG] 节点缓存存储开始:', {
      缓存可用性: this.isCacheAvailable(),
      渲染上下文: renderingContext,
      数据大小: JSON.stringify(cacheData).length
    });
    
    if (!this.isCacheAvailable()) {
      console.log('🔧 [DEBUG] 节点缓存不可用，跳过存储');
      return false;
    }

    try {
      const cacheKey = this.generateCacheKey(fingerprint, language, renderingContext);
      const now = Date.now();
      
      const cacheEntry = {
        id: cacheKey,
        fingerprint: fingerprint,
        language: language,
        data: cacheData,
        pageUrl: fingerprint.pageUrl,
        contentHash: fingerprint.contentHash,
        renderingContext: renderingContext, // 存储渲染上下文
        createdAt: now,
        lastAccessed: now,
        accessCount: 1,
        size: JSON.stringify(cacheData).length
      };

      console.log('🔧 [DEBUG] 存储节点缓存:', {
        缓存键值: cacheKey,
        内容哈希: fingerprint.contentHash,
        语言: language,
        渲染上下文: renderingContext,
        数据大小: cacheEntry.size
      });

      const transaction = this.db.transaction(['nodeCache'], 'readwrite');
      const store = transaction.objectStore('nodeCache');
      
      await new Promise((resolve, reject) => {
        const request = store.put(cacheEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.stats.cacheStores++;
      
      console.log('🔧 [DEBUG] 节点缓存存储成功:', {
        缓存键值: cacheKey,
        总存储次数: this.stats.cacheStores
      });
      
      // 定期清理过期缓存
      if (this.stats.cacheStores % 100 === 0) {
        this.cleanupExpiredCache();
      }
      
      return true;
    } catch (error) {
      console.warn('存储节点缓存失败:', error);
      return false;
    }
  }

  /**
   * 验证缓存条目
   * @param {Object} cacheEntry 缓存条目
   * @param {Object} currentFingerprint 当前指纹
   * @returns {boolean} 是否有效
   */
  validateCacheEntry(cacheEntry, currentFingerprint) {
    if (!this.config.enableValidation) {
      return true;
    }

    // 检查过期时间
    const age = Date.now() - cacheEntry.createdAt;
    if (age > this.config.maxCacheAge) {
      return false;
    }

    // 检查内容哈希
    if (cacheEntry.contentHash !== currentFingerprint.contentHash) {
      this.stats.validationFailures++;
      return false;
    }

    // 检查页面URL
    if (cacheEntry.pageUrl !== currentFingerprint.pageUrl) {
      this.stats.validationFailures++;
      return false;
    }

    // 检查DOM路径相似性（允许轻微变化）
    const pathSimilarity = this.calculatePathSimilarity(
      cacheEntry.fingerprint.domPath,
      currentFingerprint.domPath
    );
    
    if (pathSimilarity < 0.8) {
      this.stats.validationFailures++;
      return false;
    }

    return true;
  }

  /**
   * 计算路径相似性
   * @param {string} path1 路径1
   * @param {string} path2 路径2
   * @returns {number} 相似性分数 (0-1)
   */
  calculatePathSimilarity(path1, path2) {
    if (path1 === path2) return 1.0;
    
    const parts1 = path1.split('/').filter(p => p);
    const parts2 = path2.split('/').filter(p => p);
    
    const maxLength = Math.max(parts1.length, parts2.length);
    if (maxLength === 0) return 1.0;
    
    let matches = 0;
    const minLength = Math.min(parts1.length, parts2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (parts1[i] === parts2[i]) {
        matches++;
      }
    }
    
    return matches / maxLength;
  }

  /**
   * 更新最后访问时间
   * @param {string} cacheKey 缓存键
   */
  async updateLastAccessed(cacheKey) {
    try {
      const transaction = this.db.transaction(['nodeCache'], 'readwrite');
      const store = transaction.objectStore('nodeCache');
      
      const getRequest = store.get(cacheKey);
      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.lastAccessed = Date.now();
          entry.accessCount = (entry.accessCount || 1) + 1;
          store.put(entry);
        }
      };
    } catch (error) {
      // 静默失败，不影响主要功能
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache() {
    if (!this.isCacheAvailable()) {
      return;
    }

    try {
      const transaction = this.db.transaction(['nodeCache'], 'readwrite');
      const store = transaction.objectStore('nodeCache');
      const index = store.index('createdAt');
      
      const cutoffTime = Date.now() - this.config.maxCacheAge;
      const range = IDBKeyRange.upperBound(cutoffTime);
      
      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('清理过期缓存失败:', error);
    }
  }

  /**
   * 更新平均查询时间
   * @param {number} queryTime 查询时间
   */
  updateAverageQueryTime(queryTime) {
    const totalQueries = this.stats.totalQueries;
    this.stats.averageQueryTime = (
      (this.stats.averageQueryTime * (totalQueries - 1)) + queryTime
    ) / totalQueries;
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  /**
   * 获取性能统计信息
   * @returns {Object} 性能统计数据
   */
  async getPerformanceStats() {
    const hitRate = this.stats.totalQueries > 0 
      ? (this.stats.cacheHits / this.stats.totalQueries * 100).toFixed(2)
      : 0;
    
    // 获取缓存大小信息
    let cacheSize = 0;
    let totalEntries = 0;
    
    if (this.isCacheAvailable()) {
      try {
        const transaction = this.db.transaction(['nodeCache'], 'readonly');
        const store = transaction.objectStore('nodeCache');
        
        totalEntries = await new Promise((resolve, reject) => {
          const countRequest = store.count();
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => reject(countRequest.error);
        });
        
        // 估算缓存大小（简化计算）
        cacheSize = totalEntries * 1024; // 假设每个条目平均1KB
      } catch (error) {
        console.warn('获取缓存大小失败:', error);
      }
    }
    
    return {
      // 基础统计
      ...this.stats,
      hitRate: `${hitRate}%`,
      hitRateNumeric: parseFloat(hitRate),
      
      // 缓存状态
      isEnabled: this.cacheEnabled,
      isFallbackMode: this.fallbackMode,
      
      // 存储信息
      totalEntries,
      estimatedSize: `${(cacheSize / 1024).toFixed(2)} KB`,
      estimatedSizeBytes: cacheSize,
      
      // 性能指标
      avgQueryTime: this.stats.averageQueryTime,
      totalOperations: this.stats.totalQueries + this.stats.cacheStores,
      
      // 效率指标
      efficiency: {
        hitMissRatio: this.stats.cacheMisses > 0 ? 
          (this.stats.cacheHits / this.stats.cacheMisses).toFixed(2) : 'N/A',
        storeHitRatio: this.stats.cacheHits > 0 ? 
          (this.stats.cacheStores / this.stats.cacheHits).toFixed(2) : 'N/A'
      }
    };
  }

  /**
   * 获取基础统计信息（保持向后兼容）
   * @returns {Object} 基础统计数据
   */
  getStats() {
    const hitRate = this.stats.totalQueries > 0 
      ? (this.stats.cacheHits / this.stats.totalQueries * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      isEnabled: this.cacheEnabled,
      isFallbackMode: this.fallbackMode
    };
  }

  /**
   * 清空所有缓存
   */
  async clearAllCache() {
    if (!this.isCacheAvailable()) {
      return;
    }

    try {
      const transaction = this.db.transaction(['nodeCache'], 'readwrite');
      const store = transaction.objectStore('nodeCache');
      
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // 重置统计
      this.stats = {
        cacheHits: 0,
        cacheMisses: 0,
        cacheStores: 0,
        validationFailures: 0,
        totalQueries: 0,
        averageQueryTime: 0
      };
      
      console.log('节点级缓存已清空');
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }

  /**
   * 主动检查并清理失效缓存
   * @param {string} pageUrl 当前页面URL
   * @returns {Promise<number>} 清理的缓存条目数量
   */
  async invalidatePageCache(pageUrl) {
    if (!this.isCacheAvailable()) {
      return 0;
    }

    try {
      const normalizedUrl = this.normalizeUrl(pageUrl);
      const transaction = this.db.transaction(['nodeCache'], 'readwrite');
      const store = transaction.objectStore('nodeCache');
      const index = store.index('pageUrl');
      
      let deletedCount = 0;
      const request = index.openCursor(IDBKeyRange.only(normalizedUrl));
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            console.log(`清理页面缓存完成: ${normalizedUrl}, 删除 ${deletedCount} 条记录`);
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.warn('清理页面缓存失败:', error);
      return 0;
    }
  }

  /**
   * 检查并清理基于内容变化的失效缓存
   * @param {Array} currentNodes 当前页面的节点列表
   * @returns {Promise<number>} 清理的缓存条目数量
   */
  async invalidateChangedContent(currentNodes) {
    if (!this.isCacheAvailable() || !currentNodes || currentNodes.length === 0) {
      return 0;
    }

    try {
      const pageUrl = this.normalizeUrl(window.location.href);
      const transaction = this.db.transaction(['nodeCache'], 'readwrite');
      const store = transaction.objectStore('nodeCache');
      const index = store.index('pageUrl');
      
      // 构建当前节点的内容哈希映射
      const currentContentHashes = new Set();
      currentNodes.forEach(node => {
        if (node && node.textContent) {
          const fingerprint = this.generateNodeFingerprint(node, pageUrl);
          currentContentHashes.add(fingerprint.contentHash);
        }
      });
      
      let deletedCount = 0;
      const request = index.openCursor(IDBKeyRange.only(pageUrl));
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const cacheEntry = cursor.value;
            
            // 如果缓存的内容哈希不在当前页面中，说明内容已变化
            if (!currentContentHashes.has(cacheEntry.contentHash)) {
              cursor.delete();
              deletedCount++;
            }
            
            cursor.continue();
          } else {
            if (deletedCount > 0) {
              console.log(`清理变化内容缓存完成: 删除 ${deletedCount} 条记录`);
            }
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.warn('清理变化内容缓存失败:', error);
      return 0;
    }
  }

  /**
   * 智能缓存清理 - 基于访问频率和时间
   * @param {number} maxEntries 最大保留条目数
   * @returns {Promise<number>} 清理的缓存条目数量
   */
  async smartCleanup(maxEntries = 1000) {
    if (!this.isCacheAvailable()) {
      return 0;
    }

    try {
      const transaction = this.db.transaction(['nodeCache'], 'readwrite');
      const store = transaction.objectStore('nodeCache');
      
      // 获取所有缓存条目
      const allEntries = [];
      const request = store.openCursor();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            allEntries.push({
              key: cursor.key,
              value: cursor.value
            });
            cursor.continue();
          } else {
            // 如果条目数量超过限制，进行智能清理
            if (allEntries.length <= maxEntries) {
              resolve(0);
              return;
            }
            
            // 计算每个条目的保留分数
            const scoredEntries = allEntries.map(entry => {
              const age = Date.now() - entry.value.createdAt;
              const accessCount = entry.value.accessCount || 1;
              const lastAccessed = entry.value.lastAccessed || entry.value.createdAt;
              const timeSinceAccess = Date.now() - lastAccessed;
              
              // 分数计算：访问频率高、最近访问、创建时间近的分数高
              const score = (accessCount * 1000) - (age / 1000) - (timeSinceAccess / 1000);
              
              return {
                ...entry,
                score: score
              };
            });
            
            // 按分数排序，保留分数高的条目
            scoredEntries.sort((a, b) => b.score - a.score);
            const toDelete = scoredEntries.slice(maxEntries);
            
            // 删除低分条目
            let deletedCount = 0;
            const deletePromises = toDelete.map(entry => {
              return new Promise((deleteResolve) => {
                const deleteRequest = store.delete(entry.key);
                deleteRequest.onsuccess = () => {
                  deletedCount++;
                  deleteResolve();
                };
                deleteRequest.onerror = () => deleteResolve();
              });
            });
            
            Promise.all(deletePromises).then(() => {
              console.log(`智能清理完成: 删除 ${deletedCount} 条低分缓存记录`);
              resolve(deletedCount);
            });
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.warn('智能清理失败:', error);
      return 0;
    }
  }

  /**
   * 定期维护任务
   * @returns {Promise<Object>} 维护结果统计
   */
  async performMaintenance() {
    const maintenanceStats = {
      expiredDeleted: 0,
      smartCleanupDeleted: 0,
      totalCacheSize: 0,
      maintenanceTime: 0
    };

    const startTime = performance.now();

    try {
      // 1. 清理过期缓存
      maintenanceStats.expiredDeleted = await this.cleanupExpiredCache();
      
      // 2. 智能清理（保留最多1000条记录）
      maintenanceStats.smartCleanupDeleted = await this.smartCleanup(1000);
      
      // 3. 更新缓存大小统计
      if (this.isCacheAvailable()) {
        const transaction = this.db.transaction(['nodeCache'], 'readonly');
        const store = transaction.objectStore('nodeCache');
        const countRequest = store.count();
        
        maintenanceStats.totalCacheSize = await new Promise((resolve) => {
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => resolve(0);
        });
      }
      
      maintenanceStats.maintenanceTime = performance.now() - startTime;
      
      console.log('缓存维护完成:', maintenanceStats);
      
    } catch (error) {
      console.warn('缓存维护失败:', error);
    }

    return maintenanceStats;
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NodeLevelCacheManager;
} else {
  window.NodeLevelCacheManager = NodeLevelCacheManager;
}