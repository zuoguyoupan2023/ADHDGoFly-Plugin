/**
 * 独立词汇统计计数器
 * 功能：在分词标注过程中自动记录名词、动词、形容词的出现次数
 * 存储：使用localStorage，数据保存15分钟
 * 输出：控制台显示统计结果
 */

class VocabularyCounter {
  constructor() {
    this.storageKey = 'adhd_vocabulary_stats';
    this.expirationTime = 15 * 60 * 1000; // 15分钟
    this.stats = this.loadStats();
    this.initCleanupTimer();
  }

  /**
   * 从localStorage加载统计数据
   */
  loadStats() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return this.createEmptyStats();
      }

      const data = JSON.parse(stored);
      
      // 检查是否过期
      if (Date.now() - data.timestamp > this.expirationTime) {
        console.log('📊 词汇统计数据已过期，重新开始统计');
        localStorage.removeItem(this.storageKey);
        return this.createEmptyStats();
      }

      console.log('📊 加载已有词汇统计数据');
      return data;
    } catch (error) {
      console.error('加载词汇统计数据失败:', error);
      return this.createEmptyStats();
    }
  }

  /**
   * 创建空的统计数据结构
   */
  createEmptyStats() {
    return {
      timestamp: Date.now(),
      stats: {
        nouns: {},
        verbs: {},
        adjectives: {}
      },
      summary: {
        totalNouns: 0,
        totalVerbs: 0,
        totalAdjectives: 0,
        uniqueNouns: 0,
        uniqueVerbs: 0,
        uniqueAdjectives: 0
      }
    };
  }

  /**
   * 记录词汇
   * @param {string} word - 词汇
   * @param {string} pos - 词性 ('n', 'v', 'a')
   */
  recordWord(word, pos) {
    if (!word || !pos) return;

    // 清理词汇（去除标点符号，转小写）
    const cleanWord = word.toLowerCase().replace(/[^\w\u00C0-\u017F\u0400-\u04FF\u4e00-\u9fff]/g, '');
    if (!cleanWord) return;

    let category;
    switch (pos) {
      case 'n':
        category = 'nouns';
        break;
      case 'v':
        category = 'verbs';
        break;
      case 'a':
        category = 'adjectives';
        break;
      default:
        return; // 只记录名词、动词、形容词
    }

    // 更新计数
    if (!this.stats.stats[category][cleanWord]) {
      this.stats.stats[category][cleanWord] = 0;
    }
    this.stats.stats[category][cleanWord]++;

    // 更新汇总统计
    this.updateSummary();

    // 保存到localStorage
    this.saveStats();

    // 调试输出
    if (window.__LOG_DEV_MODE) console.log(`📝 记录词汇: ${cleanWord} (${pos}) - 第${this.stats.stats[category][cleanWord]}次`);
  }

  /**
   * 更新汇总统计
   */
  updateSummary() {
    const stats = this.stats.stats;
    
    this.stats.summary = {
      totalNouns: Object.values(stats.nouns).reduce((sum, count) => sum + count, 0),
      totalVerbs: Object.values(stats.verbs).reduce((sum, count) => sum + count, 0),
      totalAdjectives: Object.values(stats.adjectives).reduce((sum, count) => sum + count, 0),
      uniqueNouns: Object.keys(stats.nouns).length,
      uniqueVerbs: Object.keys(stats.verbs).length,
      uniqueAdjectives: Object.keys(stats.adjectives).length
    };
  }

  /**
   * 保存统计数据到localStorage
   */
  saveStats() {
    try {
      this.stats.timestamp = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    } catch (error) {
      console.error('保存词汇统计数据失败:', error);
    }
  }

  /**
   * 获取统计结果
   */
  getStats() {
    return {
      ...this.stats,
      isExpired: Date.now() - this.stats.timestamp > this.expirationTime
    };
  }

  /**
   * 输出统计结果到控制台
   */
  outputStats() {
    const stats = this.getStats();
    
    console.log('\n🎯 ===== ADHDGoFly 词汇统计报告 =====');
    console.log(`📅 统计时间: ${new Date(stats.timestamp).toLocaleString()}`);
    console.log(`⏰ 数据状态: ${stats.isExpired ? '已过期' : '有效'}`);
    
    console.log('\n📊 汇总统计:');
    console.log(`📝 名词: ${stats.summary.totalNouns} 个 (${stats.summary.uniqueNouns} 个不同词汇)`);
    console.log(`🏃 动词: ${stats.summary.totalVerbs} 个 (${stats.summary.uniqueVerbs} 个不同词汇)`);
    console.log(`🎨 形容词: ${stats.summary.totalAdjectives} 个 (${stats.summary.uniqueAdjectives} 个不同词汇)`);
    
    // 显示高频词汇
    this.outputTopWords('名词', stats.stats.nouns, '📝');
    this.outputTopWords('动词', stats.stats.verbs, '🏃');
    this.outputTopWords('形容词', stats.stats.adjectives, '🎨');
    
    console.log('=====================================\n');
  }

  /**
   * 输出高频词汇
   */
  outputTopWords(category, words, emoji, limit = 10) {
    const sortedWords = Object.entries(words)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);
    
    if (sortedWords.length > 0) {
      console.log(`\n${emoji} 高频${category} (前${Math.min(limit, sortedWords.length)}个):`);
      sortedWords.forEach(([word, count], index) => {
        console.log(`  ${index + 1}. ${word}: ${count}次`);
      });
    }
  }

  /**
   * 获取指定类别的前N个高频词汇
   * @param {string} category - 词汇类别 ('nouns', 'verbs', 'adjectives')
   * @param {number} limit - 返回词汇数量限制，默认不限制
   * @returns {Array} 排序后的词汇数组
   */
  getTopWords(category, limit = null) {
    const words = this.stats.stats[category] || {};
    const sorted = Object.entries(words)
      .sort(([,a], [,b]) => b - a)
      .map(([word, count]) => ({ word, count }));
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * 获取所有类别的高频词汇
   * @param {number} limit - 每个类别返回的词汇数量限制，默认不限制
   * @returns {Object} 包含各类别词汇的对象
   */
  getTopWordsByCategory(limit = null) {
    return {
      nouns: this.getTopWords('nouns', limit),
      verbs: this.getTopWords('verbs', limit),
      adjectives: this.getTopWords('adjectives', limit)
    };
  }

  /**
   * 重置统计数据
   */
  reset() {
    this.stats = this.createEmptyStats();
    localStorage.removeItem(this.storageKey);
    console.log('🔄 词汇统计数据已重置');
  }

  /**
   * 初始化清理定时器
   */
  initCleanupTimer() {
    // 每5分钟检查一次过期数据
    setInterval(() => {
      if (Date.now() - this.stats.timestamp > this.expirationTime) {
        console.log('🧹 自动清理过期的词汇统计数据');
        this.reset();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 获取详细统计信息（用于调试）
   */
  getDetailedStats() {
    return {
      summary: this.stats.summary,
      topNouns: Object.entries(this.stats.stats.nouns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20),
      topVerbs: Object.entries(this.stats.stats.verbs)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20),
      topAdjectives: Object.entries(this.stats.stats.adjectives)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
    };
  }
}

// 导出单例实例
window.vocabularyCounter = new VocabularyCounter();

// 添加全局方法供调试使用
window.showVocabStats = () => window.vocabularyCounter.outputStats();
window.resetVocabStats = () => window.vocabularyCounter.reset();
window.getVocabStats = () => window.vocabularyCounter.getDetailedStats();