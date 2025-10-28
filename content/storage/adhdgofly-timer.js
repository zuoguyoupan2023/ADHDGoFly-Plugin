/**
 * ADHDGoFly-Timer - 简单安装时间记录器
 * 
 * 功能：
 * - 记录插件安装时间
 * - 显示安装后经过的时间
 * - 独立于ReviewTimer的简单计时器
 * 
 * 设计原则：
 * - 独立模块，简单记录安装时间
 * - 不涉及触发逻辑，只做时间统计
 * - 永久记录，不会重置
 */

const ADHDGOFLY_TIMER_CONFIG = {
  // 存储键
  STORAGE_KEYS: {
    installTime: 'adhdgofly_install_timestamp',
    installVersion: 'adhdgofly_install_version'
  }
};

class ADHDGoFlyTimer {
  constructor() {
    this.config = ADHDGOFLY_TIMER_CONFIG;
    this.currentVersion = chrome.runtime.getManifest().version;
  }

  /**
   * 初始化计时器
   */
  async init() {
    try {
      const stored = await this.getStoredData();
      const installTime = stored[this.config.STORAGE_KEYS.installTime];
      
      if (!installTime) {
        await this.recordInstallTime();
      }
      
      await this.logCurrentStatus();
    } catch (error) {
      console.error('ADHDGoFly-Timer计时：初始化失败:', error);
    }
  }

  /**
   * 记录安装时间
   */
  async recordInstallTime() {
    const now = Date.now();
    const data = {
      [this.config.STORAGE_KEYS.installTime]: now,
      [this.config.STORAGE_KEYS.installVersion]: this.currentVersion
    };
    
    await chrome.storage.local.set(data);
    console.log('ADHDGoFly-Timer计时：📅 安装时间已记录:', new Date(now).toLocaleString());
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
   * 获取存储数据
   */
  async getStoredData() {
    const keys = Object.values(this.config.STORAGE_KEYS);
    return await chrome.storage.local.get(keys);
  }

  /**
   * 输出当前状态日志
   */
  async logCurrentStatus() {
    try {
      const stored = await this.getStoredData();
      const installTime = stored[this.config.STORAGE_KEYS.installTime];
      
      if (!installTime) {
        console.log('ADHDGoFly-Timer计时：📅 尚未记录安装时间');
        return;
      }

      const { days, hours, minutes } = this.calculateTimeSinceInstall(installTime);
      
      // 格式化安装时间
      const installDate = new Date(installTime);
      const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
      };
      
      console.log(`ADHDGoFly-Timer计时：📅 插件已安装${days}天${hours}小时${minutes}分钟 (${formatDateTime(installDate)})`);
      console.log('ADHDGoFly-Timer计时：⏰ 专注时间跟踪器运行中');
    } catch (error) {
      console.error('ADHDGoFly-Timer计时：输出状态日志失败:', error);
    }
  }

  /**
   * 获取安装时间信息
   */
  async getInstallInfo() {
    try {
      const stored = await this.getStoredData();
      const installTime = stored[this.config.STORAGE_KEYS.installTime];
      
      if (!installTime) return null;

      const { days, hours, minutes } = this.calculateTimeSinceInstall(installTime);
      const installDate = new Date(installTime);
      
      return {
        days,
        hours,
        minutes,
        formatted: `${days}天${hours}小时${minutes}分钟`,
        installDate: installDate.toLocaleString(),
        version: stored[this.config.STORAGE_KEYS.installVersion] || 'unknown'
      };
    } catch (error) {
      console.error('ADHDGoFly-Timer计时：获取安装信息失败:', error);
      return null;
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ADHDGoFlyTimer };
} else {
  window.ADHDGoFlyTimer = ADHDGoFlyTimer;
}