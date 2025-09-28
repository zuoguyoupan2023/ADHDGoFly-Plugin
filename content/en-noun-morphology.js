// 英语名词变形处理模块
class EnglishNounMorphology {
  constructor() {
    // 不规则名词复数映射
    this.irregularNouns = {
      'children': 'child',
      'men': 'man',
      'women': 'woman',
      'feet': 'foot',
      'teeth': 'tooth',
      'mice': 'mouse',
      'geese': 'goose',
      'people': 'person',
      'oxen': 'ox'
    };
    
    // 缓存已处理的词汇
    this.cache = new Map();
  }

  /**
   * 获取名词的可能词根形式
   * @param {string} word 输入词汇
   * @returns {Array<string>} 可能的词根形式数组
   */
  getPossibleStems(word) {
    if (!word || typeof word !== 'string') {
      return [];
    }

    const lowerWord = word.toLowerCase();
    
    // 检查缓存
    if (this.cache.has(lowerWord)) {
      return this.cache.get(lowerWord);
    }

    const stems = [];
    
    // 1. 原词本身
    stems.push(lowerWord);
    
    // 2. 检查不规则名词
    if (this.irregularNouns[lowerWord]) {
      stems.push(this.irregularNouns[lowerWord]);
    }
    
    // 3. 处理规则变化
    const regularStems = this.getRegularStems(lowerWord);
    stems.push(...regularStems);
    
    // 去重并缓存结果
    const uniqueStems = [...new Set(stems)];
    this.cache.set(lowerWord, uniqueStems);
    
    return uniqueStems;
  }

  /**
   * 处理规则名词复数变化
   * @param {string} word 输入词汇
   * @returns {Array<string>} 规则变化的词根
   * @private
   */
  getRegularStems(word) {
    const stems = [];
    
    // 规则1: -s结尾 (books -> book)
    if (word.endsWith('s') && word.length > 2) {
      const stem = word.slice(0, -1);
      stems.push(stem);
    }
    
    // 规则2: -es结尾 (boxes -> box, dishes -> dish)
    if (word.endsWith('es') && word.length > 3) {
      const stem = word.slice(0, -2);
      stems.push(stem);
    }
    
    // 规则3: -ies结尾 (cities -> city, babies -> baby)
    if (word.endsWith('ies') && word.length > 4) {
      const stem = word.slice(0, -3) + 'y';
      stems.push(stem);
    }
    
    // 规则4: -ves结尾 (knives -> knife, wolves -> wolf)
    if (word.endsWith('ves') && word.length > 4) {
      const stem = word.slice(0, -3) + 'f';
      stems.push(stem);
      // 也尝试 -fe 结尾的情况
      const stemFe = word.slice(0, -3) + 'fe';
      stems.push(stemFe);
    }
    
    return stems;
  }

  /**
   * 检查词汇是否可能是名词复数形式
   * @param {string} word 输入词汇
   * @returns {boolean} 是否可能是复数形式
   */
  isPossiblePlural(word) {
    if (!word || typeof word !== 'string' || word.length < 2) {
      return false;
    }
    
    const lowerWord = word.toLowerCase();
    
    // 检查不规则复数
    if (this.irregularNouns[lowerWord]) {
      return true;
    }
    
    // 检查规则复数模式
    return lowerWord.endsWith('s') || 
           lowerWord.endsWith('es') || 
           lowerWord.endsWith('ies') || 
           lowerWord.endsWith('ves');
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnglishNounMorphology;
} else {
  window.EnglishNounMorphology = EnglishNounMorphology;
}