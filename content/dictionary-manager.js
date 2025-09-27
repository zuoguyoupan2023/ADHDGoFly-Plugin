// 词典管理器模块
class DictionaryManager {
  constructor() {
    this.dictionaries = {};
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
    return this.dictionaries[language] || {};
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