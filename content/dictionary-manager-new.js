/**
 * 现代词典管理器
 * 负责词典的动态发现、加载和管理
 */
class ModernDictionaryManager {
    constructor() {
        this.registry = null;
        this.loadedDictionaries = new Map();
        this.cache = new Map();
        this.initialized = false;
    }

    /**
     * 初始化词典管理器
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.loadRegistry();
            this.initialized = true;
            console.log('DictionaryManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize DictionaryManager:', error);
            throw error;
        }
    }

    /**
     * 加载词典注册表
     */
    async loadRegistry() {
        try {
            const response = await fetch(chrome.runtime.getURL('dictionaries/dictionary-registry.json'));
            if (!response.ok) {
                throw new Error(`Failed to load registry: ${response.status}`);
            }
            this.registry = await response.json();
            console.log('Dictionary registry loaded:', this.registry);
        } catch (error) {
            console.error('Error loading dictionary registry:', error);
            throw error;
        }
    }

    /**
     * 获取所有可用词典
     * @param {string} type - 词典类型 ('preset', 'downloaded', 'local', 'all')
     * @param {boolean} enabledOnly - 是否只返回启用的词典
     * @returns {Array} 词典列表
     */
    getAvailableDictionaries(type = 'all', enabledOnly = true) {
        if (!this.registry) {
            console.warn('Registry not loaded');
            return [];
        }

        let dictionaries = [];
        
        if (type === 'all') {
            dictionaries = [
                ...this.registry.dictionaries.preset,
                ...this.registry.dictionaries.downloaded,
                ...this.registry.dictionaries.local
            ];
        } else if (this.registry.dictionaries[type]) {
            dictionaries = this.registry.dictionaries[type];
        }

        return enabledOnly ? dictionaries.filter(dict => dict.enabled) : dictionaries;
    }

    /**
     * 根据语言获取词典
     * @param {string} language - 语言代码
     * @param {boolean} enabledOnly - 是否只返回启用的词典
     * @returns {Array} 匹配的词典列表
     */
    getDictionariesByLanguage(language, enabledOnly = true) {
        const allDictionaries = this.getAvailableDictionaries('all', enabledOnly);
        return allDictionaries.filter(dict => dict.language === language)
                             .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * 根据ID获取词典信息
     * @param {string} id - 词典ID
     * @returns {Object|null} 词典信息
     */
    getDictionaryById(id) {
        const allDictionaries = this.getAvailableDictionaries('all', false);
        return allDictionaries.find(dict => dict.id === id) || null;
    }

    /**
     * 获取词典的词汇数据（转换为旧格式）
     * @param {string} id - 词典ID
     * @returns {Object|null} 词典的words数据（转换为 {word: "pos"} 格式）
     */
    getDictionaryData(id) {
        if (this.loadedDictionaries.has(id)) {
            const dictData = this.loadedDictionaries.get(id);
            if (dictData.words) {
                // 转换为旧格式：{word: "pos"}
                const converted = {};
                for (const [word, info] of Object.entries(dictData.words)) {
                    if (info.pos && info.pos.length > 0) {
                        converted[word] = info.pos[0]; // 取第一个词性
                    }
                }
                return converted;
            }
        }
        return null;
    }

    /**
     * 加载词典数据
     * @param {string} id - 词典ID
     * @param {boolean} useCache - 是否使用缓存
     * @returns {Object|null} 词典数据
     */
    async loadDictionary(id, useCache = true) {
        // 检查缓存
        if (useCache && this.loadedDictionaries.has(id)) {
            return this.loadedDictionaries.get(id);
        }

        const dictionaryInfo = this.getDictionaryById(id);
        if (!dictionaryInfo) {
            console.error(`Dictionary not found: ${id}`);
            return null;
        }

        try {
            const response = await fetch(chrome.runtime.getURL(dictionaryInfo.filePath));
            if (!response.ok) {
                throw new Error(`Failed to load dictionary: ${response.status}`);
            }
            
            const dictionaryData = await response.json();
            
            // 验证词典数据结构
            if (!this.validateDictionaryData(dictionaryData)) {
                throw new Error(`Invalid dictionary data structure: ${id}`);
            }

            // 缓存词典数据
            this.loadedDictionaries.set(id, dictionaryData);
            console.log(`Dictionary loaded: ${id}`);
            
            return dictionaryData;
        } catch (error) {
            console.error(`Error loading dictionary ${id}:`, error);
            return null;
        }
    }

    /**
     * 批量加载词典
     * @param {Array} ids - 词典ID数组
     * @param {boolean} useCache - 是否使用缓存
     * @returns {Map} 加载的词典数据映射
     */
    async loadDictionaries(ids, useCache = true) {
        const results = new Map();
        const loadPromises = ids.map(async (id) => {
            const data = await this.loadDictionary(id, useCache);
            if (data) {
                results.set(id, data);
            }
        });

        await Promise.all(loadPromises);
        return results;
    }

    /**
     * 根据语言自动加载最佳词典
     * @param {string} language - 语言代码
     * @returns {Object|null} 词典数据
     */
    async loadBestDictionaryForLanguage(language) {
        const dictionaries = this.getDictionariesByLanguage(language);
        if (dictionaries.length === 0) {
            console.warn(`No dictionary found for language: ${language}`);
            return null;
        }

        // 选择优先级最高的词典
        const bestDictionary = dictionaries[0];
        return await this.loadDictionary(bestDictionary.id);
    }

    /**
     * 验证词典数据结构
     * @param {Object} data - 词典数据
     * @returns {boolean} 是否有效
     */
    validateDictionaryData(data) {
        return data && 
               typeof data === 'object' &&
               data.meta &&
               data.words &&
               typeof data.words === 'object';
    }

    /**
     * 清理缓存
     * @param {string} id - 词典ID，不提供则清理所有缓存
     */
    clearCache(id = null) {
        if (id) {
            this.loadedDictionaries.delete(id);
            this.cache.delete(id);
        } else {
            this.loadedDictionaries.clear();
            this.cache.clear();
        }
    }

    /**
     * 获取词典统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        if (!this.registry) return null;

        return {
            total: this.getAvailableDictionaries('all', false).length,
            enabled: this.getAvailableDictionaries('all', true).length,
            preset: this.registry.dictionaries.preset.length,
            downloaded: this.registry.dictionaries.downloaded.length,
            local: this.registry.dictionaries.local.length,
            loaded: this.loadedDictionaries.size,
            languages: [...new Set(this.getAvailableDictionaries('all', false).map(d => d.language))]
        };
    }

    // ========== 预留接口：下载词典功能 ==========
    
    /**
     * 从官方仓库下载词典（预留接口）
     * @param {string} dictionaryId - 词典ID
     * @param {Function} progressCallback - 进度回调
     * @returns {Promise<boolean>} 下载是否成功
     */
    async downloadDictionary(dictionaryId, progressCallback = null) {
        // TODO: 实现下载逻辑
        console.log('Download dictionary feature not implemented yet:', dictionaryId);
        return false;
    }

    /**
     * 获取可下载的词典列表（预留接口）
     * @returns {Promise<Array>} 可下载的词典列表
     */
    async getDownloadableDictionaries() {
        // TODO: 从官方仓库获取可下载词典列表
        console.log('Get downloadable dictionaries feature not implemented yet');
        return [];
    }

    // ========== 预留接口：本地词典功能 ==========
    
    /**
     * 添加本地词典（预留接口）
     * @param {File} file - 词典文件
     * @param {Object} metadata - 词典元数据
     * @returns {Promise<boolean>} 添加是否成功
     */
    async addLocalDictionary(file, metadata) {
        // TODO: 实现本地词典添加逻辑
        console.log('Add local dictionary feature not implemented yet:', file.name);
        return false;
    }

    /**
     * 删除本地词典（预留接口）
     * @param {string} id - 词典ID
     * @returns {Promise<boolean>} 删除是否成功
     */
    async removeLocalDictionary(id) {
        // TODO: 实现本地词典删除逻辑
        console.log('Remove local dictionary feature not implemented yet:', id);
        return false;
    }

    /**
     * 更新注册表（预留接口）
     * @param {Object} updates - 更新内容
     * @returns {Promise<boolean>} 更新是否成功
     */
    async updateRegistry(updates) {
        // TODO: 实现注册表更新逻辑
        console.log('Update registry feature not implemented yet:', updates);
        return false;
    }
}

// 导出单例实例
const modernDictionaryManager = new ModernDictionaryManager();

// 兼容性：保持原有接口
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModernDictionaryManager, modernDictionaryManager };
} else if (typeof window !== 'undefined') {
    window.DictionaryManager = ModernDictionaryManager;  // 保持向后兼容
    window.ModernDictionaryManager = ModernDictionaryManager;
    window.modernDictionaryManager = modernDictionaryManager;
}