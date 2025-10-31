/**
 * 节点级缓存性能监控工具
 * 提供实时性能统计和调试功能
 */
class CachePerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.performanceHistory = [];
    this.maxHistoryLength = 100;
  }

  /**
   * 开始性能监控
   * @param {StreamingPageProcessor} processor 页面处理器实例
   * @param {number} intervalMs 监控间隔（毫秒）
   */
  startMonitoring(processor, intervalMs = 5000) {
    if (this.isMonitoring) {
      console.warn('性能监控已在运行中');
      return;
    }

    this.processor = processor;
    this.isMonitoring = true;
    
    console.log('🚀 开始节点级缓存性能监控');
    
    this.monitoringInterval = setInterval(async () => {
      await this.collectPerformanceData();
    }, intervalMs);

    // 立即收集一次数据
    this.collectPerformanceData();
  }

  /**
   * 停止性能监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('⏹️ 停止节点级缓存性能监控');
  }

  /**
   * 收集性能数据
   */
  async collectPerformanceData() {
    if (!this.processor) {
      return;
    }

    try {
      const performanceStats = await this.processor.getCachePerformanceStats();
      const timestamp = Date.now();

      if (performanceStats) {
        const dataPoint = {
          timestamp,
          ...performanceStats
        };

        this.performanceHistory.push(dataPoint);

        // 限制历史记录长度
        if (this.performanceHistory.length > this.maxHistoryLength) {
          this.performanceHistory.shift();
        }

        // 输出实时统计
        this.logPerformanceStats(dataPoint);
      }
    } catch (error) {
      console.error('收集性能数据失败:', error);
    }
  }

  /**
   * 输出性能统计日志
   * @param {Object} stats 性能统计数据
   */
  logPerformanceStats(stats) {
    const {
      hitRate,
      cacheOperations,
      avgCacheTime,
      avgTotalTime,
      estimatedSpeedup,
      storage
    } = stats;

    console.group('📊 节点级缓存性能统计');
    console.log(`🎯 缓存命中率: ${hitRate}%`);
    console.log(`⚡ 平均缓存处理时间: ${avgCacheTime}ms`);
    console.log(`🕐 平均总处理时间: ${avgTotalTime}ms`);
    console.log(`🚀 性能提升: ${estimatedSpeedup.speedup}x (节省 ${estimatedSpeedup.timeSaved}ms)`);
    
    console.group('📈 缓存操作统计');
    console.log(`✅ 命中: ${cacheOperations.hits}`);
    console.log(`❌ 未命中: ${cacheOperations.misses}`);
    console.log(`💾 存储: ${cacheOperations.stores}`);
    console.log(`⚠️ 错误: ${cacheOperations.errors}`);
    console.groupEnd();

    if (storage) {
      console.group('🗄️ 存储统计');
      console.log(`📦 总条目: ${storage.totalEntries}`);
      console.log(`💽 估算大小: ${storage.estimatedSize}`);
      console.log(`📊 命中率: ${storage.hitRate}`);
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * 获取性能趋势分析
   * @returns {Object} 趋势分析结果
   */
  getPerformanceTrends() {
    if (this.performanceHistory.length < 2) {
      return null;
    }

    const recent = this.performanceHistory.slice(-10);
    const hitRates = recent.map(d => parseFloat(d.hitRate));
    const avgTimes = recent.map(d => parseFloat(d.avgTotalTime));

    return {
      hitRateTrend: this.calculateTrend(hitRates),
      processingTimeTrend: this.calculateTrend(avgTimes),
      dataPoints: recent.length,
      timeSpan: recent[recent.length - 1].timestamp - recent[0].timestamp
    };
  }

  /**
   * 计算趋势
   * @param {number[]} values 数值数组
   * @returns {string} 趋势描述
   */
  calculateTrend(values) {
    if (values.length < 2) return 'insufficient_data';

    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;

    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * 生成性能报告
   * @returns {Object} 性能报告
   */
  generatePerformanceReport() {
    if (this.performanceHistory.length === 0) {
      return { error: '没有性能数据' };
    }

    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    const trends = this.getPerformanceTrends();

    return {
      timestamp: new Date().toISOString(),
      summary: {
        monitoringDuration: this.performanceHistory.length > 1 ? 
          latest.timestamp - this.performanceHistory[0].timestamp : 0,
        dataPoints: this.performanceHistory.length,
        currentHitRate: latest.hitRate,
        currentSpeedup: latest.estimatedSpeedup.speedup
      },
      trends,
      recommendations: this.generateRecommendations(latest, trends)
    };
  }

  /**
   * 生成性能优化建议
   * @param {Object} latest 最新性能数据
   * @param {Object} trends 趋势数据
   * @returns {string[]} 建议列表
   */
  generateRecommendations(latest, trends) {
    const recommendations = [];
    const hitRate = parseFloat(latest.hitRate);

    if (hitRate < 30) {
      recommendations.push('缓存命中率较低，考虑调整缓存策略或增加缓存时间');
    } else if (hitRate > 80) {
      recommendations.push('缓存命中率很高，性能表现良好');
    }

    if (latest.cacheOperations.errors > 0) {
      recommendations.push('存在缓存错误，建议检查存储配置和错误日志');
    }

    if (trends && trends.hitRateTrend === 'decreasing') {
      recommendations.push('缓存命中率呈下降趋势，可能需要清理过期缓存或调整失效策略');
    }

    if (parseFloat(latest.estimatedSpeedup.speedup) < 1.5) {
      recommendations.push('性能提升有限，考虑优化缓存键生成算法或缓存验证逻辑');
    }

    return recommendations;
  }

  /**
   * 导出性能数据
   * @returns {string} JSON格式的性能数据
   */
  exportPerformanceData() {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      monitoringHistory: this.performanceHistory,
      report: this.generatePerformanceReport()
    }, null, 2);
  }

  /**
   * 清除性能历史数据
   */
  clearHistory() {
    this.performanceHistory = [];
    console.log('🗑️ 已清除性能监控历史数据');
  }
}

// 全局调试工具
if (typeof window !== 'undefined') {
  window.CachePerformanceMonitor = CachePerformanceMonitor;
  
  // 提供便捷的全局调试方法
  window.debugCache = {
    monitor: null,
    
    start(processor, interval = 5000) {
      if (!this.monitor) {
        this.monitor = new CachePerformanceMonitor();
      }
      this.monitor.startMonitoring(processor, interval);
    },
    
    stop() {
      if (this.monitor) {
        this.monitor.stopMonitoring();
      }
    },
    
    report() {
      if (this.monitor) {
        const report = this.monitor.generatePerformanceReport();
        console.log('📋 缓存性能报告:', report);
        return report;
      }
      return null;
    },
    
    export() {
      if (this.monitor) {
        const data = this.monitor.exportPerformanceData();
        console.log('📤 导出性能数据:', data);
        return data;
      }
      return null;
    },
    
    clear() {
      if (this.monitor) {
        this.monitor.clearHistory();
      }
    }
  };
  
  console.log('🔧 缓存性能调试工具已加载');
  console.log('使用 window.debugCache.start(processor) 开始监控');
  console.log('使用 window.debugCache.report() 查看性能报告');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CachePerformanceMonitor;
}