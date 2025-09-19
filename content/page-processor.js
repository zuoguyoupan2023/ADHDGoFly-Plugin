// 页面处理器模块
class PageProcessor {
  constructor(dictionaryManager, languageDetector, textSegmenter) {
    this.dictionaryManager = dictionaryManager;
    this.languageDetector = languageDetector;
    this.textSegmenter = textSegmenter;
    
    // 处理统计
    this.stats = {
      processedNodes: 0,
      highlightedWords: 0,
      skippedNodes: 0,
      errors: 0
    };
    
    // 配置选项
    this.options = {
      maxNodesToProcess: 500,
      minTextLength: 2,
      excludedTags: ['script', 'style', 'noscript', 'svg', 'canvas'],
      excludedClasses: ['adhd-processed', 'adhd-highlight'],
      processTimeout: 5000 // 5秒超时
    };
  }

  /**
   * 处理整个页面
   * @returns {Promise<Object>} 处理结果统计
   */
  async processPage() {
    console.log('开始处理页面...');
    
    // 重置统计
    this.resetStats();
    
    try {
      // 等待词典加载
      await this.dictionaryManager.waitForLoad();
      
      // 获取所有文本节点
      const textNodes = this.getTextNodes();
      console.log(`找到 ${textNodes.length} 个文本节点`);
      
      // 按优先级排序
      const prioritizedNodes = this.prioritizeNodes(textNodes);
      
      // 处理节点（限制数量避免性能问题）
      const nodesToProcess = prioritizedNodes.slice(0, this.options.maxNodesToProcess);
      
      // 批量处理节点
      await this.processNodesInBatches(nodesToProcess);
      
      console.log('页面处理完成:', this.stats);
      return this.stats;
      
    } catch (error) {
      console.error('页面处理失败:', error);
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
   * 判断是否应该处理该文本节点
   * @param {Node} node 文本节点
   * @returns {boolean} 是否应该处理
   * @private
   */
  shouldProcessNode(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    
    // 检查标签名
    const tagName = parent.tagName.toLowerCase();
    if (this.options.excludedTags.includes(tagName)) {
      return false;
    }
    
    // 检查类名
    const className = parent.className || '';
    if (this.options.excludedClasses.some(cls => className.includes(cls))) {
      return false;
    }
    
    // 检查文本长度
    const text = node.textContent.trim();
    if (!text || text.length < this.options.minTextLength) {
      return false;
    }
    
    // 检查是否为隐藏元素
    if (this.isHiddenElement(parent)) {
      return false;
    }
    
    return true;
  }

  /**
   * 检查元素是否隐藏
   * @param {Element} element 要检查的元素
   * @returns {boolean} 是否隐藏
   * @private
   */
  isHiddenElement(element) {
    const style = window.getComputedStyle(element);
    return style.display === 'none' || 
           style.visibility === 'hidden' || 
           style.opacity === '0';
  }

  /**
   * 按优先级对节点进行排序
   * @param {Array<Node>} textNodes 文本节点数组
   * @returns {Array<Node>} 排序后的节点数组
   */
  prioritizeNodes(textNodes) {
    return textNodes.sort((a, b) => {
      const aParent = a.parentElement;
      const bParent = b.parentElement;
      
      if (!aParent || !bParent) return 0;
      
      // 标签优先级权重
      const tagPriorities = {
        'h1': 100, 'h2': 90, 'h3': 80, 'h4': 70, 'h5': 60, 'h6': 50,
        'title': 95,
        'p': 40, 'li': 35, 'td': 30, 'th': 30, 'blockquote': 25,
        'div': 20, 'span': 15, 'a': 10, 'label': 8
      };
      
      const aTag = aParent.tagName.toLowerCase();
      const bTag = bParent.tagName.toLowerCase();
      
      const aPriority = tagPriorities[aTag] || 5;
      const bPriority = tagPriorities[bTag] || 5;
      
      // 考虑文本长度（适中长度优先）
      const aLength = a.textContent.trim().length;
      const bLength = b.textContent.trim().length;
      
      const aLengthScore = this.calculateLengthScore(aLength);
      const bLengthScore = this.calculateLengthScore(bLength);
      
      // 综合评分
      const aScore = aPriority + aLengthScore;
      const bScore = bPriority + bLengthScore;
      
      return bScore - aScore;
    });
  }

  /**
   * 计算文本长度评分
   * @param {number} length 文本长度
   * @returns {number} 长度评分
   * @private
   */
  calculateLengthScore(length) {
    // 适中长度的文本优先处理
    if (length >= 20 && length <= 200) return 20;
    if (length >= 10 && length <= 500) return 15;
    if (length >= 5 && length <= 1000) return 10;
    return 5;
  }

  /**
   * 分批处理节点以避免阻塞UI
   * @param {Array<Node>} nodes 要处理的节点数组
   * @param {number} batchSize 批处理大小
   * @returns {Promise<void>}
   * @private
   */
  async processNodesInBatches(nodes, batchSize = 50) {
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      
      // 处理当前批次
      batch.forEach(node => {
        try {
          this.processTextNode(node);
        } catch (error) {
          console.warn('处理节点失败:', error);
          this.stats.errors++;
        }
      });
      
      // 让出控制权，避免阻塞UI
      if (i + batchSize < nodes.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
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
      // 检测语言
      const language = this.languageDetector.detectLanguage(text);
      
      // 获取对应语言的词典
      const dictionary = this.dictionaryManager.getDictionary(language);
      
      if (!dictionary || Object.keys(dictionary).length === 0) {
        this.stats.skippedNodes++;
        return;
      }
      
      // 进行分词和高亮
      const segmentedHtml = this.textSegmenter.segmentText(text, language, dictionary);
      
      // 如果有变化，替换节点
      if (segmentedHtml !== text) {
        this.replaceTextNode(textNode, segmentedHtml, language);
        
        // 统计高亮词汇数量
        const stats = this.textSegmenter.getSegmentationStats(segmentedHtml);
        this.stats.highlightedWords += stats.totalWords;
      }
      
      this.stats.processedNodes++;
      
    } catch (error) {
      console.warn('处理文本节点失败:', error);
      this.stats.errors++;
      this.stats.skippedNodes++;
    }
  }

  /**
   * 替换文本节点为高亮的HTML元素
   * @param {Node} textNode 原始文本节点
   * @param {string} html 高亮后的HTML
   * @param {string} language 检测到的语言
   * @private
   */
  replaceTextNode(textNode, html, language) {
    try {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = html;
      wrapper.className = 'adhd-processed';
      wrapper.setAttribute('data-language', language);
      wrapper.setAttribute('data-original-text', textNode.textContent);
      
      // 替换节点
      textNode.parentNode.replaceChild(wrapper, textNode);
      
    } catch (error) {
      console.warn('替换节点失败:', error);
      throw error;
    }
  }

  /**
   * 移除所有高亮
   */
  removeAllHighlights() {
    console.log('移除所有高亮...');
    
    try {
      const processedElements = document.querySelectorAll('.adhd-processed');
      let removedCount = 0;
      
      processedElements.forEach(element => {
        try {
          const originalText = element.getAttribute('data-original-text') || element.textContent;
          const textNode = document.createTextNode(originalText);
          element.parentNode.replaceChild(textNode, element);
          removedCount++;
        } catch (error) {
          console.warn('移除高亮失败:', error);
        }
      });
      
      console.log(`已移除 ${removedCount} 个高亮元素`);
      this.resetStats();
      
    } catch (error) {
      console.error('移除高亮过程出错:', error);
    }
  }

  /**
   * 重置统计信息
   * @private
   */
  resetStats() {
    this.stats = {
      processedNodes: 0,
      highlightedWords: 0,
      skippedNodes: 0,
      errors: 0
    };
  }

  /**
   * 获取处理统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 更新处理选项
   * @param {Object} newOptions 新的选项
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * 检查页面是否已处理
   * @returns {boolean} 是否已处理
   */
  isPageProcessed() {
    return document.querySelectorAll('.adhd-processed').length > 0;
  }

  /**
   * 获取页面处理摘要
   * @returns {Object} 处理摘要
   */
  getProcessingSummary() {
    const processedElements = document.querySelectorAll('.adhd-processed');
    const languages = new Set();
    
    processedElements.forEach(element => {
      const lang = element.getAttribute('data-language');
      if (lang) languages.add(lang);
    });
    
    return {
      totalProcessedElements: processedElements.length,
      detectedLanguages: Array.from(languages),
      stats: this.getStats()
    };
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageProcessor;
} else {
  window.PageProcessor = PageProcessor;
}