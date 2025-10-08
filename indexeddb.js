// IndexedDB 管理类
class CustomDictDB {
  constructor() {
    this.dbName = 'CustomDictDB';
    this.version = 1;
    this.storeName = 'customDicts';
    this.db = null;
  }

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB 初始化成功');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // 创建索引
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('language', 'language', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          
          console.log('CustomDict 对象存储创建成功');
        }
      };
    });
  }

  // 保存词典
  async saveDict(dictData) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // 添加时间戳
      const dataToSave = {
        ...dictData,
        createdAt: dictData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const request = dictData.id ? store.put(dataToSave) : store.add(dataToSave);

      request.onsuccess = () => {
        console.log('词典保存成功:', request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('词典保存失败:', request.error);
        reject(request.error);
      };
    });
  }

  // 获取所有词典
  async getAllDicts() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('获取所有词典成功:', request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('获取词典失败:', request.error);
        reject(request.error);
      };
    });
  }

  // 根据ID获取词典
  async getDictById(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        console.log('获取词典成功:', request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('获取词典失败:', request.error);
        reject(request.error);
      };
    });
  }

  // 删除词典
  async deleteDict(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('词典删除成功');
        resolve(true);
      };

      request.onerror = () => {
        console.error('词典删除失败:', request.error);
        reject(request.error);
      };
    });
  }

  // 根据语言获取词典
  async getDictsByLanguage(language) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('language');
      const request = index.getAll(language);

      request.onsuccess = () => {
        console.log(`获取${language}语言词典成功:`, request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('获取词典失败:', request.error);
        reject(request.error);
      };
    });
  }

  // 清空所有词典
  async clearAllDicts() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('所有词典清空成功');
        resolve(true);
      };

      request.onerror = () => {
        console.error('清空词典失败:', request.error);
        reject(request.error);
      };
    });
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('IndexedDB 连接已关闭');
    }
  }
}

// 创建全局实例
window.customDictDB = new CustomDictDB();