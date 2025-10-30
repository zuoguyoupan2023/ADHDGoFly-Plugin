// 语言检测器模块
class LanguageDetector {
  constructor() {
    // 语言检测的字符模式
    this.patterns = {
      chinese: /[\u4e00-\u9fff]/g,  // 扩大中文字符范围，包含更多汉字
      japanese: /[\u3040-\u309f\u30a0-\u30ff]/g,  // 只检测平假名和片假名，不包含汉字
      russian: /[\u0400-\u04ff]/g,
      french: /[àâäéèêëïîôöùûüÿç]/gi,
      spanish: /[ñáéíóúü¿¡]/gi,
      arabic: /[\u0600-\u06ff]/g,
      korean: /[\uac00-\ud7af]/g
    };

    // 语言检测阈值
    this.thresholds = {
      chinese: 0.2,   // 降低中文阈值，更容易检测到中文
      japanese: 0.3,  // 提高日文阈值，需要更多平假名/片假名才能判定为日文
      russian: 0.3,
      french: 0.05,
      spanish: 0.05,
      arabic: 0.3,
      korean: 0.3
    };

    // 法语常见词汇（用于辅助检测）
    this.frenchWords = [
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'est', 'avec', 'sur', 'pour', 'dans', 'par',
      'ce', 'cette', 'ces', 'son', 'sa', 'ses', 'il', 'elle', 'ils', 'elles', 'je', 'tu', 'nous', 'vous',
      'mais', 'ou', 'donc', 'car', 'ni', 'que', 'qui', 'dont', 'où', 'si', 'comme', 'quand', 'bien',
      'très', 'plus', 'moins', 'aussi', 'encore', 'déjà', 'toujours', 'jamais', 'souvent', 'parfois',
      'avoir', 'être', 'faire', 'aller', 'venir', 'voir', 'savoir', 'pouvoir', 'vouloir', 'devoir',
      'travail', 'travaille', 'étudiant', 'université', 'projet', 'efficace', 'étudier', 'réussir'
    ];
  }

  /**
   * 检测文本的主要语言
   * @param {string} text 要检测的文本
   * @param {number} sampleLength 采样长度，默认200字符
   * @returns {string} 语言代码
   */
  detectLanguage(text, sampleLength = 200) {
    if (!text || text.trim().length === 0) {
      return 'en'; // 默认英文
    }

    const sample = text.slice(0, sampleLength);
    const sampleLength_actual = sample.length;

    // 如果样本太短，直接返回英文
    if (sampleLength_actual < 5) {
      return 'en';
    }

    // 检测各种语言的字符比例
    const ratios = {};
    
    for (const [language, pattern] of Object.entries(this.patterns)) {
      const matches = sample.match(pattern) || [];
      ratios[language] = matches.length / sampleLength_actual;
    }

    // 特殊处理中日文冲突：如果同时检测到中文和日文
    if (ratios.chinese >= this.thresholds.chinese && ratios.japanese >= this.thresholds.japanese) {
      // 检测日文特有字符（平假名、片假名）的比例
      const hiraganaKatakana = (sample.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
      const hiraganaKatakanaRatio = hiraganaKatakana / sampleLength_actual;
      
      // 如果平假名/片假名比例很低（<5%），优先判定为中文
      if (hiraganaKatakanaRatio < 0.05) {
        return 'zh';
      }
      
      // 如果汉字比例明显高于平假名/片假名，判定为中文
      if (ratios.chinese > hiraganaKatakanaRatio * 2) {
        return 'zh';
      }
    }

    // 按优先级检查语言（中文优先级最高）
    const detectionOrder = [
      'chinese', 'korean', 'arabic', 'russian', 'japanese'
    ];

    for (const language of detectionOrder) {
      if (ratios[language] >= this.thresholds[language]) {
        return this.mapLanguageCode(language);
      }
    }

    // 特殊处理法语和西班牙语（检查重音字符和常见词汇）
    const isFrench = this.detectFrench(sample, ratios.french);
    if (isFrench) {
      return 'fr';
    }

    if (ratios.spanish >= this.thresholds.spanish) {
      return 'es';
    }

    // 如果没有检测到特殊语言，检查是否主要是拉丁字母
    const latinRatio = (sample.match(/[a-zA-Z]/g) || []).length / sampleLength_actual;
    if (latinRatio > 0.5) {
      return 'en';
    }

    // 默认返回英文
    return 'en';
  }

  /**
   * 检测是否为法语文本
   * @param {string} sample 文本样本
   * @param {number} accentRatio 重音字符比例
   * @returns {boolean} 是否为法语
   * @private
   */
  detectFrench(sample, accentRatio) {
    // 如果重音字符比例达到阈值，直接判定为法语
    if (accentRatio >= this.thresholds.french) {
      return true;
    }

    // 检查法语常见词汇
    const words = sample.toLowerCase().match(/\b[a-zàâäéèêëïîôöùûüÿç]+\b/gi) || [];
    let frenchWordCount = 0;
    
    for (const word of words) {
      if (this.frenchWords.includes(word)) {
        frenchWordCount++;
      }
    }

    // 如果法语词汇比例超过30%，或者有重音字符且法语词汇比例超过20%，判定为法语
    const frenchWordRatio = frenchWordCount / words.length;
    return frenchWordRatio > 0.3 || (accentRatio > 0 && frenchWordRatio > 0.2);
  }

  /**
   * 将语言名称映射为标准语言代码
   * @param {string} language 语言名称
   * @returns {string} 标准语言代码
   * @private
   */
  mapLanguageCode(language) {
    const mapping = {
      'chinese': 'zh',
      'japanese': 'ja',
      'korean': 'ko',
      'russian': 'ru',
      'french': 'fr',
      'spanish': 'es',
      'arabic': 'ar',
      'english': 'en'
    };

    return mapping[language] || 'en';
  }

  /**
   * 检测文本是否为混合语言
   * @param {string} text 要检测的文本
   * @returns {Array<string>} 检测到的语言列表
   */
  detectMixedLanguages(text, sampleLength = 200) {
    const sample = text.slice(0, sampleLength);
    const sampleLength_actual = sample.length;
    const detectedLanguages = [];

    if (sampleLength_actual < 5) {
      return ['en'];
    }

    // 检测所有可能的语言
    for (const [language, pattern] of Object.entries(this.patterns)) {
      const matches = sample.match(pattern) || [];
      const ratio = matches.length / sampleLength_actual;
      
      if (ratio >= this.thresholds[language]) {
        detectedLanguages.push(this.mapLanguageCode(language));
      }
    }

    // 如果没有检测到特殊语言，添加英文
    if (detectedLanguages.length === 0) {
      const latinRatio = (sample.match(/[a-zA-Z]/g) || []).length / sampleLength_actual;
      if (latinRatio > 0.3) {
        detectedLanguages.push('en');
      }
    }

    return detectedLanguages.length > 0 ? detectedLanguages : ['en'];
  }

  /**
   * 检查文本是否为CJK语言（中日韩）
   * @param {string} text 要检测的文本
   * @returns {boolean} 是否为CJK语言
   */
  isCJKLanguage(text) {
    const cjkLanguages = ['zh', 'ja', 'ko'];
    const detectedLanguage = this.detectLanguage(text);
    return cjkLanguages.includes(detectedLanguage);
  }

  /**
   * 检查文本是否需要分词处理
   * @param {string} text 要检测的文本
   * @returns {boolean} 是否需要分词
   */
  needsSegmentation(text) {
    return this.isCJKLanguage(text);
  }

  /**
   * 获取语言的书写方向
   * @param {string} languageCode 语言代码
   * @returns {string} 'ltr' 或 'rtl'
   */
  getWritingDirection(languageCode) {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(languageCode) ? 'rtl' : 'ltr';
  }

  /**
   * 获取语言的显示名称
   * @param {string} languageCode 语言代码
   * @returns {string} 语言显示名称
   */
  getLanguageName(languageCode) {
    const names = {
      'zh': '中文',
      'en': 'English',
      'ja': '日本語',
      'ko': '한국어',
      'ru': 'Русский',
      'fr': 'Français',
      'es': 'Español',
      'ar': 'العربية'
    };

    return names[languageCode] || languageCode.toUpperCase();
  }

  /**
   * 获取检测统计信息
   * @param {string} text 文本
   * @returns {Object} 统计信息
   */
  getDetectionStats(text) {
    const sample = text.slice(0, 200);
    const stats = {
      totalChars: sample.length,
      languages: {},
      primaryLanguage: this.detectLanguage(text),
      mixedLanguages: this.detectMixedLanguages(text)
    };

    // 计算各语言字符比例
    for (const [language, pattern] of Object.entries(this.patterns)) {
      const matches = sample.match(pattern) || [];
      stats.languages[language] = {
        count: matches.length,
        ratio: matches.length / sample.length
      };
    }

    return stats;
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LanguageDetector;
} else {
  window.LanguageDetector = LanguageDetector;
}