/**
 * 通用存储适配器 - 支持跨浏览器插件存储
 * 优先级：IndexedDB > Chrome Storage API > localStorage (fallback)
 * 
 * 特性：
 * - 跨浏览器兼容（Chrome, Edge, Firefox, Safari）
 * - 统一的异步API
 * - 自动降级策略
 * - 数据迁移支持
 */

class UniversalStorageAdapter {
  constructor() {
    this.storageType = null;
    this.db = null;
    this.dbName = 'ADHDGoFlyStorage';
    this.dbVersion = 1;
    this.storeName = 'keyValueStore';
    this.initialized = false;
  }

  /**
   * 初始化存储适配器
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // 优先尝试 IndexedDB
      if (await this.tryIndexedDB()) {
        this.storageType = 'indexeddb';
        console.log('🔧 存储适配器：使用 IndexedDB');
      }
      // 降级到 Chrome Storage API
      else if (await this.tryChromeStorage()) {
        this.storageType = 'chrome';
        console.log('🔧 存储适配器：使用 Chrome Storage API');
      }
      // 最后降级到 localStorage
      else if (await this.tryLocalStorage()) {
        this.storageType = 'localstorage';
        console.log('🔧 存储适配器：使用 localStorage (fallback)');
      }
      else {
        throw new Error('没有可用的存储方案');
      }

      this.initialized = true;
      await this.migrateOldData();
      
    } catch (error) {
      console.error('存储适配器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 尝试使用 IndexedDB
   */
  async tryIndexedDB() {
    if (!window.indexedDB) return false;

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => resolve(false);
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' });
          }
        };
        
        // 超时处理
        setTimeout(() => resolve(false), 1000);
        
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * 尝试使用 Chrome Storage API
   */
  async tryChromeStorage() {
    try {
      if (!chrome?.storage?.local) return false;
      
      // 测试写入
      await chrome.storage.local.set({ '_test_key': 'test' });
      await chrome.storage.local.remove(['_test_key']);
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * 尝试使用 localStorage
   */
  async tryLocalStorage() {
    try {
      if (!window.localStorage) return false;
      
      // 测试写入
      localStorage.setItem('_test_key', 'test');
      localStorage.removeItem('_test_key');
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取数据
   */
  async get(key) {
    await this.initialize();
    
    switch (this.storageType) {
      case 'indexeddb':
        return this.getFromIndexedDB(key);
      case 'chrome':
        return this.getFromChromeStorage(key);
      case 'localstorage':
        return this.getFromLocalStorage(key);
      default:
        throw new Error('存储适配器未初始化');
    }
  }

  /**
   * 设置数据
   */
  async set(key, value) {
    await this.initialize();
    
    switch (this.storageType) {
      case 'indexeddb':
        return this.setToIndexedDB(key, value);
      case 'chrome':
        return this.setToChromeStorage(key, value);
      case 'localstorage':
        return this.setToLocalStorage(key, value);
      default:
        throw new Error('存储适配器未初始化');
    }
  }

  /**
   * 删除数据
   */
  async remove(key) {
    await this.initialize();
    
    switch (this.storageType) {
      case 'indexeddb':
        return this.removeFromIndexedDB(key);
      case 'chrome':
        return this.removeFromChromeStorage(key);
      case 'localstorage':
        return this.removeFromLocalStorage(key);
      default:
        throw new Error('存储适配器未初始化');
    }
  }

  // ========== IndexedDB 实现 ==========
  async getFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async setToIndexedDB(key, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ key, value });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Chrome Storage 实现 ==========
  async getFromChromeStorage(key) {
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  }

  async setToChromeStorage(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  async removeFromChromeStorage(key) {
    await chrome.storage.local.remove([key]);
  }

  // ========== localStorage 实现 ==========
  async getFromLocalStorage(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('localStorage 读取失败:', error);
      return null;
    }
  }

  async setToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('localStorage 写入失败:', error);
      throw error;
    }
  }

  async removeFromLocalStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('localStorage 删除失败:', error);
      throw error;
    }
  }

  /**
   * 迁移旧数据
   */
  async migrateOldData() {
    try {
      // 从 localStorage 迁移数据到新存储
      if (this.storageType !== 'localstorage') {
        const oldData = localStorage.getItem('reviewLightTowerDisplay');
        if (oldData) {
          const parsed = JSON.parse(oldData);
          await this.set('reviewLightTowerDisplay', parsed);
          localStorage.removeItem('reviewLightTowerDisplay');
          console.log('🔄 已迁移旧的 localStorage 数据');
        }
      }
      
      // 从 Chrome Storage 迁移数据到 IndexedDB
      if (this.storageType === 'indexeddb' && chrome?.storage?.local) {
        try {
          const result = await chrome.storage.local.get(['reviewLightTowerDisplay']);
          if (result.reviewLightTowerDisplay) {
            await this.set('reviewLightTowerDisplay', result.reviewLightTowerDisplay);
            await chrome.storage.local.remove(['reviewLightTowerDisplay']);
            console.log('🔄 已迁移 Chrome Storage 数据到 IndexedDB');
          }
        } catch (error) {
          // Chrome Storage 不可用，忽略迁移
        }
      }
      
    } catch (error) {
      console.error('数据迁移失败:', error);
    }
  }

  /**
   * 获取存储信息
   */
  getStorageInfo() {
    return {
      type: this.storageType,
      initialized: this.initialized,
      available: {
        indexeddb: !!window.indexedDB,
        chrome: !!(chrome?.storage?.local),
        localstorage: !!window.localStorage
      }
    };
  }
}

// 创建全局实例
window.universalStorage = new UniversalStorageAdapter();