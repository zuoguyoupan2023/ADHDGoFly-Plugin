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
     * 转换词典格式：从新格式转换为旧格式
     * @param {Object} dictData 新格式词典数据
     * @returns {Object} 旧格式词典数据
     * @private
     */
    _convertDictionaryFormat(dictData) {
        const converted = {};
        if (dictData.words) {
            for (const [word, info] of Object.entries(dictData.words)) {
                if (info.pos && info.pos.length > 0) {
                    converted[word] = info.pos[0]; // 取第一个词性
                }
            }
        }
        return converted;
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
                    const data = await response.json();
                    const langCode = lang.toLowerCase();
                    this.legacyData[langCode] = this._convertDictionaryFormat(data);
                    return { 
                        lang: langCode, 
                        count: Object.keys(this.legacyData[langCode]).length, 
                        version: data.version || '1.0'
                    };
                } catch (error) {
                    console.warn(`Failed to load ${lang} dictionary:`, error);
                    return { lang: lang.toLowerCase(), count: 0, version: 'error' };
                }
            });
            
            const results = await Promise.all(loadPromises);
            
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
     * 加载备用词典（简化版）
     * @private
     */
    _loadFallbackDictionaries() {
        console.log('Using fallback dictionaries');
        
        this.legacyData.en = {
            'computer': 'n', 'book': 'n', 'table': 'n', 'person': 'n',
            'good': 'a', 'bad': 'a', 'big': 'a', 'small': 'a',
            'run': 'v', 'jump': 'v', 'read': 'v', 'write': 'v'
        };
        
        this.legacyData.zh = {
            '电脑': 'n', '书': 'n', '桌子': 'n', '人': 'n',
            '好': 'a', '坏': 'a', '大': 'a', '小': 'a',
            '跑': 'v', '跳': 'v', '读': 'v', '写': 'v'
        };
        
        this.isLoaded = true;
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
            return this.legacyData[language] || {};
        }
        
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
        // 首先查找自建词典
        const customResult = this.lookupInCustomDictionaries(word, language);
        if (customResult) {
            return customResult;
        }
        
        // 然后查找预设词典
        const dictionary = this.getDictionary(language);
        return dictionary[word] || null;
    }

    /**
     * 在自建词典中查找词汇
     * @param {string} word 要查找的词汇
     * @param {string} language 语言代码
     * @returns {string|null} 词性或null
     */
    lookupInCustomDictionaries(word, language) {
        if (!this.customDictionaries) {
            return null;
        }
        
        // 遍历所有自建词典
        for (const dict of this.customDictionaries) {
            // 检查词典是否启用且语言匹配
            if (dict.enabled !== false && dict.language === language && dict.words) {
                for (const wordData of dict.words) {
                    if (wordData.word === word) {
                        // 返回第一个匹配的词性
                        return Array.isArray(wordData.pos) ? wordData.pos[0] : wordData.pos;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * 设置自建词典数据
     * @param {Array} customDictionaries 自建词典数组
     */
    setCustomDictionaries(customDictionaries) {
        this.customDictionaries = customDictionaries || [];
        console.log('自建词典已更新:', this.customDictionaries.length, '个词典');
    }

    /**
     * 刷新自建词典数据
     */
    async refreshCustomDictionaries() {
        if (window.customDictDB) {
            try {
                const customDicts = await window.customDictDB.getAllDicts();
                this.setCustomDictionaries(customDicts);
            } catch (error) {
                console.error('刷新自建词典失败:', error);
            }
        }
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
}

// 导出适配器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DictionaryAdapter };
} else if (typeof window !== 'undefined') {
    window.DictionaryAdapter = DictionaryAdapter;
}