// 浏览器检测功能 - 改进版本
(function detectBrowser() {
  const userAgent = navigator.userAgent;
  let browserInfo = {
    name: '未知浏览器',
    version: '未知版本',
    engine: '未知引擎'
  };
  
  // 检测浏览器类型和版本
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserInfo.name = 'Chrome';
    browserInfo.engine = 'Blink';
    // 尝试从 User Agent 中提取真实版本
    const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (chromeMatch) {
      browserInfo.version = chromeMatch[1];
    }
  } else if (userAgent.includes('Firefox')) {
    browserInfo.name = 'Firefox';
    browserInfo.engine = 'Gecko';
    const firefoxMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (firefoxMatch) {
      browserInfo.version = firefoxMatch[1];
    }
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserInfo.name = 'Safari';
    browserInfo.engine = 'WebKit';
    const safariMatch = userAgent.match(/Version\/(\d+\.\d+)/);
    if (safariMatch) {
      browserInfo.version = safariMatch[1];
    }
  } else if (userAgent.includes('Edg')) {
    browserInfo.name = 'Microsoft Edge';
    browserInfo.engine = 'Blink';
    const edgeMatch = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
    if (edgeMatch) {
      browserInfo.version = edgeMatch[1];
    }
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browserInfo.name = 'Opera';
    browserInfo.engine = 'Blink';
    const operaMatch = userAgent.match(/(?:Opera|OPR)\/(\d+\.\d+)/);
    if (operaMatch) {
      browserInfo.version = operaMatch[1];
    }
  }
  
  // 获取更多浏览器信息
  const additionalInfo = {
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    vendor: navigator.vendor || '未知厂商'
  };
  
  // 输出详细信息
  console.log(`[ADHD插件] 浏览器检测结果:`);
  console.log(`  - 浏览器: ${browserInfo.name}`);
  console.log(`  - 版本: ${browserInfo.version}`);
  console.log(`  - 引擎: ${browserInfo.engine}`);
  console.log(`  - 平台: ${additionalInfo.platform}`);
  console.log(`  - 语言: ${additionalInfo.language}`);
  console.log(`  - 厂商: ${additionalInfo.vendor}`);
  console.log(`[ADHD插件] 完整 User Agent: ${userAgent}`);
  
  // 检测是否可能是伪造的 User Agent
  if (browserInfo.name === 'Chrome' && browserInfo.version.startsWith('141.')) {
    console.warn(`[ADHD插件] 警告: 检测到可能不准确的Chrome版本号 ${browserInfo.version}`);
    console.log(`[ADHD插件] 这可能是由于浏览器隐私设置或User Agent伪造导致的`);
  }
})();

;(function(){
  if (typeof window === 'undefined') return;
  if (typeof window.__BUILD_TEST__ === 'undefined') window.__BUILD_TEST__ = false;
  window.__LOG_DEV_MODE = !!window.__BUILD_TEST__;
  try { chrome.storage.local.set({ logfordevmode: window.__LOG_DEV_MODE }); } catch (_) {}
  try {
    chrome.storage.onChanged.addListener(function(changes, area){
      if (area === 'local' && changes.logfordevmode) {
        window.__LOG_DEV_MODE = !!changes.logfordevmode.newValue;
      }
    });
  } catch (e) {}
})();

// 主控制器模块
class ADHDHighlighter {
  constructor() {
    this.enabled = false;
    this.isInitialized = false;
    
    // 颜色方案
    this.colorSchemes = {
      default: { noun: '#0066cc', verb: '#cc0000', adj: '#009933' },
      warm: { noun: '#8b4513', verb: '#dc143c', adj: '#ff8c00' },
      cool: { noun: '#191970', verb: '#008b8b', adj: '#4169E1' },
      pastel: { noun: '#da70d6', verb: '#20b2aa', adj: '#f0e68c' },
      'high-contrast': { noun: '#000080', verb: '#8b0000', adj: '#228b22' }
    };
    
    // 文本样式设置
    this.textSettings = {
      fontSize: 115,  // 默认字号增大15%
      letterSpacing: 0,
      lineHeight: 1.5,
      paragraphSpacing: 0
    };
    
    // 初始化各个模块
    this.dictionaryManager = new DictionaryAdapter();
    this.languageDetector = new LanguageDetector();
    this.textSegmenter = new TextSegmenter();
    
    // 页面处理器 - 支持传统和流式处理
    this.pageProcessor = new PageProcessor(
      this.dictionaryManager,
      this.languageDetector,
      this.textSegmenter
    );
    
    // 流式页面处理器 - 第一阶段优化
    this.streamingPageProcessor = new StreamingPageProcessor(
      this.dictionaryManager,
      this.languageDetector,
      this.textSegmenter
    );
    
    // 初始化事件监听式缓存系统
    this.eventCacheManager = null;
    this.initEventCacheSystem();
    
    // 初始化ADHD专注飞行计数器系统
    this.adhdGoFlyCounter = null;
    this.initADHDGoFlyCounter();
    
    // 初始化评价计时器系统
    this.reviewTimer = null;
    this.initReviewTimer();
    
    // 初始化ADHDGoFly计时器系统
    this.adhdGoFlyTimer = null;
    this.initADHDGoFlyTimer();
    
    // 初始化评价计数器系统
    this.reviewCounter = null;
    this.initReviewCounter();
    
    // 初始化评价灯塔系统
    this.reviewLightTower = null;
    this.initReviewLightTower();
    
    // 延迟输出系统状态摘要（等待异步初始化完成）
    setTimeout(() => this.logSystemStatus(), 100);
    
    // 处理模式配置
    this.processingMode = 'streaming'; // 'traditional' | 'streaming'
    
    // 颜色方案切换标志位
    this.isColorSchemeChanging = false;
    
    // 启动时扫描dictionaries文件夹
    this.scanDictionariesOnStartup();
    
    // 初始化
    this.init();
  }

  /**
   * 初始化事件监听式缓存系统
   */
  async initEventCacheSystem() {
    try {
      // 创建事件缓存管理器
      this.eventCacheManager = new EventCacheManager();
      
      // 监听高亮完成事件
      this.setupHighlightEventListeners();
      
      console.log('✅ 事件缓存系统初始化完成');
    } catch (error) {
      console.warn('⚠️ 事件缓存系统初始化失败:', error);
    }
  }

  /**
   * 初始化ADHD专注飞行计数器系统
   */
  async initADHDGoFlyCounter() {
    try {
      if (typeof ADHDGoFlyCounter !== 'undefined') {
        this.adhdGoFlyCounter = new ADHDGoFlyCounter();
        console.log('✅ ADHDGoFlyCounter计数器系统初始化成功');
        
        // 页面加载时增加页面计数
        await this.adhdGoFlyCounter.incrementPageCount();
      } else {
        console.warn('⚠️ ADHDGoFlyCounter 未加载，跳过ADHD专注飞行计数器初始化');
      }
    } catch (error) {
      console.error('❌ ADHDGoFlyCounter 系统初始化失败:', error);
    }
  }

  /**
   * 初始化评价计时器系统
   */
  async initReviewTimer() {
    try {
      if (typeof ReviewTimer !== 'undefined') {
        this.reviewTimer = new ReviewTimer();
        await this.reviewTimer.init();
        // ReviewTimer内部已有详细日志，此处仅记录系统级状态
      } else {
        console.warn('⚠️ ReviewTimer 未加载，跳过评价计时器初始化');
      }
    } catch (error) {
      console.error('❌ ReviewTimer系统初始化失败:', error);
    }
  }

  /**
   * 初始化ADHDGoFly计时器系统
   */
  async initADHDGoFlyTimer() {
    try {
      if (typeof ADHDGoFlyTimer !== 'undefined') {
        this.adhdGoFlyTimer = new ADHDGoFlyTimer();
        await this.adhdGoFlyTimer.init();
        // ADHDGoFlyTimer内部已有详细日志，此处仅记录系统级状态
      } else {
        console.warn('⚠️ ADHDGoFlyTimer 未加载，跳过ADHDGoFlyTimer初始化');
      }
    } catch (error) {
      console.error('❌ ADHDGoFlyTimer系统初始化失败:', error);
    }
  }

  /**
   * 初始化评价计数器系统
   * @private
   */
  async initReviewCounter() {
    try {
      if (typeof ReviewCounter !== 'undefined') {
        this.reviewCounter = new ReviewCounter();
        await this.reviewCounter.init();
      } else {
        console.warn('ReviewCounter类未加载');
      }
    } catch (error) {
      console.error('初始化评价计数器失败:', error);
    }
  }

  /**
   * 初始化评价灯塔系统
   * @private
   */
  async initReviewLightTower() {
    try {
      if (typeof ReviewLightTower !== 'undefined') {
        this.reviewLightTower = new ReviewLightTower();
        console.log('ReviewLightTower 已在内容脚本中初始化');
      } else {
        console.warn('ReviewLightTower类未加载');
      }
    } catch (error) {
      console.error('初始化评价灯塔失败:', error);
    }
  }

  /**
   * 输出系统状态摘要
   */
  logSystemStatus() {
    const systems = [
      { name: 'EventCache', instance: this.eventCacheManager, emoji: '📋' },
      { name: 'ADHDGoFlyCounter', instance: this.adhdGoFlyCounter, emoji: '⏰' },
      { name: 'ReviewTimer', instance: this.reviewTimer, emoji: '📅' },
      { name: 'ADHDGoFlyTimer', instance: this.adhdGoFlyTimer, emoji: '⏱️' },
      { name: 'ReviewCounter', instance: this.reviewCounter, emoji: '📊' },
      { name: 'ReviewLightTower', instance: this.reviewLightTower, emoji: '🗼' }
    ];
    
    const activeCount = systems.filter(sys => sys.instance !== null).length;
    const totalCount = systems.length;
    
    console.log(`🚀 ADHDHighlighter系统启动完成 - ${activeCount}/${totalCount}个子系统已激活`);
    
    // 仅在调试模式下显示详细状态
    if (window.location.search.includes('debug=true')) {
      systems.forEach(sys => {
        const status = sys.instance ? '✅' : '⚠️';
        console.log(`  ${sys.emoji} ${sys.name}: ${status}`);
      });
    }
  }

  /**
   * 设置高亮完成事件监听器
   */
  setupHighlightEventListeners() {
    // 监听流式处理器的高亮完成事件
    if (this.streamingPageProcessor) {
      this.streamingPageProcessor.addEventListener('highlightComplete', (event) => {
        this.handleHighlightComplete(event.detail);
      });
    }
    
    // 监听传统处理器的高亮完成事件
    if (this.pageProcessor) {
      this.pageProcessor.addEventListener('highlightComplete', (event) => {
        this.handleHighlightComplete(event.detail);
      });
    }
  }

  /**
   * 检查并应用缓存
   * @returns {Promise<boolean>} 是否成功应用了缓存
   */
  async checkAndApplyCache() {
    if (!this.eventCacheManager) {
      console.log('📝 缓存管理器未初始化，跳过缓存检查');
      return false;
    }

    // 在颜色方案切换期间跳过缓存应用，避免DOM结构被破坏
    if (this.isColorSchemeChanging) {
      console.log('🎨 正在切换颜色方案，跳过缓存应用以避免DOM结构问题');
      return false;
    }

    try {
      const currentUrl = window.location.href;
      const enabledLanguages = this.dictionaryManager.getEnabledLanguages();
      
      if (!enabledLanguages.length) {
        console.log('📝 没有启用的语言，跳过缓存检查');
        return false;
      }

      // 检测页面主要语言
      const pageText = document.body.textContent.substring(0, 1000); // 取前1000字符检测语言
      const detectedLanguage = this.languageDetector.detectLanguage(pageText);
      const targetLanguage = enabledLanguages.includes(detectedLanguage) ? detectedLanguage : enabledLanguages[0];

      console.log('🔍 检查缓存:', {
        url: currentUrl,
        language: targetLanguage,
        enabledLanguages: enabledLanguages
      });

      // 查询所有匹配的缓存记录
      const cachedRecords = await this.eventCacheManager.getAllCachedHighlights(currentUrl, targetLanguage);
      
      if (!cachedRecords || cachedRecords.length === 0) {
        console.log('📝 未找到匹配的缓存数据');
        return false;
      }

      console.log(`🎯 找到 ${cachedRecords.length} 条缓存记录，尝试应用...`);
      
      // 应用所有缓存的高亮结果
      let totalApplied = 0;
      for (const cachedData of cachedRecords) {
        const applied = await this.eventCacheManager.applyCachedHighlights(cachedData);
        if (applied) totalApplied++;
      }
      
      const applied = totalApplied > 0;
      
      if (applied) {
        console.log('✅ 缓存应用成功');
        
        // 记录缓存命中统计（可选）
        this.recordCacheHit(currentUrl, targetLanguage);
        
        return true;
      } else {
        console.log('❌ 缓存应用失败，将执行正常高亮');
        return false;
      }

    } catch (error) {
      console.error('❌ 缓存检查和应用失败:', error);
      return false;
    }
  }

  /**
   * 记录缓存命中统计
   */
  recordCacheHit(url, language) {
    // 这里可以记录缓存命中的统计信息
    // 为后续的缓存分析功能做准备
    console.log('📊 缓存命中记录:', { url, language, timestamp: Date.now() });
  }

  /**
   * 处理高亮完成事件
   */
  async handleHighlightComplete(eventData) {
    try {
      if (window.__LOG_DEV_MODE) console.log('🎯 收到高亮完成事件:', eventData);
      
      // 异步存储高亮数据
      await this.eventCacheManager.storeHighlightData(eventData);
      
      // 更新ADHD专注飞行计数器
      await this.updateADHDGoFlyCounter(eventData);
      
      // 更新评价计数器
      await this.updateReviewCounter(eventData);
      
      if (window.__LOG_DEV_MODE) console.log('💾 高亮数据已缓存');
    } catch (error) {
      console.warn('⚠️ 缓存高亮数据失败:', error);
    }
  }

  /**
   * 更新ADHD专注飞行计数器
   */
  async updateADHDGoFlyCounter(eventData) {
    try {
      if (!this.adhdGoFlyCounter) {
        console.warn('⚠️ ADHD专注飞行计数器未初始化，跳过计数');
        return;
      }

      // 验证数据有效性
      if (!eventData || !eventData.elements || eventData.elements.length === 0) {
        console.warn('⚠️ 高亮数据无效，跳过计数');
        return;
      }

      // 增加节点计数（按处理的元素数量计数）
      const nodeCount = eventData.elements.length;
      const newCount = await this.adhdGoFlyCounter.incrementNodeCount(nodeCount);
      
      if (window.__LOG_DEV_MODE) console.log(`📊 节点计数已更新: +${nodeCount} → 总计 ${newCount}`);

    } catch (error) {
      console.error('❌ 更新ADHD专注飞行计数器失败:', error);
      // 计数器失败不应影响主流程
    }
  }

  /**
   * 更新评价计数器
   */
  async updateReviewCounter(eventData) {
    try {
      if (!this.reviewCounter) {
        console.warn('⚠️ 评价计数器未初始化，跳过计数');
        return;
      }

      // 验证数据有效性
      if (!eventData || !eventData.elements || eventData.elements.length === 0) {
        console.warn('⚠️ 高亮数据无效，跳过计数');
        return;
      }

      // 增加节点计数（按处理的元素数量计数）
      const nodeCount = eventData.elements.length;
      const newCount = await this.reviewCounter.incrementNodeCount(nodeCount);
      
      if (window.__LOG_DEV_MODE) console.log(`ReviewCounter计数：节点计数已更新: +${nodeCount} → 总计 ${newCount}`);

      // 增加页面计数（去重逻辑）
      await this.reviewCounter.incrementPageCount();

      // 检查ReviewLightTower显示条件
      if (this.reviewLightTower) {
        try {
          await this.reviewLightTower.show();
        } catch (error) {
          console.error('ReviewLightTower显示失败:', error);
        }
      }

    } catch (error) {
      console.error('ReviewCounter计数：更新评价计数器失败:', error);
      // 计数器失败不应影响主流程
    }
  }

  /**
   * 显示评价提醒
   */
  async showRatingReminder(ratingData) {
    try {
      // 标记提醒已显示
      await this.adhdGoFlyCounter.markRatingReminderShown(ratingData.reminderKey);
      
      // 这里可以添加实际的评价提醒UI逻辑
      console.log(`🌟 评价提醒: 您已使用插件 ${ratingData.days} 天，处理了 ${ratingData.nodes} 个节点！`);
      
      // TODO: 实现实际的评价提醒弹窗或通知
      
    } catch (error) {
      console.error('❌ 显示评价提醒失败:', error);
    }
  }

  /**
   * 启动时扫描dictionaries文件夹中的所有json文件
   */
  async scanDictionariesOnStartup() {
    try {
      console.log('🚀 插件启动，开始扫描dictionaries文件夹...');
      
      // 使用新的文件清单扫描器
      if (typeof fileListScanner !== 'undefined') {
        const jsonFiles = await fileListScanner.getAllJsonFiles();
        console.log('📋 Dictionaries文件夹中的所有json文件:');
        jsonFiles.forEach(file => {
          console.log(`  📄 ${file}`);
        });
        fileListScanner.generateReport();
      } else {
        console.warn('⚠️ 文件清单扫描器未加载');
      }
    } catch (error) {
      console.error('❌ 启动扫描失败:', error);
    }
  }

  /**
   * 初始化高亮器
   */
  async init() {
    console.log('初始化ADHD文本高亮器...');
    
    try {
      // 设置消息监听器
      this.setupMessageListener();
      
      // 初始化词典
      await this.dictionaryManager.initialize();
      
      // 加载词典设置
      await this.loadDictSettings();
      
      // 加载颜色设置
      await this.loadColorSettings();
      
      // 加载文本设置
      await this.loadTextSettings();
      
      // 标记为已初始化
      this.isInitialized = true;
      
      // 检查存储的状态（在初始化完成后）
      await this.loadStoredState();
      
      console.log('ADHD文本高亮器初始化完成');
      
    } catch (error) {
      console.error('初始化失败:', error);
      this.isInitialized = false;
    }
  }

  /**
   * 设置消息监听器
   * @private
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('收到消息:', message);
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  }

  /**
   * 处理来自popup的消息
   * @param {Object} message 消息对象
   * @param {Object} sender 发送者信息
   * @param {Function} sendResponse 响应函数
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      console.log('📨 收到消息:', message.action, message);
      switch (message.action) {
        case 'toggle':
          const newState = await this.toggle();
          sendResponse({ 
            success: true, 
            enabled: newState,
            stats: this.pageProcessor.getStats()
          });
          break;
          
        case 'enable':
          await this.enable();
          sendResponse({ 
            success: true, 
            enabled: true,
            stats: this.pageProcessor.getStats()
          });
          break;
          
        case 'disable':
          await this.disable();
          sendResponse({ 
            success: true, 
            enabled: false,
            stats: this.pageProcessor.getStats()
          });
          break;
          
        case 'getStatus':
          const status = await this.getStatus();
          sendResponse(status);
          break;
          
        case 'getStats':
          const stats = this.getDetailedStats();
          sendResponse({ success: true, stats });
          break;
          
        case 'updateSettings':
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'updateDictSettings':
          await this.updateDictSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'updateColorScheme':
          await this.updateColorScheme(message.scheme, message.colors, message.highlightingToggles);
          sendResponse({ success: true });
          break;
          
        case 'updateTextSettings':
          await this.updateTextSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'getAnalysisData':
          const analysisData = await this.getAnalysisData();
          sendResponse({ success: true, data: analysisData });
          break;
          
        case 'getSelectedText':
          const selectedText = this.getSelectedText();
          sendResponse({ success: true, text: selectedText });
          break;
        case 'showAiSettingPanel':
          this.ensureAiSettingPanel();
          this.showAiSettingPanel();
          sendResponse({ success: true });
          break;
        case 'hideAiSettingPanel':
          this.hideAiSettingPanel();
          sendResponse({ success: true });
          break;
        case 'minimizeAiSettingPanel':
          this.minimizeAiSettingPanel();
          sendResponse({ success: true });
          break;
        case 'restoreAiSettingPanel':
          this.restoreAiSettingPanel();
          sendResponse({ success: true });
          break;
          
        case 'testDictionaryLoading':
          const testResult = await this.testDictionaryLoading();
          sendResponse(testResult);
          break;
          
        case 'testWordHighlight':
          const highlightResult = await this.testWordHighlight(message.word);
          sendResponse(highlightResult);
          break;
          
        case 'getCacheStats':
          try {
            if (this.eventCacheManager) {
              const cacheStats = await this.eventCacheManager.getCacheStats();
              sendResponse({ success: true, stats: cacheStats });
            } else {
              sendResponse({ 
                success: false, 
                error: '缓存管理器未初始化',
                stats: { enabled: false, totalRecords: 0, totalSize: 0 }
              });
            }
          } catch (error) {
            console.error('获取缓存统计失败:', error);
            sendResponse({ 
              success: false, 
              error: error.message,
              stats: { enabled: false, totalRecords: 0, totalSize: 0 }
            });
          }
          break;
          
        // cleanupExpiredCache case 已删除
        // 原因：系统在读取缓存时会自动检查并删除过期数据
          
        case 'clearAllCache':
          try {
            if (this.eventCacheManager) {
              await this.eventCacheManager.clearAllCache();
              sendResponse({ success: true });
            } else {
              sendResponse({ 
                success: false, 
                error: '缓存管理器未初始化'
              });
            }
          } catch (error) {
            console.error('清除所有缓存失败:', error);
            sendResponse({ 
              success: false, 
              error: error.message
            });
          }
          break;
          
        case 'storageSettingsChanged':
          try {
            if (this.eventCacheManager) {
              await this.eventCacheManager.updateCacheSettings(message.data);
              console.log('✅ 缓存设置已更新:', message.data);
              sendResponse({ success: true });
            } else {
              sendResponse({ 
                success: false, 
                error: '缓存管理器未初始化'
              });
            }
          } catch (error) {
            console.error('更新缓存设置失败:', error);
            sendResponse({ 
              success: false, 
              error: error.message
            });
          }
          break;
          
        default:
          sendResponse({ 
            success: false, 
            error: `未知操作: ${message.action}` 
          });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  /**
   * 加载存储的状态
   * @private
   */
  async loadStoredState() {
    try {
      const result = await chrome.storage.local.get(['enabled']);
      if (result.enabled) {
        await this.enable();
      }
    } catch (error) {
      console.error('加载存储状态失败:', error);
    }
  }

  /**
   * 加载词典设置
   * @private
   */
  async loadDictSettings() {
    try {
      const result = await chrome.storage.local.get(['dictSettings']);
      if (result.dictSettings) {
        console.log('加载词典设置:', result.dictSettings);
        
        // 特别检查111词典的设置
        const dict111Id = 'custom-1760195631107';
        const newDict111Id = 'custom-1760202653658';
        
        if (result.dictSettings[dict111Id] !== undefined) {
          console.log(`🔍 Found 111 dictionary in settings: ${dict111Id} = ${result.dictSettings[dict111Id]}`);
        } else if (result.dictSettings[newDict111Id] !== undefined) {
          console.log(`🔍 Found 111 dictionary with new ID in settings: ${newDict111Id} = ${result.dictSettings[newDict111Id]}`);
        } else {
          console.log(`❌ 111 dictionary not found in settings. Available keys:`, Object.keys(result.dictSettings));
          
          // 检查是否有任何custom-开头的词典ID
          const customDictIds = Object.keys(result.dictSettings).filter(key => key.startsWith('custom-'));
          if (customDictIds.length > 0) {
            console.log(`🔍 Found custom dictionary IDs in settings:`, customDictIds);
          }
        }
        
        // 检查是否为新格式（包含词典ID）
        const hasNewFormat = Object.keys(result.dictSettings).some(key => key.includes('-'));
        
        if (hasNewFormat) {
          // 新格式：使用词典ID
          this.dictionaryManager.updateEnabledDictionaries(result.dictSettings);
        } else {
          // 旧格式：使用语言代码
          this.dictionaryManager.updateEnabledLanguages(result.dictSettings);
        }
      } else {
        // 首次使用时的默认设置，启用基础中英文词典
        const defaultSettings = { 'zh-preset': true, 'en-preset': true };
        console.log('使用默认词典设置:', defaultSettings);
        this.dictionaryManager.updateEnabledDictionaries(defaultSettings);
        // 保存默认设置
        await chrome.storage.local.set({ dictSettings: defaultSettings });
      }
    } catch (error) {
      console.error('加载词典设置失败:', error);
      // 出错时也使用默认设置
      const defaultSettings = { 'zh-preset': true, 'en-preset': true };
      this.dictionaryManager.updateEnabledDictionaries(defaultSettings);
    }
  }

  /**
   * 加载颜色设置
   * @private
   */
  async loadColorSettings() {
    try {
      const result = await chrome.storage.local.get(['colorScheme', 'highlightingToggles']);
      if (result.colorScheme) {
        console.log('加载颜色设置:', result.colorScheme);
        this.currentColorScheme = result.colorScheme;
        this.applyColorScheme();
      }
      
      // 加载高亮开关设置
      if (result.highlightingToggles) {
        // 更新TextSegmenter的高亮开关设置
        if (this.textSegmenter) {
          this.textSegmenter.updateHighlightingToggles(result.highlightingToggles);
        }
        
        // 兼容旧的quickHighlighter（如果存在）
        if (this.pageProcessor && this.pageProcessor.quickHighlighter) {
          this.pageProcessor.quickHighlighter.highlightingToggles = result.highlightingToggles;
        }
      }
    } catch (error) {
      console.error('加载颜色设置失败:', error);
    }
  }

  /**
   * 更新颜色方案
   * @param {string} scheme 方案名称
   * @param {Object} colors 颜色配置
   * @param {Object} highlightingToggles 高亮开关设置
   */
  async updateColorScheme(scheme, colors, highlightingToggles) {
    // 设置颜色方案切换标志位
    this.isColorSchemeChanging = true;
    
    this.currentColorScheme = scheme;
    this.colorSchemes[scheme] = colors;
    
    // 更新高亮开关设置
    if (highlightingToggles) {
      this.highlightingToggles = highlightingToggles;
      
      // 更新TextSegmenter的高亮开关设置
      if (this.textSegmenter) {
        this.textSegmenter.updateHighlightingToggles(highlightingToggles);
      }
      
      // 兼容旧的quickHighlighter（如果存在）
      if (this.pageProcessor && this.pageProcessor.quickHighlighter) {
        this.pageProcessor.quickHighlighter.highlightingToggles = highlightingToggles;
      }
    }
    
    // 更新流式处理器的渲染上下文
    if (this.streamingPageProcessor) {
      const renderingOptions = {
        colorScheme: scheme,
        highlightingToggles: highlightingToggles || {}
      };
      this.streamingPageProcessor.updateOptions(renderingOptions);
    }
    
    // 应用新的颜色方案
    this.applyColorScheme();
    
    // 如果当前已启用高亮，重新处理页面
    if (this.enabled) {
      console.log('重新处理页面以应用新颜色方案...');
      await this.disable();
      await this.enable();
    }
    
    // 清除颜色方案切换标志位
    this.isColorSchemeChanging = false;
    console.log('🎨 颜色方案切换完成');
  }

  /**
   * 应用颜色方案到CSS
   */
  applyColorScheme() {
    const colors = this.colorSchemes[this.currentColorScheme];
    if (!colors) return;
    
    // 移除旧的样式
    const oldStyle = document.getElementById('adhd-color-scheme');
    if (oldStyle) {
      oldStyle.remove();
    }
    
    // 创建新的样式
    const style = document.createElement('style');
    style.id = 'adhd-color-scheme';
    style.textContent = `
      .adhd-n {
        color: ${colors.noun} !important;
        background-color: ${this.hexToRgba(colors.noun, 0.1)} !important;
      }
      .adhd-n:hover {
        background-color: ${this.hexToRgba(colors.noun, 0.2)} !important;
      }
      .adhd-v {
        color: ${colors.verb} !important;
        background-color: ${this.hexToRgba(colors.verb, 0.1)} !important;
      }
      .adhd-v:hover {
        background-color: ${this.hexToRgba(colors.verb, 0.2)} !important;
      }
      .adhd-a {
        color: ${colors.adj} !important;
        background-color: ${this.hexToRgba(colors.adj, 0.1)} !important;
      }
      .adhd-a:hover {
        background-color: ${this.hexToRgba(colors.adj, 0.2)} !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('颜色方案已应用:', this.currentColorScheme);
  }

  /**
   * 将十六进制颜色转换为RGBA
   * @param {string} hex 十六进制颜色
   * @param {number} alpha 透明度
   * @returns {string} RGBA颜色字符串
   */
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * 加载文本设置
   * @private
   */
  async loadTextSettings() {
    try {
      const result = await chrome.storage.local.get(['textSettings']);
      if (result.textSettings) {
        console.log('加载文本设置:', result.textSettings);
        this.textSettings = { ...this.textSettings, ...result.textSettings };
        this.applyTextSettings();
      }
    } catch (error) {
      console.error('加载文本设置失败:', error);
    }
  }

  /**
   * 更新文本设置
   * @param {Object} settings 文本设置
   */
  async updateTextSettings(settings) {
    console.log('更新文本设置:', settings);
    
    this.textSettings = { ...this.textSettings, ...settings };
    
    // 应用新的文本设置
    this.applyTextSettings();
  }

  /**
   * 应用文本设置到页面 - 只影响高亮词汇
   */
  applyTextSettings() {
    // 移除旧的文本样式
    const oldStyle = document.getElementById('adhd-text-settings');
    if (oldStyle) {
      oldStyle.remove();
    }
    
    // 创建新的文本样式
    const style = document.createElement('style');
    style.id = 'adhd-text-settings';
    
    const { fontSize, letterSpacing, lineHeight, paragraphSpacing } = this.textSettings;
    
    // 将百分比转换为倍数
    const fontSizeMultiplier = fontSize / 100;
    
    style.textContent = `
      /* ADHD文本样式设置 - 只应用到名词、动词、形容词 */
      .adhd-n, .adhd-v, .adhd-a {
        font-size: ${fontSizeMultiplier}em !important;
        letter-spacing: ${letterSpacing}px !important;
        line-height: ${lineHeight} !important;
        display: inline !important;
      }
      
      /* 确保span元素也应用样式 */
      .adhd-processed span.adhd-n,
      .adhd-processed span.adhd-v,
      .adhd-processed span.adhd-a {
        font-size: ${fontSizeMultiplier}em !important;
        letter-spacing: ${letterSpacing}px !important;
        line-height: ${lineHeight} !important;
      }
      
      /* 高亮词汇容器样式 */
      .adhd-processed {
        display: inline !important;
      }
      
      /* 段落间距 - 使用更兼容的选择器 */
      ${paragraphSpacing > 0 ? `
      .adhd-processed {
        margin-bottom: ${paragraphSpacing}px !important;
      }` : ''}
    `;
    
    document.head.appendChild(style);
    console.log('文本设置已应用到高亮词汇:', this.textSettings);
    console.log('字号倍数:', fontSizeMultiplier + 'em');
  }

  /**
   * 切换高亮状态
   * @returns {Promise<boolean>} 新的状态
   */
  async toggle() {
    if (this.enabled) {
      await this.disable();
      return false;
    } else {
      await this.enable();
      return true;
    }
  }

  /**
   * 启用高亮
   */
  async enable() {
    if (!this.isInitialized) {
      throw new Error('高亮器未初始化');
    }
    
    if (this.enabled) {
      console.log('高亮已经启用');
      return;
    }
    
    console.log('启用文本高亮...');
    
    // Edge浏览器调试信息
    const isEdge = navigator.userAgent.includes('Edg');
    if (isEdge) {
      console.log('[Edge调试] 检测到Edge浏览器，开始详细日志记录');
      console.log('[Edge调试] 当前页面URL:', window.location.href);
      console.log('[Edge调试] 处理模式:', this.processingMode);
      console.log('[Edge调试] 启用的语言:', this.dictionaryManager.getEnabledLanguages());
      console.log('[Edge调试] 语言状态详情:', this.dictionaryManager.enabledLanguages);
      console.log('[Edge调试] zh语言是否启用:', this.dictionaryManager.isLanguageEnabled('zh'));
    }
    
    try {
      // 第一步：检查缓存
      const cacheApplied = await this.checkAndApplyCache();
      
      if (cacheApplied) {
        console.log('✅ 缓存应用成功，但仍需启动流式处理器监听新内容');
        if (isEdge) console.log('[Edge调试] 使用缓存，但启动流式处理器监听新内容');
        
        // 即使缓存应用成功，也要启动流式处理器来处理新出现的内容
        if (this.processingMode === 'streaming') {
          console.log('启动流式处理器监听新内容...');
          if (isEdge) console.log('[Edge调试] 启动流式处理器监听新内容...');
          
          // 启动流式处理器，但跳过已缓存的内容
          await this.streamingPageProcessor.processPage();
          if (isEdge) console.log('[Edge调试] 流式处理器已启动');
        }
      } else {
        console.log('📝 缓存未命中，执行正常高亮流程');
        
        // 根据处理模式选择处理器
        if (this.processingMode === 'streaming') {
          console.log('使用流式处理模式');
          if (isEdge) console.log('[Edge调试] 开始流式处理...');
          await this.streamingPageProcessor.processPage();
          if (isEdge) console.log('[Edge调试] 流式处理完成');
        } else {
          console.log('使用传统处理模式');
          if (isEdge) console.log('[Edge调试] 开始传统处理...');
          await this.pageProcessor.processPage();
          if (isEdge) console.log('[Edge调试] 传统处理完成');
        }
      }
      
      // 应用颜色方案和文本设置
      if (isEdge) console.log('[Edge调试] 应用颜色方案...');
      this.applyColorScheme();
      if (isEdge) console.log('[Edge调试] 应用文本设置...');
      this.applyTextSettings();
      
      this.enabled = true;
      
      // 保存状态
      await chrome.storage.local.set({ enabled: true });
      
      if (isEdge) {
        console.log('[Edge调试] 高亮启用完成，检查DOM中的高亮元素...');
        const highlightElements = document.querySelectorAll('.adhd-n, .adhd-v, .adhd-a, .adhd-adv');
        console.log('[Edge调试] 找到高亮元素数量:', highlightElements.length);
        
        // 延迟检查高亮元素是否仍然存在
        setTimeout(() => {
          const elementsAfterDelay = document.querySelectorAll('.adhd-n, .adhd-v, .adhd-a, .adhd-adv');
          console.log('[Edge调试] 1秒后高亮元素数量:', elementsAfterDelay.length);
          if (elementsAfterDelay.length !== highlightElements.length) {
            console.warn('[Edge调试] 警告：高亮元素数量发生变化！可能存在异步清理问题');
          }
        }, 1000);
        
        // 再次延迟检查
        setTimeout(() => {
          const elementsAfterLongerDelay = document.querySelectorAll('.adhd-n, .adhd-v, .adhd-a, .adhd-adv');
          console.log('[Edge调试] 3秒后高亮元素数量:', elementsAfterLongerDelay.length);
          if (elementsAfterLongerDelay.length === 0 && highlightElements.length > 0) {
            console.error('[Edge调试] 错误：高亮元素完全消失！这是导致问题的关键时刻');
          }
        }, 3000);
      }
      
      console.log('文本高亮已启用');
      
    } catch (error) {
      console.error('启用高亮失败:', error);
      if (isEdge) console.error('[Edge调试] 启用过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 禁用高亮
   */
  async disable() {
    if (!this.enabled) {
      console.log('高亮已经禁用');
      return;
    }
    
    console.log('禁用文本高亮...');
    
    // Edge浏览器调试信息
    const isEdge = navigator.userAgent.includes('Edg');
    if (isEdge) {
      console.log('[Edge调试] 开始禁用高亮...');
      const highlightElementsBefore = document.querySelectorAll('.adhd-n, .adhd-v, .adhd-a, .adhd-adv');
      console.log('[Edge调试] 禁用前高亮元素数量:', highlightElementsBefore.length);
    }
    
    try {
      // 根据处理模式选择处理器进行清理
      if (this.processingMode === 'streaming') {
        if (isEdge) console.log('[Edge调试] 使用流式处理器清理高亮...');
        this.streamingPageProcessor.removeAllHighlights();
      } else {
        if (isEdge) console.log('[Edge调试] 使用传统处理器清理高亮...');
        this.pageProcessor.removeAllHighlights();
      }
      
      this.enabled = false;
      
      // 保存状态
      await chrome.storage.local.set({ enabled: false });
      
      if (isEdge) {
        const highlightElementsAfter = document.querySelectorAll('.adhd-n, .adhd-v, .adhd-a, .adhd-adv');
        console.log('[Edge调试] 禁用后高亮元素数量:', highlightElementsAfter.length);
      }
      
      console.log('文本高亮已禁用');
      
    } catch (error) {
      console.error('禁用高亮失败:', error);
      if (isEdge) console.error('[Edge调试] 禁用过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 获取当前状态
   * @returns {Promise<Object>} 状态信息
   */
  async getStatus() {
    const dictionaryStats = this.dictionaryManager.getStatistics();
    
    // 根据处理模式获取统计信息
    let processingStats, processingSummary;
    if (this.processingMode === 'streaming') {
      processingStats = this.streamingPageProcessor.getStats();
      processingSummary = this.streamingPageProcessor.getProcessingSummary();
    } else {
      processingStats = this.pageProcessor.getStats();
      processingSummary = this.pageProcessor.getProcessingSummary();
    }
    
    return {
      success: true,
      enabled: this.enabled,
      isInitialized: this.isInitialized,
      dictionariesLoaded: this.dictionaryManager.isReady(),
      processingMode: this.processingMode,
      statistics: {
        ...dictionaryStats,
        ...processingStats,
        ...processingSummary
      }
    };
  }

  /**
   * 获取详细统计信息
   * @returns {Object} 详细统计
   */
  getDetailedStats() {
    // 根据处理模式获取统计信息
    let processingStats, processingSummary;
    if (this.processingMode === 'streaming') {
      processingStats = this.streamingPageProcessor.getStats();
      processingSummary = this.streamingPageProcessor.getProcessingSummary();
    } else {
      processingStats = this.pageProcessor.getStats();
      processingSummary = this.pageProcessor.getProcessingSummary();
    }
    
    return {
      dictionary: this.dictionaryManager.getStatistics(),
      processing: processingStats,
      summary: processingSummary,
      system: {
        enabled: this.enabled,
        initialized: this.isInitialized,
        dictionariesReady: this.dictionaryManager.isReady(),
        processingMode: this.processingMode
      }
    };
  }

  /**
   * 更新设置
   * @param {Object} settings 新设置
   */
  async updateSettings(settings) {
    // 更新处理模式
    if (settings.processingMode && ['traditional', 'streaming'].includes(settings.processingMode)) {
      this.processingMode = settings.processingMode;
      console.log('处理模式已更新为:', this.processingMode);
    }
    
    // 准备传递给处理器的选项
    const processorOptions = { ...settings.processing };
    
    // 添加颜色方案和高亮开关设置
    if (this.currentColorScheme) {
      processorOptions.colorScheme = this.currentColorScheme;
    }
    
    if (this.highlightingToggles) {
      processorOptions.highlightingToggles = { ...this.highlightingToggles };
    }
    
    // 更新页面处理器选项
    if (settings.processing || processorOptions.colorScheme || processorOptions.highlightingToggles) {
      if (this.processingMode === 'streaming') {
        this.streamingPageProcessor.updateOptions(processorOptions);
      } else {
        this.pageProcessor.updateOptions(processorOptions);
      }
    }
    
    // 如果当前已启用，重新处理页面以应用新设置
    if (this.enabled && settings.reprocessPage) {
      await this.disable();
      await this.enable();
    }
  }

  /**
   * 更新词典设置
   * @param {Object} dictSettings 词典设置
   */
  async updateDictSettings(dictSettings) {
    console.log('更新词典设置:', dictSettings);
    
    // 检查是否为新格式（包含词典ID）
    const hasNewFormat = Object.keys(dictSettings).some(key => key.includes('-'));
    
    if (hasNewFormat) {
      // 新格式：使用词典ID
      this.dictionaryManager.updateEnabledDictionaries(dictSettings);
    } else {
      // 旧格式：使用语言代码
      this.dictionaryManager.updateEnabledLanguages(dictSettings);
    }
    
    // 如果当前已启用高亮，重新处理页面
    if (this.enabled) {
      console.log('重新处理页面以应用新词典设置...');
      await this.disable();
      await this.enable();
    }
  }

  /**
   * 检查是否准备就绪
   * @returns {boolean} 是否准备就绪
   */
  isReady() {
    return this.isInitialized && this.dictionaryManager.isReady();
  }

  /**
   * 获取支持的语言列表
   * @returns {Array<string>} 语言代码数组
   */
  getSupportedLanguages() {
    const stats = this.dictionaryManager.getStatistics();
    return Object.keys(stats.languages);
  }

  /**
   * 手动重新处理页面
   */
  async reprocessPage() {
    if (!this.enabled) {
      throw new Error('高亮未启用');
    }
    
    console.log('重新处理页面...');
    
    // 根据处理模式选择处理器
    if (this.processingMode === 'streaming') {
      // 先移除现有高亮
      this.streamingPageProcessor.removeAllHighlights();
      
      // 重新处理
      await this.streamingPageProcessor.processPage();
    } else {
      // 先移除现有高亮
      this.pageProcessor.removeAllHighlights();
      
      // 重新处理
      await this.pageProcessor.processPage();
    }
    
    // 重新应用样式设置
    this.applyColorScheme();
    this.applyTextSettings();
    
    console.log('页面重新处理完成');
  }

  /**
   * 获取版本信息
   * @returns {Object} 版本信息
   */
  getVersion() {
    return {
      version: '1.0.0',
      modules: {
        dictionaryManager: '1.0.0',
        languageDetector: '1.0.0',
        textSegmenter: '1.0.0',
        pageProcessor: '1.0.0'
      }
    };
  }

  /**
   * 获取页面分析数据
   * @returns {Promise<Object>} 分析数据
   */
  async getAnalysisData() {
    console.log('获取页面分析数据...');
    
    try {
      // 获取页面处理统计
      const processingStats = this.pageProcessor.getStats();
      const processingSummary = this.pageProcessor.getProcessingSummary();
      
      // 分析语言分布
      const languageStats = await this.analyzeLanguageDistribution();
      
      // 分析词性分布
      const posStats = this.analyzePartOfSpeechDistribution();
      
      // 获取高亮统计
      const highlightStats = {
        total: processingStats.highlightedWords || 0,
        processedNodes: processingStats.processedNodes || 0,
        skippedNodes: processingStats.skippedNodes || 0,
        errors: processingStats.errors || 0
      };
      
      // 获取词汇统计数据
      let vocabularyStats = null;
      if (window.vocabularyCounter) {
        try {
          vocabularyStats = window.vocabularyCounter.getTopWordsByCategory();
        } catch (error) {
          console.error('获取词汇统计失败:', error);
        }
      }
      
      // 生成智能推荐 - 暂时禁用
      // const recommendations = this.generateRecommendations(languageStats, posStats, highlightStats);
      
      return {
        languages: languageStats,
        partOfSpeech: posStats,
        highlights: highlightStats,
        vocabulary: vocabularyStats,
        // recommendations: recommendations, // 暂时禁用推荐功能
        summary: processingSummary
      };
      
    } catch (error) {
      console.error('获取分析数据失败:', error);
      return {
        languages: {},
        partOfSpeech: {},
        highlights: { totalWords: 0, processedNodes: 0 },
        summary: {}
      };
    }
  }

  /**
   * 测试词典加载功能
   * @returns {Object} 测试结果
   */
  async testDictionaryLoading() {
    try {
      console.log('🔧 开始测试词典加载...');
      
      // 获取所有可用词典
      const availableDictionaries = await this.dictionaryManager.getAvailableDictionaries();
      const totalDictionaries = availableDictionaries.length;
      
      let loadedDictionaries = 0;
      let failedDictionaries = 0;
      const details = [];
      
      // 测试每个词典的加载状态
      for (const dict of availableDictionaries) {
        try {
          // 检查词典是否已加载
          const isLoaded = this.dictionaryManager.isDictionaryLoaded(dict.id);
          const dictData = this.dictionaryManager.getDictionaryData(dict.id);
          
          if (isLoaded && dictData && dictData.length > 0) {
            loadedDictionaries++;
            details.push({
              name: dict.name,
              id: dict.id,
              status: 'success',
              message: `已加载 ${dictData.length} 个词条`
            });
          } else {
            failedDictionaries++;
            details.push({
              name: dict.name,
              id: dict.id,
              status: 'failed',
              message: isLoaded ? '词典数据为空' : '词典未加载'
            });
          }
        } catch (error) {
          failedDictionaries++;
          details.push({
            name: dict.name,
            id: dict.id,
            status: 'failed',
            message: `加载错误: ${error.message}`
          });
        }
      }
      
      console.log(`🔧 词典加载测试完成: ${loadedDictionaries}/${totalDictionaries} 成功`);
      
      return {
        success: true,
        totalDictionaries,
        loadedDictionaries,
        failedDictionaries,
        details
      };
    } catch (error) {
      console.error('🔧 测试词典加载失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 测试词汇高亮功能
   * @param {string} word 要测试的词汇
   * @returns {Object} 测试结果
   */
  async testWordHighlight(word) {
    try {
      console.log(`🔧 开始测试词汇高亮: ${word}`);
      
      if (!word || typeof word !== 'string') {
        return {
          success: false,
          error: '无效的测试词汇'
        };
      }
      
      const matches = [];
      
      // 获取所有已启用的词典
      const enabledDictionaries = this.dictionaryManager.getEnabledDictionaries();
      
      for (const dictId of Object.keys(enabledDictionaries)) {
        if (!enabledDictionaries[dictId]) continue;
        
        try {
          const dictData = this.dictionaryManager.getDictionaryData(dictId);
          const dictInfo = await this.dictionaryManager.getDictionaryInfo(dictId);
          
          if (dictData && dictData.includes(word)) {
            // 获取词汇的分类和颜色
            const category = this.dictionaryManager.getWordCategory(word, dictId);
            const color = this.dictionaryManager.getWordColor(word, dictId, category);
            
            matches.push({
              dictionary: dictInfo?.name || dictId,
              category: category || '未知',
              color: color || '#ffeb3b',
              dictId: dictId
            });
          }
        } catch (error) {
          console.warn(`🔧 检查词典 ${dictId} 时出错:`, error);
        }
      }
      
      console.log(`🔧 词汇高亮测试完成: 找到 ${matches.length} 个匹配`);
      
      return {
        success: true,
        word: word,
        matches: matches
      };
    } catch (error) {
      console.error('🔧 测试词汇高亮失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取选中的文本
   * @returns {string} 选中的文本
   */
  getSelectedText() {
    try {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        return selection.toString().trim();
      }
      return '';
    } catch (error) {
      console.error('获取选中文本失败:', error);
      return '';
    }
  }

  ensureAiSettingPanel() {
    if (this.__aiSettingPanelInitialized) return;
    const style = document.createElement('style');
    style.id = 'agf-ai-setting-style';
    style.textContent = `
      .agf-ai-overlay{position:fixed;display:none;flex-direction:column;background:#fff;border:1px solid #e0e0e0;z-index:2147483647;width:50vw;height:50vh;box-shadow:0 8px 24px rgba(0,0,0,0.15);min-width:calc(100vw/3);min-height:calc(100vh * 2/3)}
      .agf-ai-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e0e0e0;background:#f8f9fa}
      .agf-ai-title{font-size:14px;font-weight:600;color:#333;display:flex;align-items:center;gap:6px}
      .agf-ai-controls{display:inline-flex;gap:8px}
      .agf-ai-controls button{height:24px;min-width:28px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333}
      .agf-ai-tabs{display:inline-flex;gap:8px;margin-left:12px}
      .agf-ai-tabs button{height:24px;min-width:28px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333}
      .agf-ai-body{flex:1;padding:12px;overflow:hidden;display:flex;flex-direction:column;gap:12px;min-height:0}
      .agf-ai-content{flex:1;overflow:hidden;min-height:0}
      .agf-ai-view-chat{display:grid;grid-template-rows:1fr auto;gap:8px;height:calc(100% - 8px);box-sizing:border-box;min-height:0}
      .agf-ai-display{border:1px solid #e0e0e0;border-radius:4px;padding:8px;font-size:14px;color:#333;overflow:auto;box-sizing:border-box;min-height:0}
      .agf-ai-input{border:1px solid #e0e0e0;border-radius:4px;padding:8px;font-size:14px;color:#333;overflow:hidden;box-sizing:border-box;min-height:130px;height:130px}
      .agf-chat{display:flex;flex-direction:column;height:100%;gap:8px}
      .agf-chat-title{font-size:12px;color:#666}
      .agf-chat-list{flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px}
      .agf-msg{display:flex}
      .agf-msg.user{justify-content:flex-end}
      .agf-msg.assistant{justify-content:flex-start}
      .agf-bubble{max-width:70%;border:1px solid #e0e0e0;border-radius:10px;padding:8px 10px;font-size:13px;color:#333;background:#fff}
      .agf-bubble.user{background:#f0f0f0}
      .agf-composer{display:grid;grid-template-rows:auto 1fr;gap:8px;height:100%}
      .agf-composer-body{display:grid;grid-template-columns:1fr auto;gap:8px}
      .agf-composer-header{display:inline-flex;align-items:center;gap:8px}
      .agf-field{height:24px;border:1px solid #e0e0e0;border-radius:8px;padding:0 8px;font-size:12px;color:#333;background:#fff}
      .agf-mode-toggle{display:inline-flex;align-items:center;margin-left:6px}
      .agf-mode-btn{height:24px;line-height:24px;padding:0 8px;border:1px solid #e0e0e0;border-radius:0;background:#fff;color:#333;font-size:12px}
      .agf-mode-btn:first-child{border-top-left-radius:8px;border-bottom-left-radius:8px}
      .agf-mode-btn:last-child{border-top-right-radius:8px;border-bottom-right-radius:8px}
      .agf-mode-btn + .agf-mode-btn{margin-left:-1px}
      .agf-mode-btn.active{background:#333;color:#fff}
      .agf-input-textarea{width:100%;min-height:72px;max-height:40vh;resize:none;border-radius:8px;border:1px solid #e0e0e0;padding:10px 12px;color:#333;background:#fff}
      .agf-actions{display:inline-flex;align-items:center;gap:8px}
      .agf-send{height:32px;min-width:88px;border:1px solid #e0e0e0;border-radius:8px;background:#fff;color:#333}
      .agf-settings{display:flex;flex-direction:column;gap:12px}
      .agf-settings-group{border:1px solid #e0e0e0;border-radius:4px;padding:10px;background:#fff}
      .agf-settings-row{display:flex;align-items:center;gap:12px;margin-top:8px}
      .agf-label{min-width:64px;font-size:12px;color:#333}
      .agf-button-list{display:flex;flex-wrap:wrap;gap:8px}
      .agf-btn{height:28px;padding:0 10px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;font-size:13px;cursor:pointer}
      .agf-btn.active{background:#333;color:#fff;border-color:#333}
      .agf-input{height:28px;border:1px solid #e0e0e0;border-radius:4px;padding:4px 8px;font-size:13px;color:#333;background:#fff}
      .agf-select{height:28px;border:1px solid #e0e0e0;border-radius:4px;padding:4px 8px;font-size:13px;color:#333;background:#fff}
      .agf-hint{font-size:12px;color:#666;margin-left:8px}
      .agf-ok-btn{height:28px;min-width:28px;border:1px solid #27ae60;border-radius:6px;background:#27ae60;color:#fff;display:none}
      .agf-ai-bubble{position:fixed;right:12px;bottom:12px;width:40px;height:40px;display:none;align-items:center;justify-content:center;border-radius:50%;background:#333;color:#fff;font-weight:700;z-index:2147483647}
      .agf-resize-right{position:absolute;top:0;right:0;width:8px;height:100%;cursor:ew-resize}
      .agf-resize-bottom{position:absolute;left:0;bottom:0;width:100%;height:8px;cursor:ns-resize}
      .agf-resize-left{position:absolute;top:0;left:0;width:8px;height:100%;cursor:ew-resize}
    `;
    document.documentElement.appendChild(style);
    const overlay = document.createElement('div');
    overlay.id = 'agfAiSettingOverlay';
    overlay.className = 'agf-ai-overlay';
    overlay.innerHTML = `
      <div class="agf-ai-header">
        <div class="agf-ai-title"><span>ExamPage</span></div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="agf-ai-tabs">
            <button id="agfAiTabNote">📝</button>
            <button id="agfAiTabWrench">🔧</button>
          </div>
          <div class="agf-ai-controls">
            <button id="agfAiMax">+</button>
            <button id="agfAiMin">-</button>
            <button id="agfAiClose">X</button>
          </div>
        </div>
      </div>
      <div class="agf-ai-body">
        <div class="agf-ai-content">
          <div class="agf-ai-view-chat" id="agfAiViewChat">
            <div class="agf-ai-display">
              <div class="agf-chat">
                <div class="agf-chat-title">对话</div>
                <div class="agf-chat-list">
                  <div class="agf-msg assistant"><div class="agf-bubble">您好，我是AI助手。</div></div>
                  <div class="agf-msg user"><div class="agf-bubble user">请总结这段文本。</div></div>
                </div>
              </div>
            </div>
            <div class="agf-ai-input">
              <div class="agf-composer">
                <div class="agf-composer-header">
                  <select class="agf-field" id="agfSessionProvider">
                    <option>deepseek</option>
                    <option>moonshot</option>
                    <option>chatgpt</option>
                    <option>claude</option>
                    <option>qwen</option>
                    <option>chatglm</option>
                    <option>minimax</option>
                    <option>gemini</option>
                    <option>grok</option>
                  </select>
                  <select class="agf-field" id="agfSessionModel">
                    <option>deepseek-chat</option>
                    <option>deepseek-reasoner</option>
                  </select>
                  <div class="agf-mode-toggle">
                    <button class="agf-mode-btn">T</button>
                    <button class="agf-mode-btn active">M</button>
                  </div>
                </div>
                <div class="agf-composer-body">
                  <textarea class="agf-input-textarea" id="agfComposerInput" placeholder="输入你的问题，按 Enter 发送，Shift+Enter 换行"></textarea>
                  <button class="agf-send" id="agfComposerSend">发送</button>
                </div>
              </div>
            </div>
          </div>
          <div class="agf-settings" id="agfAiViewSettings" style="display:none;">
            <div class="agf-settings-group">
              <div style="font-size:13px;color:#333;font-weight:600;">AI设置</div>
              <div class="agf-settings-row">
                <div class="agf-label">服务商</div>
                <div id="agfProviderList" class="agf-button-list"></div>
              </div>
              <div class="agf-settings-row">
                <div class="agf-label">模型</div>
                <div id="agfModelList" class="agf-button-list"></div>
              </div>
              <div class="agf-settings-row">
                <div class="agf-label">供应商URL</div>
                <input id="agfBaseUrlInput" class="agf-input" type="text" placeholder="https://..." />
              </div>
              <div class="agf-settings-row">
                <div class="agf-label">API Key</div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input id="agfApiKeyInput" class="agf-input" type="password" placeholder="••••••••••••••••••••••••••••••••" />
                  <button id="agfSaveKeyBtn" class="agf-input" style="height:28px;min-width:64px;">保存</button>
                  <button id="agfKeySavedBtn" class="agf-ok-btn">✓</button>
                </div>
              </div>
              <div class="agf-settings-row">
                <div class="agf-label">temperature</div>
                <input id="agfTempInput" class="agf-input" type="number" step="0.1" value="0.7" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(overlay);
    overlay.style.top = '5px';
    const initialLeft = Math.max(5, window.innerWidth - overlay.offsetWidth - 5);
    overlay.style.left = initialLeft + 'px';
    const bubble = document.createElement('div');
    bubble.id = 'agfAiBubble';
    bubble.className = 'agf-ai-bubble';
    bubble.textContent = '🔧';
    document.documentElement.appendChild(bubble);
    const resizeRight = document.createElement('div');
    resizeRight.className = 'agf-resize-right';
    const resizeBottom = document.createElement('div');
    resizeBottom.className = 'agf-resize-bottom';
    const resizeLeft = document.createElement('div');
    resizeLeft.className = 'agf-resize-left';
    overlay.appendChild(resizeRight);
    overlay.appendChild(resizeBottom);
    overlay.appendChild(resizeLeft);
    const header = overlay.querySelector('.agf-ai-header');
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    const onDown = (e) => { dragging = true; startX = e.clientX; startY = e.clientY; startLeft = parseInt(getComputedStyle(overlay).left, 10) || 0; startTop = parseInt(getComputedStyle(overlay).top, 10) || 0; };
    const onMove = (e) => { if (!dragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; let newLeft = startLeft + dx; let newTop = startTop + dy; const maxLeft = window.innerWidth - overlay.offsetWidth; const maxTop = window.innerHeight - overlay.offsetHeight; if (newLeft < 0) newLeft = 0; if (newTop < 0) newTop = 0; if (newLeft > maxLeft) newLeft = maxLeft; if (newTop > maxTop) newTop = maxTop; overlay.style.left = newLeft + 'px'; overlay.style.top = newTop + 'px'; };
    const onUp = () => { dragging = false; };
    if (header) { header.addEventListener('mousedown', onDown); document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    const minBtn = document.getElementById('agfAiMin');
    const closeBtn = document.getElementById('agfAiClose');
    const maxBtn = document.getElementById('agfAiMax');
    const tabNote = document.getElementById('agfAiTabNote');
    const tabWrench = document.getElementById('agfAiTabWrench');
    const viewChat = document.getElementById('agfAiViewChat');
    const viewSettings = document.getElementById('agfAiViewSettings');
    const providerList = document.getElementById('agfProviderList');
    const modelList = document.getElementById('agfModelList');
    const baseUrlInput = document.getElementById('agfBaseUrlInput');
    const apiKeyInput = document.getElementById('agfApiKeyInput');
    const saveKeyBtn = document.getElementById('agfSaveKeyBtn');
    const keySavedBtn = document.getElementById('agfKeySavedBtn');
    const tempInput = document.getElementById('agfTempInput');
    const sessionProviderSelect = document.getElementById('agfSessionProvider');
    const sessionModelSelect = document.getElementById('agfSessionModel');
    if (minBtn) minBtn.addEventListener('click', () => this.minimizeAiSettingPanel());
    if (closeBtn) closeBtn.addEventListener('click', () => this.hideAiSettingPanel());
    if (maxBtn) maxBtn.addEventListener('click', () => this.maximizeAiSettingPanel());
    bubble.addEventListener('click', () => this.restoreAiSettingPanel());
    if (tabNote && tabWrench && viewChat && viewSettings) {
      const showChat = () => { viewChat.style.display = 'grid'; viewSettings.style.display = 'none'; };
      const showSettings = () => { viewChat.style.display = 'none'; viewSettings.style.display = 'block'; };
      tabNote.addEventListener('click', showChat);
      tabWrench.addEventListener('click', showSettings);
      showChat();
    }

    const PROVIDERS_CONFIG = {
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1/chat/completions',
        models: ['deepseek-chat', 'deepseek-reasoner']
      },
      moonshot: {
        baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-k2-instruct']
      },
      openai: {
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-5', 'gpt-4o', 'gpt-4.1', 'o3', 'o4-mini']
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com/v1/messages',
        models: ['claude-4-opus', 'claude-4-sonnet', 'claude-4.5-sonnet', 'claude-4.5-haiku', 'claude-3.5-sonnet']
      },
      qwen: {
        baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
        models: ['qwen-max-2025-01-25', 'qwen-plus', 'qwen2.5-coder-32b-instruct']
      },
      chatglm: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        models: ['glm-4.5', 'glm-4.6', 'glm-4', 'glm-4v', 'glm-4-plus']
      },
      minimax: {
        baseUrl: 'https://api.minimax.io/v1/chat/completions',
        models: ['abab-6.5-chat', 'minimax-m2']
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro']
      },
      grok: {
        baseUrl: 'https://api.x.ai/v1/chat/completions',
        models: ['grok-4.1', 'grok-4-fast']
      }
    };

    const renderButtons = (container, items, activeValue, onClick, labelMap) => {
      if (!container) return;
      container.innerHTML = '';
      items.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'agf-btn' + (val === activeValue ? ' active' : '');
        btn.textContent = labelMap && labelMap[val] ? labelMap[val] : val;
        btn.dataset.value = val;
        btn.addEventListener('click', () => onClick(val, btn));
        container.appendChild(btn);
      });
    };

    const fillModels = (prov, presetModel) => {
      const cfg = PROVIDERS_CONFIG[prov];
      const models = cfg?.models || [];
      renderButtons(modelList, models, presetModel || models[0], (val, btn) => {
        Array.from(modelList.querySelectorAll('.agf-btn')).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        save({ aiModel: val });
      });
    };

    let currentProvider = null;
    let aiKeysState = {};

    const renderProviderButtons = (activeProv) => {
      const providerKeys = Object.keys(PROVIDERS_CONFIG);
      const PROVIDER_LABELS = { deepseek: 'deepseek', moonshot: 'moonshot', openai: 'chatgpt', anthropic: 'claude', qwen: 'qwen', chatglm: 'chatglm', minimax: 'minimax', gemini: 'gemini', grok: 'grok' };
      const labelMap = {};
      providerKeys.forEach(k => { labelMap[k] = aiKeysState && aiKeysState[k] ? (PROVIDER_LABELS[k] + ' ●') : PROVIDER_LABELS[k]; });
      renderButtons(providerList, providerKeys, activeProv, (val, btn) => {
        Array.from(providerList.querySelectorAll('.agf-btn')).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentProvider = val;
        fillModels(val);
        const base = PROVIDERS_CONFIG[val]?.baseUrl || '';
        if (baseUrlInput) baseUrlInput.value = base;
        save({ aiProvider: val, aiBaseUrl: base });
        if (keySavedBtn) keySavedBtn.style.display = aiKeysState && aiKeysState[val] ? 'inline-block' : 'none';
      }, labelMap);
    };

    const initFromStorage = () => {
      try {
        chrome.storage.local.get(['aiProvider','aiModel','aiBaseUrl','aiTemperature','aiKeys'], (res) => {
          currentProvider = res.aiProvider || 'deepseek';
          aiKeysState = res.aiKeys || {};
          renderProviderButtons(currentProvider);
          fillModels(currentProvider, res.aiModel || (PROVIDERS_CONFIG[currentProvider]?.models?.[0] || ''));
          const base = res.aiBaseUrl || PROVIDERS_CONFIG[currentProvider]?.baseUrl || '';
          if (baseUrlInput) baseUrlInput.value = base;
          const t = typeof res.aiTemperature === 'number' ? res.aiTemperature : 0.7;
          if (tempInput) tempInput.value = t;
          if (keySavedBtn) keySavedBtn.style.display = aiKeysState && aiKeysState[currentProvider] ? 'inline-block' : 'none';
          initComposerSelects();
        });
      } catch (_) {}
    };

    const save = (obj) => { try { chrome.storage.local.set(obj); } catch (_) {} };

    // provider/model buttons are handled in initFromStorage via renderButtons

    if (baseUrlInput) {
      baseUrlInput.addEventListener('change', () => {
        save({ aiBaseUrl: baseUrlInput.value });
      });
    }

    if (tempInput) {
      tempInput.addEventListener('change', () => {
        const v = parseFloat(tempInput.value);
        save({ aiTemperature: isNaN(v) ? 0.7 : v });
      });
    }

    if (saveKeyBtn && apiKeyInput && keySavedBtn) {
      saveKeyBtn.addEventListener('click', () => {
        const v = apiKeyInput.value || '';
        if (v.length > 0) {
          try {
            chrome.storage.local.get(['aiKeys'], (res) => {
              const keys = res.aiKeys || {};
              if (currentProvider) keys[currentProvider] = v;
              chrome.storage.local.set({ aiKeys: keys }, () => {
                aiKeysState = keys;
                if (keySavedBtn) keySavedBtn.style.display = 'inline-block';
                if (apiKeyInput) apiKeyInput.value = '';
                renderProviderButtons(currentProvider);
                initComposerSelects();
              });
            });
          } catch (_) {}
        }
      });
      apiKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveKeyBtn.click();
        }
      });
    }

    initFromStorage();

    const initComposerSelects = () => {
      if (!sessionProviderSelect || !sessionModelSelect) return;
      const providers = Object.keys(PROVIDERS_CONFIG).filter(p => aiKeysState && aiKeysState[p]);
      sessionProviderSelect.innerHTML = '';
      providers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p === 'openai' ? 'chatgpt' : (p === 'anthropic' ? 'claude' : p);
        sessionProviderSelect.appendChild(opt);
      });
      const selectedProv = providers.includes(currentProvider) ? currentProvider : (providers[0] || '');
      if (selectedProv) sessionProviderSelect.value = selectedProv;
      const fillModelsForProv = (prov) => {
        sessionModelSelect.innerHTML = '';
        const ms = PROVIDERS_CONFIG[prov]?.models || [];
        ms.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          sessionModelSelect.appendChild(opt);
        });
        if (ms[0]) sessionModelSelect.value = ms[0];
      };
      if (selectedProv) fillModelsForProv(selectedProv);
      sessionProviderSelect.addEventListener('change', () => {
        const prov = sessionProviderSelect.value;
        fillModelsForProv(prov);
      });
    };
    let resizing = null, rStartX = 0, rStartY = 0, rStartW = 0, rStartH = 0, rStartL = 0;
    const minW = Math.floor(window.innerWidth / 3), minH = Math.floor(window.innerHeight * 2 / 3);
    const onResizeDownRight = (e) => { resizing = 'right'; rStartX = e.clientX; rStartY = e.clientY; rStartW = overlay.offsetWidth; rStartH = overlay.offsetHeight; };
    const onResizeDownBottom = (e) => { resizing = 'bottom'; rStartX = e.clientX; rStartY = e.clientY; rStartW = overlay.offsetWidth; rStartH = overlay.offsetHeight; };
    const onResizeDownLeft = (e) => { resizing = 'left'; rStartX = e.clientX; rStartY = e.clientY; rStartW = overlay.offsetWidth; rStartH = overlay.offsetHeight; rStartL = parseInt(getComputedStyle(overlay).left, 10) || 0; };
    const onResizeMove = (e) => {
      if (!resizing) return;
      const dx = e.clientX - rStartX;
      const dy = e.clientY - rStartY;
      if (resizing === 'right') {
        let w = rStartW + dx;
        if (w < minW) w = minW;
        if (w > window.innerWidth) w = window.innerWidth;
        overlay.style.width = w + 'px';
      } else if (resizing === 'bottom') {
        let h = rStartH + dy;
        if (h < minH) h = minH;
        if (h > window.innerHeight) h = window.innerHeight;
        overlay.style.height = h + 'px';
      } else if (resizing === 'left') {
        let newLeft = rStartL + dx;
        let w = rStartW - dx;
        if (w < minW) { w = minW; newLeft = rStartL + (rStartW - minW); }
        if (newLeft < 0) newLeft = 0;
        overlay.style.left = newLeft + 'px';
        overlay.style.width = w + 'px';
      }
    };
    const onResizeUp = () => { resizing = null; };
    resizeRight.addEventListener('mousedown', onResizeDownRight);
    resizeBottom.addEventListener('mousedown', onResizeDownBottom);
    resizeLeft.addEventListener('mousedown', onResizeDownLeft);
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeUp);
    this.__aiSettingPanelInitialized = true;
  }

  showAiSettingPanel() {
    const overlay = document.getElementById('agfAiSettingOverlay');
    const bubble = document.getElementById('agfAiBubble');
    if (overlay) {
      overlay.style.display = 'flex';
      if (!this.__aiPlaced) {
        const w = overlay.offsetWidth || Math.floor(window.innerWidth * 0.5);
        const left = Math.max(5, window.innerWidth - w - 5);
        overlay.style.top = '5px';
        overlay.style.left = left + 'px';
        this.__aiPlaced = true;
      }
    }
    if (bubble) bubble.style.display = 'none';
  }

  hideAiSettingPanel() {
    const overlay = document.getElementById('agfAiSettingOverlay');
    const bubble = document.getElementById('agfAiBubble');
    if (overlay) overlay.style.display = 'none';
    if (bubble) bubble.style.display = 'none';
  }

  minimizeAiSettingPanel() {
    const overlay = document.getElementById('agfAiSettingOverlay');
    const bubble = document.getElementById('agfAiBubble');
    if (overlay) {
      this.__aiGeom = {
        left: parseInt(getComputedStyle(overlay).left, 10) || 0,
        top: parseInt(getComputedStyle(overlay).top, 10) || 0,
        width: overlay.offsetWidth,
        height: overlay.offsetHeight
      };
    }
    if (overlay) overlay.style.display = 'none';
    if (bubble) bubble.style.display = 'flex';
  }

  restoreAiSettingPanel() {
    const overlay = document.getElementById('agfAiSettingOverlay');
    const bubble = document.getElementById('agfAiBubble');
    if (overlay) overlay.style.display = 'flex';
    if (bubble) bubble.style.display = 'none';
    if (overlay && this.__aiGeom) {
      overlay.style.left = this.__aiGeom.left + 'px';
      overlay.style.top = this.__aiGeom.top + 'px';
      overlay.style.width = this.__aiGeom.width + 'px';
      overlay.style.height = this.__aiGeom.height + 'px';
    }
  }

  maximizeAiSettingPanel() {
    const overlay = document.getElementById('agfAiSettingOverlay');
    if (!overlay) return;
    this.__aiGeom = {
      left: parseInt(getComputedStyle(overlay).left, 10) || 0,
      top: parseInt(getComputedStyle(overlay).top, 10) || 0,
      width: overlay.offsetWidth,
      height: overlay.offsetHeight
    };
    overlay.style.left = '0px';
    overlay.style.top = '0px';
    overlay.style.width = window.innerWidth + 'px';
    overlay.style.height = window.innerHeight + 'px';
  }

  /**
   * 分析页面语言分布
   * @returns {Promise<Object>} 语言分布统计
   */
  async analyzeLanguageDistribution() {
    const languageStats = { zh: 0, en: 0, fr: 0, ru: 0, es: 0, ja: 0 };
    
    try {
      // 获取所有已处理的元素
      const processedElements = document.querySelectorAll('.adhd-processed');
      
      processedElements.forEach(element => {
        const language = element.getAttribute('data-language');
        if (language && languageStats.hasOwnProperty(language)) {
          // 统计该语言的词汇数量
          const words = element.querySelectorAll('[class*="adhd-"]');
          languageStats[language] += words.length;
        }
      });
      
      // 如果没有处理过的元素，分析当前页面文本
      if (Object.values(languageStats).every(count => count === 0)) {
        const textNodes = this.pageProcessor.getTextNodes();
        const sampleTexts = textNodes.slice(0, 50).map(node => node.textContent);
        
        sampleTexts.forEach(text => {
          const detectedLang = this.languageDetector.detectLanguage(text);
          if (languageStats.hasOwnProperty(detectedLang)) {
            languageStats[detectedLang] += text.length;
          }
        });
      }
      
    } catch (error) {
      console.error('分析语言分布失败:', error);
    }
    
    return languageStats;
  }

  /**
   * 分析词性分布
   * @returns {Object} 词性分布统计
   */
  analyzePartOfSpeechDistribution() {
    const posStats = { n: 0, v: 0, a: 0 };
    
    try {
      // 统计各词性的高亮词汇数量
      const nounElements = document.querySelectorAll('.adhd-n');
      const verbElements = document.querySelectorAll('.adhd-v');
      const adjElements = document.querySelectorAll('.adhd-a');
      
      posStats.n = nounElements.length;
      posStats.v = verbElements.length;
      posStats.a = adjElements.length;
      
    } catch (error) {
      console.error('分析词性分布失败:', error);
    }
    
    return posStats;
  }

  /**
   * 生成智能推荐
   * @param {Object} languageStats 语言统计
   * @param {Object} posStats 词性统计
   * @param {Object} highlightStats 高亮统计
   * @returns {Object} 推荐内容
   */
  generateRecommendations(languageStats, posStats, highlightStats) {
    const recommendations = {
      colors: [],
      textStyle: []
    };
    
    try {
      // 基于词性分布推荐颜色方案
      const totalPos = posStats.n + posStats.v + posStats.a;
      
      if (totalPos > 0) {
        const nounRatio = posStats.n / totalPos;
        const verbRatio = posStats.v / totalPos;
        const adjRatio = posStats.a / totalPos;
        
        // 推荐颜色方案
        if (nounRatio > 0.5) {
          recommendations.colors.push({
            name: '蓝色主导方案',
            reason: '页面名词较多，建议使用蓝色系突出重点'
          });
        }
        
        if (verbRatio > 0.3) {
          recommendations.colors.push({
            name: '高对比度方案',
            reason: '动词丰富，建议使用高对比度方案便于区分'
          });
        }
        
        if (adjRatio > 0.25) {
          recommendations.colors.push({
            name: '柔和色彩方案',
            reason: '形容词较多，建议使用柔和色彩减少视觉疲劳'
          });
        }
      }
      
      // 基于高亮密度推荐文本样式
      const highlightDensity = highlightStats.totalWords / Math.max(highlightStats.processedNodes, 1);
      
      if (highlightDensity > 10) {
        recommendations.textStyle.push({
          name: '增大行间距',
          reason: '高亮密度较高，建议增大行间距提升可读性'
        });
        
        recommendations.textStyle.push({
          name: '适当增大字号',
          reason: '内容密集，建议适当增大字号减轻阅读负担'
        });
      } else if (highlightDensity < 3) {
        recommendations.textStyle.push({
          name: '标准间距',
          reason: '高亮适中，当前文本样式已较为合适'
        });
      }
      
      // 基于语言分布推荐
      const totalLangWords = Object.values(languageStats).reduce((sum, count) => sum + count, 0);
      if (totalLangWords > 0) {
        const multiLang = Object.values(languageStats).filter(count => count > totalLangWords * 0.1).length;
        
        if (multiLang > 1) {
          recommendations.colors.push({
            name: '多语言友好方案',
            reason: '检测到多种语言，建议使用统一的颜色方案'
          });
        }
      }
      
      // 如果没有生成任何推荐，提供默认推荐
      if (recommendations.colors.length === 0) {
        recommendations.colors.push({
          name: '默认配色方案',
          reason: '基于当前页面特征，推荐使用默认配色'
        });
      }
      
      if (recommendations.textStyle.length === 0) {
        recommendations.textStyle.push({
          name: '标准文本样式',
          reason: '当前页面适合使用标准的文本样式设置'
        });
      }
      
    } catch (error) {
      console.error('生成推荐失败:', error);
      // 提供备用推荐
      recommendations.colors = [{
        name: '默认方案',
        reason: '推荐使用默认颜色方案'
      }];
      recommendations.textStyle = [{
        name: '标准样式',
        reason: '推荐使用标准文本样式'
      }];
    }
    
    return recommendations;
  }
}

// 全局初始化
console.log('加载ADHD文本高亮器主控制器...');

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.adhdHighlighter = new ADHDHighlighter();
  });
} else {
  // DOM已经加载完成
  window.adhdHighlighter = new ADHDHighlighter();
}

console.log('ADHD文本高亮器主控制器加载完成');
/**
 * 日志模式切换说明（统一开关）
 *
 * 统一开关: window.__BUILD_TEST__  (true=测试版, false=正式版)
 * 作用:
 * - 根据 __BUILD_TEST__ 初始化并强制覆盖 chrome.storage.local.logfordevmode
 * - 设置 window.__LOG_DEV_MODE，用于控制所有受控调试日志是否显示
 * 使用方式:
 * - 在构建或运行前设置 window.__BUILD_TEST__ 为期望值（测试/正式）
 * - 内容脚本启动时会写入 logfordevmode = !!__BUILD_TEST__ 并同步 __LOG_DEV_MODE
 * 代码位置:
 * - 初始化与覆盖: content/main.js:75-91
 * 影响范围:
 * - 控制依赖 window.__LOG_DEV_MODE 的高频调试日志输出（内容脚本与页面环境）
 */