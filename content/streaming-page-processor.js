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
      // 视口相关配置
      rootMargin: '300px', // 提前300px开始处理
      threshold: 0.1, // 10%可见时触发
      
      // 处理相关配置
      maxProcessingTime: 5, // 每次空闲处理最多5ms
      batchSize: 10, // 每批处理10个节点
      maxQueueSize: 1000, // 最大队列长度
      
      // 性能相关配置
      idleTimeout: 1000, // 空闲回调超时时间
      minTextLength: 2,
      excludedTags: ['script', 'style', 'noscript', 'svg', 'canvas'],
      excludedClasses: ['adhd-processed', 'adhd-highlight']
    };
    
    // 处理队列和状态管理
    this.processingQueue = new Map(); // nodeId -> {element, textNode, priority}
    this.processedNodes = new WeakSet();
    this.isProcessing = false;
    this.processingScheduled = false;
    
    // IntersectionObserver 用于视感受知
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );
    
    // 节点ID生成器
    this.nodeIdCounter = 0;
    this.nodeIdMap = new WeakMap();
  }

  /**
   * 处理整个页面 - 流式处理入口
   * @returns {Promise<Object>} 处理结果统计
   */
  async processPage() {
    try {
      // 重置统计
      this.resetStats();
      
      // 等待词典加载
      await this.dictionaryManager.waitForLoad();
      
      // 快速扫描收集所有文本节点
      const textNodes = this.getTextNodes();
      
      // 为每个文本节点创建占位符并注册观察
      this.registerTextNodes(textNodes);
      
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
   * 处理交叉观察事件
   * @param {Array<IntersectionObserverEntry>} entries 交叉观察条目
   */
  handleIntersection(entries) {
    const isEdge = navigator.userAgent.includes('Edg');
    
    entries.forEach(entry => {
      const wrapper = entry.target;
      
      if (entry.isIntersecting) {
        // 元素进入视口，标记为可见并调度处理
        this.stats.visibleNodes++;
        if (isEdge) {
          console.log('[Edge调试-IntersectionObserver] 元素进入视口:', wrapper.className, '可见节点数:', this.stats.visibleNodes);
        }
        this.scheduleProcessing();
      } else {
        // 元素离开视口，可以考虑降低优先级或暂停处理
        this.stats.visibleNodes = Math.max(0, this.stats.visibleNodes - 1);
        if (isEdge) {
          console.log('[Edge调试-IntersectionObserver] 元素离开视口:', wrapper.className, '可见节点数:', this.stats.visibleNodes);
        }
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
    
    // 只在开发模式下显示详细处理日志
    if (process.env.NODE_ENV === 'development') {
      const processingTime = performance.now() - startTime;
      console.log(`空闲处理完成: 处理了 ${processedCount} 个节点，耗时 ${processingTime.toFixed(2)}ms`);
    }
    
    // 如果还有未处理的可见节点，继续调度
    if (this.getVisibleUnprocessedNodes().length > 0) {
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
    // 停止观察
    this.intersectionObserver.disconnect();
    
    // 清理处理队列
    this.processingQueue.clear();
    this.processedNodes = new WeakSet();
    
    // 移除所有高亮元素
    const highlightedElements = document.querySelectorAll('.adhd-processed');
    highlightedElements.forEach(element => {
      const textNode = document.createTextNode(element.textContent);
      element.parentNode.replaceChild(textNode, element);
    });
    
    // 移除观察包装器
    const wrappers = document.querySelectorAll('.adhd-observer-wrapper');
    wrappers.forEach(wrapper => wrapper.remove());
    
    this.resetStats();
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