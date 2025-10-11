/**
 * IndexedDB词典管理器
 * 用于存储和管理用户导入的大型词典文件
 */
class IndexedDBDictionaryManager {
    constructor() {
        this.dbName = 'ImportedDictionariesDB';
        this.dbVersion = 1;
        this.storeName = 'dictionaries';
        this.metaStoreName = 'dictionary_metadata';
        this.db = null;
    }

    /**
     * 初始化IndexedDB数据库
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB初始化失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB初始化成功');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建词典数据存储
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('language', 'language', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }

                // 创建词典元数据存储
                if (!db.objectStoreNames.contains(this.metaStoreName)) {
                    const metaStore = db.createObjectStore(this.metaStoreName, { keyPath: 'id' });
                    metaStore.createIndex('importedAt', 'importedAt', { unique: false });
                    metaStore.createIndex('language', 'language', { unique: false });
                }

                console.log('IndexedDB数据库结构创建完成');
            };
        });
    }

    /**
     * 保存导入的词典
     * @param {Object} dictionaryData 词典数据
     * @param {string} fileName 文件名
     * @returns {Promise<string>} 词典ID
     */
    async saveDictionary(dictionaryData, fileName) {
        if (!this.db) {
            await this.initialize();
        }

        const id = this.generateDictionaryId();
        const now = new Date().toISOString();

        // 准备词典数据
        const dictRecord = {
            id: id,
            words: dictionaryData.words,
            language: dictionaryData.meta?.language || 'unknown',
            type: 'imported'
        };

        // 准备元数据
        const metaRecord = {
            id: id,
            fileName: fileName,
            meta: dictionaryData.meta,
            importedAt: now,
            language: dictionaryData.meta?.language || 'unknown',
            wordCount: this.calculateWordCount(dictionaryData.words),
            fileSize: JSON.stringify(dictionaryData).length
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName, this.metaStoreName], 'readwrite');
            
            transaction.onerror = () => {
                console.error('保存词典失败:', transaction.error);
                reject(transaction.error);
            };

            transaction.oncomplete = () => {
                console.log(`词典保存成功: ${id}`);
                resolve(id);
            };

            // 保存词典数据
            const dictStore = transaction.objectStore(this.storeName);
            dictStore.add(dictRecord);

            // 保存元数据
            const metaStore = transaction.objectStore(this.metaStoreName);
            metaStore.add(metaRecord);
        });
    }

    /**
     * 获取所有导入词典的元数据
     * @returns {Promise<Array>} 词典元数据列表
     */
    async getAllDictionaryMetadata() {
        if (!this.db) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.metaStoreName], 'readonly');
            const store = transaction.objectStore(this.metaStoreName);
            const request = store.getAll();

            request.onerror = () => {
                console.error('获取词典元数据失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                const metadata = request.result || [];
                // 按导入时间倒序排列
                metadata.sort((a, b) => new Date(b.importedAt) - new Date(a.importedAt));
                resolve(metadata);
            };
        });
    }

    /**
     * 根据ID获取词典数据
     * @param {string} id 词典ID
     * @returns {Promise<Object|null>} 词典数据
     */
    async getDictionaryById(id) {
        if (!this.db) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onerror = () => {
                console.error('获取词典数据失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result || null);
            };
        });
    }

    /**
     * 根据语言获取词典列表
     * @param {string} language 语言代码
     * @returns {Promise<Array>} 词典数据列表
     */
    async getDictionariesByLanguage(language) {
        if (!this.db) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('language');
            const request = index.getAll(language);

            request.onerror = () => {
                console.error('按语言获取词典失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result || []);
            };
        });
    }

    /**
     * 删除词典
     * @param {string} id 词典ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    async deleteDictionary(id) {
        if (!this.db) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName, this.metaStoreName], 'readwrite');
            
            transaction.onerror = () => {
                console.error('删除词典失败:', transaction.error);
                reject(transaction.error);
            };

            transaction.oncomplete = () => {
                console.log(`词典删除成功: ${id}`);
                resolve(true);
            };

            // 删除词典数据
            const dictStore = transaction.objectStore(this.storeName);
            dictStore.delete(id);

            // 删除元数据
            const metaStore = transaction.objectStore(this.metaStoreName);
            metaStore.delete(id);
        });
    }

    /**
     * 查询词汇
     * @param {string} word 要查询的词汇
     * @param {string} language 语言代码
     * @returns {Promise<Array>} 查询结果
     */
    async lookupWord(word, language) {
        const dictionaries = await this.getDictionariesByLanguage(language);
        const results = [];

        for (const dict of dictionaries) {
            if (dict.words && dict.words[word]) {
                results.push({
                    dictionaryId: dict.id,
                    word: word,
                    data: dict.words[word]
                });
            }
        }

        return results;
    }

    /**
     * 获取数据库统计信息
     * @returns {Promise<Object>} 统计信息
     */
    async getStatistics() {
        const metadata = await this.getAllDictionaryMetadata();
        
        const stats = {
            totalDictionaries: metadata.length,
            totalWords: metadata.reduce((sum, dict) => sum + (dict.wordCount || 0), 0),
            totalSize: metadata.reduce((sum, dict) => sum + (dict.fileSize || 0), 0),
            languageBreakdown: {}
        };

        // 按语言统计
        metadata.forEach(dict => {
            const lang = dict.language || 'unknown';
            if (!stats.languageBreakdown[lang]) {
                stats.languageBreakdown[lang] = {
                    count: 0,
                    words: 0,
                    size: 0
                };
            }
            stats.languageBreakdown[lang].count++;
            stats.languageBreakdown[lang].words += dict.wordCount || 0;
            stats.languageBreakdown[lang].size += dict.fileSize || 0;
        });

        return stats;
    }

    /**
     * 生成唯一的词典ID
     * @returns {string} 词典ID
     * @private
     */
    generateDictionaryId() {
        return 'imported-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 计算词典中的词汇数量
     * @param {Object|Array} words 词汇数据
     * @returns {number} 词汇数量
     * @private
     */
    calculateWordCount(words) {
        if (!words) return 0;
        if (Array.isArray(words)) return words.length;
        if (typeof words === 'object') return Object.keys(words).length;
        return 0;
    }

    /**
     * 清理数据库（删除所有数据）
     * @returns {Promise<boolean>} 清理是否成功
     */
    async clearAll() {
        if (!this.db) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName, this.metaStoreName], 'readwrite');
            
            transaction.onerror = () => {
                console.error('清理数据库失败:', transaction.error);
                reject(transaction.error);
            };

            transaction.oncomplete = () => {
                console.log('数据库清理完成');
                resolve(true);
            };

            // 清空词典数据
            const dictStore = transaction.objectStore(this.storeName);
            dictStore.clear();

            // 清空元数据
            const metaStore = transaction.objectStore(this.metaStoreName);
            metaStore.clear();
        });
    }
}

// 创建全局实例
const indexedDBDictionaryManager = new IndexedDBDictionaryManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IndexedDBDictionaryManager, indexedDBDictionaryManager };
} else if (typeof window !== 'undefined') {
    window.IndexedDBDictionaryManager = IndexedDBDictionaryManager;
    window.indexedDBDictionaryManager = indexedDBDictionaryManager;
}