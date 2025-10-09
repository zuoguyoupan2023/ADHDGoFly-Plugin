// 词典管理器模块
class DictionaryManager {
  constructor() {
    this.dictionaries = {};
    this.customDictionaries = {}; // 存储自建词典
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
    // 只返回启用的语言词典
    if (!this.enabledLanguages[language]) {
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
   * 更新启用的语言列表
   * @param {Object} enabledLanguages 启用的语言设置
   */
  updateEnabledLanguages(enabledLanguages) {
    console.log('更新启用的语言:', enabledLanguages);
    this.enabledLanguages = { ...this.enabledLanguages, ...enabledLanguages };
  }

  /**
   * 更新启用的词典列表（新格式，支持词典ID）
   * @param {Object} dictSettings 词典设置对象，键为词典ID，值为是否启用
   */
  updateEnabledDictionaries(dictSettings) {
    console.log('更新启用的词典:', dictSettings);
    
    // 重置所有语言为禁用状态
    this.enabledLanguages = {
      zh: false,
      en: false,
      fr: false,
      ru: false,
      es: false,
      ja: false
    };
    
    // 根据词典ID映射到语言
    const dictToLanguageMap = {
      'zh-preset': 'zh',
      'en-preset': 'en',
      'fr-preset': 'fr',
      'ru-preset': 'ru',
      'es-preset': 'es',
      'ja-preset': 'ja',
      // 专业词典也映射到对应语言
      'zh-animal-preset': 'zh',
      'zh-finance-preset': 'zh',
      'zh-automotive-preset': 'zh',
      'zh-idiom-preset': 'zh',
      'zh-geography-preset': 'zh',
      'zh-food-preset': 'zh',
      'zh-technology-preset': 'zh',
      'zh-legal-preset': 'zh',
      'zh-history-preset': 'zh',
      'zh-medical-preset': 'zh',
      'zh-literature-preset': 'zh'
    };
    
    // 检查启用的词典并映射到语言
    let hasEnabledDict = false;
    for (const [dictId, enabled] of Object.entries(dictSettings)) {
      if (enabled) {
        hasEnabledDict = true;
        const language = dictToLanguageMap[dictId];
        if (language) {
          this.enabledLanguages[language] = true;
          console.log(`启用语言 ${language} (通过词典 ${dictId})`);
        } else {
          // 可能是自建词典，暂时启用中英文以支持自建词典
          console.log(`未知词典ID: ${dictId}，可能是自建词典`);
          this.enabledLanguages.zh = true;
          this.enabledLanguages.en = true;
        }
      }
    }
    
    // 如果没有任何词典被启用，启用默认的中英文
    if (!hasEnabledDict) {
      console.log('没有启用的词典，使用默认设置');
      this.enabledLanguages.zh = true;
      this.enabledLanguages.en = true;
    }
    
    console.log('最终启用的语言:', this.enabledLanguages);
  }

  /**
   * 更新自建词典数据
   * @param {Array} customDictionaries 自建词典数组
   */
  updateCustomDictionaries(customDictionaries) {
    console.log('更新自建词典数据:', customDictionaries);
    
    // 清空现有自建词典
    this.customDictionaries = {};
    
    // 处理每个自建词典
    if (customDictionaries && Array.isArray(customDictionaries)) {
      customDictionaries.forEach(dict => {
        if (dict.words && Array.isArray(dict.words)) {
          dict.words.forEach(wordObj => {
            const word = wordObj.word;
            const pos = wordObj.pos || 'n'; // 默认为名词
            
            // 检测词汇语言并分类存储
            const language = this.detectWordLanguage(word);
            
            if (!this.customDictionaries[language]) {
              this.customDictionaries[language] = {};
            }
            
            this.customDictionaries[language][word] = pos;
          });
        }
      });
    }
    
    console.log('自建词典处理完成:', this.customDictionaries);
  }

  /**
   * 检测单词语言
   * @param {string} word 词汇
   * @returns {string} 语言代码
   */
  detectWordLanguage(word) {
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
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DictionaryManager;
} else {
  window.DictionaryManager = DictionaryManager;
}