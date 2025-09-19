// 文本分词器模块
class TextSegmenter {
  constructor() {
    // 标点符号和分隔符模式
    this.punctuationPattern = /[\s\p{P}]/u;
    this.spaceBasedSeparators = /(\s+|[.,!?;:()"])/;
    
    // CJK分词的最大词长
    this.maxWordLength = 8;
  }

  /**
   * 根据语言类型对文本进行分词
   * @param {string} text 要分词的文本
   * @param {string} language 语言代码
   * @param {Object} dictionary 词典对象
   * @returns {string} 处理后的HTML字符串
   */
  segmentText(text, language, dictionary) {
    if (!text || !text.trim()) {
      return text;
    }

    // 根据语言选择分词策略
    if (this.isCJKLanguage(language)) {
      return this.segmentCJKText(text, dictionary);
    } else {
      return this.segmentSpaceBasedText(text, dictionary);
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
          html += `<span class="adhd-${normalizedPos}" data-word="${word}" data-pos="${pos}">${word}</span>`;
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
      
      if (cleanWord && dictionary[cleanWord]) {
        const pos = dictionary[cleanWord];
        const normalizedPos = this.normalizePartOfSpeech(pos);
        html += `<span class="adhd-${normalizedPos}" data-word="${cleanWord}" data-pos="${pos}">${token}</span>`;
      } else {
        html += token;
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
   * @returns {string} 标准化后的词性
   */
  normalizePartOfSpeech(pos) {
    // 词性映射表 - 映射到CSS类名
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
    };
    
    const normalized = posMap[pos.toLowerCase()];
    return normalized || 'other';
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