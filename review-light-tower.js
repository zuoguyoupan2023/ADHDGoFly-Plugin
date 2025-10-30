/**
 * 评价提醒灯塔系统
 * 
 * ========== 配置模式切换说明 ==========
 * 
 * 🔧 一键切换测试/正式模式：
 * 只需修改构造函数中的 this.ReviewLightTowerTest 值：
 * - false: 正式版本模式（默认）
 * - true:  测试模式
 * 
 * 🎯 正式版本配置（ReviewLightTowerTest = false）：
 * - 条件3：50天 + 20000个节点
 * - 条件2：21天 + 1000个节点  
 * - 条件1：7天 + 2000个节点
 * 
 * 🧪 测试模式配置（ReviewLightTowerTest = true）：
 * - 条件3：50分钟 + 1000个节点
 * - 条件2：20分钟 + 500个节点
 * - 条件1：10分钟 + 100个节点
 * 
 * ✅ 优势：
 * - 安全：无需手动修改多处代码
 * - 简单：只需改一个配置值
 * - 自动：条件判断和日志描述都会自动切换
 * - 清晰：控制台会显示当前模式
 */
class ReviewLightTower {
  constructor() {
    this.promptDiv = null;
    this.isReasonExpanded = false;
    // 24小时检查间隔机制
    this.lastCheckTime = null;
    this.checkInterval = 24 * 60 * 60 * 1000; // 24小时，单位：毫秒
    
    // 🔧 测试模式配置开关
    // true: 启用测试模式（分钟级别，较小节点数）
    // false: 正式版本模式（天级别，正常节点数）
    this.ReviewLightTowerTest = true; // 正式版本设为 false，测试时改为 true
  }

  async getCurrentVersion() {
    try {
      // 尝试从manifest获取版本信息
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        const manifest = chrome.runtime.getManifest();
        return manifest.version;
      }
      // 如果无法获取，返回默认版本
      return '1.0.0';
    } catch (error) {
      console.error('获取版本信息失败:', error);
      return '1.0.0';
    }
  }

  async getDisplayRecord() {
    try {
      // 使用通用存储适配器，支持跨浏览器兼容
      const record = await window.universalStorage.get('reviewLightTowerDisplay');
      console.log(`🔍 ReviewLightTower调试：读取存储记录:`, record);
      
      if (record) {
        console.log(`🔍 ReviewLightTower调试：找到存储的记录:`, record);
        
        // 确保有triggeredConditions字段
        if (!record.triggeredConditions) {
          record.triggeredConditions = [];
        }
        // 读取lastCheckTime并设置到实例属性
        if (record.lastCheckTime) {
          this.lastCheckTime = record.lastCheckTime;
        }
        
        console.log(`🔍 ReviewLightTower调试：当前显示次数: ${record.count}/3`);
        return record;
      }
      
      console.log(`🔍 ReviewLightTower调试：没有找到记录，返回默认值`);
      return { count: 0, lastVersion: null, triggeredConditions: [], lastCheckTime: null };
    } catch (error) {
      console.error('获取显示记录失败:', error);
      return { count: 0, lastVersion: null, triggeredConditions: [], lastCheckTime: null };
    }
  }

  async updateDisplayRecord(count, version, triggeredConditions = null) {
    try {
      const currentRecord = await this.getDisplayRecord();
      const record = { 
        count, 
        lastVersion: version,
        triggeredConditions: triggeredConditions || currentRecord.triggeredConditions || [],
        lastCheckTime: this.lastCheckTime
      };
      
      console.log(`🔍 ReviewLightTower调试：准备更新记录:`, record);
      await window.universalStorage.set('reviewLightTowerDisplay', record);
      console.log(`🔍 ReviewLightTower调试：记录已保存到存储`);
      
      // 验证保存是否成功
      const savedRecord = await window.universalStorage.get('reviewLightTowerDisplay');
      console.log(`🔍 ReviewLightTower调试：验证保存结果:`, savedRecord);
      
    } catch (error) {
      console.error('更新显示记录失败:', error);
    }
  }

  shouldResetForMajorVersion(currentVersion, lastVersion) {
    if (!lastVersion) return false;
    
    try {
      const currentMajor = parseInt(currentVersion.split('.')[0]);
      const lastMajor = parseInt(lastVersion.split('.')[0]);
      return currentMajor > lastMajor;
    } catch (error) {
      console.error('版本比较失败:', error);
      return false;
    }
  }

  async resetDisplayRecord(version) {
    try {
      const record = { count: 0, lastVersion: version, triggeredConditions: [] };
      await window.universalStorage.set('reviewLightTowerDisplay', record);
      console.log(`🔍 ReviewLightTower调试：已重置显示记录，版本: ${version}`);
    } catch (error) {
      console.error('重置显示记录失败:', error);
    }
  }

  // 检查是否应该显示评价提醒（用于popup重新验证）
  async shouldShow() {
    try {
      // 获取显示记录（这会设置this.lastCheckTime）
      const displayRecord = await this.getDisplayRecord();
      
      // 获取当前时间
      const currentTime = Date.now();
      
      // 正式模式启用24小时检查，测试模式跳过24小时检查
      if (!this.ReviewLightTowerTest) {
        // 正式模式：执行24小时检查
        if (this.lastCheckTime && (currentTime - this.lastCheckTime) < this.checkInterval) {
          const remainingTime = this.checkInterval - (currentTime - this.lastCheckTime);
          const remainingHours = Math.ceil(remainingTime / (60 * 60 * 1000));
          console.log(`ReviewLightTower shouldShow(正式模式)：距离上次检查不足24小时，还需等待 ${remainingHours} 小时`);
          return false;
        }
      }
      
      // 检查剩余显示次数
      const remainingCount = Math.max(0, 3 - displayRecord.count);
      if (remainingCount <= 0) {
        console.log(`ReviewLightTower shouldShow：已达到最大显示次数(3次)`);
        return false;
      }
      
      // 查询ReviewTimer信息
      const timer = new ReviewTimer();
      await timer.init();
      const timerData = await timer.getFormattedInstallInfo();
      
      // 查询ReviewCounter信息
      const counter = new ReviewCounter();
      await counter.init();
      const nodeCount = await counter.getNodeCount();
      
      // 获取总小时数（包含分钟转换）
      const totalHours = timerData ? (timerData.days * 24 + timerData.hours + timerData.minutes / 60) : 0;
      
      // 检查显示条件
      const conditionResult = this.checkDisplayConditions(totalHours, nodeCount, displayRecord.triggeredConditions);
      
      console.log(`ReviewLightTower shouldShow：条件检查结果 - ${conditionResult.shouldShow ? '满足' : '不满足'}条件，${conditionResult.reason}`);
      return conditionResult.shouldShow;
      
    } catch (error) {
      console.error('ReviewLightTower shouldShow检查失败:', error);
      return false;
    }
  }

  /**
   * 检查显示条件（宽松检测）
   * @param {number} totalHours - 总使用小时数
   * @param {number} nodeCount - 处理节点数
   * @param {Array} triggeredConditions - 已触发的条件列表
   * @returns {Object} 包含是否显示、原因和条件ID的对象
   */
  checkDisplayConditions(totalHours, nodeCount, triggeredConditions = []) {
    // ========== 评价提醒条件配置 ==========
    // 根据 this.ReviewLightTowerTest 自动选择测试或正式模式
    // 🔧 只需修改构造函数中的 this.ReviewLightTowerTest 即可切换模式
    
    if (this.ReviewLightTowerTest) {
      // 🧪 测试模式：分钟级别，较小节点数
      const totalMinutes = totalHours * 60;
      
      // 条件1：10分钟 + 100个节点 (最宽松条件)
      if (totalMinutes > 10 && nodeCount > 100) {
        const conditionId = 'condition_10h_1000n';
        if (!triggeredConditions.includes(conditionId)) {
          return {
            shouldShow: true,
            conditionId: conditionId,
            reason: `时间大于10分钟(${totalMinutes}分钟)且节点数大于100个(${nodeCount}个)所以显示`
          };
        }
      }
      
      // 条件2：20分钟 + 500个节点 (中等条件)
      if (totalMinutes > 20 && nodeCount > 500) {
        const conditionId = 'condition_20h_2000n';
        if (!triggeredConditions.includes(conditionId)) {
          return {
            shouldShow: true,
            conditionId: conditionId,
            reason: `时间大于20分钟(${totalMinutes}分钟)且节点数大于500个(${nodeCount}个)所以显示`
          };
        }
      }
      
      // 条件3：50分钟 + 1000个节点 (最严格条件)
      if (totalMinutes > 50 && nodeCount > 1000) {
        const conditionId = 'condition_23h_5000n';
        if (!triggeredConditions.includes(conditionId)) {
          return {
            shouldShow: true,
            conditionId: conditionId,
            reason: `时间大于50分钟(${totalMinutes}分钟)且节点数大于1000个(${nodeCount}个)所以显示`
          };
        }
      }
      
      // 测试模式：不满足条件的情况
      const satisfiedConditions = [];
      if (totalMinutes > 10 && nodeCount > 100) satisfiedConditions.push('10分钟+100节点');
      if (totalMinutes > 20 && nodeCount > 500) satisfiedConditions.push('20分钟+500节点');
      if (totalMinutes > 50 && nodeCount > 1000) satisfiedConditions.push('50分钟+1000节点');
      
      if (satisfiedConditions.length > 0) {
        return {
          shouldShow: false,
          reason: `满足条件(${satisfiedConditions.join(', ')})但已显示过，不再重复显示`
        };
      } else {
        return {
          shouldShow: false,
          reason: `当前${totalMinutes}分钟${nodeCount}个节点，不满足显示条件(需要>10分钟且>100节点)`
        };
      }
      
    } else {
      // 🎯 正式模式：天级别，正常节点数
      
      // 条件1：7天 + 2000个节点 (最宽松条件)
      if (totalHours > 7 * 24 && nodeCount > 2000) {
        const conditionId = 'condition_10h_1000n';
        if (!triggeredConditions.includes(conditionId)) {
          return {
            shouldShow: true,
            conditionId: conditionId,
            reason: `时间大于7天(${Math.round(totalHours/24)}天)且节点数大于2000个(${nodeCount}个)所以显示`
          };
        }
      }
      
      // 条件2：21天 + 1000个节点 (中等条件)
      if (totalHours > 21 * 24 && nodeCount > 1000) {
        const conditionId = 'condition_20h_2000n';
        if (!triggeredConditions.includes(conditionId)) {
          return {
            shouldShow: true,
            conditionId: conditionId,
            reason: `时间大于21天(${Math.round(totalHours/24)}天)且节点数大于1000个(${nodeCount}个)所以显示`
          };
        }
      }
      
      // 条件3：50天 + 20000个节点 (最严格条件)
      if (totalHours > 50 * 24 && nodeCount > 20000) {
        const conditionId = 'condition_23h_5000n';
        if (!triggeredConditions.includes(conditionId)) {
          return {
            shouldShow: true,
            conditionId: conditionId,
            reason: `时间大于50天(${Math.round(totalHours/24)}天)且节点数大于20000个(${nodeCount}个)所以显示`
          };
        }
      }
      
      // 正式模式：不满足条件的情况
      const satisfiedConditions = [];
      if (totalHours > 7 * 24 && nodeCount > 2000) satisfiedConditions.push('7天+2000节点');
      if (totalHours > 21 * 24 && nodeCount > 1000) satisfiedConditions.push('21天+1000节点');
      if (totalHours > 50 * 24 && nodeCount > 20000) satisfiedConditions.push('50天+20000节点');
      
      if (satisfiedConditions.length > 0) {
        return {
          shouldShow: false,
          reason: `满足条件(${satisfiedConditions.join(', ')})但已显示过，不再重复显示`
        };
      } else {
        return {
          shouldShow: false,
          reason: `当前${Math.round(totalHours/24)}天${nodeCount}个节点，不满足显示条件(需要>7天且>2000节点)`
        };
      }
    }
  }

  getI18nText(key, fallback) {
    try {
      if (typeof window !== 'undefined' && window.i18nManager) {
        return window.i18nManager.t(key) || fallback;
      }
      return fallback;
    } catch (error) {
      console.error('获取i18n文本失败:', error);
      return fallback;
    }
  }

  logTriggeredConditions(triggeredConditions) {
    if (!triggeredConditions || triggeredConditions.length === 0) {
      console.log('ReviewLightTower：当前已经触发的显示条件为：尚未触发');
      return;
    }

    // 将条件ID转换为可读的描述
    // 根据 this.ReviewLightTowerTest 自动选择对应的描述文本
    const conditionDescriptions = triggeredConditions.map(conditionId => {
      if (this.ReviewLightTowerTest) {
        // 🧪 测试模式描述
        switch (conditionId) {
          case 'condition_10h_1000n':
            return '10分钟+100节点';
          case 'condition_20h_2000n':
            return '20分钟+500节点';
          case 'condition_23h_5000n':
            return '50分钟+1000节点';
          default:
            return conditionId;
        }
      } else {
        // 🎯 正式模式描述
        switch (conditionId) {
          case 'condition_10h_1000n':
            return '7天+2000节点';
          case 'condition_20h_2000n':
            return '21天+1000节点';
          case 'condition_23h_5000n':
            return '50天+20000节点';
          default:
            return conditionId;
        }
      }
    });

    const modeText = this.ReviewLightTowerTest ? '(测试模式)' : '(正式模式)';
    console.log(`ReviewLightTower${modeText}：当前已经触发的显示条件为：${conditionDescriptions.join('、')}`);
  }

  async show() {
    try {
      // 显示存储信息
      const storageInfo = window.universalStorage.getStorageInfo();
      console.log(`🔧 存储适配器状态:`, storageInfo);
      
      // 24小时间隔检查 - 根据模式决定是否启用
      const currentTime = Date.now();
      
      // 正式模式启用24小时检查，测试模式跳过24小时检查
      if (!this.ReviewLightTowerTest) {
        // 正式模式：执行24小时检查
        if (this.lastCheckTime && (currentTime - this.lastCheckTime) < this.checkInterval) {
          const remainingTime = this.checkInterval - (currentTime - this.lastCheckTime);
          const remainingHours = Math.ceil(remainingTime / (60 * 60 * 1000));
          console.log(`ReviewLightTower(正式模式)：距离上次检查不足24小时，还需等待 ${remainingHours} 小时`);
          return;
        }
        console.log(`ReviewLightTower(正式模式)：开始检查，时间: ${new Date(currentTime).toLocaleString()}`);
      } else {
        // 测试模式：跳过24小时检查
        console.log(`ReviewLightTower(测试模式)：开始检查，时间: ${new Date(currentTime).toLocaleString()} (测试模式已跳过24小时限制)`);
      }
      
      // 更新最后检查时间
      this.lastCheckTime = currentTime;
      
      // 获取当前版本
      const currentVersion = await this.getCurrentVersion();
      
      // 获取显示记录
      const displayRecord = await this.getDisplayRecord();
      
      // 显示当前已触发的条件
      this.logTriggeredConditions(displayRecord.triggeredConditions);
      
      // 检查是否需要重置（主版本更新）
      if (displayRecord.lastVersion && this.shouldResetForMajorVersion(currentVersion, displayRecord.lastVersion)) {
        await this.resetDisplayRecord(currentVersion);
        displayRecord.count = 0;
        displayRecord.lastVersion = currentVersion;
      }
      
      // 先检查剩余显示次数
      const remainingCount = Math.max(0, 3 - displayRecord.count);
      console.log(`🔍 ReviewLightTower调试：显示次数检查 - 当前次数: ${displayRecord.count}, 剩余次数: ${remainingCount}`);
      
      if (remainingCount <= 0) {
        console.log(`ReviewLightTower：已达到最大显示次数(3次)，不再显示`);
        // 即使已达到最大显示次数，也要保存lastCheckTime以确保24小时间隔生效
        await this.updateDisplayRecord(displayRecord.count, currentVersion, displayRecord.triggeredConditions);
        console.log(`🔍 ReviewLightTower调试：已达到最大次数，直接返回，不会调用notifyBackgroundShowBadge`);
        return;
      }
      
      // 查询ReviewTimer信息
      const timer = new ReviewTimer();
      await timer.init();
      const timerData = await timer.getFormattedInstallInfo();
      const timerInfo = timerData ? timerData.formatted : '查询失败';
      
      // 查询ReviewCounter信息
      const counter = new ReviewCounter();
      await counter.init();
      const nodeCount = await counter.getNodeCount();
      const pageCount = await counter.getPageCount();
      
      // 获取总小时数（包含分钟转换）
      const totalHours = timerData ? (timerData.days * 24 + timerData.hours + timerData.minutes / 60) : 0;
      
      // 调试日志：显示时间计算过程
      if (timerData) {
        console.log(`ReviewLightTower：时间计算 - 天数:${timerData.days}, 小时:${timerData.hours}, 分钟:${timerData.minutes}, 总小时数:${totalHours.toFixed(2)}`);
      }
      
      // 检查显示条件（宽松检测），传入已触发条件
      const conditionResult = this.checkDisplayConditions(totalHours, nodeCount, displayRecord.triggeredConditions);
      
      if (!conditionResult.shouldShow) {
        console.log(`ReviewLightTower：不满足显示条件。${conditionResult.reason}`);
        // 即使不满足显示条件，也要保存lastCheckTime以确保24小时间隔生效
        await this.updateDisplayRecord(displayRecord.count, currentVersion, displayRecord.triggeredConditions);
        return;
      }
      
      console.log(`ReviewLightTower：满足显示条件，剩余${remainingCount}次，${conditionResult.reason}`);
      
      // 创建评价提醒UI，传入显示原因
      this.notifyBackgroundShowBadge(timerInfo, nodeCount, pageCount, remainingCount, conditionResult.reason);
      
      // 更新显示记录，记录新触发的条件
      const newTriggeredConditions = [...displayRecord.triggeredConditions, conditionResult.conditionId];
      await this.updateDisplayRecord(displayRecord.count + 1, currentVersion, newTriggeredConditions);
      
    } catch (error) {
      console.error('ReviewLightTower查询失败:', error);
      // 查询失败时也要检查次数限制
      const displayRecord = await this.getDisplayRecord();
      const remainingCount = Math.max(0, 3 - displayRecord.count);
      
      if (remainingCount <= 0) {
        console.log(`ReviewLightTower：查询失败，但已达到最大显示次数(3次)，不显示`);
        return;
      }
      
      // 查询失败但仍有次数时才显示
      this.notifyBackgroundShowBadge('查询失败', 0, 0, remainingCount, '查询失败时显示');
      
      // 更新显示记录
      const currentVersion = await this.getCurrentVersion();
      await this.updateDisplayRecord(displayRecord.count + 1, currentVersion);
    }
  }

  notifyBackgroundShowBadge(timerInfo, nodeCount, pageCount, remainingCount = 0, displayReason = '') {
    // 通知background.js显示灯塔，并传递评价提醒数据
    try {
      console.log(`🔍 ReviewLightTower调试：准备通知background显示徽章，剩余次数: ${remainingCount}`);
      chrome.runtime.sendMessage({
        action: 'showReviewLightTower',
        data: {
          timerInfo,
          nodeCount,
          pageCount,
          remainingCount,
          displayReason
        }
      });
      console.log('已通知background显示评价徽章');
    } catch (error) {
      console.error('通知background显示徽章失败:', error);
    }
  }

  bindEvents() {
    // 使用this.promptDiv来查找元素，确保在正确的作用域内
    const closeBtn = this.promptDiv.querySelector('#close-review-prompt');
    const reasonToggle = this.promptDiv.querySelector('#reason-toggle');
    const reasonContent = this.promptDiv.querySelector('#reason-content');
    const neverBtn = this.promptDiv.querySelector('#never-review-prompt');
    const goReviewBtn = this.promptDiv.querySelector('#go-review-btn');
    const stars = this.promptDiv.querySelectorAll('.star-rating');
    
    console.log('绑定事件 - 找到的元素:', {
      closeBtn: !!closeBtn,
      reasonToggle: !!reasonToggle,
      reasonContent: !!reasonContent,
      neverBtn: !!neverBtn,
      goReviewBtn: !!goReviewBtn,
      stars: stars.length
    });
    
    const removePrompt = () => {
      if (this.promptDiv && this.promptDiv.parentNode) {
        this.promptDiv.remove();
        this.promptDiv = null;
        this.isReasonExpanded = false;
      }
    };

    // 关闭按钮事件
    if (closeBtn) {
      closeBtn.addEventListener('click', removePrompt);
      console.log('关闭按钮事件已绑定');
    }
    
    // "我需要理由"展开/收起事件
    if (reasonToggle && reasonContent) {
      console.log('开始绑定理由按钮事件');
      reasonToggle.addEventListener('click', (e) => {
        console.log('点击了理由按钮'); // 调试日志
        e.preventDefault();
        e.stopPropagation();
        
        this.isReasonExpanded = !this.isReasonExpanded;
        console.log('展开状态:', this.isReasonExpanded); // 调试日志
        
        if (this.isReasonExpanded) {
          // 展开
          console.log('执行展开操作');
          reasonContent.style.display = 'block';
          reasonToggle.textContent = '收起理由';
          
          // 添加展开动画
          reasonContent.style.opacity = '0';
          reasonContent.style.transform = 'translateY(-10px)';
          reasonContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          
          setTimeout(() => {
            reasonContent.style.opacity = '1';
            reasonContent.style.transform = 'translateY(0)';
          }, 10);
        } else {
          // 收起
          console.log('执行收起操作');
          reasonContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          reasonContent.style.opacity = '0';
          reasonContent.style.transform = 'translateY(-10px)';
          
          setTimeout(() => {
            reasonContent.style.display = 'none';
            reasonToggle.textContent = '我需要理由';
          }, 300);
        }
      });
      console.log('理由按钮事件绑定完成');
    } else {
      console.error('理由按钮或内容元素未找到:', { reasonToggle: !!reasonToggle, reasonContent: !!reasonContent });
    }
    
    // 星星评分事件
    stars.forEach((star, index) => {
      star.addEventListener('mouseenter', () => {
        // 鼠标悬停时高亮当前星星及之前的星星
        stars.forEach((s, i) => {
          s.style.color = i <= index ? '#FFD700' : '#ddd';
          s.textContent = i <= index ? '★' : '☆';
        });
      });
      
      star.addEventListener('mouseleave', () => {
        // 鼠标离开时恢复默认状态
        stars.forEach(s => {
          s.style.color = '#ddd';
          s.textContent = '☆';
        });
      });
      
      star.addEventListener('click', () => {
        // 点击星星时直接跳转到评价页面
        const storeUrl = window.getStoreUrl ? window.getStoreUrl() : 'https://feedback.adhdgofly.online';
        window.open(storeUrl, '_blank');
        removePrompt();
      });
    });

    // "去评价"按钮事件
    if (goReviewBtn) {
      goReviewBtn.addEventListener('click', () => {
        const storeUrl = window.getStoreUrl ? window.getStoreUrl() : 'https://feedback.adhdgofly.online';
        window.open(storeUrl, '_blank');
        removePrompt();
      });
    }
    
    // "不再提醒"事件
    if (neverBtn) {
      neverBtn.addEventListener('click', () => {
        // 可以在这里添加"不再提醒"的逻辑
        removePrompt();
      });
    }
  }
}

// 创建全局实例
window.reviewLightTower = new ReviewLightTower();