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
      
      // 从词典中查找 - 处理两种可能的词典格式
      let entry = null;
      let pos = null;
      
      // 情况1: 完整词典结构 {words: {...}}
      if (dictionary && dictionary.words && dictionary.words[cleanWord]) {
        entry = dictionary.words[cleanWord];
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
      else if (dictionary && dictionary[cleanWord]) {
        pos = dictionary[cleanWord];
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
   * 俄语专用文本分词处理器
   * 采用简单的词典匹配逻辑，支持西里尔字母
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
      
      // 从词典中查找 - 处理两种可能的词典格式
      let entry = null;
      let pos = null;
      
      // 情况1: 完整词典结构 {words: {...}}
      if (dictionary && dictionary.words && dictionary.words[cleanWord]) {
        entry = dictionary.words[cleanWord];
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
      else if (dictionary && dictionary[cleanWord]) {
        pos = dictionary[cleanWord];
      }
      
      if (pos) {
        let normalizedPos = this.normalizePartOfSpeech(pos);
        
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