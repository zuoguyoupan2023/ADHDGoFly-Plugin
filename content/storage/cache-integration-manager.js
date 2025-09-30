// content/storage/cache-integration-manager.js
/**
 * 缓存集成管理器
 * 负责将缓存功能无缝集成到现有系统，确保核心功能不受影响
 */
class CacheIntegrationManager {
  constructor() {
    this.cacheManager = null;
    this.multiLangProcessor = null;
    this.originalProcessor = null;
    this.streamingProcessor = null;
    
    // 集成状态
    this.cacheEnabled = true;
    this.fallbackMode = false;
    this.initializationFailed = false;
    
    // 性能监控
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      fallbackCount: 0,
      averageProcessingTime: 0,
      errorCount: 0
    };
    
    // 初始化缓存系统
    this.initializeCacheSystem();
  }

  /**
   * 初始化缓存系统
   */
  async initializeCacheSystem() {
    try {
      // 检查浏览器支持
      if (!this.checkBrowserSupport()) {
        console.warn('浏览器不支持缓存功能，启用降级模式');
        this.enableFallbackMode();
        return;
      }
      
      // 初始化缓存管理器
      this.cacheManager = new EnhancedCacheManager();
      
      // 等待数据库初始化
      await this.waitForCacheReady();
      
      // 初始化多语言处理器
      this.multiLangProcessor = new MultiLanguageProcessor(this.cacheManager);
      
      console.log('缓存系统初始化成功');
      
    } catch (error) {
      console.error('缓存系统初始化失败:', error);
      this.handleInitializationFailure(error);
    }
  }

  /**
   * 检查浏览器支持
   */
  checkBrowserSupport() {
    return !!(
      window.indexedDB &&
      window.crypto &&
      window.crypto.subtle &&
      window.TextEncoder
    );
  }

  /**
   * 等待缓存系统就绪
   */
  async waitForCacheReady(timeout = 5000) {
    const startTime = Date.now();
    
    while (!this.cacheManager.db && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.cacheManager.db) {
      throw new Error('缓存数据库初始化超时');
    }
  }

  /**
   * 处理初始化失败
   */
  handleInitializationFailure(error) {
    this.initializationFailed = true;
    this.enableFallbackMode();
    this.performanceMetrics.errorCount++;
    
    // 记录错误但不影响核心功能
    console.warn('缓存功能不可用，使用标准处理模式:', error.message);
  }

  /**
   * 启用降级模式
   */
  enableFallbackMode() {
    this.fallbackMode = true;
    this.cacheEnabled = false;
    console.log('已启用降级模式，核心功能正常运行');
  }

  /**
   * 集成到主处理器
   */
  integrateWithMainProcessor(mainProcessor) {
    this.originalProcessor = mainProcessor;
    
    // 如果缓存不可用，直接返回原始处理器
    if (this.fallbackMode) {
      return this.createFallbackWrapper(mainProcessor);
    }
    
    // 创建增强的处理器包装器
    return this.createEnhancedWrapper(mainProcessor);
  }

  /**
   * 创建降级包装器
   */
  createFallbackWrapper(processor) {
    return {
      processPage: async (...args) => {
        this.performanceMetrics.fallbackCount++;
        return await processor.processPage(...args);
      },
      
      removeAllHighlights: (...args) => {
        return processor.removeAllHighlights(...args);
      },
      
      getProcessingSummary: (...args) => {
        const summary = processor.getProcessingSummary(...args);
        return {
          ...summary,
          cacheStatus: 'disabled',
          fallbackMode: true
        };
      },
      
      // 透传其他方法
      ...processor
    };
  }

  /**
   * 创建增强包装器
   */
  createEnhancedWrapper(processor) {
    return {
      processPage: async (enabledLanguages = []) => {
        return await this.processPageWithCache(processor, enabledLanguages);
      },
      
      removeAllHighlights: (...args) => {
        return processor.removeAllHighlights(...args);
      },
      
      getProcessingSummary: (...args) => {
        const summary = processor.getProcessingSummary(...args);
        return {
          ...summary,
          cacheStatus: this.getCacheStatus(),
          performanceMetrics: this.performanceMetrics
        };
      },
      
      // 新增缓存相关方法
      clearCache: async () => {
        if (this.cacheManager) {
          await this.cacheManager.clearLanguageCache(window.location.href);
        }
      },
      
      getCacheStats: () => {
        return this.performanceMetrics;
      },
      
      // 透传其他方法
      ...processor
    };
  }

  /**
   * 带缓存的页面处理
   */
  async processPageWithCache(processor, enabledLanguages) {
    const startTime = Date.now();
    
    try {
      // 如果缓存不可用，直接使用原始处理
      if (!this.cacheEnabled || this.fallbackMode) {
        this.performanceMetrics.fallbackCount++;
        return await processor.processPage();
      }
      
      const url = window.location.href;
      
      // 初始化多语言处理器
      const initResult = await this.multiLangProcessor.initializePage(url, enabledLanguages);
      
      // 根据缓存状态选择处理策略
      let result;
      switch (initResult.strategy.type) {
        case 'cached':
          // 完全使用缓存
          result = await this.multiLangProcessor.processPage(
            initResult.strategy,
            processor.textSegmenter,
            processor
          );
          this.performanceMetrics.cacheHits++;
          break;
          
        case 'incremental':
          // 增量处理
          result = await this.multiLangProcessor.processPage(
            initResult.strategy,
            processor.textSegmenter,
            processor
          );
          this.performanceMetrics.cacheHits++;
          break;
          
        case 'full':
        default:
          // 完整处理
          result = await this.multiLangProcessor.processPage(
            initResult.strategy,
            processor.textSegmenter,
            processor
          );
          this.performanceMetrics.cacheMisses++;
          break;
      }
      
      // 更新性能指标
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processingTime);
      
      return this.formatProcessingResult(result, initResult.strategy);
      
    } catch (error) {
      console.error('缓存处理失败，降级到标准处理:', error);
      this.performanceMetrics.errorCount++;
      this.performanceMetrics.fallbackCount++;
      
      // 降级到原始处理
      return await processor.processPage();
    }
  }

  /**
   * 格式化处理结果
   */
  formatProcessingResult(result, strategy) {
    const totalElements = (result.processedElements?.length || 0) + 
                         (result.cachedElements?.length || 0);
    
    return {
      processedElements: result.processedElements || [],
      cachedElements: result.cachedElements || [],
      totalElements,
      languageStats: result.languageStats || {},
      processingTime: result.processingTime || 0,
      strategy: strategy.type,
      cacheStatus: this.getCacheStatus()
    };
  }

  /**
   * 处理语言配置变化
   */
  async handleLanguageChange(newEnabledLanguages) {
    if (!this.cacheEnabled || !this.multiLangProcessor) {
      return { needsReprocessing: true };
    }
    
    try {
      const changeResult = await this.multiLangProcessor.handleLanguageConfigChange(
        newEnabledLanguages
      );
      
      return {
        needsReprocessing: changeResult.needsProcessing,
        newLanguages: changeResult.newLanguages,
        disabledLanguages: changeResult.disabledLanguages
      };
      
    } catch (error) {
      console.warn('处理语言变化失败:', error);
      return { needsReprocessing: true };
    }
  }

  /**
   * 插件启动时的缓存恢复
   */
  async restoreOnStartup(enabledLanguages) {
    if (!this.cacheEnabled || this.fallbackMode) {
      return null;
    }
    
    try {
      const url = window.location.href;
      const restoreResult = await this.cacheManager.restoreOnStartup(url, enabledLanguages);
      
      if (restoreResult) {
        this.performanceMetrics.cacheHits++;
        return {
          restored: true,
          availableHighlights: restoreResult.availableHighlights,
          needsProcessing: restoreResult.needsProcessing
        };
      }
      
      this.performanceMetrics.cacheMisses++;
      return null;
      
    } catch (error) {
      console.warn('启动恢复失败:', error);
      this.performanceMetrics.errorCount++;
      return null;
    }
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(processingTime) {
    const totalProcessing = this.performanceMetrics.cacheHits + 
                           this.performanceMetrics.cacheMisses + 
                           this.performanceMetrics.fallbackCount;
    
    if (totalProcessing > 0) {
      this.performanceMetrics.averageProcessingTime = 
        (this.performanceMetrics.averageProcessingTime * (totalProcessing - 1) + processingTime) / totalProcessing;
    }
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    if (this.initializationFailed) return 'failed';
    if (this.fallbackMode) return 'disabled';
    if (!this.cacheEnabled) return 'disabled';
    return 'enabled';
  }

  /**
   * 获取详细统计信息
   */
  getDetailedStats() {
    return {
      cacheStatus: this.getCacheStatus(),
      performanceMetrics: { ...this.performanceMetrics },
      systemInfo: {
        browserSupport: this.checkBrowserSupport(),
        initializationFailed: this.initializationFailed,
        fallbackMode: this.fallbackMode
      }
    };
  }

  /**
   * 清理和重置
   */
  async cleanup() {
    try {
      if (this.cacheManager && this.cacheManager.db) {
        this.cacheManager.db.close();
      }
    } catch (error) {
      console.warn('清理缓存系统失败:', error);
    }
    
    this.cacheManager = null;
    this.multiLangProcessor = null;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      issues: [],
      recommendations: []
    };
    
    // 检查缓存系统状态
    if (this.fallbackMode) {
      health.status = 'degraded';
      health.issues.push('缓存功能已降级');
      health.recommendations.push('检查浏览器兼容性和存储权限');
    }
    
    // 检查错误率
    const totalOperations = this.performanceMetrics.cacheHits + 
                           this.performanceMetrics.cacheMisses + 
                           this.performanceMetrics.fallbackCount;
    
    if (totalOperations > 0) {
      const errorRate = this.performanceMetrics.errorCount / totalOperations;
      if (errorRate > 0.1) {
        health.status = 'warning';
        health.issues.push(`错误率过高: ${(errorRate * 100).toFixed(1)}%`);
        health.recommendations.push('考虑清理缓存数据或重新初始化');
      }
    }
    
    return health;
  }
}

// 导出缓存集成管理器
window.CacheIntegrationManager = CacheIntegrationManager;