/**
 * 词典适配器 - 整合新旧词典系统
 * 提供向后兼容的接口，同时使用新的词典管理系统
 */
class DictionaryAdapter {
    constructor() {
        this.newManager = null;
        this.legacyData = {};
        this.isLoaded = false;
        this.loadPromise = null;
        this.enabledLanguages = {
            zh: true,
            en: true,
            fr: false,
            ru: false,
            es: false,
            ja: false
        };
        // 新增：词典ID级别的启用状态
        this.enabledDictionaries = {};
    }

    /**
     * 初始化适配器
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize() {
        if (this.loadPromise) {
            return await this.loadPromise;
        }
        
        this.loadPromise = this._doInitialize();
        return await this.loadPromise;
    }

    /**
     * 执行初始化
     * @private
     */
    async _doInitialize() {
        try {
            // 初始化新的词典管理器
            if (typeof DictionaryManager !== 'undefined') {
                this.newManager = new DictionaryManager();
                await this.newManager.initialize();
                
                // 加载所有预设词典
                await this._loadAllPresetDictionaries();
                
                this.isLoaded = true;
                console.log('DictionaryAdapter initialized successfully');
                return true;
            } else {
                throw new Error('DictionaryManager not available');
            }
        } catch (error) {
            console.error('Failed to initialize DictionaryAdapter:', error);
            // 降级到传统加载方式
            await this._loadLegacyDictionaries();
            return false;
        }
    }

    /**
     * 加载所有预设词典
     * @private
     */
    async _loadAllPresetDictionaries() {
        try {
            const presetDictionaries = this.newManager.getAvailableDictionaries('preset', false);
            
            for (const dictInfo of presetDictionaries) {
                const dictData = await this.newManager.loadDictionary(dictInfo.id);
                if (dictData && dictData.words) {
                    // 转换为旧格式：{word: "pos"}
                    const converted = this._convertDictionaryFormat(dictData);
                    this.legacyData[dictInfo.language] = converted;
                    
                    console.log(`Loaded dictionary: ${dictInfo.language} (${Object.keys(converted).length} words)`);
                }
            }
        } catch (error) {
            console.error('Error loading preset dictionaries:', error);
            throw error;
        }
    }

    /**
     * 转换词典格式
     * @param {Object} dictData 原始词典数据
     * @returns {Object} 转换后的词典数据
     * @private
     */
    _convertDictionaryFormat(dictData) {
        // 如果已经是旧格式 {word: "pos"}，直接返回
        if (!dictData.words && typeof dictData === 'object') {
            return dictData;
        }
        
        // 如果是新格式 {words: {word: {pos: [...]}}}，转换为旧格式
        if (dictData.words) {
            const converted = {};
            for (const [word, info] of Object.entries(dictData.words)) {
                if (info.pos && info.pos.length > 0) {
                    // 词性优先级：形容词 > 动词 > 名词 > 副词 > 其他
                    const priorityOrder = ['n', 'noun', 'v', 'verb', 'adj', 'a', 'adv', 'adverb'];
                    let selectedPos = info.pos[0]; // 默认取第一个
                    
                    for (const priority of priorityOrder) {
                        const found = info.pos.find(pos => pos.toLowerCase().includes(priority));
                        if (found) {
                            selectedPos = found;
                            break;
                        }
                    }
                    
                    converted[word] = selectedPos;
                }
            }
            return converted;
        }
        
        return dictData;
    }

    /**
     * 降级到传统词典加载方式
     * @private
     */
    async _loadLegacyDictionaries() {
        try {
            console.log('Falling back to legacy dictionary loading...');
            
            const languages = ['EN', 'ZH', 'FR', 'ES', 'RU', 'JA'];
            const loadPromises = languages.map(async (lang) => {
                try {
                    const response = await fetch(chrome.runtime.getURL(`dictionaries/${lang}_word.json`));
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    const data = await response.json();
                    const langCode = lang.toLowerCase();
                    this.legacyData[langCode] = this._convertDictionaryFormat(data);
                    return { 
                        lang: langCode, 
                        count: Object.keys(this.legacyData[langCode]).length, 
                        version: data.version || '1.0'
                    };
                } catch (error) {
                    console.warn(`Failed to load ${lang} dictionary:`, error.message);
                    return { lang: lang.toLowerCase(), count: 0, version: 'error' };
                }
            });
            
            const results = await Promise.all(loadPromises);
            const successfulLoads = results.filter(r => r.count > 0);
            
            if (successfulLoads.length === 0) {
                console.warn('No dictionaries loaded successfully, using fallback');
                this._loadFallbackDictionaries();
                return;
            }
            
            this.isLoaded = true;
            console.log('Legacy dictionaries loaded:', results.reduce((acc, result) => {
                acc[`${result.lang}_words`] = result.count;
                return acc;
            }, {}));
            
        } catch (error) {
            console.error('Legacy dictionary loading failed:', error);
            this._loadFallbackDictionaries();
        }
    }

    /**
     * 加载备用词典（优化版 - 避免单字高亮）
     * @private
     */
    _loadFallbackDictionaries() {
        console.log('Using optimized fallback dictionaries (multi-character words only)');
        
        // 优化：只包含多字符词汇，避免单字高亮问题
        this.legacyData.en = {
            'computer': 'n', 'keyboard': 'n', 'monitor': 'n', 'software': 'n',
            'beautiful': 'a', 'important': 'a', 'excellent': 'a', 'wonderful': 'a',
            'develop': 'v', 'create': 'v', 'analyze': 'v', 'optimize': 'v',
            'quickly': 'adv', 'carefully': 'adv', 'efficiently': 'adv'
        };
        
        this.legacyData.zh = {
            '计算机': 'n', '键盘': 'n', '显示器': 'n', '软件': 'n',
            '美丽': 'a', '重要': 'a', '优秀': 'a', '精彩': 'a',
            '开发': 'v', '创建': 'v', '分析': 'v', '优化': 'v',
            '快速': 'adv', '仔细': 'adv', '高效': 'adv'
        };
        
        this.isLoaded = true;
        console.log('Fallback dictionaries loaded with multi-character words only');
    }

    // ========== 向后兼容的接口 ==========

    /**
     * 获取指定语言的词典
     * @param {string} language 语言代码
     * @returns {Object} 词典数据
     */
    getDictionary(language) {
        console.log(`Getting dictionary for language: ${language}`);
        
        // 优先使用新的词典ID系统
        if (this.newManager && Object.keys(this.enabledDictionaries).length > 0) {
            const enabledDicts = this.newManager.getDictionariesByLanguage(language, false)
                .filter(dict => this.enabledDictionaries[dict.id]);
            
            console.log(`Found ${enabledDicts.length} enabled dictionaries for ${language}:`, 
                       enabledDicts.map(d => d.id));
            
            if (enabledDicts.length > 0) {
                // 按优先级排序（数字越小优先级越高）
                enabledDicts.sort((a, b) => (a.priority || 999) - (b.priority || 999));
                
                // 合并多个词典
                const mergedDict = {};
                for (const dict of enabledDicts) {
                    const dictData = this.newManager.getDictionaryData(dict.id);
                    if (dictData) {
                        // 高优先级词典的词条会覆盖低优先级的
                        Object.assign(mergedDict, dictData);
                    }
                }
                
                console.log(`Merged dictionary size: ${Object.keys(mergedDict).length}`);
                return mergedDict;
            }
        }
        
        // 向后兼容：使用语言级别的设置
        if (this.enabledLanguages[language]) {
            const dict = this.legacyData[language] || {};
            console.log(`Using legacy dictionary for ${language}, size: ${Object.keys(dict).length}`);
            return dict;
        }
        
        console.log(`No dictionary available for language: ${language}`);
        return {};
    }

    /**
     * 检查词典是否已加载
     * @returns {boolean} 是否已加载
     */
    isReady() {
        return this.isLoaded;
    }

    /**
     * 等待词典加载完成
     * @returns {Promise<boolean>} 加载结果
     */
    async waitForLoad() {
        if (this.isLoaded) return true;
        if (this.loadPromise) return await this.loadPromise;
        return await this.initialize();
    }

    /**
     * 查找词汇的词性
     * @param {string} word 要查找的词汇
     * @param {string} language 语言代码
     * @returns {string|null} 词性或null
     */
    lookupWord(word, language) {
        const dictionary = this.getDictionary(language);
        return dictionary[word] || null;
    }

    /**
     * 更新启用的语言列表（旧接口，向后兼容）
     * @param {Object} enabledLanguages 启用的语言设置
     */
    updateEnabledLanguages(enabledLanguages) {
        console.log('Updating enabled languages (legacy):', enabledLanguages);
        
        // 检查是否为新格式（包含词典ID）
        const hasNewFormat = Object.keys(enabledLanguages).some(key => key.includes('-'));
        
        if (hasNewFormat) {
            // 新格式：使用词典ID
            this.updateEnabledDictionaries(enabledLanguages);
        } else {
            // 旧格式：使用语言代码
            this.enabledLanguages = { ...this.enabledLanguages, ...enabledLanguages };
            
            // 如果使用新管理器，同步更新注册表中的启用状态
            if (this.newManager) {
                this._syncEnabledLanguagesToRegistry(enabledLanguages);
            }
        }
    }

    /**
     * 更新启用的词典列表（新接口）
     * @param {Object} enabledDictionaries 启用的词典设置
     */
    updateEnabledDictionaries(enabledDictionaries) {
        console.log('Updating enabled dictionaries:', enabledDictionaries);
        this.enabledDictionaries = { ...enabledDictionaries };
        
        // 同步更新语言状态
        this._updateLanguageStatusFromDictionaries();
    }

    /**
     * 同步启用语言设置到注册表
     * @param {Object} enabledLanguages 启用的语言设置
     * @private
     */
    _syncEnabledLanguagesToRegistry(enabledLanguages) {
        // TODO: 实现注册表更新逻辑
        // 这里可以调用新管理器的updateRegistry方法
        console.log('Syncing enabled languages to registry:', enabledLanguages);
    }

    /**
     * 根据启用的词典更新语言状态
     * @private
     */
    _updateLanguageStatusFromDictionaries() {
        if (!this.newManager) return;
        
        // 重置语言状态
        const languageStatus = {
            zh: false,
            en: false,
            fr: false,
            ru: false,
            es: false,
            ja: false
        };
        
        console.log('Updating language status from dictionaries:', this.enabledDictionaries);
        
        // 检查每个语言是否有启用的词典
        Object.keys(this.enabledDictionaries).forEach(dictId => {
            if (this.enabledDictionaries[dictId]) {
                const dict = this.newManager.getDictionaryById(dictId);
                console.log(`Dictionary ${dictId}:`, dict);
                if (dict && dict.language) {
                    languageStatus[dict.language] = true;
                    console.log(`Enabled language: ${dict.language}`);
                }
            }
        });
        
        // 更新语言启用状态
        this.enabledLanguages = languageStatus;
        
        console.log('Updated language status from dictionaries:', this.enabledLanguages);
    }

    /**
     * 检查语言是否启用
     * @param {string} language 语言代码
     * @returns {boolean} 是否启用
     */
    isLanguageEnabled(language) {
        return this.enabledLanguages[language] || false;
    }

    /**
     * 获取启用的语言列表
     * @returns {Array<string>} 启用的语言代码数组
     */
    getEnabledLanguages() {
        return Object.keys(this.enabledLanguages).filter(lang => this.enabledLanguages[lang]);
    }

    /**
     * 获取所有已加载词典的统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        const stats = {
            totalLanguages: Object.keys(this.legacyData).length,
            totalWords: 0,
            languages: {},
            usingNewManager: !!this.newManager
        };

        for (const [lang, dict] of Object.entries(this.legacyData)) {
            const wordCount = Object.keys(dict).length;
            stats.languages[lang] = wordCount;
            stats.totalWords += wordCount;
        }

        return stats;
    }

    // ========== 新功能接口 ==========

    /**
     * 获取词典元数据
     * @param {string} language 语言代码
     * @returns {Object|null} 词典元数据
     */
    getDictionaryMeta(language) {
        if (!this.newManager) return null;
        
        const dictionaries = this.newManager.getDictionariesByLanguage(language);
        return dictionaries.length > 0 ? dictionaries[0] : null;
    }

    /**
     * 获取所有可用词典信息
     * @returns {Array} 词典信息列表
     */
    getAvailableDictionaries() {
        if (!this.newManager) {
            // 返回传统格式的词典信息
            return Object.keys(this.legacyData).map(lang => ({
                language: lang,
                name: lang.toUpperCase(),
                enabled: this.enabledLanguages[lang] || false,
                wordCount: Object.keys(this.legacyData[lang]).length
            }));
        }
        
        return this.newManager.getAvailableDictionaries('all', false);
    }

    /**
     * 重新加载词典
     * @param {string} language 语言代码，不提供则重新加载所有
     * @returns {Promise<boolean>} 重新加载是否成功
     */
    async reload(language = null) {
        if (language) {
            // 重新加载特定语言词典
            if (this.newManager) {
                const dictionaries = this.newManager.getDictionariesByLanguage(language);
                if (dictionaries.length > 0) {
                    this.newManager.clearCache(dictionaries[0].id);
                    const dictData = await this.newManager.loadDictionary(dictionaries[0].id, false);
                    if (dictData) {
                        this.legacyData[language] = this._convertDictionaryFormat(dictData);
                        return true;
                    }
                }
            }
            return false;
        } else {
            // 重新加载所有词典
            this.isLoaded = false;
            this.loadPromise = null;
            if (this.newManager) {
                this.newManager.clearCache();
            }
            return await this.initialize();
        }
    }

    /**
     * 更新自建词典数据
     * @param {Array} customDictionaries 自建词典数组
     */
    async updateCustomDictionaries(customDictionaries) {
        try {
            console.log('DictionaryAdapter: 接收到自建词典数据:', customDictionaries);
            
            if (!customDictionaries || !Array.isArray(customDictionaries)) {
                console.log('DictionaryAdapter: 没有有效的自建词典数据');
                return;
            }

            // 清空现有自建词典数据
            this.customDictionaries = {};

            // 处理每个自建词典
            customDictionaries.forEach(dict => {
                if (dict.words && Array.isArray(dict.words)) {
                    const language = dict.language;
                    
                    // 初始化语言词典
                    if (!this.customDictionaries[language]) {
                        this.customDictionaries[language] = {};
                    }

                    // 转换词汇格式
                    dict.words.forEach(wordObj => {
                        const word = wordObj.word;
                        const pos = wordObj.pos || 'n';
                        this.customDictionaries[language][word] = pos;
                    });

                    console.log(`DictionaryAdapter: 处理${language}自建词典，${dict.words.length}个词汇`);
                }
            });

            // 合并自建词典到现有词典数据
            Object.keys(this.customDictionaries).forEach(language => {
                if (this.legacyData[language]) {
                    // 合并到现有语言词典
                    this.legacyData[language] = {
                        ...this.legacyData[language],
                        ...this.customDictionaries[language]
                    };
                } else {
                    // 创建新的语言词典
                    this.legacyData[language] = this.customDictionaries[language];
                }
                
                console.log(`DictionaryAdapter: ${language}词典总词汇数:`, Object.keys(this.legacyData[language]).length);
            });

            console.log('DictionaryAdapter: 自建词典更新完成');
        } catch (error) {
            console.error('DictionaryAdapter: 更新自建词典失败:', error);
        }
    }
}

// 导出适配器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DictionaryAdapter };
} else if (typeof window !== 'undefined') {
    window.DictionaryAdapter = DictionaryAdapter;
}