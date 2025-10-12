// content/storage/multilang-processor.js
/**
 * 多语言混合文本处理器
 * 处理混合语言文本的增量高亮和智能存储
 */
class MultiLanguageProcessor {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.currentPageUrl = null;
    this.enabledLanguages = new Set();
    this.processedLanguages = new Set();
    this.pendingLanguages = new Set();
    
    // 语言检测缓存
    this.languageCache = new Map();
    
    // 处理状态
    this.isProcessing = false;
    this.processingQueue = [];
  }

  /**
   * 初始化页面处理
   */
  async initializePage(url, enabledLanguages) {
    this.currentPageUrl = url;
    this.enabledLanguages = new Set(enabledLanguages);
    this.processedLanguages.clear();
    this.pendingLanguages.clear();
    
    // 获取缓存状态
    const cacheStatus = await this.cacheManager.getPageCacheStatus(url, enabledLanguages);
    
    return {
      cacheStatus,
      strategy: this.determineProcessingStrategy(cacheStatus)
    };
  }

  /**
   * 确定处理策略
   */
  determineProcessingStrategy(cacheStatus) {
    if (cacheStatus.needsFullProcessing) {
      return {
        type: 'full',
        description: '完整处理所有语言',
        languages: Array.from(this.enabledLanguages)
      };
    }
    
    if (cacheStatus.needsIncrementalProcessing) {
      return {
        type: 'incremental',
        description: '增量处理缺失语言',
        cachedLanguages: cacheStatus.availableLanguages,
        missingLanguages: cacheStatus.missingLanguages
      };
    }
    
    return {
      type: 'cached',
      description: '使用完整缓存',
      availableLanguages: cacheStatus.availableLanguages
    };
  }

  /**
   * 执行混合语言处理
   */
  async processPage(strategy, textSegmenter, pageProcessor) {
    try {
      switch (strategy.type) {
        case 'full':
          return await this.processFullPage(strategy.languages, textSegmenter, pageProcessor);
          
        case 'incremental':
          return await this.processIncrementalPage(strategy, textSegmenter, pageProcessor);
          
        case 'cached':
          return await this.applyCachedPage(strategy.availableLanguages);
          
        default:
          throw new Error(`未知处理策略: ${strategy.type}`);
      }
    } catch (error) {
      console.error('多语言处理失败:', error);
      // 降级到正常处理流程
      return await this.fallbackToNormalProcessing(textSegmenter, pageProcessor);
    }
  }

  /**
   * 完整页面处理
   */
  async processFullPage(languages, textSegmenter, pageProcessor) {
    console.log('执行完整页面处理，语言:', languages);
    
    const results = {
      processedElements: [],
      languageStats: {},
      processingTime: Date.now()
    };
    
    // 收集所有文本节点
    const textNodes = this.collectTextNodes();
    
    // 按语言分组处理
    for (const language of languages) {
      try {
        const languageElements = await this.processLanguage(
          language, 
          textNodes, 
          textSegmenter, 
          pageProcessor
        );
        
        if (languageElements.length > 0) {
          results.processedElements.push(...languageElements);
          results.languageStats[language] = {
            elementCount: languageElements.length,
            processed: true
          };
          
          // 存储该语言的高亮数据
          await this.cacheManager.storePageHighlights(
            this.currentPageUrl,
            language,
            languageElements,
            await this.generatePageFingerprint()
          );
          
          this.processedLanguages.add(language);
        }
      } catch (error) {
        console.warn(`处理 ${language} 语言失败:`, error);
        results.languageStats[language] = {
          elementCount: 0,
          processed: false,
          error: error.message
        };
      }
    }
    
    results.processingTime = Date.now() - results.processingTime;
    return results;
  }

  /**
   * 增量页面处理
   */
  async processIncrementalPage(strategy, textSegmenter, pageProcessor) {
    console.log('执行增量页面处理');
    console.log('已缓存语言:', strategy.cachedLanguages);
    console.log('待处理语言:', strategy.missingLanguages);
    
    const results = {
      processedElements: [],
      cachedElements: [],
      languageStats: {},
      processingTime: Date.now()
    };
    
    // 1. 恢复已缓存的语言
    const pageId = await this.cacheManager.generatePageId(this.currentPageUrl);
    const cachedHighlights = await this.cacheManager.applyCachedHighlights(
      pageId, 
      strategy.cachedLanguages
    );
    
    if (cachedHighlights.length > 0) {
      results.cachedElements = await this.applyCachedHighlights(cachedHighlights);
      
      for (const lang of strategy.cachedLanguages) {
        results.languageStats[lang] = {
          elementCount: cachedHighlights.filter(h => h.language === lang).length,
          processed: true,
          fromCache: true
        };
        this.processedLanguages.add(lang);
      }
    }
    
    // 2. 处理缺失的语言
    if (strategy.missingLanguages.length > 0) {
      const textNodes = this.collectTextNodes();
      
      for (const language of strategy.missingLanguages) {
        try {
          const languageElements = await this.processLanguage(
            language,
            textNodes,
            textSegmenter,
            pageProcessor
          );
          
          if (languageElements.length > 0) {
            results.processedElements.push(...languageElements);
            results.languageStats[language] = {
              elementCount: languageElements.length,
              processed: true,
              fromCache: false
            };
            
            // 增量存储新语言数据
            await this.cacheManager.processIncrementalLanguage(
              this.currentPageUrl,
              language,
              languageElements
            );
            
            this.processedLanguages.add(language);
          }
        } catch (error) {
          console.warn(`增量处理 ${language} 语言失败:`, error);
          results.languageStats[language] = {
            elementCount: 0,
            processed: false,
            error: error.message
          };
        }
      }
    }
    
    results.processingTime = Date.now() - results.processingTime;
    return results;
  }

  /**
   * 应用缓存页面
   */
  async applyCachedPage(availableLanguages) {
    console.log('应用完整缓存，语言:', availableLanguages);
    
    const results = {
      cachedElements: [],
      languageStats: {},
      processingTime: Date.now()
    };
    
    try {
      const pageId = await this.cacheManager.generatePageId(this.currentPageUrl);
      const cachedHighlights = await this.cacheManager.applyCachedHighlights(
        pageId,
        availableLanguages
      );
      
      if (cachedHighlights.length > 0) {
        results.cachedElements = await this.applyCachedHighlights(cachedHighlights);
        
        // 统计各语言数据
        for (const lang of availableLanguages) {
          const langHighlights = cachedHighlights.filter(h => h.language === lang);
          results.languageStats[lang] = {
            elementCount: langHighlights.length,
            processed: true,
            fromCache: true
          };
          this.processedLanguages.add(lang);
        }
      }
      
    } catch (error) {
      console.error('应用缓存失败:', error);
      throw error;
    }
    
    results.processingTime = Date.now() - results.processingTime;
    return results;
  }

  /**
   * 处理单一语言
   */
  async processLanguage(language, textNodes, textSegmenter, pageProcessor) {
    const languageNodes = this.filterNodesByLanguage(textNodes, language);
    if (languageNodes.length === 0) return [];
    
    // 使用现有的文本分割器处理
    const segments = await textSegmenter.segmentTextNodes(languageNodes, language);
    
    // 应用高亮
    const highlightedElements = [];
    for (const segment of segments) {
      try {
        const element = await pageProcessor.createHighlightElement(segment, language);
        if (element) {
          highlightedElements.push({
            element,
            language,
            content: segment.text,
            position: this.getElementPosition(element),
            metadata: segment.metadata
          });
        }
      } catch (error) {
        console.warn('创建高亮元素失败:', error);
      }
    }
    
    return highlightedElements;
  }

  /**
   * 按语言过滤文本节点
   */
  filterNodesByLanguage(textNodes, targetLanguage) {
    return textNodes.filter(node => {
      const detectedLanguage = this.detectNodeLanguage(node);
      return detectedLanguage === targetLanguage || detectedLanguage === 'mixed';
    });
  }

  /**
   * 检测节点语言
   */
  detectNodeLanguage(node) {
    const text = node.textContent.trim();
    if (!text) return 'unknown';
    
    // 使用缓存避免重复检测
    if (this.languageCache.has(text)) {
      return this.languageCache.get(text);
    }
    
    const language = this.performLanguageDetection(text);
    this.languageCache.set(text, language);
    return language;
  }

  /**
   * 执行语言检测
   */
  performLanguageDetection(text) {
    // 中文检测
    if (/[\u4e00-\u9fff]/.test(text)) {
      if (/[a-zA-Z]/.test(text)) return 'mixed';
      return 'zh';
    }
    
    // 日文检测
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      if (/[a-zA-Z\u4e00-\u9fff]/.test(text)) return 'mixed';
      return 'ja';
    }
    
    // 英文检测
    if (/^[a-zA-Z\s\d\p{P}]+$/u.test(text)) {
      return 'en';
    }
    
    // 其他语言的简单检测
    if (/[а-яё]/i.test(text)) return 'ru';
    if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(text)) return 'fr';
    if (/[ñáéíóúü]/i.test(text)) return 'es';
    
    return 'unknown';
  }

  /**
   * 应用缓存的高亮数据
   */
  async applyCachedHighlights(cachedHighlights) {
    const appliedElements = [];
    
    for (const highlight of cachedHighlights) {
      try {
        const element = await this.recreateHighlightElement(highlight);
        if (element) {
          appliedElements.push(element);
        }
      } catch (error) {
        console.warn('重建高亮元素失败:', error);
      }
    }
    
    return appliedElements;
  }

  /**
   * 重建高亮元素
   */
  async recreateHighlightElement(highlightData) {
    // 根据缓存数据重建DOM元素
    const element = document.createElement('span');
    element.className = 'adhd-highlight';
    element.textContent = highlightData.content;
    element.dataset.language = highlightData.language;
    element.dataset.pos = highlightData.partOfSpeech || 'unknown';
    
    // 应用样式
    if (highlightData.styles) {
      Object.assign(element.style, highlightData.styles);
    }
    
    return element;
  }

  /**
   * 处理语言配置变化
   */
  async handleLanguageConfigChange(newEnabledLanguages) {
    const previousLanguages = new Set(this.enabledLanguages);
    const currentLanguages = new Set(newEnabledLanguages);
    
    // 找出新启用的语言
    const newLanguages = [...currentLanguages].filter(lang => !previousLanguages.has(lang));
    
    // 找出被禁用的语言
    const disabledLanguages = [...previousLanguages].filter(lang => !currentLanguages.has(lang));
    
    // 清理被禁用语言的缓存
    for (const lang of disabledLanguages) {
      await this.cacheManager.clearLanguageCache(this.currentPageUrl, lang);
      this.processedLanguages.delete(lang);
    }
    
    // 更新当前配置
    this.enabledLanguages = currentLanguages;
    
    // 处理新启用的语言
    if (newLanguages.length > 0) {
      this.pendingLanguages = new Set([...this.pendingLanguages, ...newLanguages]);
      return {
        needsProcessing: true,
        newLanguages,
        disabledLanguages
      };
    }
    
    return {
      needsProcessing: false,
      newLanguages: [],
      disabledLanguages
    };
  }

  // ==================== 辅助方法 ====================

  collectTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
          if (node.parentElement.closest('.adhd-highlight')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      nodes.push(node);
    }
    return nodes;
  }

  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.pageYOffset,
      left: rect.left + window.pageXOffset,
      width: rect.width,
      height: rect.height
    };
  }

  async generatePageFingerprint() {
    // 简化的页面指纹生成
    const content = document.body.textContent.substring(0, 1000);
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  async fallbackToNormalProcessing(textSegmenter, pageProcessor) {
    console.log('降级到正常处理流程');
    // 调用原始处理逻辑
    return await pageProcessor.processPage();
  }
}

// 导出多语言处理器
window.MultiLanguageProcessor = MultiLanguageProcessor;