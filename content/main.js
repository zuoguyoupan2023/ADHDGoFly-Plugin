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
  const base = ['ExamPage','✏️','📃','🔧','●','◑','○','keyboard_arrow_down','deepseek','moonshot','chatgpt','claude','qwen','chatglm','minimax','gemini','grok','deepseek-chat','deepseek-reasoner','总结','更多','常驻','手动','发送','收起','展开全文','您好，我是AI助手。','请总结这段文本。','全文'];
  const dyn = ['aiPanel.summary','aiPanel.more','aiPanel.send','aiPanel.collapse.expand','aiPanel.collapse.collapse','aiPanel.fullText','aiPanel.mode.persistent','aiPanel.mode.manual'];
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
      .agf-ai-title{font-size:14px;font-weight:600;color:#333;display:flex;align-items:center;gap:4px}
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
      .agf-ai-body{flex:1;padding:0;overflow:hidden;display:flex;flex-direction:column;gap:0;min-height:0}
      .agf-ai-content{flex:1;overflow:hidden;min-height:0;position:relative}
      .agf-ai-view-chat{display:grid;grid-template-rows:1fr auto;gap:8px;height:calc(100% - 8px);box-sizing:border-box;min-height:0}
      .agf-ai-display{border:1px solid #e0e0e0;border-radius:4px;padding:0;font-size:14px;color:#333;overflow:auto;box-sizing:border-box;min-height:0;background:var(--agf-display-bg,#fff);width:100%}
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
      .agf-qa-label{display:inline-block;min-width:32px;padding:0 6px;border:1px solid #e0e0e0;border-radius:6px;margin-right:6px;font-size:12px;color:#666;background:#f9f9f9}
      .agf-model-badge{display:inline-block;padding:0 6px;border:1px solid #e0e0e0;border-radius:6px;margin-right:6px;font-size:11px;color:#666;background:#f9f9f9}
      .agf-collapse{margin-top:6px;border-top:1px solid #e0e0e0;padding-top:6px}
      .agf-collapse-content{max-height:none;overflow:auto}
      .agf-collapse-content.collapsed{max-height:var(--agf-collapse-height,160px);overflow:auto}
      .agf-collapse-toggle{height:22px;min-width:64px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;margin-top:6px}
      .agf-go-full{background:#27ae60;color:#fff;border-color:#27ae60;box-shadow:0 4px 10px rgba(39,174,96,0.25)}
      .agf-composer{display:grid;grid-template-rows:auto 1fr auto auto;gap:0;height:100%}
      .agf-composer-extra{display:grid;grid-template-columns:1fr auto;align-items:start;margin-top:2px}
      .agf-composer-body{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:stretch}
      .agf-composer-header{display:inline-flex;align-items:center;gap:8px;margin:0;padding:0}
      .agf-field{height:24px;border:1px solid #e0e0e0;border-radius:8px;padding:0 8px;font-size:12px;color:#333;background:#fff}
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
      .agf-conv-index{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
      .agf-conv-rounds{color:#666}
      .agf-conv-item{border:1px solid #e0e0e0;border-radius:4px;padding:2px 6px;background:#fff;color:#333;font-size:12px;cursor:pointer}
      .agf-status-row{display:none}
      .agf-fixed-bar{position:sticky;top:48px;z-index:98;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;padding:4px 8px;font-size:12px;margin:0;width:100%}
      .agf-fixed-line{display:flex;align-items:center;gap:15px;flex-wrap:wrap}
      .agf-carry-top{margin-left:auto}
      
      .agf-toast{position:absolute;right:12px;bottom:12px;background:#333;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;box-shadow:0 6px 18px rgba(0,0,0,0.12);z-index:3}
      .agf-toast-close{position:absolute;top:4px;right:6px;background:transparent;border:none;color:#fff;cursor:pointer;font-size:12px}
      .agf-settings-group{border:1px solid #e0e0e0;border-radius:4px;padding:10px;background:#fff}
      .agf-settings-row{display:flex;align-items:center;gap:12px;margin-top:8px}
      .agf-label{min-width:64px;font-size:12px;color:#333}
      .agf-button-list{display:flex;flex-wrap:wrap;gap:8px}
      .agf-btn{height:28px;padding:0 10px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333;font-size:13px;cursor:pointer}
      .agf-btn.active{background:#333;color:#fff;border-color:#333}
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
      .agf-more-wrap{position:relative;display:inline-block;margin-left:4px}
      .agf-more-btn{height:22px;min-width:56px;border:1px solid #e0e0e0;border-radius:6px;background:#fff;color:#333}
      .agf-more-panel{position:absolute;top:26px;right:0;background:#fff;border:1px solid #e0e0e0;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.12);display:none;padding:8px;z-index:10;grid-template-columns:repeat(2,max-content);gap:6px 12px}
      .agf-more-panel .agf-btn{display:inline-block;width:auto;text-align:left;margin:0}
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
        <div class="agf-ai-title"><span id="agfTitleLabel" data-i18n="aiPanel.title" data-i18n-attr="title:aiPanel.returnToChat">ExamPage</span><div class="agf-mode-toggle"><button class="agf-mode-btn" data-i18n="aiPanel.mode.persistent">常驻</button><button class="agf-mode-btn active" data-i18n="aiPanel.mode.manual">手动</button></div><div class="agf-highlight-toggle"><button class="agf-mode-btn active" id="agfHighlightOn" data-i18n="aiPanel.highlight.on">高亮</button><button class="agf-mode-btn" id="agfHighlightOff" data-i18n="aiPanel.highlight.off">不亮</button></div></div>
        <div style="display:flex;align-items:center;gap:4px;">
          <div class="agf-ai-tabs">
            <button id="agfAiTabPencil">✏️</button>
            <button id="agfAiTabDoc">📃</button>
            <button id="agfAiTabWrench">🔧</button>
          </div>
          <div class="agf-ai-controls">
            <button id="agfAiFull" data-i18n="aiPanel.size.full">全</button>
            <button id="agfAiHalf" data-i18n="aiPanel.size.half">中</button>
            <button id="agfAiMini" data-i18n="aiPanel.size.mini">小</button>
            <button id="agfAiClose">X</button>
          </div>
        </div>
        
      </div>
      <div class="agf-fixed-bar"><div class="agf-fixed-line"><span id="agfStatusText"></span><span id="agfConvRounds" class="agf-conv-rounds"></span><div id="agfConvIndex" class="agf-conv-index"></div><div id="agfCarryWrap" class="agf-rounds-wrap agf-carry-top" style="display:none"><span class="agf-rounds-label" data-i18n="aiPanel.carry">携带</span><input class="agf-field" id="agfCarryInput" type="number" min="0" value="2" style="width:28px;text-align:center" /><span class="agf-rounds-label" data-i18n="aiPanel.qnaSuffix">轮问答</span></div></div></div>
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
                  <div class="agf-status"><span id="agfStorageStatusDot" class="agf-status-dot" data-i18n-attr="title:aiPanel.statusHintNone"></span><button id="agfRefreshBtn" class="agf-refresh-btn" data-i18n-attr="title:aiPanel.refresh">⟳</button><button id="agfQuickSummaryBtn" class="agf-status-btn" disabled data-i18n="aiPanel.summary">总结</button><div class="agf-more-wrap"><button id="agfMoreBtn" class="agf-more-btn" disabled data-i18n="aiPanel.more">更多</button><div id="agfMorePanel" class="agf-more-panel"><button class="agf-btn" id="agfBtnStructured" disabled data-i18n="aiPanel.structured">结构化摘要</button><button class="agf-btn" id="agfBtnExplain" disabled data-i18n="aiPanel.explain">简明解释</button><button class="agf-btn" id="agfBtnOutline" disabled data-i18n="aiPanel.outline">提取大纲</button><button class="agf-btn" id="agfBtnKeywords" disabled data-i18n="aiPanel.keywords">提取关键词与术语</button></div></div><button id="agfTestTextBtn" class="agf-status-btn" data-i18n="aiPanel.fullText">全文</button></div>
                </div>
                <div class="agf-composer-body">
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
    const tabPencil = document.getElementById('agfAiTabPencil');
    const tabNote = document.getElementById('agfAiTabNote');
    const tabDoc = document.getElementById('agfAiTabDoc');
    const tabWrench = document.getElementById('agfAiTabWrench');
    const viewChat = document.getElementById('agfAiViewChat');
    const statusText = document.getElementById('agfStatusText');
    const viewSettings = document.getElementById('agfAiViewSettings');
    const providerList = document.getElementById('agfProviderList');
    const modelList = document.getElementById('agfModelList');
    const baseUrlInput = document.getElementById('agfBaseUrlInput');
    const apiKeyInput = document.getElementById('agfApiKeyInput');
    const saveKeyBtn = document.getElementById('agfSaveKeyBtn');
    const keySavedBtn = document.getElementById('agfKeySavedBtn');
    if (keySavedBtn) keySavedBtn.style.display = 'none';
    const tempInput = document.getElementById('agfTempInput');
    const pdfToggle = document.getElementById('agfPdfParseToggle');
    const sensitiveToggle = document.getElementById('agfSensitiveToggle');
    const manualParseBtn = document.getElementById('agfManualParseBtn');
    const retentionDaysInput = document.getElementById('agfRetentionDaysInput');
    const foldThresholdInput = document.getElementById('agfFoldThresholdInput');
    const foldHeightInput = document.getElementById('agfFoldHeightInput');
    const sessionProviderSelect = document.getElementById('agfSessionProvider');
    const sessionModelSelect = document.getElementById('agfSessionModel');
    const statusDot = document.getElementById('agfStorageStatusDot');
    const refreshBtn = document.getElementById('agfRefreshBtn');
    const quickSummaryBtn = document.getElementById('agfQuickSummaryBtn');
    const moreBtn = document.getElementById('agfMoreBtn');
    const morePanel = document.getElementById('agfMorePanel');
    const btnStructured = document.getElementById('agfBtnStructured');
    const btnExplain = document.getElementById('agfBtnExplain');
    const btnOutline = document.getElementById('agfBtnOutline');
    const btnKeywords = document.getElementById('agfBtnKeywords');
    const testTextBtn = document.getElementById('agfTestTextBtn');
    const fulltextPanel = document.getElementById('agfFulltextPanel');
    const fulltextContent = document.getElementById('agfFulltextContent');
    const fulltextClose = document.getElementById('agfFulltextClose');
    const refreshHint = document.getElementById('agfRefreshHint');
    const chatList = overlay.querySelector('.agf-chat-list');
    const composerEditor = document.getElementById('agfComposerEditor');
    const inputPrefix = document.getElementById('agfInputPrefix');
    const inputUser = document.getElementById('agfInputUser');
    const inputAffix = document.getElementById('agfInputAffix');
    const composerHidden = document.getElementById('agfComposerHidden');
    const composerSend = document.getElementById('agfComposerSend');
    const addFullBtn = document.getElementById('agfAddFullTextBtn');
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
    const settingsTabDisplay = document.getElementById('agfSettingsTabDisplay');
    const settingsContentApi = document.getElementById('agfSettingsContentApi');
    const settingsContentColors = document.getElementById('agfSettingsContentColors');
    const settingsContentParse = document.getElementById('agfSettingsContentParse');
    const settingsContentDisplay = document.getElementById('agfSettingsContentDisplay');
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
        const MAX_WARN_CHARS = 12000;
        const body = isPdfPage() ? await buildPdfStructuredOutlineText() : await buildStructuredFromLegacyOrHints();
        const raw = String(body || '');
        if (raw.length > MAX_WARN_CHARS) {
          showToast('目前还在升级AI功能，超出12000字数的文本不建议发送，可能会超出ai最大长度。');
        }
        addedFullText = raw;
        const link = String(location && location.href || '');
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
    let currentView = 'chat';
    const setView = (which) => {
      currentView = which;
      if (viewChat) viewChat.style.display = which === 'chat' ? 'grid' : 'none';
      if (viewSettings) viewSettings.style.display = which === 'settings' ? 'block' : 'none';
      if (recordsPanel) recordsPanel.style.display = which === 'records' ? 'block' : 'none';
      if (colorsPanel) colorsPanel.style.display = 'none';
    };
    const showChat = () => { setView('chat'); try { rebuildConvIndex(); } catch (_) {} try { focusUserCaretEnd(); } catch (_) {} };
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
    if (tabWrench) tabWrench.addEventListener('click', () => { hideFulltextPanel(); hideToast(); showSettings(); });
    if (titleLabel) titleLabel.addEventListener('click', showChat);
    showChat();
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
      if (settingsTabDisplay) settingsTabDisplay.classList.toggle('active', which === 'display');
      if (settingsContentApi) settingsContentApi.style.display = which === 'api' ? 'block' : 'none';
      if (settingsContentColors) settingsContentColors.style.display = which === 'colors' ? 'block' : 'none';
      if (settingsContentParse) settingsContentParse.style.display = which === 'parse' ? 'block' : 'none';
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
        models: ['deepseek-chat', 'deepseek-reasoner']
      },
      moonshot: {
        baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
      },
      openai: {
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-4o', 'gpt-5', 'gpt-4']
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com/v1/messages',
        models: ['claude-4-sonnet', 'claude-4.5-sonnet']
      },
      qwen: {
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1/chat/completions',
        models: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-long']
      },
      chatglm: {
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        models: ['glm-4.6', 'glm-4.5']
      },
      minimax: {
        baseUrl: 'https://api.minimax.io/v1/chat/completions',
        models: ['MiniMax-M2', 'MiniMax-M2-Stable']
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-001', 'gemini-2.5-flash']
      },
      grok: {
        baseUrl: 'https://api.x.ai/v1/chat/completions',
        models: ['grok-2', 'grok-2-mini']
      },
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        models: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'deepseek-ai/DeepSeek-R1']
      },
      groq: {
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        models: ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'gemma2-9b-it']
      },
      siliconflow: {
        baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
        models: ['deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-7B-Instruct']
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
        save({ aiProvider: val });
        if (!aiBaseUrlsState[val]) { aiBaseUrlsState[val] = base; try { chrome.storage.local.set({ aiBaseUrls: aiBaseUrlsState }); } catch(_){} }
        if (keySavedBtn) keySavedBtn.style.display = 'none';
        if (apiKeyInput) apiKeyInput.placeholder = (aiKeysState && aiKeysState[val]) ? '••••••••••••••••••••••••••••••••' : '';
      }, labelMap);
    };

    const initFromStorage = () => {
      try {
        chrome.storage.local.get(['aiProvider','aiModel','aiBaseUrls','aiBaseUrl','aiTemperature','aiKeys','chatColors'], (res) => {
          let cp = res.aiProvider || 'deepseek';
          aiKeysState = res.aiKeys || {};
          aiBaseUrlsState = res.aiBaseUrls || {};
          if (!aiBaseUrlsState[currentProvider] && res.aiBaseUrl) { aiBaseUrlsState[currentProvider] = res.aiBaseUrl; try { chrome.storage.local.set({ aiBaseUrls: aiBaseUrlsState }); } catch(_){} }
          if (cp === 'openrouter' || cp === 'siliconflow' || cp === 'groq' || cp === 'minimax') {
            const candidates = Object.keys(PROVIDERS_CONFIG).filter(p => p !== 'openrouter' && p !== 'siliconflow' && p !== 'groq' && p !== 'minimax' && aiKeysState && aiKeysState[p]);
            cp = candidates[0] || 'deepseek';
          }
          currentProvider = cp;
          renderProviderButtons(currentProvider);
          fillModels(currentProvider, res.aiModel || (PROVIDERS_CONFIG[currentProvider]?.models?.[0] || ''));
          const base = (aiBaseUrlsState && aiBaseUrlsState[currentProvider]) || (PROVIDERS_CONFIG[currentProvider]?.baseUrl || '');
          if (baseUrlInput) baseUrlInput.value = base;
          const t = typeof res.aiTemperature === 'number' ? res.aiTemperature : 0.7;
          if (tempInput) tempInput.value = t;
          if (keySavedBtn) keySavedBtn.style.display = 'none';
          if (apiKeyInput) apiKeyInput.placeholder = (aiKeysState && aiKeysState[currentProvider]) ? '••••••••••••••••••••••••••••••••' : '';
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
      try {
        const s = await chrome.storage.local.get(['pdfAutoCollectEnabled','privacySensitiveFilterEnabled']);
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
    if (settingsTabDisplay) settingsTabDisplay.addEventListener('click', () => setActiveSettingsTab('display'));

    function initComposerSelects() {
      if (!sessionProviderSelect || !sessionModelSelect) return;
      const providers = Object.keys(PROVIDERS_CONFIG).filter(p => aiKeysState && aiKeysState[p]).filter(p => p !== 'openrouter' && p !== 'siliconflow' && p !== 'groq' && p !== 'minimax');
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
    const toAnthropicStyle = (arr) => (arr || chatMessages).map(m => ({ role: (m.role === 'assistant' ? 'assistant' : 'user'), content: [{ type: 'text', text: m.content }] }));
    const toGeminiStyle = (arr) => (arr || chatMessages).map(m => ({ role: (m.role === 'assistant' ? 'model' : 'user'), parts: [{ text: m.content }] }));
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
      if (!prompt) return;
      if (!currentConversationId) { try { await newConversation(); } catch (_) {} }
      const bodyLabelDetect2 = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:';
      const isGeneratedPrompt = nextPromptIsGenerated || prompt.indexOf('\n' + bodyLabelDetect2) >= 0;
      const userIndex = chatMessages.length;
      chatMessages.push({ role: 'user', content: prompt });
      appendMessage('user', displayPrompt, { highlight: !isGeneratedPrompt, msgIndex: userIndex });
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
      try {
        const res = await new Promise(resolve => chrome.storage.local.get(['aiKeys','aiBaseUrls'], resolve));
        const keys = res.aiKeys || {};
        key = keys[prov] || '';
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
          chrome.runtime.sendMessage({ action: 'aiChatStream', provider: prov, model, messages: toOpenAIStyle(subset) });
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
      if (moreBtn) { moreBtn.disabled = !has; }
      if (btnStructured) btnStructured.disabled = !has;
      if (btnExplain) btnExplain.disabled = !has;
      if (btnOutline) btnOutline.disabled = !has;
      if (btnKeywords) btnKeywords.disabled = !has;
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
      if (moreBtn) moreBtn.disabled = true;
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

    if (refreshBtn) refreshBtn.addEventListener('click', () => { try { window.location.reload(); } catch (_) {} });
    if (quickSummaryBtn) quickSummaryBtn.addEventListener('click', async () => { hideFulltextPanel(); await updateStorageStatusUI(); const u = getCanonicalUrl(); const body = isPdfPage() ? await buildPdfStructuredOutlineText() : await buildStructuredFromLegacyOrHints(); const raw = String(body || ''); if (raw.length > 12000) { showToast('目前还在升级AI功能，超出12000字数的文本不建议发送，可能会超出ai最大长度。'); } const sumTitle = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.summaryTitle') : '帮我总结这篇文章: '; const pageLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: '; const bodyLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:'; const langHint = (window.i18n && window.i18n.t) ? window.i18n.t(((function(){ try{ const s=String(window.i18n.t('aiPanel.summary')||''); return /^[A-Za-z]/.test(s)?'aiPanel.prompts.outputEnglish':'aiPanel.prompts.outputChinese'; }catch(_){ return 'aiPanel.prompts.outputChinese'; }})())) : '请用中文输出。'; const prompt = [sumTitle + u.canonicalUrl, bodyLabel, raw, langHint].join('\n'); if (inputUser) { inputUser.innerText = prompt; } if (composerHidden) composerHidden.value = prompt; nextPromptIsGenerated = true; currentPrefix = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.summary') : '总结'; currentPageUrl = u.pageUrl; currentCanonicalUrl = u.canonicalUrl; currentPageTitle = getMetaTitle(); currentSubject = (currentPrefix ? (currentPrefix + ' · ') : '') + (currentPageTitle || ''); showChat(); sendChat(); });
    if (moreBtn) moreBtn.addEventListener('click', () => { if (morePanel) { morePanel.style.display = morePanel.style.display === 'none' || !morePanel.style.display ? 'grid' : 'none'; } });
    if (btnStructured) btnStructured.addEventListener('click', async () => { hideFulltextPanel(); await updateStorageStatusUI(); const u = getCanonicalUrl(); const body = isPdfPage() ? await buildPdfStructuredOutlineText() : await buildStructuredFromLegacyOrHints(); const raw = String(body || ''); if (raw.length > 12000) { showToast('目前还在升级AI功能，超出12000字数的文本不建议发送，可能会超出ai最大长度。'); } const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.structuredTitle') : '请基于以下正文生成结构化摘要，要求分章节要点与 TL;DR。'; const pageLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: '; const bodyLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:'; const prompt = [title, pageLabel + u.canonicalUrl, bodyLabel, raw].join('\n'); if (inputUser) { inputUser.innerText = prompt; } if (composerHidden) composerHidden.value = prompt; if (morePanel) morePanel.style.display = 'none'; nextPromptIsGenerated = true; currentPrefix = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.structured') : '结构化摘要'; currentPageUrl = u.pageUrl; currentCanonicalUrl = u.canonicalUrl; currentPageTitle = getMetaTitle(); currentSubject = (currentPrefix ? (currentPrefix + ' · ') : '') + (currentPageTitle || ''); showChat(); sendChat(); });
    if (btnExplain) btnExplain.addEventListener('click', async () => { hideFulltextPanel(); await updateStorageStatusUI(); const u = getCanonicalUrl(); const body = isPdfPage() ? await buildPdfStructuredOutlineText() : await buildStructuredFromLegacyOrHints(); const raw = String(body || ''); if (raw.length > 12000) { showToast('目前还在升级AI功能，超出12000字数的文本不建议发送，可能会超出ai最大长度。'); } const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.explainTitle') : '请用简明方式解释以下正文的核心内容与关键点。'; const pageLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: '; const bodyLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:'; const prompt = [title, pageLabel + u.canonicalUrl, bodyLabel, raw].join('\n'); if (inputUser) { inputUser.innerText = prompt; } if (composerHidden) composerHidden.value = prompt; if (morePanel) morePanel.style.display = 'none'; nextPromptIsGenerated = true; currentPrefix = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.explain') : '简明解释'; currentPageUrl = u.pageUrl; currentCanonicalUrl = u.canonicalUrl; currentPageTitle = getMetaTitle(); currentSubject = (currentPrefix ? (currentPrefix + ' · ') : '') + (currentPageTitle || ''); showChat(); sendChat(); });
    if (btnOutline) btnOutline.addEventListener('click', async () => { hideFulltextPanel(); await updateStorageStatusUI(); const u = getCanonicalUrl(); const body = isPdfPage() ? await buildPdfStructuredOutlineText() : await buildStructuredFromLegacyOrHints(); const raw = String(body || ''); if (raw.length > 12000) { showToast('目前还在升级AI功能，超出12000字数的文本不建议发送，可能会超出ai最大长度。'); } const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.outlineTitle') : '请提取以下正文的大纲与层级结构，保留标题与要点。'; const pageLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: '; const bodyLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:'; const prompt = [title, pageLabel + u.canonicalUrl, bodyLabel, raw].join('\n'); if (inputUser) { inputUser.innerText = prompt; } if (composerHidden) composerHidden.value = prompt; if (morePanel) morePanel.style.display = 'none'; nextPromptIsGenerated = true; currentPrefix = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.outline') : '提取大纲'; currentPageUrl = u.pageUrl; currentCanonicalUrl = u.canonicalUrl; currentPageTitle = getMetaTitle(); currentSubject = (currentPrefix ? (currentPrefix + ' · ') : '') + (currentPageTitle || ''); showChat(); sendChat(); });
    if (btnKeywords) btnKeywords.addEventListener('click', async () => { hideFulltextPanel(); await updateStorageStatusUI(); const u = getCanonicalUrl(); const body = isPdfPage() ? await buildPdfStructuredOutlineText() : await buildStructuredFromLegacyOrHints(); const raw = String(body || ''); if (raw.length > 12000) { showToast('目前还在升级AI功能，超出12000字数的文本不建议发送，可能会超出ai最大长度。'); } const title = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.keywordsTitle') : '请从以下正文提取关键词与术语，并给出简要定义。'; const pageLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.pageLabel') : '页面: '; const bodyLabel = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.prompts.bodyLabel') : '正文:'; const prompt = [title, pageLabel + u.canonicalUrl, bodyLabel, raw].join('\n'); if (inputUser) { inputUser.innerText = prompt; } if (composerHidden) composerHidden.value = prompt; if (morePanel) morePanel.style.display = 'none'; nextPromptIsGenerated = true; currentPrefix = (window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.keywords') : '提取关键词'; currentPageUrl = u.pageUrl; currentCanonicalUrl = u.canonicalUrl; currentPageTitle = getMetaTitle(); currentSubject = (currentPrefix ? (currentPrefix + ' · ') : '') + (currentPageTitle || ''); showChat(); sendChat(); });
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
    if (tabPencil) tabPencil.addEventListener('click', async () => { hideFulltextPanel(); try { await newConversation(); showToast(((window.i18n && window.i18n.t) ? window.i18n.t('aiPanel.newConversation') : '已创建新对话')); } catch (_) {} showChat(); });
    if (tabDoc) tabDoc.addEventListener('click', () => { hideFulltextPanel(); showRecords(); });
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