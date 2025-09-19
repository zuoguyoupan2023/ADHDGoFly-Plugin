// 语言检测器模块
class LanguageDetector {
  constructor() {
    // 语言检测的字符模式
    this.patterns = {
      chinese: /[\u4e00-\u9fa5]/g,
      japanese: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g,
      russian: /[\u0400-\u04ff]/g,
      french: /[àâäéèêëïîôöùûüÿç]/gi,
      spanish: /[ñáéíóúü¿¡]/gi,
      arabic: /[\u0600-\u06ff]/g,
      korean: /[\uac00-\ud7af]/g
    };

    // 语言检测阈值
    this.thresholds = {
      chinese: 0.3,
      japanese: 0.2,
      russian: 0.3,
      french: 0.05,
      spanish: 0.05,
      arabic: 0.3,
      korean: 0.3
    };
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

    // 按优先级检查语言
    const detectionOrder = [
      'chinese', 'japanese', 'korean', 'arabic', 'russian', 'french', 'spanish'
    ];

    for (const language of detectionOrder) {
      if (ratios[language] >= this.thresholds[language]) {
        return this.mapLanguageCode(language);
      }
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