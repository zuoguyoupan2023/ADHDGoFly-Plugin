// 文本分词器模块
// 在Node.js环境中引入英语词汇变形处理器
if (typeof module !== 'undefined' && module.exports && typeof EnglishMorphology === 'undefined') {
  const EnglishMorphology = require('./en-noun-morphology.js');
}

class TextSegmenter {
  constructor() {
    // 标点符号和分隔符模式
    this.punctuationPattern = /[\s\p{P}]/u;
    this.spaceBasedSeparators = /(\s+|[.,!?;:()'"'])/;
    
    // CJK分词的最大词长
    this.maxWordLength = 8;
    
    // 初始化英语词汇变形处理器
    this.enMorphology = new EnglishMorphology();
    
    // 语言处理器映射表
    this.languageProcessors = {
      'en': 'segmentEnLangText',
      'fr': 'segmentFrLangText', 
      'es': 'segmentEsLangText',
      'ru': 'segmentRuLangText'
    };
    
    // 语言特定的高亮开关支持表
    this.languageHighlightSupport = {
      'en': ['noun', 'verb', 'adj', 'comparative'],
      'fr': ['noun', 'verb', 'adj'],
      'es': ['noun', 'verb', 'adj'], 
      'ru': ['noun', 'verb', 'adj'],
      'zh': ['noun', 'verb', 'adj'],
      'ja': ['noun', 'verb', 'adj']
    };
    
    // 高亮开关设置
    this.highlightingToggles = {
      noun: true,
      verb: true,
      adj: true,
      comparative: true
    };
    
    // 俄语形态学还原缓存
    this.russianMorphologyCache = {
      nouns: new Map(),
      verbs: new Map(),
      adjectives: new Map(),
      aspects: new Map(),
      dictionary: new Map()
    };
    
    // 西班牙语形态学还原缓存
    this.spanishMorphologyCache = {
      nouns: new Map(),
      verbs: new Map(),
      adjectives: new Map(),
      reflexives: new Map(),
      dictionary: new Map()
    };
    
    // 缓存大小限制
    this.maxCacheSize = 1000;
  }
  
  /**
   * 更新高亮开关设置
   * @param {Object} toggles 高亮开关设置
   */
  updateHighlightingToggles(toggles) {
    this.highlightingToggles = { ...this.highlightingToggles, ...toggles };
  }

  /**
   * 根据语言类型对文本进行分词
   * @param {string} text 要分词的文本
   * @param {string} language 语言代码
   * @param {Object} dictionary 词典对象
   * @param {Object} dictionaryManager 词典管理器（可选，用于检查语言启用状态）
   * @returns {string} 处理后的HTML字符串
   */
  segmentText(text, language, dictionary, dictionaryManager = null) {
    if (!text || !text.trim()) {
      return text;
    }

    // 根据语言选择分词策略
    if (this.isCJKLanguage(language)) {
      return this.segmentCJKText(text, dictionary);
    } else {
      // 检查语言是否启用（如果提供了dictionaryManager）
      if (dictionaryManager && !dictionaryManager.isLanguageEnabled(language)) {
        return text; // 语言未启用，返回原文本
      }
      
      // 尝试使用语言特定处理器
      const processorName = this.languageProcessors[language];
      if (processorName && typeof this[processorName] === 'function') {
        return this[processorName](text, dictionary, dictionaryManager);
      }
      
      // 回退到通用处理器或原有逻辑
      if (typeof this.segmentGenericText === 'function') {
        return this.segmentGenericText(text, dictionary);
      } else {
        // 向后兼容：使用原有的segmentSpaceBasedText
        return this.segmentSpaceBasedText(text, dictionary);
      }
    }
  }

  /**
   * 检查是否为CJK语言
   * @param {string} language 语言代码
   * @returns {boolean} 是否为CJK语言
   * @private
   */
  isCJKLanguage(language) {
    return ['zh', 'ja', 'ko'].includes(language);
  }

  /**
   * CJK文本分词（中文、日文、韩文）
   * 使用最大匹配算法
   * @param {string} text 要分词的文本
   * @param {Object} dictionary 词典对象
   * @returns {string} 处理后的HTML字符串
   */
  segmentCJKText(text, dictionary) {
    let html = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // 跳过空格和标点符号
      if (this.punctuationPattern.test(char)) {
        html += char;
        continue;
      }
      
      // 尝试最大匹配
      let matched = false;
      const maxLen = Math.min(this.maxWordLength, text.length - i);
      
      // 从最长可能的词开始匹配
      for (let len = maxLen; len >= 1; len--) {
        const word = text.substr(i, len);
        const pos = dictionary[word];
        
        if (pos) {
          const normalizedPos = this.normalizePartOfSpeech(pos);
          // 根据高亮开关决定是否应用高亮
          const shouldHighlight = (
            (normalizedPos === 'n' && this.highlightingToggles.noun) ||
            (normalizedPos === 'v' && this.highlightingToggles.verb) ||
            (normalizedPos === 'a' && this.highlightingToggles.adj) ||
            (normalizedPos === 'adv' && this.highlightingToggles.adj) // 副词也使用形容词开关
          );
          
          if (shouldHighlight && normalizedPos) {
            html += `<span class="adhd-${normalizedPos}" data-word="${word}" data-pos="${pos}">${word}</span>`;
          } else {
            html += word;
          }
          i += len - 1; // 跳过已匹配的字符
          matched = true;
          break;
        }
      }
      
      // 如果没有匹配到词汇，保持原字符
      if (!matched) {
        html += char;
      }
    }
    
    return html;
  }

  /**
   * 基于空格的文本分词（英文、法文、西班牙文、俄文等）
   * @param {string} text 要分词的文本
   * @param {Object} dictionary 词典对象
   * @returns {string} 处理后的HTML字符串
   */
  segmentSpaceBasedText(text, dictionary) {
    // 按空格和标点符号分割
    const tokens = text.split(this.spaceBasedSeparators);
    let html = '';
    
    tokens.forEach(token => {
      if (!token) return;
      
      // 清理词汇（移除标点，转为小写）
      const cleanWord = this.cleanWord(token);
      
      // 首先尝试精确匹配
      if (cleanWord && dictionary[cleanWord]) {
        const pos = dictionary[cleanWord];
        const normalizedPos = this.normalizePartOfSpeech(pos);
        
        // 如果是名词或动词，优先使用词典标记
        if (normalizedPos === 'n' || normalizedPos === 'v') {
          const shouldHighlight = (
            (normalizedPos === 'n' && this.highlightingToggles.noun) ||
            (normalizedPos === 'v' && this.highlightingToggles.verb)
          );
          
          if (shouldHighlight) {
            html += `<span class="adhd-${normalizedPos}" data-word="${cleanWord}" data-pos="${pos}">${token}</span>`;
          } else {
            html += token;
          }
        }
        // 如果是形容词或副词，检查是否为比较级
        else {
          let isComparative = false;
          if (cleanWord) {
            // 不规则比较级/最高级
            const irregularComparatives = ['better', 'best', 'worse', 'worst', 'more', 'most', 'less', 'least'];
            if (irregularComparatives.includes(cleanWord)) {
              isComparative = true;
            }
            // 规则比较级/最高级
            else if ((cleanWord.endsWith('er') && cleanWord.length > 3) || 
                     (cleanWord.endsWith('est') && cleanWord.length > 4)) {
              isComparative = true;
            }
          }
          
          if (isComparative) {
             if (this.highlightingToggles.comparative) {
               // 紫色比较级高亮开启，显示为紫色
               html += `<span class="adhd-comp" data-word="${cleanWord}" data-pos="comparative">${token}</span>`;
             } else if (this.highlightingToggles.adj) {
               // 紫色比较级高亮关闭但形容词高亮开启，显示为绿色形容词
               html += `<span class="adhd-a" data-word="${cleanWord}" data-pos="comparative">${token}</span>`;
             } else {
               html += token;
             }
           } else if (normalizedPos === 'a' && this.highlightingToggles.adj) {
             html += `<span class="adhd-${normalizedPos}" data-word="${cleanWord}" data-pos="${pos}">${token}</span>`;
           } else {
             html += token;
           }
        }
      }
      // 如果精确匹配失败，检查比较级
      else {
        let isComparative = false;
        if (cleanWord) {
          // 不规则比较级/最高级
          const irregularComparatives = ['better', 'best', 'worse', 'worst', 'more', 'most', 'less', 'least'];
          if (irregularComparatives.includes(cleanWord)) {
            isComparative = true;
          }
          // 规则比较级/最高级
          else if ((cleanWord.endsWith('er') && cleanWord.length > 3) || 
                   (cleanWord.endsWith('est') && cleanWord.length > 4)) {
            isComparative = true;
          }
        }
        
        if (isComparative) {
          if (this.highlightingToggles.comparative) {
            // 紫色比较级高亮开启，显示为紫色
            html += `<span class="adhd-comp" data-word="${cleanWord}" data-pos="comparative">${token}</span>`;
          } else if (this.highlightingToggles.adj) {
            // 紫色比较级高亮关闭但形容词高亮开启，显示为绿色形容词
            html += `<span class="adhd-a" data-word="${cleanWord}" data-pos="comparative">${token}</span>`;
          } else {
            html += token;
          }
        }
        // 然后尝试词汇变形匹配
        else {
          // 如果精确匹配失败，尝试英语词汇变形匹配
          let matched = false;
          if (cleanWord && this.enMorphology) {
            const possibleStems = this.enMorphology.getPossibleStems(cleanWord);
            for (const stem of possibleStems) {
              if (dictionary[stem]) {
                const pos = dictionary[stem];
                const normalizedPos = this.normalizePartOfSpeech(pos);
                // 根据高亮开关决定是否应用变形匹配高亮
                const shouldHighlight = (
                  (normalizedPos === 'n' && this.highlightingToggles.noun) ||
                  (normalizedPos === 'v' && this.highlightingToggles.verb) ||
                  (normalizedPos === 'a' && this.highlightingToggles.adj)
                );
                
                if (shouldHighlight && (normalizedPos === 'n' || normalizedPos === 'v' || normalizedPos === 'a')) {
                  html += `<span class="adhd-${normalizedPos}" data-word="${stem}" data-pos="${pos}">${token}</span>`;
                  matched = true;
                  break;
                }
              }
            }
          }
          
          if (!matched) {
            html += token;
          }
        }
      }
    });
    
    return html;
  }

  /**
   * 通用的基于空格的文本分词处理器
   * 提供基本的词典匹配功能，不包含语言特定逻辑
   * @param {string} text 要分词的文本
   * @param {Object} dictionary 词典对象
   * @returns {string} 处理后的HTML字符串
   */
  segmentGenericText(text, dictionary) {
    // 按空格和标点符号分割
    const tokens = text.split(this.spaceBasedSeparators);
    let html = '';
    
    tokens.forEach(token => {
      if (!token) return;
      
      // 清理词汇（移除标点，转为小写）
      const cleanWord = this.cleanWord(token);
      
      // 尝试精确匹配
      if (cleanWord && dictionary[cleanWord]) {
        const pos = dictionary[cleanWord];
        const normalizedPos = this.normalizePartOfSpeech(pos);
        
        // 根据词性和高亮开关决定是否高亮
        const shouldHighlight = (
          (normalizedPos === 'n' && this.highlightingToggles.noun) ||
          (normalizedPos === 'v' && this.highlightingToggles.verb) ||
          (normalizedPos === 'a' && this.highlightingToggles.adj)
        );
        
        if (shouldHighlight) {
          html += `<span class="adhd-${normalizedPos}" data-word="${cleanWord}" data-pos="${pos}">${token}</span>`;
        } else {
          html += token;
        }
      } else {
        // 没有匹配到词汇，保持原样
        html += token;
      }
    });
    
    return html;
  }

  /**
   * 法语专用文本分词处理器
   * 硬编码检测指定词汇并从词典获取词性
   * @param {string} text 要分词的文本
   * @param {Object} dictionary 词典对象
   * @returns {string} 处理后的HTML字符串
   */
  segmentFrLangText(text, dictionary) {
    console.log('=== 法语处理开始 ===');
    console.log('输入文本:', text);
    console.log('词典类型:', typeof dictionary);
    console.log('词典是否有words属性:', dictionary && dictionary.words ? '是' : '否');
    
    // 按空格分割文本
    let tokens = text.split(/\s+/);
    let processedTokens = [];
    
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      
      // 清理词汇，保留法语重音字符
      let cleanWord = token.toLowerCase().replace(/[^\w\u00C0-\u017F']/g, '');
      
      console.log(`处理词汇: "${token}" -> 清理后: "${cleanWord}"`);
      
      // 跳过空词汇
      if (!cleanWord) {
        processedTokens.push(token);
        continue;
      }
      
      // 处理法语省音 (elision)
      let restoredWord = this.restoreFrenchElision(cleanWord);
      console.log(`省音还原: "${cleanWord}" -> "${restoredWord}"`);
      
      // 处理法语缩写 (contractions)
      let contractedWords = this.restoreFrenchContractions(restoredWord);
      console.log(`缩写还原: "${restoredWord}" -> [${contractedWords.join(', ')}]`);
      
      // 从词典中查找 - 处理两种可能的词典格式
      let entry = null;
      let pos = null;
      let foundWord = null;
      
      // 首先尝试查找缩写还原后的词汇
      for (const word of contractedWords) {
        foundWord = this.findInDictionary(word, dictionary);
        if (foundWord) {
          pos = foundWord.pos;
          console.log(`缩写还原词汇在词典中找到: ${word}, 词性: ${pos}`);
          break;
        }
      }
      
      // 如果缩写还原未找到，尝试动词变位还原
      if (!pos) {
        let verbInfinitives = this.restoreFrenchVerbConjugation(restoredWord);
        console.log(`动词变位还原: "${restoredWord}" -> [${verbInfinitives.join(', ')}]`);
        
        for (const infinitive of verbInfinitives) {
          foundWord = this.findInDictionary(infinitive, dictionary);
          if (foundWord) {
            pos = foundWord.pos;
            console.log(`动词变位还原词汇在词典中找到: ${infinitive}, 词性: ${pos}`);
            break;
          }
        }
      }
      
      // 如果动词变位还原未找到，尝试形容词一致性还原
      if (!pos) {
        let adjectiveForms = this.restoreFrenchAdjectiveAgreement(restoredWord);
        console.log(`形容词一致性还原: "${restoredWord}" -> [${adjectiveForms.join(', ')}]`);
        
        for (const baseForm of adjectiveForms) {
          foundWord = this.findInDictionary(baseForm, dictionary);
          if (foundWord) {
            pos = foundWord.pos;
            console.log(`形容词一致性还原词汇在词典中找到: ${baseForm}, 词性: ${pos}`);
            break;
          }
        }
      }
      
      // 如果缩写还原词汇未找到，尝试省音还原词汇
      if (!pos && restoredWord !== cleanWord) {
        foundWord = this.findInDictionary(restoredWord, dictionary);
        if (foundWord) {
          pos = foundWord.pos;
          console.log(`省音还原词汇在词典中找到: ${restoredWord}, 词性: ${pos}`);
        }
      }
      
      // 如果还原词汇未找到，尝试原词汇
      if (!pos) {
        foundWord = this.findInDictionary(cleanWord, dictionary);
        if (foundWord) {
          pos = foundWord.pos;
          console.log(`原词汇在词典中找到: ${cleanWord}, 词性: ${pos}`);
        }
      }
      
      if (pos) {
        let normalizedPos = this.normalizePartOfSpeech(pos);
        console.log(`标准化词性: ${normalizedPos}`);
        
        // 检查是否应该高亮
        if ((normalizedPos === 'n' && this.highlightingToggles.noun) ||
            (normalizedPos === 'v' && this.highlightingToggles.verb) ||
            (normalizedPos === 'a' && this.highlightingToggles.adj)) {
          // 分离词汇和标点符号
          const wordMatch = token.match(/^([\w\u00C0-\u017F']+)(.*)$/);
          if (wordMatch) {
            const [, word, punctuation] = wordMatch;
            processedTokens.push(`<span class="adhd-${normalizedPos}">${word}</span>${punctuation}`);
          } else {
            processedTokens.push(`<span class="adhd-${normalizedPos}">${token}</span>`);
          }
          console.log(`添加高亮: ${normalizedPos}`);
        } else {
          processedTokens.push(token);
          console.log('不高亮（开关关闭或词性不匹配）');
        }
      } else {
        console.log(`词典中未找到: ${cleanWord}`);
        processedTokens.push(token);
      }
    }
    
    let result = processedTokens.join(' ');
    console.log('处理结果:', result);
    console.log('=== 法语处理结束 ===');
    
    return result;
  }

  /**
   * 法语省音还原处理
   * 处理 l', j', d', n', m', t', s', c' 等省音形式
   * @param {string} word 待处理的词汇
   * @returns {string} 还原后的词汇
   * @private
   */
  restoreFrenchElision(word) {
    const elisionMap = {
      "l'": "le",
      "j'": "je", 
      "d'": "de",
      "n'": "ne",
      "m'": "me",
      "t'": "te",
      "s'": "se",
      "c'": "ce",
      "qu'": "que"
    };
    
    // 检查是否包含省音
    for (const [elision, full] of Object.entries(elisionMap)) {
      if (word.toLowerCase().startsWith(elision)) {
        // 返回省音后的主要词汇部分
        return word.substring(elision.length);
      }
    }
    
    return word;
  }
  
  /**
   * 法语缩写还原处理
   * 处理 au, du, aux, des 等强制性缩写形式
   * @param {string} word 待处理的词汇
   * @returns {Array<string>} 还原后的词汇数组
   * @private
   */
  restoreFrenchContractions(word) {
    // 法语缩写映射表
    const contractionMap = {
      "au": ["à", "le"],
      "du": ["de", "le"],
      "aux": ["à", "les"],
      "des": ["de", "les"]
    };
    
    // 检查是否为缩写形式
    if (contractionMap[word]) {
      return contractionMap[word];
    }
    
    // 如果不是缩写，返回原词汇
    return [word];
  }
  
  /**
   * 法语动词变位还原处理
   * 处理规则动词(-er, -ir, -re)和常见不规则动词的变位形式
   * @param {string} word 待处理的词汇
   * @returns {Array<string>} 可能的动词原形数组
   * @private
   */
  restoreFrenchVerbConjugation(word) {
    let possibleInfinitives = [];
    
    // 处理-er动词变位
    if (word.endsWith('e') || word.endsWith('es') || word.endsWith('ent')) {
      // 现在时变位: je/tu/il parle, nous parlons, vous parlez, ils parlent
      let stem = word.replace(/e(s|nt)?$/, '');
      possibleInfinitives.push(stem + 'er');
    }
    if (word.endsWith('ons') || word.endsWith('ez')) {
      let stem = word.replace(/(ons|ez)$/, '');
      possibleInfinitives.push(stem + 'er');
    }
    if (word.endsWith('ai') || word.endsWith('as') || word.endsWith('a') || 
        word.endsWith('âmes') || word.endsWith('âtes') || word.endsWith('èrent')) {
      // 过去时变位
      let stem = word.replace(/(ai|as|a|âmes|âtes|èrent)$/, '');
      possibleInfinitives.push(stem + 'er');
    }
    
    // 处理-ir动词变位
    if (word.endsWith('is') || word.endsWith('it') || word.endsWith('issons') || 
        word.endsWith('issez') || word.endsWith('issent')) {
      // 现在时变位: je/tu finis, il finit, nous finissons, vous finissez, ils finissent
      let stem = word.replace(/(is|it|issons|issez|issent)$/, '');
      possibleInfinitives.push(stem + 'ir');
    }
    
    // 处理-re动词变位
    if (word.endsWith('s') || word.endsWith('t') || word.endsWith('ons') || 
        word.endsWith('ez') || word.endsWith('ent')) {
      // 现在时变位: je/tu vends, il vend, nous vendons, vous vendez, ils vendent
      let stem = word.replace(/(s|t|ons|ez|ent)$/, '');
      if (!stem.endsWith('s')) { // 避免重复处理
        possibleInfinitives.push(stem + 're');
      }
    }
    
    // 常见不规则动词映射
    const irregularVerbs = {
      'suis': ['être'], 'es': ['être'], 'est': ['être'], 'sommes': ['être'], 'êtes': ['être'], 'sont': ['être'],
      'ai': ['avoir'], 'as': ['avoir'], 'a': ['avoir'], 'avons': ['avoir'], 'avez': ['avoir'], 'ont': ['avoir'],
      'vais': ['aller'], 'vas': ['aller'], 'va': ['aller'], 'allons': ['aller'], 'allez': ['aller'], 'vont': ['aller'],
      'fais': ['faire'], 'fait': ['faire'], 'faisons': ['faire'], 'faites': ['faire'], 'font': ['faire'],
      'dis': ['dire'], 'dit': ['dire'], 'disons': ['dire'], 'dites': ['dire'], 'disent': ['dire'],
      'vois': ['voir'], 'voit': ['voir'], 'voyons': ['voir'], 'voyez': ['voir'], 'voient': ['voir'],
      'sais': ['savoir'], 'sait': ['savoir'], 'savons': ['savoir'], 'savez': ['savoir'], 'savent': ['savoir'],
      'peux': ['pouvoir'], 'peut': ['pouvoir'], 'pouvons': ['pouvoir'], 'pouvez': ['pouvoir'], 'peuvent': ['pouvoir'],
      'veux': ['vouloir'], 'veut': ['vouloir'], 'voulons': ['vouloir'], 'voulez': ['vouloir'], 'veulent': ['vouloir']
    };
    
    if (irregularVerbs[word]) {
      possibleInfinitives.push(...irregularVerbs[word]);
    }
    
    // 如果没有找到变位形式，返回原词汇
    if (possibleInfinitives.length === 0) {
      possibleInfinitives.push(word);
    }
    
    return possibleInfinitives;
  }
  
  /**
   * 法语形容词一致性还原处理
   * 处理形容词的性别和数量变化形式
   * @param {string} word 待处理的词汇
   * @returns {Array<string>} 可能的形容词基本形式数组
   * @private
   */
  restoreFrenchAdjectiveAgreement(word) {
    let possibleBaseForms = [];
    
    // 处理阴性形式 (-e结尾)
    if (word.endsWith('e') && word.length > 2) {
      let masculineForm = word.slice(0, -1);
      possibleBaseForms.push(masculineForm);
    }
    
    // 处理复数形式 (-s结尾)
    if (word.endsWith('s') && word.length > 2) {
      let singularForm = word.slice(0, -1);
      possibleBaseForms.push(singularForm);
      
      // 如果是阴性复数形式 (-es结尾)
      if (singularForm.endsWith('e') && singularForm.length > 2) {
        let masculineSingular = singularForm.slice(0, -1);
        possibleBaseForms.push(masculineSingular);
      }
    }
    
    // 处理特殊变化形式
    const specialAdjectives = {
      // -eux/-euse 形容词
      'euse': 'eux', 'euses': 'eux',
      // -if/-ive 形容词
      'ive': 'if', 'ives': 'if',
      // -er/-ère 形容词
      'ère': 'er', 'ères': 'er',
      // -on/-onne 形容词
      'onne': 'on', 'onnes': 'on',
      // -en/-enne 形容词
      'enne': 'en', 'ennes': 'en',
      // -el/-elle 形容词
      'elle': 'el', 'elles': 'el',
      // -et/-ette 形容词
      'ette': 'et', 'ettes': 'et',
      // -ot/-otte 形容词
      'otte': 'ot', 'ottes': 'ot',
      // -as/-asse 形容词
      'asse': 'as', 'asses': 'as',
      // -os/-osse 形容词
      'osse': 'os', 'osses': 'os',
      // -eil/-eille 形容词
      'eille': 'eil', 'eilles': 'eil',
      // -ul/-ulle 形容词
      'ulle': 'ul', 'ulles': 'ul'
    };
    
    for (const [feminine, masculine] of Object.entries(specialAdjectives)) {
      if (word.endsWith(feminine)) {
        let stem = word.slice(0, -feminine.length);
        possibleBaseForms.push(stem + masculine);
      }
    }
    
    // 处理不规则形容词
    const irregularAdjectives = {
      'belle': 'beau', 'belles': 'beau', 'beaux': 'beau',
      'nouvelle': 'nouveau', 'nouvelles': 'nouveau', 'nouveaux': 'nouveau',
      'vieille': 'vieux', 'vieilles': 'vieux',
      'folle': 'fou', 'folles': 'fou', 'fous': 'fou',
      'molle': 'mou', 'molles': 'mou', 'mous': 'mou',
      'blanche': 'blanc', 'blanches': 'blanc', 'blancs': 'blanc',
      'fraîche': 'frais', 'fraîches': 'frais',
      'sèche': 'sec', 'sèches': 'sec', 'secs': 'sec',
      'longue': 'long', 'longues': 'long', 'longs': 'long',
      'publique': 'public', 'publiques': 'public', 'publics': 'public'
    };
    
    if (irregularAdjectives[word]) {
      possibleBaseForms.push(irregularAdjectives[word]);
    }
    
    // 如果没有找到变化形式，返回原词汇
    if (possibleBaseForms.length === 0) {
      possibleBaseForms.push(word);
    }
    
    return possibleBaseForms;
  }
  
  /**
   * 在词典中查找词汇的通用方法
   * @param {string} word 要查找的词汇
   * @param {Object} dictionary 词典对象
   * @returns {Object|null} 找到的词汇信息，包含pos属性
   * @private
   */
  findInDictionary(word, dictionary) {
    let entry = null;
    let pos = null;
    
    // 情况1: 完整词典结构 {words: {...}}
    if (dictionary && dictionary.words && dictionary.words[word]) {
      entry = dictionary.words[word];
      // 如果有多个词性，优先选择形容词，然后动词，最后名词
      if (entry.pos && Array.isArray(entry.pos)) {
        if (entry.pos.includes('adj')) {
          pos = 'adj';
        } else if (entry.pos.includes('v')) {
          pos = 'v';
        } else {
          pos = entry.pos[0];
        }
      } else {
        pos = entry.pos ? entry.pos[0] : entry;
      }
    }
    // 情况2: 扁平化词典结构 {word: pos, ...}
    else if (dictionary && dictionary[word]) {
      pos = dictionary[word];
    }
    
    return pos ? { pos: pos } : null;
  }

  /**
   * 西班牙语专用文本分词处理器
   * 采用简单的词典匹配逻辑，不处理复杂的动词变位
   * @param {string} text 要分词的文本
   * @param {Object} dictionary 词典对象
   * @returns {string} 处理后的HTML字符串
   */
  segmentEsLangText(text, dictionary) {
    // 按空格分割文本
    let tokens = text.split(/\s+/);
    let processedTokens = [];
    
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      
      // 清理词汇，保留西班牙语重音字符
      let cleanWord = token.toLowerCase().replace(/[^\w\u00C0-\u017F\u00D1\u00F1]/g, '');
      
      // 跳过空词汇
      if (!cleanWord) {
        processedTokens.push(token);
        continue;
      }
      
      // 处理冠词缩写（al, del）
      let pos = null;
      let baseForm = null;
      
      if (cleanWord === 'al' || cleanWord === 'del') {
        // 获取下一个词汇用于冠词缩写处理
        const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
        const nextCleanWord = nextToken ? nextToken.toLowerCase().replace(/[^\w\u00C0-\u017F\u00D1\u00F1]/g, '') : null;
        
        if (nextCleanWord) {
          // 处理缩写，尝试查找后续名词
          const contractionResult = this.restoreSpanishContractions(cleanWord, nextCleanWord);
          if (contractionResult.length > 0) {
            // 查找名词部分
            const nounResult = this.findSpanishWordInDictionary(nextCleanWord, dictionary);
            if (nounResult.pos) {
              // 高亮缩写词汇本身（作为介词处理）
              processedTokens.push(token); // 不高亮缩写，但保留原词
              continue;
            }
          }
        }
      }
      
      // 使用形态学还原查找词汇
      const morphologyResult = this.findSpanishWordInDictionary(cleanWord, dictionary);
      if (morphologyResult.pos) {
        pos = morphologyResult.pos;
        baseForm = morphologyResult.baseForm;
      }
      
      if (pos) {
        let normalizedPos = this.normalizePartOfSpeech(pos);
        
        // 检查是否应该高亮
        if ((normalizedPos === 'n' && this.highlightingToggles.noun) ||
            (normalizedPos === 'v' && this.highlightingToggles.verb) ||
            (normalizedPos === 'a' && this.highlightingToggles.adj)) {
          // 分离词汇和标点符号
          const wordMatch = token.match(/^([\w\u00C0-\u017F\u00D1\u00F1]+)(.*)$/);
          if (wordMatch) {
            const [, word, punctuation] = wordMatch;
            processedTokens.push(`<span class="adhd-${normalizedPos}">${word}</span>${punctuation}`);
          } else {
            processedTokens.push(`<span class="adhd-${normalizedPos}">${token}</span>`);
          }
        } else {
          processedTokens.push(token);
        }
      } else {
        processedTokens.push(token);
      }
    }
    
    return processedTokens.join(' ');
  }

  /**
   * 西班牙语名词复数还原算法
   * 将名词的复数形式还原为单数形式
   * @param {string} word 要还原的词汇
   * @returns {Array} 候选的单数形式数组
   */
  restoreSpanishNounPlural(word) {
    const candidates = [];
    
    // 规则1: 以-s结尾的复数 → 去掉-s
    // libros → libro, casas → casa
    if (word.endsWith('s') && word.length > 2) {
      candidates.push(word.slice(0, -1));
    }
    
    // 规则2: 以-es结尾的复数 → 去掉-es
    // profesores → profesor, ciudades → ciudad
    if (word.endsWith('es') && word.length > 3) {
      candidates.push(word.slice(0, -2));
    }
    
    // 规则3: 以-ces结尾的复数 → 变为-z
    // lápices → lápiz, luces → luz
    if (word.endsWith('ces') && word.length > 4) {
      candidates.push(word.slice(0, -3) + 'z');
    }
    
    // 去重并返回
    return [...new Set(candidates)].filter(candidate => candidate.length > 0);
  }

  /**
   * 西班牙语动词变位还原算法
   * 将动词的变位形式还原为不定式形式
   * @param {string} word 要还原的词汇
   * @returns {Array} 候选的不定式形式数组
   */
  restoreSpanishVerbConjugation(word) {
    const candidates = [];
    
    // -ar动词变位还原
    const arEndings = ['o', 'as', 'a', 'amos', 'áis', 'an'];
    for (const ending of arEndings) {
      if (word.endsWith(ending) && word.length > ending.length + 1) {
        const stem = word.slice(0, -ending.length);
        candidates.push(stem + 'ar');
      }
    }
    
    // -er动词变位还原
    const erEndings = ['o', 'es', 'e', 'emos', 'éis', 'en'];
    for (const ending of erEndings) {
      if (word.endsWith(ending) && word.length > ending.length + 1) {
        const stem = word.slice(0, -ending.length);
        candidates.push(stem + 'er');
      }
    }
    
    // -ir动词变位还原
    const irEndings = ['o', 'es', 'e', 'imos', 'ís', 'en'];
    for (const ending of irEndings) {
      if (word.endsWith(ending) && word.length > ending.length + 1) {
        const stem = word.slice(0, -ending.length);
        candidates.push(stem + 'ir');
      }
    }
    
    // 处理常见不规则动词变位
    const irregularVerbs = {
      'soy': 'ser', 'eres': 'ser', 'es': 'ser', 'somos': 'ser', 'sois': 'ser', 'son': 'ser',
      'estoy': 'estar', 'estás': 'estar', 'está': 'estar', 'estamos': 'estar', 'estáis': 'estar', 'están': 'estar',
      'tengo': 'tener', 'tienes': 'tener', 'tiene': 'tener', 'tenemos': 'tener', 'tenéis': 'tener', 'tienen': 'tener',
      'hago': 'hacer', 'haces': 'hacer', 'hace': 'hacer', 'hacemos': 'hacer', 'hacéis': 'hacer', 'hacen': 'hacer',
      'voy': 'ir', 'vas': 'ir', 'va': 'ir', 'vamos': 'ir', 'vais': 'ir', 'van': 'ir'
    };
    
    if (irregularVerbs[word]) {
      candidates.push(irregularVerbs[word]);
    }
    
    // 去重并返回
    return [...new Set(candidates)].filter(candidate => candidate.length > 0);
  }

  /**
   * 西班牙语形容词性数一致还原算法
   * 将形容词的性数变化形式还原为阳性单数形式
   * @param {string} word 要还原的词汇
   * @returns {Array} 候选的阳性单数形式数组
   */
  restoreSpanishAdjectiveAgreement(word) {
    const candidates = [];
    
    // 阴性形容词 → 阳性形容词
    // buena → bueno, alta → alto
    if (word.endsWith('a') && word.length > 2) {
      candidates.push(word.slice(0, -1) + 'o');
    }
    
    // 复数形容词 → 单数形容词
    // buenos → bueno, buenas → buena → bueno
    if (word.endsWith('os') && word.length > 3) {
      candidates.push(word.slice(0, -2));
    }
    if (word.endsWith('as') && word.length > 3) {
      const singular = word.slice(0, -2);
      candidates.push(singular);
      candidates.push(singular + 'o'); // buenas → buena → bueno
    }
    
    // 以辅音结尾的复数形容词
    // felices → feliz, azules → azul
    if (word.endsWith('es') && word.length > 3) {
      candidates.push(word.slice(0, -2));
    }
    
    // 去重并返回
    return [...new Set(candidates)].filter(candidate => candidate.length > 0);
  }

  /**
   * 西班牙语反身动词处理算法
   * 处理以se结尾的反身动词形式
   * @param {string} word 要还原的词汇
   * @returns {Array} 候选的基础动词形式数组
   */
  restoreSpanishReflexiveVerbs(word) {
    const candidates = [];
    
    // 处理反身代词 + 动词的组合
    // me lavo → lavar, se come → comer, nos vamos → ir
    const reflexivePronouns = ['me', 'te', 'se', 'nos', 'os'];
    
    for (const pronoun of reflexivePronouns) {
      if (word.startsWith(pronoun) && word.length > pronoun.length + 2) {
        const verbPart = word.slice(pronoun.length);
        // 递归调用动词变位还原
        const verbCandidates = this.restoreSpanishVerbConjugation(verbPart);
        candidates.push(...verbCandidates);
      }
    }
    
    // 处理不定式反身动词
    // lavarse → lavar, comerse → comer
    if (word.endsWith('se') && word.length > 4) {
      const baseVerb = word.slice(0, -2);
      if (baseVerb.endsWith('ar') || baseVerb.endsWith('er') || baseVerb.endsWith('ir')) {
        candidates.push(baseVerb);
      }
    }
    
    // 去重并返回
    return [...new Set(candidates)].filter(candidate => candidate.length > 0);
  }

  /**
   * 西班牙语冠词缩写处理算法
   * 处理al和del缩写形式
   * @param {string} word 当前词汇
   * @param {string} nextWord 下一个词汇
   * @returns {Object} 缩写分析结果
   */
  restoreSpanishContractions(word, nextWord) {
    const results = [];
    
    // al = a + el
    if (word === 'al' && nextWord) {
      results.push({
        preposition: 'a',
        article: 'el',
        noun: nextWord,
        type: 'contraction'
      });
    }
    
    // del = de + el
    if (word === 'del' && nextWord) {
      results.push({
        preposition: 'de',
        article: 'el',
        noun: nextWord,
        type: 'contraction'
      });
    }
    
    return results;
  }

  /**
   * 在词典中查找西班牙语单词（包含形态学还原）
   * @param {string} word 要查找的词汇
   * @param {Object} dictionary 词典对象
   * @returns {Object} 查找结果 {baseForm, pos}
   */
  findSpanishWordInDictionary(word, dictionary) {
    // 直接查找
    let result = this.lookupInDictionary(word, dictionary);
    if (result.pos) {
      return { baseForm: word, pos: result.pos };
    }
    
    // 尝试名词复数还原
    const nounCandidates = this.restoreSpanishNounPlural(word);
    for (const candidate of nounCandidates) {
      result = this.lookupInDictionary(candidate, dictionary);
      if (result.pos) {
        return { baseForm: candidate, pos: result.pos };
      }
    }
    
    // 尝试动词变位还原
    const verbCandidates = this.restoreSpanishVerbConjugation(word);
    for (const candidate of verbCandidates) {
      result = this.lookupInDictionary(candidate, dictionary);
      if (result.pos) {
        return { baseForm: candidate, pos: result.pos };
      }
    }
    
    // 尝试形容词性数还原
    const adjCandidates = this.restoreSpanishAdjectiveAgreement(word);
    for (const candidate of adjCandidates) {
      result = this.lookupInDictionary(candidate, dictionary);
      if (result.pos) {
        return { baseForm: candidate, pos: result.pos };
      }
    }
    
    // 尝试反身动词还原
    const reflexiveCandidates = this.restoreSpanishReflexiveVerbs(word);
    for (const candidate of reflexiveCandidates) {
      result = this.lookupInDictionary(candidate, dictionary);
      if (result.pos) {
        return { baseForm: candidate, pos: result.pos };
      }
    }
    
    return { baseForm: null, pos: null };
  }

  /**
   * 俄语名词格变还原算法（带缓存）
   * 将名词的格变形式还原为主格单数形式
   * @param {string} word 要还原的词汇
   * @returns {Array} 候选的主格单数形式数组
   */
  restoreRussianNounDeclension(word) {
    // 检查缓存
    if (this.russianMorphologyCache.nouns.has(word)) {
      return this.russianMorphologyCache.nouns.get(word);
    }
    
    const candidates = [];
    
    // 阳性名词还原规则
    // 生格: стола → стол, учителя → учитель
    if (word.endsWith('а') || word.endsWith('я')) {
      candidates.push(word.slice(0, -1));
    }
    
    // 与格: столу → стол, учителю → учитель
    if (word.endsWith('у') || word.endsWith('ю')) {
      candidates.push(word.slice(0, -1));
    }
    
    // 工具格: столом → стол, учителем → учитель, музеем → музей
    if (word.endsWith('ом') || word.endsWith('ем') || word.endsWith('ём')) {
      candidates.push(word.slice(0, -2));
    }
    
    // 前置格: столе → стол, учителе → учитель
    if (word.endsWith('е')) {
      candidates.push(word.slice(0, -1));
    }
    
    // 阴性名词还原规则
    // 生格: мамы → мама, тёти → тётя
    if (word.endsWith('ы') || word.endsWith('и')) {
      candidates.push(word.slice(0, -1) + 'а');
      candidates.push(word.slice(0, -1) + 'я');
    }
    
    // 与格/前置格: маме → мама, тёте → тётя
    if (word.endsWith('е')) {
      candidates.push(word.slice(0, -1) + 'а');
      candidates.push(word.slice(0, -1) + 'я');
    }
    
    // 宾格: маму → мама, тётю → тётя
    if (word.endsWith('у') || word.endsWith('ю')) {
      candidates.push(word.slice(0, -1) + 'а');
      candidates.push(word.slice(0, -1) + 'я');
    }
    
    // 工具格: мамой → мама, тётей → тётя, дочерью → дочь
    if (word.endsWith('ой') || word.endsWith('ей')) {
      candidates.push(word.slice(0, -2) + 'а');
      candidates.push(word.slice(0, -2) + 'я');
    }
    if (word.endsWith('ью')) {
      candidates.push(word.slice(0, -2) + 'ь');
    }
    
    // 中性名词还原规则
    // 生格: окна → окно, моря → море
    if (word.endsWith('а') || word.endsWith('я')) {
      candidates.push(word.slice(0, -1) + 'о');
      candidates.push(word.slice(0, -1) + 'е');
    }
    
    // 与格: окну → окно, морю → море
    if (word.endsWith('у') || word.endsWith('ю')) {
      candidates.push(word.slice(0, -1) + 'о');
      candidates.push(word.slice(0, -1) + 'е');
    }
    
    // 工具格: окном → окно, морем → море, именем → имя
    if (word.endsWith('ом') || word.endsWith('ем') || word.endsWith('ём')) {
      candidates.push(word.slice(0, -2) + 'о');
      candidates.push(word.slice(0, -2) + 'е');
      candidates.push(word.slice(0, -2) + 'я');
    }
    
    // 前置格: окне → окно, море → море (不变)
    if (word.endsWith('е')) {
      candidates.push(word.slice(0, -1) + 'о');
      candidates.push(word); // 某些中性名词前置格不变
    }
    
    // 复数形式还原
    // 主格复数: столы → стол, мамы → мама, окна → окно
    if (word.endsWith('ы') || word.endsWith('и')) {
      candidates.push(word.slice(0, -1)); // 阳性复数
    }
    
    // 去重并返回
    const result = [...new Set(candidates)].filter(candidate => candidate.length > 0);
    
    // 存储到缓存（限制缓存大小）
    if (this.russianMorphologyCache.nouns.size >= this.maxCacheSize) {
      const firstKey = this.russianMorphologyCache.nouns.keys().next().value;
      this.russianMorphologyCache.nouns.delete(firstKey);
    }
    this.russianMorphologyCache.nouns.set(word, result);
    
    return result;
  }

  /**
   * 俄语动词变位还原算法（带缓存）
   * 将动词的变位形式还原为不定式形式
   * @param {string} word 要还原的词汇
   * @returns {Array} 候选的不定式形式数组
   */
  restoreRussianVerbConjugation(word) {
    // 检查缓存
    if (this.russianMorphologyCache.verbs.has(word)) {
      return this.russianMorphologyCache.verbs.get(word);
    }
    
    const candidates = [];
    
    // 不规则动词映射表
    const irregularVerbs = {
      'есть': 'быть', 'был': 'быть', 'была': 'быть', 'было': 'быть', 'были': 'быть',
      'иду': 'идти', 'идёшь': 'идти', 'идёт': 'идти', 'идём': 'идти', 'идёте': 'идти', 'идут': 'идти',
      'еду': 'ехать', 'едешь': 'ехать', 'едет': 'ехать', 'едем': 'ехать', 'едете': 'ехать', 'едут': 'ехать',
      'могу': 'мочь', 'можешь': 'мочь', 'может': 'мочь', 'можем': 'мочь', 'можете': 'мочь', 'могут': 'мочь',
      'хочу': 'хотеть', 'хочешь': 'хотеть', 'хочет': 'хотеть', 'хотим': 'хотеть', 'хотите': 'хотеть', 'хотят': 'хотеть'
    };
    
    // 检查不规则动词
    if (irregularVerbs[word]) {
      candidates.push(irregularVerbs[word]);
      return candidates;
    }
    
    // 第一变位动词还原 (-ать, -ять, -еть)
    // 现在时第一人称单数: читаю → читать
    if (word.endsWith('аю')) {
      candidates.push(word.slice(0, -2) + 'ать');
    }
    if (word.endsWith('яю')) {
      candidates.push(word.slice(0, -2) + 'ять');
    }
    
    // 现在时第二人称单数: читаешь → читать
    if (word.endsWith('аешь')) {
      candidates.push(word.slice(0, -4) + 'ать');
    }
    if (word.endsWith('яешь')) {
      candidates.push(word.slice(0, -4) + 'ять');
    }
    
    // 现在时第三人称单数: читает → читать
    if (word.endsWith('ает')) {
      candidates.push(word.slice(0, -3) + 'ать');
    }
    if (word.endsWith('яет')) {
      candidates.push(word.slice(0, -3) + 'ять');
    }
    
    // 现在时第一人称复数: читаем → читать
    if (word.endsWith('аем')) {
      candidates.push(word.slice(0, -3) + 'ать');
    }
    if (word.endsWith('яем')) {
      candidates.push(word.slice(0, -3) + 'ять');
    }
    
    // 现在时第二人称复数: читаете → читать
    if (word.endsWith('аете')) {
      candidates.push(word.slice(0, -4) + 'ать');
    }
    if (word.endsWith('яете')) {
      candidates.push(word.slice(0, -4) + 'ять');
    }
    
    // 现在时第三人称复数: читают → читать
    if (word.endsWith('ают')) {
      candidates.push(word.slice(0, -3) + 'ать');
    }
    if (word.endsWith('яют')) {
      candidates.push(word.slice(0, -3) + 'ять');
    }
    
    // 第二变位动词还原 (-ить)
    // 现在时第一人称单数: говорю → говорить
    if (word.endsWith('ю') && word.length > 2) {
      const stem = word.slice(0, -1);
      candidates.push(stem + 'ить');
    }
    
    // 现在时第二人称单数: говоришь → говорить
    if (word.endsWith('ишь')) {
      candidates.push(word.slice(0, -3) + 'ить');
    }
    
    // 现在时第三人称单数: говорит → говорить
    if (word.endsWith('ит')) {
      candidates.push(word.slice(0, -2) + 'ить');
    }
    
    // 现在时第一人称复数: говорим → говорить
    if (word.endsWith('им')) {
      candidates.push(word.slice(0, -2) + 'ить');
    }
    
    // 现在时第二人称复数: говорите → говорить
    if (word.endsWith('ите')) {
      candidates.push(word.slice(0, -3) + 'ить');
    }
    
    // 现在时第三人称复数: говорят → говорить
    if (word.endsWith('ят')) {
      candidates.push(word.slice(0, -2) + 'ить');
    }
    if (word.endsWith('ат')) {
      candidates.push(word.slice(0, -2) + 'ить');
    }
    
    // 过去时形式还原
    // 过去时阳性: читал → читать
    if (word.endsWith('ал')) {
      candidates.push(word.slice(0, -2) + 'ать');
    }
    if (word.endsWith('ил')) {
      candidates.push(word.slice(0, -2) + 'ить');
    }
    
    // 过去时阴性: читала → читать
    if (word.endsWith('ала')) {
      candidates.push(word.slice(0, -3) + 'ать');
    }
    if (word.endsWith('ила')) {
      candidates.push(word.slice(0, -3) + 'ить');
    }
    
    // 过去时中性: читало → читать
    if (word.endsWith('ало')) {
      candidates.push(word.slice(0, -3) + 'ать');
    }
    if (word.endsWith('ило')) {
      candidates.push(word.slice(0, -3) + 'ить');
    }
    
    // 过去时复数: читали → читать
    if (word.endsWith('али')) {
      candidates.push(word.slice(0, -3) + 'ать');
    }
    if (word.endsWith('или')) {
      candidates.push(word.slice(0, -3) + 'ить');
    }
    
    // 去重并返回
    const result = [...new Set(candidates)].filter(candidate => candidate.length > 0);
    
    // 存储到缓存（限制缓存大小）
    if (this.russianMorphologyCache.verbs.size >= this.maxCacheSize) {
      const firstKey = this.russianMorphologyCache.verbs.keys().next().value;
      this.russianMorphologyCache.verbs.delete(firstKey);
    }
    this.russianMorphologyCache.verbs.set(word, result);
    
    return result;
  }

  /**
   * 俄语形容词格变还原算法（带缓存）
   * 将形容词的性、数、格变化形式还原为阳性单数主格形式
   * @param {string} word 要还原的词汇
   * @returns {Array} 候选的阳性单数主格形式数组
   */
  restoreRussianAdjectiveDeclension(word) {
    // 检查缓存
    if (this.russianMorphologyCache.adjectives.has(word)) {
      return this.russianMorphologyCache.adjectives.get(word);
    }
    
    const candidates = [];
    
    // 硬变化形容词还原规则 (новый类型)
    // 阴性形式: новая → новый
    if (word.endsWith('ая')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 中性形式: новое → новый
    if (word.endsWith('ое')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 复数形式: новые → новый
    if (word.endsWith('ые')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 阴性宾格: новую → новый
    if (word.endsWith('ую')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 生格形式: нового → новый (阳性/中性生格)
    if (word.endsWith('ого')) {
      candidates.push(word.slice(0, -3) + 'ый');
    }
    
    // 阴性生格: новой → новый
    if (word.endsWith('ой')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 与格形式: новому → новый (阳性/中性与格)
    if (word.endsWith('ому')) {
      candidates.push(word.slice(0, -3) + 'ый');
    }
    
    // 工具格形式: новым → новый (阳性/中性工具格)
    if (word.endsWith('ым')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 前置格形式: новом → новый (阳性/中性前置格)
    if (word.endsWith('ом')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 复数生格: новых → новый
    if (word.endsWith('ых')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 复数与格: новым → новый
    if (word.endsWith('ым')) {
      candidates.push(word.slice(0, -2) + 'ый');
    }
    
    // 复数工具格: новыми → новый
    if (word.endsWith('ыми')) {
      candidates.push(word.slice(0, -3) + 'ый');
    }
    
    // 软变化形容词还原规则 (синий类型)
    // 阴性形式: синяя → синий
    if (word.endsWith('яя')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 中性形式: синее → синий
    if (word.endsWith('ее')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 复数形式: синие → синий
    if (word.endsWith('ие')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 阴性宾格: синюю → синий
    if (word.endsWith('юю')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 生格形式: синего → синий (阳性/中性生格)
    if (word.endsWith('его')) {
      candidates.push(word.slice(0, -3) + 'ий');
    }
    
    // 阴性生格/与格/前置格: синей → синий
    if (word.endsWith('ей')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 与格形式: синему → синий (阳性/中性与格)
    if (word.endsWith('ему')) {
      candidates.push(word.slice(0, -3) + 'ий');
    }
    
    // 工具格形式: синим → синий (阳性/中性工具格)
    if (word.endsWith('им')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 前置格形式: синем → синий (阳性/中性前置格)
    if (word.endsWith('ем')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 复数生格: синих → синий
    if (word.endsWith('их')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 复数与格: синим → синий
    if (word.endsWith('им')) {
      candidates.push(word.slice(0, -2) + 'ий');
    }
    
    // 复数工具格: синими → синий
    if (word.endsWith('ими')) {
      candidates.push(word.slice(0, -3) + 'ий');
    }
    
    // 短尾形容词还原 (красив → красивый)
    // 阴性短尾: красива → красивый
    if (word.endsWith('а') && word.length > 2) {
      candidates.push(word.slice(0, -1) + 'ый');
    }
    
    // 中性短尾: красиво → красивый
    if (word.endsWith('о') && word.length > 2) {
      candidates.push(word.slice(0, -1) + 'ый');
    }
    
    // 复数短尾: красивы → красивый
    if (word.endsWith('ы') && word.length > 2) {
      candidates.push(word.slice(0, -1) + 'ый');
    }
    
    // 去重并返回
    const result = [...new Set(candidates)].filter(candidate => candidate.length > 0);
    
    // 存储到缓存（限制缓存大小）
    if (this.russianMorphologyCache.adjectives.size >= this.maxCacheSize) {
      const firstKey = this.russianMorphologyCache.adjectives.keys().next().value;
      this.russianMorphologyCache.adjectives.delete(firstKey);
    }
    this.russianMorphologyCache.adjectives.set(word, result);
    
    return result;
  }

  /**
   * 俄语动词体态处理算法（带缓存）
   * 处理完成体和未完成体动词之间的相互转换
   * @param {string} verb 要处理的动词
   * @returns {Array} 候选的体态对应动词数组
   */
  restoreRussianVerbAspects(verb) {
    // 检查缓存
    if (this.russianMorphologyCache.aspects.has(verb)) {
      return this.russianMorphologyCache.aspects.get(verb);
    }
    
    const candidates = [];
    
    // 完成体 → 未完成体的常见转换模式
    
    // 前缀去除模式 (сделать → делать)
    const perfectivePrefixes = ['с', 'по', 'за', 'на', 'про', 'пере', 'вы', 'при', 'от', 'под', 'над', 'об', 'в', 'из', 'до', 'раз'];
    for (const prefix of perfectivePrefixes) {
      if (verb.startsWith(prefix) && verb.length > prefix.length + 2) {
        candidates.push(verb.slice(prefix.length));
      }
    }
    
    // -ну- 后缀去除 (прыгнуть → прыгать)
    if (verb.includes('ну') && verb.endsWith('ть')) {
      const withoutNu = verb.replace('нуть', 'ть').replace('ну', '');
      if (withoutNu.length > 2) {
        candidates.push(withoutNu + 'ать');
        candidates.push(withoutNu + 'ить');
      }
    }
    
    // -и- → -а- 模式 (решить → решать)
    if (verb.endsWith('ить')) {
      const stem = verb.slice(0, -3);
      candidates.push(stem + 'ать');
    }
    
    // 未完成体 → 完成体的常见转换模式
    
    // 添加前缀模式 (делать → сделать)
    if (!verb.startsWith('с') && !verb.startsWith('по') && !verb.startsWith('за')) {
      candidates.push('с' + verb);
      candidates.push('по' + verb);
      candidates.push('за' + verb);
      candidates.push('на' + verb);
      candidates.push('про' + verb);
    }
    
    // -ать → -ить 模式 (решать → решить)
    if (verb.endsWith('ать')) {
      const stem = verb.slice(0, -3);
      candidates.push(stem + 'ить');
    }
    
    // 添加 -ну- 后缀 (прыгать → прыгнуть)
    if (verb.endsWith('ать') || verb.endsWith('ить')) {
      const stem = verb.slice(0, -3);
      candidates.push(stem + 'нуть');
    }
    
    // 特殊的体态对应关系
    const aspectPairs = {
      // 常见的不规则体态对
      'говорить': ['сказать'],
      'сказать': ['говорить'],
      'брать': ['взять'],
      'взять': ['брать'],
      'класть': ['положить'],
      'положить': ['класть'],
      'ловить': ['поймать'],
      'поймать': ['ловить'],
      'покупать': ['купить'],
      'купить': ['покупать'],
      'изучать': ['изучить'],
      'изучить': ['изучать'],
      'читать': ['прочитать'],
      'прочитать': ['читать'],
      'писать': ['написать'],
      'написать': ['писать'],
      'делать': ['сделать'],
      'сделать': ['делать'],
      'видеть': ['увидеть'],
      'увидеть': ['видеть'],
      'слышать': ['услышать'],
      'услышать': ['слышать'],
      'находить': ['найти'],
      'найти': ['находить'],
      'получать': ['получить'],
      'получить': ['получать'],
      'давать': ['дать'],
      'дать': ['давать'],
      'вставать': ['встать'],
      'встать': ['вставать'],
      'садиться': ['сесть'],
      'сесть': ['садиться'],
      'ложиться': ['лечь'],
      'лечь': ['ложиться'],
      'открывать': ['открыть'],
      'открыть': ['открывать'],
      'закрывать': ['закрыть'],
      'закрыть': ['закрывать'],
      'начинать': ['начать'],
      'начать': ['начинать'],
      'кончать': ['кончить'],
      'кончить': ['кончать'],
      'приходить': ['прийти'],
      'прийти': ['приходить'],
      'уходить': ['уйти'],
      'уйти': ['уходить'],
      'приезжать': ['приехать'],
      'приехать': ['приезжать'],
      'уезжать': ['уехать'],
      'уехать': ['уезжать']
    };
    
    if (aspectPairs[verb]) {
      candidates.push(...aspectPairs[verb]);
    }
    
    // 去重并返回
    const result = [...new Set(candidates)].filter(candidate => candidate.length > 0);
    
    // 存储到缓存（限制缓存大小）
    if (this.russianMorphologyCache.aspects.size >= this.maxCacheSize) {
      const firstKey = this.russianMorphologyCache.aspects.keys().next().value;
      this.russianMorphologyCache.aspects.delete(firstKey);
    }
    this.russianMorphologyCache.aspects.set(verb, result);
    
    return result;
  }

  /**
   * 俄语专用文本分词处理器
   * 集成形态学还原功能，支持名词格变、动词变位、形容词格变和动词体态处理
   * @param {string} text 要分词的文本
   * @param {Object} dictionary 词典对象
   * @returns {string} 处理后的HTML字符串
   */
  segmentRuLangText(text, dictionary) {
    // 按空格分割文本
    let tokens = text.split(/\s+/);
    let processedTokens = [];
    
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      
      // 清理词汇，保留俄语西里尔字母
      let cleanWord = token.toLowerCase().replace(/[^\w\u0400-\u04FF]/g, '');
      
      // 跳过空词汇
      if (!cleanWord) {
        processedTokens.push(token);
        continue;
      }
      
      // 智能词典查找：先直接匹配，再尝试形态学还原
      let foundEntry = this.findRussianWordInDictionary(cleanWord, dictionary);
      
      if (foundEntry.pos) {
        let normalizedPos = this.normalizePartOfSpeech(foundEntry.pos);
        
        // 检查是否应该高亮
        if ((normalizedPos === 'n' && this.highlightingToggles.noun) ||
            (normalizedPos === 'v' && this.highlightingToggles.verb) ||
            (normalizedPos === 'a' && this.highlightingToggles.adj)) {
          // 分离词汇和标点符号
          const wordMatch = token.match(/^([\w\u0400-\u04FF]+)(.*)$/);
          if (wordMatch) {
            const [, word, punctuation] = wordMatch;
            processedTokens.push(`<span class="adhd-${normalizedPos}">${word}</span>${punctuation}`);
          } else {
            processedTokens.push(`<span class="adhd-${normalizedPos}">${token}</span>`);
          }
        } else {
          processedTokens.push(token);
        }
      } else {
        processedTokens.push(token);
      }
    }
    
    return processedTokens.join(' ');
  }

  /**
   * 俄语智能词典查找函数（带缓存）
   * 集成所有形态学还原算法进行词典匹配
   * @param {string} word 要查找的词汇
   * @param {Object} dictionary 词典对象
   * @returns {Object} 包含词性信息的对象 {pos: string, baseForm: string}
   */
  findRussianWordInDictionary(word, dictionary) {
    // 检查缓存
    const cacheKey = `${word}_${JSON.stringify(dictionary).slice(0, 50)}`; // 简化的缓存键
    if (this.russianMorphologyCache.dictionary.has(cacheKey)) {
      return this.russianMorphologyCache.dictionary.get(cacheKey);
    }
    
    // 1. 直接匹配
    let directMatch = this.lookupInDictionary(word, dictionary);
    if (directMatch.pos) {
      const result = { pos: directMatch.pos, baseForm: word };
      this.cacheResult(cacheKey, result);
      return result;
    }
    
    // 2. 名词格变还原
    const nounCandidates = this.restoreRussianNounDeclension(word);
    for (const candidate of nounCandidates) {
      let match = this.lookupInDictionary(candidate, dictionary);
      if (match.pos && (match.pos.includes('n') || match.pos === 'n')) {
        const result = { pos: match.pos, baseForm: candidate };
        this.cacheResult(cacheKey, result);
        return result;
      }
    }
    
    // 3. 动词变位还原
    const verbCandidates = this.restoreRussianVerbConjugation(word);
    for (const candidate of verbCandidates) {
      let match = this.lookupInDictionary(candidate, dictionary);
      if (match.pos && (match.pos.includes('v') || match.pos === 'v')) {
        const result = { pos: match.pos, baseForm: candidate };
        this.cacheResult(cacheKey, result);
        return result;
      }
    }
    
    // 4. 形容词格变还原
    const adjCandidates = this.restoreRussianAdjectiveDeclension(word);
    for (const candidate of adjCandidates) {
      let match = this.lookupInDictionary(candidate, dictionary);
      if (match.pos && (match.pos.includes('adj') || match.pos === 'adj' || match.pos === 'a')) {
        const result = { pos: match.pos, baseForm: candidate };
        this.cacheResult(cacheKey, result);
        return result;
      }
    }
    
    // 5. 动词体态处理
    const aspectCandidates = this.restoreRussianVerbAspects(word);
    for (const candidate of aspectCandidates) {
      let match = this.lookupInDictionary(candidate, dictionary);
      if (match.pos && (match.pos.includes('v') || match.pos === 'v')) {
        const result = { pos: match.pos, baseForm: candidate };
        this.cacheResult(cacheKey, result);
        return result;
      }
    }
    
    // 未找到匹配
    const result = { pos: null, baseForm: null };
    
    // 存储到缓存（限制缓存大小）
    if (this.russianMorphologyCache.dictionary.size >= this.maxCacheSize) {
      const firstKey = this.russianMorphologyCache.dictionary.keys().next().value;
      this.russianMorphologyCache.dictionary.delete(firstKey);
    }
    this.russianMorphologyCache.dictionary.set(cacheKey, result);
    
    return result;
  }

  /**
   * 缓存结果的辅助方法
   * @param {string} cacheKey 缓存键
   * @param {Object} result 要缓存的结果
   */
  cacheResult(cacheKey, result) {
    if (this.russianMorphologyCache.dictionary.size >= this.maxCacheSize) {
      const firstKey = this.russianMorphologyCache.dictionary.keys().next().value;
      this.russianMorphologyCache.dictionary.delete(firstKey);
    }
    this.russianMorphologyCache.dictionary.set(cacheKey, result);
  }

  /**
   * 统一的词典查找接口
   * 处理不同的词典格式
   * @param {string} word 要查找的词汇
   * @param {Object} dictionary 词典对象
   * @returns {Object} 包含词性信息的对象 {pos: string}
   */
  lookupInDictionary(word, dictionary) {
    if (!dictionary || !word) {
      return { pos: null };
    }
    
    // 情况1: 完整词典结构 {words: {...}}
    if (dictionary.words && dictionary.words[word]) {
      const entry = dictionary.words[word];
      if (entry.pos && Array.isArray(entry.pos)) {
        // 优先级：形容词 > 动词 > 名词
        if (entry.pos.includes('adj') || entry.pos.includes('a')) {
          return { pos: 'adj' };
        } else if (entry.pos.includes('v')) {
          return { pos: 'v' };
        } else {
          return { pos: entry.pos[0] };
        }
      } else {
        return { pos: entry.pos || entry };
      }
    }
    
    // 情况2: 扁平化词典结构 {word: pos, ...}
    if (dictionary[word]) {
      return { pos: dictionary[word] };
    }
    
    return { pos: null };
  }

  /**
   * 英语专用文本分词处理器
   * 包含完整的英语特定逻辑：词汇变形、比较级处理等
   * @param {string} text 要分词的文本
   * @param {Object} dictionary 词典对象
   * @param {Object} dictionaryManager 词典管理器（可选）
   * @returns {string} 处理后的HTML字符串
   */
  segmentEnLangText(text, dictionary, dictionaryManager = null) {
    // 按空格和标点符号分割
    const tokens = text.split(this.spaceBasedSeparators);
    let html = '';
    
    tokens.forEach(token => {
      if (!token) return;
      
      // 清理词汇（移除标点，转为小写）
      const cleanWord = this.cleanWord(token);
      
      // 首先尝试精确匹配
      if (cleanWord && dictionary[cleanWord]) {
        const pos = dictionary[cleanWord];
        const normalizedPos = this.normalizePartOfSpeech(pos);
        
        // 如果是名词或动词，优先使用词典标记
        if (normalizedPos === 'n' || normalizedPos === 'v') {
          const shouldHighlight = (
            (normalizedPos === 'n' && this.highlightingToggles.noun) ||
            (normalizedPos === 'v' && this.highlightingToggles.verb)
          );
          
          if (shouldHighlight) {
            html += `<span class="adhd-${normalizedPos}" data-word="${cleanWord}" data-pos="${pos}">${token}</span>`;
          } else {
            html += token;
          }
        }
        // 如果是形容词或副词，检查是否为比较级
        else {
          let isComparative = false;
          if (cleanWord) {
            // 不规则比较级/最高级
            const irregularComparatives = ['better', 'best', 'worse', 'worst', 'more', 'most', 'less', 'least'];
            if (irregularComparatives.includes(cleanWord)) {
              isComparative = true;
            }
            // 规则比较级/最高级
            else if ((cleanWord.endsWith('er') && cleanWord.length > 3) || 
                     (cleanWord.endsWith('est') && cleanWord.length > 4)) {
              isComparative = true;
            }
          }
          
          if (isComparative) {
             if (this.highlightingToggles.comparative) {
               // 紫色比较级高亮开启，显示为紫色
               html += `<span class="adhd-comp" data-word="${cleanWord}" data-pos="comparative">${token}</span>`;
             } else if (this.highlightingToggles.adj) {
               // 紫色比较级高亮关闭但形容词高亮开启，显示为绿色形容词
               html += `<span class="adhd-a" data-word="${cleanWord}" data-pos="comparative">${token}</span>`;
             } else {
               html += token;
             }
           } else if (normalizedPos === 'a' && this.highlightingToggles.adj) {
             html += `<span class="adhd-${normalizedPos}" data-word="${cleanWord}" data-pos="${pos}">${token}</span>`;
           } else {
             html += token;
           }
        }
      }
      // 如果精确匹配失败，检查比较级
      else {
        let isComparative = false;
        if (cleanWord) {
          // 不规则比较级/最高级
          const irregularComparatives = ['better', 'best', 'worse', 'worst', 'more', 'most', 'less', 'least'];
          if (irregularComparatives.includes(cleanWord)) {
            isComparative = true;
          }
          // 规则比较级/最高级
          else if ((cleanWord.endsWith('er') && cleanWord.length > 3) || 
                   (cleanWord.endsWith('est') && cleanWord.length > 4)) {
            isComparative = true;
          }
        }
        
        if (isComparative) {
          if (this.highlightingToggles.comparative) {
            // 紫色比较级高亮开启，显示为紫色
            html += `<span class="adhd-comp" data-word="${cleanWord}" data-pos="comparative">${token}</span>`;
          } else if (this.highlightingToggles.adj) {
            // 紫色比较级高亮关闭但形容词高亮开启，显示为绿色形容词
            html += `<span class="adhd-a" data-word="${cleanWord}" data-pos="comparative">${token}</span>`;
          } else {
            html += token;
          }
        }
        // 然后尝试词汇变形匹配
        else {
          // 如果精确匹配失败，尝试英语词汇变形匹配
          let matched = false;
          if (cleanWord && this.enMorphology) {
            const possibleStems = this.enMorphology.getPossibleStems(cleanWord);
            for (const stem of possibleStems) {
              if (dictionary[stem]) {
                const pos = dictionary[stem];
                const normalizedPos = this.normalizePartOfSpeech(pos);
                // 根据高亮开关决定是否应用变形匹配高亮
                const shouldHighlight = (
                  (normalizedPos === 'n' && this.highlightingToggles.noun) ||
                  (normalizedPos === 'v' && this.highlightingToggles.verb) ||
                  (normalizedPos === 'a' && this.highlightingToggles.adj)
                );
                
                if (shouldHighlight && (normalizedPos === 'n' || normalizedPos === 'v' || normalizedPos === 'a')) {
                  html += `<span class="adhd-${normalizedPos}" data-word="${stem}" data-pos="${pos}">${token}</span>`;
                  matched = true;
                  break;
                }
              }
            }
          }
          
          if (!matched) {
            html += token;
          }
        }
      }
    });
    
    return html;
  }

  /**
   * 清理词汇，移除标点符号并转为小写
   * @param {string} word 原始词汇
   * @returns {string} 清理后的词汇
   * @private
   */
  cleanWord(word) {
    return word.toLowerCase().replace(/[^\w]/g, '');
  }

  /**
   * 标准化词性标记
   * @param {string} pos 原始词性标记
   * @returns {string|null} 标准化后的词性，如果不是支持的词性则返回null
   */
  normalizePartOfSpeech(pos) {
    // 词性映射表 - 映射到CSS类名
    // 当前只支持名词(n)、动词(v)、形容词(a)三种词性的高亮
    const posMap = {
      // 名词 -> 'n'
      'n': 'n',
      'noun': 'n',
      'nn': 'n',
      'nns': 'n',
      'nnp': 'n',
      'nnps': 'n',
      
      // 动词 -> 'v'
      'v': 'v',
      'verb': 'v',
      'vb': 'v',
      'vbd': 'v',
      'vbg': 'v',
      'vbn': 'v',
      'vbp': 'v',
      'vbz': 'v',
      
      // 形容词 -> 'a'
      'a': 'a',
      'adj': 'a',
      'adjective': 'a',
      'jj': 'a',
      'jjr': 'a',
      'jjs': 'a'
      
      // 未来扩展词性支持时，可以在此添加更多词性映射
      // 例如：
      // 'adv': 'adv',     // 副词
      // 'prep': 'prep',   // 介词
      // 'conj': 'conj',   // 连词
      // 'pron': 'pron',   // 代词
      // 'num': 'num',     // 数词
      // 'int': 'int'      // 感叹词
    };
    
    const normalized = posMap[pos.toLowerCase()];
    // 只返回支持的词性，不支持的词性返回null（不进行高亮）
    return normalized || null;
  }

  /**
   * 获取词性的显示名称
   * @param {string} pos 词性代码
   * @returns {string} 词性显示名称
   */
  getPartOfSpeechName(pos) {
    const names = {
      'n': '名词',
      'v': '动词',
      'a': '形容词',
      'other': '其他'
    };
    
    return names[pos] || '其他';
  }

  /**
   * 验证分词结果
   * @param {string} originalText 原始文本
   * @param {string} segmentedHtml 分词后的HTML
   * @returns {boolean} 验证是否通过
   */
  validateSegmentation(originalText, segmentedHtml) {
    // 移除HTML标签，获取纯文本
    const textContent = segmentedHtml.replace(/<[^>]*>/g, '');
    
    // 比较原始文本和处理后文本是否一致
    return originalText === textContent;
  }

  /**
   * 统计分词结果
   * @param {string} segmentedHtml 分词后的HTML
   * @returns {Object} 统计信息
   */
  getSegmentationStats(segmentedHtml) {
    const stats = {
      totalWords: 0,
      partOfSpeech: {}
    };

    // 使用正则表达式匹配所有标记的词汇
    const wordMatches = segmentedHtml.match(/<span class="adhd-([^"]*)"[^>]*>([^<]*)<\/span>/g) || [];
    
    stats.totalWords = wordMatches.length;

    // 统计各词性数量
    wordMatches.forEach(match => {
      const posMatch = match.match(/class="adhd-([^"]*)"/);
      if (posMatch) {
        const pos = posMatch[1];
        stats.partOfSpeech[pos] = (stats.partOfSpeech[pos] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 提取分词后的词汇列表
   * @param {string} segmentedHtml 分词后的HTML
   * @returns {Array} 词汇信息数组
   */
  extractWords(segmentedHtml) {
    const words = [];
    const wordMatches = segmentedHtml.match(/<span class="adhd-([^"]*)"[^>]*data-word="([^"]*)"[^>]*data-pos="([^"]*)"[^>]*>([^<]*)<\/span>/g) || [];
    
    wordMatches.forEach(match => {
      const parts = match.match(/class="adhd-([^"]*)"[^>]*data-word="([^"]*)"[^>]*data-pos="([^"]*)"[^>]*>([^<]*)<\/span>/);
      if (parts) {
        words.push({
          normalizedPos: parts[1],
          word: parts[2],
          originalPos: parts[3],
          displayText: parts[4]
        });
      }
    });

    return words;
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextSegmenter;
} else {
  window.TextSegmenter = TextSegmenter;
}