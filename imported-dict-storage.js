/**
 * IndexedDB存储管理器 - 专门用于导入词典的存储
 */
class ImportedDictStorage {
  constructor() {
    this.dbName = 'ImportedDictionaries';
    this.dbVersion = 1;
    this.storeName = 'dictionaries';
    this.db = null;
  }

  /**
   * 初始化IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('ImportedDictStorage IndexedDB初始化成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('importedAt', 'importedAt', { unique: false });
          store.createIndex('language', 'meta.language', { unique: false });
          console.log('创建ImportedDictionaries对象存储');
        }
      };
    });
  }

  /**
   * 保存导入的词典
   */
  async saveDictionary(dictData) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.put(dictData);
      
      request.onsuccess = () => {
        console.log('词典保存成功:', dictData.id);
        resolve();
      };
      
      request.onerror = () => {
        console.error('词典保存失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取所有导入的词典
   */
  async getAllDictionaries() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        console.error('获取词典列表失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 根据ID获取词典
   */
  async getDictionary(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('获取词典失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 删除词典
   */
  async deleteDictionary(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('词典删除成功:', id);
        resolve();
      };
      
      request.onerror = () => {
        console.error('词典删除失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 清空所有词典
   */
  async clearAll() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('所有导入词典已清空');
        resolve();
      };
      
      request.onerror = () => {
        console.error('清空词典失败:', request.error);
        reject(request.error);
      };
    });
  }
}

// 创建全局实例
window.importedDictStorage = new ImportedDictStorage();