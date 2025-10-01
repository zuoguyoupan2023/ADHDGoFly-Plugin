// I18n Manager for ADHDGoFly Plugin
class I18nManager {
  constructor() {
    this.currentLanguage = 'en'; // 默认英文，会在init时根据系统语言自动调整
    this.translations = {};
    this.supportedLanguages = ['zh', 'en'];
    this.fallbackLanguage = 'en'; // 改为英文作为fallback
  }

  // 初始化i18n系统
  async init() {
    try {
      // 从存储中获取用户设置的语言
      const result = await chrome.storage.local.get(['language']);
      if (result.language && this.supportedLanguages.includes(result.language)) {
        this.currentLanguage = result.language;
      } else {
        // 如果没有设置，尝试从浏览器语言检测
        const browserLang = this.detectBrowserLanguage();
        this.currentLanguage = browserLang;
      }

      // 加载翻译文件
      await this.loadTranslations();
      
      // 应用翻译
      this.applyTranslations();
      
      console.log(`I18n initialized with language: ${this.currentLanguage}`);
    } catch (error) {
      console.error('I18n initialization failed:', error);
      // 使用默认语言
      this.currentLanguage = this.fallbackLanguage;
      await this.loadTranslations();
      this.applyTranslations();
    }
  }

  // 检测浏览器语言
  detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // 如果浏览器语言在支持列表中，使用它；否则使用默认语言
    return this.supportedLanguages.includes(langCode) ? langCode : this.fallbackLanguage;
  }

  // 加载翻译文件
  async loadTranslations() {
    try {
      const response = await fetch(chrome.runtime.getURL(`locales/${this.currentLanguage}.json`));
      if (!response.ok) {
        throw new Error(`Failed to load ${this.currentLanguage}.json`);
      }
      this.translations = await response.json();
    } catch (error) {
      console.error(`Failed to load translations for ${this.currentLanguage}:`, error);
      
      // 如果加载失败且不是fallback语言，尝试加载fallback
      if (this.currentLanguage !== this.fallbackLanguage) {
        try {
          const fallbackResponse = await fetch(chrome.runtime.getURL(`locales/${this.fallbackLanguage}.json`));
          this.translations = await fallbackResponse.json();
          this.currentLanguage = this.fallbackLanguage;
        } catch (fallbackError) {
          console.error('Failed to load fallback translations:', fallbackError);
          this.translations = {};
        }
      }
    }
  }

  // 获取翻译文本
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    // 遍历嵌套的key
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // 返回key作为fallback
      }
    }
    
    // 如果是字符串，进行参数替换
    if (typeof value === 'string') {
      return this.interpolate(value, params);
    }
    
    return value;
  }

  // 参数插值
  interpolate(text, params) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  // 切换语言
  async switchLanguage(language) {
    if (!this.supportedLanguages.includes(language)) {
      console.error(`Unsupported language: ${language}`);
      return false;
    }

    if (language === this.currentLanguage) {
      return true; // 已经是当前语言
    }

    const oldLanguage = this.currentLanguage;
    this.currentLanguage = language;

    try {
      // 加载新语言的翻译
      await this.loadTranslations();
      
      // 保存到存储
      await chrome.storage.local.set({ language: language });
      
      // 应用翻译
      this.applyTranslations();
      
      // 触发语言切换事件
      this.dispatchLanguageChangeEvent(language, oldLanguage);
      
      console.log(`Language switched to: ${language}`);
      return true;
    } catch (error) {
      console.error(`Failed to switch to language ${language}:`, error);
      // 恢复到原来的语言
      this.currentLanguage = oldLanguage;
      return false;
    }
  }

  // 应用翻译到DOM
  applyTranslations() {
    // 查找所有带有data-i18n属性的元素
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      // 根据元素类型设置文本
      if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
        element.value = translation;
      } else if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = translation;
      } else if (element.hasAttribute('title')) {
        element.title = translation;
      } else {
        element.textContent = translation;
      }
    });

    // 处理特殊的HTML内容
    this.applySpecialTranslations();
  }

  // 处理特殊的翻译内容
  applySpecialTranslations() {
    // 更新页面标题
    const titleElement = document.querySelector('.header h3');
    if (titleElement && !titleElement.hasAttribute('data-i18n')) {
      titleElement.textContent = this.t('appName');
    }

    // 更新侧边栏按钮的title属性
    const sidebarButtons = {
      'home-btn': 'sidebar.home',
      'dict-btn': 'sidebar.dict',
      'colors-btn': 'sidebar.colors',
      'text-btn': 'sidebar.text',
      'ai-btn': 'sidebar.ai',
      'about-btn': 'sidebar.about',
      'settings-btn': 'sidebar.settings',
      'languageToggle': 'sidebar.language'
    };

    Object.entries(sidebarButtons).forEach(([id, key]) => {
      const button = document.getElementById(id);
      if (button) {
        button.title = this.t(key);
      }
    });
  }

  // 触发语言切换事件
  dispatchLanguageChangeEvent(newLanguage, oldLanguage) {
    const event = new CustomEvent('languageChanged', {
      detail: {
        newLanguage,
        oldLanguage,
        translations: this.translations
      }
    });
    document.dispatchEvent(event);
  }

  // 获取当前语言
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // 获取支持的语言列表
  getSupportedLanguages() {
    return [...this.supportedLanguages];
  }

  // 获取语言显示名称
  getLanguageDisplayName(langCode) {
    return this.t(`languages.${langCode}`) || langCode;
  }

  // 格式化数字（根据语言环境）
  formatNumber(number) {
    const locale = this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
    return new Intl.NumberFormat(locale).format(number);
  }

  // 格式化日期（根据语言环境）
  formatDate(date) {
    const locale = this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
    return new Intl.DateTimeFormat(locale).format(date);
  }
}

// 创建全局i18n实例
window.i18n = new I18nManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18nManager;
}