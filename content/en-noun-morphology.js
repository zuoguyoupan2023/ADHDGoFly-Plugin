// 英语词汇变形处理模块
class EnglishMorphology {
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
    
    // 不规则动词映射
    this.irregularVerbs = {
      'ran': 'run',
      'went': 'go',
      'came': 'come',
      'saw': 'see',
      'took': 'take',
      'gave': 'give',
      'got': 'get',
      'made': 'make',
      'said': 'say',
      'told': 'tell',
      'knew': 'know',
      'thought': 'think',
      'brought': 'bring',
      'bought': 'buy',
      'caught': 'catch',
      'taught': 'teach',
      'fought': 'fight',
      'found': 'find',
      'held': 'hold',
      'left': 'leave',
      'felt': 'feel',
      'kept': 'keep',
      'slept': 'sleep',
      'wept': 'weep',
      'swept': 'sweep',
      'built': 'build',
      'sent': 'send',
      'spent': 'spend',
      'bent': 'bend',
      'lent': 'lend'
    };
    
    // 不规则形容词比较级/最高级映射
    this.irregularAdjectives = {
      'better': 'good',
      'best': 'good',
      'worse': 'bad',
      'worst': 'bad',
      'more': 'much',
      'most': 'much',
      'less': 'little',
      'least': 'little',
      'further': 'far',
      'furthest': 'far',
      'farther': 'far',
      'farthest': 'far',
      'elder': 'old',
      'eldest': 'old'
    };
    
    // 缓存已处理的词汇
    this.cache = new Map();
  }

  /**
   * 获取词汇的可能词根形式
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
    
    // 3. 检查不规则动词
    if (this.irregularVerbs[lowerWord]) {
      stems.push(this.irregularVerbs[lowerWord]);
    }
    
    // 4. 检查不规则形容词
    if (this.irregularAdjectives[lowerWord]) {
      stems.push(this.irregularAdjectives[lowerWord]);
    }
    
    // 5. 处理规则变化
    const regularStems = this.getRegularStems(lowerWord);
    stems.push(...regularStems);
    
    // 去重并缓存结果
    const uniqueStems = [...new Set(stems)];
    this.cache.set(lowerWord, uniqueStems);
    
    return uniqueStems;
  }

  /**
   * 处理规则变形（名词、动词、形容词）
   * @param {string} word 输入词汇
   * @returns {Array<string>} 规则变化的词根
   * @private
   */
  getRegularStems(word) {
    const stems = [];
    
    // === 名词复数规则 ===
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
    
    // === 动词变位规则 ===
    // 规则5: -ed结尾 (walked -> walk, played -> play)
    if (word.endsWith('ed') && word.length > 3) {
      const stem = word.slice(0, -2);
      stems.push(stem);
      
      // 处理双写辅音字母的情况 (stopped -> stop)
      if (stem.length >= 3) {
        const lastChar = stem[stem.length - 1];
        const secondLastChar = stem[stem.length - 2];
        if (lastChar === secondLastChar && this.isConsonant(lastChar)) {
          stems.push(stem.slice(0, -1));
        }
      }
    }
    
    // 规则6: -ing结尾 (walking -> walk, running -> run)
    if (word.endsWith('ing') && word.length > 4) {
      const stem = word.slice(0, -3);
      stems.push(stem);
      
      // 处理双写辅音字母的情况 (running -> run)
      if (stem.length >= 2) {
        const lastChar = stem[stem.length - 1];
        const secondLastChar = stem[stem.length - 2];
        if (lastChar === secondLastChar && this.isConsonant(lastChar)) {
          stems.push(stem.slice(0, -1));
        }
      }
      
      // 处理去掉e的情况 (making -> make)
      stems.push(stem + 'e');
    }
    
    // 规则7: 第三人称单数 -s结尾 (runs -> run, goes -> go)
    // 这个已经在规则1中处理了，但需要特别处理 -es 的情况
    
    // === 形容词比较级/最高级规则 ===
    // 规则8: -er结尾 (bigger -> big, faster -> fast, larger -> large)
    if (word.endsWith('er') && word.length > 3) {
      const stem = word.slice(0, -2);
      stems.push(stem);
      
      // 处理双写辅音字母的情况 (bigger -> big)
      if (stem.length >= 2) {
        const lastChar = stem[stem.length - 1];
        const secondLastChar = stem[stem.length - 2];
        if (lastChar === secondLastChar && this.isConsonant(lastChar)) {
          stems.push(stem.slice(0, -1));
        }
      }
      
      // 处理以辅音结尾的词汇，可能原形以e结尾 (larger -> large)
      if (stem.length >= 1 && this.isConsonant(stem[stem.length - 1])) {
        stems.push(stem + 'e');
      }
    }
    
    // 规则9: -est结尾 (biggest -> big, fastest -> fast, largest -> large)
    if (word.endsWith('est') && word.length > 4) {
      const stem = word.slice(0, -3);
      stems.push(stem);
      
      // 处理双写辅音字母的情况 (biggest -> big)
      if (stem.length >= 2) {
        const lastChar = stem[stem.length - 1];
        const secondLastChar = stem[stem.length - 2];
        if (lastChar === secondLastChar && this.isConsonant(lastChar)) {
          stems.push(stem.slice(0, -1));
        }
      }
      
      // 处理以辅音结尾的词汇，可能原形以e结尾 (largest -> large)
      if (stem.length >= 1 && this.isConsonant(stem[stem.length - 1])) {
        stems.push(stem + 'e');
      }
    }
    
    return stems;
  }
  
  /**
   * 检查字符是否为辅音字母
   * @param {string} char 字符
   * @returns {boolean} 是否为辅音字母
   * @private
   */
  isConsonant(char) {
    return char && 'bcdfghjklmnpqrstvwxyz'.includes(char.toLowerCase());
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
  module.exports = EnglishMorphology;
} else {
  window.EnglishMorphology = EnglishMorphology;
}