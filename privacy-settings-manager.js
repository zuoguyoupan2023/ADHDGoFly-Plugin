/**
 * 隐私设置管理器
 * 负责处理用户隐私设置的存储、读取和管理
 * 集成用户状态追踪功能
 */
class PrivacySettingsManager {
  constructor() {
    this.storageKey = 'privacySettings';
    this.defaultSettings = {
      analyticsEnabled: true, // 默认启用匿名信息收集
      lastUpdated: Date.now(),
      version: '1.0.0'
    };
    
    // 初始化用户状态管理器
    this.initUserStateManager();
  }

  /**
   * 初始化用户状态管理器
   */
  async initUserStateManager() {
    try {
      // 动态导入UserStateManager
      if (typeof UserStateManager !== 'undefined') {
        this.userStateManager = new UserStateManager();
        await this.userStateManager.initializeUserState();
        console.log('用户状态管理器初始化成功');
      }
    } catch (error) {
      console.error('用户状态管理器初始化失败:', error);
    }
  }

  /**
   * 获取隐私设置
   * @returns {Promise<Object>} 隐私设置对象
   */
  async getSettings() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const settings = result[this.storageKey];
      
      if (!settings) {
        // 如果没有设置，返回默认设置并保存
        await this.saveSettings(this.defaultSettings);
        return this.defaultSettings;
      }
      
      // 确保设置包含所有必要字段
      const mergedSettings = {
        ...this.defaultSettings,
        ...settings,
        lastUpdated: settings.lastUpdated || Date.now()
      };
      
      return mergedSettings;
    } catch (error) {
      console.error('获取隐私设置失败:', error);
      return this.defaultSettings;
    }
  }

  /**
   * 保存隐私设置
   * @param {Object} settings - 要保存的设置对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveSettings(settings) {
    try {
      const updatedSettings = {
        ...settings,
        lastUpdated: Date.now(),
        version: this.defaultSettings.version
      };
      
      await chrome.storage.local.set({
        [this.storageKey]: updatedSettings
      });
      
      console.log('隐私设置已保存:', updatedSettings);
      return true;
    } catch (error) {
      console.error('保存隐私设置失败:', error);
      return false;
    }
  }

  /**
   * 获取匿名信息收集设置
   * @returns {Promise<boolean>} 是否启用匿名信息收集
   */
  async isAnalyticsEnabled() {
    try {
      const settings = await this.getSettings();
      return settings.analyticsEnabled === true;
    } catch (error) {
      console.error('获取匿名信息收集设置失败:', error);
      // 出错时默认返回false，保护用户隐私
      return false;
    }
  }

  /**
   * 设置匿名信息收集开关
   * @param {boolean} enabled - 是否启用匿名信息收集
   * @returns {Promise<boolean>} 设置是否成功
   */
  async setAnalyticsEnabled(enabled) {
    try {
      const currentSettings = await this.getSettings();
      const wasEnabled = currentSettings.analyticsEnabled;
      const willBeEnabled = Boolean(enabled);
      
      const updatedSettings = {
        ...currentSettings,
        analyticsEnabled: willBeEnabled
      };
      
      const success = await this.saveSettings(updatedSettings);
      
      if (success) {
        // 触发设置变更事件，通知其他组件
        this.notifySettingsChanged('analyticsEnabled', enabled);
        
        // 如果用户状态管理器可用，更新用户状态
        if (this.userStateManager && wasEnabled !== willBeEnabled) {
          try {
            await this.userStateManager.updateUserState(willBeEnabled);
            console.log('用户状态已更新:', willBeEnabled ? '启用数据收集' : '禁用数据收集');
          } catch (stateError) {
            console.error('更新用户状态失败:', stateError);
            // 不影响主要功能，继续执行
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error('设置匿名信息收集开关失败:', error);
      return false;
    }
  }

  /**
   * 重置隐私设置到默认值
   * @returns {Promise<boolean>} 重置是否成功
   */
  async resetSettings() {
    try {
      const success = await this.saveSettings(this.defaultSettings);
      
      if (success) {
        console.log('隐私设置已重置到默认值');
        this.notifySettingsChanged('reset', this.defaultSettings);
      }
      
      return success;
    } catch (error) {
      console.error('重置隐私设置失败:', error);
      return false;
    }
  }

  /**
   * 监听隐私设置变更
   * @param {Function} callback - 变更回调函数
   */
  onSettingsChanged(callback) {
    if (typeof callback !== 'function') {
      console.error('回调函数无效');
      return;
    }

    // 监听Chrome存储变更
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes[this.storageKey]) {
        const change = changes[this.storageKey];
        callback({
          oldValue: change.oldValue,
          newValue: change.newValue,
          key: this.storageKey
        });
      }
    });
  }

  /**
   * 通知设置变更（内部方法）
   * @param {string} type - 变更类型
   * @param {*} value - 变更值
   */
  notifySettingsChanged(type, value) {
    try {
      // 发送消息给background script
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'PRIVACY_SETTINGS_CHANGED',
          data: {
            changeType: type,
            value: value,
            timestamp: Date.now()
          }
        }).catch(error => {
          // 忽略消息发送失败，避免影响主要功能
          console.debug('发送隐私设置变更消息失败:', error);
        });
      }
    } catch (error) {
      console.debug('通知隐私设置变更失败:', error);
    }
  }

  /**
   * 获取设置摘要信息
   * @returns {Promise<Object>} 设置摘要
   */
  async getSettingsSummary() {
    try {
      const settings = await this.getSettings();
      const summary = {
        analyticsEnabled: settings.analyticsEnabled,
        lastUpdated: new Date(settings.lastUpdated).toLocaleString(),
        version: settings.version
      };

      // 如果用户状态管理器可用，添加状态信息
      if (this.userStateManager) {
        try {
          const stateInfo = await this.userStateManager.getStateInfo();
          summary.userState = stateInfo;
        } catch (error) {
          console.error('获取用户状态信息失败:', error);
        }
      }

      return summary;
    } catch (error) {
      console.error('获取隐私设置摘要失败:', error);
      return {
        analyticsEnabled: false,
        lastUpdated: 'Unknown',
        version: 'Unknown'
      };
    }
  }

  /**
   * 获取用户状态信息
   * @returns {Promise<Object|null>} 用户状态信息
   */
  async getUserStateInfo() {
    if (!this.userStateManager) {
      return null;
    }

    try {
      return await this.userStateManager.getStateInfo();
    } catch (error) {
      console.error('获取用户状态信息失败:', error);
      return null;
    }
  }

  /**
   * 获取服务器端统计数据
   * @returns {Promise<Object|null>} 服务器端统计数据
   */
  async getServerStats() {
    if (!this.userStateManager) {
      return null;
    }

    try {
      return await this.userStateManager.getServerStats();
    } catch (error) {
      console.error('获取服务器端统计数据失败:', error);
      return null;
    }
  }

  /**
   * 重置用户状态（调试用）
   * @returns {Promise<boolean>} 重置是否成功
   */
  async resetUserState() {
    if (!this.userStateManager) {
      return false;
    }

    try {
      await this.userStateManager.resetUserState();
      console.log('用户状态已重置');
      return true;
    } catch (error) {
      console.error('重置用户状态失败:', error);
      return false;
    }
  }
}

// 创建全局实例
const privacySettingsManager = new PrivacySettingsManager();

// 如果在浏览器环境中，将实例添加到window对象
if (typeof window !== 'undefined') {
  window.privacySettingsManager = privacySettingsManager;
}

// 导出模块（支持不同的模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrivacySettingsManager;
}