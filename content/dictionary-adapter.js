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
        
        // 新架构：语言支持配置（系统级）- 所有语言默认支持
        this.supportedLanguages = {
            zh: { enabled: true, name: '中文', priority: 1 },
            en: { enabled: true, name: 'English', priority: 2 },
            fr: { enabled: true, name: 'Français', priority: 3 },
            es: { enabled: true, name: 'Español', priority: 4 },
            ru: { enabled: true, name: 'Русский', priority: 5 },
            ja: { enabled: true, name: '日本語', priority: 6 }
        };
        
        // 词典启用状态（用户级）
        this.enabledDictionaries = {};
        
        // 兼容性：保留旧接口，通过计算得出
        this.enabledLanguages = {};
        
        // 自建词典语言缓存
        this.customDictionaryLanguages = new Map();
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
        
        // 向后兼容：检查语言是否启用
        if (this.isLanguageEnabled(language)) {
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
            // 旧格式：转换为语言支持配置
            console.warn('updateEnabledLanguages with language codes is deprecated, converting to supportedLanguages');
            this.updateSupportedLanguages(enabledLanguages);
        }
    }

    /**
     * 更新语言支持配置（新接口）
     * @param {Object} config 语言支持配置
     */
    updateSupportedLanguages(config) {
        console.log('Updating supported languages:', config);
        
        Object.keys(config).forEach(lang => {
            if (this.supportedLanguages[lang]) {
                this.supportedLanguages[lang].enabled = config[lang];
            }
        });
        
        // 重新计算生效语言并更新兼容性缓存
        this._updateLanguageStatusCache();
    }

    /**
     * 获取语言支持状态
     * @returns {Object} 语言支持配置的副本
     */
    getSupportedLanguages() {
        return JSON.parse(JSON.stringify(this.supportedLanguages));
    }

    /**
     * 更新启用的词典列表（新接口）
     * @param {Object} enabledDictionaries 启用的词典设置
     */
    updateEnabledDictionaries(enabledDictionaries) {
        console.log('Updating enabled dictionaries:', enabledDictionaries);
        this.enabledDictionaries = { ...enabledDictionaries };
        
        // 更新兼容性缓存
        this._updateLanguageStatusCache();
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
     * 更新语言状态缓存（兼容性）
     * @private
     */
    _updateLanguageStatusCache() {
        // 为了兼容性，更新 enabledLanguages 缓存
        const effectiveLanguages = {};
        Object.keys(this.supportedLanguages).forEach(lang => {
            effectiveLanguages[lang] = this.isLanguageEnabled(lang);
        });
        
        this.enabledLanguages = effectiveLanguages;
        
        console.log('Updated language status cache:', this.enabledLanguages);
    }

    /**
     * 根据启用的词典更新语言状态（旧方法，保留兼容性）
     * @private
     * @deprecated 使用 _updateLanguageStatusCache 替代
     */
    _updateLanguageStatusFromDictionaries() {
        console.warn('_updateLanguageStatusFromDictionaries is deprecated, use _updateLanguageStatusCache instead');
        this._updateLanguageStatusCache();
    }

    /**
     * 检查语言是否启用（新实现：语言支持 && 有启用的词典）
     * @param {string} language 语言代码
     * @returns {boolean} 是否启用
     */
    isLanguageEnabled(language) {
        const langConfig = this.supportedLanguages[language];
        if (!langConfig || !langConfig.enabled) {
            return false;
        }
        
        return this.hasEnabledDictionariesForLanguage(language);
    }

    /**
     * 获取启用的语言列表（新实现：动态计算）
     * @returns {Array<string>} 启用的语言代码数组
     */
    getEnabledLanguages() {
        const enabledLanguages = [];
        
        Object.keys(this.supportedLanguages).forEach(lang => {
            const langConfig = this.supportedLanguages[lang];
            
            // 语言支持 && 有启用的词典
            if (langConfig.enabled && this.hasEnabledDictionariesForLanguage(lang)) {
                enabledLanguages.push(lang);
            }
        });
        
        // 按优先级排序
        return enabledLanguages.sort((a, b) => {
            return this.supportedLanguages[a].priority - this.supportedLanguages[b].priority;
        });
    }

    /**
     * 检查指定语言是否有启用的词典
     * @param {string} language 语言代码
     * @returns {boolean} 是否有启用的词典
     */
    hasEnabledDictionariesForLanguage(language) {
        return Object.keys(this.enabledDictionaries).some(dictId => {
            if (!this.enabledDictionaries[dictId]) return false;
            
            // 预设词典检查
            if (dictId.includes('-preset')) {
                return dictId.startsWith(language + '-');
            }
            
            // 自建词典检查
            if (dictId.startsWith('custom-')) {
                return this.getCustomDictionaryLanguage(dictId) === language;
            }
            
            // 下载词典检查（未来扩展）
            if (dictId.startsWith('downloaded-')) {
                return this.getDownloadedDictionaryLanguage(dictId) === language;
            }
            
            return false;
        });
    }

    /**
     * 获取自建词典的语言
     * @param {string} dictId 自建词典ID
     * @returns {string|null} 语言代码
     */
    getCustomDictionaryLanguage(dictId) {
        // 从缓存中获取
        if (this.customDictionaryLanguages.has(dictId)) {
            return this.customDictionaryLanguages.get(dictId);
        }
        
        // 如果缓存中没有，尝试从启用的自建词典中推断
        // 这是一个临时方案，理想情况下应该从IndexedDB获取
        console.log(`Getting language for custom dictionary ${dictId} - checking enabled dictionaries`);
        
        // 暂时假设自建词典支持中英文（这是最常见的情况）
        // 在实际使用中，这个信息应该在 updateCustomDictionaries 时被设置
        return 'zh'; // 默认返回中文，可以根据实际需求调整
    }

    /**
     * 获取下载词典的语言（未来扩展）
     * @param {string} dictId 下载词典ID
     * @returns {string|null} 语言代码
     */
    getDownloadedDictionaryLanguage(dictId) {
        // 未来实现
        console.log(`Getting language for downloaded dictionary ${dictId} - not implemented yet`);
        return null;
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

    // ========== 自建词典支持 ==========

    /**
     * 更新自建词典数据
     * @param {Array} customDictionaries 自建词典数组
     */
    updateCustomDictionaries(customDictionaries) {
        console.log('DictionaryAdapter: 更新自建词典数据:', customDictionaries);
        
        if (!customDictionaries || !Array.isArray(customDictionaries)) {
            console.log('DictionaryAdapter: 自建词典数据为空或格式错误');
            return;
        }

        // 记录自建词典涉及的语言
        const customDictLanguages = new Set();

        // 处理每个自建词典
        customDictionaries.forEach(dict => {
            if (dict.words && Array.isArray(dict.words)) {
                console.log(`DictionaryAdapter: 处理自建词典 ${dict.name || dict.id}，包含 ${dict.words.length} 个词汇`);
                
                dict.words.forEach(wordObj => {
                    const word = wordObj.word;
                    const pos = wordObj.pos || 'n'; // 默认为名词
                    
                    // 检测词汇语言并分类存储
                    const language = this._detectWordLanguage(word);
                    customDictLanguages.add(language);
                    
                    // 缓存自建词典的语言信息
                    this.customDictionaryLanguages.set(dict.id, language);
                    
                    // 确保语言词典存在
                    if (!this.legacyData[language]) {
                        this.legacyData[language] = {};
                        console.log(`DictionaryAdapter: 创建新的语言词典 ${language}`);
                    }
                    
                    // 添加词汇到对应语言词典
                    this.legacyData[language][word] = pos;
                });
            }
        });
        
        // 更新语言状态缓存
        this._updateLanguageStatusCache();
        
        // 输出合并后的统计信息
        const stats = Object.keys(this.legacyData).reduce((acc, lang) => {
            acc[lang] = Object.keys(this.legacyData[lang]).length;
            return acc;
        }, {});
        console.log('DictionaryAdapter: 自建词典合并完成，当前词典状态:', stats);
        console.log('DictionaryAdapter: 更新后的语言启用状态:', this.getEnabledLanguages());
    }

    /**
     * 检测单词语言
     * @param {string} word 词汇
     * @returns {string} 语言代码
     * @private
     */
    _detectWordLanguage(word) {
        // 中文字符检测
        if (/[\u4e00-\u9fa5]/.test(word)) return 'zh';
        
        // 日文字符检测（平假名、片假名、汉字）
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(word)) return 'ja';
        
        // 俄文字符检测（西里尔字母）
        if (/[\u0400-\u04ff]/.test(word)) return 'ru';
        
        // 法文特殊字符检测
        if (/[àâäéèêëïîôöùûüÿç]/i.test(word)) return 'fr';
        
        // 西班牙文特殊字符检测
        if (/[ñáéíóúü¿¡]/i.test(word)) return 'es';
        
        // 默认英文
        return 'en';
    }

    /**
     * 设置自建词典的语言（手动指定）
     * @param {string} dictId 自建词典ID
     * @param {string} language 语言代码
     */
    setCustomDictionaryLanguage(dictId, language) {
        this.customDictionaryLanguages.set(dictId, language);
        console.log(`Set custom dictionary ${dictId} language to ${language}`);
        
        // 更新语言状态缓存
        this._updateLanguageStatusCache();
    }
}

// 导出适配器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DictionaryAdapter };
} else if (typeof window !== 'undefined') {
    window.DictionaryAdapter = DictionaryAdapter;
}