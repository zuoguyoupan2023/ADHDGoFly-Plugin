// 词典管理器
class DictionaryManager {
  constructor() {
    this.dictionaries = {};
    this.isLoaded = false;
    this.loadPromise = this.loadDictionaries();
  }

  async loadDictionaries() {
    try {
      console.log('开始加载词典...');
      
      const languages = ['EN', 'ZH', 'FR', 'ES', 'RU', 'JA'];
      const loadPromises = languages.map(async (lang) => {
        const response = await fetch(chrome.runtime.getURL(`dictionaries/${lang}_word.json`));
        const data = await response.json();
        const langCode = lang.toLowerCase();
        this.dictionaries[langCode] = this.convertNewDictionary(data);
        return { lang: langCode, count: Object.keys(this.dictionaries[langCode]).length, version: data.version };
      });
      
      const results = await Promise.all(loadPromises);
      
      this.isLoaded = true;
      console.log('词典加载完成', results.reduce((acc, result) => {
        acc[`${result.lang}词汇数`] = result.count;
        acc[`${result.lang}版本`] = result.version;
        return acc;
      }, {}));
      
      return true;
    } catch (error) {
      console.error('词典加载失败:', error);
      // 使用备用的简化词典
      this.loadFallbackDictionaries();
      return false;
    }
  }

  // 转换新词典格式：从 {version: "1.0", words: {word: {pos: ["n"]}}} 到 {word: "n"}
  convertNewDictionary(dictData) {
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

  // 备用词典（简化版）
  loadFallbackDictionaries() {
    console.log('使用备用词典');
    this.dictionaries.en = {
      'computer': 'n', 'book': 'n', 'good': 'a', 'run': 'v'
    };
    this.dictionaries.zh = {
      '电脑': 'n', '书': 'n', '好': 'a', '跑': 'v'
    };
    this.isLoaded = true;
  }

  getDictionary(language) {
    return this.dictionaries[language] || {};
  }

  async waitForLoad() {
    if (this.isLoaded) return true;
    return await this.loadPromise;
  }
}

class QuickHighlighter {
  constructor() {
    this.enabled = false;
    this.dictionaryManager = new DictionaryManager();
    this.init();
  }

  init() {
    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggle') {
        this.toggle();
      }
    });
    
    // 检查存储的状态
    chrome.storage.local.get(['enabled'], (result) => {
      if (result.enabled) {
        this.enable();
      }
    });
  }

  toggle() {
    this.enabled ? this.disable() : this.enable();
  }

  async enable() {
    this.enabled = true;
    await this.processPage();
    chrome.storage.local.set({ enabled: true });
  }

  disable() {
    this.enabled = false;
    this.removeHighlights();
    chrome.storage.local.set({ enabled: false });
  }

  async processPage() {
    // 等待词典加载完成
    await this.dictionaryManager.waitForLoad();
    
    // 简单的文本节点查找
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 跳过脚本和样式标签
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // 处理每个文本节点
    textNodes.forEach(textNode => this.processTextNode(textNode));
  }

  processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text.trim()) return;

    // 检测文本语言
    const language = this.detectLanguage(text);
    const dictionary = this.dictionaryManager.getDictionary(language);
    
    if (!dictionary || Object.keys(dictionary).length === 0) {
      return; // 如果没有对应语言的词典，跳过处理
    }
    
    let html = '';
    
    if (language === 'zh' || language === 'ja') {
      // 中文和日文处理：使用双向最大匹配分词
      html = this.segmentCJKText(text, dictionary);
    } else {
      // 其他语言处理：按空格和标点分词
      html = this.segmentSpaceBasedText(text, dictionary);
    }

    // 创建新的元素替换文本节点
    const wrapper = document.createElement('span');
    wrapper.innerHTML = html;
    wrapper.className = 'adhd-processed';
    
    textNode.parentNode.replaceChild(wrapper, textNode);
  }

  // 语言检测
  detectLanguage(text) {
    const sample = text.slice(0, 200); // 取前200字符样本
    
    // 中文字符检测
    const chineseRatio = (sample.match(/[\u4e00-\u9fa5]/g) || []).length / sample.length;
    if (chineseRatio > 0.3) return 'zh';
    
    // 日文字符检测（平假名、片假名、汉字）
    const japaneseRatio = (sample.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length / sample.length;
    if (japaneseRatio > 0.2) return 'ja';
    
    // 俄文字符检测（西里尔字母）
    const russianRatio = (sample.match(/[\u0400-\u04ff]/g) || []).length / sample.length;
    if (russianRatio > 0.3) return 'ru';
    
    // 法文特殊字符检测
    const frenchChars = sample.match(/[àâäéèêëïîôöùûüÿç]/gi) || [];
    if (frenchChars.length > 0) return 'fr';
    
    // 西班牙文特殊字符检测
    const spanishChars = sample.match(/[ñáéíóúü¿¡]/gi) || [];
    if (spanishChars.length > 0) return 'es';
    
    // 默认英文
    return 'en';
  }

  // CJK文本分词（中文、日文）
  segmentCJKText(text, dictionary) {
    let html = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // 跳过空格和标点
      if (/[\s\p{P}]/u.test(char)) {
        html += char;
        continue;
      }
      
      // 尝试匹配词汇（最大长度8字符）
      let matched = false;
      for (let len = Math.min(8, text.length - i); len >= 1; len--) {
        const word = text.substr(i, len);
        const pos = dictionary[word];
        
        if (pos) {
          html += `<span class="adhd-${this.normalizePos(pos)}">${word}</span>`;
          i += len - 1; // 跳过已匹配的字符
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        html += char;
      }
    }
    
    return html;
  }

  // 基于空格的文本分词（英文、法文、西班牙文、俄文）
  segmentSpaceBasedText(text, dictionary) {
    const words = text.split(/(\s+|[.,!?;:()"])/);
    let html = '';
    
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      const pos = dictionary[cleanWord];
      
      if (pos) {
        html += `<span class="adhd-${this.normalizePos(pos)}">${word}</span>`;
      } else {
        html += word;
      }
    });
    
    return html;
  }

  // 标准化词性标记
  normalizePos(pos) {
    // 将各种词性标记统一为简单的类别
    const posMap = {
      'n': 'n',     // 名词
      'noun': 'n',
      'v': 'v',     // 动词
      'verb': 'v',
      'adj': 'a',   // 形容词
      'a': 'a',
      'adv': 'adv', // 副词
      'adverb': 'adv'
    };
    
    return posMap[pos] || 'other';
  }

  removeHighlights() {
    // 移除所有高亮
    document.querySelectorAll('.adhd-processed').forEach(element => {
      element.outerHTML = element.textContent;
    });
  }
}

// 初始化
const highlighter = new QuickHighlighter();