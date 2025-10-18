/**
 * 新版词典管理器
 * 负责词典的动态发现、加载和管理
 */
class DictionaryManager {
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
            // 首先加载默认注册表
            const response = await fetch(chrome.runtime.getURL('dictionaries/dictionary-registry.json'));
            if (!response.ok) {
                throw new Error(`Failed to load registry: ${response.status}`);
            }
            this.registry = await response.json();
            
            // 然后加载自定义注册表（如果存在）
            const customRegistryResult = await new Promise((resolve) => {
                chrome.storage.local.get(['customDictRegistry'], (result) => {
                    resolve(result);
                });
            });
            
            if (customRegistryResult.customDictRegistry) {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest && chrome.runtime.getManifest().version_name && chrome.runtime.getManifest().version_name.includes('dev')) {
                    console.log('🔍 Found custom dictionary registry in storage');
                }
                const customRegistry = customRegistryResult.customDictRegistry;
                
                // 合并自定义词典到注册表
                if (customRegistry.local && Array.isArray(customRegistry.local)) {
                    if (!this.registry.local) {
                        this.registry.local = [];
                    }
                    
                    // 添加自定义词典，避免重复
                    for (const customDict of customRegistry.local) {
                        const exists = this.registry.local.find(dict => dict.id === customDict.id);
                        if (!exists) {
                            this.registry.local.push(customDict);
                            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest && chrome.runtime.getManifest().version_name && chrome.runtime.getManifest().version_name.includes('dev')) {
                                console.log(`✅ Added custom dictionary to registry: ${customDict.displayName} (${customDict.id})`);
                            }
                        }
                    }
                }
            }
            
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
                ...(this.registry.dictionaries.local || []),  // 从 dictionaries.local 访问
                ...(this.registry.local || [])  // 同时也从根级别的 local 访问（兼容性）
            ];
        } else if (type === 'local') {
            // 对于 local 类型，同时检查两个位置
            dictionaries = [
                ...(this.registry.dictionaries.local || []),
                ...(this.registry.local || [])
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
        
        // 特别调试111词典
        if (id === 'custom-1760195631107') {
            if (process.env.NODE_ENV === 'development') {
                console.log('🔍 Searching for 111 dictionary in registry...');
                console.log('All available dictionaries:', allDictionaries.map(d => ({ id: d.id, name: d.name, language: d.language })));
                console.log('Registry structure:', this.registry ? {
                    preset: this.registry.dictionaries.preset.length,
                    downloaded: this.registry.dictionaries.downloaded.length,
                    local: this.registry.dictionaries.local.length
                } : 'Registry not loaded');
            }
        }
        
        const found = allDictionaries.find(dict => dict.id === id) || null;
        
        if (id === 'custom-1760195631107') {
            if (process.env.NODE_ENV === 'development') {
                console.log('🔍 Search result for 111 dictionary:', found);
            }
        }
        
        return found;
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
            let dictionaryData = null;
            
            // 检查是否是外部词典（通过 popup 添加的）
            if (dictionaryInfo.type === 'local' && dictionaryInfo.source === 'external') {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`🔍 Loading external dictionary from storage: ${id}`);
                }
                
                // 从 Chrome 存储中加载外部词典数据
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get([`dictionary_${id}`], (result) => {
                        resolve(result);
                    });
                });
                
                if (result[`dictionary_${id}`]) {
                    dictionaryData = result[`dictionary_${id}`];
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`✅ External dictionary loaded from storage: ${id} (${Object.keys(dictionaryData.words || {}).length} words)`);
                    }
                } else {
                    throw new Error(`External dictionary data not found in storage: ${id}`);
                }
            } else {
                // 从文件系统加载预设词典
                console.log(`📄 Loading preset dictionary from file: ${dictionaryInfo.filePath}`);
                const response = await fetch(chrome.runtime.getURL(dictionaryInfo.filePath));
                if (!response.ok) {
                    throw new Error(`Failed to load dictionary: ${response.status}`);
                }
                
                dictionaryData = await response.json();
                if (process.env.NODE_ENV === 'development') {
                    console.log(`✅ Preset dictionary loaded from file: ${id} (${Object.keys(dictionaryData.words || {}).length} words)`);
                }
            }
            
            // 验证词典数据结构
            if (!this.validateDictionaryData(dictionaryData)) {
                throw new Error(`Invalid dictionary data structure: ${id}`);
            }

            // 缓存词典数据
            this.loadedDictionaries.set(id, dictionaryData);
            console.log(`Dictionary cached: ${id}`);
            
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
const dictionaryManager = new DictionaryManager();

// 兼容性：保持原有接口
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DictionaryManager, dictionaryManager };
} else if (typeof window !== 'undefined') {
    window.DictionaryManager = DictionaryManager;
    window.dictionaryManager = dictionaryManager;
}