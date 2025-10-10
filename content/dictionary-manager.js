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
   * 转换词典格式
   * @param {Object} dictData 原始词典数据
   * @returns {Object} 转换后的词典数据
   * @private
   */
  convertDictionaryFormat(dictData) {
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
          const priorityOrder = ['adj', 'a', 'v', 'verb', 'n', 'noun', 'adv', 'adverb'];
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
   * 加载备用词典（优化版 - 避免单字高亮）
   * @private
   */
  loadFallbackDictionaries() {
    console.log('Loading optimized fallback dictionaries (multi-character words only)');
    
    // 优化：只包含多字符词汇，避免单字高亮问题
    this.dictionaries.en = {
      'computer': 'n', 'keyboard': 'n', 'monitor': 'n', 'software': 'n',
      'beautiful': 'a', 'important': 'a', 'excellent': 'a', 'wonderful': 'a',
      'develop': 'v', 'create': 'v', 'analyze': 'v', 'optimize': 'v',
      'quickly': 'adv', 'carefully': 'adv', 'efficiently': 'adv'
    };
    
    this.dictionaries.zh = {
      '计算机': 'n', '键盘': 'n', '显示器': 'n', '软件': 'n',
      '美丽': 'a', '重要': 'a', '优秀': 'a', '精彩': 'a',
      '开发': 'v', '创建': 'v', '分析': 'v', '优化': 'v',
      '快速': 'adv', '仔细': 'adv', '高效': 'adv'
    };
    
    this.isLoaded = true;
    console.log('Fallback dictionaries loaded with multi-character words only');
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