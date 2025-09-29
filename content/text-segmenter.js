// 文本分词器模块
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