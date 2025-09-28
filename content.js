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
    this.highlightingToggles = {
      noun: true,
      verb: true,
      adj: true,
      comparative: true
    };
    this.init();
  }

  init() {
    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggle') {
        this.toggle();
      } else if (message.action === 'updateColorScheme') {
        // 更新高亮开关设置
        if (message.highlightingToggles) {
          this.highlightingToggles = { ...this.highlightingToggles, ...message.highlightingToggles };
          console.log('更新高亮开关设置:', this.highlightingToggles);
          // 如果当前已启用，重新处理页面
          if (this.enabled) {
            this.removeHighlights();
            this.processPage();
          }
        }
      }
    });
    
    // 检查存储的状态和设置
    chrome.storage.local.get(['enabled', 'highlightingToggles'], (result) => {
      if (result.enabled) {
        this.enable();
      }
      if (result.highlightingToggles) {
        this.highlightingToggles = { ...this.highlightingToggles, ...result.highlightingToggles };
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
          const normalizedPos = this.normalizePos(pos);
          // 根据高亮开关决定是否应用高亮
          const shouldHighlight = (
            (normalizedPos === 'n' && this.highlightingToggles.noun) ||
            (normalizedPos === 'v' && this.highlightingToggles.verb) ||
            (normalizedPos === 'a' && this.highlightingToggles.adj) ||
            (normalizedPos === 'adv' && this.highlightingToggles.adj) || // 副词也使用形容词开关
            (normalizedPos === 'other')
          );
          
          if (shouldHighlight && normalizedPos !== 'other') {
            html += `<span class="adhd-${normalizedPos}">${word}</span>`;
          } else {
            html += word;
          }
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
    const words = text.split(/(\s+|[.,!?;:()")])/);
    let html = '';
    
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      let pos = dictionary[cleanWord];
      
      let isComparative = false;
      
      // 对于英语单词，总是检查是否为比较级或最高级
      if (cleanWord.length > 0 && /^[a-zA-Z]+$/.test(cleanWord)) {
        // 检查是否为比较级或最高级
        if (cleanWord.endsWith('er') && cleanWord.length > 3) {
          isComparative = true;
        } else if (cleanWord.endsWith('est') && cleanWord.length > 4) {
          isComparative = true;
        } else if (['better', 'best', 'worse', 'worst'].includes(cleanWord)) {
          isComparative = true;
        }
      }
      
      // 如果直接匹配失败，尝试词汇变形匹配（仅对英语）
      if (!pos && cleanWord.length > 0) {
        // 简单判断是否为英语（包含英文字母）
        if (/^[a-zA-Z]+$/.test(cleanWord)) {
          // 使用简化的英语变形规则
          const possibleStems = this.getEnglishStems(cleanWord);
          for (const stem of possibleStems) {
            if (dictionary[stem]) {
              pos = dictionary[stem];
              break;
            }
          }
        }
      }
      
      if (pos) {
        // 如果是比较级/最高级，使用特殊样式
        if (isComparative && this.highlightingToggles.comparative) {
          html += `<span class="adhd-comp">${word}</span>`;
        } else {
          const normalizedPos = this.normalizePos(pos);
          // 根据高亮开关决定是否应用高亮
          const shouldHighlight = (
            (normalizedPos === 'n' && this.highlightingToggles.noun) ||
            (normalizedPos === 'v' && this.highlightingToggles.verb) ||
            (normalizedPos === 'a' && this.highlightingToggles.adj) ||
            (normalizedPos === 'adv' && this.highlightingToggles.adj) || // 副词也使用形容词开关
            (normalizedPos === 'other')
          );
          
          if (shouldHighlight && normalizedPos !== 'other') {
            html += `<span class="adhd-${normalizedPos}">${word}</span>`;
          } else {
            html += word;
          }
        }
      } else {
        html += word;
      }
    });
    
    return html;
  }
  
  // 简化的英语词根提取（内嵌到content.js中）
  getEnglishStems(word) {
    const stems = [word]; // 总是包含原词
    
    // 不规则动词映射
    const irregularVerbs = {
      'went': 'go', 'gone': 'go', 'ran': 'run', 'came': 'come',
      'thought': 'think', 'brought': 'bring', 'caught': 'catch',
      'taught': 'teach', 'bought': 'buy', 'fought': 'fight'
    };
    
    // 不规则形容词映射
    const irregularAdj = {
      'better': 'good', 'best': 'good', 'worse': 'bad', 'worst': 'bad'
    };
    
    // 检查不规则形式
    if (irregularVerbs[word]) stems.push(irregularVerbs[word]);
    if (irregularAdj[word]) stems.push(irregularAdj[word]);
    
    // 规则变形处理
    // 复数名词 -s, -es
    if (word.endsWith('s') && word.length > 2) {
      stems.push(word.slice(0, -1));
      if (word.endsWith('es') && word.length > 3) {
        stems.push(word.slice(0, -2));
      }
    }
    
    // 动词 -ed
    if (word.endsWith('ed') && word.length > 3) {
      const stem = word.slice(0, -2);
      stems.push(stem);
      stems.push(stem + 'e'); // 处理 make -> maked 的情况
    }
    
    // 动词 -ing
    if (word.endsWith('ing') && word.length > 4) {
      const stem = word.slice(0, -3);
      stems.push(stem);
      stems.push(stem + 'e'); // 处理 make -> making
      // 处理双写辅音 (running -> run)
      if (stem.length >= 2 && stem[stem.length-1] === stem[stem.length-2]) {
        stems.push(stem.slice(0, -1));
      }
    }
    
    // 形容词比较级 -er
    if (word.endsWith('er') && word.length > 3) {
      const stem = word.slice(0, -2);
      stems.push(stem);
      stems.push(stem + 'e'); // larger -> large
      // 处理双写辅音 (bigger -> big)
      if (stem.length >= 2 && stem[stem.length-1] === stem[stem.length-2]) {
        stems.push(stem.slice(0, -1));
      }
    }
    
    // 形容词最高级 -est
    if (word.endsWith('est') && word.length > 4) {
      const stem = word.slice(0, -3);
      stems.push(stem);
      stems.push(stem + 'e'); // largest -> large
      // 处理双写辅音 (biggest -> big)
      if (stem.length >= 2 && stem[stem.length-1] === stem[stem.length-2]) {
        stems.push(stem.slice(0, -1));
      }
    }
    
    return [...new Set(stems)]; // 去重
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