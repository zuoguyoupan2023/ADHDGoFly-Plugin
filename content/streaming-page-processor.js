// 流式页面处理器模块 - 第一阶段：渐进式流式处理
class StreamingPageProcessor extends EventTarget {
  constructor(dictionaryManager, languageDetector, textSegmenter) {
    super(); // 继承EventTarget以支持事件
    this.dictionaryManager = dictionaryManager;
    this.languageDetector = languageDetector;
    this.textSegmenter = textSegmenter;
    
    // 处理统计
    this.stats = {
      processedNodes: 0,
      highlightedWords: 0,
      skippedNodes: 0,
      errors: 0,
      queuedNodes: 0,
      visibleNodes: 0
    };
    
    // 配置选项
    this.options = {
      // 视口相关配置 - 优化后的参数
      rootMargin: '150px', // 从300px减少到150px，减少预加载范围
      threshold: [0, 0.25, 0.5, 0.75, 1.0], // 多阈值检测，提高触发精度
      
      // 处理相关配置
      maxProcessingTime: 5, // 每次空闲处理最多5ms
      batchSize: 10, // 每批处理10个节点
      maxQueueSize: 1000, // 最大队列长度
      
      // 性能相关配置
      idleTimeout: 1000, // 空闲回调超时时间
      minTextLength: 2,
      excludedTags: ['script', 'style', 'noscript', 'svg', 'canvas'],
      excludedClasses: ['adhd-processed', 'adhd-highlight'],
      
      // 动态调整参数
      adaptiveMargin: true, // 启用自适应边距
      minRootMargin: 50, // 最小边距
      maxRootMargin: 300, // 最大边距
      scrollSpeedThreshold: 100 // 滚动速度阈值(px/100ms)
    };
    
    // 处理队列和状态管理
    this.processingQueue = new Map(); // nodeId -> {element, textNode, priority}
    this.processedNodes = new WeakSet();
    this.isProcessing = false;
    this.processingScheduled = false;
    
    // 智能终止机制
    this.consecutiveEmptyRuns = 0; // 连续空运行次数
    this.maxEmptyRuns = 3; // 最大连续空运行次数
    this.lastProcessTime = 0; // 上次处理时间
    
    // 动态视口调整相关
    this.scrollHistory = []; // 滚动历史记录
    this.lastScrollTime = 0;
    this.lastScrollY = window.scrollY;
    this.currentRootMargin = parseInt(this.options.rootMargin); // 当前实际使用的边距
    
    // IntersectionObserver 用于视感受知
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: `${this.currentRootMargin}px`,
        threshold: this.options.threshold
      }
    );
    
    // 滚动监听器用于动态调整
    if (this.options.adaptiveMargin) {
      this.setupScrollListener();
    }
    
    // 节点ID生成器
    this.nodeIdCounter = 0;
    this.nodeIdMap = new WeakMap();
    
    console.log('StreamingPageProcessor 初始化完成');
  }

  /**
   * 处理整个页面 - 流式处理入口
   * @returns {Promise<Object>} 处理结果统计
   */
  async processPage() {
    console.log('开始流式处理页面...');
    
    try {
      // 重置统计
      this.resetStats();
      
      // 等待词典加载
      await this.dictionaryManager.waitForLoad();
      
      // 快速扫描收集所有文本节点
      const textNodes = this.getTextNodes();
      console.log(`找到 ${textNodes.length} 个文本节点`);
      
      // 为每个文本节点创建占位符并注册观察
      this.registerTextNodes(textNodes);
      
      console.log(`已注册 ${this.processingQueue.size} 个节点到处理队列`);
      
      // 返回初始统计（处理会在后台异步进行）
      return {
        ...this.stats,
        totalNodes: textNodes.length,
        queuedNodes: this.processingQueue.size
      };
      
    } catch (error) {
      console.error('流式页面处理失败:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * 获取页面中所有有效的文本节点
   * @returns {Array<Node>} 文本节点数组
   */
  getTextNodes() {
    const textNodes = [];
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return this.shouldProcessNode(node) 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    return textNodes;
  }

  /**
   * 判断节点是否应该被处理
   * @param {Node} node 文本节点
   * @returns {boolean} 是否应该处理
   */
  shouldProcessNode(node) {
    if (!node || !node.textContent || node.textContent.trim().length < this.options.minTextLength) {
      return false;
    }

    const parent = node.parentElement;
    if (!parent) return false;

    // 检查标签名
    const tagName = parent.tagName.toLowerCase();
    if (this.options.excludedTags.includes(tagName)) {
      return false;
    }

    // 检查类名
    const className = parent.className;
    if (typeof className === 'string') {
      for (const excludedClass of this.options.excludedClasses) {
        if (className.includes(excludedClass)) {
          return false;
        }
      }
    }

    // 检查是否已处理
    if (this.processedNodes.has(node)) {
      return false;
    }

    // 检查是否隐藏
    if (this.isHiddenElement(parent)) {
      return false;
    }

    return true;
  }

  /**
   * 检查元素是否隐藏
   * @param {Element} element 要检查的元素
   * @returns {boolean} 是否隐藏
   */
  isHiddenElement(element) {
    const style = window.getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
  }

  /**
   * 注册文本节点到处理系统
   * @param {Array<Node>} textNodes 文本节点数组
   */
  registerTextNodes(textNodes) {
    textNodes.forEach(textNode => {
      // 为文本节点创建包装元素用于观察
      const wrapper = this.createObserverWrapper(textNode);
      
      // 生成唯一ID
      const nodeId = this.generateNodeId(textNode);
      
      // 计算优先级
      const priority = this.calculateNodePriority(textNode);
      
      // 添加到处理队列
      this.processingQueue.set(nodeId, {
        wrapper,
        textNode,
        priority,
        processed: false
      });
      
      // 开始观察
      this.intersectionObserver.observe(wrapper);
    });
    
    this.stats.queuedNodes = this.processingQueue.size;
  }

  /**
   * 为文本节点创建观察包装器
   * @param {Node} textNode 文本节点
   * @returns {Element} 包装元素
   */
  createObserverWrapper(textNode) {
    // 创建一个不可见的包装元素
    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
    wrapper.className = 'adhd-observer-wrapper';
    
    // 插入到文本节点前面
    textNode.parentNode.insertBefore(wrapper, textNode);
    
    return wrapper;
  }

  /**
   * 生成节点唯一ID
   * @param {Node} node 节点
   * @returns {string} 唯一ID
   */
  generateNodeId(node) {
    if (!this.nodeIdMap.has(node)) {
      this.nodeIdMap.set(node, `node_${this.nodeIdCounter++}`);
    }
    return this.nodeIdMap.get(node);
  }

  /**
   * 计算节点处理优先级
   * @param {Node} textNode 文本节点
   * @returns {number} 优先级分数（越高越优先）
   */
  calculateNodePriority(textNode) {
    let priority = 0;
    
    // 基于文本长度
    const textLength = textNode.textContent.length;
    priority += Math.min(textLength / 10, 50); // 最多50分
    
    // 基于元素位置（越靠上优先级越高）
    const rect = textNode.parentElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const positionScore = Math.max(0, viewportHeight - rect.top) / viewportHeight * 30;
    priority += positionScore;
    
    // 基于元素类型
    const tagName = textNode.parentElement.tagName.toLowerCase();
    const tagPriority = {
      'h1': 20, 'h2': 18, 'h3': 16, 'h4': 14, 'h5': 12, 'h6': 10,
      'p': 15, 'span': 10, 'div': 8, 'li': 12, 'td': 8, 'th': 10
    };
    priority += tagPriority[tagName] || 5;
    
    return Math.round(priority);
  }

  /**
   * 处理交叉观察事件 - 优化多阈值处理
   * @param {Array<IntersectionObserverEntry>} entries 交叉观察条目
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      const wrapper = entry.target;
      const intersectionRatio = entry.intersectionRatio;
      
      if (entry.isIntersecting) {
        // 元素进入视口，根据可见比例调整优先级
        this.stats.visibleNodes++;
        
        // 根据可见比例设置处理优先级
        let priority = 'normal';
        if (intersectionRatio >= 0.75) {
          priority = 'high'; // 75%以上可见，高优先级
        } else if (intersectionRatio >= 0.5) {
          priority = 'medium'; // 50-75%可见，中优先级
        } else if (intersectionRatio >= 0.25) {
          priority = 'normal'; // 25-50%可见，普通优先级
        } else {
          priority = 'low'; // 25%以下可见，低优先级
        }
        
        // 将优先级信息存储到wrapper上
        wrapper.dataset.visibilityPriority = priority;
        wrapper.dataset.intersectionRatio = intersectionRatio.toFixed(2);
        
        this.scheduleProcessing();
      } else {
        // 元素离开视口
        this.stats.visibleNodes = Math.max(0, this.stats.visibleNodes - 1);
        
        // 清理优先级信息
        delete wrapper.dataset.visibilityPriority;
        delete wrapper.dataset.intersectionRatio;
      }
    });
  }

  /**
   * 调度处理任务
   */
  scheduleProcessing() {
    if (this.processingScheduled || this.isProcessing) {
      return;
    }
    
    this.processingScheduled = true;
    
    // 使用 requestIdleCallback 在空闲时处理
    if (window.requestIdleCallback) {
      requestIdleCallback((deadline) => {
        this.processInIdleTime(deadline);
      }, { timeout: this.options.idleTimeout });
    } else {
      // 降级到 setTimeout
      setTimeout(() => {
        this.processInIdleTime({ timeRemaining: () => 16 }); // 模拟16ms
      }, 0);
    }
  }

  /**
   * 设置滚动监听器用于动态调整视口参数
   */
  setupScrollListener() {
    let scrollTimer = null;
    
    const handleScroll = () => {
      const now = performance.now();
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - this.lastScrollY);
      const timeDelta = now - this.lastScrollTime;
      
      // 计算滚动速度 (px/100ms)
      const scrollSpeed = timeDelta > 0 ? (scrollDelta / timeDelta) * 100 : 0;
      
      // 更新滚动历史
      this.scrollHistory.push({
        time: now,
        speed: scrollSpeed,
        position: currentScrollY
      });
      
      // 保持最近10次滚动记录
      if (this.scrollHistory.length > 10) {
        this.scrollHistory.shift();
      }
      
      // 更新状态
      this.lastScrollTime = now;
      this.lastScrollY = currentScrollY;
      
      // 清除之前的定时器
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      
      // 延迟调整参数，避免频繁更新
      scrollTimer = setTimeout(() => {
        this.adjustViewportParameters();
      }, 150);
    };
    
    // 添加滚动监听器
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // 存储监听器引用以便清理
    this.scrollListener = handleScroll;
  }

  /**
   * 根据滚动行为动态调整视口参数
   */
  adjustViewportParameters() {
    if (!this.options.adaptiveMargin || this.scrollHistory.length < 3) {
      return;
    }
    
    // 计算平均滚动速度
    const recentSpeeds = this.scrollHistory.slice(-5).map(record => record.speed);
    const avgSpeed = recentSpeeds.reduce((sum, speed) => sum + speed, 0) / recentSpeeds.length;
    
    // 根据滚动速度调整rootMargin
    let newMargin = this.currentRootMargin;
    
    if (avgSpeed > this.options.scrollSpeedThreshold) {
      // 快速滚动时增加预加载范围
      newMargin = Math.min(
        this.options.maxRootMargin,
        this.currentRootMargin + Math.floor(avgSpeed / 2)
      );
    } else if (avgSpeed < this.options.scrollSpeedThreshold / 3) {
      // 慢速滚动时减少预加载范围
      newMargin = Math.max(
        this.options.minRootMargin,
        this.currentRootMargin - 10
      );
    }
    
    // 如果边距发生变化，重新创建观察器
    if (newMargin !== this.currentRootMargin) {
      this.currentRootMargin = newMargin;
      this.recreateIntersectionObserver();
      
      console.log(`📊 动态调整视口参数: rootMargin=${newMargin}px (滚动速度: ${avgSpeed.toFixed(1)}px/100ms)`);
    }
  }

  /**
   * 重新创建IntersectionObserver
   */
  recreateIntersectionObserver() {
    // 获取当前观察的所有元素
    const observedElements = [];
    document.querySelectorAll('.adhd-observer-wrapper').forEach(wrapper => {
      observedElements.push(wrapper);
    });
    
    // 断开旧观察器
    this.intersectionObserver.disconnect();
    
    // 创建新观察器
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: `${this.currentRootMargin}px`,
        threshold: this.options.threshold
      }
    );
    
    // 重新观察所有元素
    observedElements.forEach(wrapper => {
      this.intersectionObserver.observe(wrapper);
    });
  }

  /**
   * 在空闲时间处理节点
   * @param {IdleDeadline} deadline 空闲时间截止点
   */
  processInIdleTime(deadline) {
    this.isProcessing = true;
    this.processingScheduled = false;
    
    const startTime = performance.now();
    let processedCount = 0;
    
    // 获取可见的未处理节点，按优先级排序
    const visibleNodes = this.getVisibleUnprocessedNodes();
    
    // 如果没有可见节点，增加空运行计数
    if (visibleNodes.length === 0) {
      this.consecutiveEmptyRuns++;
      this.isProcessing = false;
      return; // 直接返回，不继续调度
    }
    
    // 有节点时重置空运行计数
    this.consecutiveEmptyRuns = 0;
    this.lastProcessTime = startTime;
    
    // 在时间允许的情况下处理节点
    while (
      deadline.timeRemaining() > this.options.maxProcessingTime &&
      processedCount < this.options.batchSize &&
      visibleNodes.length > 0
    ) {
      const nodeData = visibleNodes.shift();
      
      try {
        this.processTextNode(nodeData.textNode);
        nodeData.processed = true;
        this.processedNodes.add(nodeData.textNode);
        
        // 清理观察器
        this.intersectionObserver.unobserve(nodeData.wrapper);
        nodeData.wrapper.remove();
        
        processedCount++;
        this.stats.processedNodes++;
        
      } catch (error) {
        console.warn('处理节点失败:', error);
        this.stats.errors++;
      }
    }
    
    this.isProcessing = false;
    
    const processingTime = performance.now() - startTime;
    
    // 只在有效处理时输出日志
    if (processedCount > 0) {
      console.log(`✅ 空闲处理完成: 处理了 ${processedCount} 个节点，耗时 ${processingTime.toFixed(2)}ms`);
    }
    
    // 智能继续调度：只有在有未处理节点且连续空运行次数未超限时才继续
    const remainingNodes = this.getVisibleUnprocessedNodes();
    if (remainingNodes.length > 0 && this.consecutiveEmptyRuns < this.maxEmptyRuns) {
      this.scheduleProcessing();
    }
  }

  /**
   * 获取可见的未处理节点
   * @returns {Array} 按优先级排序的节点数据
   */
  getVisibleUnprocessedNodes() {
    const visibleNodes = [];
    
    for (const [nodeId, nodeData] of this.processingQueue) {
      if (!nodeData.processed && this.isNodeVisible(nodeData.wrapper)) {
        visibleNodes.push(nodeData);
      }
    }
    
    // 按优先级排序（高优先级在前）
    return visibleNodes.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 检查节点是否可见
   * @param {Element} wrapper 包装元素
   * @returns {boolean} 是否可见
   */
  isNodeVisible(wrapper) {
    const rect = wrapper.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const margin = parseInt(this.options.rootMargin);
    
    return rect.top < (viewportHeight + margin) && rect.bottom > -margin;
  }

  /**
   * 处理单个文本节点
   * @param {Node} textNode 要处理的文本节点
   */
  processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text.trim()) {
      this.stats.skippedNodes++;
      return;
    }

    try {
      // 使用现有的多语言处理逻辑
      const segmentedHtml = this.processMultiLanguageText(text);
      
      // 如果有变化，替换节点
      if (segmentedHtml !== text) {
        this.replaceTextNode(textNode, segmentedHtml);
        
        // 统计高亮词汇数量
        const stats = this.textSegmenter.getSegmentationStats(segmentedHtml);
        this.stats.highlightedWords += stats.totalWords;
        
        // 触发高亮完成事件
        this.dispatchHighlightEvent(textNode, segmentedHtml, stats);
      }
      
    } catch (error) {
      console.warn('处理文本节点失败:', error);
      this.stats.errors++;
      this.stats.skippedNodes++;
    }
  }

  /**
   * 处理多语言文本
   * @param {string} text 原始文本
   * @returns {string} 处理后的HTML字符串
   */
  processMultiLanguageText(text) {
    // 获取所有启用的语言
    const enabledLanguages = this.dictionaryManager.getEnabledLanguages();
    
    if (enabledLanguages.length === 0) {
      return text;
    }
    
    // 如果只有一种语言启用，使用原有逻辑
    if (enabledLanguages.length === 1) {
      const language = enabledLanguages[0];
      const dictionary = this.dictionaryManager.getDictionary(language);
      if (dictionary && Object.keys(dictionary).length > 0) {
        return this.textSegmenter.segmentText(text, language, dictionary, this.dictionaryManager);
      }
      return text;
    }
    
    // 多语言处理：检测语言并使用对应词典
    const detectedLanguage = this.languageDetector.detectLanguage(text);
    if (enabledLanguages.includes(detectedLanguage)) {
      const dictionary = this.dictionaryManager.getDictionary(detectedLanguage);
      if (dictionary && Object.keys(dictionary).length > 0) {
        return this.textSegmenter.segmentText(text, detectedLanguage, dictionary, this.dictionaryManager);
      }
    }
    
    return text;
  }

  /**
   * 替换文本节点为高亮的HTML元素
   * @param {Node} textNode 原始文本节点
   * @param {string} html 高亮后的HTML
   * @private
   */
  replaceTextNode(textNode, html) {
    const isEdge = navigator.userAgent.includes('Edg');
    
    if (isEdge) {
      console.log('[Edge调试-DOM替换] 准备替换文本节点:', textNode.textContent.substring(0, 50) + '...');
      console.log('[Edge调试-DOM替换] 替换为HTML:', html.substring(0, 100) + '...');
    }
    
    const wrapper = document.createElement('span');
    wrapper.innerHTML = html;
    wrapper.className = 'adhd-processed';
    
    if (isEdge) {
      console.log('[Edge调试-DOM替换] 创建包装器元素，类名:', wrapper.className);
      console.log('[Edge调试-DOM替换] 包装器子元素数量:', wrapper.children.length);
    }
    
    // 替换节点
    try {
      textNode.parentNode.replaceChild(wrapper, textNode);
      if (isEdge) {
        console.log('[Edge调试-DOM替换] 节点替换成功');
        // 验证替换后的元素是否仍在DOM中
        setTimeout(() => {
          if (document.contains(wrapper)) {
            console.log('[Edge调试-DOM替换] 100ms后包装器仍在DOM中');
          } else {
            console.error('[Edge调试-DOM替换] 警告：100ms后包装器已从DOM中消失！');
          }
        }, 100);
      }
    } catch (error) {
      if (isEdge) console.error('[Edge调试-DOM替换] 节点替换失败:', error);
      throw error;
    }
  }

  /**
   * 移除所有高亮
   */
  removeAllHighlights() {
    console.log('开始移除所有高亮...');
    
    // 停止观察器
    this.intersectionObserver.disconnect();
    
    // 清理滚动监听器
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }
    
    // 清理处理队列
    this.processingQueue.clear();
    
    // 重置处理状态
    this.isProcessing = false;
    this.processingScheduled = false;
    this.consecutiveEmptyRuns = 0; // 重置智能终止机制状态
    
    // 移除所有高亮元素
    const highlightElements = document.querySelectorAll('.adhd-highlight');
    let removedCount = 0;
    
    highlightElements.forEach(element => {
      try {
        const parent = element.parentNode;
        if (parent) {
          // 将高亮元素的内容替换回原始文本
          const textContent = element.textContent;
          const textNode = document.createTextNode(textContent);
          parent.replaceChild(textNode, element);
          removedCount++;
        }
      } catch (error) {
        console.warn('移除高亮元素失败:', error);
      }
    });
    
    // 清理统计数据
    this.resetStats();
    
    console.log(`✅ 高亮移除完成，共移除 ${removedCount} 个高亮元素`);
    
    // 触发移除完成事件
    this.dispatchEvent(new CustomEvent('highlightsRemoved', {
      detail: {
        removedCount,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      processedNodes: 0,
      highlightedWords: 0,
      skippedNodes: 0,
      errors: 0,
      queuedNodes: 0,
      visibleNodes: 0
    };
  }

  /**
   * 获取处理统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.processingQueue.size,
      isProcessing: this.isProcessing
    };
  }

  /**
   * 更新配置选项
   * @param {Object} newOptions 新的配置选项
   */
  updateOptions(newOptions) {
    Object.assign(this.options, newOptions);
    
    // 如果更新了观察器相关配置，重新创建观察器
    if (newOptions.rootMargin || newOptions.threshold) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: this.options.rootMargin,
          threshold: this.options.threshold
        }
      );
    }
  }

  /**
   * 获取处理摘要
   * @returns {Object} 处理摘要信息
   */
  getProcessingSummary() {
    const stats = this.getStats();
    const totalNodes = stats.processedNodes + stats.queueSize;
    const progress = totalNodes > 0 ? (stats.processedNodes / totalNodes * 100).toFixed(1) : 0;
    
    return {
      progress: `${progress}%`,
      processed: stats.processedNodes,
      queued: stats.queueSize,
      visible: stats.visibleNodes,
      highlighted: stats.highlightedWords,
      errors: stats.errors,
      isActive: this.isProcessing || stats.queueSize > 0
    };
  }

  /**
   * 触发高亮完成事件
   */
  dispatchHighlightEvent(textNode, segmentedHtml, stats) {
    try {
      // 检测处理的语言
      const enabledLanguages = this.dictionaryManager.getEnabledLanguages();
      const detectedLanguage = this.languageDetector.detectLanguage(textNode.textContent);
      const language = enabledLanguages.includes(detectedLanguage) ? detectedLanguage : enabledLanguages[0];
      
      // 收集高亮元素信息
      const highlightElements = this.extractHighlightElements(segmentedHtml, language);
      
      // 创建事件数据
      const eventData = {
        language: language,
        originalText: textNode.textContent,
        segmentedHtml: segmentedHtml,
        elements: highlightElements,
        stats: stats,
        timestamp: Date.now()
      };
      
      // 触发事件
      this.dispatchEvent(new CustomEvent('highlightComplete', {
        detail: eventData
      }));
      
    } catch (error) {
      console.warn('触发高亮事件失败:', error);
    }
  }

  /**
   * 从分段HTML中提取高亮元素信息
   */
  extractHighlightElements(segmentedHtml, language) {
    const elements = [];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = segmentedHtml;
    
    const highlightSpans = tempDiv.querySelectorAll('span[class*="adhd-"]');
    
    highlightSpans.forEach(span => {
      elements.push({
        content: span.textContent,
        language: language,
        className: span.className,
        position: null, // 位置信息在实际DOM中才能获取
        styles: {
          backgroundColor: span.style.backgroundColor,
          color: span.style.color,
          fontWeight: span.style.fontWeight
        },
        metadata: {
          originalText: span.textContent,
          pos: span.dataset.pos,
          tagName: span.tagName.toLowerCase()
        }
      });
    });
    
    return elements;
  }
}

// 模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StreamingPageProcessor;
} else {
  window.StreamingPageProcessor = StreamingPageProcessor;
}