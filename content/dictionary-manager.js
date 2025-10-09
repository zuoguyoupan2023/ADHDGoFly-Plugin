// 旧版词典管理器模块（兼容性保留）
class LegacyDictionaryManager {
  constructor() {
    this.dictionaries = {};
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
    
    // 自建词典相关
    this.customDictionaries = {};
  }

  /**
   * 初始化并加载所有词典
   * @returns {Promise<boolean>} 加载是否成功
   */
  async initialize() {
    if (this.loadPromise) {
      return await this.loadPromise;
    }
    
    this.loadPromise = this.loadDictionaries();
    return await this.loadPromise;
  }

  /**
   * 加载所有语言词典
   * @private
   */
  async loadDictionaries() {
    try {
      console.log('开始加载词典...');
      
      const languages = ['EN', 'ZH', 'FR', 'ES', 'RU', 'JA'];
      const loadPromises = languages.map(async (lang) => {
        try {
          const response = await fetch(chrome.runtime.getURL(`dictionaries/${lang}_word.json`));
          const data = await response.json();
          const langCode = lang.toLowerCase();
          this.dictionaries[langCode] = this.convertDictionaryFormat(data);
          return { 
            lang: langCode, 
            count: Object.keys(this.dictionaries[langCode]).length, 
            version: data.version || '1.0'
          };
        } catch (error) {
          console.warn(`加载${lang}词典失败:`, error);
          return { lang: lang.toLowerCase(), count: 0, version: 'error' };
        }
      });
      
      const results = await Promise.all(loadPromises);
      
      this.isLoaded = true;
      console.log('词典加载完成:', results.reduce((acc, result) => {
        acc[`${result.lang}词汇数`] = result.count;
        return acc;
      }, {}));
      
      return true;
    } catch (error) {
      console.error('词典加载失败:', error);
      this.loadFallbackDictionaries();
      return false;
    }
  }

  /**
   * 转换词典格式：从 {version: "1.0", words: {word: {pos: ["n"]}}} 到 {word: "n"}
   * @param {Object} dictData 原始词典数据
   * @returns {Object} 转换后的词典
   * @private
   */
  convertDictionaryFormat(dictData) {
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
   * 加载备用词典（简化版）
   * @private
   */
  loadFallbackDictionaries() {
    console.log('使用备用词典');
    
    this.dictionaries.en = {
      'computer': 'n', 'book': 'n', 'table': 'n', 'person': 'n',
      'good': 'a', 'bad': 'a', 'big': 'a', 'small': 'a',
      'run': 'v', 'jump': 'v', 'read': 'v', 'write': 'v'
    };
    
    this.dictionaries.zh = {
      '电脑': 'n', '书': 'n', '桌子': 'n', '人': 'n',
      '好': 'a', '坏': 'a', '大': 'a', '小': 'a',
      '跑': 'v', '跳': 'v', '读': 'v', '写': 'v'
    };
    
    this.isLoaded = true;
  }

  /**
   * 获取指定语言的词典
   * @param {string} language 语言代码
   * @returns {Object} 词典对象
   */
  getDictionary(language) {
    // 检查语言是否启用（新逻辑）
    if (!this.isLanguageEnabled(language)) {
      return {};
    }
    
    // 合并预设词典和自建词典
    const presetDict = this.dictionaries[language] || {};
    const customDict = this.customDictionaries[language] || {};
    return { ...presetDict, ...customDict };
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
   * 获取所有已加载词典的统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    const stats = {
      totalLanguages: Object.keys(this.dictionaries).length,
      totalWords: 0,
      languages: {}
    };

    for (const [lang, dict] of Object.entries(this.dictionaries)) {
      const wordCount = Object.keys(dict).length;
      stats.languages[lang] = wordCount;
      stats.totalWords += wordCount;
    }

    return stats;
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
    console.log('更新启用的语言 (legacy):', enabledLanguages);
    
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
    console.log('更新语言支持配置:', config);
    
    Object.keys(config).forEach(lang => {
      if (this.supportedLanguages[lang]) {
        this.supportedLanguages[lang].enabled = config[lang];
      }
    });
    
    // 重新计算生效语言并更新兼容性缓存
    this._updateLanguageStatusCache();
  }

  /**
   * 更新启用的词典列表（新接口）
   * @param {Object} enabledDictionaries 启用的词典设置
   */
  updateEnabledDictionaries(enabledDictionaries) {
    console.log('更新启用的词典:', enabledDictionaries);
    this.enabledDictionaries = { ...enabledDictionaries };
    
    // 更新兼容性缓存
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
    // 检查预设词典（基于文件名）
    if (this.dictionaries[language] && Object.keys(this.dictionaries[language]).length > 0) {
      // 检查该语言的基础词典是否在启用列表中
      const presetDictId = `${language}-preset`;
      if (this.enabledDictionaries[presetDictId]) {
        return true;
      }
    }
    
    // 检查自建词典
    return Object.keys(this.enabledDictionaries).some(dictId => {
      if (!this.enabledDictionaries[dictId]) return false;
      
      if (dictId.startsWith('custom-')) {
        // 检查自建词典是否包含该语言的词汇
        return this.customDictionaries[language] && Object.keys(this.customDictionaries[language]).length > 0;
      }
      
      return false;
    });
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
    
    console.log('更新语言状态缓存:', this.enabledLanguages);
  }

  /**
   * 获取语言支持状态
   * @returns {Object} 语言支持配置的副本
   */
  getSupportedLanguages() {
    return JSON.parse(JSON.stringify(this.supportedLanguages));
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LegacyDictionaryManager;
} else {
  window.LegacyDictionaryManager = LegacyDictionaryManager;
}