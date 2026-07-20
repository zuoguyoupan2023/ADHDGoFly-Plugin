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

const getUiTokens = () => {
  const t = (k) => { try { return (window.i18n && window.i18n.t) ? String(window.i18n.t(k)) : ''; } catch (_) { return ''; } };
  const base = ['太学','✏️','📃','🔧','●','◑','○','keyboard_arrow_down','deepseek','moonshot','chatgpt','claude','qwen','chatglm','minimax','gemini','grok','deepseek-chat','deepseek-reasoner','总结','更多','保姆级解读','常驻','手动','发送','收起','展开全文','您好，我是AI助手。','请总结这段文本。','全文'];
  const dyn = ['aiPanel.summary','aiPanel.more','aiPanel.beginnerExplain','aiPanel.send','aiPanel.collapse.expand','aiPanel.collapse.collapse','aiPanel.fullText','aiPanel.mode.persistent','aiPanel.mode.manual'];
  const out = base.slice();
  for (let i = 0; i < dyn.length; i++) { const v = t(dyn[i]); if (v) out.push(v); }
  return new Set(out);
};

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

      const cachedRecords = await this.eventCacheManager.getAllCachedHighlights(currentUrl, targetLanguage);
      const dictIds = (this.dictionaryManager && typeof this.dictionaryManager.getEnabledDictionaryIds === 'function')
        ? (this.dictionaryManager.getEnabledDictionaryIds(targetLanguage) || [])
        : [];
      const currentSig = dictIds.join('|');
      
      if (!cachedRecords || cachedRecords.length === 0) {
        console.log('📝 未找到匹配的缓存数据');
        return false;
      }

      const filtered = cachedRecords.filter(r => {
        if (r.dictSignature) return r.dictSignature === currentSig;
        return currentSig === '';
      });
      console.log(`🎯 找到 ${cachedRecords.length} 条缓存记录，其中签名匹配 ${filtered.length} 条，尝试应用...`);
      
      // 应用所有缓存的高亮结果
      let totalApplied = 0;
      for (const cachedData of filtered) {
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
      this.setupMessageListener();
      this.setupPageBridge();
      
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
      try {
        const s = await chrome.storage.local.get(['aiPanelMode']);
        const mode = s.aiPanelMode || 'manual';
        if (mode === 'persistent') {
          this.ensureAiSettingPanel();
          this.showAiSettingPanel();
          try { await this.collectAndStorePageSegments(); } catch (_) {}
        }
      } catch (_) {}
      try { await this.testCollectAndSaveText(); } catch (_) {}
      
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
        case 'openTaixue':
          try {
            this.ensureAiSettingPanel();
            this.showAiSettingPanel();
            this.__pendingTaixueOpen = {
              module: message.module || 'chat',
              contextSource: message.contextSource || 'full_article'
            };
            if (typeof this.__openTaixueModule === 'function') {
              this.__openTaixueModule(this.__pendingTaixueOpen);
              this.__pendingTaixueOpen = null;
            }
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'applyArticleDictionary':
          try {
            const applied = await this.applyArticleDictionary(message.dictionary, message.registryEntry, message.dictSettings);
            sendResponse({ success: applied });
          } catch (error) {
            console.error('应用文章词典失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'removeArticleDictionary':
          try {
            this.dictionaryManager.updateEnabledDictionaries(message.dictSettings || {});
            await chrome.storage.local.set({ dictSettings: message.dictSettings || {} });
            if (this.enabled) await this.reprocessPage();
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'signPayload':
          try {
            if (!window.securityHelper) {
              sendResponse({ success: false, error: 'security_helper_not_loaded' });
              break;
            }
            const signedPayload = await window.securityHelper.signPayload(message.payload);
            sendResponse({ success: true, signedPayload });
          } catch (error) {
            console.error('签名失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'getPageTextForReader':
          try {
            console.log('AGF→Reader: 获取全文开始');
            const pageUrl = window.location.href;
            let canonicalUrl = pageUrl;
            try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) canonicalUrl = link.href; } catch (_) {}
            let saved = '';
            try {
              const bgRes = await new Promise((resolve) => {
                try { chrome.runtime.sendMessage({ action: 'agfTestGetTextForPage', pageUrl, canonicalUrl }, (res) => resolve(res)); } catch (_) { resolve(null); }
              });
              if (bgRes && bgRes.success && typeof bgRes.text === 'string') saved = String(bgRes.text || '');
            } catch (_) {}
            if (saved && saved.trim().length >= 50) {
              console.log('AGF→Reader: 使用已保存全文', { length: saved.length });
              const title = (document.title || '').trim();
              sendResponse({ success: true, text: saved, title });
              break;
            }
            let { text, title } = await this.extractBestTextAndTitle();
            if ((!text || text.length < 200)) {
              try {
                const spans = Array.from(document.querySelectorAll('.textLayer span'));
                if (spans.length) {
                  const joined = spans.map(sp => this.normalizeText(sp.textContent || '')).filter(t => t && t.length > 1).join('\n');
                  if (joined && joined.length > text.length) text = joined;
                  console.log('AGF→Reader: PDF文本层复用', { spans: spans.length, length: (joined || '').length });
                }
              } catch (_) {}
            }
            console.log('AGF→Reader: 获取全文完成', { length: (text || '').length, title });
            sendResponse({ success: true, text, title });
          } catch (error) {
            sendResponse({ success: false, error: error && error.message || 'extract_failed' });
          }
          break;
        case 'canProvideVisibleText':
          try {
            const host = (() => { try { return new URL(window.location.href).hostname; } catch(_) { return ''; } })();
            let blocked = [];
            try { const s = await chrome.storage.local.get(['paywallBlockedDomains']); blocked = Array.isArray(s.paywallBlockedDomains) ? s.paywallBlockedDomains : []; } catch(_){ }
            const DEFAULT_BLOCKED = [
              'qidian.com','youdubook.com','webnovel.com','jjwxc.net','m.jjwxc.net','zongheng.com','17k.com','yunqi.qq.com','hongxiu.com','xxsy.net','faloo.com','ciweimao.com','weread.qq.com','zhangyue.com','shuqi.com','migu.cn','read.douban.com','read.amazon.com','kindlecloudreader.com'
            ];
            const blockedSet = new Set([ ...DEFAULT_BLOCKED, ...blocked ]);
            if (host && blockedSet.has(host)) { sendResponse({ success: true, available: false, reason: '付费或受限站点' }); break; }
            const hasPdfLayer = !!document.querySelector('.textLayer span');
            let visibleLen = 0;
            function textFrom(el){
              if (!el) return '';
              const style = getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return '';
              const rect = el.getBoundingClientRect();
              if (rect.width <= 0 || rect.height <= 0) return '';
              return (el.innerText || '').trim();
            }
            if (hasPdfLayer) {
              const spans = Array.from(document.querySelectorAll('.textLayer span'));
              const joined = spans.map(sp => textFrom(sp)).filter(t => t && t.length > 0).join('\n');
              visibleLen = joined.length;
            } else {
              const candidates = [ 'main', 'article', '[role="main"]' ];
              let buf = '';
              for (const sel of candidates) {
                const el = document.querySelector(sel);
                if (el) { buf += '\n' + textFrom(el); }
              }
              if (!buf || buf.length < 50) buf = textFrom(document.body);
              visibleLen = (buf || '').length;
            }
            // 付费遮罩/文案检测
            const paywallHints = ['付费','会员','订阅','登录后可阅读','购买后可读','仅会员可见','解锁全文'];
            let hintBlocked = false;
            try {
              const bodyText = (document.body && document.body.innerText) ? document.body.innerText : '';
              hintBlocked = paywallHints.some(h => bodyText.includes(h));
            } catch(_){ }
            // 大遮罩检测
            let overlayBlocked = false;
            try {
              const els = Array.from(document.querySelectorAll('div,section'));
              const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
              const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
              overlayBlocked = els.some(el => {
                const st = getComputedStyle(el);
                if (st.position !== 'fixed') return false;
                const r = el.getBoundingClientRect();
                const coverRatio = (Math.min(r.width, vw) * Math.min(r.height, vh)) / (vw * vh);
                return coverRatio > 0.6 && parseInt(st.zIndex || '0', 10) >= 1000 && st.pointerEvents !== 'none';
              });
            } catch(_){ }
            if (hintBlocked || overlayBlocked) { sendResponse({ success: true, available: false, reason: '站点限制' }); break; }
            const available = visibleLen >= (hasPdfLayer ? 50 : 200);
            sendResponse({ success: true, available, reason: available ? 'ok' : '内容不足', length: visibleLen });
          } catch (error) {
            sendResponse({ success: false, available: false, reason: '异常' });
          }
          break;
        case 'deliverPayloadToReader':
          try {
            const pl = message && message.payload ? message.payload : null;
            if (!pl || typeof pl !== 'object') { sendResponse({ success: false, error: 'no_payload' }); break; }
            console.log('AGF→Reader: 发送postMessage', { type: 'AGF_DOC_V1', title: pl && pl.title, length: (pl && pl.content ? String(pl.content).length : 0) });
            window.postMessage({ type: 'AGF_DOC_V1', payload: pl }, '*');
            console.log('AGF→Reader: postMessage已发出');
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error && error.message || 'post_failed' });
          }
          break;
        case 'openReaderAndSend':
          try {
            const pl = message && message.payload ? message.payload : null;
            if (!pl || typeof pl !== 'object') { sendResponse({ success: false, error: 'no_payload' }); break; }
            
            // 辅助函数：重新签名payload（生成新的nonce和timestamp）
            const resignPayload = async (originalPayload) => {
              if (!window.securityHelper) return originalPayload;
              try {
                // 移除旧的安全信息
                const cleanPayload = { ...originalPayload };
                delete cleanPayload._security;
                // 重新签名
                return await window.securityHelper.signPayload(cleanPayload);
              } catch (e) {
                console.warn('重新签名失败:', e);
                return originalPayload;
              }
            };
            
            const jsonStr = JSON.stringify(pl);
            let base = 'https://v7.readgofly.online';
            try { const o = await chrome.storage.local.get(['agfReaderBaseUrl']); if (o && o.agfReaderBaseUrl) base = String(o.agfReaderBaseUrl); } catch (_){ }
            const url = base + (base.endsWith('/') ? '' : '/') + '?from=plugin';
            console.log('AGF→Reader: 打开Reader窗口', { bytes: jsonStr.length });
            const w = window.open(url);
            if (!w) {
              try {
                const utf8 = new TextEncoder().encode(jsonStr);
                let bin = '';
                for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
                const b64 = btoa(bin);
                const fallbackUrl = base + (base.endsWith('/') ? '' : '/') + '?from=plugin&agf_import=' + encodeURIComponent(b64) + '&agf-import=' + encodeURIComponent(b64);
                console.log('AGF→Reader: 无法建立opener，使用URL备通道', { bytes: jsonStr.length });
                window.open(fallbackUrl);
                sendResponse({ success: true, posted: false, fallback: true });
              } catch (e) {
                sendResponse({ success: false, error: 'window_open_failed' });
              }
              break;
            }
            console.log('AGF→Reader: Reader窗口已打开，等待就绪');
            let ready = false;
            let sentOnce = false;
            let confirmed = false;
            const handler = async (e) => {
              const d = e && e.data;
              if (!d || typeof d !== 'object') return;
              if (d.type === 'AGF_READER_READY') {
                console.log('AGF→Reader: 就绪握手收到');
                ready = true;
                if (!sentOnce) {
                  try { 
                    const freshPayload = await resignPayload(pl);
                    w.postMessage({ type: 'AGF_DOC_V1', payload: freshPayload }, '*'); 
                    sentOnce = true; 
                    console.log('AGF→Reader: 已发送（新签名）'); 
                  } catch (_) {}
                }
              } else if (d.type === 'AGF_DOC_RECEIVED') {
                confirmed = true;
                console.log('AGF→Reader: 已确认接收');
                try { window.removeEventListener('message', handler); } catch (_){ }
              }
            };
            window.addEventListener('message', handler);
            setTimeout(async () => {
              if (!ready && !sentOnce) {
                try { 
                  const freshPayload = await resignPayload(pl);
                  w.postMessage({ type: 'AGF_DOC_V1', payload: freshPayload }, '*'); 
                  sentOnce = true; 
                  console.log('AGF→Reader: 超时未就绪，已发送（新签名）'); 
                } catch (_) {}
              }
            }, 1200);
            setTimeout(async () => {
              if (!confirmed && sentOnce) {
                try { 
                  const freshPayload = await resignPayload(pl);
                  w.postMessage({ type: 'AGF_DOC_V1', payload: freshPayload }, '*'); 
                  console.log('AGF→Reader: 未确认，重试一次（新签名）'); 
                } catch (_) {}
              }
            }, 2400);
            sendResponse({ success: true, posted: true });
          } catch (error) {
            sendResponse({ success: false, error: error && error.message || 'open_send_failed' });
          }
          break;
        case 'agfLogProgress':
          try {
            const text = (message && message.text) ? String(message.text) : '';
            if (text) console.log('AGF→Reader:', text);
            sendResponse && sendResponse({ ok: true });
          } catch (e) { sendResponse && sendResponse({ ok: false }); }
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
        case 'aiChatStreamDelta':
          if (this.__onAiStreamDelta && message && typeof message.delta === 'string') this.__onAiStreamDelta(message.delta);
          sendResponse({ success: true });
          break;
        case 'aiChatStreamDone':
          if (this.__onAiStreamDone) this.__onAiStreamDone();
          sendResponse({ success: true });
          break;
        case 'aiChatStreamError':
          try {
            const err = (message && typeof message.error === 'string' && message.error) ? message.error : '请求失败';
            showStickyToast(err);
            const aIndex = chatMessages.length;
            chatMessages.push({ role: 'assistant', content: err });
            appendMessage('assistant', err, { highlight: true, msgIndex: aIndex });
            try { await saveConversationSnapshot(); } catch (_) {}
            streamingText = '';
            streamingBubble = null;
            streamingContentEl = null;
          } catch (_) {}
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
        case 'collectAndStorePageSegments':
          try {
            const result = await this.collectAndStorePageSegments();
            sendResponse({ success: true, result });
          } catch (error) {
            console.error('采集与存储失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'clearPageSegments':
          try {
            const scope = typeof message.scope === 'string' ? message.scope : 'page';
            await this.clearPageSegments(scope);
            sendResponse({ success: true });
          } catch (error) {
            console.error('清理页面段失败:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'storeSegments':
          try {
            const sections = Array.isArray(message.sections) ? message.sections : [];
            if (sections.length) {
              console.log('📥 采集到的文本:', { sectionsCount: sections.length, sections });
              const stored = await this.storePageSegments(sections);
              sendResponse({ success: true, result: stored });
            } else {
              sendResponse({ success: false, error: 'no_sections' });
            }
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'notifyOffscreenPdfError':
          try {
            console.error('OFFSCREEN_PDF_ERROR:', message.error);
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;
        case 'notifyOffscreenPdfLibStatus':
          try {
            console.log('OFFSCREEN_PDF_LIB_STATUS:', message.present ? 'present' : 'missing');
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
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
      const unset = typeof result.enabled === 'undefined';
      const shouldEnable = unset ? true : !!result.enabled;
      if (shouldEnable) {
        await this.enable();
      }
      if (unset) {
        await chrome.storage.local.set({ enabled: true });
      }
    } catch (error) {
      console.error('加载存储状态失败:', error);
    }
  }

  setupPageBridge() {
    window.addEventListener('message', async (e) => {
      const d = e && e.data ? e.data : null;
      if (!d) return;
      if (e.source !== window) return;
      if (d.__agf && d.type === 'COLLECT_SEGMENTS') {
        try {
          const r = await this.collectAndStorePageSegments();
          window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_DONE', result: r }, '*');
        } catch (error) {
          window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_ERROR', error: String(error && error.message || error) }, '*');
        }
      } else if (d.__agf && d.type === 'COLLECT_SEGMENTS_PDF') {
        try {
          const r = await this.collectPdfSegments();
          window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_PDF_DONE', result: r }, '*');
        } catch (error) {
          window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_PDF_ERROR', error: String(error && error.message || error) }, '*');
        }
      } else if (d.__agf && d.type === 'COLLECT_SEGMENTS_DYNAMIC') {
        try {
          const dur = typeof d.durationMs === 'number' ? d.durationMs : 5000;
          const r = await this.collectDynamicSegments(dur);
          window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_DYNAMIC_DONE', result: r }, '*');
        } catch (error) {
          window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_DYNAMIC_ERROR', error: String(error && error.message || error) }, '*');
        }
      } else if (d.__agf && d.type === 'COLLECT_SEGMENTS_PDF_URL') {
        try {
          let url = d.url;
          if (typeof url !== 'string') url = String(url || '');
          url = url.replace(/`/g, '').trim().replace(/^\s+|\s+$/g, '').replace(/^['"]+|['"]+$/g, '');
          if (url) {
            await chrome.runtime.sendMessage({ action: 'collectPdfFromUrl', url });
            window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_PDF_URL_ACCEPTED' }, '*');
          } else {
            window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_PDF_URL_ERROR', error: 'no_url' }, '*');
          }
        } catch (error) {
          window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_PDF_URL_ERROR', error: String(error && error.message || error) }, '*');
        }
      }
    });
  }

  injectCollectHelper() {
    const s = document.createElement('script');
    s.textContent = "(function(){ if (!window.__AGF_COLLECT_SEGMENTS__) { window.__AGF_COLLECT_SEGMENTS__ = function(){ try { window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS' }, '*'); } catch(e){} }; } if (!window.__AGF_COLLECT_PDF_SEGMENTS__) { window.__AGF_COLLECT_PDF_SEGMENTS__ = function(){ try { window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_PDF' }, '*'); } catch(e){} }; } if (!window.__AGF_COLLECT_DYNAMIC_SEGMENTS__) { window.__AGF_COLLECT_DYNAMIC_SEGMENTS__ = function(dur){ try { window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_DYNAMIC', durationMs: dur }, '*'); } catch(e){} }; } if (!window.__AGF_COLLECT_PDF_URL_SEGMENTS__) { window.__AGF_COLLECT_PDF_URL_SEGMENTS__ = function(url){ try { window.postMessage({ __agf: true, type: 'COLLECT_SEGMENTS_PDF_URL', url: url }, '*'); } catch(e){} }; } })();";
    (document.documentElement || document.head || document.body).appendChild(s);
  }

  async applyArticleDictionary(dictionary, registryEntry, dictSettings) {
    if (!dictionary || !registryEntry || !this.dictionaryManager || !this.dictionaryManager.newManager) {
      throw new Error('词典管理器尚未准备好');
    }
    const manager = this.dictionaryManager.newManager;
    if (!manager.registry) await manager.loadRegistry();
    if (!Array.isArray(manager.registry.local)) manager.registry.local = [];
    const existing = manager.registry.local.findIndex(item => item.id === registryEntry.id);
    if (existing >= 0) manager.registry.local[existing] = registryEntry;
    else manager.registry.local.push(registryEntry);
    manager.loadedDictionaries.set(registryEntry.id, dictionary);
    this.dictionaryManager.updateEnabledDictionaries(dictSettings || {});
    await chrome.storage.local.set({ dictSettings: dictSettings || {} });
    if (this.enabled) await this.reprocessPage();
    return true;
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

    try {
      const currentUrl = window.location.href;
      if (this.streamingPageProcessor && this.streamingPageProcessor.nodeLevelCacheManager) {
        await this.streamingPageProcessor.nodeLevelCacheManager.invalidatePageCache(currentUrl);
      }
      if (this.eventCacheManager && typeof this.eventCacheManager.clearHighlightsByUrl === 'function') {
        await this.eventCacheManager.clearHighlightsByUrl(currentUrl);
      }
    } catch (e) {
      console.warn('清空页面缓存失败:', e);
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

      const isEmptyVocab = !vocabularyStats || (
        (!vocabularyStats.nouns || vocabularyStats.nouns.length === 0) &&
        (!vocabularyStats.verbs || vocabularyStats.verbs.length === 0) &&
        (!vocabularyStats.adjectives || vocabularyStats.adjectives.length === 0)
      );

      if (isEmptyVocab) {
        // 优先尝试从存储读取（刷新后可用）
        const stored = await this.loadVocabularyStatsForPage();
        if (stored && (
          (stored.nouns && stored.nouns.length) ||
          (stored.verbs && stored.verbs.length) ||
          (stored.adjectives && stored.adjectives.length)
        )) {
          vocabularyStats = stored;
        } else {
          // 回退：直接从DOM统计
          const domStats = this.collectVocabularyFromDOM();
          if (domStats && (
            (domStats.nouns && domStats.nouns.length) ||
            (domStats.verbs && domStats.verbs.length) ||
            (domStats.adjectives && domStats.adjectives.length)
          )) {
            vocabularyStats = domStats;
            // 顺便保存一份，便于后续刷新快速加载
            await this.saveVocabularyStatsForPage(domStats);
          }
        }
      }
      if (vocabularyStats) {
        await this.saveVocabularyStatsForPage(vocabularyStats);
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

  collectVocabularyFromDOM() {
    const collect = (selector) => {
      const map = new Map();
      document.querySelectorAll(selector).forEach(el => {
        const w = (el.getAttribute('data-word') || el.textContent || '').trim().toLowerCase();
        if (!w) return;
        map.set(w, (map.get(w) || 0) + 1);
      });
      return Array.from(map.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      nouns: collect('.adhd-n'),
      verbs: collect('.adhd-v'),
      adjectives: collect('.adhd-a')
    };
  }

  getPageStorageKey() {
    const canonical = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = canonical ? canonical.href : null;
    const url = canonicalUrl || window.location.href;
    return url;
  }

  async saveVocabularyStatsForPage(stats) {
    if (!stats) return;
    const key = this.getPageStorageKey();
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['vocabStatsByUrl'], (data) => {
          const bucket = data.vocabStatsByUrl || {};
          bucket[key] = {
            stats,
            updatedAt: Date.now()
          };
          chrome.storage.local.set({ vocabStatsByUrl: bucket }, () => resolve(true));
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  async loadVocabularyStatsForPage() {
    const key = this.getPageStorageKey();
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(['vocabStatsByUrl'], (data) => {
          const bucket = data.vocabStatsByUrl || {};
          const entry = bucket[key];
          resolve(entry ? entry.stats : null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  async segmentsDbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('agf_segments_db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('page_segments')) {
          const store = db.createObjectStore('page_segments', { keyPath: 'id' });
          store.createIndex('runId', 'runId');
          store.createIndex('pageUrl', 'pageUrl');
          store.createIndex('sectionId', 'sectionId');
          store.createIndex('timestamp', 'timestamp');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async clearPageSegments(scope = 'page') {
    const db = await this.segmentsDbOpen();
    const pageUrl = window.location.href;
    let canonicalUrl = pageUrl;
    try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) canonicalUrl = link.href; } catch (_) {}
    const domain = (new URL(pageUrl)).hostname;
    await new Promise((resolve) => {
      const tx = db.transaction('page_segments', 'readwrite');
      const st = tx.objectStore('page_segments');
      const req = st.openCursor();
      req.onsuccess = (ev) => {
        const cursor = ev.target.result;
        if (cursor) {
          const val = cursor.value;
          let match = false;
          if (scope === 'page') match = val && (val.pageUrl === pageUrl || val.canonicalUrl === canonicalUrl);
          else if (scope === 'domain') match = val && val.domain === domain;
          else match = true;
          if (match) { cursor.delete(); cursor.continue(); } else { cursor.continue(); }
        } else {
          resolve(true);
        }
      };
      req.onerror = () => resolve(false);
    });
    return true;
  }

  normalizeText(t) {
    return t.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[ \t\f\v]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  }

  isHiddenEl(el) {
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return true;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return true;
    return false;
  }

  isExcludedTag(el) {
    const tag = el.tagName.toLowerCase();
    if (['script','style','noscript','svg','canvas'].includes(tag)) return true;
    if (['header','footer','nav','aside'].includes(tag)) return true;
    try {
      const role = el.getAttribute('role') || '';
      if (/^(navigation|banner|contentinfo|complementary)$/i.test(role)) return true;
      const cls = (typeof el.className === 'string' ? el.className : (el.className ? String(el.className) : '')).toLowerCase();
      if (/(sidebar|footer|navbar|breadcrumb|menu|tabs|pagination|widget|recommend|related|guwen|console|dashboard|setting|account|profile|help|support)/.test(cls)) return true;
      const id = (typeof el.id === 'string' ? el.id : '').toLowerCase();
      if (/(sidebar|footer|navbar|breadcrumb|menu|tabs|pagination|widget|recommend|related|guwen|console|dashboard|setting|account|profile|help|support)/.test(id)) return true;
    } catch (_) {}
    return false;
  }

  hasExcludedClass(el) {
    const cls = typeof el.className === 'string' ? el.className : (el.className ? String(el.className) : '');
    return cls.includes('adhd-processed') || cls.includes('adhd-highlight');
  }

  isExtensionUi(el) {
    if (!el) return false;
    if (el.closest && el.closest('[class*="agf-"]')) return true;
    const id = typeof el.id === 'string' ? el.id : '';
    if (id && id.startsWith('agf')) return true;
    try {
      const s = window.getComputedStyle(el);
      const zi = parseInt(s.zIndex || '0', 10);
      if (s.position === 'fixed' && zi >= 2147483000) return true;
    } catch (_) {}
    return false;
  }

  isNavigationText(s) {
    const t = String(s || '').trim();
    if (!t) return false;
    const nav = new Set([
      'Product','Use Cases','Pricing','Blog','Resources','Download','Docs','Changelog','Experience liftoff','About Google','Google Products','Privacy','Terms',
      '推荐','诗文','名句','作者','古籍','我的','APP','完善','展开阅读全文','猜你喜欢','猜您喜欢','帮助中心','技术社群','控制台','应用空间','体验中心','开发文档','特惠专区','财务','设置','账号设置','实名认证','授权管理','项目管理','速率限制','用户权益','安全管理','工单记录'
    ]);
    if (nav.has(t)) return true;
    if (t.length <= 20 && (
      /^(Product|Pricing|Blog|Docs|Download|Terms|Privacy)$/i.test(t) ||
      /^(推荐|诗文|名句|作者|古籍|我的|完善|帮助中心|技术社群|控制台|应用空间|体验中心|开发文档|特惠专区|财务|设置|账号设置|实名认证|授权管理|项目管理|速率限制|用户权益|安全管理|工单记录)$/.test(t)
    )) return true;
    return false;
  }

  isCssOrAdText(s) {
    const t = String(s || '');
    const lower = t.toLowerCase();
    if (!t.trim()) return false;
    if (lower.indexOf('adsbygoogle') >= 0 || lower.indexOf('googletag') >= 0 || lower.indexOf('doubleclick') >= 0) return true;
    if (/[{};]/.test(t) && (lower.indexOf('display')>=0 || lower.indexOf('width')>=0 || lower.indexOf('height')>=0 || lower.indexOf('margin')>=0 || lower.indexOf('padding')>=0 || lower.indexOf('text-align')>=0 || lower.indexOf('position')>=0)) return true;
    if (/@media\b/.test(t)) return true;
    if (/function\b|\bvar\b|\blet\b|\bconst\b|=>|\(\s*\)\s*=>/.test(t)) return true;
    const punct = (t.match(/[{};<>\[\]()$]/g) || []).length;
    if (punct > Math.max(10, Math.floor(t.length * 0.25))) return true;
    return false;
  }

  smartTruncate(s, limit) {
    const t = String(s || '');
    if (t.length <= limit) return t;
    const cut = t.slice(0, limit);
    const idxs = [cut.lastIndexOf('。'), cut.lastIndexOf('！'), cut.lastIndexOf('？'), cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'), cut.lastIndexOf('\n')];
    const idx = Math.max.apply(null, idxs);
    if (idx > Math.floor(limit * 0.6)) return cut.slice(0, idx + 1);
    return cut;
  }

  elText(el) {
    if (!el) return '';
    if (el.matches('input,textarea') || el.isContentEditable) return '';
    return this.normalizeText(el.innerText || el.textContent || '');
  }

  approxTokensPerChar(text) {
    const cjk = /[\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf\uff00-\uffef]/.test(text);
    return cjk ? 1.0 : 0.75;
  }

  collectPageSections() {
    const globalSeen = new Set();
    const collectFromRoot = (root) => {
      const mainCandidates = [];
      try {
        const selectors = [
          'main',
          'article',
          '[role="main"]',
          '.content,.main,.article,.post,.entry,.markdown-body,.blog-content,.detail-content,.post-content',
          '#content,#main,#article,#post,#entry,#detail'
        ];
        selectors.forEach(sel => {
          root.querySelectorAll(sel).forEach(el => { if (el && !this.isExtensionUi(el)) mainCandidates.push(el); });
        });
      } catch (_) {}
      const scope = mainCandidates.length ? mainCandidates : [root];
      const arr = [];
      let current = null;
      let order = 0;
      const nodes = [];
      scope.forEach(sc => { sc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,article,section,div').forEach(n => nodes.push(n)); });
      nodes.forEach(el => {
        if (this.isHiddenEl(el)) return;
        if (this.isExcludedTag(el)) return;
        if (this.hasExcludedClass(el)) return;
        if (this.isExtensionUi(el)) return;
        const tag = el.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
          if (current && current.blocks.length) arr.push(current);
          const title = this.elText(el);
          current = { sectionId: 'sec-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), sectionTitle: title, headingPath: tag + ':' + title, blocks: [] };
          order = 0;
          return;
        }
        const text = this.elText(el);
        if (!text || text.length < 2) return;
        if (this.isNavigationText(text)) return;
        const key = text.length + ':' + text.slice(0, 300);
        if (globalSeen.has(key)) return;
        globalSeen.add(key);
        if (!current) current = { sectionId: 'root', sectionTitle: 'ROOT', headingPath: 'root', blocks: [] };
        current.blocks.push({ text, orderIndex: order++ });
      });
      if (current && current.blocks.length) arr.push(current);
      return arr;
    };
    let sections = collectFromRoot(document);
    const shadows = [];
    document.querySelectorAll('*').forEach(el => { if (el.shadowRoot) shadows.push(el.shadowRoot); });
    shadows.forEach(sr => { try { sections = sections.concat(collectFromRoot(sr)); } catch (_) {} });
    const iframes = Array.from(document.querySelectorAll('iframe'));
    iframes.forEach(fr => {
      try {
        const doc = fr.contentDocument;
        if (doc) sections = sections.concat(collectFromRoot(doc));
      } catch (_) {}
    });
    console.log('📥 采集到的文本:', { sectionsCount: sections.length, sections });
    return sections;
  }

  async sha256Hex(s) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async storePageSegments(sections) {
    const db = await this.segmentsDbOpen();
    const pageUrl = window.location.href;
    const domain = (new URL(pageUrl)).hostname;
    let canonicalUrl = pageUrl;
    try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) { canonicalUrl = link.href; } } catch (_) {}
    const runId = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
    const maxLen = 10000;
    const results = [];
    const seenBlocks = new Set();
    const seenSegmentHashes = new Set();
    const uiTokens = getUiTokens();
    for (const sec of sections) {
      let bufLen = 0;
      let chunkBlocks = [];
      let idx = 0;
      for (const b of sec.blocks) {
        const filterOn = await (async()=>{ try { const r = await chrome.storage.local.get(['privacySensitiveFilterEnabled']); return !!r.privacySensitiveFilterEnabled; } catch(_) { return false; } })();
        if (filterOn) {
          const t = String(b.text||'');
          const isPII = /\b1[3-9]\d{9}\b/.test(t) || /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(t) || /\b\d{15,19}\b/.test(t) || /\b\d{17}[\dXx]\b/.test(t);
          if (isPII) continue;
        }
        const tnorm = this.normalizeText(String(b.text||''));
        if (uiTokens.has(tnorm)) continue;
        const bk = tnorm.length + ':' + tnorm.slice(0,300);
        if (seenBlocks.has(bk)) continue;
        seenBlocks.add(bk);
        const l = tnorm.length;
        if (bufLen + l > maxLen && chunkBlocks.length) {
          const text = chunkBlocks.map(x => this.normalizeText(String(x.text||''))).join('\n');
          const textLength = text.length;
          const approxTokens = Math.ceil(textLength * this.approxTokensPerChar(text));
          const textHash = await this.sha256Hex(text);
          const pageIndex = /^pdf-(\d+)$/.test(sec.sectionId||'') ? parseInt((sec.sectionId||'').split('-')[1],10) : null;
          const rec = { id: 'seg-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), runId, pageUrl, sourceUrl: pageUrl, canonicalUrl, pageIndex, domain, timestamp: Date.now(), sectionId: sec.sectionId, sectionTitle: sec.sectionTitle, outlinePath: sec.outlinePath || null, outlineLevel: typeof sec.outlineLevel === 'number' ? sec.outlineLevel : 0, orderIndex: idx++, textLength, approxTokens, textHash, blocks: chunkBlocks.slice(), vocabularyStats: null };
          if (seenSegmentHashes.has(textHash)) { chunkBlocks = []; bufLen = 0; continue; }
          seenSegmentHashes.add(textHash);
          await new Promise((resolve, reject) => { const tx = db.transaction('page_segments', 'readwrite'); const st = tx.objectStore('page_segments'); const rq = st.put(rec); rq.onsuccess = () => resolve(true); rq.onerror = () => reject(rq.error); });
          results.push(rec);
          chunkBlocks = [];
          bufLen = 0;
        }
        chunkBlocks.push({ text: tnorm, orderIndex: b.orderIndex });
        bufLen += l;
      }
      if (chunkBlocks.length) {
        const text = chunkBlocks.map(x => this.normalizeText(String(x.text||''))).join('\n');
        const textLength = text.length;
        const approxTokens = Math.ceil(textLength * this.approxTokensPerChar(text));
        const textHash = await this.sha256Hex(text);
        const pageIndex = /^pdf-(\d+)$/.test(sec.sectionId||'') ? parseInt((sec.sectionId||'').split('-')[1],10) : null;
        const rec = { id: 'seg-' + Date.now() + '-' + Math.random().toString(36).slice(2,8), runId, pageUrl, sourceUrl: pageUrl, canonicalUrl, pageIndex, domain, timestamp: Date.now(), sectionId: sec.sectionId, sectionTitle: sec.sectionTitle, outlinePath: sec.outlinePath || null, outlineLevel: typeof sec.outlineLevel === 'number' ? sec.outlineLevel : 0, orderIndex: idx++, textLength, approxTokens, textHash, blocks: chunkBlocks.slice(), vocabularyStats: null };
        if (seenSegmentHashes.has(textHash)) { chunkBlocks = []; bufLen = 0; continue; }
        seenSegmentHashes.add(textHash);
        await new Promise((resolve, reject) => { const tx = db.transaction('page_segments', 'readwrite'); const st = tx.objectStore('page_segments'); const rq = st.put(rec); rq.onsuccess = () => resolve(true); rq.onerror = () => reject(rq.error); });
        results.push(rec);
      }
    }
    console.log('💾 存储的文本:', { segmentsCount: results.length, segments: results.map(r => ({ id: r.id, sectionTitle: r.sectionTitle, textLength: r.textLength, approxTokens: r.approxTokens, preview: (r.blocks && r.blocks.length ? r.blocks.map(b => b.text).join('\n').slice(0, 400) : '') })) });
    try {
      const r = await chrome.storage.local.get(['pageSegmentsRetentionDays']);
      const days = r.pageSegmentsRetentionDays !== undefined ? parseInt(r.pageSegmentsRetentionDays,10) : 7;
      const cutoff = Date.now() - days*24*60*60*1000;
      const tx = db.transaction('page_segments','readwrite');
      const st = tx.objectStore('page_segments');
      const req = st.openCursor();
      req.onsuccess = (ev)=>{ const cursor = ev.target.result; if (cursor) { const val = cursor.value; if (val && val.timestamp && val.timestamp < cutoff) { cursor.delete(); cursor.continue(); } else { cursor.continue(); } } };
    } catch(_) {}
    return { runId, segmentsCount: results.length };
  }

  async collectAndStorePageSegments() {
    const sections = this.collectPageSections();
    const stored = await this.storePageSegments(sections);
    return { collectedSections: sections.length, storedSegments: stored.segmentsCount, runId: stored.runId };
  }

  async collectPdfSegments() {
    const sections = [];
    const textLayers = Array.from(document.querySelectorAll('.textLayer'));
    if (textLayers.length > 0) {
      let order = 0;
      textLayers.forEach((layer, idx) => {
        const spans = Array.from(layer.querySelectorAll('span'));
        const blocks = [];
        let localOrder = 0;
        spans.forEach(sp => {
          const t = this.normalizeText(sp.textContent || '');
          if (t && t.length > 1) blocks.push({ text: t, orderIndex: localOrder++ });
        });
        if (blocks.length) {
          const pageEl = layer.closest('.page');
          const pageNo = pageEl && pageEl.getAttribute('data-page-number') ? pageEl.getAttribute('data-page-number') : String(idx + 1);
          sections.push({ sectionId: 'pdf-' + pageNo, sectionTitle: 'PDF Page ' + pageNo, headingPath: 'pdf:' + pageNo, blocks });
          order += blocks.length;
        }
      });
    }
    if (sections.length === 0) {
      const embeds = document.querySelectorAll('embed[type="application/pdf"], object[type="application/pdf"], iframe[src*=".pdf"], a[href$=".pdf"]');
      console.log('📥 采集到的文本-PDF占位:', { candidates: embeds.length });
      return { collectedSections: 0, storedSegments: 0, runId: null };
    }
    console.log('📥 采集到的文本-PDF:', { sectionsCount: sections.length, sections });
    const stored = await this.storePageSegments(sections);
    return { collectedSections: sections.length, storedSegments: stored.segmentsCount, runId: stored.runId };
  }

  async collectDynamicSegments(durationMs = 5000) {
    const section = { sectionId: 'dynamic-' + Date.now(), sectionTitle: 'DYNAMIC', headingPath: 'dynamic', blocks: [] };
    const seen = new Set();
    const addBlock = (t) => {
      const text = this.normalizeText(t || '');
      if (!text || text.length < 2) return;
      const key = text.slice(0, 200);
      if (seen.has(key)) return;
      seen.add(key);
      section.blocks.push({ text: text, orderIndex: section.blocks.length });
    };
    const scan = () => {
      const selector = 'article,section,[role="article"],[role="feed"],[role="main"],[data-testid],.post,.tweet,.update,.card,.entry,.item,.list-item,.feed-item,.story,.message,.comment,.feed,.timeline';
      const els = document.querySelectorAll(selector);
      els.forEach(el => {
        if (this.isHiddenEl(el)) return;
        if (this.isExtensionUi(el)) return;
        const txt = el.innerText || el.textContent || '';
        if (!txt || txt.trim().length < 6) return;
        addBlock(txt);
      });
    };
    scan();
    const mo = new MutationObserver((muts) => {
      muts.forEach(m => {
        m.addedNodes && m.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const el = node;
            if (this.isHiddenEl(el)) return;
            if (this.isExtensionUi(el)) return;
            const txt = el.innerText || el.textContent || '';
            if (!txt || txt.trim().length < 6) return;
            addBlock(txt);
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    await new Promise(r => setTimeout(r, durationMs));
    try { mo.disconnect(); } catch (_) {}
    const sections = section.blocks.length ? [section] : [];
    console.log('📥 采集到的文本-动态页面:', { sectionsCount: sections.length, sections });
    if (!sections.length) return { collectedSections: 0, storedSegments: 0, runId: null };
    const stored = await this.storePageSegments(sections);
    return { collectedSections: sections.length, storedSegments: stored.segmentsCount, runId: stored.runId };
  }

  async testCollectAndSaveText() {
    const pageUrl = window.location.href;
    let canonicalUrl = pageUrl;
    try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) canonicalUrl = link.href; } catch (_) {}
    let candidates = [];
    try {
      const sels = ['main','article','[role="main"]','.markdown-body','.theme-doc-markdown','.content','.post','.entry','.article','.docItemContainer','#content','#main','#article','#post','#entry','#detail'];
      sels.forEach(sel => { document.querySelectorAll(sel).forEach(el => { if (el && !this.isExtensionUi(el)) candidates.push(el); }); });
    } catch (_) {}
    if (!candidates.length) candidates = [document.body];
    let best = '';
    let bestLen = -1;
    for (const el of candidates) {
      try {
        const t = String(el.innerText || el.textContent || '').trim();
        const n = this.normalizeText(t);
        if (n && n.length > bestLen) { best = n; bestLen = n.length; }
      } catch (_) {}
    }
    if (!best || best.length < 10) {
      try { const t = String(document.body && (document.body.innerText || document.body.textContent) || '').trim(); best = this.normalizeText(t); } catch (_) {}
    }
    const text = best || '';
    const textLength = text.length;
    const textHash = await this.sha256Hex(text);
    let title = '';
    try { const h1 = document.querySelector('h1'); if (h1 && h1.textContent) title = h1.textContent.trim(); } catch (_) {}
    if (!title) title = (document.title || '').trim();
    const domain = (new URL(pageUrl)).hostname;
    return await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'agfTestSaveText', data: { pageUrl, canonicalUrl, domain, title, timestamp: Date.now(), text, textLength, textHash } }, (res) => {
        resolve(res && res.success ? { success: true } : { success: false, error: (res && res.error) || 'save_failed' });
      });
    });
  }

  async extractBestTextAndTitle() {
    const pageUrl = window.location.href;
    let canonicalUrl = pageUrl;
    try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) canonicalUrl = link.href; } catch (_) {}
    let candidates = [];
    try {
      const sels = ['main','article','[role="main"]','.markdown-body','.theme-doc-markdown','.content','.post','.entry','.article','.docItemContainer','#content','#main','#article','#post','#entry','#detail'];
      sels.forEach(sel => { document.querySelectorAll(sel).forEach(el => { if (el && !this.isExtensionUi(el)) candidates.push(el); }); });
    } catch (_) {}
    if (!candidates.length) candidates = [document.body];
    let best = '';
    let bestLen = -1;
    for (const el of candidates) {
      try {
        const t = String(el.innerText || el.textContent || '').trim();
        const n = this.normalizeText(t);
        if (n && n.length > bestLen) { best = n; bestLen = n.length; }
      } catch (_) {}
    }
    if (!best || best.length < 10) {
      try { const t = String(document.body && (document.body.innerText || document.body.textContent) || '').trim(); best = this.normalizeText(t); } catch (_) {}
    }
    const text = best || '';
    let title = '';
    try { const h1 = document.querySelector('h1'); if (h1 && h1.textContent) title = h1.textContent.trim(); } catch (_) {}
    if (!title) title = (document.title || '').trim();
    return { title, text, canonicalUrl };
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
      .agf-ai-overlay{position:fixed;display:none;flex-direction:column;background:#f8f9fc;border:1px solid #dfe5f2;z-index:2147483647;width:min(760px,70vw);height:min(720px,78vh);box-shadow:0 18px 48px rgba(23,32,51,.22);min-width:420px;min-height:520px;border-radius:14px;overflow:hidden;color:#172033}
      .agf-ai-header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #e5e9f0;background:#fff}
      .agf-ai-title{font-size:15px;font-weight:700;color:#172033;display:flex;align-items:center;gap:8px}
      .agf-ai-controls{display:inline-flex;gap:2px}
      .agf-ai-controls button{height:24px;min-width:24px;border:none;border-radius:0;background:transparent;color:#333;font-size:14px;line-height:24px;display:inline-flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}
      .agf-status{display:inline-flex;align-items:center;gap:4px;margin-left:4px}
      .agf-status-dot{width:10px;height:10px;border-radius:50%;border:1px solid #e0e0e0;background:#bbb}
      .agf-status-btn{height:20px;line-height:20px;padding:0 8px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;font-size:12px}
      .agf-status-btn[disabled]{opacity:0.5;cursor:not-allowed}
      .agf-refresh-btn{height:20px;width:20px;border:1px solid #e0e0e0;border-radius:50%;background:#fff;color:#333;display:inline-flex;align-items:center;justify-content:center;font-size:12px}
      .agf-refresh-btn.breathing{color:#b58900;border-color:#ffd24d;box-shadow:0 0 0 0 rgba(255,210,77,0.25);animation:agf-breath 2s ease-in-out infinite}
      @keyframes agf-breath{0%{box-shadow:0 0 0 0 rgba(255,210,77,0.25)}50%{box-shadow:0 0 8px 4px rgba(255,210,77,0.25)}100%{box-shadow:0 0 0 0 rgba(255,210,77,0.25)}}
      .agf-ai-tabs{display:inline-flex;gap:2px;margin-left:2px}
      .agf-ai-tabs button{height:24px;min-width:24px;border:none;border-radius:0;background:transparent;color:#333}
      .agf-ai-tabs button.active{background:#edf2ff;color:#2447c7}
      .agf-framework-bar{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid #e5e9f0;background:#fff;color:#687386;font-size:12px}
      .agf-context-tools{display:flex;align-items:center;gap:4px;min-width:0}
      .agf-context-btn{height:24px;padding:0 8px;border:1px solid #dfe5f2;border-radius:7px;background:#fff;color:#4b5870;font-size:12px;cursor:pointer}
      .agf-context-btn.active{border-color:#315efb;background:#edf2ff;color:#2447c7}
      .agf-context-summary{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:80px;flex:1}
      .agf-task-bar{display:flex;align-items:center;gap:4px;padding:6px 12px;border-bottom:1px solid #e5e9f0;background:#fbfcff}
      .agf-function-bar{display:flex;align-items:center;gap:8px;padding:5px 12px;border-bottom:1px solid #e5e9f0;background:#fff;min-width:0}.agf-function-bar .agf-ai-tabs{flex:0 0 auto}.agf-function-bar .agf-context-tools{display:flex;gap:4px;margin-left:auto}.agf-function-bar .agf-context-summary{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .agf-task-label{flex:0 0 auto;color:#687386;font-size:12px}
      .agf-task-actions{display:flex;align-items:center;gap:4px;min-width:0;overflow:auto}
      .agf-task-btn{height:26px;padding:0 8px;border:1px solid #dfe5f2;border-radius:7px;background:#fff;color:#315efb;font-size:12px;white-space:nowrap;cursor:pointer}
      .agf-task-btn:hover{background:#f7f9ff;border-color:#9db4ff}
      .agf-task-btn[disabled]{opacity:.5;cursor:not-allowed}
      .agf-ai-view-module{padding:16px;overflow:auto;background:#f8faff}
      .agf-module-card{max-width:760px;margin:0 auto;background:#fff;border:1px solid #dfe5f2;border-radius:14px;padding:18px;box-shadow:0 8px 22px rgba(23,32,51,.07)}
      .agf-module-heading{display:flex;justify-content:space-between;align-items:center;font-size:16px;font-weight:700;color:#172033;margin-bottom:12px}
      .agf-module-meta{font-size:11px;font-weight:400;color:#687386}.agf-module-result{min-height:150px;line-height:1.7;color:#26345b;white-space:normal}
      .agf-module-result .agf-vocab-card{border:1px solid #e1e6ef;border-radius:10px;padding:12px;margin:8px 0}.agf-vocab-card button{margin-top:8px}
      .agf-module-actions{display:flex;gap:8px;margin-top:14px}.agf-module-actions button{border:1px solid #dfe5f2;border-radius:8px;background:#fff;padding:7px 11px;color:#315efb;cursor:pointer}.agf-module-actions button.primary{background:#315efb;color:#fff;border-color:#315efb}.agf-module-actions button:disabled{opacity:.5;cursor:not-allowed}
      .agf-module-history{margin-top:18px;border-top:1px solid #edf0f6;padding-top:10px}.agf-history-row{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f0f2f6;font-size:12px}.agf-history-row button{padding:4px 7px;font-size:11px}
      .agf-image-dropzone{border:2px dashed #c9d5f2;border-radius:12px;padding:28px;text-align:center;color:#687386;background:#fbfcff}.agf-image-dropzone.dragover{border-color:#315efb;background:#f0f4ff}.agf-image-dropzone button{border:0;border-radius:8px;padding:8px 14px;background:#315efb;color:#fff;cursor:pointer}
      #agfAiViewImage{box-sizing:border-box}
      #agfAiViewImage .agf-module-card{min-height:0}
      #agfAiViewImage .agf-module-result{min-height:80px;padding-bottom:8px}
      #agfAiViewImage .agf-module-actions{position:sticky;bottom:0;z-index:4;margin:6px -18px -18px;padding:5px 12px;background:rgba(255,255,255,.96);border-top:1px solid #e1e6ef;box-shadow:0 -6px 18px rgba(23,32,51,.06);align-items:center;gap:6px}
      #agfAiViewImage .agf-module-actions button{padding:4px 8px;min-height:24px;font-size:11px;border-radius:7px}
      #agfAiViewImage .agf-image-select-all{display:inline-flex;align-items:center;gap:4px;margin-right:auto;color:#4b5870;font-size:11px;white-space:nowrap}
      #agfAiViewImage .agf-image-select-all input{margin:0}
      #agfAiViewImage .agf-page-image-card{display:grid;grid-template-columns:104px minmax(0,1fr);gap:10px;align-items:start;padding:8px}
      #agfAiViewImage .agf-page-image-head{grid-column:1 / -1;display:flex;align-items:center;gap:8px;min-width:0;font-size:12px;color:#26345b}
      #agfAiViewImage .agf-page-image-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #agfAiViewImage .agf-page-image-badge{margin-left:auto;border:1px solid #dfe5f2;border-radius:999px;padding:1px 7px;font-size:11px;color:#687386;background:#f7f8fb;white-space:nowrap}
      #agfAiViewImage .agf-page-image-badge.done{border-color:#bfe5cc;color:#1c7f41;background:#eefaf2}
      #agfAiViewImage .agf-page-image-thumb img{width:96px;max-width:96px;height:68px;max-height:68px;object-fit:contain;border-radius:6px;background:#f7f8fb;border:1px solid #edf1f7}
      #agfAiViewImage .agf-page-image-body{min-width:0;font-size:12px;line-height:1.55}
      #agfAiViewImage .agf-page-image-status{margin-bottom:4px;color:#687386;font-size:11px}
      #agfAiViewImage .agf-page-image-result{max-height:160px;overflow:auto}
      #agfAiViewChart .agf-chart-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
      #agfAiViewChart .agf-chart-title{width:100%;box-sizing:border-box;margin-bottom:10px}
      #agfAiViewChart .agf-chart-canvas{overflow:auto;border:0;min-height:260px;padding:8px;background:#fff}
      #agfAiViewChart .agf-chart-canvas>svg{display:block;border:1px solid #cfd8e6;border-radius:3px;background:#fff;box-sizing:border-box}
      #agfAiViewChart .agf-chart-history-row{display:flex;gap:8px;align-items:center;border-bottom:1px solid #f0f2f6;padding:7px 0;font-size:12px}
      #agfAiViewChart .agf-chart-history-row span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .agf-media-attachment{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;margin-bottom:5px;border:1px solid #dfe5f2;border-radius:9px;background:#f8faff;max-width:100%}.agf-media-attachment img{width:54px;height:54px;object-fit:cover;border-radius:6px}.agf-media-attachment-body{min-width:0;flex:1;font-size:11px;color:#4b5870}.agf-media-attachment-result{max-height:48px;overflow:auto;margin-top:3px;line-height:1.4}.agf-media-attachment-remove{border:0;background:transparent;color:#d33;font-size:18px;line-height:1;cursor:pointer;padding:2px 4px}
      .agf-ai-body{flex:1;padding:12px;overflow:hidden;display:flex;flex-direction:column;gap:0;min-height:0}
      .agf-ai-content{flex:1;overflow:hidden;min-height:0;position:relative}
      .agf-ai-view-chat{display:grid;grid-template-rows:1fr auto;gap:8px;height:calc(100% - 8px);box-sizing:border-box;min-height:0}
      .agf-ai-view-quiz{display:none;height:100%;min-height:0;overflow:auto}
      .agf-quiz-shell{max-width:680px;margin:0 auto;padding:8px 4px 20px;color:#172033}
      .agf-quiz-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;color:#687386;font-size:12px}
      .agf-quiz-progress{height:5px;flex:1;border-radius:99px;background:#e7ebf2;overflow:hidden}
      .agf-quiz-progress span{display:block;height:100%;background:#315efb;border-radius:inherit;transition:width .2s ease}
      .agf-quiz-card{background:#fff;border:1px solid #e1e6ef;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(23,32,51,.04)}
      .agf-quiz-type{font-size:11px;color:#315efb;font-weight:700;margin-bottom:8px}
      .agf-quiz-question{font-size:16px;line-height:1.55;font-weight:700;margin-bottom:16px}
      .agf-quiz-options{display:grid;gap:8px}
      .agf-quiz-option{display:flex;align-items:flex-start;gap:8px;width:100%;padding:10px 12px;border:1px solid #dfe5f2;border-radius:9px;background:#fff;color:#27344f;text-align:left;font-size:13px;line-height:1.45;cursor:pointer}
      .agf-quiz-option:hover{border-color:#8da7ff;background:#f7f9ff}
      .agf-quiz-option.selected{border-color:#315efb;background:#edf2ff;color:#2447c7}
      .agf-quiz-option.correct{border-color:#20a464;background:#effaf4;color:#176b45}
      .agf-quiz-option.wrong{border-color:#d9534f;background:#fff3f2;color:#a32926}
      .agf-quiz-option:disabled{cursor:default}
      .agf-quiz-letter{font-weight:700;min-width:18px}
      .agf-quiz-feedback{margin-top:14px;padding-top:12px;border-top:1px solid #edf0f5;font-size:12px;line-height:1.6;color:#4b5870}
      .agf-quiz-evidence{margin-top:8px;padding:8px 10px;border-left:3px solid #9db4ff;background:#f7f9ff;color:#687386}
      .agf-quiz-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
      .agf-quiz-actions button{height:30px;padding:0 12px;border:1px solid #dfe5f2;border-radius:8px;background:#fff;color:#315efb;cursor:pointer;font-size:12px}
      .agf-quiz-actions button.primary{background:#315efb;color:#fff;border-color:#315efb}
      .agf-quiz-actions button:disabled{opacity:.45;cursor:not-allowed}
      .agf-quiz-result{display:none;text-align:center;padding:28px 12px}
      .agf-quiz-result h3{margin-bottom:8px;font-size:18px}
      .agf-quiz-result p{color:#687386;font-size:12px;line-height:1.6}
      .agf-quiz-result .agf-quiz-actions{justify-content:center;flex-wrap:wrap}
      .agf-quiz-history-list{display:grid;gap:8px;text-align:left;margin:14px 0}
      .agf-quiz-history-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #e1e6ef;border-radius:9px;background:#fff;font-size:12px}
      .agf-quiz-history-row strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:360px}
      .agf-quiz-history-row small{display:block;margin-top:3px;color:#687386}
      .agf-quiz-history-row button{height:28px;padding:0 9px;border:1px solid #dfe5f2;border-radius:7px;background:#fff;color:#315efb;cursor:pointer}
      .agf-quiz-history-row .danger{color:#b42318;border-color:#ffd6d1}
      .agf-quiz-select{height:30px;border:1px solid #dfe5f2;border-radius:8px;background:#fff;color:#27344f;font-size:12px;padding:0 8px}
      .agf-ai-display{border:1px solid #e1e6ef;border-radius:12px;padding:0;font-size:14px;color:#333;overflow:auto;box-sizing:border-box;min-height:0;background:var(--agf-display-bg,#fff);width:100%;box-shadow:0 2px 8px rgba(23,32,51,.04)}
      .agf-ai-input{border:1px solid #e0e0e0;border-radius:4px;padding:0 8px 8px 8px;font-size:14px;color:#333;overflow:auto;box-sizing:border-box;min-height:96px;height:auto;max-height:50vh;width:100%}
      .agf-chat{display:flex;flex-direction:column;height:100%;gap:0}
      .agf-chat-title{font-size:12px;color:#666}
      .agf-chat-list{flex:1;overflow:auto;display:flex;flex-direction:column;gap:0}
      .agf-msg{display:flex}
      .agf-msg.user{justify-content:flex-start}
      .agf-msg.assistant{justify-content:flex-start}
      .agf-bubble{position:relative;width:100%;max-width:100%;box-sizing:border-box;border:none;border-radius:0;padding:8px 32px 8px 10px;font-size:13px;background:#fff}
      .agf-bubble.user{background:var(--agf-q-bg,#ffffff);color:var(--agf-q-text,#000000)}
      .agf-msg.assistant .agf-bubble{background:var(--agf-a-bg,#ffffff);color:var(--agf-a-text,#000000)}
      .agf-bubble strong{font-weight:700}
      .agf-bubble em{font-style:italic}
      .agf-bubble code{font-family:Menlo,Monaco,monospace;background:#f5f5f5;color:#333;padding:0 2px;border-radius:3px}
      .agf-bubble pre{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;padding:8px;overflow:auto}
      .agf-copy-btn{position:absolute;top:6px;right:8px;height:20px;width:20px;border:1px solid #e0e0e0;border-radius:4px;background:#fff;color:#333;font-size:12px;display:inline-flex;align-items:center;justify-content:center}
      .agf-bubble h1,.agf-bubble h2,.agf-bubble h3{margin:4px 0;font-weight:700}
      .agf-bubble ul,.agf-bubble ol{margin:4px 0 4px 18px}
      .agf-bubble hr{border:none;border-top:1px solid #e0e0e0;margin:6px 0}
      .agf-chat-list .agf-msg:first-child .agf-bubble{border-top-left-radius:10px;border-top-right-radius:10px}
      .agf-chat-list .agf-msg:last-child .agf-bubble{border-bottom-left-radius:10px;border-bottom-right-radius:10px}
      .agf-qa-label{display:inline-flex;align-items:center;padding:0 4px;border:1px solid #e0e0e0;border-radius:6px;margin-right:4px;font-size:12px;color:#666;background:#f9f9f9}
      .agf-model-badge{display:inline-block;padding:0 6px;border:1px solid #e0e0e0;border-radius:6px;margin-right:6px;font-size:11px;color:#666;background:#f9f9f9}
      .agf-collapse{margin-top:6px;border-top:1px solid #e0e0e0;padding-top:6px}
      .agf-collapse-content{max-height:none;overflow:auto}
      .agf-collapse-content.collapsed{max-height:var(--agf-collapse-height,160px);overflow:auto}
      .agf-collapse-toggle{height:22px;min-width:64px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;margin-top:6px}
      .agf-go-full{background:#27ae60;color:#fff;border-color:#27ae60;box-shadow:0 4px 10px rgba(39,174,96,0.25)}
      .agf-composer{display:grid;grid-template-rows:auto 1fr auto auto;gap:0;height:100%}
      .agf-composer-extra{display:grid;grid-template-columns:1fr auto;align-items:start;margin-top:2px}
      .agf-composer-body{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch}
      .agf-composer-header{display:flex;align-items:center;gap:8px;margin:0;padding:0;flex-wrap:wrap}
      .agf-field{height:24px;border:1px solid #e0e0e0;border-radius:8px;padding:0 8px;font-size:12px;color:#333;background:#fff}
      #agfCarryInput{height:20px;line-height:20px;padding:0 4px;border-radius:4px}
      .agf-mode-toggle{display:inline-flex;align-items:center;margin-left:0}
      .agf-highlight-toggle{display:inline-flex;align-items:center;margin-left:0}
      .agf-mode-btn{height:24px;line-height:24px;padding:0 8px;border:1px solid #e0e0e0;border-radius:0;background:#fff;color:#333;font-size:12px}
      .agf-mode-btn:first-child{border-top-left-radius:8px;border-bottom-left-radius:8px}
      .agf-mode-btn:last-child{border-top-right-radius:8px;border-bottom-right-radius:8px}
      .agf-mode-btn + .agf-mode-btn{margin-left:-1px}
      .agf-mode-btn.active{background:#333;color:#fff}
      .agf-records-panel{position:relative;height:100%;background:#fff;border:1px solid #e0e0e0;border-radius:4px;box-shadow:none;display:none;padding:12px;overflow:auto}
      .agf-colors-panel{position:absolute;inset:12px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);display:none;z-index:2;padding:12px;overflow:auto}
      .agf-records-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:8px;background:#fff;border-bottom:1px solid #e0e0e0}
      .agf-records-title{font-size:14px;color:#333;font-weight:600}
      .agf-records-close{height:24px;min-width:28px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333}
      .agf-records-open{height:24px;min-width:48px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;font-size:12px}
      .agf-records-list{display:flex;flex-direction:column;gap:8px}
      .agf-record-item{display:flex;align-items:center;justify-content:space-between;border:1px solid #e0e0e0;border-radius:6px;padding:8px;background:#fff;color:#333}
      .agf-record-subject{font-size:12px;color:#666}
      .agf-record-actions{display:inline-flex;gap:8px}
      .agf-record-delete{height:24px;min-width:28px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333}
      .agf-record-link{max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1a73e8}
      .agf-record-scope-btn{height:24px;min-width:64px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;margin-left:8px}
      .agf-record-scope-btn.active{background:#333;color:#fff;border-color:#333}
      .agf-records-search{height:24px;border:1px solid #e0e0e0;border-radius:6px;padding:0 8px;width:40%}
      .agf-group{border:1px dashed #e0e0e0;border-radius:6px}
      .agf-group-title{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#f8f8f8;color:#333}
      .agf-group-body{padding:8px}
      .agf-group-body.collapsed{display:none}
      .agf-input-textarea{width:100%;min-height:56px;resize:none;border-radius:8px;border:1px solid #e0e0e0;padding:10px 12px;color:#333;background:#fff}
      .agf-input-editor{width:100%;min-height:56px;border-radius:8px;border:1px solid #e0e0e0;padding:10px 12px;color:#333;background:#fff;white-space:pre-wrap;outline:none;overflow:auto}
      .agf-input-affix{color:#666;opacity:0.85;margin-left:4px}
      #agfInputPrefix{color:#333;margin-right:2px}
      .agf-actions{display:inline-flex;align-items:center;gap:8px}
      .agf-send{height:32px;min-width:0;border:1px solid #e0e0e0;border-radius:8px;background:#fff;color:#333;padding:0 10px}
      .agf-send-col{display:flex;flex-direction:column;justify-content:space-between;align-self:stretch;height:100%}
      #agfAddFullTextBtn{height:auto;padding:4px 8px;font-size:11px;line-height:14px;white-space:normal;word-break:break-all;width:40px;text-align:center;margin-top:8px}
      #agfAddFullTextBtn.active{background:#1a73e8;color:#fff;border-color:#1a73e8}
      .agf-settings{display:flex;flex-direction:column;gap:12px}
      .agf-settings{height:100%;min-height:0}
      .agf-settings-layout{display:grid;grid-template-columns:160px 1fr;gap:12px}
      .agf-settings-layout{height:100%;min-height:0}
      .agf-settings-sidebar{display:flex;flex-direction:column;gap:6px}
      .agf-settings-tab{height:28px;padding:0 8px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;text-align:left}
      .agf-settings-tab.active{background:#333;color:#fff;border-color:#333}
      .agf-settings-content{border:1px solid #e0e0e0;border-radius:8px;padding:12px;background:#fff;min-height:0;height:100%;overflow:auto}
      #agfSettingsContentApi{min-height:0;height:100%;overflow:auto}
      .agf-status-fixed{display:none}
      .agf-conv-index{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
      .agf-conv-rounds{color:#666}
      .agf-conv-item{border:1px solid #e0e0e0;border-radius:4px;padding:2px 6px;background:#fff;color:#333;font-size:12px;cursor:pointer}
      .agf-status-row{display:none}
      .agf-fixed-bar{position:sticky;top:48px;z-index:98;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;padding:4px 8px;font-size:12px;margin:0;width:100%;box-sizing:border-box}
      .agf-fixed-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .agf-carry-top{margin-left:auto;display:inline-flex;align-items:center;gap:4px}
      
      .agf-toast{position:absolute;right:12px;bottom:12px;background:#333;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;box-shadow:0 6px 18px rgba(0,0,0,0.12);z-index:3}
      .agf-toast-close{position:absolute;top:4px;right:6px;background:transparent;border:none;color:#fff;cursor:pointer;font-size:12px}
      .agf-settings-group{border:1px solid #e1e6ef;border-radius:10px;padding:14px;background:#fff;box-shadow:0 2px 8px rgba(23,32,51,.04)}
      .agf-settings-row{display:flex;align-items:center;gap:12px;margin-top:8px}
      .agf-label{min-width:64px;font-size:12px;color:#333}
      .agf-button-list{display:flex;flex-wrap:wrap;gap:8px}
      .agf-btn{height:30px;padding:0 10px;border:1px solid #dfe5f2;border-radius:8px;background:#fff;color:#4b5870;font-size:12px;cursor:pointer;transition:all .16s ease}
      .agf-btn:hover{border-color:#315efb;color:#315efb;background:#f5f7ff}
      .agf-btn.active{background:#315efb;color:#fff;border-color:#315efb;box-shadow:0 4px 10px rgba(49,94,251,.18)}
      .agf-provider-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:#687386;font-size:11px}
      .agf-provider-dot{width:7px;height:7px;border-radius:50%;background:#c4cbd6;display:inline-block}
      .agf-provider-dot.ready{background:#20a464}
      .agf-provider-dot.warn{background:#d99000}
      .agf-provider-test{height:28px;padding:0 9px;border:1px solid #dfe5f2;border-radius:8px;background:#fff;color:#315efb;font-size:12px;cursor:pointer}
      .agf-provider-test[disabled]{opacity:.55;cursor:wait}
      .agf-input{height:28px;border:1px solid #e0e0e0;border-radius:4px;padding:4px 8px;font-size:13px;color:#333;background:#fff}
      #agfApiKeyInput{width:280px;max-width:40%;flex:0 0 auto}
      .agf-select{height:28px;border:1px solid #e0e0e0;border-radius:4px;padding:4px 8px;font-size:13px;color:#333;background:#fff}
      .agf-hint{font-size:12px;color:#666;margin-left:8px}
      .agf-fulltext-panel{position:absolute;inset:12px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);display:none;z-index:3;padding:12px;overflow:auto}
      .agf-fulltext-content{white-space:pre-wrap;color:#333;font-size:13px}
      .agf-fulltext-section{margin-bottom:12px}
      .agf-fulltext-title{font-weight:600;font-size:13px;color:#333;margin-bottom:6px}
      .agf-fulltext-body{white-space:pre-wrap;color:#333;font-size:13px}
      .agf-refresh-hint{font-size:11px;color:#b58900}
      .agf-ok-btn{height:28px;min-width:28px;border:1px solid #27ae60;border-radius:6px;background:#27ae60;color:#fff;display:none}
      .agf-ai-bubble{position:fixed;right:12px;bottom:12px;width:40px;height:40px;display:none;align-items:center;justify-content:center;border-radius:50%;background:#333;color:#fff;font-weight:700;z-index:2147483647}
      .agf-ai-header{position:sticky;top:0;z-index:99}
      .agf-resize-right{position:absolute;top:0;right:0;width:8px;height:100%;cursor:ew-resize}
      .agf-resize-bottom{position:absolute;left:0;bottom:0;width:100%;height:8px;cursor:ns-resize}
      .agf-resize-left{position:absolute;top:0;left:0;width:8px;height:100%;cursor:ew-resize}
      /* Taixue floating workspace: keep the existing capabilities, clarify the reading flow. */
      .agf-ai-overlay{background:#f7f8fb;border:1px solid #dfe5f2;border-radius:16px;box-shadow:0 22px 60px rgba(23,32,51,.24);overflow:hidden}
      .agf-ai-header{min-height:58px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e9f0}
      .agf-ai-title{gap:8px;color:#172033;font-size:15px}
      .agf-ai-title > span:first-child{display:inline-flex;align-items:center;gap:6px}
      .agf-ai-controls{gap:4px}
      .agf-ai-controls button,.agf-ai-tabs button{height:28px;min-width:28px;border:1px solid transparent;border-radius:8px;color:#687386}
      .agf-ai-controls button:hover,.agf-ai-tabs button:hover{background:#edf2ff;border-color:#dfe5f2;color:#315efb}
      .agf-fixed-bar{top:58px;margin:0 12px;padding:8px 10px;border:1px solid #e1e6ef;border-radius:10px;background:#fff;color:#687386;box-shadow:0 2px 8px rgba(23,32,51,.04)}
      .agf-ai-body{padding:12px;gap:10px;background:#f7f8fb}
      .agf-ai-view-chat{height:100%;gap:10px}
      .agf-ai-display{border:1px solid #e1e6ef;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(23,32,51,.04)}
      .agf-chat-list{padding:4px 0}
      .agf-bubble{padding:12px 38px 12px 14px;font-size:13px;line-height:1.65}
      .agf-msg.user .agf-bubble{background:#f5f7ff;color:#26345b}
      .agf-msg.assistant .agf-bubble{background:#fff;color:#172033}
      .agf-ai-input{border:1px solid #e1e6ef;border-radius:12px;padding:10px;background:#fff;box-shadow:0 2px 8px rgba(23,32,51,.04)}
      .agf-composer{gap:8px}
      .agf-composer-header{gap:6px;padding-bottom:2px}
      .agf-field,.agf-select,.agf-input{border-color:#dfe5f2;border-radius:8px;color:#4b5870;background:#fff}
      .agf-field:focus,.agf-input:focus,.agf-select:focus,.agf-input-editor:focus{outline:2px solid rgba(49,94,251,.16);outline-offset:1px;border-color:#315efb}
      .agf-status{margin-left:auto}
      .agf-status-btn,.agf-more-btn,.agf-send{border-color:#dfe5f2;border-radius:8px;background:#fff;color:#315efb;transition:all .16s ease}
      .agf-status-btn:hover,.agf-more-btn:hover,.agf-send:hover{border-color:#315efb;background:#f5f7ff}
      .agf-send{background:#315efb;color:#fff;border-color:#315efb;font-weight:600}
      .agf-send:hover{background:#2447c7;color:#fff}
      .agf-input-editor{border-color:#dfe5f2;border-radius:9px;min-height:70px;line-height:1.55}
      .agf-settings-layout{grid-template-columns:142px 1fr;gap:10px}
      .agf-settings-sidebar{gap:5px}
      .agf-settings-tab{height:32px;border:1px solid transparent;border-radius:8px;color:#687386;background:transparent}
      .agf-settings-tab:hover{background:#edf2ff;color:#315efb}
      .agf-settings-tab.active{background:#e8eeff;border-color:#d7e0ff;color:#315efb}
      .agf-settings-content{border:0;padding:0;background:transparent}
      .agf-settings-row{gap:10px;margin-top:10px;align-items:flex-start}
      .agf-label{min-width:72px;padding-top:7px;color:#687386;font-size:11px}
      .agf-provider-meta{font-size:11px}
      .agf-fulltext-panel,.agf-records-panel,.agf-colors-panel{inset:12px;border:1px solid #dfe5f2;border-radius:12px;box-shadow:0 14px 36px rgba(23,32,51,.16)}
      .agf-composer-header{gap:5px;min-height:26px}
      #agfSessionProvider,#agfSessionModel{height:26px;max-width:112px;padding:0 6px;font-size:11px}
      .agf-composer-header .agf-status{margin-left:auto}
      .agf-ai-input{min-height:0;height:auto;padding:4px 6px}
      .agf-composer{gap:4px}
      .agf-input-editor{min-height:48px;padding:8px 10px}
      .agf-send-col{gap:4px}
      #agfAddFullTextBtn{margin-top:0}
      /* Do not let the composer grid stretch the toolbar into empty space. */
      .agf-ai-input{height:auto!important;min-height:0!important}
      .agf-composer{display:grid!important;grid-template-rows:auto auto auto!important;gap:4px!important;height:auto!important;min-height:0!important}
      .agf-composer-header{height:26px!important;min-height:26px!important;padding:0!important;margin:0!important}
      .agf-composer-body{min-height:0!important;margin:0!important}
      .agf-input-editor{min-height:44px!important}
      .agf-composer-header{display:flex!important;align-items:center!important;flex-wrap:nowrap!important;gap:5px!important}
      .agf-composer-header #agfSessionModel{flex:0 1 112px}
      .agf-composer-header .agf-status{margin-left:0!important;flex:0 0 auto}
      /* Composer layout: attachment gets a full row; editor and actions keep stable widths. */
      .agf-composer-body{display:grid!important;grid-template-columns:minmax(0,1fr) 52px!important;grid-template-rows:auto minmax(44px,auto)!important;gap:5px!important;align-items:stretch!important}
      .agf-composer-body #agfMediaAttachment{grid-column:1 / -1!important;grid-row:1!important;min-width:0!important;width:100%!important;box-sizing:border-box!important;margin:0!important}
      .agf-composer-body .agf-input-editor{grid-column:1!important;grid-row:2!important;min-width:0!important;width:auto!important;box-sizing:border-box!important}
      .agf-composer-body .agf-send-col{grid-column:2!important;grid-row:2!important;width:52px!important;min-width:52px!important;box-sizing:border-box!important;height:auto!important;gap:4px!important}
      .agf-composer-body .agf-send-col .agf-send{width:52px!important;min-width:52px!important;box-sizing:border-box!important;padding:0 5px!important}
      .agf-composer-body .agf-send-col #agfAddFullTextBtn{width:52px!important;min-width:52px!important;margin-top:0!important}
    `;
    document.documentElement.appendChild(style);
    const overlay = document.createElement('div');
    overlay.id = 'agfAiSettingOverlay';
    overlay.className = 'agf-ai-overlay';
    overlay.innerHTML = `
      <div class="agf-ai-header">
        <div class="agf-ai-title"><span id="agfTitleLabel" data-i18n="aiPanel.title" data-i18n-attr="title:aiPanel.returnToChat">太学</span><div class="agf-mode-toggle"><button class="agf-mode-btn" data-i18n="aiPanel.mode.persistent">常驻</button><button class="agf-mode-btn active" data-i18n="aiPanel.mode.manual">手动</button></div><div class="agf-highlight-toggle"><button class="agf-mode-btn active" id="agfHighlightOn" data-i18n="aiPanel.highlight.on">高亮</button><button class="agf-mode-btn" id="agfHighlightOff" data-i18n="aiPanel.highlight.off">不亮</button></div></div>
        <div class="agf-ai-controls">
          <button id="agfAiTabWrench" title="太学设置">🔧</button>
          <button id="agfAiFull" data-i18n="aiPanel.size.full">全</button>
          <button id="agfAiHalf" data-i18n="aiPanel.size.half">中</button>
          <button id="agfAiMini" data-i18n="aiPanel.size.mini">小</button>
          <button id="agfAiClose">X</button>
        </div>
      </div>
      <div class="agf-function-bar">
        <div class="agf-ai-tabs">
          <button id="agfAiTabChat" title="Chat">Chat</button>
          <button id="agfAiTabQuiz" title="文章测试">测试</button>
          <button id="agfAiTabExplain" title="选区解释">解释</button>
          <button id="agfAiTabVocab" title="词汇复习">词汇</button>
        </div>
        <div class="agf-context-tools">
          <button class="agf-context-btn active" id="agfCtxFull" data-source="full_article">全文</button>
          <button class="agf-context-btn" id="agfCtxSelection" data-source="selection">选中</button>
          <button class="agf-context-btn" id="agfCtxParagraph" data-source="paragraph">段落</button>
        </div>
        <div class="agf-context-summary" id="agfContextSummary">当前上下文：全文</div>
        <div class="agf-media-context-tools"><button id="agfImageContextBtn" class="agf-context-btn">图片</button><button id="agfChartWorkspaceBtn" class="agf-context-btn" title="从当前上下文进入图表工作区">图表</button><button id="agfPageImageDiscoverBtn" class="agf-context-btn" title="发现当前选区或全文中的图片">发现网页图片</button><button id="agfPageScreenshotBtn" class="agf-context-btn" title="截图当前网页视窗">截图网页</button><button id="agfAudioContextBtn" class="agf-context-btn">音频</button><select id="agfMediaModeSelect" class="agf-select" title="图片发送方式"><option value="auto">自动判断</option><option value="recognition_only">仅识别结果</option><option value="image_and_recognition">图片+识别结果</option></select><span id="agfMediaStrategy" class="agf-context-summary"></span><input id="agfImageContextInput" type="file" accept="image/*" style="display:none"><input id="agfAudioContextInput" type="file" accept="audio/*" style="display:none"></div>
      </div>
      <div class="agf-task-bar">
        <span class="agf-task-label">任务</span>
        <div class="agf-task-actions">
          <button id="agfQuickSummaryBtn" class="agf-task-btn" disabled data-i18n="aiPanel.summary">总结</button>
          <button id="agfBeginnerExplainBtn" class="agf-task-btn" disabled data-i18n="aiPanel.beginnerExplain">通俗解读</button>
          <button id="agfBtnTranslate" class="agf-task-btn" disabled>翻译</button>
          <button id="agfBtnSelectionExplain" class="agf-task-btn" disabled>选区解释</button>
          <button id="agfBtnKeywords" class="agf-task-btn" disabled data-i18n="aiPanel.keywords">关键词</button>
          <button class="agf-task-btn" id="agfBtnStructured" disabled data-i18n="aiPanel.structured">结构化摘要</button>
          <button class="agf-task-btn" id="agfBtnExplain" disabled data-i18n="aiPanel.explain">简明解释</button>
          <button class="agf-task-btn" id="agfBtnOutline" disabled data-i18n="aiPanel.outline">提取大纲</button>
          <button class="agf-task-btn" id="agfBtnVisionOcr" disabled>图片识别/OCR</button>
          <button class="agf-task-btn" id="agfBtnSpeak" disabled>朗读</button>
          <button class="agf-task-btn" id="agfModuleHistoryBtn">📃 历史记录</button>
        </div>
      </div>
          <div class="agf-fixed-bar"><div class="agf-fixed-line"><span id="agfStatusText"></span><span id="agfConvRounds" class="agf-conv-rounds"></span><div id="agfConvIndex" class="agf-conv-index"></div><div id="agfCarryWrap" class="agf-rounds-wrap agf-carry-top" style="display:none"><span class="agf-rounds-label" data-i18n="aiPanel.carry">携带</span><input class="agf-field" id="agfCarryInput" type="text" value="2" style="width:24px;text-align:center" /><span class="agf-rounds-label" data-i18n="aiPanel.qnaSuffix">轮问答</span></div></div></div>
      <div class="agf-ai-body">
        <div class="agf-ai-content">
          <div class="agf-ai-view-chat" id="agfAiViewChat">
            <div class="agf-ai-display">
              <div class="agf-chat">
                <div class="agf-chat-list"></div>
              </div>
            </div>
            <div class="agf-ai-input">
              <div class="agf-composer">
                <div class="agf-composer-header">
                  <select class="agf-field" id="agfSessionProvider" title="AI 服务商" aria-label="AI 服务商">
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
                  <select class="agf-field" id="agfSessionModel" title="AI 模型" aria-label="AI 模型">
                    <option>deepseek-chat</option>
                    <option>deepseek-reasoner</option>
                  </select>
                <div class="agf-status"><span id="agfStorageStatusDot" class="agf-status-dot" data-i18n-attr="title:aiPanel.statusHintNone"></span><button id="agfRefreshBtn" class="agf-refresh-btn" data-i18n-attr="title:aiPanel.refresh">⟳</button><button id="agfTestTextBtn" class="agf-refresh-btn" data-i18n-attr="title:aiPanel.fullText">文</button></div>
                </div>
                </div>
                <div class="agf-composer-body">
                  <div id="agfMediaAttachment" class="agf-media-attachment" style="display:none"></div>
                  <div class="agf-input-editor" id="agfComposerEditor" contenteditable="true"><span id="agfInputPrefix" contenteditable="true" style="display:none">我的问题是：</span><span id="agfInputUser" contenteditable="true"></span><span id="agfInputAffix" contenteditable="false" class="agf-input-affix" style="display:none"></span></div>
                  <div class="agf-send-col">
                    <button class="agf-send" id="agfComposerSend" data-i18n="aiPanel.send">发送</button>
                    <button class="agf-send" id="agfAddFullTextBtn" data-i18n="aiPanel.addFullText">添加全文</button>
                  </div>
                </div>
                <input type="hidden" id="agfComposerHidden" />
                <div id="agfRefreshHint" class="agf-refresh-hint" style="display:none" data-i18n="aiPanel.refreshHint">刷新以采取全文</div>
              </div>
            </div>
          </div>
          <div class="agf-ai-view-quiz" id="agfAiViewQuiz">
            <div class="agf-quiz-shell">
              <div class="agf-quiz-top"><span id="agfQuizModeLabel">文章理解测试</span><div class="agf-quiz-progress"><span id="agfQuizProgressBar" style="width:0%"></span></div><span id="agfQuizProgressText">准备中</span></div>
              <div class="agf-quiz-card" id="agfQuizCard" style="display:none">
                <div class="agf-quiz-type" id="agfQuizType"></div>
                <div class="agf-quiz-question" id="agfQuizQuestion"></div>
                <div class="agf-quiz-options" id="agfQuizOptions"></div>
                <div class="agf-quiz-feedback" id="agfQuizFeedback" style="display:none"></div>
                <div class="agf-quiz-actions"><button id="agfQuizBackHistory" style="display:none">返回历史</button><button id="agfQuizSubmit" class="primary" disabled>提交答案</button><button id="agfQuizNext" style="display:none">下一题</button></div>
              </div>
              <div class="agf-quiz-result" id="agfQuizResult"></div>
              <div class="agf-quiz-actions" id="agfQuizStartActions"><button id="agfQuizHistory">测试历史</button><select id="agfQuizCount" class="agf-quiz-select"><option value="3">3题</option><option value="5">5题</option><option value="10">10题</option></select><button id="agfQuizEasy">简单一些</button><button id="agfQuizStart" class="primary">生成测试</button><button id="agfQuizHard">难一些</button></div>
            </div>
          </div>
          <div class="agf-ai-view-module" id="agfAiViewExplain" style="display:none">
            <div class="agf-module-card">
              <div class="agf-module-heading"><span>选区解释</span><span id="agfExplainSource" class="agf-module-meta"></span></div>
              <div id="agfExplainResult" class="agf-module-result"><p>请先在网页中选中文本，再点击“选区解释”。</p></div>
              <div class="agf-module-actions"><button id="agfExplainToChat" class="primary" disabled>带解释追问 Chat</button><button id="agfExplainRetry" disabled>重新解释</button></div><div id="agfExplainHistory" class="agf-module-history"></div>
            </div>
          </div>
          <div class="agf-ai-view-module" id="agfAiViewImage" style="display:none"><div class="agf-module-card"><div class="agf-module-heading"><span>图像工作区</span><span id="agfImageWorkspaceStatus" class="agf-module-meta">等待添加图片</span></div><div id="agfImageDropzone" class="agf-image-dropzone"><p>拖动图片到这里进行识别</p><button id="agfImageChooseBtn" class="primary">选择图片</button><input id="agfWorkspaceImageInput" type="file" accept="image/*" multiple style="display:none"></div><div id="agfImageWorkspaceResult" class="agf-module-result"></div><div id="agfImageWorkspaceHistoryList" class="agf-module-history" style="display:none"></div><div class="agf-module-actions"><label class="agf-image-select-all"><input id="agfImageSelectAll" type="checkbox"> 全选</label><button id="agfImageProcessSelected" class="primary" disabled>发送勾选图片识别</button><button id="agfImageAddToChat" class="primary" disabled>添加到对话框</button><button id="agfImageWorkspaceRetry" disabled>重新识别</button><button id="agfImageWorkspaceClear">清除工作区</button><button id="agfImageWorkspaceDelete">删除并清理历史</button><button id="agfImageWorkspaceExport">导出</button><button id="agfImageWorkspaceHistory">识别历史</button></div></div></div>
          <div class="agf-ai-view-module" id="agfAiViewChart" style="display:none"><div class="agf-module-card"><div class="agf-module-heading"><span>图表工作区</span><span id="agfChartMeta" class="agf-module-meta">等待生成图表</span></div><div id="agfChartSkillBadge" class="agf-media-attachment" style="display:none"><div class="agf-media-attachment-body"><strong>内置图表 Skill</strong><div class="agf-media-attachment-result">你帮我做一个关系图来解释</div></div></div><textarea id="agfChartSourceText" class="agf-field" style="width:100%;box-sizing:border-box;min-height:96px;margin-bottom:10px;resize:vertical" placeholder="图表材料会自动填充，也可以在这里修改"></textarea><div class="agf-chart-toolbar"><select id="agfChartIntent" class="agf-field"><option value="concept">概念图</option><option value="relationship">关系图</option><option value="mindmap">思维导图</option><option value="flowchart">流程图</option><option value="timeline">时间线</option></select><select id="agfChartRenderer" class="agf-field"><option value="svg">清爽 SVG</option><option value="rough">手绘风格</option><option value="mermaid">Mermaid 风格</option></select><button id="agfChartGenerate" class="agf-task-btn">根据工作区材料生成</button><button id="agfChartSave" class="agf-task-btn" disabled>保存</button><button id="agfChartSvg" class="agf-task-btn" disabled>导出 SVG</button><button id="agfChartJson" class="agf-task-btn" disabled>导出 JSON</button><button id="agfChartImport" class="agf-task-btn">导入 JSON</button><button id="agfChartHtml" class="agf-task-btn" disabled>导出 HTML</button><button id="agfChartPng" class="agf-task-btn" disabled>导出 PNG</button><button id="agfChartAttach" class="agf-task-btn" disabled>添加到 Chat</button><button id="agfChartUndo" class="agf-task-btn" disabled>撤销</button><button id="agfChartRedo" class="agf-task-btn" disabled>重做</button><button id="agfChartAddNode" class="agf-task-btn" disabled>添加节点</button><button id="agfChartAddEdge" class="agf-task-btn" disabled>添加连线</button><button id="agfChartDelete" class="agf-task-btn" disabled>删除选中</button><button id="agfChartZoomOut" class="agf-task-btn" title="缩小">－</button><button id="agfChartZoomReset" class="agf-task-btn" title="重置缩放">100%</button><button id="agfChartZoomIn" class="agf-task-btn" title="放大">＋</button></div><input id="agfChartTitle" class="agf-field agf-chart-title" placeholder="图表标题"><div id="agfChartCanvas" class="agf-chart-canvas"></div><div id="agfChartNotice" class="agf-module-meta" style="margin-top:8px">操作：单击选择；拖动移动；双击文字编辑。删除请先选择节点，再点“删除选中”或按 Delete。</div><div class="agf-module-history" style="margin-top:16px"><strong style="font-size:13px">已保存图表</strong><div id="agfChartHistory" style="margin-top:6px"></div></div></div></div>
          <div class="agf-ai-view-module" id="agfAiViewVocab" style="display:none">
            <div class="agf-module-card">
              <div class="agf-module-heading"><span>词汇复习</span><span id="agfVocabStats" class="agf-module-meta">基础掌握度 0%</span></div>
              <div id="agfVocabResult" class="agf-module-result"><p>基于当前文章生成一组复习词汇。</p></div>
              <div class="agf-module-actions"><button id="agfVocabStart" class="primary">生成复习卡</button><button id="agfVocabReset">重置本轮</button></div><div id="agfVocabHistory" class="agf-module-history"></div>
            </div>
          </div>
          <div id="agfFulltextPanel" class="agf-fulltext-panel">
            <div class="agf-records-header">
              <div class="agf-records-title" data-i18n="aiPanel.fullText">全文</div>
              <button id="agfFulltextClose" class="agf-records-close" data-i18n="aiPanel.close">关闭</button>
            </div>
            <div id="agfFulltextContent" class="agf-fulltext-content"></div>
          </div>
            <div class="agf-settings" id="agfAiViewSettings" style="display:none;">
              <div class="agf-settings-layout">
                <div class="agf-settings-sidebar">
                  <button id="agfSettingsTabApi" class="agf-settings-tab active" data-i18n="aiPanel.settings.tabs.api">API Key</button>
                  <button id="agfSettingsTabColors" class="agf-settings-tab" data-i18n="aiPanel.settings.tabs.colors">颜色管理</button>
                  <button id="agfSettingsTabParse" class="agf-settings-tab" data-i18n="aiPanel.settings.tabs.parse">解析与过滤</button>
                  <button id="agfSettingsTabMedia" class="agf-settings-tab">媒体识别</button>
                  <button id="agfSettingsTabSpeak" class="agf-settings-tab">朗读</button>
                  <button id="agfSettingsTabDisplay" class="agf-settings-tab">显示与折叠</button>
                </div>
                <div class="agf-settings-content">
                  <div id="agfSettingsContentApi">
                    <div class="agf-settings-group">
                      <div style="font-size:13px;color:#333;font-weight:600;" data-i18n="aiPanel.settings.general">综合设置</div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.provider">服务商</div>
                        <div id="agfProviderList" class="agf-button-list"></div>
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label">连接状态</div>
                        <div class="agf-provider-meta"><span id="agfProviderDot" class="agf-provider-dot"></span><span id="agfProviderStatus">未测试</span><button id="agfProviderTest" class="agf-provider-test">测试当前供应商</button></div>
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.model">模型</div>
                        <div id="agfModelList" class="agf-button-list"></div>
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.baseUrl">供应商URL</div>
                        <input id="agfBaseUrlInput" class="agf-input" type="text" placeholder="https://..." />
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.apiKey">API Key</div>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <input id="agfApiKeyInput" class="agf-input" type="password" placeholder="••••••••••••••••••••••••••••••••" />
                          <button id="agfSaveKeyBtn" class="agf-input" style="height:28px;min-width:64px;" data-i18n="aiPanel.save">保存</button>
                          <button id="agfKeySavedBtn" class="agf-ok-btn">✓</button>
                        </div>
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label">备用供应商</div>
                        <select id="agfFallbackProvider" class="agf-select"><option value="">不启用</option></select>
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label">temperature</div>
                        <input id="agfTempInput" class="agf-input" type="number" step="0.1" value="0.7" />
                      </div>
                    </div>
                  </div>
                  <div id="agfSettingsContentColors" style="display:none;">
                    <div class="agf-settings-group">
                      <div style="font-size:13px;color:#333;font-weight:600;" data-i18n="aiPanel.settings.tabs.colors">颜色管理</div>
                      <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.qBg">问题背景</div><input id="agfColorQBg2" type="color" /></div>
                      <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.aBg">回答背景</div><input id="agfColorABg2" type="color" /></div>
                      <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.displayBg">显示区背景</div><input id="agfColorDisplayBg2" type="color" /></div>
                      <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.qText">问题文本</div><input id="agfColorQText2" type="color" /></div>
                      <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.aText">回答文本</div><input id="agfColorAText2" type="color" /></div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.presets.title">预设组合</div>
                        <div class="agf-button-list">
                          <button id="agfPreset1Btn" class="agf-btn" data-i18n="aiPanel.presets.p1">柔和米色</button>
                          <button id="agfPreset2Btn" class="agf-btn" data-i18n="aiPanel.presets.p2">护眼微绿</button>
                          <button id="agfPreset3Btn" class="agf-btn" data-i18n="aiPanel.presets.p3">柔黄纸感</button>
                          <button id="agfPreset4Btn" class="agf-btn" data-i18n="aiPanel.presets.p4">轻灰纸张</button>
                        </div>
                      </div>
                      <div class="agf-settings-row">
                        <button id="agfPresetResetBtn" class="agf-btn" data-i18n="aiPanel.presets.reset">重置默认</button>
                      </div>
                    </div>
                  </div>
                  <div id="agfSettingsContentParse" style="display:none;">
                    <div class="agf-settings-group">
                      <div style="font-size:13px;color:#333;font-weight:600;" data-i18n="aiPanel.settings.parseTitle">解析与过滤</div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.pdfParse">PDF解析</div>
                        <div id="agfPdfParseToggle" class="agf-button-list"></div>
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.privacyFilter">隐私过滤</div>
                        <div id="agfSensitiveToggle" class="agf-button-list"></div>
                      </div>
                      <div class="agf-hint" data-i18n="aiPanel.settings.privacyHint">隐私是指pdf材料中的名字 邮箱 电话等信息</div>
                      <div class="agf-settings-row">
                        <button id="agfManualParseBtn" class="agf-input" style="height:28px;min-width:64px;" data-i18n="aiPanel.settings.manualParsePdf">立即解析当前PDF</button>
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.retentionDays">保留天数</div>
                        <input id="agfRetentionDaysInput" class="agf-input" type="number" min="1" step="1" value="7" />
                      </div>
                    </div>
                  </div>
                  <div id="agfSettingsContentMedia" style="display:none;"><div class="agf-settings-group"><div style="font-size:13px;color:#333;font-weight:600;">媒体识别</div><div class="agf-hint">这里管理图片识别/OCR和音频上下文，不包含 PDF 解析。当前图片识别固定使用免费的 GLM-4V-Flash。</div><div class="agf-settings-row"><div class="agf-label">GLM-4V-Flash Key</div><div style="display:flex;align-items:center;gap:8px;"><input id="agfGlmVisionKeyInput" class="agf-input" type="password" placeholder="单独用于图片识别/OCR" /><button id="agfSaveGlmVisionKeyBtn" class="agf-input" style="height:28px;min-width:64px;">保存</button></div></div><div class="agf-settings-row"><div class="agf-label">媒体权限</div><div id="agfMediaPermissionToggle" class="agf-button-list"></div></div><div class="agf-settings-row"><div class="agf-label">媒体上传</div><div id="agfMediaUploadToggle" class="agf-button-list"></div></div><div class="agf-hint">开启后，点击太学上下文区的“图片”或“音频”选择文件；发送给 AI 前仍会再次确认。默认不保存原始媒体，只保存必要的文字结果。</div></div></div>
                  <div id="agfSettingsContentSpeak" style="display:none;"><div class="agf-settings-group"><div style="font-size:13px;color:#333;font-weight:600;">朗读设置</div><div class="agf-settings-row"><div class="agf-label">朗读语言</div><select id="agfSpeakLanguage" class="agf-select"><option value="auto">自动识别</option><option value="zh-CN">中文</option><option value="en-US">English</option><option value="ja-JP">日本語</option><option value="ko-KR">한국어</option><option value="fr-FR">Français</option><option value="de-DE">Deutsch</option></select></div><div class="agf-settings-row"><div class="agf-label">朗读音色</div><select id="agfSpeakVoice" class="agf-select"><option value="">跟随语言默认音色</option></select></div><div class="agf-settings-row"><div class="agf-label">朗读语速</div><input id="agfSpeakRate" class="agf-input" type="number" min="0.5" max="2" step="0.1" value="1" /><span class="agf-hint">0.5–2.0</span></div><div class="agf-settings-row"><button id="agfSpeakSample" class="agf-btn">试听当前音色</button></div><div class="agf-hint">浏览器提供哪些音色，取决于当前操作系统和浏览器；插件不会上传朗读文本。</div></div></div>
                  <div id="agfSettingsContentDisplay" style="display:none;">
                    <div class="agf-settings-group">
                      <div style="font-size:13px;color:#333;font-weight:600;">显示与折叠</div>
                      <div class="agf-hint">控制 AI 面板消息的显示与折叠：当单条回答超过“折叠阈值”（按字符数计算）时，会自动折叠，并显示“展开全文/收起”。“折叠高度”决定折叠状态下可见内容的最大高度（像素）。</div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.foldThreshold">折叠阈值</div>
                        <input id="agfFoldThresholdInput" class="agf-input" type="number" min="0" step="100" value="2000" />
                        <span class="agf-hint" data-i18n="aiPanel.settings.foldHint">超出则折叠</span>
                      </div>
                      <div class="agf-settings-row">
                        <div class="agf-label" data-i18n="aiPanel.settings.foldHeight">折叠高度</div>
                        <input id="agfFoldHeightInput" class="agf-input" type="number" min="80" step="20" value="160" />
                        <span class="agf-hint" data-i18n="aiPanel.settings.foldHeightHint">折叠区最大高度(px)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          <div class="agf-records-panel" id="agfRecordsPanel">
            <div class="agf-records-header">
              <div class="agf-records-title">
                <button id="agfRecordsTabCurrent" class="agf-record-scope-btn active" data-i18n="aiPanel.records.current">当前记录</button>
                <button id="agfRecordsTabAll" class="agf-record-scope-btn" data-i18n="aiPanel.records.all">所有记录</button>
              </div>
              <input id="agfRecordsSearch" class="agf-records-search" data-i18n-placeholder="aiPanel.records.search" placeholder="搜索主题或链接" />
            </div>
            <div class="agf-records-list" id="agfRecordsList"></div>
          </div>
          <div class="agf-colors-panel" id="agfColorsPanel">
            <div class="agf-records-header">
              <div class="agf-records-title" data-i18n="aiPanel.settings.tabs.colors">颜色管理</div>
              <button class="agf-records-close" id="agfColorsClose">X</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.qBgShort">Q背景</div><input id="agfColorQBg" type="color" /></div>
              <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.aBgShort">A背景</div><input id="agfColorABg" type="color" /></div>
              <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.displayBg">显示区背景</div><input id="agfColorDisplayBg" type="color" /></div>
              <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.qTextShort">Q文本</div><input id="agfColorQText" type="color" /></div>
              <div class="agf-settings-row"><div class="agf-label" data-i18n="aiPanel.colors.labels.aTextShort">A文本</div><input id="agfColorAText" type="color" /></div>
              <div class="agf-settings-row"><button id="agfColorsApply" class="agf-input" style="height:28px;min-width:64px" data-i18n="aiPanel.apply">应用</button></div>
            </div>
          </div>
        </div>
        <div id="agfToast" class="agf-toast" style="display:none"></div>
      </div>
    `;
    document.documentElement.appendChild(overlay);
    try { if (window.i18n && window.i18n.applyTranslations) window.i18n.applyTranslations(); } catch (_) {}
    overlay.style.top = '5px';
    const initialLeft = Math.max(5, window.innerWidth - overlay.offsetWidth - 5);
    overlay.style.left = initialLeft + 'px';
    const bubble = document.createElement('div');
    bubble.id = 'agfAiBubble';
    bubble.className = 'agf-ai-bubble';
    bubble.textContent = 'A';
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
    const fullBtn = document.getElementById('agfAiFull');
    const halfBtn = document.getElementById('agfAiHalf');
    const miniBtn = document.getElementById('agfAiMini');
    const closeBtn = document.getElementById('agfAiClose');
    const titleLabel = document.getElementById('agfTitleLabel');
    const tabChat = document.getElementById('agfAiTabChat');
    const tabPencil = document.getElementById('agfAiTabPencil');
    const tabNote = document.getElementById('agfAiTabNote');
    const tabDoc = document.getElementById('agfAiTabDoc');
    const tabWrench = document.getElementById('agfAiTabWrench');
    const viewChat = document.getElementById('agfAiViewChat');
    const viewQuiz = document.getElementById('agfAiViewQuiz');
    const viewExplain = document.getElementById('agfAiViewExplain');
    const viewVocab = document.getElementById('agfAiViewVocab');
    const viewImage = document.getElementById('agfAiViewImage');
    const viewChart = document.getElementById('agfAiViewChart');
    const quizTab = document.getElementById('agfAiTabQuiz');
    const explainTab = document.getElementById('agfAiTabExplain');
    const vocabTab = document.getElementById('agfAiTabVocab');
    const explainResult = document.getElementById('agfExplainResult');
    const explainSource = document.getElementById('agfExplainSource');
    const explainToChat = document.getElementById('agfExplainToChat');
    const explainRetry = document.getElementById('agfExplainRetry');
    const explainHistory = document.getElementById('agfExplainHistory');
    const vocabResult = document.getElementById('agfVocabResult');
    const vocabStats = document.getElementById('agfVocabStats');
    const vocabStart = document.getElementById('agfVocabStart');
    const vocabReset = document.getElementById('agfVocabReset');
    const imageDropzone = document.getElementById('agfImageDropzone');
    const imageChooseBtn = document.getElementById('agfImageChooseBtn');
    const workspaceImageInput = document.getElementById('agfWorkspaceImageInput');
    const imageWorkspaceResult = document.getElementById('agfImageWorkspaceResult');
    const imageWorkspaceStatus = document.getElementById('agfImageWorkspaceStatus');
    const imageSelectAll = document.getElementById('agfImageSelectAll');
    const imageProcessSelected = document.getElementById('agfImageProcessSelected');
    const imageAddToChat = document.getElementById('agfImageAddToChat');
    const imageWorkspaceRetry = document.getElementById('agfImageWorkspaceRetry');
    const imageWorkspaceClearBtn = document.getElementById('agfImageWorkspaceClear');
    const imageWorkspaceDeleteBtn = document.getElementById('agfImageWorkspaceDelete');
    const imageWorkspaceExportBtn = document.getElementById('agfImageWorkspaceExport');
    const imageWorkspaceHistoryBtn = document.getElementById('agfImageWorkspaceHistory');
    const imageWorkspaceHistoryList = document.getElementById('agfImageWorkspaceHistoryList');
    const imageSelectPending = document.createElement('button');
    const imageSelectFailed = document.createElement('button');
    const imageSelectCompleted = document.createElement('button');
    imageSelectPending.textContent = '未处理'; imageSelectFailed.textContent = '失败'; imageSelectCompleted.textContent = '已处理';
    [imageSelectPending, imageSelectFailed, imageSelectCompleted].forEach(button => { button.type = 'button'; button.className = 'agf-image-filter-btn'; });
    if (imageSelectAll?.parentElement) imageSelectAll.parentElement.after(imageSelectPending, imageSelectFailed, imageSelectCompleted);
    const vocabHistory = document.getElementById('agfVocabHistory');
    const quizCard = document.getElementById('agfQuizCard');
    const quizResult = document.getElementById('agfQuizResult');
    const quizStartActions = document.getElementById('agfQuizStartActions');
    const quizType = document.getElementById('agfQuizType');
    const quizQuestion = document.getElementById('agfQuizQuestion');
    const quizOptions = document.getElementById('agfQuizOptions');
    const quizFeedback = document.getElementById('agfQuizFeedback');
    const quizBackHistory = document.getElementById('agfQuizBackHistory');
    const quizSubmit = document.getElementById('agfQuizSubmit');
    const quizNext = document.getElementById('agfQuizNext');
    const quizProgressText = document.getElementById('agfQuizProgressText');
    const quizProgressBar = document.getElementById('agfQuizProgressBar');
    const quizHistoryBtn = document.getElementById('agfQuizHistory');
    const quizCountSelect = document.getElementById('agfQuizCount');
    const contextSummary = document.getElementById('agfContextSummary');
    const contextButtons = Array.from(overlay.querySelectorAll('.agf-context-btn'));
    const imageContextBtn = document.getElementById('agfImageContextBtn');
    const chartWorkspaceBtn = document.getElementById('agfChartWorkspaceBtn');
    const pageScreenshotBtn = document.getElementById('agfPageScreenshotBtn');
    const audioContextBtn = document.getElementById('agfAudioContextBtn');
    const imageContextInput = document.getElementById('agfImageContextInput');
    const audioContextInput = document.getElementById('agfAudioContextInput');
    const mediaModeSelect = document.getElementById('agfMediaModeSelect');
    const mediaStrategy = document.getElementById('agfMediaStrategy');
    if (mediaModeSelect) mediaModeSelect.disabled = true;
    const statusText = document.getElementById('agfStatusText');
    const viewSettings = document.getElementById('agfAiViewSettings');
    const providerList = document.getElementById('agfProviderList');
    const modelList = document.getElementById('agfModelList');
    const providerDot = document.getElementById('agfProviderDot');
    const providerStatus = document.getElementById('agfProviderStatus');
    const providerTestBtn = document.getElementById('agfProviderTest');
    const fallbackProviderSelect = document.getElementById('agfFallbackProvider');
    const baseUrlInput = document.getElementById('agfBaseUrlInput');
    const apiKeyInput = document.getElementById('agfApiKeyInput');
    const saveKeyBtn = document.getElementById('agfSaveKeyBtn');
    const keySavedBtn = document.getElementById('agfKeySavedBtn');
    if (keySavedBtn) keySavedBtn.style.display = 'none';
    const tempInput = document.getElementById('agfTempInput');
    const pdfToggle = document.getElementById('agfPdfParseToggle');
    const sensitiveToggle = document.getElementById('agfSensitiveToggle');
    const mediaPermissionToggle = document.getElementById('agfMediaPermissionToggle');
    const mediaUploadToggle = document.getElementById('agfMediaUploadToggle');
    const manualParseBtn = document.getElementById('agfManualParseBtn');
    const retentionDaysInput = document.getElementById('agfRetentionDaysInput');
    const foldThresholdInput = document.getElementById('agfFoldThresholdInput');
    const foldHeightInput = document.getElementById('agfFoldHeightInput');
    const sessionProviderSelect = document.getElementById('agfSessionProvider');
    const sessionModelSelect = document.getElementById('agfSessionModel');
    const statusDot = document.getElementById('agfStorageStatusDot');
    const refreshBtn = document.getElementById('agfRefreshBtn');
    const quickSummaryBtn = document.getElementById('agfQuickSummaryBtn');
    const beginnerExplainBtn = document.getElementById('agfBeginnerExplainBtn');
    const btnTranslate = document.getElementById('agfBtnTranslate');
    const btnSelectionExplain = document.getElementById('agfBtnSelectionExplain');
    const btnStructured = document.getElementById('agfBtnStructured');
    const btnExplain = document.getElementById('agfBtnExplain');
    const btnOutline = document.getElementById('agfBtnOutline');
    const btnKeywords = document.getElementById('agfBtnKeywords');
    const moduleHistoryBtn = document.getElementById('agfModuleHistoryBtn');
    const taskActions = overlay.querySelector('.agf-task-actions');
    const visionOcrBtn = document.getElementById('agfBtnVisionOcr');
    const speakBtn = document.getElementById('agfBtnSpeak');
    const glmVisionKeyInput = document.getElementById('agfGlmVisionKeyInput');
    const saveGlmVisionKeyBtn = document.getElementById('agfSaveGlmVisionKeyBtn');
    const speakLanguageSelect = document.getElementById('agfSpeakLanguage');
    const speakVoiceSelect = document.getElementById('agfSpeakVoice');
    const speakRateInput = document.getElementById('agfSpeakRate');
    const speakSampleBtn = document.getElementById('agfSpeakSample');
    const testTextBtn = document.getElementById('agfTestTextBtn');
    const fulltextPanel = document.getElementById('agfFulltextPanel');
    const fulltextContent = document.getElementById('agfFulltextContent');
    const fulltextClose = document.getElementById('agfFulltextClose');
    const refreshHint = document.getElementById('agfRefreshHint');
    const chatList = overlay.querySelector('.agf-chat-list');
    const composerEditor = document.getElementById('agfComposerEditor');
    const mediaAttachment = document.getElementById('agfMediaAttachment');
    const inputPrefix = document.getElementById('agfInputPrefix');
    const inputUser = document.getElementById('agfInputUser');
    const inputAffix = document.getElementById('agfInputAffix');
    const composerHidden = document.getElementById('agfComposerHidden');
    const composerSend = document.getElementById('agfComposerSend');
    const addFullBtn = document.getElementById('agfAddFullTextBtn');
    const chatImagePlusBtn = document.createElement('button');
    chatImagePlusBtn.type = 'button'; chatImagePlusBtn.className = 'agf-send'; chatImagePlusBtn.textContent = '+'; chatImagePlusBtn.title = '添加图片到当前对话';
    if (addFullBtn?.parentElement) addFullBtn.parentElement.insertBefore(chatImagePlusBtn, addFullBtn);
    const chatImageInput = document.createElement('input');
    chatImageInput.type = 'file'; chatImageInput.accept = 'image/*'; chatImageInput.style.display = 'none';
    overlay.appendChild(chatImageInput);
    const carryWrap = document.getElementById('agfCarryWrap');
    const carryInput = document.getElementById('agfCarryInput');
    let carryEdited = false;
    if (carryInput) carryInput.addEventListener('input', () => {
      carryEdited = true;
      try {
        const ci = document.getElementById('agfConvIndex');
        const cl = document.querySelector('#agfAiSettingOverlay .agf-chat-list');
        const labels = Array.from(cl ? cl.querySelectorAll('.agf-qa-label') : []);
        const rounds = labels.filter(el => String(el.textContent||'').trim().startsWith('Q')).length;
        const maxVal = Math.min(4, rounds);
        const v = Math.max(0, Math.min(maxVal, parseInt(String(carryInput.value||'0'),10)||0));
        carryInput.value = String(v);
      } catch (_) {}
    });
    let addedFullText = '';
    let addedFullQuestion = '';
    let addedFullActive = false;
    let addedFullDisplayPrefix = '';
    let addedFullLinkPreview = '';
    const recordsPanel = overlay.querySelector('#agfRecordsPanel');
    const recordsList = overlay.querySelector('#agfRecordsList');
    const recordsTabCurrent = document.getElementById('agfRecordsTabCurrent');
    const recordsTabAll = document.getElementById('agfRecordsTabAll');
    const recordsSearchInput = document.getElementById('agfRecordsSearch');
    const colorsPanel = overlay.querySelector('#agfColorsPanel');
    const colorsClose = overlay.querySelector('#agfColorsClose');
    const colorQBg = document.getElementById('agfColorQBg');
    const colorABg = document.getElementById('agfColorABg');
    const colorDisplayBg = document.getElementById('agfColorDisplayBg');
    const colorQText = document.getElementById('agfColorQText');
    const colorAText = document.getElementById('agfColorAText');
    const colorsApply = document.getElementById('agfColorsApply');
    const settingsTabApi = document.getElementById('agfSettingsTabApi');
    const settingsTabColors = document.getElementById('agfSettingsTabColors');
    const settingsTabParse = document.getElementById('agfSettingsTabParse');
    const settingsTabMedia = document.getElementById('agfSettingsTabMedia');
    const settingsTabDisplay = document.getElementById('agfSettingsTabDisplay');
    const settingsTabSpeak = document.getElementById('agfSettingsTabSpeak');
    const settingsContentApi = document.getElementById('agfSettingsContentApi');
    const settingsContentColors = document.getElementById('agfSettingsContentColors');
    const settingsContentParse = document.getElementById('agfSettingsContentParse');
    const settingsContentMedia = document.getElementById('agfSettingsContentMedia');
    const settingsContentDisplay = document.getElementById('agfSettingsContentDisplay');
    const settingsContentSpeak = document.getElementById('agfSettingsContentSpeak');
    if (settingsTabDisplay) settingsTabDisplay.style.display = 'none';
    if (settingsContentDisplay) settingsContentDisplay.style.display = 'none';
    const colorQBg2 = document.getElementById('agfColorQBg2');
    const colorABg2 = document.getElementById('agfColorABg2');
    const colorDisplayBg2 = document.getElementById('agfColorDisplayBg2');
    const colorQText2 = document.getElementById('agfColorQText2');
    const colorAText2 = document.getElementById('agfColorAText2');
    const colorsApply2 = document.getElementById('agfColorsApply2');
    const preset1Btn = document.getElementById('agfPreset1Btn');
    const preset2Btn = document.getElementById('agfPreset2Btn');
    const preset3Btn = document.getElementById('agfPreset3Btn');
    const preset4Btn = document.getElementById('agfPreset4Btn');
    const presetResetBtn = document.getElementById('agfPresetResetBtn');
    const toastEl = document.getElementById('agfToast');
    let toastTimer = null;
    let toastSticky = false;
    const hideToast = () => { if (!toastEl) return; toastSticky = false; toastEl.style.display = 'none'; toastEl.innerHTML = ''; };
    const showToast = (msg) => { if (!toastEl) return; if (toastSticky) { toastEl.querySelector('.agf-toast-msg') ? (toastEl.querySelector('.agf-toast-msg').textContent = msg) : (toastEl.textContent = msg); toastEl.style.display = 'block'; return; } toastEl.textContent = msg; toastEl.style.display = 'block'; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, 2000); };
    const showStickyToast = (msg) => { if (!toastEl) return; toastSticky = true; if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; } toastEl.innerHTML = `<span class="agf-toast-msg"></span><button class="agf-toast-close">❌</button>`; const msgEl = toastEl.querySelector('.agf-toast-msg'); if (msgEl) msgEl.textContent = msg; toastEl.style.display = 'block'; const btn = toastEl.querySelector('.agf-toast-close'); if (btn) { btn.addEventListener('click', hideToast); } };
    if (miniBtn) miniBtn.addEventListener('click', () => this.minimizeAiSettingPanel());
    if (fullBtn) fullBtn.addEventListener('click', () => this.maximizeAiSettingPanel());
    if (halfBtn) halfBtn.addEventListener('click', () => this.halfAiSettingPanel());
    if (closeBtn) closeBtn.addEventListener('click', () => this.hideAiSettingPanel());
    const updateHiddenFromEditor = () => {
      if (!composerHidden) return;
      let raw = '';
      try { raw = String(composerEditor && composerEditor.innerText || '').trim(); } catch (_) { raw = ''; }
      let pre = '';
      let aft = '';
      try { pre = (inputPrefix && inputPrefix.style.display !== 'none') ? String(inputPrefix.innerText || inputPrefix.textContent || '') : ''; } catch (_) { pre = ''; }
      try { aft = (inputAffix && inputAffix.style.display !== 'none') ? String(inputAffix.innerText || inputAffix.textContent || '') : ''; } catch (_) { aft = ''; }
      if (pre) raw = raw.replace(pre, '').trim();
      if (aft) raw = raw.replace(aft, '').trim();
      const mid = String(inputUser && inputUser.innerText || '').trim();
      composerHidden.value = mid || raw;
    };
    if (composerEditor) composerEditor.addEventListener('input', updateHiddenFromEditor);
    const focusUserCaretEnd = () => { try { if (!inputUser) return; const range = document.createRange(); range.selectNodeContents(inputUser); range.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); } catch (_) {} };
    if (addFullBtn) addFullBtn.addEventListener('click', async () => {
      hideFulltextPanel();
      if (!addedFullActive) {
        await updateStorageStatusUI();
        const ctx = await taixueContext.resolve('full_article');
        const raw = String(ctx.text || '');
        if (raw.length > TAIXUE_CONTEXT_MAX_WARN_CHARS) {
          showToast('目前还在升级AI功能，超出12000字数的文本不建议发送，可能会超出ai最大长度。');
        }
        addedFullText = raw;
        const link = String(ctx.canonicalUrl || ctx.pageUrl || (location && location.href) || '');
        const previewRaw = String(addedFullText||'');
        const preview = previewRaw.slice(0, 20) + (previewRaw.length > 20 ? '...' : '');
        addedFullDisplayPrefix = '我的问题是： ';
        addedFullLinkPreview = '，基于当前全文（' + link + '+' + preview + '）';
        addFullBtn.classList.add('active');
        if (inputPrefix) { inputPrefix.style.display = 'inline'; }
        if (inputAffix) { inputAffix.textContent = addedFullLinkPreview; inputAffix.style.display = 'inline'; }
        addedFullActive = true;
        focusUserCaretEnd();
      } else {
        addFullBtn.classList.remove('active');
        if (inputPrefix) { inputPrefix.style.display = 'none'; }
        if (inputAffix) { inputAffix.textContent = ''; inputAffix.style.display = 'none'; }
        addedFullText = '';
        addedFullQuestion = '';
        addedFullDisplayPrefix = '';
        addedFullLinkPreview = '';
        addedFullActive = false;
        focusUserCaretEnd();
      }
    });
    let bDragging = false, bMoved = false, bStartX = 0, bStartY = 0, bStartLeft = 0, bStartTop = 0;
    const bubbleMove = (e) => { if (!bDragging) return; const dx = e.clientX - bStartX; const dy = e.clientY - bStartY; const nl = Math.min(Math.max(0, bStartLeft + dx), window.innerWidth - bubble.offsetWidth); const nt = Math.min(Math.max(0, bStartTop + dy), window.innerHeight - bubble.offsetHeight); bubble.style.left = nl + 'px'; bubble.style.top = nt + 'px'; bubble.style.right = 'auto'; bubble.style.bottom = 'auto'; if (Math.abs(dx) + Math.abs(dy) > 3) bMoved = true; };
    const bubbleUp = () => { if (!bDragging) return; bDragging = false; document.removeEventListener('mousemove', bubbleMove); document.removeEventListener('mouseup', bubbleUp); if (bMoved) { this.__bubblePos = { left: parseInt(bubble.style.left, 10) || 0, top: parseInt(bubble.style.top, 10) || 0 }; bMoved = false; } else { this.restoreAiSettingPanel(); } };
    const bubbleDown = (e) => { try { const rect = bubble.getBoundingClientRect(); bDragging = true; bMoved = false; bStartX = e.clientX; bStartY = e.clientY; bStartLeft = rect.left; bStartTop = rect.top; bubble.style.left = bStartLeft + 'px'; bubble.style.top = bStartTop + 'px'; bubble.style.right = 'auto'; bubble.style.bottom = 'auto'; document.addEventListener('mousemove', bubbleMove); document.addEventListener('mouseup', bubbleUp); } catch (_) {} };
    bubble.addEventListener('mousedown', bubbleDown);
    const TAIXUE_CONTEXT_MAX_WARN_CHARS = 12000;
    const estimateTaixueTokens = (text) => {
      const raw = String(text || '');
      const cjk = /[\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf\uff00-\uffef]/.test(raw);
      return Math.ceil(raw.length * (cjk ? 1 : 0.75));
    };
    const limitTaixueText = (text, maxChars = 70000) => {
      const raw = String(text || '');
      if (raw.length <= maxChars) return { text: raw, truncated: false, originalLength: raw.length, approxTokens: estimateTaixueTokens(raw) };
      const head = raw.slice(0, Math.floor(maxChars * 0.62));
      const tail = raw.slice(Math.max(0, raw.length - Math.floor(maxChars * 0.28)));
      const limited = `${head}\n\n[...中间内容已按预算省略，原文约 ${raw.length} 字...]\n\n${tail}`;
      return { text: limited, truncated: true, originalLength: raw.length, approxTokens: estimateTaixueTokens(limited) };
    };
    const getSelectedTextSafe = () => {
      try {
        if (typeof this.getSelectedText === 'function') return this.getSelectedText();
        const selection = window.getSelection();
        return selection ? String(selection.toString() || '').trim() : '';
      } catch (_) {
        return '';
      }
    };
    const getCurrentParagraphText = () => {
      try {
        const selection = window.getSelection();
        let node = selection && selection.anchorNode;
        if (node && node.nodeType === 3) node = node.parentElement;
        let el = node && node.closest ? node.closest('p,li,blockquote,article,section,div') : null;
        if (!el) {
          const centerX = Math.floor(window.innerWidth / 2);
          const centerY = Math.floor(window.innerHeight / 2);
          const hit = document.elementFromPoint(centerX, centerY);
          el = hit && hit.closest ? hit.closest('p,li,blockquote,article,section,div') : null;
        }
        if (!el || this.isExtensionUi(el)) return '';
        return this.normalizeText(el.innerText || el.textContent || '');
      } catch (_) {
        return '';
      }
    };
    const taixueState = {
      currentModule: 'chat',
      taskStatus: 'idle',
      contextSource: 'full_article',
      setModule(moduleName) {
        this.currentModule = moduleName || 'chat';
      },
      setTaskStatus(status) {
        this.taskStatus = status || 'idle';
      },
      setContextSource(source) {
        this.contextSource = source || 'full_article';
      },
      getProviderState() {
        return {
          provider: sessionProviderSelect ? sessionProviderSelect.value : '',
          model: sessionModelSelect ? sessionModelSelect.value : ''
        };
      }
    };
    const taixueHash = (value) => {
      const text = String(value || ''); let hash = 2166136261;
      for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
      return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
    };
    const createTaixueContext = ({ source = 'manual', text = '', image = null, audio = null, chart = null, sourceUrl = '', confirmed = false, metadata = {} } = {}) => {
      const normalizedText = String(text || '').trim();
      const mediaText = [image && image.ocrText, audio && audio.transcript, chart && chart.dsl].filter(Boolean).join('\n');
      return {
        source, text: normalizedText, image: image || null, audio: audio || null, chart: chart || null,
        sourceUrl: sourceUrl || String(location.href || ''), pageUrl: String(location.href || ''), pageTitle: getMetaTitle(),
        createdAt: Date.now(), contentHash: taixueHash(normalizedText || mediaText || JSON.stringify({ image, audio, chart })), confirmed: Boolean(confirmed), metadata
      };
    };
    const taixueContext = {
      async resolve(source = taixueState.contextSource, options = {}) {
        taixueState.setTaskStatus('preparing_context');
        const u = getCanonicalUrl();
        const selected = String(getSelectedTextSafe() || '').trim();
        if ((source === 'image' || source === 'audio') && currentMediaContext && currentMediaContext.source === source) {
          taixueState.setContextStatus?.('ready');
          return currentMediaContext;
        }
        const preferredSource = source === 'selection' ? (selected ? 'selection' : 'full_article') : source;
        let text = '';
        if (preferredSource === 'selection') {
          text = selected;
        } else if (preferredSource === 'paragraph') {
          text = getCurrentParagraphText();
        } else if (preferredSource === 'manual') {
          text = String(options.text || '').trim();
        } else {
          text = isPdfPage() ? await buildPdfStructuredOutlineText() : await buildStructuredFromLegacyOrHints();
        }
        text = String(text || '').trim();
        const sourceName = preferredSource === 'selection' ? 'selection' : (preferredSource === 'paragraph' ? 'paragraph' : (preferredSource === 'manual' ? 'manual' : 'full_article'));
        taixueState.setContextSource(sourceName);
        taixueState.setTaskStatus(text ? 'ready' : 'failed');
        return { ...createTaixueContext({ source: sourceName, text, sourceUrl: u.canonicalUrl }), selectedText: selected, canonicalUrl: u.canonicalUrl, textLength: text.length, approxTokens: estimateTaixueTokens(text) };
      }
    };
    const taixueTaskProtocol = {
      taskType: 'string', context: 'object', provider: 'string', model: 'string', budget: 'object', outputSchema: 'object', allowNetwork: 'boolean', allowPersistence: 'boolean', retryPolicy: 'object'
    };
    const validateTaixueTaskRequest = (request) => {
      if (!request || typeof request !== 'object') throw new Error('任务请求必须是对象');
      if (!String(request.taskType || '').trim()) throw new Error('任务类型不能为空');
      if (!request.context || typeof request.context !== 'object') throw new Error('任务上下文不能为空');
      if (request.allowNetwork === true && !request.context.confirmed && (request.context.image || request.context.audio)) throw new Error('媒体内容上传前需要用户确认');
      return { ...request, allowNetwork: request.allowNetwork !== false, allowPersistence: request.allowPersistence === true, budget: request.budget || {}, outputSchema: request.outputSchema || { type: 'text' }, retryPolicy: request.retryPolicy || { maxRetries: 1 } };
    };
    const validateTaixueOutput = (output, schema = { type: 'text' }) => {
      if (schema.type === 'text') return String(output || '').trim();
      const parsed = parseJsonPayload(output);
      if (schema.type === 'array' && !Array.isArray(parsed)) throw new Error('AI 输出不是有效数组');
      if (schema.type === 'object' && (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')) throw new Error('AI 输出不是有效对象');
      return parsed;
    };
    const taixueTask = {
      getModelCapabilities(provider, model) {
        const p = String(provider || '').toLowerCase(); const m = String(model || '').toLowerCase();
        const configured = typeof PROVIDERS_CONFIG !== 'undefined' ? PROVIDERS_CONFIG[p]?.modelInfo?.[model] : null;
        if (configured) return { ...configured.capabilities, ...configured, supportsBatchVision: configured.capabilities?.vision === true, maxImagesPerRequest: configured.capabilities?.vision === true ? 8 : 1, strategy: configured.capabilities?.vision === true ? 'vision' : 'recognition_then_text' };
        const registered = {
          'openai/gpt-4o': { vision: true, supportsBatchVision: true, maxImagesPerRequest: 8 },
          'openai/gpt-5': { vision: true, supportsBatchVision: true, maxImagesPerRequest: 8 },
          'gemini/gemini-1.5-pro': { vision: true, supportsBatchVision: true, maxImagesPerRequest: 8 },
          'gemini/gemini-1.5-flash': { vision: true, supportsBatchVision: true, maxImagesPerRequest: 8 },
          'gemini/gemini-2.0-flash-001': { vision: true, supportsBatchVision: true, maxImagesPerRequest: 8 },
          'gemini/gemini-2.5-flash': { vision: true, supportsBatchVision: true, maxImagesPerRequest: 8 }
        };
        const entry = registered[`${p}/${m}`] || {};
        return { text: true, vision: entry.vision === true, audio: false, imageGeneration: false, supportsBatchVision: entry.supportsBatchVision === true, maxImagesPerRequest: entry.maxImagesPerRequest || 1, strategy: entry.vision ? 'vision' : 'recognition_then_text' };
      },
      async requestGlmVision({ imageDataUrl, prompt = '请识别图片内容，并先输出图片中的文字，再补充简要说明。' }) {
        const stored = await new Promise(resolve => chrome.storage.local.get(['glmVisionApiKey'], resolve));
        const key = String(stored.glmVisionApiKey || '').trim();
        if (!key) throw new Error('请先在太学设置中填写 GLM-4V-Flash Key');
        if (!String(imageDataUrl || '').startsWith('data:image/') && !/^https?:\/\//i.test(String(imageDataUrl || ''))) throw new Error('当前上下文不是有效图片');
        const body = JSON.stringify({ model: 'glm-4v-flash', messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageDataUrl } }, { type: 'text', text: prompt }] }], temperature: 0.2, max_tokens: 1024 });
        const resp = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'aiChatRequest', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body, timeout: 60000 }, resolve));
        if (!resp || !resp.success || (typeof resp.status === 'number' && (resp.status < 200 || resp.status >= 300))) { const detail = resp?.data?.error?.message || resp?.data?.message || resp?.error || ''; throw new Error(`GLM 图片识别失败${detail ? `：${detail}` : '，请检查 Key、模型名称或图片大小'}`); }
        const content = resp.data?.choices?.[0]?.message?.content ?? resp.data?.choices?.[0]?.text ?? resp.data?.output?.text ?? resp.data?.data ?? '';
        const text = Array.isArray(content) ? content.map(x => typeof x === 'string' ? x : (x.text || '')).join('') : String(content || '');
        if (!text.trim()) throw new Error('GLM 返回了空识别结果，请检查模型权限或图片格式');
        return text;
      },
      async requestStructured(request) {
        const safeRequest = validateTaixueTaskRequest(request);
        if (!safeRequest.allowNetwork) throw new Error('该任务未允许联网请求');
        const output = await this.requestJsonText({ prompt: safeRequest.prompt || '', timeout: safeRequest.budget.timeout || 60000, maxTokens: safeRequest.budget.maxTokens || 1800, temperature: safeRequest.budget.temperature || 0.4 });
        return { taskType: safeRequest.taskType, context: safeRequest.context, output: validateTaixueOutput(output, safeRequest.outputSchema), createdAt: Date.now(), persisted: false };
      },
      async requestJsonText({ prompt, timeout = 60000, maxTokens = 1800, temperature = 0.4 }) {
        const { provider: prov, model } = taixueState.getProviderState();
        const stored = await new Promise(resolve => chrome.storage.local.get(['aiKeys','aiBaseUrls'], resolve));
        const key = String((stored.aiKeys || {})[prov] || '').trim();
        if (!key) throw new Error('当前供应商尚未配置 API Key');
        const baseTemplate = (stored.aiBaseUrls || {})[prov] || PROVIDERS_CONFIG[prov]?.baseUrl || '';
        let headers = { 'Content-Type': 'application/json' };
        const normalizedModel = String(model || '').toLowerCase();
        const preferredTemperature = /reasoner|reasoning|thinking|deepseek-r1|qwen3|gpt-5|gpt-oss|(^|\/)o[134]/i.test(normalizedModel) ? 1 : temperature;
        const buildRequest = (temp) => {
          if (prov === 'anthropic') {
            headers['x-api-key'] = key; headers['anthropic-version'] = '2023-06-01';
            return { url: baseTemplate, body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }) };
          }
          if (prov === 'gemini') {
            return { url: baseTemplate.replace('{model}', model) + '?key=' + encodeURIComponent(key), body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: temp } }) };
          }
          headers.Authorization = 'Bearer ' + key;
          return { url: baseTemplate, body: JSON.stringify({ model, temperature: temp, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }) };
        };
        let request = buildRequest(preferredTemperature);
        taixueState.setTaskStatus('requesting');
        let resp = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'aiChatRequest', url: request.url, method: 'POST', headers, body: request.body, timeout }, resolve));
        const failedStatus = resp && typeof resp.status === 'number' && (resp.status < 200 || resp.status >= 300);
        const temperatureError = resp && (!resp.success || failedStatus) && /invalid temperature|temperature.*only 1|only 1 is allowed/i.test(String(resp?.data?.error?.message || resp?.data?.message || resp?.error || ''));
        if (temperatureError && preferredTemperature !== 1 && prov !== 'anthropic') {
          request = buildRequest(1);
          resp = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'aiChatRequest', url: request.url, method: 'POST', headers, body: request.body, timeout }, resolve));
        }
        if (!resp || !resp.success || (typeof resp.status === 'number' && (resp.status < 200 || resp.status >= 300))) {
          taixueState.setTaskStatus('failed');
          const detail = resp?.data?.error?.message || resp?.data?.message || resp?.error || '';
          throw new Error(`AI 请求失败，请检查供应商、模型和 API Key${detail ? `：${detail}` : ''}`);
        }
        const data = resp.data || {};
        let output = '';
        if (prov === 'anthropic') output = data.content?.map(part => part?.text || '').join('') || '';
        else if (prov === 'gemini') output = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        else {
          const choice = data.choices?.[0] || {};
          output = choice.message?.content || choice.text || data.output?.text || data.output_text || '';
        }
        taixueState.setTaskStatus('completed');
        output = Array.isArray(output) ? output.map(part => typeof part === 'string' ? part : (part?.text || '')).join('') : String(output || '');
        if (!output.trim()) {
          const choice = data.choices?.[0] || {};
          const reason = choice.finish_reason || data.candidates?.[0]?.finishReason || '';
          const detail = choice.message?.reasoning_content ? '模型只返回了推理内容，没有返回可解析正文。' : '';
          throw new Error(`AI 返回了空内容${reason ? `（finish_reason: ${reason}）` : ''}${detail ? `：${detail}` : '。请缩短材料或更换模型后重试。'}`);
        }
        return output;
      }
    };
    let currentView = 'chat';
    const updateTaskBar = (which) => {
      const groups = {
        chat: ['agfQuickSummaryBtn','agfBeginnerExplainBtn','agfBtnTranslate','agfBtnKeywords','agfBtnStructured','agfBtnExplain','agfBtnOutline','agfBtnVisionOcr','agfBtnSpeak','agfBtnChartSkill'],
        quiz: [], explain: ['agfBtnSelectionExplain','agfBtnChartSkill'], vocab: [], image: [], chart: []
      };
      const visible = new Set(groups[which] || []);
      ['agfQuickSummaryBtn','agfBeginnerExplainBtn','agfBtnTranslate','agfBtnSelectionExplain','agfBtnKeywords','agfBtnStructured','agfBtnExplain','agfBtnOutline','agfBtnVisionOcr','agfBtnSpeak','agfBtnChartSkill'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = visible.has(id) ? '' : 'none'; });
      if (moduleHistoryBtn) moduleHistoryBtn.style.display = ['explain','vocab','chat','quiz'].includes(which) ? '' : 'none';
    };
    const setView = (which) => {
      currentView = which;
      taixueState.setModule(which);
      updateTaskBar(which);
      if (which === 'chat' || which === 'quiz') {
        try { chrome.storage.local.set({ agfTaixueLastModule: which }); } catch (_) {}
      }
      if (viewChat) viewChat.style.display = which === 'chat' ? 'grid' : 'none';
      if (viewQuiz) viewQuiz.style.display = which === 'quiz' ? 'block' : 'none';
      if (viewExplain) viewExplain.style.display = which === 'explain' ? 'block' : 'none';
      if (viewVocab) viewVocab.style.display = which === 'vocab' ? 'block' : 'none';
      if (viewImage) viewImage.style.display = which === 'image' ? 'block' : 'none';
      if (viewChart) viewChart.style.display = which === 'chart' ? 'block' : 'none';
      if (viewSettings) viewSettings.style.display = which === 'settings' ? 'block' : 'none';
      if (recordsPanel) recordsPanel.style.display = which === 'records' ? 'block' : 'none';
      if (colorsPanel) colorsPanel.style.display = 'none';
      if (tabChat) tabChat.classList.toggle('active', which === 'chat');
      if (quizTab) quizTab.classList.toggle('active', which === 'quiz');
      if (explainTab) explainTab.classList.toggle('active', which === 'explain');
      if (vocabTab) vocabTab.classList.toggle('active', which === 'vocab');
      if (chartButton) chartButton.classList.toggle('active', which === 'chart');
      if (chartWorkspaceBtn) chartWorkspaceBtn.classList.toggle('active', which === 'chart');
      if (tabWrench) tabWrench.classList.toggle('active', which === 'settings');
    };
    const showChat = () => { setView('chat'); try { rebuildConvIndex(); } catch (_) {} try { focusUserCaretEnd(); } catch (_) {} };
    const updateContextControls = async (source = taixueState.contextSource) => {
      taixueState.setContextSource(source);
      contextButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.source === taixueState.contextSource));
      if (!contextSummary) return;
      const labels = { full_article: '全文', selection: '选中内容', paragraph: '当前段落', manual: '手动内容' };
      let preview = '';
      try {
        if (source === 'selection') preview = getSelectedTextSafe().slice(0, 30);
        else if (source === 'paragraph') preview = getCurrentParagraphText().slice(0, 30);
      } catch (_) {}
      contextSummary.textContent = `当前上下文：${labels[source] || '全文'}${preview ? ` · ${preview}` : ''}`;
    };
    contextButtons.forEach(btn => btn.addEventListener('click', () => updateContextControls(btn.dataset.source || 'full_article')));
    let currentMediaContext = null;
    let currentMediaBatch = [];
    let activeChatImageContext = null;
    let currentChartContext = null;
    let currentChartSourceContext = null;
    let currentChartSkill = null;
    const chartButton = document.createElement('button');
    chartButton.id = 'agfBtnChartSkill'; chartButton.className = 'agf-task-btn'; chartButton.textContent = '做图表'; chartButton.title = '用内置图表 Skill 解释当前上下文';
    if (taskActions) taskActions.appendChild(chartButton);
    const chartView = viewChart;
    const chartCanvas = chartView.querySelector('#agfChartCanvas');
    const chartTitle = chartView.querySelector('#agfChartTitle');
    const chartSourceText = chartView.querySelector('#agfChartSourceText');
    const chartSkillBadge = chartView.querySelector('#agfChartSkillBadge');
    const chartIntent = chartView.querySelector('#agfChartIntent');
    const chartRenderer = chartView.querySelector('#agfChartRenderer');
    const chartNotice = chartView.querySelector('#agfChartNotice');
    const chartMeta = chartView.querySelector('#agfChartMeta');
    const chartHistory = chartView.querySelector('#agfChartHistory');
    const chartButtons = { generate: chartView.querySelector('#agfChartGenerate'), save: chartView.querySelector('#agfChartSave'), svg: chartView.querySelector('#agfChartSvg'), json: chartView.querySelector('#agfChartJson'), importJson: chartView.querySelector('#agfChartImport'), html: chartView.querySelector('#agfChartHtml'), png: chartView.querySelector('#agfChartPng'), attach: chartView.querySelector('#agfChartAttach'), undo: chartView.querySelector('#agfChartUndo'), redo: chartView.querySelector('#agfChartRedo'), addNode: chartView.querySelector('#agfChartAddNode'), addEdge: chartView.querySelector('#agfChartAddEdge'), delete: chartView.querySelector('#agfChartDelete') };
    const chartTheme = chartView.querySelector('#agfChartTheme') || (() => { const select = document.createElement('select'); select.id = 'agfChartTheme'; select.className = 'agf-field'; select.innerHTML = '<option value="system">跟随系统</option><option value="light">浅色主题</option><option value="dark">深色主题</option>'; chartView.querySelector('.agf-chart-toolbar')?.appendChild(select); return select; })();
    const archifyOptions = [{ value: 'architecture', label: '架构 / 关系图' }, { value: 'workflow', label: 'Workflow / 泳道流程' }, { value: 'data_flow', label: 'Data Flow / 数据流' }, { value: 'lifecycle', label: 'Lifecycle / 生命周期' }, { value: 'sequence', label: 'Sequence / 时序' }];
    archifyOptions.forEach(option => { if (chartIntent && !chartIntent.querySelector(`option[value="${option.value}"]`)) { const item = document.createElement('option'); item.value = option.value; item.textContent = option.label; chartIntent.appendChild(item); } });
    const chartHistoryState = { past: [], future: [], selected: new Set(), selectedEdges: new Set(), edgeMode: false };
    const chartSnapshot = () => currentChartContext ? JSON.parse(JSON.stringify(currentChartContext)) : null;
    const rememberChart = () => { const snapshot = chartSnapshot(); if (!snapshot) return; chartHistoryState.past.push(snapshot); if (chartHistoryState.past.length > 40) chartHistoryState.past.shift(); chartHistoryState.future = []; updateChartHistoryButtons(); };
    const updateChartHistoryButtons = () => { if (chartButtons.undo) chartButtons.undo.disabled = !chartHistoryState.past.length; if (chartButtons.redo) chartButtons.redo.disabled = !chartHistoryState.future.length; };
    const downloadChartFile = (name, content, type) => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); };
    const chartFileName = ext => `${(currentChartContext?.chartModel?.title || 'taixue-chart').replace(/[^\w\u4e00-\u9fff-]+/g, '-')}.${ext}`;
    const chartZoomOut = chartView.querySelector('#agfChartZoomOut');
    const chartZoomReset = chartView.querySelector('#agfChartZoomReset');
    const chartZoomIn = chartView.querySelector('#agfChartZoomIn');
    let chartZoom = 1;
    const applyChartZoom = () => {
      const svg = chartCanvas?.querySelector('svg');
      if (!svg) return;
      svg.style.transformOrigin = '0 0';
      svg.style.transform = `scale(${chartZoom})`;
      svg.style.marginRight = `${Math.max(0, (chartZoom - 1) * svg.clientWidth)}px`;
      svg.style.marginBottom = `${Math.max(0, (chartZoom - 1) * svg.clientHeight)}px`;
      if (chartZoomReset) chartZoomReset.textContent = `${Math.round(chartZoom * 100)}%`;
    };
    const setChartZoom = value => { chartZoom = Math.max(0.35, Math.min(2.5, value)); applyChartZoom(); };
    const svgPointFromEvent = (svg, event) => {
      const point = svg.createSVGPoint();
      point.x = event.clientX; point.y = event.clientY;
      return point.matrixTransform(svg.getScreenCTM().inverse());
    };
    const openChartInlineEditor = (target, value, onCommit, options = {}) => {
      if (!chartCanvas || !target) return;
      chartCanvas.querySelectorAll('.agf-chart-inline-editor').forEach(item => item.remove());
      const svg = chartCanvas.querySelector('svg');
      const canvasRect = chartCanvas.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const editor = document.createElement(options.multiline ? 'textarea' : 'input');
      editor.className = 'agf-chart-inline-editor';
      editor.value = value || '';
      editor.style.position = 'absolute';
      editor.style.left = `${targetRect.left - canvasRect.left - Math.max(0, (options.width || 160) - targetRect.width) / 2 + chartCanvas.scrollLeft}px`;
      editor.style.top = `${targetRect.top - canvasRect.top - 6 + chartCanvas.scrollTop}px`;
      editor.style.width = `${options.width || Math.max(120, targetRect.width + 36)}px`;
      editor.style.minHeight = options.multiline ? '58px' : '28px';
      editor.style.padding = '5px 8px';
      editor.style.border = `1px solid ${options.color || '#315efb'}`;
      editor.style.borderRadius = '8px';
      editor.style.background = '#ffffff';
      editor.style.color = '#172033';
      editor.style.font = `${options.fontSize || 13}px Arial,sans-serif`;
      editor.style.boxShadow = '0 10px 24px rgba(15,23,42,.18)';
      editor.style.zIndex = '10';
      editor.style.outline = 'none';
      editor.style.resize = options.multiline ? 'vertical' : 'none';
      editor.style.textAlign = options.align || 'center';
      chartCanvas.style.position = chartCanvas.style.position || 'relative';
      chartCanvas.appendChild(editor);
      if (svg) svg.style.pointerEvents = 'none';
      const close = commit => {
        if (!editor.isConnected) return;
        const next = editor.value;
        editor.remove();
        if (svg) svg.style.pointerEvents = '';
        if (commit) onCommit(next);
      };
      editor.addEventListener('mousedown', event => event.stopPropagation());
      editor.addEventListener('click', event => event.stopPropagation());
      editor.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (!options.multiline || event.metaKey || event.ctrlKey)) { event.preventDefault(); close(true); }
        if (event.key === 'Escape') { event.preventDefault(); close(false); }
      });
      editor.addEventListener('blur', () => close(true));
      setTimeout(() => { editor.focus(); editor.select(); }, 0);
    };
    const attachChartInteractions = () => {
      const svg = chartCanvas?.querySelector('svg');
      if (!svg || !currentChartContext?.chartModel?.nodes) return;
      let pendingNodeClick = null;
      const cancelPendingNodeClick = () => { if (pendingNodeClick) { clearTimeout(pendingNodeClick); pendingNodeClick = null; } };
      svg.style.touchAction = 'none';
      svg.querySelectorAll('.agf-chart-node').forEach(group => {
        const nodeId = group.getAttribute('data-node-id');
        const node = currentChartContext.chartModel.nodes.find(item => item.id === nodeId);
        if (node) { node.x = Number(group.getAttribute('data-x')) || node.x; node.y = Number(group.getAttribute('data-y')) || node.y; }
      });
      svg.addEventListener('wheel', event => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); setChartZoom(chartZoom + (event.deltaY > 0 ? -0.1 : 0.1)); }, { passive: false });
      svg.style.cursor = chartHistoryState.edgeMode ? 'crosshair' : '';
      Array.from(svg.querySelectorAll('.agf-chart-node')).forEach(group => {
        group.addEventListener('pointerdown', event => {
          const nodeId = group.getAttribute('data-node-id');
          const node = currentChartContext.chartModel.nodes.find(item => item.id === nodeId);
          if (!node) return;
          const start = svgPointFromEvent(svg, event);
          const origin = { x: Number(node.x) || start.x, y: Number(node.y) || start.y };
          let dragging = false;
          const move = moveEvent => {
            const point = svgPointFromEvent(svg, moveEvent);
            if (!dragging && Math.hypot(point.x - start.x, point.y - start.y) < 4) return;
            if (!dragging) { dragging = true; rememberChart(); svg.style.cursor = 'grabbing'; }
            node.x = Math.max(40, Math.min(860, origin.x + point.x - start.x));
            node.y = Math.max(80, Math.min(Number(svg.viewBox.baseVal.height || 520) - 40, origin.y + point.y - start.y));
            currentChartContext.updatedAt = Date.now();
            group.setAttribute('transform', `translate(${(node.x - origin.x).toFixed(1)},${(node.y - origin.y).toFixed(1)})`);
          };
          const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up); svg.style.cursor = chartHistoryState.edgeMode ? 'crosshair' : ''; if (dragging) renderChartPreview(); };
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', up);
          document.addEventListener('pointercancel', up);
        });
      });
      Array.from(svg.querySelectorAll('.agf-chart-node-label')).forEach(label => {
        label.addEventListener('dblclick', event => {
          event.stopPropagation();
          event.preventDefault();
          cancelPendingNodeClick();
          const node = currentChartContext.chartModel.nodes.find(item => item.id === label.getAttribute('data-node-id'));
          if (!node) return;
          rememberChart();
          openChartInlineEditor(label, node.label || '', next => {
            node.label = next.trim() || node.label;
            currentChartContext.updatedAt = Date.now();
            renderChartPreview();
          }, { width: 180, color: '#315efb', fontSize: 14 });
        });
      });
      Array.from(svg.querySelectorAll('.agf-chart-node-desc')).forEach(label => {
        label.addEventListener('dblclick', event => {
          event.stopPropagation();
          event.preventDefault();
          cancelPendingNodeClick();
          const node = currentChartContext.chartModel.nodes.find(item => item.id === label.getAttribute('data-node-id'));
          if (!node) return;
          rememberChart();
          openChartInlineEditor(label, node.description || '', next => {
            node.description = next.trim();
            currentChartContext.updatedAt = Date.now();
            renderChartPreview();
          }, { width: 220, color: '#687386', fontSize: 12, multiline: true, align: 'left' });
        });
      });
      Array.from(svg.querySelectorAll('.agf-chart-edge-label')).forEach(label => {
        label.addEventListener('click', event => { event.stopPropagation(); if (chartHistoryState.edgeMode) return; chartHistoryState.selectedEdges = new Set([Number(label.getAttribute('data-edge-index'))]); chartNotice.textContent = '已选择连线。双击文字编辑；Delete 删除。'; });
        label.addEventListener('dblclick', event => {
          event.stopPropagation();
          event.preventDefault();
          const index = Number(label.getAttribute('data-edge-index'));
          const edge = currentChartContext.chartModel.edges && currentChartContext.chartModel.edges[index];
          if (!edge) return;
          rememberChart();
          openChartInlineEditor(label, edge.label || '', next => {
            edge.label = next.trim();
            currentChartContext.updatedAt = Date.now();
            renderChartPreview();
          }, { width: 130, color: label.getAttribute('fill') || '#315efb', fontSize: 12 });
        });
      });
      Array.from(svg.querySelectorAll('.agf-chart-edge')).forEach(edge => edge.addEventListener('click', event => { event.stopPropagation(); if (chartHistoryState.edgeMode) return; chartHistoryState.selectedEdges = new Set([Number(edge.getAttribute('data-edge-index'))]); chartNotice.textContent = '已选择连线。双击文字编辑；Delete 删除。'; }));
      Array.from(svg.querySelectorAll('.agf-chart-node')).forEach(group => group.addEventListener('click', event => {
        event.stopPropagation(); const id = group.getAttribute('data-node-id');
        cancelPendingNodeClick();
        pendingNodeClick = setTimeout(() => { pendingNodeClick = null;
        if (chartHistoryState.edgeMode) { const picked = [...chartHistoryState.selected]; if (!picked.length) { chartHistoryState.selected = new Set([id]); chartNotice.textContent = `已选择起点“${id}”，请点击目标节点`; } else if (picked[0] !== id) { rememberChart(); currentChartContext.chartModel.edges = currentChartContext.chartModel.edges || []; currentChartContext.chartModel.edges.push({ source: picked[0], target: id, label: '关系', sourceRefs: [] }); chartHistoryState.selected.clear(); chartHistoryState.edgeMode = false; currentChartContext.updatedAt = Date.now(); chartNotice.textContent = '连线已创建，双击“关系”文字可以编辑'; renderChartPreview(); } return; }
        if (event.shiftKey) { chartHistoryState.selected.has(id) ? chartHistoryState.selected.delete(id) : chartHistoryState.selected.add(id); } else { chartHistoryState.selected = new Set([id]); }
        svg.querySelectorAll('.agf-chart-node').forEach(item => item.style.filter = chartHistoryState.selected.has(item.getAttribute('data-node-id')) ? 'drop-shadow(0 0 5px #f59e0b)' : '');
        chartHistoryState.selectedEdges.clear(); if (chartButtons.delete) chartButtons.delete.disabled = false; if (!chartHistoryState.edgeMode) chartNotice.textContent = `${chartHistoryState.selected.size ? `已选择 ${chartHistoryState.selected.size} 个节点` : '未选择节点'}。拖动移动；双击文字编辑；Delete 删除。`;
        }, 240);
      }));
    };
    const getCurrentChartSvg = async () => {
      if (!currentChartContext) return '';
      return AgfChartWorkspace.renderSvgAsync ? AgfChartWorkspace.renderSvgAsync(currentChartContext) : AgfChartWorkspace.renderSvg(currentChartContext);
    };
    let chartRenderToken = 0;
    const renderChartPreview = async () => {
      if (!currentChartContext) return;
      const token = ++chartRenderToken;
      const contextAtStart = currentChartContext;
      chartTitle.value = currentChartContext.chartModel.title || '';
      chartIntent.value = currentChartContext.intent;
      if (chartRenderer) chartRenderer.value = currentChartContext.renderer === 'mermaid' ? 'mermaid' : (currentChartContext.renderer === 'rough' ? 'rough' : 'svg');
      if (chartTheme) chartTheme.value = currentChartContext.theme || 'system';
      if (chartIntent) chartIntent.value = currentChartContext.viewType || currentChartContext.intent || 'architecture';
      chartMeta.textContent = `${currentChartContext.source} · ${new Date(currentChartContext.updatedAt).toLocaleString()}`;
      chartCanvas.innerHTML = '<div style="padding:18px;color:#687386;font-size:12px">正在渲染图表…</div>';
      try {
        const svg = await Promise.race([
          getCurrentChartSvg(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('图表渲染超时')), 6000))
        ]);
        if (token !== chartRenderToken || currentChartContext !== contextAtStart) return;
        chartCanvas.innerHTML = svg;
      } catch (error) {
        if (token !== chartRenderToken || currentChartContext !== contextAtStart) return;
        chartCanvas.innerHTML = AgfChartWorkspace.renderSvg(currentChartContext);
        chartNotice.textContent = `${error.message || '图表渲染失败'}，已切换到基础 SVG 预览。`;
      }
      Object.values(chartButtons).forEach(button => { if (button && button !== chartButtons.generate && button !== chartButtons.importJson) button.disabled = false; });
      if (chartButtons.delete) chartButtons.delete.disabled = !chartHistoryState.selected.size && !chartHistoryState.selectedEdges.size;
      applyChartZoom();
      attachChartInteractions();
      updateChartHistoryButtons();
    };
    if (chartZoomOut) chartZoomOut.onclick = () => setChartZoom(chartZoom - 0.15);
    if (chartZoomIn) chartZoomIn.onclick = () => setChartZoom(chartZoom + 0.15);
    if (chartZoomReset) chartZoomReset.onclick = () => setChartZoom(1);
    if (chartRenderer) chartRenderer.onchange = () => { if (!currentChartContext) return; currentChartContext.renderer = chartRenderer.value; currentChartContext.updatedAt = Date.now(); renderChartPreview(); };
    if (chartTheme) chartTheme.onchange = () => { if (!currentChartContext) return; currentChartContext.theme = chartTheme.value; currentChartContext.updatedAt = Date.now(); renderChartPreview(); };
    const loadChartHistory = async () => { try { const rows = await AgfChartWorkspace.list(); chartHistory.innerHTML = rows.length ? rows.slice(0, 12).map(row => `<div class="agf-chart-history-row"><span>${String(row.chartModel?.title || '未命名')} · ${row.intent === 'timeline' ? '时间线' : '关系图'}</span><button class="agf-task-btn" data-chart-load="${row.id}">打开</button></div>`).join('') : '<span style="font-size:12px;color:#687386">暂无保存记录</span>'; chartHistory.querySelectorAll('[data-chart-load]').forEach(button => button.onclick = async () => { currentChartContext = await AgfChartWorkspace.get(button.dataset.chartLoad); renderChartPreview(); }); } catch (error) { chartNotice.textContent = error.message || '无法读取图表历史'; } };
    const chartSourceName = source => source === 'full_article' ? 'article' : (source === 'paragraph' ? 'selection' : (source || 'manual'));
    const currentChartSkillMaterial = (fallbackText) => {
      if (currentView === 'explain') {
        const text = String(explainResult?.innerText || explainResult?.textContent || '').trim();
        if (text) return text;
      }
      if (currentView === 'chat') {
        const draft = String(composerHidden?.value || inputUser?.innerText || composerEditor?.innerText || '').trim();
        const recent = (chatMessages || []).slice(-6).map(message => `${message.role === 'assistant' ? 'AI' : '用户'}：${String(message.content || '')}`).join('\n\n');
        const text = [recent, draft ? `当前输入：${draft}` : ''].filter(Boolean).join('\n\n').trim();
        if (text) return text;
      }
      return String(fallbackText || '').trim();
    };
    const fillChartWorkspace = async ({ useSkill = false } = {}) => {
      const ctx = await taixueContext.resolve(taixueState.contextSource);
      const material = useSkill ? currentChartSkillMaterial(ctx.text) : String(ctx.text || '');
      currentChartSourceContext = ctx;
      currentChartSkill = useSkill ? '你帮我做一个关系图来解释' : null;
      if (chartIntent && useSkill) chartIntent.value = 'relationship';
      if (chartSkillBadge) chartSkillBadge.style.display = useSkill ? 'flex' : 'none';
      if (chartSourceText) chartSourceText.value = material;
      chartMeta.textContent = `${useSkill ? currentView : (ctx.source || 'manual')} · 已填充 ${material.length} 字`;
      chartNotice.textContent = useSkill ? '已用内置图表 Skill 包裹当前上下文，可修改材料后生成。' : '已填充当前上下文，可修改材料后生成。';
      setView('chart');
      loadChartHistory();
    };
    const showChartView = () => fillChartWorkspace({ useSkill: false }).catch(error => { showToast(error.message || '无法进入图表工作区'); });
    if (chartWorkspaceBtn) chartWorkspaceBtn.onclick = () => showChartView();
    chartButton.onclick = () => fillChartWorkspace({ useSkill: true }).catch(error => { showToast(error.message || '无法调用图表 Skill'); });
    chartTitle.oninput = () => { if (currentChartContext) { currentChartContext.chartModel.title = chartTitle.value.trim() || '未命名图表'; currentChartContext.updatedAt = Date.now(); renderChartPreview(); } };
    const buildChartPrompt = (intent, material, options = {}) => {
      const skillPrefix = currentChartSkill ? `内置图表Skill（不可修改）：${currentChartSkill}\n\n` : '';
      const config = {
        concept: { name: '概念图', schema: 'nodes:[{id,label,description,sourceRefs}],edges:[{source,target,label,sourceRefs}]', rule: '提取5-12个核心概念；边label用2-4字描述关系；确保主要节点连通。' },
        relationship: { name: '关系图', schema: 'nodes:[{id,label,description,sourceRefs}],edges:[{source,target,label,sourceRefs}]', rule: '提取实体、概念、因果、依赖或引用关系；边label必须说明关系含义。' },
        mindmap: { name: '思维导图', schema: 'nodes:[{id,label,description,sourceRefs}],edges:[{source,target,label,sourceRefs}]', rule: '根节点id必须为root，label为材料主题；展开5-12个子节点，形成清晰父子层级；边label可以为空或写“包含”。' },
        flowchart: { name: '流程图', schema: 'nodes:[{id,label,description,sourceRefs}],edges:[{source,target,label,sourceRefs}]', rule: '提取6-12个核心步骤、判断或状态；按流程顺序连线；边label可为空或填写条件。' },
        timeline: { name: '时间线', schema: 'events:[{id,date,label,description,sourceRefs}]', rule: '按时间顺序提取事件；date没有明确日期时可写阶段名，但不要编造日期。' },
        architecture: { name: '架构/关系图', schema: 'nodes:[{id,label,description,styleRole,sourceRefs}],edges:[{source,target,label,kind,sourceRefs}]', rule: '提取组件、服务、存储、外部系统和主要依赖；styleRole 可用 frontend/backend/database/security/cloud/external。' },
        workflow: { name: 'Workflow 泳道流程图', schema: 'nodes:[{id,label,description,groupId,sourceRefs}],edges:[{source,target,label,sourceRefs}]', rule: '提取步骤、分支和参与泳道；用 groupId 表示参与者或阶段，按执行顺序连线。' },
        data_flow: { name: 'Data Flow 数据流图', schema: 'nodes:[{id,label,description,kind,styleRole,sourceRefs}],edges:[{source,target,label,kind,sourceRefs}]', rule: '区分 source、transform、store、sink；不要凭空添加数据源、数值或系统。' },
        lifecycle: { name: 'Lifecycle 生命周期图', schema: 'nodes:[{id,label,description,kind,sourceRefs}],edges:[{source,target,label,kind,emphasis,sourceRefs}]', rule: '提取状态、迁移、重试、取消、成功和失败终态；重试或异常路径可用 emphasis:true。' },
        sequence: { name: 'Sequence 时序图', schema: 'events:[{id,date,label,description,sourceRefs}]', rule: '按调用或事件顺序提取参与者动作；date 使用序号或阶段名，不编造时间。' }
      }[intent] || { name: '关系图', schema: 'nodes:[{id,label,description,sourceRefs}],edges:[{source,target,label,sourceRefs}]', rule: '提取关键节点和关系。' };
      const compactRule = options.compact ? '请输出单行压缩JSON，description和sourceRefs.text保持短句，节点/事件控制在8个以内。' : '请控制节点或事件数量，避免冗长说明。';
      return `${skillPrefix}不要输出思考过程、分析过程或Markdown。${compactRule}请根据以下工作区输入生成${config.name}，只返回严格JSON。工作区输入可能是事实材料，也可能只是用户的任务要求；如果输入明确要求“根据你的知识/常识生成”，允许使用你的通用知识完成图表，不要因为输入没有提供事实段落而返回空结构。若输入包含网页或选区材料，则优先依据材料并标记不确定内容。JSON必须包含 title, description, ${config.schema}, sourceRefs。${config.rule}对于知识驱动图表，sourceRefs 可以为空并在 warnings 说明“基于通用知识生成”；对于材料驱动图表，每个主要事件、节点或关系都要尽量给出原文依据的短文本和段落定位；无法确定的关系放入warnings，不要编造。工作区输入：\n${material}`;
    };
    const requestChartOutput = async (intent, material) => {
      const firstMaterial = limitTaixueText(material, 30000).text;
      try {
        return await taixueTask.requestJsonText({ prompt: buildChartPrompt(intent, firstMaterial), timeout: 90000, maxTokens: 8000, temperature: .2 });
      } catch (error) {
        if (!/空内容|timeout|超时|截断|length|token/i.test(String(error.message || error))) throw error;
        chartNotice.textContent = 'AI 首次没有返回可解析正文，正在用压缩 JSON 模式重试…';
        const shorterMaterial = limitTaixueText(material, 12000).text;
        return await taixueTask.requestJsonText({ prompt: buildChartPrompt(intent, shorterMaterial, { compact: true }), timeout: 90000, maxTokens: 8000, temperature: .15 });
      }
    };
    const requestChartModel = async (promptType, material) => {
      const output = await requestChartOutput(promptType, material);
      try {
        return typeof output === 'string' ? AgfChartModel.parseJsonObject(output) : output;
      } catch (error) {
        if (!/JSON|不完整|Unterminated|截断/i.test(String(error.message || error))) throw error;
        chartNotice.textContent = 'AI 返回了半截 JSON，正在要求压缩格式重试…';
        const retryMaterial = limitTaixueText(material, 12000).text;
        const retryOutput = await taixueTask.requestJsonText({ prompt: buildChartPrompt(promptType, retryMaterial, { compact: true }), timeout: 90000, maxTokens: 8000, temperature: .15 });
        return typeof retryOutput === 'string' ? AgfChartModel.parseJsonObject(retryOutput) : retryOutput;
      }
    };
    chartButtons.generate.onclick = async () => {
      try {
        chartNotice.textContent = '正在根据工作区材料生成结构化图表…';
        const ctx = currentChartSourceContext || await taixueContext.resolve(taixueState.contextSource);
        const material = String(chartSourceText?.value || ctx.text || '').trim();
        if (!material) throw new Error('图表工作区没有可用材料');
        const selectedType = chartIntent.value;
        const intent = { architecture: 'relationship', workflow: 'flowchart', data_flow: 'data', lifecycle: 'relationship', sequence: 'timeline' }[selectedType] || selectedType;
        const model = await requestChartModel(selectedType, material);
        const checked = AgfChartModel.validateChartContext({
          source: chartSourceName(ctx.source), intent, renderer: chartRenderer?.value || 'svg', chartModel: model,
          sourceRefs: model.sourceRefs || [{ type: ctx.source || 'manual', text: material.slice(0, 180), url: ctx.canonicalUrl || ctx.sourceUrl || location.href }], theme: chartTheme?.value || 'system', viewType: selectedType
        });
        if (!checked.valid) throw new Error(checked.errors.join('；'));
        currentChartContext = checked.value;
        chartHistoryState.past = []; chartHistoryState.future = []; chartHistoryState.selected.clear(); chartHistoryState.selectedEdges.clear();
        renderChartPreview();
        chartNotice.textContent = currentChartContext.chartModel.warnings.length ? `已生成，注意：${currentChartContext.chartModel.warnings.join('；')}` : '已生成，可保存、导出或添加到 Chat。';
      } catch (error) {
        chartNotice.textContent = error.message || '图表生成失败';
      }
    };
    chartButtons.svg.onclick = async () => { if (!currentChartContext) return; downloadChartFile(chartFileName('svg'), await getCurrentChartSvg(), 'image/svg+xml'); chartNotice.textContent = 'SVG 已导出'; };
    chartButtons.json.onclick = () => { if (!currentChartContext) return; downloadChartFile(chartFileName('json'), AgfChartWorkspace.exportJson(currentChartContext), 'application/json'); chartNotice.textContent = 'JSON 已导出'; };
    chartButtons.importJson.onclick = () => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json'; input.onchange = async () => { try { const raw = await input.files[0].text(); const imported = AgfChartWorkspace.importJson(raw); rememberChart(); currentChartContext = imported; renderChartPreview(); chartNotice.textContent = 'JSON 已导入，尚未写入 IndexedDB。'; } catch (error) { chartNotice.textContent = error.message || 'JSON 导入失败'; } }; input.click(); };
    chartButtons.html.onclick = async () => { if (!currentChartContext) return; downloadChartFile(chartFileName('html'), AgfChartWorkspace.exportHtml(currentChartContext, await getCurrentChartSvg()), 'text/html;charset=utf-8'); chartNotice.textContent = '独立 HTML 已导出'; };
    chartButtons.undo.onclick = () => { if (!chartHistoryState.past.length) return; chartHistoryState.future.push(chartSnapshot()); currentChartContext = chartHistoryState.past.pop(); renderChartPreview(); };
    chartButtons.redo.onclick = () => { if (!chartHistoryState.future.length) return; chartHistoryState.past.push(chartSnapshot()); currentChartContext = chartHistoryState.future.pop(); renderChartPreview(); };
    chartButtons.addNode.onclick = () => { if (!currentChartContext?.chartModel?.nodes) return; rememberChart(); const nodes = currentChartContext.chartModel.nodes; const id = `node-${Date.now().toString(36)}`; nodes.push({ id, label: '新节点', description: '', x: 450, y: 180 + (nodes.length % 4) * 90, sourceRefs: [] }); currentChartContext.updatedAt = Date.now(); chartHistoryState.selected = new Set([id]); renderChartPreview(); };
    chartButtons.addEdge.onclick = () => { if (!currentChartContext?.chartModel?.nodes || currentChartContext.chartModel.nodes.length < 2) { chartNotice.textContent = '至少需要两个节点才能添加连线'; return; } chartHistoryState.selected.clear(); chartHistoryState.edgeMode = true; chartNotice.textContent = '连线模式：依次点击两个节点'; };
    const deleteSelectedChartNodes = () => { if (!currentChartContext || (!chartHistoryState.selected.size && !chartHistoryState.selectedEdges.size)) return; rememberChart(); const ids = chartHistoryState.selected; const edgeIndexes = chartHistoryState.selectedEdges; currentChartContext.chartModel.nodes = currentChartContext.chartModel.nodes.filter(node => !ids.has(node.id)); currentChartContext.chartModel.edges = (currentChartContext.chartModel.edges || []).filter((edge, index) => !ids.has(edge.source) && !ids.has(edge.target) && !edgeIndexes.has(index)); chartHistoryState.selected.clear(); chartHistoryState.selectedEdges.clear(); chartNotice.textContent = '已删除选中节点/连线'; renderChartPreview(); };
    chartButtons.delete.onclick = deleteSelectedChartNodes;
    document.addEventListener('keydown', event => { if (!currentChartContext || !chartView || chartView.style.display === 'none') return; if ((event.key === 'Delete' || event.key === 'Backspace') && chartHistoryState.selected.size && !/INPUT|TEXTAREA/.test(event.target?.tagName || '')) { event.preventDefault(); deleteSelectedChartNodes(); } });
    chartButtons.save.onclick = async () => { if (!currentChartContext) return; await AgfChartWorkspace.save(currentChartContext); chartNotice.textContent = '已保存到 IndexedDB'; loadChartHistory(); };
    chartButtons.png.onclick = async () => { if (!currentChartContext) return; try { const scale = Number(prompt('PNG 导出倍率（1-4）', '2')) || 2; const transparent = confirm('是否使用透明背景？'); const png = await AgfChartWorkspace.svgToPngWithOptions(await getCurrentChartSvg(), { scale, transparent }); const link = document.createElement('a'); link.href = png; link.download = chartFileName('png'); link.click(); chartNotice.textContent = 'PNG 已导出'; } catch (error) { chartNotice.textContent = error.message || 'PNG 导出失败'; } };
    chartButtons.attach.onclick = async () => { if (!currentChartContext) return; try { const png = await AgfChartWorkspace.svgToPng(await getCurrentChartSvg()); currentMediaContext = createTaixueContext({ source: 'chart', image: { dataUrl: png, mimeType: 'image/png', name: currentChartContext.chartModel.title || '图表' }, confirmed: true, sourceUrl: currentChartContext.sourceRefs?.[0]?.url || location.href, metadata: { chartContext: currentChartContext }, }); currentMediaContext.recognition = { status: 'completed', model: 'taixue-chart', text: JSON.stringify(currentChartContext.chartModel, null, 2), ocrText: '' }; currentMediaBatch = [currentMediaContext]; renderMediaAttachment(); showChat(); chartNotice.textContent = '图表已作为图片附件加入 Chat，可直接发送给 AI 优化。'; } catch (error) { chartNotice.textContent = error.message || '添加附件失败'; } };
    const renderMediaAttachment = () => {
      if (!mediaAttachment) return;
      const media = currentMediaContext?.image;
      const result = currentMediaContext?.recognition?.text || '';
      if (!media) { mediaAttachment.style.display = 'none'; mediaAttachment.innerHTML = ''; return; }
      mediaAttachment.style.display = 'flex'; mediaAttachment.innerHTML = `<img src="${media.dataUrl || media.sourceUrl || ''}" alt="已添加图片"><div class="agf-media-attachment-body"><strong>${String(media.name || '图片')}</strong>${result ? `<div class="agf-media-attachment-result">${typeof markdownToHtml === 'function' ? markdownToHtml(result) : String(result).replace(/\n/g,'<br>')}</div>` : '<div class="agf-media-attachment-result">等待当前视觉模型直接理解</div>'}</div><button class="agf-media-attachment-remove" title="删除图片和识别结果">×</button>`;
      mediaAttachment.querySelector('.agf-media-attachment-remove').onclick = () => { currentMediaContext = null; renderMediaAttachment(); if (mediaStrategy) mediaStrategy.textContent = ''; if (visionOcrBtn) visionOcrBtn.disabled = true; };
    };
    const pageImagesForSource = (source) => {
      const selection = source === 'selection' ? window.getSelection() : null;
      const root = source === 'selection' ? selection?.anchorNode : document.body;
      const selectedRoot = root && (root.nodeType === 1 ? root : root.parentElement);
      const imgs = Array.from(document.images || []).filter(img => {
        if (!img || !img.src || img.closest('#agfTaixuePanel, #agfAiSettingOverlay')) return false;
        if (source === 'selection') {
          try { return Boolean(selection?.rangeCount && selection.getRangeAt(0).intersectsNode(img)); } catch (_) { return selectedRoot && (selectedRoot.contains(img) || img.contains(selectedRoot)); }
        }
        return true;
      });
      const metas = imgs.map(img => {
        const rect = img.getBoundingClientRect();
        const width = Math.max(img.naturalWidth || 0, rect.width || 0);
        const height = Math.max(img.naturalHeight || 0, rect.height || 0);
        const article = img.closest('article, main, [role="main"], .article, .post, .entry-content, .article-content');
        const parent = img.parentElement;
        const ancestor = img.closest('a, figure, header, nav, aside, footer, section, div');
        return { img, url: img.currentSrc || img.src, alt: img.alt, title: img.title, className: img.className, id: img.id, parentText: parent?.textContent?.slice(0, 180), ancestorText: ancestor?.textContent?.slice(0, 180), inArticle: Boolean(article), hasCaption: Boolean(img.closest('figure')?.querySelector('figcaption')), width, height, isTiny: width < 80 || height < 40, isSquare: Math.abs(width - height) / Math.max(width, height, 1) < 0.12, inViewport: rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth };
      }).filter(meta => meta.url && (source !== 'selection' || meta.inViewport));
      const filtered = (window.AgfPageImageFilter ? window.AgfPageImageFilter.filterImages(metas) : { kept: metas.map(item => ({ item })) });
      const candidates = filtered.kept.map(entry => entry.item.img);
      return { candidates, total: candidates.length, selected: candidates, rejected: filtered.rejected };
    };
    const imageElementToDataUrl = async (img) => {
      if (String(img.currentSrc || img.src).startsWith('data:image/')) return img.currentSrc || img.src;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      let response;
      try { response = await fetch(img.currentSrc || img.src, { credentials: 'include', signal: controller.signal }); } catch (error) { throw new Error(error.name === 'AbortError' ? '图片下载超时' : `图片下载失败：${error.message || error}`); } finally { clearTimeout(timer); }
      if (!response.ok) throw new Error(`图片下载失败（${response.status}）`);
      const blob = await response.blob();
      return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('图片读取失败')); reader.readAsDataURL(blob); });
    };
    const withMediaTimeout = (promise, timeoutMs = 75000) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`图片识别超时（>${Math.round(timeoutMs / 1000)}秒），已跳过此图`)), timeoutMs);
      promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
    const cropImageDataUrl = async (dataUrl, rect) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const ratioX = img.naturalWidth / Math.max(1, window.innerWidth);
          const ratioY = img.naturalHeight / Math.max(1, window.innerHeight);
          const sx = Math.max(0, Math.round(rect.left * ratioX));
          const sy = Math.max(0, Math.round(rect.top * ratioY));
          const sw = Math.max(1, Math.round(rect.width * ratioX));
          const sh = Math.max(1, Math.round(rect.height * ratioY));
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(sw, img.naturalWidth - sx);
          canvas.height = Math.min(sh, img.naturalHeight - sy);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) { reject(error); }
      };
      img.onerror = () => reject(new Error('截图裁剪失败'));
      img.src = dataUrl;
    });
    const capturePageScreenshot = async () => {
      const overlay = document.getElementById('agfAiSettingOverlay');
      const previousDisplay = overlay && overlay.style.display;
      if (overlay) overlay.style.display = 'none';
      try {
        const result = await withMediaTimeout(new Promise(resolve => chrome.runtime.sendMessage({ action: 'captureVisibleTabScreenshot' }, resolve)), 15000);
        if (!result?.success || !result.dataUrl) throw new Error(result?.error || '无法获取网页截图');
        return result.dataUrl;
      } finally { if (overlay) overlay.style.display = previousDisplay || ''; }
    };
    const captureImageElementScreenshot = async (img) => {
      if (!img) throw new Error('无法定位正文图片');
      const previousScrollX = window.scrollX;
      const previousScrollY = window.scrollY;
      try {
        img.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const rect = img.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) throw new Error('正文图片无法进入视口');
        const full = await capturePageScreenshot();
        return await cropImageDataUrl(full, { left: Math.max(0, rect.left - 12), top: Math.max(0, rect.top - 12), width: Math.min(window.innerWidth - Math.max(0, rect.left - 12), rect.width + 24), height: Math.min(window.innerHeight - Math.max(0, rect.top - 12), rect.height + 24) });
      } finally {
        window.scrollTo(previousScrollX, previousScrollY);
      }
    };
    const renderImageWorkspaceCard = (ctx, index, options = {}) => {
      if (!imageWorkspaceResult || !ctx?.image) return;
      const checked = options.checked !== false;
      const imageSrc = ctx.image.dataUrl || ctx.image.sourceUrl || '';
      const status = ctx.recognition?.status || (ctx.metadata?.recognitionError ? 'failed' : 'pending');
      const resultHtml = ctx.recognition?.text
        ? (typeof markdownToHtml === 'function' ? markdownToHtml(ctx.recognition.text) : String(ctx.recognition.text).replace(/\n/g, '<br>'))
        : (ctx.metadata?.recognitionError ? `<p class="agf-error">${String(ctx.metadata.recognitionError)}</p>` : '<p>等待发送识别。</p>');
      const badgeText = status === 'completed' ? '已处理' : status === 'failed' ? '失败' : '待识别';
      const statusText = status === 'completed' ? '已识别' : status === 'failed' ? '失败，可重试' : '待识别';
      imageWorkspaceResult.insertAdjacentHTML('beforeend', `<div class="agf-vocab-card agf-page-image-card" data-image-card-index="${index}"><label class="agf-page-image-head"><input type="checkbox" class="agf-page-image-check" ${checked ? 'checked' : ''} data-image-index="${index}"><span class="agf-page-image-name">图片 ${index + 1} · ${String(ctx.image.name || '网页图片')}</span><span class="agf-page-image-badge ${status === 'completed' ? 'done' : ''}">${badgeText}</span></label><div class="agf-page-image-thumb"><img src="${String(imageSrc)}" alt="${String(ctx.image.alt || ctx.image.name || '图片')}" data-image-preview="${index}"></div><div class="agf-page-image-body"><div class="agf-page-image-status">状态：${statusText}</div><div class="agf-page-image-result">${resultHtml}</div></div></div>`);
      const card = imageWorkspaceResult.querySelector(`[data-image-card-index="${index}"]`);
      const preview = card && card.querySelector('[data-image-preview]');
      if (preview && imageSrc) preview.onclick = () => window.open(String(imageSrc), '_blank');
    };
    const refreshImageWorkspaceActions = () => {
      const allChecks = Array.from(imageWorkspaceResult ? imageWorkspaceResult.querySelectorAll('.agf-page-image-check') : []);
      const checkedInputs = allChecks.filter(input => input.checked);
      const hasPendingChecked = checkedInputs.some(input => {
        const ctx = currentMediaBatch[Number(input.dataset.imageIndex || '-1')];
        return ctx && ctx.image;
      });
      const completed = currentMediaBatch.filter(x => x?.recognition?.status === 'completed');
      if (imageSelectAll) {
        imageSelectAll.checked = allChecks.length > 0 && checkedInputs.length === allChecks.length;
        imageSelectAll.indeterminate = checkedInputs.length > 0 && checkedInputs.length < allChecks.length;
        imageSelectAll.disabled = allChecks.length === 0;
      }
      if (imageProcessSelected) imageProcessSelected.disabled = !hasPendingChecked;
      if (imageAddToChat) imageAddToChat.disabled = completed.length === 0;
      if (imageWorkspaceRetry) imageWorkspaceRetry.disabled = currentMediaBatch.length === 0;
      if (visionOcrBtn) visionOcrBtn.disabled = currentMediaBatch.length === 0;
      if (mediaModeSelect) mediaModeSelect.disabled = currentMediaBatch.length === 0;
      currentMediaContext = completed[0] || currentMediaBatch[0] || null;
    };
    const selectWorkspaceByStatus = status => {
      Array.from(imageWorkspaceResult?.querySelectorAll('.agf-page-image-check') || []).forEach(input => {
        const ctx = currentMediaBatch[Number(input.dataset.imageIndex || '-1')];
        const actual = ctx?.recognition?.status || (ctx?.metadata?.recognitionError ? 'failed' : 'pending');
        input.checked = actual === status;
      });
      refreshImageWorkspaceActions();
    };
    const addMediaContextsToWorkspace = (contexts, { reset = false, statusText: nextStatus = '' } = {}) => {
      if (reset) {
        currentMediaBatch = [];
        currentMediaContext = null;
        if (imageWorkspaceResult) imageWorkspaceResult.innerHTML = '';
      }
      const start = currentMediaBatch.length;
      contexts.forEach((ctx, offset) => {
        currentMediaBatch.push(ctx);
        renderImageWorkspaceCard(ctx, start + offset, { checked: true });
      });
      if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = nextStatus || `已加入 ${contexts.length} 张图片，等待勾选发送`;
      if (mediaStrategy) mediaStrategy.textContent = currentMediaBatch.length > 10 ? '建议每次勾选不超过 10 张，避免等待过长。' : '勾选图片后发送给 GLM-4V-Flash 识别';
      refreshImageWorkspaceActions();
      setView('image');
    };
    const discoverAndConfirmPageImages = async (source) => {
      const imageSet = pageImagesForSource(source);
      const imgs = imageSet.selected;
      if (!imgs.length) {
        const useScreenshot = window.confirm(`当前${source === 'selection' ? '选区' : '全文'}没有检测到可直接读取的图片。是否截图当前网页视窗并加入图像工作区？\n注意：截图不包含浏览器侧边栏，太学浮层会暂时隐藏。`);
        if (!useScreenshot) return [];
        try {
          const dataUrl = await capturePageScreenshot();
          const ctx = createTaixueContext({ source: 'screenshot', image: { dataUrl, name: '当前网页视窗截图', delivery: 'screenshot' }, confirmed: true, sourceUrl: location.href });
          return [ctx];
        } catch (error) { showToast(`网页截图识别失败：${error.message || error}`); return []; }
      }
      const mediaSettings = await new Promise(resolve => chrome.storage.local.get(['taixueMediaPermissionEnabled','taixueMediaUploadEnabled'], resolve));
      if (mediaSettings.taixueMediaPermissionEnabled === false || mediaSettings.taixueMediaUploadEnabled !== true) { showToast('发现网页图片，但媒体权限或上传开关未开启，将只使用文本。'); return []; }
      const limitHint = imageSet.total > 10 ? '图片超过 10 张，全部串行处理可能需要较长时间；你可以取消后改用截图或分批处理。' : '';
      const ok = window.confirm(`当前${source === 'selection' ? '选区' : '全文'}发现 ${imageSet.total} 张可见图片。将先加入图像工作区并默认勾选；点击“发送勾选图片识别”后会使用 GLM-4V-Flash 串行识别。${limitHint}\n是否继续？`);
      if (!ok) return [];
      const contexts = [];
      for (let i = 0; i < imgs.length; i++) {
        const imageUrl = imgs[i].currentSrc || imgs[i].src;
        contexts.push(createTaixueContext({ source: source === 'selection' ? 'selection' : 'full_article', image: { dataUrl: '', mimeType: imgs[i].naturalWidth ? 'image/*' : '', name: imgs[i].alt || `网页图片 ${i + 1}`, alt: imgs[i].alt || '', sourceUrl: imageUrl, delivery: 'link' }, confirmed: true, sourceUrl: location.href }));
      }
      return contexts;
    };
    const recognizeImageContext = async (ctx, index, total) => {
      const prompt = `这是第 ${index + 1} 张图片。请完成 OCR 与视觉理解，先输出图片文字，再输出图片说明；不确定内容请明确标注。`;
      const imageUrl = ctx.image?.sourceUrl || '';
      if (ctx.image?.dataUrl) {
        return await withMediaTimeout(taixueTask.requestGlmVision({ imageDataUrl: ctx.image.dataUrl, prompt }), 75000);
      }
      let linkError = null;
      try {
        ctx.image.delivery = 'link';
        return await withMediaTimeout(taixueTask.requestGlmVision({ imageDataUrl: imageUrl, prompt }), 75000);
      } catch (error) { linkError = error; }
      let downloadError = null;
      try {
        const img = Array.from(document.images || []).find(x => (x.currentSrc || x.src) === imageUrl);
        if (!img) throw new Error('无法在当前页面定位图片元素');
        ctx.image.dataUrl = await imageElementToDataUrl(img);
        ctx.image.delivery = 'download';
        return await withMediaTimeout(taixueTask.requestGlmVision({ imageDataUrl: ctx.image.dataUrl, prompt }), 75000);
      } catch (error) { downloadError = error; }
      try {
        const img = Array.from(document.images || []).find(x => (x.currentSrc || x.src) === imageUrl);
        ctx.image.dataUrl = await captureImageElementScreenshot(img);
        ctx.image.delivery = 'screenshot';
        return await withMediaTimeout(taixueTask.requestGlmVision({ imageDataUrl: ctx.image.dataUrl, prompt: `${prompt}\n这是定位到正文图片后的截图兜底，请只识别目标图片内容，不要描述网页或太学浮层。` }), 75000);
      } catch (screenshotError) {
        throw new Error(`链接、下载、截图均失败：链接=${linkError?.message || linkError}；下载=${downloadError?.message || downloadError}；截图=${screenshotError.message || screenshotError}`);
      }
    };
    const updateImageCardAfterRecognition = (index) => {
      const card = imageWorkspaceResult && imageWorkspaceResult.querySelector(`[data-image-card-index="${index}"]`);
      const ctx = currentMediaBatch[index];
      if (!card || !ctx) return;
      const checkbox = card.querySelector('.agf-page-image-check');
      const status = card.querySelector('.agf-page-image-status');
      const result = card.querySelector('.agf-page-image-result');
      const preview = card.querySelector('[data-image-preview]');
      const badge = card.querySelector('.agf-page-image-badge');
      if (checkbox && ctx.recognition?.status === 'completed') checkbox.checked = false;
      if (status) status.textContent = ctx.recognition?.status === 'completed' ? `状态：已识别（${ctx.image.delivery || 'link'}）` : '状态：失败，可重新勾选';
      if (badge) {
        const done = ctx.recognition?.status === 'completed';
        badge.textContent = done ? '已处理' : '失败';
        badge.classList.toggle('done', done);
      }
      if (result) result.innerHTML = ctx.recognition?.text
        ? (typeof markdownToHtml === 'function' ? markdownToHtml(ctx.recognition.text) : String(ctx.recognition.text).replace(/\n/g, '<br>'))
        : `<p class="agf-error">${String(ctx.metadata?.recognitionError || '识别失败')}</p>`;
      if (preview && ctx.image?.dataUrl) {
        preview.setAttribute('src', ctx.image.dataUrl);
        preview.onclick = () => window.open(String(ctx.image.dataUrl), '_blank');
      }
    };
    const saveImageRecognitionHistory = async (ctx, index) => {
      const history = await new Promise(resolve => chrome.storage.local.get(['agfTaixueImageRecognitionHistory'], r => resolve(Array.isArray(r.agfTaixueImageRecognitionHistory) ? r.agfTaixueImageRecognitionHistory : [])));
      const historyId = ctx.metadata?.historyId || `image-${Date.now()}-${index}`;
      ctx.metadata = { ...(ctx.metadata || {}), historyId };
      history.unshift({ id: historyId, name: ctx.image?.name || `图片 ${index + 1}`, output: ctx.recognition?.text || '', context: ctx, createdAt: Date.now() });
      await new Promise(resolve => chrome.storage.local.set({ agfTaixueImageRecognitionHistory: history.slice(0, 30) }, resolve));
    };
    const saveVisionChatHistory = async (ctx, text, provider, model) => {
      if (!ctx?.image || !text) return;
      const saved = { ...ctx, recognition: { model: `${provider}/${model}`, status: 'completed', text, ocrText: text, createdAt: Date.now(), source: 'chat_vision' }, metadata: { ...(ctx.metadata || {}), visionSource: 'chat', provider, model } };
      await saveImageRecognitionHistory(saved, 0);
    };
    const processSelectedWorkspaceImages = async () => {
      const checked = Array.from(imageWorkspaceResult ? imageWorkspaceResult.querySelectorAll('.agf-page-image-check:checked') : []);
      const selected = checked.map(input => Number(input.dataset.imageIndex || '-1')).filter(i => i >= 0 && currentMediaBatch[i]?.image);
      if (!selected.length) { showToast('请先勾选要识别的图片。'); return; }
      if (selected.length > 10) {
        const ok = window.confirm(`本次勾选了 ${selected.length} 张图片，超过建议的 10 张。继续会串行发送，等待时间可能较长。\n\n确认继续发送；取消则停止发送，你可以先取消部分勾选后再试。`);
        if (!ok) {
          if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = `已停止发送：当前勾选 ${selected.length} 张，请调整到不超过 10 张或再次确认继续。`;
          return;
        }
      }
      if (imageProcessSelected) imageProcessSelected.disabled = true;
      for (let n = 0; n < selected.length; n++) {
        const index = selected[n];
        const ctx = currentMediaBatch[index];
        try {
          if (mediaStrategy) mediaStrategy.textContent = `正在识别勾选图片 ${n + 1}/${selected.length}…`;
          if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = `正在识别第 ${n + 1}/${selected.length} 张（总第 ${index + 1} 张）…`;
          const output = await recognizeImageContext(ctx, index, selected.length);
          ctx.recognition = { model: 'glm-4v-flash', status: 'completed', text: output, ocrText: output, createdAt: Date.now() };
          if (ctx.metadata) delete ctx.metadata.recognitionError;
          await saveImageRecognitionHistory(ctx, index);
        } catch (error) {
          ctx.recognition = { model: 'glm-4v-flash', status: 'failed', text: '', ocrText: '', createdAt: Date.now(), error: String(error.message || error) };
          ctx.metadata = { ...(ctx.metadata || {}), recognitionError: String(error.message || error) };
        }
        updateImageCardAfterRecognition(index);
      }
      const completed = currentMediaBatch.filter(x => x.recognition?.status === 'completed').length;
      if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = `识别完成 ${completed}/${currentMediaBatch.length} 张`;
      if (mediaStrategy) mediaStrategy.textContent = `图像工作区：已完成 ${completed}/${currentMediaBatch.length} 张`;
      refreshImageWorkspaceActions();
    };
    const prepareMediaForChat = async (provider, model, requestedMode = 'auto') => {
      const hasImageLikeContext = currentMediaContext && (currentMediaContext.source === 'image' || currentMediaContext.source === 'chart');
      if (!hasImageLikeContext && !currentMediaBatch.length) return { mode: 'none', context: null, contexts: [] };
      const capabilities = taixueTask.getModelCapabilities(provider, model);
      const allContexts = currentMediaBatch.length ? currentMediaBatch : [currentMediaContext];
      const contexts = capabilities.vision
        ? allContexts.filter(ctx => ctx?.image?.dataUrl || ctx?.image?.sourceUrl)
        : allContexts.filter(ctx => ctx?.recognition?.status === 'completed' && ctx.recognition.text);
      if (!contexts.length) throw new Error(capabilities.vision ? '没有可发送的图片，请先在 Chat 中添加图片或从图像工作区选择图片。' : '当前模型不支持原图，请先使用 GLM-4V-Flash 完成图片识别。');
      currentMediaContext = contexts[0];
      const mode = requestedMode === 'auto' ? (capabilities.vision ? 'image_and_recognition' : 'recognition_only') : requestedMode;
      const finalMode = mode === 'image_and_recognition' && !capabilities.vision ? 'recognition_only' : mode;
      return { mode: finalMode, requestedMode, context: currentMediaContext, contexts, capabilities };
    };
    const readMediaFile = (file, kind) => new Promise((resolve, reject) => {
      if (!file) return reject(new Error('没有选择文件'));
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('读取媒体失败')); reader.readAsDataURL(file);
    });
    const chooseMedia = async (kind, file) => {
      if (kind === 'image' && imageWorkspaceStatus) imageWorkspaceStatus.textContent = file ? '正在读取图片…' : '未选择图片';
      const mediaSettings = await new Promise(resolve => chrome.storage.local.get(['taixueMediaPermissionEnabled','taixueMediaUploadEnabled'], resolve));
      if (mediaSettings.taixueMediaPermissionEnabled === false || mediaSettings.taixueMediaUploadEnabled !== true) { if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '等待开启媒体权限和上传'; showToast('请先在太学设置中开启媒体权限和媒体上传。'); return; }
      const allow = await new Promise(resolve => { const ok = window.confirm(`${kind === 'image' ? '图片' : '音频'}将仅在你确认后发送给已选择的 AI 服务商。是否继续？`); resolve(ok); });
      if (!allow) { if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '已取消'; return; }
      const dataUrl = await readMediaFile(file, kind);
      if (kind === 'image' && imageWorkspaceStatus) imageWorkspaceStatus.textContent = '图片已读取，正在请求 GLM-4V-Flash…';
      currentMediaContext = createTaixueContext({ source: kind, [kind]: { dataUrl, mimeType: file.type, name: file.name, size: file.size, alt: file.name }, confirmed: true, sourceUrl: location.href });
      if (kind === 'image') currentMediaBatch = [currentMediaContext];
      if (visionOcrBtn) visionOcrBtn.disabled = kind !== 'image';
      if (mediaModeSelect) mediaModeSelect.disabled = false;
      if (mediaStrategy) mediaStrategy.textContent = '图片已加入，等待发送时判断模型能力';
      if (contextSummary) contextSummary.textContent = `当前上下文：${kind === 'image' ? '图片' : '音频'} · ${file.name}`;
      if (kind === 'image' && imageWorkspaceStatus) { imageWorkspaceStatus.textContent = '识别中…'; imageWorkspaceResult.innerHTML = `<p>已添加：${String(file.name)}</p><img src="${dataUrl}" alt="待识别图片" style="max-width:180px;max-height:120px;border-radius:8px"/>`; }
      if (kind === 'image') { try { const output = await taixueTask.requestGlmVision({ imageDataUrl: dataUrl, prompt: '请完成图片 OCR 与视觉理解。先输出图片文字，再输出图片说明；不确定内容请明确标注。' }); currentMediaContext.recognition = { model: 'glm-4v-flash', status: 'completed', text: output, ocrText: output, createdAt: Date.now() }; const history = await new Promise(resolve => chrome.storage.local.get(['agfTaixueImageRecognitionHistory'], r => resolve(Array.isArray(r.agfTaixueImageRecognitionHistory) ? r.agfTaixueImageRecognitionHistory : []))); const historyId = `image-${Date.now()}`; currentMediaContext.metadata = { ...(currentMediaContext.metadata || {}), historyId }; history.unshift({ id: historyId, name: file.name, output, context: currentMediaContext, createdAt: Date.now() }); await new Promise(resolve => chrome.storage.local.set({ agfTaixueImageRecognitionHistory: history.slice(0, 30) }, resolve)); if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '识别完成'; if (imageWorkspaceResult) imageWorkspaceResult.innerHTML += `<div style="margin-top:12px"><strong>识别结果</strong><div>${typeof markdownToHtml === 'function' ? markdownToHtml(output) : String(output).replace(/\n/g,'<br>')}</div></div>`; if (imageAddToChat) imageAddToChat.disabled = false; if (imageWorkspaceRetry) imageWorkspaceRetry.disabled = false; } catch (e) { if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '识别失败'; showToast(e.message || '图片识别失败'); } }
      else showToast('音频已加入上下文，音频转写功能尚未开启。');
    };
    const processImageBatch = async (files) => {
      const list = Array.from(files || []).filter(f => f && String(f.type || '').startsWith('image/'));
      if (!list.length) return;
      const mediaSettings = await new Promise(resolve => chrome.storage.local.get(['taixueMediaPermissionEnabled','taixueMediaUploadEnabled'], resolve));
      if (mediaSettings.taixueMediaPermissionEnabled === false || mediaSettings.taixueMediaUploadEnabled !== true) { if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '等待开启媒体权限和上传'; showToast('请先在太学设置中开启媒体权限和媒体上传。'); return; }
      if (!window.confirm(`将依次识别 ${list.length} 张图片，并发送给 GLM-4V-Flash。预计需要更长时间，是否继续？`)) { if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '已取消'; return; }
      currentMediaBatch = []; currentMediaContext = null; if (imageAddToChat) imageAddToChat.disabled = true; if (imageWorkspaceResult) imageWorkspaceResult.innerHTML = '';
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        try {
          if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = `正在读取第 ${i + 1}/${list.length} 张…`;
          const dataUrl = await readMediaFile(file, 'image');
          if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = `正在识别第 ${i + 1}/${list.length} 张…`;
          const output = await taixueTask.requestGlmVision({ imageDataUrl: dataUrl, prompt: `这是第 ${i + 1} 张图片。请完成图片 OCR 与视觉理解，先输出图片文字，再输出图片说明；不确定内容请明确标注。` });
          const context = createTaixueContext({ source: 'upload', image: { dataUrl, mimeType: file.type, name: file.name, size: file.size, alt: file.name }, confirmed: true, sourceUrl: location.href });
          context.recognition = { model: 'glm-4v-flash', status: 'completed', text: output, ocrText: output, createdAt: Date.now() };
          currentMediaBatch.push(context); if (!currentMediaContext) currentMediaContext = context;
          const history = await new Promise(resolve => chrome.storage.local.get(['agfTaixueImageRecognitionHistory'], r => resolve(Array.isArray(r.agfTaixueImageRecognitionHistory) ? r.agfTaixueImageRecognitionHistory : [])));
          history.unshift({ id: `image-${Date.now()}-${i}`, name: file.name, output, context, createdAt: Date.now() }); await new Promise(resolve => chrome.storage.local.set({ agfTaixueImageRecognitionHistory: history.slice(0, 30) }, resolve));
          if (imageWorkspaceResult) imageWorkspaceResult.innerHTML += `<div class="agf-vocab-card"><strong>${i + 1}/${list.length} · ${String(file.name)}</strong><div style="margin-top:8px"><img src="${dataUrl}" alt="${String(file.name)}" style="max-width:180px;max-height:120px;border-radius:8px"></div><div style="margin-top:8px">${typeof markdownToHtml === 'function' ? markdownToHtml(output) : String(output).replace(/\n/g,'<br>')}</div></div>`;
        } catch (e) { if (imageWorkspaceResult) imageWorkspaceResult.innerHTML += `<p class="agf-error">${i + 1}/${list.length} 识别失败：${String(e.message || e)}</p>`; }
      }
      if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = `完成 ${currentMediaBatch.length}/${list.length} 张`;
      if (imageAddToChat) imageAddToChat.disabled = currentMediaBatch.length === 0;
      if (imageWorkspaceRetry) imageWorkspaceRetry.disabled = false;
    };
    const attachDirectChatImage = async (file) => {
      if (!file) return;
      const dataUrl = await readMediaFile(file, 'image');
      const context = createTaixueContext({ source: 'chat_image', image: { dataUrl, mimeType: file.type, name: file.name, size: file.size, alt: file.name }, confirmed: true, sourceUrl: location.href });
      context.recognition = { status: 'not_requested', text: '' };
      currentMediaBatch = [context]; currentMediaContext = context;
      renderMediaAttachment();
      if (mediaModeSelect) mediaModeSelect.value = 'auto';
      if (mediaStrategy) mediaStrategy.textContent = '已添加原图：视觉模型可直接理解，纯文本模型需先用 GLM 识别';
      showToast('图片已添加到当前对话');
    };
    const attachWorkspaceImageToChat = async () => {
      if (!currentMediaBatch.length) { showToast('图像工作区中还没有图片。'); return; }
      const labels = currentMediaBatch.map((ctx, index) => `${index + 1}. ${ctx.image?.name || `图片 ${index + 1}`}（${ctx.recognition?.status === 'completed' ? '已识别' : '未识别'}）`).join('\n');
      const selected = Number(window.prompt(`选择要添加到当前对话的图片编号：\n${labels}`, '1')) - 1;
      const context = currentMediaBatch[selected];
      if (!context?.image) return;
      if (!context.image.dataUrl && context.image.sourceUrl) {
        const img = Array.from(document.images || []).find(x => (x.currentSrc || x.src) === context.image.sourceUrl);
        if (img) { try { context.image.dataUrl = await imageElementToDataUrl(img); } catch (_) {} }
      }
      currentMediaBatch = [context]; currentMediaContext = context; renderMediaAttachment();
      if (mediaStrategy) mediaStrategy.textContent = '已从图像工作区添加图片到当前对话';
    };
    const showChatImageMenu = () => {
      const menu = document.createElement('div');
      menu.style.cssText = 'position:fixed;z-index:2147483647;background:#fff;border:1px solid #d6dce5;border-radius:8px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.18);display:flex;flex-direction:column;gap:4px;';
      menu.innerHTML = '<button data-chat-image-upload>上传图片</button><button data-chat-image-workspace>从图像工作区选择</button>';
      const rect = chatImagePlusBtn.getBoundingClientRect(); menu.style.left = `${Math.max(8, rect.left - 130)}px`; menu.style.top = `${Math.max(8, rect.top - 76)}px`; document.body.appendChild(menu);
      const close = () => { try { menu.remove(); } catch (_) {} };
      menu.querySelector('[data-chat-image-upload]').onclick = () => { close(); chatImageInput.click(); };
      menu.querySelector('[data-chat-image-workspace]').onclick = () => { close(); attachWorkspaceImageToChat().catch(error => showToast(error.message || '添加工作区图片失败')); };
      setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
    };
    chatImagePlusBtn.onclick = event => {
      event.preventDefault(); event.stopPropagation();
      const upload = window.confirm('点击“确定”上传一张图片；点击“取消”从图像工作区选择图片。');
      if (upload) chatImageInput.click();
      else attachWorkspaceImageToChat().catch(error => showToast(error.message || '添加工作区图片失败'));
    };
    chatImageInput.onchange = () => attachDirectChatImage(chatImageInput.files?.[0]).catch(error => showToast(error.message || '添加图片失败'));
    const addScreenshotToWorkspace = async (dataUrl, name = '网页截图') => {
      const ctx = createTaixueContext({ source: 'screenshot', image: { dataUrl, name, delivery: 'screenshot' }, confirmed: true, sourceUrl: location.href });
      addMediaContextsToWorkspace([ctx], { reset: false, statusText: '截图已加入图像工作区，等待发送识别' });
    };
    const startPageScreenshotMode = async () => {
      const taixueOverlay = document.getElementById('agfAiSettingOverlay');
      const previousDisplay = taixueOverlay && taixueOverlay.style.display;
      if (taixueOverlay) taixueOverlay.style.display = 'none';
      const mask = document.createElement('div');
      mask.id = 'agfScreenshotSelectionMask';
      mask.style.cssText = 'position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(20,30,40,.10);';
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;border:2px solid #4c8df6;background:rgba(76,141,246,.15);display:none;pointer-events:none;';
      const actions = document.createElement('div');
      actions.style.cssText = 'position:fixed;display:none;z-index:2147483647;background:#fff;border:1px solid #d6dce5;border-radius:8px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.18);';
      actions.innerHTML = '<button data-agf-shot-confirm>确认截图</button><button data-agf-shot-cancel>取消</button>';
      mask.appendChild(box);
      mask.appendChild(actions);
      document.body.appendChild(mask);
      let startX = 0, startY = 0, currentRect = null, dragging = false;
      const cleanup = () => {
        try { mask.remove(); } catch (_) {}
        if (taixueOverlay) taixueOverlay.style.display = previousDisplay || '';
      };
      const setRect = (x1, y1, x2, y2) => {
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        currentRect = { left, top, width, height };
        box.style.display = 'block';
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
      };
      mask.onmousedown = (event) => {
        if (event.target && event.target.closest && event.target.closest('[data-agf-shot-confirm],[data-agf-shot-cancel]')) return;
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        actions.style.display = 'none';
        setRect(startX, startY, startX, startY);
      };
      mask.onmousemove = (event) => { if (dragging) setRect(startX, startY, event.clientX, event.clientY); };
      mask.onmouseup = () => {
        dragging = false;
        if (!currentRect || currentRect.width < 8 || currentRect.height < 8) return;
        actions.style.display = 'block';
        actions.style.left = `${Math.min(window.innerWidth - 150, currentRect.left + currentRect.width + 8)}px`;
        actions.style.top = `${Math.min(window.innerHeight - 44, currentRect.top + currentRect.height + 8)}px`;
      };
      const cancel = actions.querySelector('[data-agf-shot-cancel]');
      const confirm = actions.querySelector('[data-agf-shot-confirm]');
      if (cancel) cancel.onclick = cleanup;
      if (confirm) confirm.onclick = async () => {
        const rect = currentRect;
        try {
          if (!rect || rect.width < 8 || rect.height < 8) throw new Error('请选择网页中的截图区域');
          mask.style.display = 'none';
          const full = await capturePageScreenshot();
          const cropped = await cropImageDataUrl(full, rect);
          await addScreenshotToWorkspace(cropped, '网页选区截图');
          cleanup();
        } catch (error) {
          cleanup();
          showToast(error.message || '网页截图失败');
        }
      };
    };
    if (imageContextBtn) imageContextBtn.onclick = () => setView('image');
    const pageImageDiscoverBtn = document.getElementById('agfPageImageDiscoverBtn');
    if (pageImageDiscoverBtn) pageImageDiscoverBtn.onclick = async () => {
      const source = taixueState.contextSource === 'selection' && getSelectedTextSafe() ? 'selection' : 'full_article';
      pageImageDiscoverBtn.disabled = true;
      try {
        const contexts = await discoverAndConfirmPageImages(source);
        if (contexts.length) addMediaContextsToWorkspace(contexts, { reset: true, statusText: `已发现 ${contexts.length} 张图片，默认勾选，等待发送识别` });
        else showToast('当前上下文没有发现可识别图片。');
      } catch (error) { showToast(error.message || '网页图片发现失败'); }
      pageImageDiscoverBtn.disabled = false;
    };
    if (pageScreenshotBtn) pageScreenshotBtn.onclick = () => startPageScreenshotMode().catch(error => showToast(error.message || '网页截图失败'));
    if (imageProcessSelected) imageProcessSelected.onclick = () => processSelectedWorkspaceImages().catch(error => showToast(error.message || '图片识别失败'));
    if (imageWorkspaceResult) imageWorkspaceResult.addEventListener('change', event => { if (event.target && event.target.classList && event.target.classList.contains('agf-page-image-check')) refreshImageWorkspaceActions(); });
    if (imageSelectAll) imageSelectAll.onchange = () => {
      const checks = Array.from(imageWorkspaceResult ? imageWorkspaceResult.querySelectorAll('.agf-page-image-check') : []);
      checks.forEach(input => { input.checked = imageSelectAll.checked; });
      refreshImageWorkspaceActions();
    };
    imageSelectPending.onclick = () => selectWorkspaceByStatus('pending');
    imageSelectFailed.onclick = () => selectWorkspaceByStatus('failed');
    imageSelectCompleted.onclick = () => selectWorkspaceByStatus('completed');
    if (audioContextBtn) audioContextBtn.onclick = () => audioContextInput && audioContextInput.click();
    if (imageContextInput) imageContextInput.onchange = () => chooseMedia('image', imageContextInput.files && imageContextInput.files[0]).catch(e => showToast(e.message));
    if (audioContextInput) audioContextInput.onchange = () => chooseMedia('audio', audioContextInput.files && audioContextInput.files[0]).catch(e => showToast(e.message));
    if (mediaModeSelect) mediaModeSelect.onchange = () => { if (mediaStrategy && currentMediaContext) mediaStrategy.textContent = mediaModeSelect.value === 'recognition_only' ? '将发送识别结果' : mediaModeSelect.value === 'image_and_recognition' ? '将尝试发送原图+识别结果' : '发送时自动判断模型能力'; };
    if (imageChooseBtn) imageChooseBtn.onclick = () => workspaceImageInput && workspaceImageInput.click();
    if (workspaceImageInput) workspaceImageInput.onchange = () => processImageBatch(workspaceImageInput.files).catch(e => { if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '处理失败'; if (imageWorkspaceResult) imageWorkspaceResult.innerHTML = `<p class="agf-error">${String(e.message || e)}</p>`; showToast(e.message || '图片处理失败'); });
    if (imageDropzone) { imageDropzone.ondragover = e => { e.preventDefault(); imageDropzone.classList.add('dragover'); }; imageDropzone.ondragleave = () => imageDropzone.classList.remove('dragover'); imageDropzone.ondrop = e => { e.preventDefault(); imageDropzone.classList.remove('dragover'); processImageBatch(e.dataTransfer?.files).catch(err => showToast(err.message || '图片处理失败')); }; }
    const imageHistoryKey = 'agfTaixueImageRecognitionHistory';
    const historyModelLabel = item => { const provider = item.context?.metadata?.provider || item.context?.metadata?.visionProvider || ''; const model = item.context?.metadata?.model || item.context?.metadata?.visionModel || item.context?.recognition?.model || ''; return provider && model ? `${provider}/${model}` : model || '模型信息不可用'; };
    const renderImageHistory = async () => { if (!imageWorkspaceHistoryList) return; const r = await new Promise(resolve => chrome.storage.local.get([imageHistoryKey], x => resolve(Array.isArray(x[imageHistoryKey]) ? x.agfTaixueImageRecognitionHistory : []))); imageWorkspaceHistoryList.innerHTML = r.length ? r.slice(0,20).map(x => `<div class="agf-history-row">${x.context?.image?.dataUrl ? `<img src="${x.context.image.dataUrl}" alt="历史图片" style="width:42px;height:42px;object-fit:cover;border-radius:5px">` : ''}<span>${String(x.name)} · ${historyModelLabel(x)} · ${new Date(x.createdAt).toLocaleString()}</span><button data-image-history-id="${x.id}">查看</button></div>`).join('') : '<p>暂无图像识别历史。</p>'; imageWorkspaceHistoryList.querySelectorAll('[data-image-history-id]').forEach(b => b.onclick = () => { const x = r.find(y => y.id === b.dataset.imageHistoryId); if (x) { currentMediaContext = x.context; imageWorkspaceResult.innerHTML = `${x.context?.image?.dataUrl ? `<img src="${x.context.image.dataUrl}" alt="历史图片" style="max-width:180px;max-height:120px;border-radius:8px">` : ''}<strong>识别结果 · ${historyModelLabel(x)}</strong><div>${typeof markdownToHtml === 'function' ? markdownToHtml(x.output) : String(x.output).replace(/\n/g,'<br>')}</div>`; imageAddToChat.disabled = false; renderMediaAttachment(); } }); };
    const enhanceImageHistoryControls = async () => {
      if (!imageWorkspaceHistoryList) return;
      if (!imageWorkspaceHistoryList.querySelector('[data-image-history-clear]')) {
        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
        toolbar.innerHTML = '<button data-image-history-clear>清空历史</button>';
        imageWorkspaceHistoryList.prepend(toolbar);
        toolbar.querySelector('[data-image-history-clear]').onclick = async () => {
          if (!window.confirm('确定清空全部图像识别历史吗？')) return;
          await new Promise(resolve => chrome.storage.local.set({ [imageHistoryKey]: [] }, resolve));
          await renderImageHistory(); await enhanceImageHistoryControls();
        };
      }
      imageWorkspaceHistoryList.querySelectorAll('.agf-history-row').forEach(row => {
        if (row.querySelector('[data-image-history-delete]')) return;
        const view = row.querySelector('[data-image-history-id]');
        if (!view) return;
        const remove = document.createElement('button');
        remove.textContent = '删除'; remove.dataset.imageHistoryDelete = view.dataset.imageHistoryId;
        remove.onclick = async () => {
          const history = await new Promise(resolve => chrome.storage.local.get([imageHistoryKey], x => resolve(Array.isArray(x[imageHistoryKey]) ? x[imageHistoryKey] : [])));
          await new Promise(resolve => chrome.storage.local.set({ [imageHistoryKey]: history.filter(item => item.id !== remove.dataset.imageHistoryDelete) }, resolve));
          await renderImageHistory(); await enhanceImageHistoryControls();
        };
        row.appendChild(remove);
      });
    };
    const clearImageWorkspace = () => {
      currentMediaBatch = [];
      currentMediaContext = null;
      if (imageWorkspaceResult) imageWorkspaceResult.innerHTML = '';
      if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '工作区已清除，识别历史仍保留';
      refreshImageWorkspaceActions();
    };
    const deleteImageWorkspaceAndHistory = async () => {
      const ids = new Set(currentMediaBatch.map(ctx => ctx?.metadata?.historyId).filter(Boolean));
      if (!ids.size || !window.confirm('将清除当前工作区，并删除这些图片对应的识别历史。此操作不可恢复，是否继续？')) return;
      const history = await new Promise(resolve => chrome.storage.local.get([imageHistoryKey], x => resolve(Array.isArray(x[imageHistoryKey]) ? x[imageHistoryKey] : [])));
      await new Promise(resolve => chrome.storage.local.set({ [imageHistoryKey]: history.filter(item => !ids.has(item.id)) }, resolve));
      clearImageWorkspace();
      if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '工作区和对应识别历史已删除';
      renderImageHistory();
    };
    const safeExportName = name => String(name || 'image').replace(/[^a-z0-9._-]+/gi, '_').replace(/^\.+/, '') || 'image';
    const downloadBlob = (blob, name) => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    const exportImageWorkspace = async () => {
      if (!currentMediaBatch.length) { showToast('工作区没有图片可导出。'); return; }
      for (let i = 0; i < currentMediaBatch.length; i++) {
        const ctx = currentMediaBatch[i];
        let dataUrl = ctx.image?.dataUrl || '';
        if (!dataUrl && ctx.image?.sourceUrl) {
          const img = Array.from(document.images || []).find(x => (x.currentSrc || x.src) === ctx.image.sourceUrl);
          if (img) { try { dataUrl = await imageElementToDataUrl(img); } catch (_) {} }
        }
        if (!dataUrl) continue;
        const base = `${String(i + 1).padStart(2, '0')}-${safeExportName(ctx.image?.name || '图片')}`;
        const response = await fetch(dataUrl);
        downloadBlob(await response.blob(), `${base}.png`);
        if (ctx.recognition?.text) downloadBlob(new Blob([ctx.recognition.text], { type: 'text/plain;charset=utf-8' }), `${base}.txt`);
      }
      if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = '已导出图片；已识别图片同时导出 TXT 文本';
    };
    const renderImageHistoryManager = async () => {
      if (!imageWorkspaceHistoryList) return;
      const history = await new Promise(resolve => chrome.storage.local.get([imageHistoryKey], x => resolve(Array.isArray(x[imageHistoryKey]) ? x[imageHistoryKey] : [])));
      imageWorkspaceHistoryList.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><input data-image-history-search placeholder="搜索图片名、来源或识别文本" style="flex:1;min-width:180px"><select data-image-history-age><option value="0">全部时间</option><option value="7">最近 7 天</option><option value="30">最近 30 天</option><option value="180">最近 6 个月</option><option value="365">最近 1 年</option></select><button data-image-history-export>批量导出</button><button data-image-history-clean>按时间清理</button></div><label style="font-size:12px;display:block;margin-bottom:8px"><input type="checkbox" data-image-history-original checked> 导出/清理时保留原图</label><div data-image-history-rows></div>`;
      const search = imageWorkspaceHistoryList.querySelector('[data-image-history-search]');
      const age = imageWorkspaceHistoryList.querySelector('[data-image-history-age]');
      const keepOriginal = imageWorkspaceHistoryList.querySelector('[data-image-history-original]');
      const rows = imageWorkspaceHistoryList.querySelector('[data-image-history-rows]');
      const renderRows = () => {
        const term = String(search.value || '').trim().toLowerCase();
        const cutoff = Number(age.value || 0) ? Date.now() - Number(age.value) * 86400000 : 0;
        const visible = history.filter(item => (!cutoff || Number(item.createdAt || 0) >= cutoff) && (!term || [item.name, item.output, item.context?.sourceUrl, item.context?.image?.sourceUrl].some(value => String(value || '').toLowerCase().includes(term))));
        rows.innerHTML = visible.length ? visible.map(item => `<div class="agf-history-row"><span>${String(item.name || '图片')} · ${historyModelLabel(item)} · ${new Date(item.createdAt).toLocaleString()}${item.output ? ' · 已识别' : ' · 未识别'}</span><button data-image-history-view="${item.id}">查看</button><button data-image-history-delete="${item.id}">删除</button></div>`).join('') : '<p>没有匹配的历史记录。</p>';
        rows.querySelectorAll('[data-image-history-view]').forEach(button => button.onclick = () => { const item = history.find(x => x.id === button.dataset.imageHistoryView); if (!item) return; currentMediaContext = item.context; currentMediaBatch = [item.context]; imageWorkspaceResult.innerHTML = `${item.context?.image?.dataUrl ? `<img src="${item.context.image.dataUrl}" alt="历史图片" style="max-width:180px;max-height:120px;border-radius:8px">` : ''}<strong>识别结果 · ${historyModelLabel(item)}</strong><div>${typeof markdownToHtml === 'function' ? markdownToHtml(item.output || '尚未识别') : String(item.output || '尚未识别').replace(/\n/g,'<br>')}</div>`; imageAddToChat.disabled = !item.output; renderMediaAttachment(); });
        rows.querySelectorAll('[data-image-history-delete]').forEach(button => button.onclick = async () => { const next = history.filter(x => x.id !== button.dataset.imageHistoryDelete); await new Promise(resolve => chrome.storage.local.set({ [imageHistoryKey]: next }, resolve)); renderImageHistoryManager(); });
        return visible;
      };
      search.oninput = renderRows; age.onchange = renderRows; renderRows();
      imageWorkspaceHistoryList.querySelector('[data-image-history-export]').onclick = async () => {
        const visible = renderRows();
        for (let i = 0; i < visible.length; i++) { const item = visible[i]; const base = `${String(i + 1).padStart(2, '0')}-${safeExportName(item.name || '图片')}`; if (keepOriginal.checked && item.context?.image?.dataUrl) { const image = await fetch(item.context.image.dataUrl); downloadBlob(await image.blob(), `${base}.png`); } if (item.output) downloadBlob(new Blob([item.output], { type: 'text/plain;charset=utf-8' }), `${base}.txt`); }
        if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = `已批量导出 ${visible.length} 条历史记录`;
      };
      imageWorkspaceHistoryList.querySelector('[data-image-history-clean]').onclick = async () => {
        const days = Number(age.value || 0);
        if (!days) { showToast('请先选择要清理的时间范围。'); return; }
        const cutoff = Date.now() - days * 86400000;
        const targets = history.filter(item => Number(item.createdAt || 0) < cutoff);
        if (!targets.length || !window.confirm(`将清理 ${targets.length} 条 ${days} 天以前的历史记录，是否继续？`)) return;
        const next = history.filter(item => Number(item.createdAt || 0) >= cutoff).map(item => { if (!keepOriginal.checked && item.context?.image) { const context = { ...item.context, image: { ...item.context.image, dataUrl: '' } }; return { ...item, context }; } return item; });
        await new Promise(resolve => chrome.storage.local.set({ [imageHistoryKey]: next }, resolve));
        renderImageHistoryManager();
        if (imageWorkspaceStatus) imageWorkspaceStatus.textContent = `已清理 ${targets.length} 条历史记录`;
      };
    };
    if (imageAddToChat) imageAddToChat.onclick = () => {
      const usable = (currentMediaBatch.length ? currentMediaBatch : [currentMediaContext]).filter(x => x?.recognition?.status === 'completed' && x.recognition.text);
      if (!usable.length) { showToast('还没有完成识别的图片。'); return; }
      currentMediaContext = usable[0];
      renderMediaAttachment();
      const results = usable.map((x, i) => `[图片 ${i + 1} 识别结果]\n${x.recognition.text}`).join('\n\n');
      if (inputUser) inputUser.innerText = '请基于以下图片及其识别结果回答我的问题：\n\n' + results;
      if (composerHidden) composerHidden.value = inputUser.innerText;
      setView('chat');
      showChat();
    };
    if (imageWorkspaceHistoryBtn) imageWorkspaceHistoryBtn.onclick = async () => { imageWorkspaceHistoryList.style.display = imageWorkspaceHistoryList.style.display === 'none' ? 'block' : 'none'; if (imageWorkspaceHistoryList.style.display !== 'none') await renderImageHistoryManager(); };
    if (imageWorkspaceClearBtn) imageWorkspaceClearBtn.onclick = clearImageWorkspace;
    if (imageWorkspaceDeleteBtn) imageWorkspaceDeleteBtn.onclick = () => deleteImageWorkspaceAndHistory().catch(e => showToast(e.message || '删除失败'));
    if (imageWorkspaceExportBtn) imageWorkspaceExportBtn.onclick = () => exportImageWorkspace().catch(e => showToast(e.message || '导出失败'));
    if (imageWorkspaceRetry) imageWorkspaceRetry.onclick = () => { const file = workspaceImageInput?.files?.[0]; if (file) chooseMedia('image', file); };
    let quizItems = [];
    let quizIndex = 0;
    let quizScore = 0;
    let quizSelected = -1;
    let quizDifficulty = 'easy';
    let quizAnswered = false;
    let quizContextRef = null;
    let quizFromHistory = false;
    let quizHistoryFilterCurrent = false;
    const parseJsonPayload = (text) => {
      const raw = String(text || '').replace(/```json|```/gi, '').trim();
      try { return JSON.parse(raw); } catch (_) {}
      const start = raw.indexOf('['); const end = raw.lastIndexOf(']');
      if (start >= 0 && end > start) { try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) {} }
      return null;
    };
    const normalizeQuizItems = (items, requestedCount) => {
      const out = (Array.isArray(items) ? items : []).filter(q => {
        if (!q || !String(q.question || '').trim()) return false;
        if (!Array.isArray(q.options) || q.options.length !== 4) return false;
        if (!Number.isInteger(Number(q.answer))) return false;
        const answer = Number(q.answer);
        if (answer < 0 || answer > 3) return false;
        if (!Array.isArray(q.optionReasons) || q.optionReasons.length !== q.options.length) return false;
        if (q.optionReasons.some(reason => !String(reason || '').trim())) return false;
        return true;
      }).slice(0, requestedCount);
      if (out.length < Math.min(3, requestedCount)) throw new Error('AI 返回的题目格式无法识别');
      const counts = [0, 0, 0, 0];
      out.forEach(q => { counts[Number(q.answer)] += 1; });
      const max = Math.max.apply(null, counts);
      if (out.length >= 4 && max > Math.ceil(out.length / 2)) throw new Error('正确答案分布过于集中');
      return out;
    };
    const requestQuiz = async (difficulty, retryCount = 1) => {
      const ctx = await taixueContext.resolve(taixueState.contextSource);
      quizContextRef = {
        source: ctx.source,
        pageTitle: ctx.pageTitle,
        pageUrl: ctx.pageUrl,
        canonicalUrl: ctx.canonicalUrl,
        createdAt: ctx.createdAt,
        textLength: String(ctx.text || '').length,
        approxTokens: ctx.approxTokens || estimateTaixueTokens(ctx.text)
      };
      const limitedContext = limitTaixueText(ctx.text, 70000);
      const text = String(limitedContext.text || '').trim();
      if (!text) throw new Error('当前页面没有可分析的正文');
      const requestedCount = quizCountSelect ? Math.max(3, Math.min(10, parseInt(String(quizCountSelect.value || '3'), 10) || 3)) : 3;
      const budgetNote = limitedContext.truncated ? `注意：材料已按请求预算截取，原文约 ${limitedContext.originalLength} 字；题目只能依据下方可见材料。` : '';
      const prompt = `你是严格的阅读理解题目设计者。请基于下面材料生成${requestedCount}道中文单选题，难度为${difficulty === 'hard' ? '困难' : '简单'}。题目必须只依据材料，不使用材料外知识。简单难度考主旨、明确事实和因果；困难难度考跨段关系、隐含观点和合理推断。每题4个选项且只有一个正确答案。正确答案位置要尽量均匀分布，选项长度相近，干扰项必须有文章依据但不能成立。返回严格JSON数组，不要Markdown，不要额外文字。每项包含 question,type,difficulty,options(4个字符串),answer(0到3的数字),explanation,evidence(包含quote和paragraph),optionReasons(必须与options等长的字符串数组，逐项解释为什么正确或错误)。${budgetNote ? '\n' + budgetNote : ''}\n\n材料：\n${text}`;
      try {
        const output = await taixueTask.requestJsonText({ prompt, timeout: 60000, maxTokens: requestedCount >= 10 ? 3600 : 2200, temperature: 0.35 });
        const parsed = parseJsonPayload(output);
        const items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.questions) ? parsed.questions : []);
        return normalizeQuizItems(items, requestedCount);
      } catch (error) {
        if (retryCount > 0) return requestQuiz(difficulty, retryCount - 1);
        throw error;
      }
    };
    const quizHistoryKey = 'agfQuizHistory';
    const getQuizHistory = async () => new Promise(resolve => chrome.storage.local.get([quizHistoryKey], res => resolve(Array.isArray(res[quizHistoryKey]) ? res[quizHistoryKey] : [])));
    const setQuizHistory = async (history) => new Promise(resolve => chrome.storage.local.set({ [quizHistoryKey]: Array.isArray(history) ? history.slice(0, 30) : [] }, resolve));
    const saveQuizHistory = async (completed = false) => {
      if (!quizItems.length) return;
      const url = String(location.href || '');
      const record = { id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, pageUrl: url, pageTitle: getMetaTitle(), createdAt: quizStartedAt || Date.now(), completedAt: completed ? Date.now() : 0, provider: sessionProviderSelect.value, model: sessionModelSelect.value, difficulty: quizDifficulty, score: quizScore, total: quizItems.length, context: quizContextRef || { source: taixueState.contextSource, pageUrl: url, pageTitle: getMetaTitle() }, questions: quizItems.map((q, i) => ({ ...q, selected: q.selected, isCorrect: q.isCorrect, markedForReview: q.markedForReview || false })) };
      const history = await getQuizHistory();
      const currentId = quizRecordId;
      const index = currentId ? history.findIndex(item => item.id === currentId) : -1;
      if (index >= 0) { record.id = currentId; history[index] = record; } else { quizRecordId = record.id; history.unshift(record); }
      await new Promise(resolve => chrome.storage.local.set({ [quizHistoryKey]: history.slice(0, 30) }, resolve));
    };
    let quizStartedAt = 0;
    let quizRecordId = '';
    const showQuizHistory = async () => {
      const history = await getQuizHistory();
      const currentCanonical = getCanonicalUrl().canonicalUrl;
      const visibleHistory = quizHistoryFilterCurrent ? history.filter(item => {
        const ctx = item && item.context || {};
        return String(ctx.canonicalUrl || item.canonicalUrl || item.pageUrl || '') === String(currentCanonical || location.href || '');
      }) : history;
      quizCard.style.display = 'none'; quizStartActions.style.display = 'none'; quizResult.style.display = 'block';
      if (!visibleHistory.length) { quizResult.innerHTML = `<h3>测试历史</h3><p>${quizHistoryFilterCurrent ? '当前文章还没有测试记录。' : '还没有测试记录。'}</p><div class="agf-quiz-actions"><button id="agfQuizHistoryFilter">${quizHistoryFilterCurrent ? '显示全部' : '仅当前文章'}</button><button id="agfQuizHistoryBack">返回测试</button></div>`; document.getElementById('agfQuizHistoryFilter').onclick = () => { quizHistoryFilterCurrent = !quizHistoryFilterCurrent; showQuizHistory(); }; document.getElementById('agfQuizHistoryBack').onclick = () => { quizStartActions.style.display = 'flex'; quizResult.innerHTML = ''; }; return; }
      quizResult.innerHTML = `<h3>测试历史</h3><div class="agf-quiz-history-list"></div><div class="agf-quiz-actions"><button id="agfQuizHistoryFilter">${quizHistoryFilterCurrent ? '显示全部' : '仅当前文章'}</button><button id="agfQuizHistoryClear" class="danger">清空历史</button><button id="agfQuizHistoryBack">返回测试</button></div>`;
      const list = quizResult.querySelector('.agf-quiz-history-list');
      visibleHistory.forEach(item => {
        const row = document.createElement('div');
        row.className = 'agf-quiz-history-row';
        const meta = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = String(item.pageTitle || '当前文章');
        const small = document.createElement('small');
        small.textContent = `${new Date(item.createdAt).toLocaleString()} · ${item.difficulty === 'hard' ? '困难' : '简单'} · ${item.completedAt ? `${item.score}/${item.total}` : '未完成'}`;
        meta.appendChild(title); meta.appendChild(small);
        const actions = document.createElement('div');
        actions.style.display = 'flex'; actions.style.gap = '6px';
        const openBtn = document.createElement('button');
        openBtn.type = 'button'; openBtn.textContent = item.completedAt ? '查看' : '继续';
        openBtn.onclick = () => {
          quizItems = item.questions || [];
          const firstOpen = quizItems.findIndex(q => typeof q.isCorrect !== 'boolean');
          quizIndex = firstOpen >= 0 ? firstOpen : 0;
          quizScore = Number(item.score || 0);
          quizDifficulty = item.difficulty || 'easy';
          quizContextRef = item.context || null;
          quizRecordId = item.id;
          quizFromHistory = true;
          quizResult.style.display = 'none';
          quizCard.style.display = 'block';
          renderQuizQuestion();
        };
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button'; deleteBtn.className = 'danger'; deleteBtn.textContent = '删除';
        deleteBtn.onclick = async () => { await setQuizHistory(history.filter(record => record.id !== item.id)); showQuizHistory(); };
        actions.appendChild(openBtn); actions.appendChild(deleteBtn);
        row.appendChild(meta); row.appendChild(actions);
        list.appendChild(row);
      });
      document.getElementById('agfQuizHistoryFilter').onclick = () => { quizHistoryFilterCurrent = !quizHistoryFilterCurrent; showQuizHistory(); };
      document.getElementById('agfQuizHistoryClear').onclick = async () => { await setQuizHistory([]); showQuizHistory(); };
      document.getElementById('agfQuizHistoryBack').onclick = () => { quizStartActions.style.display = 'flex'; quizResult.innerHTML = ''; };
    };
    const renderQuizQuestion = () => {
      const q = quizItems[quizIndex];
      if (!q) return;
      quizSelected = Number.isInteger(Number(q.selected)) ? Number(q.selected) : -1;
      quizAnswered = typeof q.isCorrect === 'boolean';
      quizType.textContent = q.type || '文章理解';
      quizQuestion.textContent = q.question;
      quizOptions.innerHTML = '';
      quizFeedback.style.display = quizAnswered ? 'block' : 'none'; quizFeedback.textContent = '';
      if (quizBackHistory) quizBackHistory.style.display = quizFromHistory ? 'inline-block' : 'none';
      quizSubmit.disabled = quizAnswered || quizSelected < 0;
      quizSubmit.style.display = 'inline-block';
      quizNext.style.display = 'none';
      quizProgressText.textContent = `${quizIndex + 1} / ${quizItems.length}`;
      quizProgressBar.style.width = `${((quizIndex + 1) / quizItems.length) * 100}%`;
      q.options.slice(0, 4).forEach((option, index) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'agf-quiz-option';
        button.innerHTML = `<span class="agf-quiz-letter">${String.fromCharCode(65 + index)}</span><span>${String(option)}</span>`;
        if (quizSelected === index) button.classList.add('selected');
        if (quizAnswered) { button.disabled = true; if (index === Number(q.answer)) button.classList.add('correct'); if (index === quizSelected && index !== Number(q.answer)) button.classList.add('wrong'); }
        button.addEventListener('click', () => { if (quizAnswered) return; quizSelected = index; quizOptions.querySelectorAll('button').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); quizSubmit.disabled = false; });
        quizOptions.appendChild(button);
      });
      if (quizAnswered) {
        quizFeedback.innerHTML = `<strong>${q.isCorrect ? '回答正确' : '回答不正确'}</strong><div>${String(q.explanation || '')}</div>${q.evidence?.quote ? `<div class="agf-quiz-evidence">原文依据：${String(q.evidence.quote)}</div>` : ''}${Array.isArray(q.optionReasons) ? `<details><summary>查看每个选项的原因</summary><div>${q.optionReasons.map((reason, i) => `<p>${String.fromCharCode(65 + i)}. ${String(reason)}</p>`).join('')}</div></details>` : ''}`;
        quizNext.style.display = quizIndex + 1 < quizItems.length ? 'inline-block' : 'none';
      }
    };
    const showQuiz = () => { setView('quiz'); if (quizItems.length) renderQuizQuestion(); };
    const startQuiz = async (difficulty = quizDifficulty) => {
      quizFromHistory = false; if (quizBackHistory) quizBackHistory.style.display = 'none'; quizDifficulty = difficulty; quizStartedAt = Date.now(); quizRecordId = ''; quizStartActions.style.display = 'none'; quizCard.style.display = 'none'; quizResult.style.display = 'block'; quizResult.innerHTML = '<p>正在基于当前上下文生成题目...</p>';
      try { quizItems = await requestQuiz(difficulty); if (!quizItems.length) throw new Error('没有生成有效题目'); quizIndex = 0; quizScore = 0; quizItems.forEach(q => { delete q.selected; delete q.isCorrect; }); await saveQuizHistory(false); quizResult.style.display = 'none'; quizCard.style.display = 'block'; renderQuizQuestion(); }
      catch (error) { quizResult.innerHTML = `<p>${String(error.message || error)}</p><div class="agf-quiz-actions"><button id="agfQuizRetry" class="primary">重试</button></div>`; const retry = document.getElementById('agfQuizRetry'); if (retry) retry.onclick = () => startQuiz(quizDifficulty); }
    };
    if (quizSubmit) quizSubmit.addEventListener('click', async () => { const q = quizItems[quizIndex]; if (!q || quizSelected < 0) return; quizAnswered = true; const answer = Number(q.answer); q.selected = quizSelected; q.isCorrect = quizSelected === answer; if (q.isCorrect) quizScore++; await saveQuizHistory(false); quizOptions.querySelectorAll('button').forEach((b, i) => { b.disabled = true; if (i === answer) b.classList.add('correct'); if (i === quizSelected && i !== answer) b.classList.add('wrong'); }); quizFeedback.style.display = 'block'; quizFeedback.innerHTML = `<strong>${q.isCorrect ? '回答正确' : '回答不正确'}</strong><div>${String(q.explanation || '')}</div>${q.evidence?.quote ? `<div class="agf-quiz-evidence">原文依据：${String(q.evidence.quote)}</div>` : ''}<details><summary>查看每个选项的原因</summary><div>${Array.isArray(q.optionReasons) ? q.optionReasons.map((reason, i) => `<p>${String.fromCharCode(65 + i)}. ${String(reason)}</p>`).join('') : '暂无逐项原因'}</div></details>`; quizSubmit.style.display = 'none'; quizNext.style.display = 'inline-block'; });
    if (quizNext) quizNext.addEventListener('click', async () => { if (quizIndex + 1 < quizItems.length) { quizIndex++; quizSubmit.style.display = 'inline-block'; renderQuizQuestion(); } else { await saveQuizHistory(true); quizCard.style.display = 'none'; quizResult.style.display = 'block'; quizResult.innerHTML = `<h3>完成测试</h3><p>答对 ${quizScore} / ${quizItems.length} 题</p><div class="agf-quiz-actions"><button id="agfQuizEasyResult">简单一些</button><button id="agfQuizHardResult">难一些</button><button id="agfQuizHistoryResult">测试历史</button><button id="agfQuizChat">返回聊天</button></div>`; document.getElementById('agfQuizEasyResult').onclick = () => startQuiz('easy'); document.getElementById('agfQuizHardResult').onclick = () => startQuiz('hard'); document.getElementById('agfQuizHistoryResult').onclick = showQuizHistory; document.getElementById('agfQuizChat').onclick = showChat; } });
    if (quizBackHistory) quizBackHistory.addEventListener('click', () => { quizCard.style.display = 'none'; showQuizHistory(); });
    if (quizTab) quizTab.addEventListener('click', () => showQuiz());
    if (document.getElementById('agfQuizStart')) document.getElementById('agfQuizStart').onclick = () => startQuiz('easy');
    if (document.getElementById('agfQuizEasy')) document.getElementById('agfQuizEasy').onclick = () => startQuiz('easy');
    if (document.getElementById('agfQuizHard')) document.getElementById('agfQuizHard').onclick = () => startQuiz('hard');
    if (quizHistoryBtn) quizHistoryBtn.onclick = showQuizHistory;
    const rebuildConvIndex = () => {
      const ci = document.getElementById('agfConvIndex');
      const cl = document.querySelector('#agfAiSettingOverlay .agf-chat-list');
      const roundsEl = document.getElementById('agfConvRounds');
      if (!ci || !cl || !roundsEl) return;
      ci.innerHTML = '';
      const labels = Array.from(cl.querySelectorAll('.agf-qa-label'));
      const rounds = labels.filter(el => String(el.textContent||'').trim().startsWith('Q')).length;
      roundsEl.textContent =  rounds + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.roundsSuffix') : '轮考题');
      try {
        if (carryWrap) carryWrap.style.display = rounds > 0 ? 'flex' : 'none';
        if (carryInput) {
          const allowedMax = Math.min(4, rounds);
          carryInput.setAttribute('max', String(allowedMax));
          if (!carryEdited) carryInput.value = String(allowedMax);
          const v = parseInt(String(carryInput.value||'0'),10) || 0;
          if (v > allowedMax) carryInput.value = String(allowedMax);
          if (v < 0) carryInput.value = '0';
        }
      } catch (_) {}
      for (let i = 0; i < labels.length; i++) {
        const lab = labels[i];
        const t = String(lab.textContent || '').trim();
        if (!t) continue;
        const item = document.createElement('span');
        item.className = 'agf-conv-item';
        item.textContent = t;
        item.addEventListener('click', () => { try { const bub = lab.closest('.agf-bubble') || lab; bub.scrollIntoView({ block: 'start' }); } catch (_) {} });
        ci.appendChild(item);
      }
    };
    const showSettings = () => { setView('settings'); setActiveSettingsTab('api'); };
    if (tabChat) tabChat.addEventListener('click', () => { hideFulltextPanel(); showChat(); });
    if (tabWrench) tabWrench.addEventListener('click', () => { hideFulltextPanel(); hideToast(); showSettings(); });
    if (titleLabel) titleLabel.addEventListener('click', showChat);
    updateContextControls('full_article');
    this.__openTaixueModule = (request = {}) => {
      updateContextControls(request.contextSource || 'full_article');
      if (request.module === 'quiz') showQuiz();
      else showChat();
    };
    const pendingOpen = this.__pendingTaixueOpen || null;
    this.__pendingTaixueOpen = null;
    if (pendingOpen) {
      this.__openTaixueModule(pendingOpen);
    } else {
      try {
        chrome.storage.local.get(['agfTaixueLastModule'], res => {
          const last = res && res.agfTaixueLastModule;
          if (last === 'quiz') showQuiz();
          else showChat();
        });
      } catch (_) {
        showChat();
      }
    }
    let recordsScope = 'all';
    let recordsSearch = '';
    const setRecordsScope = (scope) => {
      recordsScope = scope;
      if (recordsTabCurrent) recordsTabCurrent.classList.toggle('active', scope === 'current');
      if (recordsTabAll) recordsTabAll.classList.toggle('active', scope === 'all');
      if (currentView === 'records') openRecordsListPanel();
    };
    if (recordsTabCurrent) recordsTabCurrent.addEventListener('click', () => setRecordsScope('current'));
    if (recordsTabAll) recordsTabAll.addEventListener('click', () => setRecordsScope('all'));
    if (recordsSearchInput) recordsSearchInput.addEventListener('input', (e) => { recordsSearch = String(e.target.value||'').trim().toLowerCase(); if (currentView === 'records') openRecordsListPanel(); });
    const showRecords = () => { setView('records'); setRecordsScope(recordsScope); };
    const showColors = () => { if (colorsPanel) colorsPanel.style.display = 'block'; };
    const hideColors = () => { if (colorsPanel) colorsPanel.style.display = 'none'; };
    if (colorsClose) colorsClose.addEventListener('click', hideColors);

    const setActiveSettingsTab = (which) => {
      if (settingsTabApi) settingsTabApi.classList.toggle('active', which === 'api');
      if (settingsTabColors) settingsTabColors.classList.toggle('active', which === 'colors');
      if (settingsTabParse) settingsTabParse.classList.toggle('active', which === 'parse');
      if (settingsTabMedia) settingsTabMedia.classList.toggle('active', which === 'media');
      if (settingsTabSpeak) settingsTabSpeak.classList.toggle('active', which === 'speak');
      if (settingsTabDisplay) settingsTabDisplay.classList.toggle('active', which === 'display');
      if (settingsContentApi) settingsContentApi.style.display = which === 'api' ? 'block' : 'none';
      if (settingsContentColors) settingsContentColors.style.display = which === 'colors' ? 'block' : 'none';
      if (settingsContentParse) settingsContentParse.style.display = which === 'parse' ? 'block' : 'none';
      if (settingsContentMedia) settingsContentMedia.style.display = which === 'media' ? 'block' : 'none';
      if (settingsContentSpeak) settingsContentSpeak.style.display = which === 'speak' ? 'block' : 'none';
      if (settingsContentDisplay) settingsContentDisplay.style.display = which === 'display' ? 'block' : 'none';
      if (which === 'colors') fillColorsInputs2();
    };

    const presets = {
      reset: { qBg: '#ffffff', aBg: '#ffffff', displayBg: '#ffffff', qText: '#000000', aText: '#000000' },
      p1:    { qBg: '#ffffff', aBg: '#f9f5e8', displayBg: '#ffffff', qText: '#3e3a2f', aText: '#3e3a2f' },
      p2:    { qBg: '#f6fbf6', aBg: '#fffdf5', displayBg: '#ffffff', qText: '#0f3d2e', aText: '#0f3d2e' },
      p3:    { qBg: '#ffffff', aBg: '#fff7e6', displayBg: '#ffffff', qText: '#3a2f0b', aText: '#3a2f0b' },
      p4:    { qBg: '#fcfcfc', aBg: '#f3f3f3', displayBg: '#ffffff', qText: '#1a1a1a', aText: '#1a1a1a' }
    };

    const applyPreset = (cfg, name) => { applyColorConfig(cfg); fillColorsInputs2(); if (name) showToast((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.presets.applied', { name }) : (name + '预设已应用')); };
    if (preset1Btn) preset1Btn.addEventListener('click', () => applyPreset(presets.p1, '柔和米色'));
    if (preset2Btn) preset2Btn.addEventListener('click', () => applyPreset(presets.p2, '护眼微绿'));
    if (preset3Btn) preset3Btn.addEventListener('click', () => applyPreset(presets.p3, '柔黄纸感'));
    if (preset4Btn) preset4Btn.addEventListener('click', () => applyPreset(presets.p4, '轻灰纸张'));
    if (presetResetBtn) presetResetBtn.addEventListener('click', () => applyPreset(presets.reset, (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.presets.reset') : '已重置默认'));

    const applyColorsFromInputs2 = (label) => {
      const d = { qBg: '#ffffff', aBg: '#ffffff', displayBg: '#ffffff', qText: '#000000', aText: '#000000' };
      const cfg = {
        qBg: (colorQBg2 && colorQBg2.value) || d.qBg,
        aBg: (colorABg2 && colorABg2.value) || d.aBg,
        displayBg: (colorDisplayBg2 && colorDisplayBg2.value) || d.displayBg,
        qText: (colorQText2 && colorQText2.value) || d.qText,
        aText: (colorAText2 && colorAText2.value) || d.aText
      };
      applyColorConfig(cfg);
      if (label) showToast((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.colors.appliedWithLabel', { label }) : (label + '颜色已应用'));
    };
    if (colorQBg2) colorQBg2.addEventListener('input', () => applyColorsFromInputs2((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.colors.labels.qBg') : '问题背景'));
    if (colorABg2) colorABg2.addEventListener('input', () => applyColorsFromInputs2((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.colors.labels.aBg') : '回答背景'));
    if (colorDisplayBg2) colorDisplayBg2.addEventListener('input', () => applyColorsFromInputs2((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.colors.labels.displayBg') : '显示区背景'));
    if (colorQText2) colorQText2.addEventListener('input', () => applyColorsFromInputs2((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.colors.labels.qText') : '问题文本'));
    if (colorAText2) colorAText2.addEventListener('input', () => applyColorsFromInputs2((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.colors.labels.aText') : '回答文本'));

    const PROVIDERS_CONFIG = {
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1/chat/completions',
        models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
        modelInfo: {
          'deepseek-v4-flash': { label: 'DeepSeek V4 Flash', contextWindow: 1000000, maxOutputTokens: 384000, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'deepseek-v4-pro': { label: 'DeepSeek V4 Pro', contextWindow: 1000000, maxOutputTokens: 384000, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' }
        }
      },
      moonshot: {
        baseUrl: 'https://api.moonshot.ai/v1/chat/completions',
        models: ['kimi-k3', 'kimi-k2.6', 'kimi-k2.5', 'moonshot-v1-128k'],
        modelInfo: {
          'kimi-k3': { label: 'Kimi K3', contextWindow: 1048576, maxOutputTokens: 1048576, capabilities: { text: true, vision: true, audio: false, video: true, tools: true, json: true }, supportsBatchVision: true, maxImagesPerRequest: 8, supportsParallelVision: false, reasoning: true, status: 'validation' },
          'kimi-k2.6': { label: 'Kimi K2.6', contextWindow: 1000000, maxOutputTokens: 65536, capabilities: { text: true, vision: true, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'kimi-k2.5': { label: 'Kimi K2.5', contextWindow: 256000, maxOutputTokens: 32768, capabilities: { text: true, vision: true, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'kimi-k2': { label: 'Kimi K2', contextWindow: 131072, maxOutputTokens: 32768, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'moonshot-v1-128k': { label: 'Moonshot V1 128K (兼容)', contextWindow: 131072, maxOutputTokens: 8192, capabilities: { text: true, vision: false, audio: false, tools: false, json: false }, reasoning: false, status: 'legacy' }
        }
      },
      openai: {
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.1', 'gpt-4.1', 'gpt-4o'],
        modelInfo: Object.fromEntries([['gpt-5.6-sol', 1050000], ['gpt-5.6-terra', 1050000], ['gpt-5.6-luna', 1050000], ['gpt-5.1', 400000], ['gpt-4.1', 1047576], ['gpt-4o', 128000]].map(([model, contextWindow]) => [model, { label: model.toUpperCase(), contextWindow, maxOutputTokens: 128000, capabilities: { text: true, vision: true, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' }]))
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com/v1/messages',
        models: ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'],
        modelInfo: {
          'claude-fable-5': { label: 'Claude Fable 5', contextWindow: 1000000, maxOutputTokens: 128000, capabilities: { text: true, vision: true, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'claude-opus-4-8': { label: 'Claude Opus 4.8', contextWindow: 1000000, maxOutputTokens: 128000, capabilities: { text: true, vision: true, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'claude-sonnet-5': { label: 'Claude Sonnet 5', contextWindow: 1000000, maxOutputTokens: 128000, capabilities: { text: true, vision: true, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'claude-haiku-4-5': { label: 'Claude Haiku 4.5', contextWindow: 200000, maxOutputTokens: 64000, capabilities: { text: true, vision: true, audio: false, tools: true, json: true }, reasoning: false, status: 'stable' }
        }
      },
      qwen: {
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1/chat/completions',
        models: ['qwen3.7-max', 'qwen3.6-plus', 'qwen3.6-flash', 'qwen3.5-plus', 'qwen3-coder-next', 'qwen3-vl-plus'],
        modelInfo: Object.fromEntries([
          ['qwen3.7-max', true, 128000], ['qwen3.6-plus', true, 128000], ['qwen3.6-flash', false, 128000], ['qwen3.5-plus', true, 128000], ['qwen3-coder-next', false, 128000], ['qwen3-vl-plus', true, 128000]
        ].map(([model, reasoning, contextWindow]) => [model, { label: model, contextWindow, maxOutputTokens: 32768, capabilities: { text: true, vision: model.includes('vl') || model.includes('plus'), audio: false, tools: true, json: true }, reasoning, status: 'stable' }]))
      },
      chatglm: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        models: ['glm-5.2', 'glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.6'],
        modelInfo: {
          'glm-5.2': { label: 'GLM-5.2', contextWindow: 1000000, maxOutputTokens: 131072, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'glm-5.1': { label: 'GLM-5.1', contextWindow: 200000, maxOutputTokens: 131072, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'glm-5': { label: 'GLM-5', contextWindow: 128000, maxOutputTokens: 16384, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'glm-4.7': { label: 'GLM-4.7', contextWindow: 128000, maxOutputTokens: 16384, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' },
          'glm-4.6': { label: 'GLM-4.6', contextWindow: 128000, maxOutputTokens: 16384, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: false, status: 'stable' }
        }
      },
      minimax: {
        baseUrl: 'https://api.minimax.io/v1/chat/completions',
        models: ['MiniMax-M2.5', 'MiniMax-M2.1', 'MiniMax-M2'],
        modelInfo: Object.fromEntries(['MiniMax-M2.5', 'MiniMax-M2.1', 'MiniMax-M2'].map(model => [model, { label: model, contextWindow: 196608, maxOutputTokens: 32768, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' }]))
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        models: ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro', 'gemini-3-flash'],
        modelInfo: Object.fromEntries([['gemini-3.5-flash', 1000000], ['gemini-3.1-flash-lite', 1000000], ['gemini-3.1-pro', 1000000], ['gemini-3-flash', 1000000]].map(([model, contextWindow]) => [model, { label: model, contextWindow, maxOutputTokens: 65536, capabilities: { text: true, vision: true, audio: true, tools: true, json: true }, reasoning: true, status: model === 'gemini-3.1-pro' ? 'preview' : 'stable' }]))
      },
      grok: {
        baseUrl: 'https://api.x.ai/v1/chat/completions',
        models: ['grok-4.20', 'grok-4.5', 'grok-4.3'],
        modelInfo: Object.fromEntries(['grok-4.20', 'grok-4.5', 'grok-4.3'].map(model => [model, { label: model, contextWindow: 256000, maxOutputTokens: 32768, capabilities: { text: true, vision: true, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' }]))
      },
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        models: ['openai/gpt-5.1', 'anthropic/claude-sonnet-4.5', 'google/gemini-3.1-pro', 'deepseek/deepseek-v4-pro'],
        modelInfo: Object.fromEntries([['openai/gpt-5.1', true], ['anthropic/claude-sonnet-4.5', true], ['google/gemini-3.1-pro', true], ['deepseek/deepseek-v4-pro', false]].map(([model, vision]) => [model, { label: model, contextWindow: 200000, maxOutputTokens: 32768, capabilities: { text: true, vision, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' }]))
      },
      groq: {
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'llama-3.3-70b-versatile'],
        modelInfo: Object.fromEntries([['openai/gpt-oss-120b', 131072], ['openai/gpt-oss-20b', 131072], ['qwen/qwen3.6-27b', 131072], ['llama-3.3-70b-versatile', 131072]].map(([model, contextWindow]) => [model, { label: model, contextWindow, maxOutputTokens: 65536, capabilities: { text: true, vision: false, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' }]))
      },
      siliconflow: {
        baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
        models: ['deepseek-ai/DeepSeek-V3.2', 'Qwen/Qwen3-235B-A22B-Thinking-2507', 'Qwen/Qwen3.5-397B-A17B'],
        modelInfo: Object.fromEntries([['deepseek-ai/DeepSeek-V3.2', false], ['Qwen/Qwen3-235B-A22B-Thinking-2507', false], ['Qwen/Qwen3.5-397B-A17B', false]].map(([model, vision]) => [model, { label: model, contextWindow: 131072, maxOutputTokens: 32768, capabilities: { text: true, vision, audio: false, tools: true, json: true }, reasoning: true, status: 'stable' }]))
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
    let aiBaseUrlsState = {};
    let fallbackProvider = '';

    const renderProviderButtons = (activeProv) => {
      const providerKeys = Object.keys(PROVIDERS_CONFIG).filter(p => p !== 'openrouter' && p !== 'siliconflow' && p !== 'groq' && p !== 'minimax');
      const PROVIDER_LABELS = { deepseek: 'deepseek', moonshot: 'moonshot', openai: 'chatgpt', anthropic: 'claude', qwen: 'qwen', chatglm: 'chatglm', minimax: 'minimax', gemini: 'gemini', grok: 'grok', openrouter: 'openrouter', groq: 'groq', siliconflow: 'siliconflow' };
      const labelMap = {};
      providerKeys.forEach(k => { labelMap[k] = aiKeysState && aiKeysState[k] ? (PROVIDER_LABELS[k] + ' ●') : PROVIDER_LABELS[k]; });
      renderButtons(providerList, providerKeys, activeProv, (val, btn) => {
        Array.from(providerList.querySelectorAll('.agf-btn')).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        try { if (typeof saveConversationSnapshot === 'function' && ((currentConversationId && currentConversationId.length) || (Array.isArray(chatMessages) && chatMessages.length))) { saveConversationSnapshot().catch(()=>{}); } } catch(_){}
        currentProvider = val;
        fillModels(val);
        const base = (aiBaseUrlsState && aiBaseUrlsState[val]) || (PROVIDERS_CONFIG[val]?.baseUrl || '');
        if (baseUrlInput) baseUrlInput.value = base;
        save({ aiProvider: val, aiModel: PROVIDERS_CONFIG[val]?.models?.[0] || '' });
        if (!aiBaseUrlsState[val]) { aiBaseUrlsState[val] = base; try { chrome.storage.local.set({ aiBaseUrls: aiBaseUrlsState }); } catch(_){} }
        if (keySavedBtn) keySavedBtn.style.display = 'none';
        if (apiKeyInput) apiKeyInput.placeholder = (aiKeysState && aiKeysState[val]) ? '••••••••••••••••••••••••••••••••' : '';
        if (providerStatus) providerStatus.textContent = aiKeysState && aiKeysState[val] ? '已配置，待测试' : '未配置 API Key';
        if (providerDot) { providerDot.classList.toggle('ready', !!(aiKeysState && aiKeysState[val])); providerDot.classList.toggle('warn', !(aiKeysState && aiKeysState[val])); }
      }, labelMap);
      if (fallbackProviderSelect) {
        const previous = fallbackProviderSelect.value || fallbackProvider;
        fallbackProviderSelect.innerHTML = '<option value="">不启用</option>';
        providerKeys.filter(p => p !== activeProv && aiKeysState && aiKeysState[p]).forEach(p => {
          const option = document.createElement('option');
          option.value = p;
          option.textContent = labelMap[p] || p;
          fallbackProviderSelect.appendChild(option);
        });
        fallbackProviderSelect.value = previous;
      }
    };

    const initFromStorage = () => {
      try {
        chrome.storage.local.get(['aiProvider','aiModel','aiBaseUrls','aiBaseUrl','aiTemperature','aiKeys','chatColors','aiFallbackProvider'], (res) => {
          let cp = res.aiProvider || 'deepseek';
          aiKeysState = res.aiKeys || {};
          aiBaseUrlsState = res.aiBaseUrls || {};
          if (!aiBaseUrlsState[currentProvider] && res.aiBaseUrl) { aiBaseUrlsState[currentProvider] = res.aiBaseUrl; try { chrome.storage.local.set({ aiBaseUrls: aiBaseUrlsState }); } catch(_){} }
          if (cp === 'openrouter' || cp === 'siliconflow' || cp === 'groq' || cp === 'minimax') {
            const candidates = Object.keys(PROVIDERS_CONFIG).filter(p => p !== 'openrouter' && p !== 'siliconflow' && p !== 'groq' && p !== 'minimax' && aiKeysState && aiKeysState[p]);
            cp = candidates[0] || 'deepseek';
          }
          currentProvider = cp;
          fallbackProvider = res.aiFallbackProvider || '';
          renderProviderButtons(currentProvider);
          const availableModels = PROVIDERS_CONFIG[currentProvider]?.models || [];
          const selectedModel = availableModels.includes(res.aiModel) ? res.aiModel : (availableModels[0] || '');
          fillModels(currentProvider, selectedModel);
          if (selectedModel && selectedModel !== res.aiModel) save({ aiModel: selectedModel });
          const base = (aiBaseUrlsState && aiBaseUrlsState[currentProvider]) || (PROVIDERS_CONFIG[currentProvider]?.baseUrl || '');
          if (baseUrlInput) baseUrlInput.value = base;
          const t = typeof res.aiTemperature === 'number' ? res.aiTemperature : 0.7;
          if (tempInput) tempInput.value = t;
          if (keySavedBtn) keySavedBtn.style.display = 'none';
          if (apiKeyInput) apiKeyInput.placeholder = (aiKeysState && aiKeysState[currentProvider]) ? '••••••••••••••••••••••••••••••••' : '';
          if (providerStatus) providerStatus.textContent = aiKeysState && aiKeysState[currentProvider] ? '已配置，待测试' : '未配置 API Key';
          if (providerDot) { providerDot.classList.toggle('ready', !!(aiKeysState && aiKeysState[currentProvider])); providerDot.classList.toggle('warn', !(aiKeysState && aiKeysState[currentProvider])); }
          const defaults = { qBg: '#f7f7f7', aBg: '#fffaf0', displayBg: '#ffffff', qText: '#333333', aText: '#333333' };
          const c = res.chatColors || defaults;
          overlay.style.setProperty('--agf-q-bg', c.qBg || defaults.qBg);
          overlay.style.setProperty('--agf-a-bg', c.aBg || defaults.aBg);
          overlay.style.setProperty('--agf-display-bg', c.displayBg || defaults.displayBg);
          overlay.style.setProperty('--agf-q-text', c.qText || defaults.qText);
          overlay.style.setProperty('--agf-a-text', c.aText || defaults.aText);
          initComposerSelects();
        });
      } catch (_) {}
    };

    const save = (obj) => { try { chrome.storage.local.set(obj); } catch (_) {} };

    if (fallbackProviderSelect) {
      fallbackProviderSelect.addEventListener('change', () => {
        fallbackProvider = fallbackProviderSelect.value || '';
        save({ aiFallbackProvider: fallbackProvider });
      });
    }

    if (providerTestBtn) {
      providerTestBtn.addEventListener('click', async () => {
        const prov = currentProvider;
        const key = aiKeysState && aiKeysState[prov];
        const cfg = PROVIDERS_CONFIG[prov] || {};
        const url = (aiBaseUrlsState && aiBaseUrlsState[prov]) || cfg.baseUrl || '';
        if (!prov || !key || !url) { if (providerStatus) providerStatus.textContent = '请先填写 API Key 和 URL'; if (providerDot) providerDot.className = 'agf-provider-dot warn'; return; }
        providerTestBtn.disabled = true;
        if (providerStatus) providerStatus.textContent = '测试连接中…';
        if (providerDot) providerDot.className = 'agf-provider-dot warn';
        try {
          const model = (PROVIDERS_CONFIG[prov]?.models || [])[0] || 'gpt-4o-mini';
          const response = await new Promise(resolve => chrome.runtime.sendMessage({
            action: 'aiChatRequest', url, method: 'POST', timeout: 15000,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with OK.' }], max_tokens: 4, stream: false })
          }, resolve));
          const ok = response && response.success && response.status >= 200 && response.status < 300;
          if (providerStatus) providerStatus.textContent = ok ? '连接成功' : ('连接失败 · HTTP ' + ((response && response.status) || '网络错误'));
          if (providerDot) providerDot.className = 'agf-provider-dot ' + (ok ? 'ready' : 'warn');
        } catch (error) {
          if (providerStatus) providerStatus.textContent = '连接失败 · ' + (error.message || '未知错误');
          if (providerDot) providerDot.className = 'agf-provider-dot warn';
        } finally { providerTestBtn.disabled = false; }
      });
    }

    // provider/model buttons are handled in initFromStorage via renderButtons

    if (baseUrlInput) {
      baseUrlInput.addEventListener('change', () => {
        try {
          chrome.storage.local.get(['aiBaseUrls'], (res) => {
            const m = res.aiBaseUrls || {};
            if (currentProvider) m[currentProvider] = baseUrlInput.value || '';
            aiBaseUrlsState = m;
            chrome.storage.local.set({ aiBaseUrls: m });
          });
        } catch(_){}
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
                if (keySavedBtn) { keySavedBtn.style.display = 'inline-block'; setTimeout(()=>{ try { keySavedBtn.style.display = 'none'; } catch(_){} }, 3000); }
                if (apiKeyInput) apiKeyInput.placeholder = '••••••••••••••••••••••••••••••••';
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
    if (saveGlmVisionKeyBtn && glmVisionKeyInput) {
      saveGlmVisionKeyBtn.addEventListener('click', () => { const value = String(glmVisionKeyInput.value || '').trim(); if (!value) return; chrome.storage.local.set({ glmVisionApiKey: value }, () => { glmVisionKeyInput.value = ''; glmVisionKeyInput.placeholder = '已配置，单独用于图片识别/OCR'; showToast('GLM-4V-Flash Key 已保存'); }); });
      chrome.storage.local.get(['glmVisionApiKey'], r => { if (r.glmVisionApiKey) glmVisionKeyInput.placeholder = '已配置，单独用于图片识别/OCR'; });
    }
    const speakSettingsKey = 'agfTaixueSpeakSettings';
    let availableSpeakVoices = [];
    const persistSpeakSettings = () => { try { chrome.storage.local.set({ [speakSettingsKey]: { language: speakLanguageSelect?.value || 'auto', voice: speakVoiceSelect?.value || '', rate: Math.max(.5, Math.min(2, Number(speakRateInput?.value || 1))) } }); } catch (_) {} };
    const refreshSpeakVoices = () => {
      if (!speakVoiceSelect || !('speechSynthesis' in window)) return;
      availableSpeakVoices = window.speechSynthesis.getVoices() || [];
      const lang = speakLanguageSelect?.value || 'auto'; const previous = speakVoiceSelect.value;
      speakVoiceSelect.innerHTML = '<option value="">跟随语言默认音色</option>';
      availableSpeakVoices.filter(v => lang === 'auto' || v.lang === lang || v.lang.toLowerCase().startsWith(lang.split('-')[0].toLowerCase())).forEach(v => { const opt = document.createElement('option'); opt.value = v.voiceURI || v.name; opt.textContent = `${v.name} (${v.lang})${v.default ? ' · 默认' : ''}`; speakVoiceSelect.appendChild(opt); });
      if (Array.from(speakVoiceSelect.options).some(o => o.value === previous)) speakVoiceSelect.value = previous;
    };
    const initSpeakSettings = async () => { try { const r = await chrome.storage.local.get([speakSettingsKey]); const s = r[speakSettingsKey] || {}; if (speakLanguageSelect) speakLanguageSelect.value = s.language || 'auto'; if (speakRateInput) speakRateInput.value = String(s.rate || 1); refreshSpeakVoices(); if (speakVoiceSelect) speakVoiceSelect.value = s.voice || ''; } catch (_) { refreshSpeakVoices(); } };
    if (speakLanguageSelect) speakLanguageSelect.addEventListener('change', () => { refreshSpeakVoices(); persistSpeakSettings(); });
    if (speakVoiceSelect) speakVoiceSelect.addEventListener('change', persistSpeakSettings);
    if (speakRateInput) speakRateInput.addEventListener('change', persistSpeakSettings);
    if ('speechSynthesis' in window) { window.speechSynthesis.addEventListener('voiceschanged', refreshSpeakVoices); initSpeakSettings(); }
    if (speakSampleBtn) speakSampleBtn.onclick = () => { if (!('speechSynthesis' in window)) return; const lang = speakLanguageSelect?.value || 'auto'; const sample = lang === 'zh-CN' || (lang === 'auto' && (!speakVoiceSelect?.value || speakVoiceSelect.value.toLowerCase().includes('zh'))) ? '这是太学朗读试听。你可以在这里确认当前语言、音色和语速。' : 'This is a Taixue reading sample. You can check the selected language, voice, and reading speed here.'; const u = new SpeechSynthesisUtterance(sample); const v = availableSpeakVoices.find(x => (x.voiceURI || x.name) === (speakVoiceSelect?.value || '')); u.voice = v || null; u.lang = v?.lang || (lang === 'auto' ? 'en-US' : lang); u.rate = Math.max(.5, Math.min(2, Number(speakRateInput?.value || 1))); speechSynthesis.cancel(); speechSynthesis.speak(u); };

    initFromStorage();

    try {
      const carryWrapInit = overlay.querySelector('#agfCarryWrap');
      if (carryWrapInit) {
        const t = (k)=>{ try { return (window.i18n && window.i18n.t) ? String(window.i18n.t(k)) : ''; } catch(_) { return ''; } };
        const labels = carryWrapInit.querySelectorAll('.agf-rounds-label');
        if (labels[0]) { labels[0].setAttribute('data-i18n','aiPanel.carry'); labels[0].textContent = t('aiPanel.carry') || '携带'; }
        if (labels[1]) { labels[1].setAttribute('data-i18n','aiPanel.qnaSuffix'); labels[1].textContent = t('aiPanel.qnaSuffix') || '轮问答'; }
      }
    } catch(_) {}

    let panelMode = 'manual';
    const modeBtns = overlay.querySelectorAll('.agf-mode-btn');
    if (modeBtns && modeBtns.length >= 2) {
      try {
        const t = (k)=>{ try { return (window.i18n && window.i18n.t) ? String(window.i18n.t(k)) : ''; } catch(_) { return ''; } };
        modeBtns[0].setAttribute('data-i18n','aiPanel.mode.persistent');
        modeBtns[1].setAttribute('data-i18n','aiPanel.mode.manual');
        modeBtns[0].textContent = t('aiPanel.mode.persistent') || '常驻';
        modeBtns[1].textContent = t('aiPanel.mode.manual') || '手动';
      } catch(_) {}
      const setActiveMode = (m) => {
        modeBtns[0].classList.toggle('active', m === 'persistent');
        modeBtns[1].classList.toggle('active', m !== 'persistent');
      };
      setActiveMode(panelMode === 'persistent' ? 'persistent' : 'manual');
      try {
        chrome.storage.local.get(['aiPanelMode'], (r) => {
          panelMode = (r && r.aiPanelMode) || 'manual';
          setActiveMode(panelMode === 'persistent' ? 'persistent' : 'manual');
        });
      } catch (_) {}
      modeBtns[0].addEventListener('click', async () => { setActiveMode('persistent'); panelMode = 'persistent'; try { await chrome.storage.local.set({ aiPanelMode: 'persistent' }); } catch (_) {} });
      modeBtns[1].addEventListener('click', async () => { setActiveMode('manual'); panelMode = 'manual'; try { await chrome.storage.local.set({ aiPanelMode: 'manual' }); } catch (_) {} });
    }

    const highlightOnBtn = overlay.querySelector('#agfHighlightOn');
    const highlightOffBtn = overlay.querySelector('#agfHighlightOff');
    let highlightEnabled = true;
    let highlightInitPhase = true;
    const setHighlightEnabled = (on, persist) => {
      highlightEnabled = !!on;
      if (highlightOnBtn) highlightOnBtn.classList.toggle('active', !!on);
      if (highlightOffBtn) highlightOffBtn.classList.toggle('active', !on);
      if (persist) { try { chrome.storage.local.set({ chatHighlightEnabled: !!on }); } catch (_) {} }
      if (!highlightInitPhase) {
        if (on) { rehighlightAllBubbles(); }
        else { cancelAllHighlightJobs(); clearAllHighlights(); renderPlainAllBubbles(); }
      }
    };
    setHighlightEnabled(true, false);
    try {
      chrome.storage.local.get(['chatHighlightEnabled'], (r) => {
        const v = r && r.chatHighlightEnabled;
        setHighlightEnabled(v === undefined ? true : !!v, false);
      });
    } catch (_) {}
    if (highlightOnBtn) highlightOnBtn.addEventListener('click', () => setHighlightEnabled(true, true));
    if (highlightOffBtn) highlightOffBtn.addEventListener('click', () => setHighlightEnabled(false, true));

    const initParseToggles = async () => {
      let auto = true;
      let sensitive = true;
      let mediaSettings = {};
      try {
        const s = await chrome.storage.local.get(['pdfAutoCollectEnabled','privacySensitiveFilterEnabled','taixueMediaPermissionEnabled','taixueMediaUploadEnabled']);
        mediaSettings = s || {};
        auto = s.pdfAutoCollectEnabled !== undefined ? !!s.pdfAutoCollectEnabled : true;
        if (s.privacySensitiveFilterEnabled === undefined) {
          try { await chrome.storage.local.set({ privacySensitiveFilterEnabled: true }); } catch(_){ }
          sensitive = true;
        } else {
          sensitive = !!s.privacySensitiveFilterEnabled;
        }
      } catch (_) {}
      const autoItems = ['auto','manual'];
      const autoMap = {
        auto: (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.settings.parse.auto') : '自动',
        manual: (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.settings.parse.manual') : '手动'
      };
      renderButtons(pdfToggle, autoItems, auto ? 'auto' : 'manual', async (val, btn) => {
        Array.from(pdfToggle.querySelectorAll('.agf-btn')).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const enabled = val === 'auto';
        await chrome.storage.local.set({ pdfAutoCollectEnabled: enabled });
        if (manualParseBtn) manualParseBtn.style.display = enabled ? 'none' : 'inline-block';
      }, autoMap);
      const sensItems = ['on','off'];
      const sensMap = {
        on: (window.i18n && window.i18n.t) ? window.i18n.t('buttons.enable') : '开启',
        off: (window.i18n && window.i18n.t) ? window.i18n.t('buttons.disable') : '关闭'
      };
      renderButtons(sensitiveToggle, sensItems, sensitive ? 'on' : 'off', async (val, btn) => {
        Array.from(sensitiveToggle.querySelectorAll('.agf-btn')).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const on = val === 'on';
        await chrome.storage.local.set({ privacySensitiveFilterEnabled: on });
      }, sensMap);
      const mediaPermission = mediaSettings.taixueMediaPermissionEnabled !== false;
      const mediaUpload = mediaSettings.taixueMediaUploadEnabled === true;
      const mediaMap = { on: '开启', off: '关闭' };
      renderButtons(mediaPermissionToggle, ['on','off'], mediaPermission ? 'on' : 'off', async (val, btn) => {
        Array.from(mediaPermissionToggle.querySelectorAll('.agf-btn')).forEach(b => b.classList.remove('active')); btn.classList.add('active');
        await chrome.storage.local.set({ taixueMediaPermissionEnabled: val === 'on' });
      }, mediaMap);
      renderButtons(mediaUploadToggle, ['on','off'], mediaUpload ? 'on' : 'off', async (val, btn) => {
        Array.from(mediaUploadToggle.querySelectorAll('.agf-btn')).forEach(b => b.classList.remove('active')); btn.classList.add('active');
        await chrome.storage.local.set({ taixueMediaUploadEnabled: val === 'on' });
      }, mediaMap);
      if (manualParseBtn) {
        manualParseBtn.style.display = auto ? 'none' : 'inline-block';
        manualParseBtn.addEventListener('click', async () => {
          const url = window.location.href;
          try { await chrome.runtime.sendMessage({ action: 'collectPdfFromUrl', url }); } catch (_) {}
        });
      }
    };
    initParseToggles();

    let foldThresholdChars = 2000;
    let foldCollapsedMaxHeight = 160;
    const initFoldSettings = async () => {
      try {
        const s = await chrome.storage.local.get(['foldThresholdChars','foldCollapsedMaxHeight']);
        foldThresholdChars = typeof s.foldThresholdChars === 'number' ? s.foldThresholdChars : 100000;
        if (foldThresholdChars < 100000) {
          foldThresholdChars = 100000;
          try { await chrome.storage.local.set({ foldThresholdChars }); } catch(_){}
        }
        foldCollapsedMaxHeight = typeof s.foldCollapsedMaxHeight === 'number' ? s.foldCollapsedMaxHeight : 160;
      } catch (_) {}
      if (foldThresholdInput) foldThresholdInput.value = foldThresholdChars;
      if (foldHeightInput) foldHeightInput.value = foldCollapsedMaxHeight;
      overlay.style.setProperty('--agf-collapse-height', (foldCollapsedMaxHeight || 160) + 'px');
    };
    initFoldSettings();
    if (foldThresholdInput) foldThresholdInput.addEventListener('change', async () => { const v = parseInt(foldThresholdInput.value,10); const n = isNaN(v) ? 2000 : Math.max(0, v); foldThresholdChars = n; try { await chrome.storage.local.set({ foldThresholdChars: n }); } catch(_) {} });
    if (foldHeightInput) foldHeightInput.addEventListener('change', async () => { const v = parseInt(foldHeightInput.value,10); const n = isNaN(v) ? 160 : Math.max(80, v); foldCollapsedMaxHeight = n; overlay.style.setProperty('--agf-collapse-height', n + 'px'); try { await chrome.storage.local.set({ foldCollapsedMaxHeight: n }); } catch(_) {} });

    const fillColorsInputs = () => {
      const cs = getComputedStyle(overlay);
      const d = { qBg: '#ffffff', aBg: '#ffffff', displayBg: '#ffffff', qText: '#000000', aText: '#000000' };
      const qbg = cs.getPropertyValue('--agf-q-bg').trim() || d.qBg;
      const abg = cs.getPropertyValue('--agf-a-bg').trim() || d.aBg;
      const dbg = cs.getPropertyValue('--agf-display-bg').trim() || d.displayBg;
      const qtx = cs.getPropertyValue('--agf-q-text').trim() || d.qText;
      const atx = cs.getPropertyValue('--agf-a-text').trim() || d.aText;
      if (colorQBg) colorQBg.value = toColorInput(qbg);
      if (colorABg) colorABg.value = toColorInput(abg);
      if (colorDisplayBg) colorDisplayBg.value = toColorInput(dbg);
      if (colorQText) colorQText.value = toColorInput(qtx);
      if (colorAText) colorAText.value = toColorInput(atx);
    };
    const fillColorsInputs2 = () => {
      const cs = getComputedStyle(overlay);
      const d = { qBg: '#ffffff', aBg: '#ffffff', displayBg: '#ffffff', qText: '#000000', aText: '#000000' };
      const qbg = cs.getPropertyValue('--agf-q-bg').trim() || d.qBg;
      const abg = cs.getPropertyValue('--agf-a-bg').trim() || d.aBg;
      const dbg = cs.getPropertyValue('--agf-display-bg').trim() || d.displayBg;
      const qtx = cs.getPropertyValue('--agf-q-text').trim() || d.qText;
      const atx = cs.getPropertyValue('--agf-a-text').trim() || d.aText;
      if (colorQBg2) colorQBg2.value = toColorInput(qbg);
      if (colorABg2) colorABg2.value = toColorInput(abg);
      if (colorDisplayBg2) colorDisplayBg2.value = toColorInput(dbg);
      if (colorQText2) colorQText2.value = toColorInput(qtx);
      if (colorAText2) colorAText2.value = toColorInput(atx);
    };
    const toColorInput = (v) => {
      const hex = v.toLowerCase();
      if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
      return '#ffffff';
    };
    const openColorsPanel = () => { fillColorsInputs(); showColors(); };
    const applyColorConfig = (cfg) => {
      overlay.style.setProperty('--agf-q-bg', cfg.qBg);
      overlay.style.setProperty('--agf-a-bg', cfg.aBg);
      overlay.style.setProperty('--agf-display-bg', cfg.displayBg);
      overlay.style.setProperty('--agf-q-text', cfg.qText);
      overlay.style.setProperty('--agf-a-text', cfg.aText);
      try { chrome.storage.local.set({ chatColors: cfg }); } catch (_) {}
    };
    if (colorsApply) colorsApply.addEventListener('click', () => {
      const d = { qBg: '#ffffff', aBg: '#ffffff', displayBg: '#ffffff', qText: '#000000', aText: '#000000' };
      const cfg = {
        qBg: (colorQBg && colorQBg.value) || d.qBg,
        aBg: (colorABg && colorABg.value) || d.aBg,
        displayBg: (colorDisplayBg && colorDisplayBg.value) || d.displayBg,
        qText: (colorQText && colorQText.value) || d.qText,
        aText: (colorAText && colorAText.value) || d.aText
      };
      applyColorConfig(cfg);
      hideColors();
    });
    if (colorsApply2) colorsApply2.addEventListener('click', () => {
      const d = { qBg: '#ffffff', aBg: '#ffffff', displayBg: '#ffffff', qText: '#000000', aText: '#000000' };
      const cfg = {
        qBg: (colorQBg2 && colorQBg2.value) || d.qBg,
        aBg: (colorABg2 && colorABg2.value) || d.aBg,
        displayBg: (colorDisplayBg2 && colorDisplayBg2.value) || d.displayBg,
        qText: (colorQText2 && colorQText2.value) || d.qText,
        aText: (colorAText2 && colorAText2.value) || d.aText
      };
      applyColorConfig(cfg);
    });

    if (settingsTabApi) settingsTabApi.addEventListener('click', () => setActiveSettingsTab('api'));
    if (settingsTabColors) settingsTabColors.addEventListener('click', () => setActiveSettingsTab('colors'));
    if (settingsTabParse) settingsTabParse.addEventListener('click', () => setActiveSettingsTab('parse'));
    if (settingsTabMedia) settingsTabMedia.addEventListener('click', () => setActiveSettingsTab('media'));
    if (settingsTabSpeak) settingsTabSpeak.addEventListener('click', () => setActiveSettingsTab('speak'));
    if (settingsTabDisplay) settingsTabDisplay.addEventListener('click', () => setActiveSettingsTab('display'));

    function initComposerSelects() {
      if (!sessionProviderSelect || !sessionModelSelect) return;
      if (sessionProviderSelect.dataset.initialized === 'true') return;
      sessionProviderSelect.dataset.initialized = 'true';
      const providers = Object.keys(PROVIDERS_CONFIG).filter(p => aiKeysState && aiKeysState[p]).filter(p => p !== 'openrouter' && p !== 'siliconflow' && p !== 'groq' && p !== 'minimax');
      sessionProviderSelect.title = providers.length > 1 ? '切换 AI 服务商' : '当前 AI 服务商已在插件设置中配置';
      sessionProviderSelect.style.display = providers.length > 1 ? '' : 'none';
      sessionProviderSelect.innerHTML = '';
      providers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p === 'openai' ? 'chatgpt' : (p === 'anthropic' ? 'claude' : p);
        sessionProviderSelect.appendChild(opt);
      });
      const selectedProv = providers.includes(currentProvider) ? currentProvider : (providers[0] || '');
      if (selectedProv) sessionProviderSelect.value = selectedProv;
      if (!selectedProv) {
        const empty = document.createElement('option');
        empty.textContent = '请先配置 AI';
        empty.disabled = true;
        empty.selected = true;
        sessionProviderSelect.appendChild(empty);
        sessionProviderSelect.style.display = '';
        sessionModelSelect.innerHTML = '<option>未配置模型</option>';
        sessionModelSelect.disabled = true;
      } else sessionModelSelect.disabled = false;
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
        try { if (typeof saveConversationSnapshot === 'function' && ((currentConversationId && currentConversationId.length) || (Array.isArray(chatMessages) && chatMessages.length))) { saveConversationSnapshot().catch(()=>{}); } } catch(_){}
        const prov = sessionProviderSelect.value;
        fillModelsForProv(prov);
      });
    }
    
    let autoScrollEnabled = true;
    let lastMouseY = 0;
    let upwardAccum = 0;
    const stopAutoScrollDistance = 120;
    let lastScrollTop = 0;
    if (chatList) {
      chatList.addEventListener('mousemove', (e) => {
        const y = e.clientY || 0;
        if (lastMouseY && y < lastMouseY) {
          upwardAccum += (lastMouseY - y);
          if (upwardAccum >= stopAutoScrollDistance) autoScrollEnabled = false;
        } else {
          upwardAccum = 0;
        }
        lastMouseY = y;
      });
      chatList.addEventListener('mouseleave', () => { lastMouseY = 0; upwardAccum = 0; });
      chatList.addEventListener('scroll', () => {
        const st = chatList.scrollTop;
        if (st < lastScrollTop) autoScrollEnabled = false;
        lastScrollTop = st;
        const nearBottom = (chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight) < 40;
        if (nearBottom) autoScrollEnabled = true;
      });
      chatList.addEventListener('wheel', (e) => { if (e.deltaY < 0) autoScrollEnabled = false; });
    }

    let chatMessages = [];
    let currentConversationId = null;
    let currentReplyProvider = '';
    let currentReplyModel = '';
    let streamingText = '';
    let streamingBubble = null;
    let streamingContentEl = null;
    let qaCounter = 0;
    let nextPromptIsGenerated = false;
    let currentSubject = '';
    let currentPrefix = '';
    let currentPageTitle = '';
    let currentPageUrl = '';
    let currentCanonicalUrl = '';
    const getMetaTitle = () => {
      try {
        const og = document.querySelector('meta[property="og:title"]');
        if (og && og.content) return og.content.trim();
      } catch (_) {}
      try {
        const tw = document.querySelector('meta[name="twitter:title"]');
        if (tw && tw.content) return tw.content.trim();
      } catch (_) {}
      try {
        const h1 = document.querySelector('h1');
        if (h1 && h1.textContent) return h1.textContent.trim();
      } catch (_) {}
      return (document.title || '').trim();
    };
    const getCanonicalUrl = () => {
      const pageUrl = window.location.href;
      let canonicalUrl = pageUrl;
      try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) canonicalUrl = link.href; } catch (_) {}
      return { pageUrl, canonicalUrl };
    };
    const isPdfPage = () => {
      try {
        const url = window.location.href;
        if (/\.pdf($|[?#])/i.test(url)) return true;
        const el = document.querySelector('embed[type="application/pdf"], object[type="application/pdf"], iframe[src*=".pdf"]');
        if (el) return true;
      } catch (_) {}
      return false;
    };
    const buildPdfText = async () => {
      const u = getCanonicalUrl();
      let text = '';
      try { const r = await new Promise(s => chrome.runtime.sendMessage({ action: 'agfPdfGetTextForPage', pageUrl: u.pageUrl, canonicalUrl: u.canonicalUrl }, s)); text = (r && r.text) ? String(r.text) : ''; } catch (_) {}
      if (!text || text.trim().length < 10) {
        try { await new Promise(s => chrome.runtime.sendMessage({ action: 'collectPdfFromUrl', url: u.pageUrl }, s)); } catch (_) {}
        for (let i=0;i<8;i++) {
          await new Promise(r => setTimeout(r, 400));
          try { const r2 = await new Promise(s => chrome.runtime.sendMessage({ action: 'agfPdfGetTextForPage', pageUrl: u.pageUrl, canonicalUrl: u.canonicalUrl }, s)); const t2 = (r2 && r2.text) ? String(r2.text) : ''; if (t2 && t2.trim().length > 10) { text = t2; break; } } catch (_) {}
        }
      }
      return text || '';
    };
    const buildPlainTextForPage = async () => {
      const u = getCanonicalUrl();
      const useOld = await (async()=>{ try { const r = await chrome.storage.local.get(['useOldTextActions']); return !!r.useOldTextActions; } catch(_) { return false; } })();
      const action = useOld ? 'agfTestGetTextForPage' : 'agfPlainGetTextForPage';
      let rawText = '';
      try { const resp = await new Promise(r => chrome.runtime.sendMessage({ action, pageUrl: u.pageUrl, canonicalUrl: u.canonicalUrl }, r)); rawText = (resp && resp.text) ? String(resp.text) : ''; } catch(_) {}
      return String(rawText||'');
    };
    const buildLegacySegmentText = async () => {
      const segs = await getLatestStoredSegmentsForPage();
      const parts = [];
      for (let i=0;i<segs.length;i++) {
        const r = segs[i];
        const t = (r.blocks && r.blocks.length ? r.blocks.map(b => String(b.text||'')).join('\n') : '');
        if (t && t.trim().length > 0) parts.push(t);
      }
      return parts.join('\n');
    };

    const buildPdfStructuredOutlineText = async () => {
      const segs = await getLatestStoredSegmentsForPage();
      if (!segs || segs.length === 0) return '';
      const groups = new Map();
      const titles = new Map();
      const levels = new Map();
      for (let i=0;i<segs.length;i++) {
        const r = segs[i];
        const isPdf = /^pdf-/.test(String(r.sectionId||''));
        if (!isPdf) continue;
        const key = r.outlinePath ? String(r.outlinePath) : ('pdf:'+ (r.pageIndex||i+1));
        const label = r.outlinePath ? String(r.outlinePath).split('>').map(s=>s.trim()).filter(Boolean).pop() || r.sectionTitle || key : (r.sectionTitle || key);
        const lvl = typeof r.outlineLevel === 'number' ? r.outlineLevel : 0;
        const txt = (r.blocks && r.blocks.length ? r.blocks.map(b => String(b.text||'')).join('\n') : '');
        if (!txt || !txt.trim()) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ pageIndex: r.pageIndex||0, text: txt });
        if (!titles.has(key)) titles.set(key, label);
        if (!levels.has(key)) { levels.set(key, lvl); } else { const cur = levels.get(key)||0; levels.set(key, Math.min(cur||0, lvl||0)); }
      }
      const arr = Array.from(groups.entries()).map(([k, xs]) => ({ k, title: titles.get(k)||k, level: levels.get(k)||0, minPage: Math.min.apply(null, xs.map(x=>x.pageIndex||0)), text: xs.map(x=>x.text).join('\n') }));
      arr.sort((a,b)=> (a.minPage-b.minPage) || a.title.localeCompare(b.title));
      const lines = [];
      for (let i=0;i<arr.length;i++) {
        const h = String(arr[i].title||'').trim();
        const body = String(arr[i].text||'').trim();
        if (!body) continue;
        const lvl = Math.max(0, Math.min(6, parseInt(arr[i].level||0,10)));
        const pfx = lvl > 0 ? Array(lvl).fill('#').join('') + ' ' : '';
        lines.push(pfx + h);
        lines.push(body);
        lines.push('');
      }
      return lines.join('\n');
    };
    const buildStructuredFromLegacyOrHints = async () => {
      if (typeof buildTStructuredText === 'function') {
        try { const s = await buildTStructuredText(); if (s) return s; } catch(_) {}
      }
      const plain = await buildPlainTextForPage();
      return String(plain||'');
    };
    const dbPutConversation = async (obj) => new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: 'agfConvPut', data: obj }, (res) => {
          if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
          if (res && res.success) resolve(true); else reject((res && res.error) || 'put_failed');
        });
      } catch (e) { reject(e); }
    });
    const dbGetConversation = async (id) => new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: 'agfConvGet', id }, (res) => {
          if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
          if (res && res.success) resolve(res.item || null); else reject((res && res.error) || 'get_failed');
        });
      } catch (e) { reject(e); }
    });
    const dbListConversations = async (limit = 50) => new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: 'agfConvList', limit }, (res) => {
          if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
          if (res && res.success) resolve(res.items || []); else reject((res && res.error) || 'list_failed');
        });
      } catch (e) { reject(e); }
    });
    const dbDeleteConversation = async (id) => new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: 'agfConvDelete', id }, (res) => {
          if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
          if (res && res.success) resolve(true); else reject((res && res.error) || 'delete_failed');
        });
      } catch (e) { reject(e); }
    });
    const newConversation = async () => {
      currentConversationId = 'agf-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
      chatMessages = [];
      if (chatList) chatList.innerHTML = '';
      qaCounter = 0;
      const prov = sessionProviderSelect && sessionProviderSelect.value || '';
      const model = sessionModelSelect && sessionModelSelect.value || '';
      const now = Date.now();
      if (!currentPageTitle) currentPageTitle = getMetaTitle();
      if (!currentPageUrl || !currentCanonicalUrl) { const u = getCanonicalUrl(); currentPageUrl = u.pageUrl; currentCanonicalUrl = u.canonicalUrl; }
      const convo = { id: currentConversationId, createdAt: now, updatedAt: now, provider: prov, model, messages: [], subject: currentSubject || '', prefix: currentPrefix || '', pageTitle: currentPageTitle || '', pageUrl: currentPageUrl || '', canonicalUrl: currentCanonicalUrl || '' };
      try { await dbPutConversation(convo); } catch (_) {}
    };
    const saveConversationSnapshot = async () => {
      if (!currentConversationId) return;
      const prov = sessionProviderSelect && sessionProviderSelect.value || '';
      const model = sessionModelSelect && sessionModelSelect.value || '';
      const now = Date.now();
      let old = null;
      try { old = await dbGetConversation(currentConversationId); } catch(_) { old = null; }
      let pageUrl = currentPageUrl || '';
      let canonicalUrl = currentCanonicalUrl || '';
      let pageTitle = currentPageTitle || '';
      try {
        if (!pageUrl || !canonicalUrl || !pageTitle) {
          const u = getCanonicalUrl();
          pageUrl = pageUrl || u.pageUrl;
          canonicalUrl = canonicalUrl || u.canonicalUrl;
          pageTitle = pageTitle || getMetaTitle();
        }
      } catch(_) {}
      if ((!pageUrl || !canonicalUrl) && Array.isArray(chatMessages) && chatMessages.length) {
        try {
          const firstUser = chatMessages.find(m => m && m.role === 'user');
          const c3 = (firstUser && firstUser.content) || '';
          const m3 = c3.match(/页面:\s*(https?:\/\/\S+)/) || c3.match(/帮我总结这篇文章:\s*(https?:\/\/\S+)/);
          if (m3) { pageUrl = pageUrl || m3[1]; canonicalUrl = canonicalUrl || m3[1]; }
        } catch (_) {}
      }
      if (old) {
        pageUrl = old.pageUrl || pageUrl;
        canonicalUrl = old.canonicalUrl || canonicalUrl;
        pageTitle = old.pageTitle || pageTitle;
      }
      const convo = { id: currentConversationId, createdAt: (old && old.createdAt) ? old.createdAt : now, updatedAt: now, provider: prov, model, messages: chatMessages, subject: currentSubject || (old && old.subject) || '', prefix: currentPrefix || (old && old.prefix) || '', pageTitle, pageUrl, canonicalUrl };
      try { await dbPutConversation(convo); } catch (_) {}
    };
    const openRecordsListPanel = async () => {
      if (!recordsPanel || !recordsList) return;
      recordsList.innerHTML = '';
      let items = [];
      try { items = await dbListConversations(500); } catch (_) {}
      try {
        if (recordsScope === 'current') {
          const u = getCanonicalUrl();
          items = items.filter(it => (it.canonicalUrl && it.canonicalUrl === u.canonicalUrl) || (it.pageUrl && it.pageUrl === u.pageUrl));
        }
      } catch (_) {}
      const deriveSubject = (item) => {
        let prefix = item.prefix || '';
        const msgs = item.messages || [];
        if (!prefix) {
          const u = msgs.find(m => m.role === 'user');
          const c = (u && u.content) || '';
          if (/总结/.test(c)) prefix = '总结';
          else if (/结构化摘要/.test(c)) prefix = '结构化摘要';
          else if (/简明解释/.test(c)) prefix = '简明解释';
          else if (/大纲/.test(c)) prefix = '提取大纲';
          else if (/关键词|术语/.test(c)) prefix = '提取关键词与术语';
        }
        let title = item.pageTitle || '';
        if (!title) {
          const u = msgs.find(m => m.role === 'user');
          const c = (u && u.content) || '';
          let urlStr = '';
          const m = c.match(/页面:\s*(https?:\/\/\S+)/) || c.match(/帮我总结这篇文章:\s*(https?:\/\/\S+)/);
          if (m) urlStr = m[1]; else urlStr = item.pageUrl || item.canonicalUrl || '';
          try { if (urlStr) { const u2 = new URL(urlStr, window.location.href); title = u2.hostname; } } catch (_) { title = urlStr || ''; }
        }
        return (prefix ? (prefix + ' · ') : '') + (title || ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.unnamed') : '未命名'));
      };
      const buildRecordItem = (item) => {
        const el = document.createElement('div');
        el.className = 'agf-record-item';
        const leftBox = document.createElement('div');
        leftBox.style.display = 'flex';
        leftBox.style.flexDirection = 'column';
        leftBox.style.alignItems = 'flex-start';
        const dateEl = document.createElement('div');
        dateEl.textContent = new Date(item.updatedAt || item.createdAt).toLocaleString();
        const subjEl = document.createElement('div');
        subjEl.className = 'agf-record-subject';
        const subjectText = item.subject || deriveSubject(item);
        subjEl.textContent = subjectText;
        let linkUrl = item.pageUrl || item.canonicalUrl || '';
        if (!linkUrl) {
          try {
            const msgs2 = item.messages || [];
            const uMsg = msgs2.find(m => m && m.role === 'user');
            const c2 = (uMsg && uMsg.content) || '';
            const m2 = c2.match(/页面:\s*(https?:\/\/\S+)/) || c2.match(/帮我总结这篇文章:\s*(https?:\/\/\S+)/);
            if (m2) linkUrl = m2[1];
          } catch (_) {}
        }
        if (linkUrl) {
          const a = document.createElement('a');
          a.className = 'agf-record-link';
          a.textContent = linkUrl;
          a.href = linkUrl;
          a.target = '_blank';
          a.rel = 'noopener';
          subjEl.appendChild(document.createTextNode(' '));
          subjEl.appendChild(a);
        }
        leftBox.appendChild(dateEl);
        leftBox.appendChild(subjEl);
        const actions = document.createElement('div');
        actions.className = 'agf-record-actions';
        const openBtn = document.createElement('button');
        openBtn.className = 'agf-records-open';
        openBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.records.open') : '打开';
        openBtn.addEventListener('click', async () => {
          const data = await dbGetConversation(item.id);
          if (data && data.messages) {
            chatMessages = data.messages.slice();
            if (chatList) {
              chatList.innerHTML = '';
              qaCounter = 0;
              chatMessages.forEach((m,i) => appendMessage(m.role, m.content, { highlight: highlightEnabled && !m.highlightHtml, highlightHtml: highlightEnabled ? m.highlightHtml : null, msgIndex: i }));
            }
            currentConversationId = item.id;
            try { currentPageUrl = item.pageUrl || currentPageUrl; currentCanonicalUrl = item.canonicalUrl || currentCanonicalUrl; currentPageTitle = item.pageTitle || currentPageTitle; } catch(_){}
            showChat();
            try { rebuildConvIndex(); } catch (_) {}
          }
        });
        const delBtn = document.createElement('button');
        delBtn.className = 'agf-record-delete';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', async () => {
          const ok = window.confirm((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.records.deleteConfirm') : '确定删除该记录？');
          if (!ok) return;
          try { await dbDeleteConversation(item.id); el.remove(); if (toastEl) { toastEl.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.records.deleted') : '记录已删除'; toastEl.style.display = 'block'; setTimeout(() => { toastEl.style.display = 'none'; }, 2000); } } catch (_) {}
        });
        actions.appendChild(openBtn);
        actions.appendChild(delBtn);
        el.appendChild(leftBox);
        el.appendChild(actions);
        return el;
      };
      let filtered = items.slice();
      if (recordsSearch) {
        const q = recordsSearch.toLowerCase();
        filtered = filtered.filter(it => {
          const subj = (it.subject || deriveSubject(it)).toLowerCase();
          const url = (it.pageUrl || it.canonicalUrl || '').toLowerCase();
          return subj.indexOf(q) >= 0 || url.indexOf(q) >= 0;
        });
      }
      if (!filtered.length) return;
      const ys = new Set();
      const yms = new Set();
      const ymds = new Set();
      const getY = (t) => new Date(t).getFullYear();
      const getYM = (t) => { const d = new Date(t); const m = d.getMonth()+1; return getY(t) + '-' + String(m).padStart(2,'0'); };
      const getYMD = (t) => { const d = new Date(t); const m = d.getMonth()+1; const dd = d.getDate(); return getY(t) + '-' + String(m).padStart(2,'0') + '-' + String(dd).padStart(2,'0'); };
      filtered.forEach(it => { const t = it.updatedAt || it.createdAt; ys.add(getY(t)); yms.add(getYM(t)); ymds.add(getYMD(t)); });
      const showYear = ys.size > 1;
      const showMonth = yms.size > 1;
      const showDay = ymds.size > 1;
      const groups = [];
      if (!showYear && !showMonth && !showDay) {
        filtered.forEach(it => recordsList.appendChild(buildRecordItem(it)));
        return;
      }
      if (showYear) {
        const mapY = new Map();
        filtered.forEach(it => { const t = it.updatedAt || it.createdAt; const y = getY(t); if (!mapY.has(y)) mapY.set(y, []); mapY.get(y).push(it); });
        Array.from(mapY.keys()).sort((a,b)=>b-a).forEach(y => {
          const arrY = mapY.get(y);
          if (showMonth) {
            const mapM = new Map();
            arrY.forEach(it => { const t = it.updatedAt || it.createdAt; const key = getYM(t); if (!mapM.has(key)) mapM.set(key, []); mapM.get(key).push(it); });
            const yBox = document.createElement('div');
            yBox.className = 'agf-group';
            const yTitle = document.createElement('div');
            yTitle.className = 'agf-group-title';
            const ySpan = document.createElement('span');
            ySpan.textContent = String(y) + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.yearSuffix') : '年');
            const yBtn = document.createElement('button');
            yBtn.className = 'agf-records-close';
            yBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠';
            const yBody = document.createElement('div');
            yBody.className = 'agf-group-body';
            yBtn.addEventListener('click', () => { yBody.classList.toggle('collapsed'); yBtn.textContent = yBody.classList.contains('collapsed') ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠'); });
            yTitle.appendChild(ySpan);
            yTitle.appendChild(yBtn);
            yBox.appendChild(yTitle);
            yBox.appendChild(yBody);
            Array.from(mapM.keys()).sort((a,b)=> a<b?1:-1).forEach(ym => {
              const arrM = mapM.get(ym);
              if (showDay) {
                const mapD = new Map();
                arrM.forEach(it => { const t = it.updatedAt || it.createdAt; const key = getYMD(t); if (!mapD.has(key)) mapD.set(key, []); mapD.get(key).push(it); });
                Array.from(mapD.keys()).sort((a,b)=> a<b?1:-1).forEach(ymd => {
                  const dBox = document.createElement('div');
                  dBox.className = 'agf-group';
                  const dTitle = document.createElement('div');
                  dTitle.className = 'agf-group-title';
                  const dSpan = document.createElement('span');
                  const parts = ymd.split('-');
                  dSpan.textContent = parts[1] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.monthSuffix') : '月') + parts[2] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.daySuffix') : '日');
                  const dBtn = document.createElement('button');
                  dBtn.className = 'agf-records-close';
                  dBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠';
                  const dBody = document.createElement('div');
                  dBody.className = 'agf-group-body';
                  dBtn.addEventListener('click', () => { dBody.classList.toggle('collapsed'); dBtn.textContent = dBody.classList.contains('collapsed') ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠'); });
                  dTitle.appendChild(dSpan);
                  dTitle.appendChild(dBtn);
                  dBox.appendChild(dTitle);
                  dBox.appendChild(dBody);
                  mapD.get(ymd).forEach(it => dBody.appendChild(buildRecordItem(it)));
                  yBody.appendChild(dBox);
                });
              } else {
                const mBox = document.createElement('div');
                mBox.className = 'agf-group';
                const mTitle = document.createElement('div');
                mTitle.className = 'agf-group-title';
                const mSpan = document.createElement('span');
                const parts = ym.split('-');
                mSpan.textContent = parts[1] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.monthSuffix') : '月');
                const mBtn = document.createElement('button');
                mBtn.className = 'agf-records-close';
                mBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠';
                const mBody = document.createElement('div');
                mBody.className = 'agf-group-body';
                mBtn.addEventListener('click', () => { mBody.classList.toggle('collapsed'); mBtn.textContent = mBody.classList.contains('collapsed') ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠'); });
                mTitle.appendChild(mSpan);
                mTitle.appendChild(mBtn);
                mBox.appendChild(mTitle);
                mBox.appendChild(mBody);
                arrM.forEach(it => mBody.appendChild(buildRecordItem(it)));
                yBody.appendChild(mBox);
              }
            });
            recordsList.appendChild(yBox);
          } else {
            const yBox = document.createElement('div');
            yBox.className = 'agf-group';
            const yTitle = document.createElement('div');
            yTitle.className = 'agf-group-title';
            const ySpan = document.createElement('span');
            ySpan.textContent = String(y) + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.yearSuffix') : '年');
            const yBtn = document.createElement('button');
            yBtn.className = 'agf-records-close';
            yBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠';
            const yBody = document.createElement('div');
            yBody.className = 'agf-group-body';
            yBtn.addEventListener('click', () => { yBody.classList.toggle('collapsed'); yBtn.textContent = yBody.classList.contains('collapsed') ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠'); });
            yTitle.appendChild(ySpan);
            yTitle.appendChild(yBtn);
            yBox.appendChild(yTitle);
            yBox.appendChild(yBody);
            arrY.forEach(it => yBody.appendChild(buildRecordItem(it)));
            recordsList.appendChild(yBox);
          }
        });
        return;
      }
      if (showMonth) {
        const mapM = new Map();
        filtered.forEach(it => { const t = it.updatedAt || it.createdAt; const key = getYM(t); if (!mapM.has(key)) mapM.set(key, []); mapM.get(key).push(it); });
        Array.from(mapM.keys()).sort((a,b)=> a<b?1:-1).forEach(ym => {
          const arrM = mapM.get(ym);
          if (showDay) {
            const mapD = new Map();
            arrM.forEach(it => { const t = it.updatedAt || it.createdAt; const key = getYMD(t); if (!mapD.has(key)) mapD.set(key, []); mapD.get(key).push(it); });
            const mBox = document.createElement('div');
            mBox.className = 'agf-group';
            const mTitle = document.createElement('div');
            mTitle.className = 'agf-group-title';
            const mSpan = document.createElement('span');
            const parts = ym.split('-');
            mSpan.textContent = parts[0] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.yearSuffix') : '年') + parts[1] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.monthSuffix') : '月');
            const mBtn = document.createElement('button');
            mBtn.className = 'agf-records-close';
            mBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠';
            const mBody = document.createElement('div');
            mBody.className = 'agf-group-body';
            mBtn.addEventListener('click', () => { mBody.classList.toggle('collapsed'); mBtn.textContent = mBody.classList.contains('collapsed') ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠'); });
            mTitle.appendChild(mSpan);
            mTitle.appendChild(mBtn);
            mBox.appendChild(mTitle);
            mBox.appendChild(mBody);
            Array.from(mapD.keys()).sort((a,b)=> a<b?1:-1).forEach(ymd => {
              const dBox = document.createElement('div');
              dBox.className = 'agf-group';
              const dTitle = document.createElement('div');
              dTitle.className = 'agf-group-title';
              const dSpan = document.createElement('span');
              const ps = ymd.split('-');
              dSpan.textContent = ps[2] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.daySuffix') : '日');
              const dBtn = document.createElement('button');
              dBtn.className = 'agf-records-close';
              dBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠';
              const dBody = document.createElement('div');
              dBody.className = 'agf-group-body';
              dBtn.addEventListener('click', () => { dBody.classList.toggle('collapsed'); dBtn.textContent = dBody.classList.contains('collapsed') ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠'); });
              dTitle.appendChild(dSpan);
              dTitle.appendChild(dBtn);
              dBox.appendChild(dTitle);
              dBox.appendChild(dBody);
              mapD.get(ymd).forEach(it => dBody.appendChild(buildRecordItem(it)));
              mBody.appendChild(dBox);
            });
            recordsList.appendChild(mBox);
          } else {
            const mBox = document.createElement('div');
            mBox.className = 'agf-group';
            const mTitle = document.createElement('div');
            mTitle.className = 'agf-group-title';
            const mSpan = document.createElement('span');
            const parts = ym.split('-');
            mSpan.textContent = parts[0] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.yearSuffix') : '年') + parts[1] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.monthSuffix') : '月');
            const mBtn = document.createElement('button');
            mBtn.className = 'agf-records-close';
            mBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠';
            const mBody = document.createElement('div');
            mBody.className = 'agf-group-body';
            mBtn.addEventListener('click', () => { mBody.classList.toggle('collapsed'); mBtn.textContent = mBody.classList.contains('collapsed') ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠'); });
            mTitle.appendChild(mSpan);
            mTitle.appendChild(mBtn);
            mBox.appendChild(mTitle);
            mBox.appendChild(mBody);
            arrM.forEach(it => mBody.appendChild(buildRecordItem(it)));
            recordsList.appendChild(mBox);
          }
        });
        return;
      }
      if (showDay) {
        const mapD = new Map();
        filtered.forEach(it => { const t = it.updatedAt || it.createdAt; const key = getYMD(t); if (!mapD.has(key)) mapD.set(key, []); mapD.get(key).push(it); });
        Array.from(mapD.keys()).sort((a,b)=> a<b?1:-1).forEach(ymd => {
          const dBox = document.createElement('div');
          dBox.className = 'agf-group';
          const dTitle = document.createElement('div');
          dTitle.className = 'agf-group-title';
          const dSpan = document.createElement('span');
          const ps = ymd.split('-');
          dSpan.textContent = ps[0] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.yearSuffix') : '年') + ps[1] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.monthSuffix') : '月') + ps[2] + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.date.daySuffix') : '日');
          const dBtn = document.createElement('button');
          dBtn.className = 'agf-records-close';
          dBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠';
          const dBody = document.createElement('div');
          dBody.className = 'agf-group-body';
          dBtn.addEventListener('click', () => { dBody.classList.toggle('collapsed'); dBtn.textContent = dBody.classList.contains('collapsed') ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '折叠'); });
          dTitle.appendChild(dSpan);
          dTitle.appendChild(dBtn);
          dBox.appendChild(dTitle);
          dBox.appendChild(dBody);
          mapD.get(ymd).forEach(it => dBody.appendChild(buildRecordItem(it)));
          recordsList.appendChild(dBox);
        });
        return;
      }
    };
    const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const markdownToHtml = (md) => {
      let t = md;
      t = t.replace(/([。！？；;:])\s*[-*]\s+/g, (m, p1) => p1 + '\n- ');
      t = escapeHtml(t);
      t = t.replace(/```([\s\S]*?)```/g, (m, p1) => '<pre><code>' + p1.replace(/\n/g, '<br>') + '</code></pre>');
      const lines = t.split(/\r?\n/);
      let out = '';
      let inUl = false, inOl = false;
      const inline = (x) => x
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1<\/a>');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*#{1,6}\s+/.test(line)) {
          const level = (line.match(/^\s*(#{1,6})\s+/) || ['',''])[1].length;
          const content = line.replace(/^\s*#{1,6}\s+/, '');
          out += `<h${level}>` + inline(content) + `</h${level}>`;
        } else if (/^\s*---\s*$/.test(line)) {
          if (inUl) { out += '</ul>'; inUl = false; }
          if (inOl) { out += '</ol>'; inOl = false; }
          out += '<hr>';
        } else if (/^\s*[-*]\s+/.test(line)) {
          if (!inUl) { out += '<ul>'; inUl = true; }
          out += '<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>';
        } else if (/^\s*\d+\.\s+/.test(line)) {
          if (!inOl) { out += '<ol>'; inOl = true; }
          out += '<li>' + inline(line.replace(/^\s*\d+\.\s+/, '')) + '</li>';
        } else {
          if (inUl) { out += '</ul>'; inUl = false; }
          if (inOl) { out += '</ol>'; inOl = false; }
          if (line.trim().length) {
            out += inline(line) + '<br>';
          } else {
            out += '<br>';
          }
        }
      }
      if (inUl) out += '</ul>';
      if (inOl) out += '</ol>';
      return out;
    };

    let lastUserContentEl = null;
    const scheduleIncrementalHighlight = (root) => {
      if (!root || !this.pageProcessor || !highlightEnabled) return null;
      let canceled = false;
      const nodes = [];
      try {
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              try {
                return this.pageProcessor.shouldProcessNode(node)
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_REJECT;
              } catch (_) {
                return NodeFilter.FILTER_REJECT;
              }
            }
          }
        );
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
      } catch (_) {}
      let i = 0;
      const run = () => {
        if (canceled || !highlightEnabled) return;
        const end = Math.min(nodes.length, i + 80);
        for (; i < end; i++) { try { this.pageProcessor.processTextNode(nodes[i]); } catch (_) {} }
        if (i < nodes.length) { setTimeout(run, 16); }
      };
      setTimeout(run, 0);
      return { cancel: () => { canceled = true; } };
    };

    const rehighlightAllBubbles = () => {
      if (!highlightEnabled) return;
      try {
        const bubbles = overlay.querySelectorAll('.agf-msg .agf-qa-content');
        bubbles.forEach(el => {
          const i = Number(el.dataset.msgIndex || '-1');
          if (i >= 0) {
            const cached = chatMessages[i] && chatMessages[i].highlightHtml;
            if (cached) { el.innerHTML = cached; }
            else { scheduleIncrementalHighlight(el); setTimeout(() => { try { const html = el.innerHTML; if (html && html.indexOf('adhd-processed') >= 0) { chatMessages[i].highlightHtml = html; saveConversationSnapshot(); } } catch (_) {} }, 600); }
          } else { scheduleIncrementalHighlight(el); }
        });
      } catch (_) {}
    };
    const clearAllHighlights = () => {
      try {
        const wrappers = overlay.querySelectorAll('.agf-msg .agf-qa-content .adhd-processed');
        wrappers.forEach(element => {
          try {
            const originalText = element.getAttribute('data-original-text') || element.textContent;
            const textNode = document.createTextNode(originalText);
            element.parentNode.replaceChild(textNode, element);
          } catch (_) {}
        });
      } catch (_) {}
    };
    const cancelAllHighlightJobs = () => {};
    const renderPlainAllBubbles = () => {
      try {
        const els = overlay.querySelectorAll('.agf-msg .agf-qa-content');
        els.forEach(el => { const i = Number(el.dataset.msgIndex || '-1'); if (i >= 0) el.innerHTML = markdownToHtml(chatMessages[i].content || ''); });
      } catch (_) {}
    };

    const openTPanelThirdPart = () => {
      const tBtn = document.getElementById('agfTestTextBtn');
      if (tBtn) tBtn.click();
      setTimeout(() => {
        try {
          if (fulltextPanel) {
            fulltextPanel.style.display = 'block';
            const titles = fulltextPanel.querySelectorAll('.agf-fulltext-title');
            const target = isPdfPage() ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.pdfTitle') : 'pdf全文') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.webTitle') : '网页全文');
            for (let i=0;i<titles.length;i++) {
              const el = titles[i];
              const txt = String(el.textContent||'');
              if (txt.indexOf(target) >= 0) { el.scrollIntoView({ block: 'start' }); break; }
            }
          }
        } catch (_) {}
      }, 80);
    };

    highlightInitPhase = false;

    
    const appendMessage = (role, text, opts = {}) => {
      if (!chatList) return;
      const wrap = document.createElement('div');
      wrap.className = 'agf-msg ' + (role === 'user' ? 'user' : 'assistant');
      const bubble = document.createElement('div');
      bubble.className = 'agf-bubble' + (role === 'user' ? ' user' : '');
      if (role === 'user') qaCounter += 1;
      const label = role === 'user' ? ('Q' + qaCounter) : ('A' + (qaCounter || 1));
      const labelEl = document.createElement('span');
      labelEl.className = 'agf-qa-label';
      labelEl.textContent = label;
      let modelBadge = null;
      if (role !== 'user') {
        let pv = '';
        let mdl = '';
        try {
          if (typeof opts.msgIndex === 'number') {
            const m = chatMessages[opts.msgIndex] || {};
            pv = m.provider || (sessionProviderSelect && sessionProviderSelect.value) || '';
            mdl = m.model || (sessionModelSelect && sessionModelSelect.value) || '';
          }
        } catch (_) {}
        if (pv || mdl) {
          modelBadge = document.createElement('span');
          modelBadge.className = 'agf-model-badge';
          modelBadge.textContent = (pv ? pv : '') + '/' + (mdl ? mdl : '');
        }
      }
      const contentEl = document.createElement('span');
      contentEl.className = 'agf-qa-content';
      if (typeof opts.msgIndex === 'number') contentEl.dataset.msgIndex = String(opts.msgIndex);
      const copyBtn = document.createElement('button');
      copyBtn.className = 'agf-copy-btn';
      copyBtn.title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.copy') : '复制';
      copyBtn.textContent = '⧉';
      copyBtn.addEventListener('click', async () => {
        let s = '';
        try { s = contentEl.innerText || contentEl.textContent || ''; } catch(_) {}
        if (!s) try { s = bubble.innerText || ''; } catch(_) {}
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(s); }
          else {
            const ta = document.createElement('textarea');
            ta.value = s;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand('copy'); } catch(_){}
            document.body.removeChild(ta);
          }
          showToast((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.copied') : '已复制');
        } catch(_) { showToast((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.copied') : '已复制'); }
      });
      const bodyLabelDetect = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:';
      const idx = text.indexOf('\n' + bodyLabelDetect);
      if (idx >= 0) {
        const head = text.slice(0, idx);
        const body = text.slice(idx + 4).replace(/^\s*:\s*/,'');
        const headHtml = markdownToHtml(head);
        const headDiv = document.createElement('div');
        headDiv.innerHTML = headHtml;
        const preview = document.createElement('div');
        preview.className = 'agf-collapse-content';
        const p30 = (body || '').slice(0, 30);
        preview.innerHTML = markdownToHtml(p30 + (body.length > 30 ? '…' : ''));
        const goBtn = document.createElement('button');
        goBtn.className = 'agf-collapse-toggle agf-go-full';
        goBtn.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.goFull') : '去看全文';
        goBtn.addEventListener('click', () => { openTPanelThirdPart(); });
        contentEl.appendChild(headDiv);
        contentEl.appendChild(preview);
        contentEl.appendChild(goBtn);
      } else {
        const LONG = foldThresholdChars || 2000;
        if (text.length > LONG) {
          const head = text.slice(0, 800);
          const body = text.slice(800);
          const headHtml = markdownToHtml(head);
          const headDiv = document.createElement('div');
          headDiv.innerHTML = headHtml;
          const col = document.createElement('div');
          col.className = 'agf-collapse';
          const colContent = document.createElement('div');
          colContent.className = 'agf-collapse-content collapsed';
          const colToggle = document.createElement('button');
          colToggle.className = 'agf-collapse-toggle';
          colToggle.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开全文';
          colToggle.addEventListener('click', () => {
            if (colContent.classList.contains('collapsed')) {
              if (!colContent.innerHTML) { colContent.innerHTML = markdownToHtml(body); }
              colContent.classList.remove('collapsed'); colToggle.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.collapse') : '收起';
              if (highlightEnabled) scheduleIncrementalHighlight(colContent);
            } else { colContent.classList.add('collapsed'); colToggle.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.expand') : '展开全文'; }
          });
          col.appendChild(colContent);
          col.appendChild(colToggle);
          contentEl.appendChild(headDiv);
          contentEl.appendChild(col);
        } else {
          if (opts.highlightHtml && highlightEnabled && role !== 'user') { contentEl.innerHTML = opts.highlightHtml; }
          else { contentEl.innerHTML = markdownToHtml(text); }
          if (role === 'user') {
            const needGo = (typeof addedFullText === 'string' && addedFullText.trim().length > 0) || (text.indexOf('基于当前全文') >= 0);
            if (needGo) {
              const goBtn2 = document.createElement('button');
              goBtn2.className = 'agf-collapse-toggle agf-go-full';
              goBtn2.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.collapse.goFull') : '去看全文';
              goBtn2.addEventListener('click', () => { openTPanelThirdPart(); });
              contentEl.appendChild(goBtn2);
            }
          }
        }
      }
      bubble.appendChild(copyBtn);
      bubble.appendChild(labelEl);
      if (modelBadge) bubble.appendChild(modelBadge);
      bubble.appendChild(contentEl);
      wrap.appendChild(bubble);
      chatList.appendChild(wrap);
      if (autoScrollEnabled) chatList.scrollTop = chatList.scrollHeight;
      const highlightBubbleContent = (root) => { scheduleIncrementalHighlight(root); };
      if (role === 'user') { lastUserContentEl = contentEl; }
      const shouldHighlight = highlightEnabled && opts.highlight === true && role !== 'user' && !opts.highlightHtml;
      if (shouldHighlight) highlightBubbleContent(contentEl);
      if (shouldHighlight && typeof opts.msgIndex === 'number') { setTimeout(() => { try { const html = contentEl.innerHTML; if (html && html.indexOf('adhd-processed') >= 0) { chatMessages[opts.msgIndex].highlightHtml = html; saveConversationSnapshot(); } } catch (_) {} }, 600); }
      try { rebuildConvIndex(); } catch (_) {}
    };

    const startAssistantStream = () => {
      if (!chatList) return;
      const wrap = document.createElement('div');
      wrap.className = 'agf-msg assistant';
      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'agf-bubble';
      const label = 'A' + (qaCounter || 1);
      (function(){ const pv = sessionProviderSelect && sessionProviderSelect.value || ''; const mdl = sessionModelSelect && sessionModelSelect.value || ''; const pm = (pv || mdl) ? (pv + '/' + mdl) : ''; bubbleEl.innerHTML = '<button class="agf-copy-btn" title="' + ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.copy') : '复制') + '">⧉</button><span class="agf-qa-label">' + label + '</span>' + (pm ? ('<span class="agf-model-badge">' + pm + '</span>') : '') + '<span class="agf-qa-content"></span>'; })();
      wrap.appendChild(bubbleEl);
      chatList.appendChild(wrap);
      if (autoScrollEnabled) chatList.scrollTop = chatList.scrollHeight;
      streamingBubble = bubbleEl;
      streamingText = '';
      streamingContentEl = bubbleEl.querySelector('.agf-qa-content');
      const copyBtn2 = bubbleEl.querySelector('.agf-copy-btn');
      if (copyBtn2) copyBtn2.addEventListener('click', async () => {
        let s = '';
        try { s = streamingContentEl && (streamingContentEl.innerText || streamingContentEl.textContent) || ''; } catch(_) {}
        if (!s) try { s = bubbleEl.innerText || ''; } catch(_) {}
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(s); }
          else {
            const ta = document.createElement('textarea');
            ta.value = s;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand('copy'); } catch(_){}
            document.body.removeChild(ta);
          }
          showToast((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.copied') : '已复制');
        } catch(_) { showToast((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.copied') : '已复制'); }
      });
      if (highlightEnabled && lastUserContentEl) {
        scheduleIncrementalHighlight(lastUserContentEl);
        setTimeout(() => {
          try {
            const i = Number(lastUserContentEl.dataset.msgIndex || '-1');
            if (i >= 0) {
              const html = lastUserContentEl.innerHTML;
              if (html && html.indexOf('adhd-processed') >= 0) {
                chatMessages[i].highlightHtml = html;
                saveConversationSnapshot();
              }
            }
          } catch (_) {}
        }, 600);
      }
      try { rebuildConvIndex(); } catch (_) {}
    };

    const toOpenAIStyle = (arr) => (arr || chatMessages).map(m => ({ role: m.role, content: m.content }));
    const toAnthropicStyle = (arr) => (arr || chatMessages).map(m => ({ role: (m.role === 'assistant' ? 'assistant' : 'user'), content: Array.isArray(m.content) ? m.content.map(p => p.type === 'image_url' ? { type: 'image', source: { type: 'base64', media_type: String(p.image_url?.url || '').split(';')[0].replace('data:', ''), data: String(p.image_url?.url || '').split(',')[1] || '' } } : { type: 'text', text: String(p.text || '') }) : [{ type: 'text', text: m.content }] }));
    const toGeminiStyle = (arr) => (arr || chatMessages).map(m => ({ role: (m.role === 'assistant' ? 'model' : 'user'), parts: Array.isArray(m.content) ? m.content.map(p => p.type === 'image_url' ? { inline_data: { mime_type: String(p.image_url?.url || '').split(';')[0].replace('data:', ''), data: String(p.image_url?.url || '').split(',')[1] || '' } } : { text: String(p.text || '') }) : [{ text: m.content }] }));
    const buildCarryMessages = (x) => {
      const msgs = chatMessages.slice();
      const userIdxs = [];
      for (let i=0;i<msgs.length;i++) { if (msgs[i] && msgs[i].role === 'user') userIdxs.push(i); }
      if (!userIdxs.length) return [];
      const curIdx = userIdxs[userIdxs.length-1];
      const prevRounds = Math.max(0, userIdxs.length - 1);
      const useX = Math.max(0, Math.min(Number(x||0)||0, Math.min(prevRounds, 4)));
      if (useX <= 0) return [msgs[curIdx]];
      const prevUserIdxs = userIdxs.slice(userIdxs.length - 1 - useX, userIdxs.length - 1);
      const out = [];
      for (let j=0;j<prevUserIdxs.length;j++) {
        const start = prevUserIdxs[j];
        const end = (j+1<prevUserIdxs.length ? prevUserIdxs[j+1] : curIdx);
        for (let k=start;k<end;k++) out.push(msgs[k]);
      }
      out.push(msgs[curIdx]);
      return out;
    };

    const sendChat = async () => {
      if (!composerHidden || !sessionProviderSelect || !sessionModelSelect) return;
      const prov = sessionProviderSelect.value;
      const model = sessionModelSelect.value;
      currentReplyProvider = prov;
      currentReplyModel = model;
      let mediaPlan = { mode: 'none', context: null };
      try { mediaPlan = await prepareMediaForChat(prov, model, mediaModeSelect?.value || 'auto'); } catch (e) { showToast(e.message || '图片识别失败'); return; }
      activeChatImageContext = mediaPlan.mode === 'image_and_recognition' ? mediaPlan.context : null;
      if (activeChatImageContext) activeChatImageContext.metadata = { ...(activeChatImageContext.metadata || {}), visionRequestStartedAt: Date.now(), visionProvider: prov, visionModel: model };
      if (mediaStrategy && mediaPlan.context) mediaStrategy.textContent = mediaPlan.mode === 'image_and_recognition' ? '将发送原图+识别结果' : '将发送识别结果';
      if (mediaPlan.requestedMode === 'image_and_recognition' && mediaPlan.mode !== 'image_and_recognition') showToast('当前 Chat 模型不支持图片，已降级为仅发送识别结果。');
      let q = (composerHidden.value || '').trim();
      if (!q) {
        try {
          let raw = String(composerEditor && composerEditor.innerText || '').trim();
          let pre = (inputPrefix && inputPrefix.style.display !== 'none') ? String(inputPrefix.innerText || inputPrefix.textContent || '') : '';
          let aft = (inputAffix && inputAffix.style.display !== 'none') ? String(inputAffix.innerText || inputAffix.textContent || '') : '';
          if (pre) raw = raw.replace(pre, '').trim();
          if (aft) raw = raw.replace(aft, '').trim();
          q = raw;
        } catch (_) {}
      }
      let prefixTxt = '';
      if (inputPrefix && inputPrefix.style.display !== 'none') {
        try { prefixTxt = String(inputPrefix.innerText || inputPrefix.textContent || '').trim(); } catch (_) { prefixTxt = ''; }
      }
      const normPrefix = prefixTxt ? prefixTxt.replace(/\s*$/, ' ') : '';
      let prompt = q;
      let displayPrompt = q;
      if (addedFullText && addedFullText.trim().length > 0) {
        prompt = normPrefix + q + ',我和你的讨论是基于{' + addedFullText + '}';
        displayPrompt = normPrefix + q + (addedFullLinkPreview || '');
      }
      if (mediaPlan.mode === 'recognition_only' && mediaPlan.contexts?.length) {
        const recognized = mediaPlan.contexts.map((ctx, i) => ctx.recognition?.text ? `[图片 ${i + 1} 识别结果]\n${ctx.recognition.text}` : `[图片 ${i + 1} 识别失败]\n${ctx.metadata?.recognitionError || '无法获取识别结果'}`).join('\n\n');
        prompt = `${prompt}\n\n${recognized}`.trim();
        displayPrompt = `${displayPrompt}\n\n[图片识别结果已加入]`;
      }
      if (!prompt) return;
      if (!currentConversationId) { try { await newConversation(); } catch (_) {} }
      const bodyLabelDetect2 = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:';
      const isGeneratedPrompt = nextPromptIsGenerated || prompt.indexOf('\n' + bodyLabelDetect2) >= 0;
      const userIndex = chatMessages.length;
      chatMessages.push({ role: 'user', content: prompt });
      appendMessage('user', displayPrompt, { highlight: !isGeneratedPrompt, msgIndex: userIndex });
      currentMediaContext = null;
      renderMediaAttachment();
      if (visionOcrBtn) visionOcrBtn.disabled = true;
      if (mediaModeSelect) { mediaModeSelect.value = 'auto'; mediaModeSelect.disabled = true; }
      if (mediaStrategy) mediaStrategy.textContent = '';
      nextPromptIsGenerated = false;
      if (inputUser) inputUser.innerText = '';
      if (composerHidden) composerHidden.value = '';
      if (inputPrefix) { inputPrefix.style.display = 'none'; }
      if (inputAffix) { inputAffix.textContent = ''; inputAffix.style.display = 'none'; }
      if (composerEditor) {
        const keep = new Set(['agfInputPrefix','agfInputUser','agfInputAffix']);
        Array.from(composerEditor.childNodes).forEach(n => {
          if (n.nodeType === 3) { try { composerEditor.removeChild(n); } catch(_){} return; }
          if (n.nodeType === 1 && !keep.has(n.id)) { try { composerEditor.removeChild(n); } catch(_){} }
        });
      }
      try { updateHiddenFromEditor(); } catch (_) {}
      addedFullText = '';
      addedFullQuestion = '';
      addedFullDisplayPrefix = '';
      addedFullLinkPreview = '';
      addedFullActive = false;
      let key = '';
      let base = PROVIDERS_CONFIG[prov]?.baseUrl || '';
      let configuredFallbackProvider = '';
      try {
        const res = await new Promise(resolve => chrome.storage.local.get(['aiKeys','aiBaseUrls','aiFallbackProvider'], resolve));
        const keys = res.aiKeys || {};
        key = String(keys[prov] || '').trim();
        configuredFallbackProvider = res.aiFallbackProvider || '';
        if (res.aiBaseUrls && res.aiBaseUrls[prov]) base = res.aiBaseUrls[prov];
      } catch (_) {}
      if (!key || String(key).trim().length === 0) { showStickyToast('暂时没有apikey，请点击上方的 🔧 设置'); return; }
      let url = base;
      let headers = { 'Content-Type': 'application/json' };
      let body = null;
      let subset = chatMessages.slice();
      try {
        const x = carryInput ? Math.max(0, Math.min(4, parseInt(String(carryInput.value||'0'),10)||0)) : 0;
        subset = buildCarryMessages(x);
      } catch (_) {}
      if (mediaPlan.mode === 'image_and_recognition' && mediaPlan.context?.image?.dataUrl && subset.length) {
        const last = subset[subset.length - 1];
        if (last && last.role === 'user') last.content = [{ type: 'image_url', image_url: { url: mediaPlan.context.image.dataUrl } }, { type: 'text', text: String(last.content || '') + `\n\n[图片识别结果]\n${mediaPlan.context.recognition?.text || ''}` }];
      }
      if (prov === 'anthropic') {
        headers['x-api-key'] = key;
        headers['anthropic-version'] = '2023-06-01';
        body = JSON.stringify({ model, max_tokens: 1024, messages: toAnthropicStyle(subset) });
      } else if (prov === 'gemini') {
        url = base.replace('{model}', model) + '?key=' + encodeURIComponent(key);
        body = JSON.stringify({ contents: toGeminiStyle(subset) });
      } else if (prov === 'deepseek' || prov === 'moonshot' || prov === 'openai' || prov === 'openrouter' || prov === 'groq' || prov === 'siliconflow' || prov === 'qwen' || prov === 'chatglm' || prov === 'grok') {
        try {
          startAssistantStream();
          const fallback = configuredFallbackProvider !== prov ? configuredFallbackProvider : '';
          const fallbackModel = fallback && PROVIDERS_CONFIG[fallback] && PROVIDERS_CONFIG[fallback].models ? PROVIDERS_CONFIG[fallback].models[0] : '';
          chrome.runtime.sendMessage({ action: 'aiChatStream', provider: prov, model, fallbackProvider: fallback, fallbackModel, messages: toOpenAIStyle(subset) });
          return;
        } catch (_) {}
      } else {
        headers['Authorization'] = 'Bearer ' + key;
        body = JSON.stringify({ model, messages: toOpenAIStyle(subset) });
      }
      let text = '';
      try {
        const respMsg = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'aiChatRequest', url, method: 'POST', headers, body, timeout: 45000 }, resolve));
        const status = respMsg && typeof respMsg.status === 'number' ? respMsg.status : 0;
        const ok = !!(respMsg && respMsg.success && status >= 200 && status < 300);
        const data = respMsg && respMsg.data ? respMsg.data : null;
        if (!ok) {
          let msg = '请求失败';
          if (status === 401 || status === 403) msg = 'API Key 无效或不可用';
          else if (status === 429) msg = '已超出频率限制，请稍后再试';
          else if (status >= 500 && status < 600) msg = '服务端异常，请稍后再试';
          else if (!respMsg || !respMsg.success) msg = '网络错误或超时';
          let extra = '';
          try {
            if (data && typeof data === 'object') {
              const e1 = data.error && (data.error.message || data.error);
              if (e1) extra = String(e1);
            } else if (typeof data === 'string') {
              extra = data;
            }
          } catch(_){}
          if (extra) msg = msg + '：' + String(extra).slice(0, 200);
          showStickyToast(msg);
          const aIndex = chatMessages.length;
          chatMessages.push({ role: 'assistant', content: msg, provider: currentReplyProvider, model: currentReplyModel });
          appendMessage('assistant', msg, { highlight: true, msgIndex: aIndex });
          try { await saveConversationSnapshot(); } catch (_) {}
          return;
        }
        if (prov === 'anthropic') {
          const c = data && data.content && data.content[0] && (data.content[0].text || (data.content[0].type === 'text' ? data.content[0].text : ''));
          text = c || '';
        } else if (prov === 'gemini') {
          const cand = data && data.candidates && data.candidates[0];
          const parts = cand && cand.content && cand.content.parts || [];
          text = parts.map(p => p.text || '').join('');
        } else {
          const ch = data && data.choices && data.choices[0];
          text = (ch && ch.message && ch.message.content) || '';
        }
      } catch (_) {
        text = '';
      }
      if (!text) text = '...';
      const aIndex = chatMessages.length;
      chatMessages.push({ role: 'assistant', content: text, provider: currentReplyProvider, model: currentReplyModel });
      appendMessage('assistant', text, { highlight: true, msgIndex: aIndex });
      if (activeChatImageContext) { try { await saveVisionChatHistory(activeChatImageContext, text, currentReplyProvider, currentReplyModel); } catch (_) {} activeChatImageContext = null; }
      try { await saveConversationSnapshot(); } catch (_) {}
    };

    const getStoredSegmentsForPage = async () => {
      const db = await this.segmentsDbOpen();
      const pageUrl = window.location.href;
      let canonicalUrl = pageUrl;
      try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) { canonicalUrl = link.href; } } catch (_) {}
      const candidates = new Set([pageUrl, canonicalUrl]);
      try {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        for (const fr of iframes) {
          try {
            const src = fr.getAttribute('src') || '';
            if (src) { const u = new URL(src, pageUrl); candidates.add(u.href); }
            const href = fr.contentWindow && fr.contentWindow.location ? fr.contentWindow.location.href : '';
            if (href) candidates.add(href);
          } catch (_) {}
        }
      } catch (_) {}
      return new Promise((resolve) => {
        const tx = db.transaction('page_segments','readonly');
        const st = tx.objectStore('page_segments');
        const req = st.openCursor();
        const arr = [];
        req.onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (cursor) {
            const val = cursor.value;
            let ok = false;
            if (val) {
              if (candidates.has(val.pageUrl) || candidates.has(val.canonicalUrl)) ok = true;
            }
            if (ok) arr.push(val);
            cursor.continue();
          } else { resolve(arr); }
        };
        req.onerror = () => resolve(arr);
      });
    };

    const getLatestStoredSegmentsForPage = async () => {
      const all = await getStoredSegmentsForPage();
      if (!all || all.length === 0) return [];
      const runTs = {};
      all.forEach(r => { const rid = r.runId || 'none'; const ts = r.timestamp || 0; runTs[rid] = Math.max(runTs[rid] || 0, ts); });
      const latestRunId = Object.entries(runTs).sort((a, b) => b[1] - a[1])[0][0];
      const latest = all.filter(r => r.runId === latestRunId);
      const seen = new Set();
      const out = [];
      latest.forEach(r => { const h = r.textHash || ''; if (h && seen.has(h)) return; if (h) seen.add(h); out.push(r); });
      out.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      return out;
    };

    const updateStorageStatusUI = async () => {
      const segs = await getLatestStoredSegmentsForPage();
      if (statusDot) {
        if (segs.length > 0) { statusDot.style.background = '#27ae60'; statusDot.title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.statusHintOk') : '绿色: 已获取该页面文本'; if (statusText) { statusText.textContent = ''; statusText.style.display = 'none'; } }
        else { statusDot.style.background = '#bbb'; statusDot.title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.statusHintNone') : '灰色: 未获取该页面文本'; if (statusText) { statusText.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.statusFailed') : '处理失败，请刷新以重新处理'; statusText.style.display = 'inline'; } }
      }
      const has = segs.length > 0;
      if (refreshBtn) { refreshBtn.classList.toggle('breathing', !has); refreshBtn.style.display = has ? 'none' : 'inline-flex'; }
      if (refreshHint) refreshHint.style.display = has ? 'none' : 'block';
      if (composerSend) {
        composerSend.dataset.mode = 'send';
        composerSend.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.send') : '发送';
      }
      if (quickSummaryBtn) { quickSummaryBtn.disabled = !has; }
      if (beginnerExplainBtn) { beginnerExplainBtn.disabled = !has; }
      if (btnTranslate) btnTranslate.disabled = !has;
      if (btnSelectionExplain) btnSelectionExplain.disabled = !has;
      if (btnStructured) btnStructured.disabled = !has;
      if (btnExplain) btnExplain.disabled = !has;
      if (btnOutline) btnOutline.disabled = !has;
      if (btnKeywords) btnKeywords.disabled = !has;
      if (visionOcrBtn) visionOcrBtn.disabled = !(currentMediaContext && currentMediaContext.source === 'image');
      if (speakBtn) speakBtn.disabled = !has && !getSelectedTextSafe();
      if (addFullBtn) addFullBtn.disabled = !has;
      return segs;
    };

    const setStatusProcessing = () => {
      if (statusDot) { statusDot.style.background = '#f39c12'; statusDot.title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.statusHintProcessing') : '处理中: 正在获取该页面文本'; }
      const statusTextEl = document.getElementById('agfStatusText');
      if (statusTextEl) { statusTextEl.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.processingText') : '正在处理文本'; statusTextEl.style.display = 'inline'; }
      if (refreshBtn) { refreshBtn.classList.remove('breathing'); refreshBtn.style.display = 'none'; }
      if (refreshHint) refreshHint.style.display = 'none';
      if (quickSummaryBtn) quickSummaryBtn.disabled = true;
      if (beginnerExplainBtn) beginnerExplainBtn.disabled = true;
      if (btnTranslate) btnTranslate.disabled = true;
      if (btnSelectionExplain) btnSelectionExplain.disabled = true;
      if (btnStructured) btnStructured.disabled = true;
      if (btnExplain) btnExplain.disabled = true;
      if (btnOutline) btnOutline.disabled = true;
      if (btnKeywords) btnKeywords.disabled = true;
    };

    const sessionGet = async (key) => { try { const o = await chrome.storage.session.get([key]); return o && o[key]; } catch (_) { return undefined; } };
    const sessionSet = async (key, val) => { try { await chrome.storage.session.set({ [key]: val }); } catch (_) {} };

    const ensureAutoCollect = async () => {
      const u = getCanonicalUrl();
      const key = 'agfCollect:' + u.canonicalUrl;
      let segs = [];
      try { segs = await getLatestStoredSegmentsForPage(); } catch (_) { segs = []; }
      if (segs.length > 0) { await updateStorageStatusUI(); return; }
      const trig = await sessionGet(key);
      if (trig) { await updateStorageStatusUI(); return; }
      setStatusProcessing();
      await sessionSet(key, Date.now());
      if (isPdfPage()) {
        try { await new Promise(s => chrome.runtime.sendMessage({ action: 'collectPdfFromUrl', url: u.pageUrl }, s)); } catch (_) {}
        let ok = false;
        for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 500)); const xs = await getLatestStoredSegmentsForPage(); if (xs.length > 0) { ok = true; break; } }
        if (!ok) {
          try { await new Promise(s => chrome.runtime.sendMessage({ action: 'collectPdfFromUrl', url: u.pageUrl }, s)); } catch (_) {}
          for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 500)); const xs = await getLatestStoredSegmentsForPage(); if (xs.length > 0) { ok = true; break; } }
        }
        await updateStorageStatusUI();
      } else {
        try { await this.collectDynamicSegments(3000); } catch (_) {}
        await updateStorageStatusUI();
      }
    };

    const buildSummaryPrompt = (segs) => {
      const uiTokens = getUiTokens();
      const filterUiText = (s) => {
        const arr = String(s||'').split('\n');
        const out = [];
        for (let i=0;i<arr.length;i++) { const line = arr[i].trim(); if (!uiTokens.has(line) && !this.isNavigationText(line)) out.push(arr[i]); }
        return out.join('\n');
      };
      const pageUrl = window.location.href;
      let canonicalUrl = pageUrl;
      try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) { canonicalUrl = link.href; } } catch (_) {}
      const lines = [];
      lines.push(((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.summaryTitle') : '帮我总结这篇文章: ') + canonicalUrl);
      lines.push('存储的详情: ' + segs.length + ' 段');
      const tops = segs.slice(0, 5);
      tops.forEach((r, i) => {
        const pv = (r.blocks && r.blocks.length ? filterUiText(r.blocks.map(b => String(b.text||'')).join('\n')).slice(0, 300) : '');
        lines.push('章节' + (i+1) + ': ' + (r.sectionTitle || '') + ' 预览: ' + pv);
      });
      const MAX_CHARS = 12000;
      let remain = MAX_CHARS;
      const bodyTexts = [];
      const globalSeen = new Set();
      for (let i = 0; i < segs.length; i++) {
        const r = segs[i];
        let t = (r.blocks && r.blocks.length ? filterUiText(r.blocks.map(b => String(b.text||'')).join('\n')) : '');
        if (!t) continue;
        const k = t.length + ':' + t.slice(0, 300);
        if (globalSeen.has(k)) continue;
        globalSeen.add(k);
        if (t.length > remain) t = this.smartTruncate(t, Math.max(0, remain));
        if (t.length > 0) { bodyTexts.push(t); remain -= t.length; }
        if (remain <= 0) break;
      }
      if (bodyTexts.length) {
        lines.push((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:');
        lines.push(this.smartTruncate(bodyTexts.join('\n\n'), MAX_CHARS));
      }
      return lines.join('\n');
    };

    const buildStructuredSummaryPrompt = (segs) => {
      const uiTokens = getUiTokens();
      const filterUiText = (s) => { const arr = String(s||'').split('\n'); const out = []; for (let i=0;i<arr.length;i++) { const line = arr[i].trim(); if (!uiTokens.has(line) && !this.isNavigationText(line)) out.push(arr[i]); } return out.join('\n'); };
      const pageUrl = window.location.href;
      let canonicalUrl = pageUrl;
      try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) { canonicalUrl = link.href; } } catch (_) {}
      const lines = [];
      lines.push((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.structuredTitle') : '请基于以下正文生成结构化摘要，要求分章节要点与 TL;DR。');
      lines.push(((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: ') + canonicalUrl);
      const MAX_CHARS = 12000;
      let remain = MAX_CHARS;
      const bodyTexts = [];
      const globalSeen = new Set();
      for (let i = 0; i < segs.length; i++) {
        const r = segs[i];
        const h = r.sectionTitle || '';
        let t = (r.blocks && r.blocks.length ? filterUiText(r.blocks.map(b => String(b.text||'')).join('\n')) : '');
        if (!t) continue;
        const k = t.length + ':' + t.slice(0, 300);
        if (globalSeen.has(k)) continue;
        globalSeen.add(k);
        if (t.length > remain) t = this.smartTruncate(t, Math.max(0, remain));
        if (t.length > 0) { bodyTexts.push((h ? ('['+h+']\n') : '') + t); remain -= t.length; }
        if (remain <= 0) break;
      }
      lines.push(this.smartTruncate(bodyTexts.join('\n\n'), MAX_CHARS));
      const out1 = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.structuredOutput') : '输出: 以清晰的分级标题呈现，每章 2-4 个要点，最后附 TL;DR。';
      const langHint = (window.i18n && window.i18n.t) ? window.i18n.t(((function(){ try{ const s=String(window.i18n.t('aiPanel.summary')||''); return /^[A-Za-z]/.test(s)?'aiPanel.prompts.outputEnglish':'aiPanel.prompts.outputChinese'; }catch(_){ return 'aiPanel.prompts.outputChinese'; }})())) : '请用中文输出。';
      lines.push(out1);
      lines.push(langHint);
      return lines.join('\n');
    };

    const buildExplainPrompt = (segs) => {
      const uiTokens = getUiTokens();
      const filterUiText = (s) => { const arr = String(s||'').split('\n'); const out = []; for (let i=0;i<arr.length;i++) { const line = arr[i].trim(); if (!uiTokens.has(line) && !this.isNavigationText(line)) out.push(arr[i]); } return out.join('\n'); };
      const pageUrl = window.location.href;
      let canonicalUrl = pageUrl;
      try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) { canonicalUrl = link.href; } } catch (_) {}
      const lines = [];
      lines.push((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.explainTitle') : '请用更简单的语言解释以下内容，面向非技术读者。');
      lines.push(((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: ') + canonicalUrl);
      const MAX_CHARS = 9000;
      let remain = MAX_CHARS;
      const bodyTexts = [];
      const globalSeen = new Set();
      for (let i = 0; i < segs.length; i++) {
        const r = segs[i];
        let t = (r.blocks && r.blocks.length ? filterUiText(r.blocks.map(b => String(b.text||'')).join('\n')) : '');
        if (!t) continue;
        const k = t.length + ':' + t.slice(0, 300);
        if (globalSeen.has(k)) continue;
        globalSeen.add(k);
        if (t.length > remain) t = this.smartTruncate(t, Math.max(0, remain));
        if (t.length > 0) { bodyTexts.push(t); remain -= t.length; }
        if (remain <= 0) break;
      }
      lines.push(this.smartTruncate(bodyTexts.join('\n\n'), MAX_CHARS));
      const out2 = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.explainOutput') : '输出: 用通俗语言分点说明，避免术语堆砌。';
      const langHint = (window.i18n && window.i18n.t) ? window.i18n.t(((function(){ try{ const s=String(window.i18n.t('aiPanel.summary')||''); return /^[A-Za-z]/.test(s)?'aiPanel.prompts.outputEnglish':'aiPanel.prompts.outputChinese'; }catch(_){ return 'aiPanel.prompts.outputChinese'; }})())) : '请用中文输出。';
      lines.push(out2);
      lines.push(langHint);
      return lines.join('\n');
    };

    const buildOutlinePrompt = (segs) => {
      const uiTokens = getUiTokens();
      const filterUiText = (s) => { const arr = String(s||'').split('\n'); const out = []; for (let i=0;i<arr.length;i++) { const line = arr[i].trim(); if (!uiTokens.has(line) && !this.isNavigationText(line)) out.push(arr[i]); } return out.join('\n'); };
      const pageUrl = window.location.href;
      let canonicalUrl = pageUrl;
      try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) { canonicalUrl = link.href; } } catch (_) {}
      const lines = [];
      lines.push((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.outlineTitle') : '请提取全文大纲，保留层级结构与章节标题。');
      lines.push(((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: ') + canonicalUrl);
      const MAX_CHARS = 9000;
      let remain = MAX_CHARS;
      const bodyTexts = [];
      const globalSeen = new Set();
      for (let i = 0; i < segs.length; i++) {
        const r = segs[i];
        const h = r.sectionTitle || '';
        let t = (r.blocks && r.blocks.length ? filterUiText(r.blocks.map(b => String(b.text||'')).join('\n')) : '');
        if (!t) continue;
        const k = t.length + ':' + t.slice(0, 300);
        if (globalSeen.has(k)) continue;
        globalSeen.add(k);
        if (t.length > remain) t = this.smartTruncate(t, Math.max(0, remain));
        if (t.length > 0) { bodyTexts.push((h ? ('['+h+']\n') : '') + t); remain -= t.length; }
        if (remain <= 0) break;
      }
      lines.push(this.smartTruncate(bodyTexts.join('\n\n'), MAX_CHARS));
      const out3 = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.outlineOutput') : '输出: 仅给出大纲，形如 H1/H2/H3 分层，必要处附一句描述。';
      const langHint = (window.i18n && window.i18n.t) ? window.i18n.t(((function(){ try{ const s=String(window.i18n.t('aiPanel.summary')||''); return /^[A-Za-z]/.test(s)?'aiPanel.prompts.outputEnglish':'aiPanel.prompts.outputChinese'; }catch(_){ return 'aiPanel.prompts.outputChinese'; }})())) : '请用中文输出。';
      lines.push(out3);
      lines.push(langHint);
      return lines.join('\n');
    };

    const buildKeywordsPrompt = (segs) => {
      const uiTokens = getUiTokens();
      const filterUiText = (s) => { const arr = String(s||'').split('\n'); const out = []; for (let i=0;i<arr.length;i++) { const line = arr[i].trim(); if (!uiTokens.has(line) && !this.isNavigationText(line)) out.push(arr[i]); } return out.join('\n'); };
      const pageUrl = window.location.href;
      let canonicalUrl = pageUrl;
      try { const link = document.querySelector('link[rel="canonical"]'); if (link && link.href) { canonicalUrl = link.href; } } catch (_) {}
      const lines = [];
      lines.push((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.keywordsTitle') : '请提取 Top-N 关键词与术语，并按类别分组。');
      lines.push(((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: ') + canonicalUrl);
      const MAX_CHARS = 8000;
      let remain = MAX_CHARS;
      const bodyTexts = [];
      const globalSeen = new Set();
      for (let i = 0; i < segs.length; i++) {
        const r = segs[i];
        let t = (r.blocks && r.blocks.length ? filterUiText(r.blocks.map(b => String(b.text||'')).join('\n')) : '');
        if (!t) continue;
        const k = t.length + ':' + t.slice(0, 300);
        if (globalSeen.has(k)) continue;
        globalSeen.add(k);
        if (t.length > remain) t = this.smartTruncate(t, Math.max(0, remain));
        if (t.length > 0) { bodyTexts.push(t); remain -= t.length; }
        if (remain <= 0) break;
      }
      lines.push(this.smartTruncate(bodyTexts.join('\n\n'), MAX_CHARS));
      const out4 = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.keywordsOutput') : '输出: 关键词/术语/缩写三类，各 10-20 个，附一句说明。';
      const langHint = (window.i18n && window.i18n.t) ? window.i18n.t(((function(){ try{ const s=String(window.i18n.t('aiPanel.summary')||''); return /^[A-Za-z]/.test(s)?'aiPanel.prompts.outputEnglish':'aiPanel.prompts.outputChinese'; }catch(_){ return 'aiPanel.prompts.outputChinese'; }})())) : '请用中文输出。';
      lines.push(out4);
      lines.push(langHint);
      return lines.join('\n');
    };

    const buildTStructuredText = async () => {
      const u = getCanonicalUrl();
      const resp = await new Promise(r => chrome.runtime.sendMessage({ action: 'agfTestGetTextForPage', pageUrl: u.pageUrl, canonicalUrl: u.canonicalUrl }, r));
      const rawText = (resp && resp.text) ? String(resp.text) : '';
      const testNormalized = this.normalizeText(rawText || '');
      const uiTokens = getUiTokens();
      const makeKey = (s) => { const t = this.normalizeText(String(s||'')); return t.length + ':' + t.slice(0,300); };
      const paras = testNormalized.split('\n').map(x=>x.trim()).filter(x=>x.length>0);
      const paraKeys = new Set();
      const filteredParas = [];
      for (let i=0;i<paras.length;i++) {
        const p = paras[i];
        if (p.length < 2) continue;
        if (uiTokens.has(p)) continue;
        if (this.isCssOrAdText(p)) continue;
        const k = makeKey(p);
        if (paraKeys.has(k)) continue;
        paraKeys.add(k);
        filteredParas.push(p);
      }
      const structSecs = this.collectPageSections();
      const hint = [];
      for (let i=0;i<structSecs.length;i++) {
        const hp = String(structSecs[i].headingPath||'');
        const m = hp.match(/^h([1-6]):/);
        if (m) { const lvl = parseInt(m[1],10); const tn = this.normalizeText(String(structSecs[i].sectionTitle||'')).toLowerCase(); if (tn) hint.push({ title: tn, level: Math.max(1, Math.min(6, lvl)) }); }
      }
      const titleNorm = (s)=>this.normalizeText(String(s||'')).toLowerCase();
      const ngrams = (s)=>{ const t=titleNorm(s); const L=Math.min(120, t.length); const out=new Set(); for(let i=0;i<Math.max(0,L-2);i++){ out.add(t.slice(i,i+3)); } return out; };
      const jac = (a,b)=>{ const A=ngrams(a), B=ngrams(b); if (A.size===0 || B.size===0) return 0; let inter=0; A.forEach(x=>{ if (B.has(x)) inter++; }); return inter/(A.size+B.size-inter); };
      const detectLevel = (p)=>{ const tp = titleNorm(p); let best = 0; let bl = 0; for (let i=0;i<hint.length;i++) { const ht = hint[i].title; if (tp === ht) { return hint[i].level; } const short = Math.max(tp.length, ht.length) <= 40; const contain = tp && ht && (tp.includes(ht) || ht.includes(tp)); if (short && contain) { const r = Math.min(tp.length, ht.length)/Math.max(tp.length, ht.length); if (r >= 0.6) { if (1 > best) { best = 1; bl = hint[i].level; } continue; } } const s = jac(tp, ht); if (s > best && s >= 0.12) { best = s; bl = hint[i].level; } } return bl || 0; };
      const anchors = Array.from(document.querySelectorAll('a'));
      const anchorList = [];
      const seenAnchor = new Set();
      for (let i=0;i<anchors.length;i++) {
        const a = anchors[i];
        const txt = this.normalizeText(String(a.innerText||a.textContent||'')).trim();
        let href = String(a.getAttribute('href')||a.href||'').trim();
        if (!txt || txt.length < 2) continue;
        if (!href) continue;
        try { href = new URL(href, window.location.href).href; } catch (_) { continue; }
        const key = txt.toLowerCase()+"|"+href;
        if (seenAnchor.has(key)) continue;
        seenAnchor.add(key);
        anchorList.push({ text: txt, href });
      }
      const linkify = (s)=>{ let out = String(s||''); const list = anchorList.filter(x=>x.text.length>=2 && x.text.length<=60); list.sort((a,b)=>b.text.length - a.text.length); let rep = 0; for (let i=0;i<list.length && rep<3;i++) { const t = list[i].text; const h = list[i].href; const idx = out.indexOf(t); if (idx < 0) continue; const before = idx>0 ? out[idx-1] : ' '; const afterIdx = idx + t.length; const after = afterIdx < out.length ? out[afterIdx] : ' '; const wb = /[\w\u4e00-\u9fa5]/; const ok = !wb.test(before) && !wb.test(after); if (!ok) continue; out = out.slice(0, idx) + '['+t+']('+h+')' + out.slice(afterIdx); rep++; } return out; };
      let aligned = '';
      let prevKey = '';
      for (let i=0;i<filteredParas.length;i++) {
        const p = filteredParas[i];
        const k = makeKey(p);
        if (k === prevKey) continue;
        prevKey = k;
        const lvl = detectLevel(p);
        const px = linkify(p);
        if (lvl > 0) { aligned += Array(lvl).fill('#').join('') + ' ' + px + '\n\n'; }
        else { aligned += px + '\n\n'; }
      }
      return aligned;
    };

    this.__onAiStreamDelta = (delta) => {
      if (typeof delta !== 'string' || !delta) return;
      streamingText += delta;
      if (streamingBubble) {
        const html = markdownToHtml(streamingText);
        if (streamingContentEl) streamingContentEl.innerHTML = html; else streamingBubble.innerHTML = html;
        this.__streamHighlightTimer = null;
        if (chatList && autoScrollEnabled) chatList.scrollTop = chatList.scrollHeight;
      }
    };
    this.__onAiStreamDone = () => {
      if (streamingText) {
        const idx = chatMessages.length;
        chatMessages.push({ role: 'assistant', content: streamingText, provider: currentReplyProvider, model: currentReplyModel });
        if (streamingContentEl) streamingContentEl.dataset.msgIndex = String(idx);
        (async ()=>{ try { await saveConversationSnapshot(); } catch(_){} })();
        if (activeChatImageContext) { const ctx = activeChatImageContext; const text = streamingText; const provider = currentReplyProvider; const model = currentReplyModel; (async ()=>{ try { await saveVisionChatHistory(ctx, text, provider, model); } catch (_) {} })(); activeChatImageContext = null; }
      }
      streamingText = '';
      streamingBubble = null;
      try {
        const target = streamingContentEl;
        if (target && highlightEnabled) {
          scheduleIncrementalHighlight(target);
          setTimeout(() => { try { const i = Number(target.dataset.msgIndex || '-1'); if (i >= 0) { const html = target.innerHTML; if (html && html.indexOf('adhd-processed') >= 0) { chatMessages[i].highlightHtml = html; saveConversationSnapshot(); } } } catch (_) {} }, 800);
        }
      } catch (_) {}
    };

    const getTaixueLangHint = () => (window.i18n && window.i18n.t) ? window.i18n.t(((function(){ try{ const s=String(window.i18n.t('aiPanel.summary')||''); return /^[A-Za-z]/.test(s)?'aiPanel.prompts.outputEnglish':'aiPanel.prompts.outputChinese'; }catch(_){ return 'aiPanel.prompts.outputChinese'; }})())) : '请用中文输出。';
    let explainContext = null;
    let vocabCards = [];
    let vocabIndex = 0;
    const explainHistoryKey = 'agfTaixueExplainHistory';
    const getExplainHistory = () => new Promise(resolve => chrome.storage.local.get([explainHistoryKey], r => resolve(Array.isArray(r[explainHistoryKey]) ? r[explainHistoryKey] : [])));
    const renderExplainHistory = async () => { const rows = await getExplainHistory(); if (!explainHistory) return; explainHistory.innerHTML = `<strong>解释历史</strong>` + (rows.length ? rows.slice(0,20).map((r,i) => `<div class="agf-history-row"><span>${String(r.text).slice(0,45)} · ${new Date(r.createdAt).toLocaleString()}</span><button data-explain-index="${i}">查看</button></div>`).join('') : '<p>暂无解释记录。</p>'); explainHistory.querySelectorAll('[data-explain-index]').forEach(btn => btn.onclick = () => { const r = rows[Number(btn.dataset.explainIndex)]; explainContext = r.context; explainSource.textContent = `${r.text.length} 字 · ${r.context.pageTitle || '当前页面'}`; explainResult.innerHTML = typeof markdownToHtml === 'function' ? markdownToHtml(r.output) : String(r.output).replace(/\n/g,'<br>'); explainToChat.disabled = false; explainRetry.disabled = false; }); };
    const renderVocabHistory = async () => { const rows = await loadVocab(); if (!vocabHistory) return; const grouped = rows.slice(0,30); vocabHistory.innerHTML = `<strong>词汇掌握记录</strong>` + (grouped.length ? grouped.map(r => `<div class="agf-history-row"><span>${String(r.word)} · 掌握度 ${Number(r.mastery || 0)}% · ${Number(r.reviewCount || 0)} 次</span></div>`).join('') : '<p>暂无复习记录。</p>'); };
    const explainSelection = async () => {
      const ctx = await taixueContext.resolve('selection');
      if (!ctx.text) throw new Error('请先在网页中选中一段文本。');
      explainContext = ctx; setView('explain');
      explainSource.textContent = `${ctx.text.length} 字 · ${ctx.pageTitle || '当前页面'}`;
      explainResult.innerHTML = '<p>正在生成解释…</p>'; explainToChat.disabled = true; explainRetry.disabled = true;
      const output = await taixueTask.requestJsonText({ prompt: `请解释下面选中文本。输出简洁但完整，包含：1.通俗释义 2.上下文作用 3.关键术语 4.必要时给出改写或例句。请用中文。\n\n选中文本：\n${ctx.text}`, maxTokens: 1800, temperature: .35 });
      const explainRows = await getExplainHistory(); explainRows.unshift({ id: `explain-${Date.now()}`, text: ctx.text, output, context: ctx, createdAt: Date.now() }); await new Promise(resolve => chrome.storage.local.set({ [explainHistoryKey]: explainRows.slice(0, 30) }, resolve));
      explainResult.innerHTML = typeof markdownToHtml === 'function' ? markdownToHtml(output) : String(output).replace(/\n/g, '<br>');
      explainToChat.disabled = false; explainRetry.disabled = false;
      renderExplainHistory();
    };
    const vocabKey = 'agfTaixueVocabularyReview';
    const loadVocab = () => new Promise(resolve => chrome.storage.local.get([vocabKey], r => resolve(Array.isArray(r[vocabKey]) ? r[vocabKey] : [])));
    const saveVocab = records => new Promise(resolve => chrome.storage.local.set({ [vocabKey]: records.slice(0, 200) }, resolve));
    const renderVocabCard = () => {
      const card = vocabCards[vocabIndex]; if (!card) { vocabResult.innerHTML = '<p>本轮复习完成。</p>'; return; }
      const mastery = Number(card.mastery || 0); vocabStats.textContent = `基础掌握度 ${mastery}% · ${vocabIndex + 1}/${vocabCards.length}`;
      vocabResult.innerHTML = `<div class="agf-vocab-card"><strong>${String(card.word)}</strong><p>${String(card.meaning || '请回忆这个词的含义')}</p><p><em>${String(card.example || '')}</em></p><button id="agfVocabRemember">我记住了</button><button id="agfVocabForget">还不熟</button></div>`;
      const answer = async remembered => { card.reviewCount = Number(card.reviewCount || 0) + 1; card.lastReviewedAt = Date.now(); card.mastery = Math.max(0, Math.min(100, mastery + (remembered ? 20 : -10))); const all = await loadVocab(); const i = all.findIndex(x => x.word === card.word && x.pageUrl === card.pageUrl); if (i >= 0) all[i] = card; else all.unshift(card); await saveVocab(all); vocabIndex++; renderVocabCard(); };
      document.getElementById('agfVocabRemember').onclick = () => answer(true); document.getElementById('agfVocabForget').onclick = () => answer(false);
    };
    const startVocabReview = async () => {
      setView('vocab'); vocabResult.innerHTML = '<p>正在生成复习卡…</p>';
      const ctx = await taixueContext.resolve('full_article');
      const output = await taixueTask.requestJsonText({ prompt: `从材料中挑选最多8个适合学习的核心词汇，返回严格JSON数组，每项包含 word,meaning,example。不要Markdown。\n\n材料：\n${limitTaixueText(ctx.text, 30000).text}`, maxTokens: 1400, temperature: .25 });
      const parsed = parseJsonPayload(output); const old = await loadVocab();
      vocabCards = (Array.isArray(parsed) ? parsed : []).filter(x => x && String(x.word).trim()).slice(0, 8).map(x => { const prior = old.find(y => y.word === x.word); return { ...x, word: String(x.word).trim(), mastery: prior ? Number(prior.mastery || 0) : 0, reviewCount: prior ? Number(prior.reviewCount || 0) : 0, pageUrl: ctx.canonicalUrl }; });
      vocabIndex = 0; if (!vocabCards.length) throw new Error('没有生成有效词汇，请重试。'); renderVocabCard(); renderVocabHistory();
    };
    const runArticleChatTask = async ({ title, prefix, extra = '', includeLangHint = false, contextSource = taixueState.contextSource }) => {
      hideFulltextPanel();
      await updateStorageStatusUI();
      const ctx = await taixueContext.resolve(contextSource);
      const discoveredImages = await discoverAndConfirmPageImages(contextSource === 'selection' ? 'selection' : 'full_article');
      if (discoveredImages.length) addMediaContextsToWorkspace(discoveredImages, { reset: true, statusText: `已发现 ${discoveredImages.length} 张图片，可在图像工作区勾选识别` });
      const limitedContext = limitTaixueText(ctx.text, 50000);
      const raw = String(limitedContext.text || '');
      if (limitedContext.truncated || raw.length > TAIXUE_CONTEXT_MAX_WARN_CHARS) {
        showToast(limitedContext.truncated ? '文章较长，已按预算保留开头和结尾发送。' : '目前还在升级AI功能，超出12000字数的文本不建议发送，可能会超出ai最大长度。');
      }
      const pageLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: ';
      const bodyLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:';
      const parts = [title, pageLabel + ctx.canonicalUrl];
      if (limitedContext.truncated) parts.push(`预算提示：原文约 ${limitedContext.originalLength} 字，本次发送已截取。`);
      parts.push(bodyLabel, raw);
      if (extra) parts.push(extra);
      if (includeLangHint) parts.push(getTaixueLangHint());
      const prompt = parts.join('\n');
      if (inputUser) { inputUser.innerText = prompt; }
      if (composerHidden) composerHidden.value = prompt;
      nextPromptIsGenerated = true;
      currentPrefix = prefix;
      currentPageUrl = ctx.pageUrl;
      currentCanonicalUrl = ctx.canonicalUrl;
      currentPageTitle = ctx.pageTitle;
      currentSubject = (currentPrefix ? (currentPrefix + ' · ') : '') + (currentPageTitle || '');
      showChat();
      sendChat();
    };
    if (refreshBtn) refreshBtn.addEventListener('click', () => { try { window.location.reload(); } catch (_) {} });
    if (quickSummaryBtn) quickSummaryBtn.addEventListener('click', async () => { const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.summaryTitle') : '帮我总结这篇文章: '; await runArticleChatTask({ title, prefix: (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.summary') : '总结', includeLangHint: true }); });
    if (beginnerExplainBtn) beginnerExplainBtn.addEventListener('click', async () => { const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.beginnerTitle') : '读者为初学者研究生，基础薄弱，需在明天组会做 PPT 文献汇报。请用最通俗、循序渐进、非常详细的方式解读这篇文献，确保我能彻底看懂。'; const extra = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.beginnerOutput') : '输出: 背景与动机；术语科普；方法流程分步骤；关键实验与结果；逐张图解；贡献与局限；改进方向；PPT 大纲与每页要点；可能被问到的问题与回答；最后给出 TL;DR。'; await runArticleChatTask({ title, prefix: (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.beginnerExplain') : '保姆级解读', extra, includeLangHint: true }); });
    if (btnTranslate) btnTranslate.addEventListener('click', async () => { await runArticleChatTask({ title: '请翻译以下内容，保留术语和段落结构。', prefix: '翻译', extra: '输出要求：如果原文是中文，请翻译成英文；如果原文不是中文，请翻译成中文。' }); });
    if (btnSelectionExplain) btnSelectionExplain.addEventListener('click', async () => {
      if (!getSelectedTextSafe()) {
        updateContextControls('selection');
        showToast('请先在网页中选中一段文本。');
        return;
      }
      try { await explainSelection(); } catch (error) { setView('explain'); explainResult.innerHTML = `<p>${String(error.message || error)}</p>`; }
    });
    if (explainTab) explainTab.onclick = () => { if (getSelectedTextSafe()) explainSelection().catch(error => { explainResult.innerHTML = `<p>${String(error.message || error)}</p>`; }); else setView('explain'); };
    if (explainRetry) explainRetry.onclick = () => explainSelection().catch(error => { explainResult.innerHTML = `<p>${String(error.message || error)}</p>`; });
    if (explainToChat) explainToChat.onclick = () => { if (!explainContext) return; runArticleChatTask({ title: '请基于下面的选区解释继续回答我的问题。', prefix: '选区解释追问', contextSource: 'selection', extra: '先复述解释要点，再等待用户追问。' }); };
    if (vocabTab) vocabTab.onclick = () => { setView('vocab'); renderVocabHistory(); };
    if (vocabStart) vocabStart.onclick = () => startVocabReview().catch(error => { vocabResult.innerHTML = `<p>${String(error.message || error)}</p>`; });
    if (vocabReset) vocabReset.onclick = () => { vocabCards = []; vocabIndex = 0; vocabResult.innerHTML = '<p>基于当前文章生成一组复习词汇。</p>'; vocabStats.textContent = '基础掌握度 0%'; };
    if (visionOcrBtn) visionOcrBtn.onclick = async () => {
      if (!currentMediaContext || currentMediaContext.source !== 'image') { showToast('请先选择一张图片。'); return; }
      try { showChat(); const output = await taixueTask.requestGlmVision({ imageDataUrl: currentMediaContext.image.dataUrl, prompt: '请完成图片 OCR 与视觉理解。先输出“图片文字”部分，尽量逐行保留原文；再输出“图片说明”部分，说明图片中的主要内容、布局和重要视觉信息。无法确认的内容请明确标注不确定。' }); if (inputUser) inputUser.innerText = output; if (composerHidden) composerHidden.value = output; nextPromptIsGenerated = true; currentPrefix = '图片识别/OCR'; sendChat(); } catch (e) { showToast(e.message || '图片识别失败'); }
    };
    if (speakBtn) speakBtn.onclick = async () => {
      if (!('speechSynthesis' in window)) { showToast('当前浏览器不支持本地朗读'); return; }
      if (speechSynthesis.speaking && !speechSynthesis.paused) { speechSynthesis.pause(); speakBtn.textContent = '继续朗读'; return; }
      if (speechSynthesis.paused) { speechSynthesis.resume(); speakBtn.textContent = '暂停朗读'; return; }
      const selected = getSelectedTextSafe(); let text = selected;
      if (!text) { try { const fullContext = await taixueContext.resolve('full_article'); text = String(fullContext.text || '').trim(); } catch (_) {} }
      if (!text) { showToast('没有可朗读的文本'); return; }
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 12000)); const selectedLang = speakLanguageSelect?.value || 'auto'; utterance.lang = selectedLang === 'auto' ? (/^\s*[\u4e00-\u9fff]/.test(text) ? 'zh-CN' : 'en-US') : selectedLang; const selectedVoiceId = speakVoiceSelect?.value || ''; const selectedVoice = availableSpeakVoices.find(v => (v.voiceURI || v.name) === selectedVoiceId); if (selectedVoice) { utterance.voice = selectedVoice; utterance.lang = selectedVoice.lang; } utterance.rate = Math.max(.5, Math.min(2, Number(speakRateInput?.value || 1))); utterance.onend = () => { speakBtn.textContent = '朗读'; }; speechSynthesis.cancel(); speechSynthesis.speak(utterance); speakBtn.textContent = '暂停朗读';
    };
    if (moduleHistoryBtn) moduleHistoryBtn.onclick = () => { if (currentView === 'quiz') showQuizHistory(); else if (currentView === 'explain') { setView('explain'); renderExplainHistory(); } else if (currentView === 'vocab') { setView('vocab'); renderVocabHistory(); } else showRecords(); };
    if (btnStructured) btnStructured.addEventListener('click', async () => { const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.structuredTitle') : '请基于以下正文生成结构化摘要，要求分章节要点与 TL;DR。'; await runArticleChatTask({ title, prefix: (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.structured') : '结构化摘要' }); });
    if (btnExplain) btnExplain.addEventListener('click', async () => { const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.explainTitle') : '请用简明方式解释以下正文的核心内容与关键点。'; await runArticleChatTask({ title, prefix: (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.explain') : '简明解释' }); });
    if (btnOutline) btnOutline.addEventListener('click', async () => { const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.outlineTitle') : '请提取以下正文的大纲与层级结构，保留标题与要点。'; await runArticleChatTask({ title, prefix: (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.outline') : '提取大纲' }); });
    if (btnKeywords) btnKeywords.addEventListener('click', async () => { const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.keywordsTitle') : '请从以下正文提取关键词与术语，并给出简要定义。'; await runArticleChatTask({ title, prefix: (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.keywords') : '提取关键词' }); });
    if (testTextBtn) testTextBtn.addEventListener('click', async () => {
      const u = getCanonicalUrl();
      const res = await new Promise(r => chrome.runtime.sendMessage({ action: 'agfTestGetTextForPage', pageUrl: u.pageUrl, canonicalUrl: u.canonicalUrl }, r));
      const rawText = (res && res.text) ? String(res.text) : '';
      const testNormalized = this.normalizeText(rawText || '');
      let segs = [];
      try { segs = await getLatestStoredSegmentsForPage(); } catch (_) { segs = []; }
      const uiTokens = getUiTokens();
      const makeKey = (s) => { const t = this.normalizeText(String(s||'')); return t.length + ':' + t.slice(0,300); };
      const testKeys = new Set();
      if (testNormalized) {
        const lines = testNormalized.split('\n');
        for (let i=0;i<lines.length;i++) { const line = lines[i].trim(); if (line.length >= 2) { testKeys.add(makeKey(line)); } }
      }
      const supSet = new Set();
      const supplements = [];
      for (let i=0;i<segs.length;i++) {
        const r = segs[i];
        const blocks = Array.isArray(r.blocks) ? r.blocks : [];
      for (let j=0;j<blocks.length;j++) {
        const t = this.normalizeText(String(blocks[j].text||''));
        if (!t) continue;
        const isFirstPage = (r.pageIndex === 1);
        const isAbstractHeader = /^abstract\b/i.test(t);
        const isSubtitle = /^under\s+/i.test(t);
        const isAuthorLine = /[†‡]/.test(t) || /\band\s+[A-Z][a-z]+/.test(t);
        const isDateLine = /(January|February|March|April|May|June|July|August|September|October|November|December)\b.*\b\d{4}\b/i.test(t) || /\b\d{4}\b/.test(t);
        const tokens = t.split(/\s+/).filter(x=>x.length>0);
        const capCount = tokens.filter(x=>/^[A-Z][a-z]+$/.test(x)).length;
        const keepTitleFrag = isFirstPage && capCount>=2 && tokens.length<=10 && !/@/.test(t);
        const isFootnoteStar = /\*\s*$/.test(t);
        const keepShortFront = isFirstPage && (isAbstractHeader || isSubtitle || isAuthorLine || isDateLine || keepTitleFrag || isFootnoteStar);
        if (t.length < 30 && !keepShortFront) continue;
        if (uiTokens.has(t)) continue;
        if (this.isNavigationText(t)) continue;
        if (this.isCssOrAdText(t)) continue;
        const k = makeKey(t);
        if (testKeys.has(k)) continue;
        if (testNormalized && testNormalized.indexOf(t) >= 0) continue;
        if (supSet.has(k)) continue;
        supSet.add(k);
        supplements.push({ text: t, title: String(r.sectionTitle||'') });
      }
      }
      const supText = supplements.map(x=>x.text).join('\n\n');
      const structSecs = this.collectPageSections();
      const secList = [];
      for (let i=0;i<structSecs.length;i++) {
        const sec = structSecs[i];
        const text = (sec.blocks && sec.blocks.length) ? sec.blocks.map(b=>String(b.text||'')).join('\n') : '';
        secList.push({ title: String(sec.sectionTitle||''), text: this.normalizeText(text||'') });
      }
      const assignMap = new Map();
      const titleNorm = (s)=>this.normalizeText(String(s||'')).slice(0,200);
      const ngrams = (s)=>{ const t=this.normalizeText(String(s||'')); const L=Math.min(1200,t.length); const out=new Set(); for(let i=0;i<Math.max(0,L-2);i++){ out.add(t.slice(i,i+3)); } return out; };
      const jac = (a,b)=>{ const A=ngrams(a), B=ngrams(b); if (A.size===0 || B.size===0) return 0; let inter=0; A.forEach(x=>{ if (B.has(x)) inter++; }); return inter/(A.size+B.size-inter); };
      supplements.forEach(it=>{
        let targetIdx = -1;
        const st = titleNorm(it.title);
        if (st) {
          for (let i=0;i<secList.length;i++) { if (titleNorm(secList[i].title)===st) { targetIdx=i; break; } }
        }
        if (targetIdx<0) {
          let best=-1, bi=-1;
          for (let i=0;i<secList.length;i++) { const sim=jac(it.text, secList[i].text.slice(0,1200)); if (sim>best) { best=sim; bi=i; } }
          if (best>=0.05) targetIdx=bi;
        }
        if (targetIdx<0) targetIdx = -1;
        const key = targetIdx>=0 ? ('sec:'+targetIdx) : 'unplaced';
        if (!assignMap.has(key)) assignMap.set(key, []);
        assignMap.get(key).push(it.text);
      });
      if (fulltextContent) {
        fulltextContent.innerHTML = '';
        try { const titleEl = fulltextPanel.querySelector('.agf-records-title'); if (titleEl) titleEl.textContent = isPdfPage() ? ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.pdfTitle') : 'pdf全文') : ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.webTitle') : '网页全文'); } catch (_) {}
        const sec2 = document.createElement('div'); sec2.className = 'agf-fulltext-section';
        const ttl2 = document.createElement('div'); ttl2.className = 'agf-fulltext-title'; ttl2.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.pdfTitle') : 'pdf全文';
        const body2 = document.createElement('div'); body2.className = 'agf-fulltext-body'; body2.textContent = supText || ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.none') : '无补充文本');
        sec2.appendChild(ttl2); sec2.appendChild(body2);
        const sec3 = document.createElement('div'); sec3.className = 'agf-fulltext-section';
        const ttl3 = document.createElement('div'); ttl3.className = 'agf-fulltext-title'; ttl3.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.webTitle') : '网页全文';
        const body3 = document.createElement('div'); body3.className = 'agf-fulltext-body';
        const paras = testNormalized.split('\n').map(x=>x.trim()).filter(x=>x.length>0);
        const paraKeys = new Set();
        const filteredParas = [];
        for (let i=0;i<paras.length;i++) {
          const p = paras[i];
          if (p.length < 2) continue;
          if (uiTokens.has(p)) continue;
          if (this.isCssOrAdText(p)) continue;
          const k = makeKey(p);
          if (paraKeys.has(k)) continue;
          paraKeys.add(k);
          filteredParas.push(p);
        }
        const structSecs = this.collectPageSections();
        const hint = [];
        for (let i=0;i<structSecs.length;i++) {
          const hp = String(structSecs[i].headingPath||'');
          const m = hp.match(/^h([1-6]):/);
          if (m) { const lvl = parseInt(m[1],10); const tn = this.normalizeText(String(structSecs[i].sectionTitle||'')).toLowerCase(); if (tn) hint.push({ title: tn, level: Math.max(1, Math.min(6, lvl)) }); }
        }
        const titleNorm = (s)=>this.normalizeText(String(s||'')).toLowerCase();
        const ngrams = (s)=>{ const t=titleNorm(s); const L=Math.min(120, t.length); const out=new Set(); for(let i=0;i<Math.max(0,L-2);i++){ out.add(t.slice(i,i+3)); } return out; };
        const jac = (a,b)=>{ const A=ngrams(a), B=ngrams(b); if (A.size===0 || B.size===0) return 0; let inter=0; A.forEach(x=>{ if (B.has(x)) inter++; }); return inter/(A.size+B.size-inter); };
        const detectLevel = (p)=>{ const tp = titleNorm(p); let best = 0; let bl = 0; for (let i=0;i<hint.length;i++) { const ht = hint[i].title; if (tp === ht) { return hint[i].level; } const short = Math.max(tp.length, ht.length) <= 40; const contain = tp && ht && (tp.includes(ht) || ht.includes(tp)); if (short && contain) { const r = Math.min(tp.length, ht.length)/Math.max(tp.length, ht.length); if (r >= 0.6) { if (1 > best) { best = 1; bl = hint[i].level; } continue; } }
          const s = jac(tp, ht);
          if (s > best && s >= 0.12) { best = s; bl = hint[i].level; }
        }
        return bl || 0; };
        const anchors = Array.from(document.querySelectorAll('a'));
        const anchorList = [];
        const seenAnchor = new Set();
        for (let i=0;i<anchors.length;i++) {
          const a = anchors[i];
          const txt = this.normalizeText(String(a.innerText||a.textContent||'')).trim();
          let href = String(a.getAttribute('href')||a.href||'').trim();
          if (!txt || txt.length < 2) continue;
          if (!href) continue;
          try { href = new URL(href, window.location.href).href; } catch (_) { continue; }
          const key = txt.toLowerCase()+"|"+href;
          if (seenAnchor.has(key)) continue;
          seenAnchor.add(key);
          anchorList.push({ text: txt, href });
        }
        const linkify = (s)=>{
          let out = String(s||'');
          const list = anchorList.filter(x=>x.text.length>=2 && x.text.length<=60);
          list.sort((a,b)=>b.text.length - a.text.length);
          let rep = 0;
          for (let i=0;i<list.length && rep<3;i++) {
            const t = list[i].text;
            const h = list[i].href;
            const idx = out.indexOf(t);
            if (idx < 0) continue;
            const before = idx>0 ? out[idx-1] : ' ';
            const afterIdx = idx + t.length;
            const after = afterIdx < out.length ? out[afterIdx] : ' ';
            const wb = /[\w\u4e00-\u9fa5]/;
            const ok = !wb.test(before) && !wb.test(after);
            if (!ok) continue;
            out = out.slice(0, idx) + '['+t+']('+h+')' + out.slice(afterIdx);
            rep++;
          }
          return out;
        };
        let aligned = '';
        let prevKey = '';
        for (let i=0;i<filteredParas.length;i++) {
          const p = filteredParas[i];
          const k = makeKey(p);
          if (k === prevKey) continue;
          prevKey = k;
          const lvl = detectLevel(p);
          const px = linkify(p);
          if (lvl > 0) { aligned += Array(lvl).fill('#').join('') + ' ' + px + '\n\n'; }
          else { aligned += px + '\n\n'; }
        }
        body3.textContent = aligned || ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.noStructured') : '无结构化内容');
        sec3.appendChild(ttl3); sec3.appendChild(body3);
        if (isPdfPage()) {
          let pdfStructured = '';
          try { pdfStructured = await buildPdfStructuredOutlineText(); } catch (_) { pdfStructured = ''; }
          const sec4 = document.createElement('div'); sec4.className = 'agf-fulltext-section';
          const ttl4 = document.createElement('div'); ttl4.className = 'agf-fulltext-title'; ttl4.textContent = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.pdfStructuredTitle') : '结构化PDF文本';
          const body4 = document.createElement('div'); body4.className = 'agf-fulltext-body'; body4.innerHTML = markdownToHtml(pdfStructured || ((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.fulltext.noStructured') : '无结构化内容'));
          sec4.appendChild(ttl4); sec4.appendChild(body4);
          fulltextContent.appendChild(sec4);
        } else {
          fulltextContent.appendChild(sec3);
        }
      }
      if (fulltextPanel) fulltextPanel.style.display = 'block';
    });
    if (fulltextClose) fulltextClose.addEventListener('click', () => { if (fulltextPanel) fulltextPanel.style.display = 'none'; });
    const onComposerSendClick = (e) => {
      if (!composerSend) return;
      if (composerSend.dataset.mode === 'refresh') { e.preventDefault(); try { window.location.reload(); } catch (_) {} return; }
      showChat();
      sendChat();
    };
    if (composerSend) composerSend.addEventListener('click', onComposerSendClick);
    if (composerEditor) composerEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (composerSend && composerSend.dataset.mode === 'refresh') { try { window.location.reload(); } catch (_) {} }
        else { showChat(); sendChat(); }
      }
    });
    const initComposerAutosize = () => {
      if (!composerEditor) return;
      const container = document.querySelector('.agf-ai-input');
      const header = document.querySelector('.agf-composer-header');
      const compute = () => {
        const hh = header ? header.offsetHeight : 0;
        const max = Math.max(56, Math.floor(window.innerHeight * 0.5 - hh - 8));
        composerEditor.style.height = 'auto';
        const h = Math.min(composerEditor.scrollHeight || composerEditor.getBoundingClientRect().height, max);
        composerEditor.style.height = h + 'px';
        if (container) container.style.maxHeight = '50vh';
      };
      composerEditor.addEventListener('input', compute);
      window.addEventListener('resize', compute);
      setTimeout(compute, 0);
    };
    initComposerAutosize();
    if (titleLabel) titleLabel.addEventListener('click', () => { hideFulltextPanel(); });
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
    (async ()=>{ try { await updateStorageStatusUI(); await ensureAutoCollect(); } catch (_) {} })();
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
    this.__bubblePos = null;
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
    if (bubble) {
      bubble.style.display = 'flex';
      bubble.style.right = '12px';
      bubble.style.bottom = 'auto';
      bubble.style.top = '12px';
      bubble.style.left = 'auto';
    }
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

  halfAiSettingPanel() {
    const overlay = document.getElementById('agfAiSettingOverlay');
    if (!overlay) return;
    this.__aiGeom = {
      left: parseInt(getComputedStyle(overlay).left, 10) || 0,
      top: parseInt(getComputedStyle(overlay).top, 10) || 0,
      width: overlay.offsetWidth,
      height: overlay.offsetHeight
    };
    const w = Math.floor(window.innerWidth * 0.5);
    const h = window.innerHeight;
    const left = Math.max(0, window.innerWidth - w);
    const top = 0;
    overlay.style.left = left + 'px';
    overlay.style.top = top + 'px';
    overlay.style.width = w + 'px';
    overlay.style.height = h + 'px';
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
  document.addEventListener('DOMContentLoaded', async () => {
    try { await window.i18n.init(); } catch (e) {}
    window.adhdHighlighter = new ADHDHighlighter();
  });
} else {
  // DOM已经加载完成
  try {
    window.i18n.init().then(() => { window.adhdHighlighter = new ADHDHighlighter(); });
  } catch (e) {
    window.adhdHighlighter = new ADHDHighlighter();
  }
}

console.log('ADHD文本高亮器主控制器加载完成');
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.language) {
      const nv = changes.language.newValue;
      if (!nv) return;
      if (window.i18n) {
        const cur = typeof window.i18n.getCurrentLanguage === 'function' ? window.i18n.getCurrentLanguage() : null;
        if (cur && cur !== nv && typeof window.i18n.switchLanguage === 'function') {
          window.i18n.switchLanguage(nv);
        } else if (typeof window.i18n.applyTranslations === 'function') {
          window.i18n.applyTranslations();
        }
      }
    }
  });
} catch (_) {}
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
    const initGovernanceControls = async () => {
      const retentionDaysInput = document.getElementById('agfRetentionDaysInput');
      try {
        const st = await chrome.storage.local.get(['pageSegmentsRetentionDays']);
        const days = st.pageSegmentsRetentionDays !== undefined ? parseInt(st.pageSegmentsRetentionDays,10) : 7;
        if (retentionDaysInput) retentionDaysInput.value = isNaN(days) ? 7 : days;
      } catch (_) {}
      if (retentionDaysInput) {
        retentionDaysInput.addEventListener('change', async () => {
          const v = parseInt(retentionDaysInput.value,10);
          const n = isNaN(v) ? 7 : Math.max(1, v);
          try { await chrome.storage.local.set({ pageSegmentsRetentionDays: n }); } catch (_) {}
        });
      }
    };
    initGovernanceControls();
    const hideFulltextPanel = () => { const p = document.getElementById('agfFulltextPanel'); if (p) p.style.display = 'none'; };
