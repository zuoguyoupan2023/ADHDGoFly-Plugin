/**
 * ReviewTimer - 评价提醒计时器系统
 * 
 * 功能：
 * - 跟踪插件安装时间
 * - 在特定时间节点（7天、21天、50天）提供触发信号
 * - 支持版本更新时的计时器重置
 * - 提供调试和状态查询接口
 * 
 * 设计原则：
 * - 独立模块，不影响现有评价提醒逻辑
 * - 实时计算，不依赖持久化定时器
 * - 精度灵活，支持天/小时/分钟级别显示
 * - 合规安全，符合商店政策
 */

const REVIEW_TIMER_CONFIG = {
  // 存储键配置存储键
  STORAGE_KEYS: {
    installTime: 'review_install_timestamp',
    installVersion: 'review_install_version',
    lastCheckTime: 'review_last_check_timestamp', 
    triggerHistory: 'review_trigger_history',
    dismissedForever: 'review_dismissed_forever',
    lastChoice: 'review_last_choice'
  },
  
  // 精度配置
  PRECISION: {
    showHours: true,    // 显示小时
    showMinutes: true,  // 显示分钟
    logInterval: 24     // 日志输出间隔（小时）
  },
  
  // 版本重置规则
  VERSION_RESET: {
    majorVersionReset: true,  // 主版本更新时重置
    minorVersionReset: false, // 次版本更新时不重置
    patchVersionReset: false  // 补丁版本更新时不重置
  }
};

class ReviewTimer {
  constructor() {
    this.config = REVIEW_TIMER_CONFIG;
    this.currentVersion = chrome.runtime.getManifest().version;
  }

  /**
   * 初始化计时器
   * 在插件安装或启动时调用
   */
  async init() {
    try {
      const stored = await this.getStoredData();
      const installTime = stored[this.config.STORAGE_KEYS.installTime];
      const installVersion = stored[this.config.STORAGE_KEYS.installVersion];
      
      if (!installTime || this.shouldResetTimer(installVersion)) {
        await this.recordInstallTime();
      }
      
      await this.logCurrentStatus();
    } catch (error) {
      console.error('ReviewTimer初始化失败:', error);
    }
  }

  /**
   * 记录安装时间
   */
  async recordInstallTime() {
    const now = Date.now();
    const data = {
      [this.config.STORAGE_KEYS.installTime]: now,
      [this.config.STORAGE_KEYS.installVersion]: this.currentVersion,
      [this.config.STORAGE_KEYS.triggerHistory]: [],
      [this.config.STORAGE_KEYS.dismissedForever]: false
    };
    
    await chrome.storage.local.set(data);
    console.log('ReviewTimer：📅 计时器已初始化，安装时间:', new Date(now).toLocaleString());
  }

  /**
   * 计算安装后的时间
   */
  calculateTimeSinceInstall(installTime) {
    const now = Date.now();
    const diffMs = now - installTime;
    
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    
    return { days, hours, minutes, totalMs: diffMs };
  }

  /**
   * 检查是否应该重置计时器
   */
  shouldResetTimer(storedVersion) {
    if (!storedVersion) return true;
    
    const current = this.parseVersion(this.currentVersion);
    const stored = this.parseVersion(storedVersion);
    
    // 主版本更新时重置
    if (this.config.VERSION_RESET.majorVersionReset && 
        current.major > stored.major) {
      console.log('ReviewTimer：🔄 检测到主版本更新，重置计时器');
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
   * 记录用户选择（用于跟踪用户行为）
   */
  async recordTrigger(userChoice) {
    try {
      const updateData = {
        [this.config.STORAGE_KEYS.lastChoice]: userChoice
      };
      
      if (userChoice === 'never') {
        updateData[this.config.STORAGE_KEYS.dismissedForever] = true;
      }
      
      await chrome.storage.local.set(updateData);
      console.log(`ReviewTimer：📝 记录用户选择：${userChoice}`);
      
    } catch (error) {
      console.error('ReviewTimer：记录用户选择失败:', error);
    }
  }

  /**
   * 获取存储的数据
   */
  async getStoredData() {
    const keys = Object.values(this.config.STORAGE_KEYS);
    const result = await chrome.storage.local.get(keys);
    return result;
  }

  /**
   * 输出当前状态日志
   */
  async logCurrentStatus() {
    try {
      const stored = await this.getStoredData();
      const installTime = stored[this.config.STORAGE_KEYS.installTime];
      
      if (!installTime) {
        console.log('📅 计时器尚未初始化');
        return;
      }

      const { days, hours, minutes } = this.calculateTimeSinceInstall(installTime);
      const triggerHistory = stored[this.config.STORAGE_KEYS.triggerHistory] || [];
      
      // 格式化安装时间为 yyyy-mm-dd hh:mm
      const installDate = new Date(installTime);
      const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
      };
      
      console.log(`📅 ReviewTimer：插件安装${days}天${hours}小时${minutes}分钟 (${formatDateTime(installDate)})`);
      console.log('⏰ ReviewTimer：本计时器仅用于时间统计，触发逻辑由 ReviewLightTower 控制');
      
      if (stored[this.config.STORAGE_KEYS.dismissedForever]) {
        console.log('ReviewTimer：🚫 用户已选择永不提醒');
      }
    } catch (error) {
      console.error('ReviewTimer：输出状态日志失败:', error);
    }
  }

  /**
   * 获取格式化的安装时间信息
   */
  async getFormattedInstallInfo() {
    try {
      const stored = await this.getStoredData();
      const installTime = stored[this.config.STORAGE_KEYS.installTime];
      
      if (!installTime) return null;

      const { days, hours, minutes } = this.calculateTimeSinceInstall(installTime);
      const installDate = new Date(installTime);
      
      // 格式化为 yyyy-mm-dd hh:mm
      const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
      };
      
      return {
        days,
        hours,
        minutes,
        formatted: `${days}天${hours}小时${minutes}分钟`,
        installDate: installDate.toLocaleString(),
        installDateTime: formatDateTime(installDate), // 新增精确时间格式
        version: stored[this.config.STORAGE_KEYS.installVersion] || 'unknown',
        triggerHistory: stored[this.config.STORAGE_KEYS.triggerHistory] || [],
        dismissedForever: stored[this.config.STORAGE_KEYS.dismissedForever] || false
      };
    } catch (error) {
      console.error('ReviewTimer：获取安装信息失败:', error);
      return null;
    }
  }

  /**
   * 获取统计信息（用于调试和监控）
   */
  async getStats() {
    try {
      const stored = await this.getStoredData();
      const installTime = stored[this.config.STORAGE_KEYS.installTime];
      
      if (!installTime) return null;

      const timeInfo = this.calculateTimeSinceInstall(installTime);
      
      return {
        installTime,
        installDate: new Date(installTime).toISOString(),
        daysSinceInstall: timeInfo.days,
        hoursSinceInstall: timeInfo.hours,
        minutesSinceInstall: timeInfo.minutes,
        totalMs: timeInfo.totalMs,
        version: stored[this.config.STORAGE_KEYS.installVersion],
        dismissedForever: stored[this.config.STORAGE_KEYS.dismissedForever] || false,
        lastChoice: stored[this.config.STORAGE_KEYS.lastChoice],
        triggerHistory: stored[this.config.STORAGE_KEYS.triggerHistory] || []
      };
    } catch (error) {
      console.error('ReviewTimer：获取统计信息失败:', error);
      return null;
    }
  }

  /**
   * 重置计时器（仅用于测试或数据清理）
   */
  async reset() {
    try {
      const keys = Object.values(this.config.STORAGE_KEYS);
      await chrome.storage.local.remove(keys);
      await this.initialize();
      console.log('ReviewTimer：🧪 计时器已重置');
    } catch (error) {
      console.error('ReviewTimer：重置计时器失败:', error);
    }
  }
}

/**
 * 调试工具类
 */
class ReviewTimerDebug {
  constructor(timer) {
    this.timer = timer;
  }
  
  /**
   * 获取完整的计时器状态
   */
  async getFullStatus() {
    const stored = await this.timer.getStoredData();
    const installInfo = await this.timer.getFormattedInstallInfo();
    const triggerCheck = await this.timer.checkTriggerCondition();
    const stats = await this.timer.getStats();
    
    return {
      installInfo,
      triggerCheck,
      stats,
      storedData: stored,
      config: this.timer.config
    };
  }
  
  /**
   * 模拟时间推进（仅用于测试）
   */
  async simulateTimeAdvance(days) {
    const stored = await this.timer.getStoredData();
    if (!stored.installTime) {
      console.log('ReviewTimer：⚠️ 计时器尚未初始化，无法模拟时间推进');
      return;
    }
    
    const newInstallTime = stored.installTime - (days * 24 * 60 * 60 * 1000);
    await chrome.storage.local.set({
      [this.timer.config.STORAGE_KEYS.installTime]: newInstallTime
    });
    
    console.log(`ReviewTimer：🧪 模拟时间推进${days}天`);
    await this.timer.logCurrentStatus();
  }
  
  /**
   * 重置计时器（仅用于测试）
   */
  async resetTimer() {
    await this.timer.reset();
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReviewTimer, ReviewTimerDebug };
} else {
  window.ReviewTimer = ReviewTimer;
  window.ReviewTimerDebug = ReviewTimerDebug;
}