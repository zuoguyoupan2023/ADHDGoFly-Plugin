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
            const response = await fetch(chrome.runtime.getURL('dictionaries/dictionary-registry.json'));
            if (!response.ok) {
                throw new Error(`Failed to load registry: ${response.status}`);
            }
            this.registry = await response.json();
            
            // 动态发现新词典文件
            await this.discoverNewDictionaries();
            
            console.log('Dictionary registry loaded:', this.registry);
        } catch (error) {
            console.error('Error loading dictionary registry:', error);
            throw error;
        }
    }

    /**
     * 动态发现新词典文件
     */
    async discoverNewDictionaries() {
        console.log('开始动态发现新词典文件...');
        
        // 语言文件夹映射
        const languageFolders = {
            'ZH': 'zh',
            'EN': 'en', 
            'ES': 'es',
            'FR': 'fr',
            'JA': 'ja',
            'RU': 'ru'
        };

        // 收集已存在的词典文件路径
        const existingFilePaths = new Set();
        this.registry.dictionaries.preset.forEach(dict => {
            existingFilePaths.add(dict.filePath);
        });

        // 确保local数组存在
        if (!this.registry.dictionaries.local) {
            this.registry.dictionaries.local = [];
        }

        // 扫描每个语言文件夹
        for (const [folderName, langCode] of Object.entries(languageFolders)) {
            await this.scanLanguageFolder(folderName, langCode, existingFilePaths);
        }
    }

    /**
     * 扫描语言文件夹中的所有JSON文件
     */
    async scanLanguageFolder(folderName, langCode, existingFilePaths) {
        try {
            // 使用fetch API尝试获取文件夹内容（通过尝试常见文件名）
            const commonFileNames = [
                // 数字文件名（1-999）
                ...Array.from({length: 999}, (_, i) => `${i + 1}.json`),
                // 常见的自定义文件名
                'custom.json', 'user.json', 'my.json', 'local.json', 'dict.json', 'dictionary.json', 'words.json', 'vocab.json'
            ];

            for (const fileName of commonFileNames) {
                const filePath = `dictionaries/${folderName}/${fileName}`;
                
                // 跳过已存在的文件
                if (existingFilePaths.has(filePath)) {
                    continue;
                }

                await this.tryLoadCustomDictionary(filePath, langCode, existingFilePaths);
            }
        } catch (error) {
            console.warn(`扫描语言文件夹 ${folderName} 时出错:`, error);
        }
    }

    /**
     * 尝试加载自定义词典文件
     */
    async tryLoadCustomDictionary(filePath, langCode, existingFilePaths) {
        try {
            const response = await fetch(chrome.runtime.getURL(filePath));
            if (!response.ok) {
                return; // 文件不存在，静默跳过
            }
            
            const dictData = await response.json();
            
            // 验证词典数据格式
            if (!this.validateCustomDictionaryData(dictData)) {
                console.warn(`词典文件格式无效: ${filePath}`);
                return;
            }
            
            // 生成词典ID
            const fileName = filePath.split('/').pop().replace('.json', '');
            const dictId = `${langCode}-${fileName}-local`;
            
            // 检查是否已存在相同ID
            const existingDict = this.registry.dictionaries.local.find(dict => dict.id === dictId);
            if (existingDict) {
                return;
            }
            
            // 从meta字段或直接从根级别获取词典信息
            const meta = dictData.meta || {};
            const dictName = meta.name || dictData.name || fileName;
            const dictLanguage = meta.language || dictData.language || langCode;
            const dictDomain = meta.domain || dictData.domain || "custom";
            const dictDescription = meta.description || dictData.description || "用户自定义词典";
            const dictAuthor = meta.author || dictData.author || "用户";
            const dictVersion = meta.version || dictData.version || "1.0.0";
            const wordCount = meta.wordCount || dictData.wordCount || (dictData.words ? Object.keys(dictData.words).length : 0);
            
            // 创建词典条目
            const dictEntry = {
                id: dictId,
                name: dictName,
                displayName: {
                    zh: typeof dictDescription === 'object' ? dictDescription.zh || dictName : dictName,
                    en: typeof dictDescription === 'object' ? dictDescription.en || dictName : dictName
                },
                language: dictLanguage,
                type: "local",
                domain: dictDomain,
                filePath: filePath,
                enabled: false, // 默认禁用，用户可手动启用
                priority: dictData.priority || 50,
                description: typeof dictDescription === 'object' ? dictDescription : { zh: dictDescription, en: dictDescription },
                author: dictAuthor,
                version: dictVersion,
                wordCount: wordCount
            };

            // 添加到本地词典列表
            this.registry.dictionaries.local.push(dictEntry);
            existingFilePaths.add(filePath);
            
            console.log(`发现新词典: ${dictName} (${filePath})`);
        } catch (error) {
            // 静默处理文件不存在的情况，避免控制台被404错误淹没
            if (!error.message.includes('Failed to fetch')) {
                console.warn(`加载词典文件失败 ${filePath}:`, error);
            }
        }
    }

    /**
     * 验证自定义词典数据格式
     */
    validateCustomDictionaryData(data) {
        // 基本格式检查
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // 检查是否有words字段
        if (!data.words) {
            return false;
        }
        
        // 检查words字段格式
        if (typeof data.words !== 'object') {
            return false;
        }
        
        // 检查words是否为空
        if (Object.keys(data.words).length === 0) {
            return false;
        }
        
        return true;
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
const dictionaryManager = new DictionaryManager();

// 兼容性：保持原有接口
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DictionaryManager, dictionaryManager };
} else if (typeof window !== 'undefined') {
    window.DictionaryManager = DictionaryManager;
    window.dictionaryManager = dictionaryManager;
}