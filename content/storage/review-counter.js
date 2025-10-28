/**
 * ReviewCounter - 评价系统专用计数器
 * 
 * 功能说明：
 * 1. 专门用于评价提醒系统的计数器
 * 2. 与ReviewTimer同步重置（主版本更新时）
 * 3. 独立于DualCounter，DualCounter用于总体统计和彩蛋功能
 * 4. 仅统计节点处理次数，用于评价触发条件判断
 * 
 * 设计理念：
 * - DualCounter：累计统计，用于彩蛋、总数展示等
 * - ReviewCounter：评价专用，与计时器同步重置
 */

// 配置常量
const REVIEW_COUNTER_CONFIG = {
  // 存储键
  STORAGE_KEYS: {
    nodeCount: 'review_node_count',
    installVersion: 'review_counter_version',
    lastUpdateTime: 'review_counter_last_update',
    resetHistory: 'review_counter_reset_history'
  },
  
  // 触发阈值（与ReviewTimer配合使用）
  TRIGGER_THRESHOLDS: [
    { days: 7, nodes: 1000 },   // 第一次：7天 + 1000节点
    { days: 21, nodes: 5000 },  // 第二次：21天 + 5000节点
    { days: 50, nodes: 10000 }  // 第三次：50天 + 10000节点
  ],
  
  // 版本重置规则（与ReviewTimer保持一致）
  VERSION_RESET: {
    majorVersionReset: true,  // 主版本更新时重置
    minorVersionReset: false, // 次版本更新时不重置
    patchVersionReset: false  // 补丁版本更新时不重置
  }
};

class ReviewCounter {
  constructor() {
    this.config = REVIEW_COUNTER_CONFIG;
    this.currentVersion = chrome.runtime.getManifest().version;
  }

  /**
   * 初始化计数器
   * 在插件安装或启动时调用，与ReviewTimer同步
   */
  async init() {
    try {
      const stored = await this.getStoredData();
      const storedVersion = stored[this.config.STORAGE_KEYS.installVersion];
      
      // 检查是否需要重置（与ReviewTimer逻辑保持一致）
      if (!stored[this.config.STORAGE_KEYS.nodeCount] || this.shouldResetCounter(storedVersion)) {
        await this.resetCounter();
      }
      
      console.log('📊 ReviewCounter 已初始化');
      this.logCurrentStatus();
    } catch (error) {
      console.error('❌ ReviewCounter 初始化失败:', error);
    }
  }

  /**
   * 重置计数器
   */
  async resetCounter() {
    try {
      const now = Date.now();
      const resetData = {
        [this.config.STORAGE_KEYS.nodeCount]: 0,
        [this.config.STORAGE_KEYS.installVersion]: this.currentVersion,
        [this.config.STORAGE_KEYS.lastUpdateTime]: now
      };

      // 记录重置历史
      const resetHistory = await this.getResetHistory();
      resetHistory.push({
        timestamp: now,
        version: this.currentVersion,
        reason: 'version_update'
      });
      resetData[this.config.STORAGE_KEYS.resetHistory] = resetHistory;

      await chrome.storage.local.set(resetData);
      console.log('🔄 ReviewCounter 已重置，版本:', this.currentVersion);
    } catch (error) {
      console.error('❌ ReviewCounter 重置失败:', error);
    }
  }

  /**
   * 检查是否应该重置计数器
   */
  shouldResetCounter(storedVersion) {
    if (!storedVersion) return true;
    
    const current = this.parseVersion(this.currentVersion);
    const stored = this.parseVersion(storedVersion);
    
    // 主版本更新时重置（与ReviewTimer保持一致）
    if (this.config.VERSION_RESET.majorVersionReset && 
        current.major > stored.major) {
      console.log('🔄 检测到主版本更新，重置ReviewCounter');
      return true;
    }
    
    return false;
  }

  /**
   * 解析版本号
   */
  parseVersion(version) {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }

  /**
   * 增加节点计数
   * @param {number} count - 增加的节点数量，默认为1
   */
  async incrementNodeCount(count = 1) {
    try {
      const currentCount = await this.getNodeCount();
      const newCount = currentCount + count;
      
      await chrome.storage.local.set({
        [this.config.STORAGE_KEYS.nodeCount]: newCount,
        [this.config.STORAGE_KEYS.lastUpdateTime]: Date.now()
      });
      
      console.log(`📊 ReviewCounter 节点计数: ${currentCount} → ${newCount} (+${count})`);
      return newCount;
    } catch (error) {
      console.error('❌ ReviewCounter 节点计数更新失败:', error);
      return 0;
    }
  }

  /**
   * 获取节点计数
   */
  async getNodeCount() {
    try {
      const stored = await this.getStoredData();
      return stored[this.config.STORAGE_KEYS.nodeCount] || 0;
    } catch (error) {
      console.error('❌ 获取ReviewCounter节点计数失败:', error);
      return 0;
    }
  }

  /**
   * 检查是否满足评价触发条件
   * @param {number} days - 安装天数
   * @returns {Object} 触发检查结果
   */
  async checkTriggerCondition(days) {
    try {
      const nodeCount = await this.getNodeCount();
      
      // 查找匹配的触发条件
      for (let i = 0; i < this.config.TRIGGER_THRESHOLDS.length; i++) {
        const threshold = this.config.TRIGGER_THRESHOLDS[i];
        
        if (days >= threshold.days && nodeCount >= threshold.nodes) {
          return {
            shouldTrigger: true,
            triggerIndex: i,
            triggerDay: threshold.days,
            requiredNodes: threshold.nodes,
            currentNodes: nodeCount,
            message: `第${i + 1}次触发条件满足：${days}天 + ${nodeCount}节点`
          };
        }
      }
      
      // 找到下一个可能的触发点
      const nextThreshold = this.config.TRIGGER_THRESHOLDS.find(t => 
        days < t.days || nodeCount < t.nodes
      );
      
      if (nextThreshold) {
        const daysNeeded = Math.max(0, nextThreshold.days - days);
        const nodesNeeded = Math.max(0, nextThreshold.nodes - nodeCount);
        
        return {
          shouldTrigger: false,
          nextTrigger: nextThreshold,
          daysNeeded,
          nodesNeeded,
          currentNodes: nodeCount,
          message: `还需 ${daysNeeded}天 或 ${nodesNeeded}节点`
        };
      }
      
      return {
        shouldTrigger: false,
        message: '所有触发条件已完成',
        currentNodes: nodeCount
      };
    } catch (error) {
      console.error('❌ ReviewCounter 触发条件检查失败:', error);
      return { shouldTrigger: false, error: error.message };
    }
  }

  /**
   * 获取存储数据
   */
  async getStoredData() {
    try {
      const keys = Object.values(this.config.STORAGE_KEYS);
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.error('❌ ReviewCounter 获取存储数据失败:', error);
      return {};
    }
  }

  /**
   * 获取重置历史
   */
  async getResetHistory() {
    try {
      const stored = await this.getStoredData();
      return stored[this.config.STORAGE_KEYS.resetHistory] || [];
    } catch (error) {
      console.error('❌ 获取重置历史失败:', error);
      return [];
    }
  }

  /**
   * 输出当前状态日志
   */
  async logCurrentStatus() {
    try {
      const nodeCount = await this.getNodeCount();
      const stored = await this.getStoredData();
      const version = stored[this.config.STORAGE_KEYS.installVersion] || 'unknown';
      
      console.log(`📊 ReviewCounter 状态: ${nodeCount}节点 (版本: ${version})`);
      console.log('🎯 触发阈值: 7天1000节点 | 21天5000节点 | 50天10000节点');
    } catch (error) {
      console.error('❌ ReviewCounter 状态日志输出失败:', error);
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    try {
      const stored = await this.getStoredData();
      const nodeCount = stored[this.config.STORAGE_KEYS.nodeCount] || 0;
      const version = stored[this.config.STORAGE_KEYS.installVersion] || 'unknown';
      const lastUpdate = stored[this.config.STORAGE_KEYS.lastUpdateTime] || 0;
      const resetHistory = stored[this.config.STORAGE_KEYS.resetHistory] || [];
      
      return {
        nodeCount,
        version,
        lastUpdate: lastUpdate ? new Date(lastUpdate).toLocaleString() : 'never',
        resetCount: resetHistory.length,
        resetHistory,
        thresholds: this.config.TRIGGER_THRESHOLDS
      };
    } catch (error) {
      console.error('❌ ReviewCounter 获取统计信息失败:', error);
      return null;
    }
  }

  /**
   * 重置所有数据（仅用于调试）
   */
  async reset() {
    try {
      const keys = Object.values(this.config.STORAGE_KEYS);
      await chrome.storage.local.remove(keys);
      await this.init();
      console.log('🧪 ReviewCounter 已完全重置');
    } catch (error) {
      console.error('❌ ReviewCounter 重置失败:', error);
    }
  }
}

// 调试类
class ReviewCounterDebug {
  constructor(counter) {
    this.counter = counter;
  }

  /**
   * 获取完整状态
   */
  async getFullStatus() {
    const stats = await this.counter.getStats();
    const stored = await this.counter.getStoredData();
    
    return {
      stats,
      storedData: stored,
      config: this.counter.config
    };
  }

  /**
   * 模拟节点增加
   */
  async simulateNodes(count) {
    await this.counter.incrementNodeCount(count);
    console.log(`🧪 模拟增加 ${count} 个节点`);
  }

  /**
   * 测试触发条件
   */
  async testTriggerCondition(days) {
    const result = await this.counter.checkTriggerCondition(days);
    console.log(`🧪 测试 ${days} 天触发条件:`, result);
    return result;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReviewCounter, ReviewCounterDebug };
} else {
  window.ReviewCounter = ReviewCounter;
  window.ReviewCounterDebug = ReviewCounterDebug;
}