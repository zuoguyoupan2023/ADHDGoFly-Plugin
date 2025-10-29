class ReviewLightTower {
  constructor() {
    this.promptDiv = null;
    this.isReasonExpanded = false;
    // 24小时检查间隔机制
    this.lastCheckTime = null;
    this.checkInterval = 24 * 60 * 60 * 1000; // 24小时，单位：毫秒
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
      const record = localStorage.getItem('reviewLightTowerDisplay');
      if (record) {
        const parsed = JSON.parse(record);
        // 确保有triggeredConditions字段
        if (!parsed.triggeredConditions) {
          parsed.triggeredConditions = [];
        }
        // 读取lastCheckTime并设置到实例属性
        if (parsed.lastCheckTime) {
          this.lastCheckTime = parsed.lastCheckTime;
        }
        return parsed;
      }
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
      localStorage.setItem('reviewLightTowerDisplay', JSON.stringify(record));
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
      localStorage.setItem('reviewLightTowerDisplay', JSON.stringify(record));
    } catch (error) {
      console.error('重置显示记录失败:', error);
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
    // 宽松条件：满足任意一个条件且该条件未触发过就显示
    if (totalHours > 23 && nodeCount > 5000) {
      const conditionId = 'condition_23h_5000n';
      if (!triggeredConditions.includes(conditionId)) {
        return {
          shouldShow: true,
          conditionId: conditionId,
          reason: `时间大于23小时(${totalHours}小时)且节点数大于5000个(${nodeCount}个)所以显示`
        };
      }
    }
    
    if (totalHours > 20 && nodeCount > 2000) {
      const conditionId = 'condition_20h_2000n';
      if (!triggeredConditions.includes(conditionId)) {
        return {
          shouldShow: true,
          conditionId: conditionId,
          reason: `时间大于20小时(${totalHours}小时)且节点数大于2000个(${nodeCount}个)所以显示`
        };
      }
    }
    
    if (totalHours > 10 && nodeCount > 1000) {
      const conditionId = 'condition_10h_1000n';
      if (!triggeredConditions.includes(conditionId)) {
        return {
          shouldShow: true,
          conditionId: conditionId,
          reason: `时间大于10小时(${totalHours}小时)且节点数大于1000个(${nodeCount}个)所以显示`
        };
      }
    }
    
    // 不满足任何条件或所有满足的条件都已触发过
    const satisfiedConditions = [];
    if (totalHours > 23 && nodeCount > 5000) satisfiedConditions.push('23小时+5000节点');
    if (totalHours > 20 && nodeCount > 2000) satisfiedConditions.push('20小时+2000节点');
    if (totalHours > 10 && nodeCount > 1000) satisfiedConditions.push('10小时+1000节点');
    
    if (satisfiedConditions.length > 0) {
      return {
        shouldShow: false,
        reason: `满足条件(${satisfiedConditions.join(', ')})但已显示过，不再重复显示`
      };
    } else {
      return {
        shouldShow: false,
        reason: `当前${totalHours}小时${nodeCount}个节点，不满足显示条件(需要>10小时且>1000节点)`
      };
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
    const conditionDescriptions = triggeredConditions.map(conditionId => {
      switch (conditionId) {
        case 'condition_23h_5000n':
          return '23小时+5000节点';
        case 'condition_20h_2000n':
          return '20小时+2000节点';
        case 'condition_10h_1000n':
          return '10小时+1000节点';
        default:
          return conditionId; // 如果是未知的条件ID，直接显示
      }
    });

    console.log(`ReviewLightTower：当前已经触发的显示条件为：${conditionDescriptions.join('、')}`);
  }

  async show() {
    try {
      // 24小时间隔检查
      const currentTime = Date.now();
      if (this.lastCheckTime && (currentTime - this.lastCheckTime) < this.checkInterval) {
        const remainingTime = this.checkInterval - (currentTime - this.lastCheckTime);
        const remainingHours = Math.ceil(remainingTime / (60 * 60 * 1000));
        console.log(`ReviewLightTower：距离上次检查不足24小时，还需等待 ${remainingHours} 小时`);
        return;
      }
      
      // 更新最后检查时间
      this.lastCheckTime = currentTime;
      console.log(`ReviewLightTower：开始24小时检查，时间: ${new Date(currentTime).toLocaleString()}`);
      
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
      
      if (remainingCount <= 0) {
        console.log(`ReviewLightTower：已达到最大显示次数(3次)，不再显示`);
        // 即使已达到最大显示次数，也要保存lastCheckTime以确保24小时间隔生效
        await this.updateDisplayRecord(displayRecord.count, currentVersion, displayRecord.triggeredConditions);
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
      
      // 获取总小时数
      const totalHours = timerData ? (timerData.days * 24 + timerData.hours) : 0;
      
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
      this.createReviewPrompt(timerInfo, nodeCount, pageCount, remainingCount, conditionResult.reason);
      
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
      this.createReviewPrompt('查询失败', 0, 0, remainingCount, '查询失败时显示');
      
      // 更新显示记录
      const currentVersion = await this.getCurrentVersion();
      await this.updateDisplayRecord(displayRecord.count + 1, currentVersion);
    }
  }

  createReviewPrompt(timerInfo, nodeCount, pageCount, remainingCount = 0, displayReason = '') {
    // 如果已经存在提醒框，先移除
    if (this.promptDiv && this.promptDiv.parentNode) {
      this.promptDiv.remove();
    }

    // 获取i18n文本
    const title = this.getI18nText('review.title', '你愿意向其他人推荐这个插件吗？');
    const description = this.getI18nText('review.description', '你的评价能让更多人看到这个插件，无论他们是因为ADHD、阅读困难，还是因为大量阅读而感到疲倦的人，都有机会用这个插件降低阅读难度。');
    const reviewBtnText = this.getI18nText('review.goReview', '去评价');
    const reasonBtnText = this.getI18nText('review.needReason', '我需要理由');
    const reasonCollapseBtnText = this.getI18nText('review.reasonCollapse', '收起理由');
    const neverBtnText = this.getI18nText('review.neverAsk', '不再提醒');

    // 创建提醒框
    this.promptDiv = document.createElement('div');
    this.promptDiv.id = 'review-light-tower-prompt';
    this.promptDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 450px;
      min-width: 350px;
      max-height: 80vh;
      overflow-y: auto;
    `;

    // 设置HTML内容
    this.promptDiv.innerHTML = `
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      ">
        <h3 style="
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
          line-height: 1.4;
        ">${title}</h3>
        <button id="close-review-prompt" style="
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>

      <!-- 数据显示区域 -->
      <div style="
        background: #f8f9fa;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;
        font-size: 12px;
        color: #666;
        border-left: 3px solid #007bff;
      ">
        <div style="margin-bottom: 5px;">
          <strong>插件使用时间：</strong> ${timerInfo}
        </div>
        <div style="margin-bottom: 5px;">
          <strong>处理节点数：</strong> ${nodeCount} 个 | <strong>页面数：</strong> ${pageCount} 个
        </div>
        <div style="color: #007bff; font-weight: 600; margin-bottom: 5px;">
          <strong>剩余提醒次数：</strong> ${remainingCount} 次
        </div>
        ${displayReason ? `<div style="color: #28a745; font-weight: 600; font-size: 11px; background: #e8f5e8; padding: 6px; border-radius: 4px; border-left: 3px solid #28a745;">
          <strong>显示原因：</strong> ${displayReason}
        </div>` : ''}
      </div>

      <!-- 星星评分 -->
      <div style="
        display: flex;
        justify-content: center;
        gap: 8px;
        margin: 20px 0;
      ">
        <span class="star-rating" style="
          font-size: 24px;
          color: #ddd;
          cursor: pointer;
          transition: color 0.2s;
        ">☆</span>
        <span class="star-rating" style="
          font-size: 24px;
          color: #ddd;
          cursor: pointer;
          transition: color 0.2s;
        ">☆</span>
        <span class="star-rating" style="
          font-size: 24px;
          color: #ddd;
          cursor: pointer;
          transition: color 0.2s;
        ">☆</span>
        <span class="star-rating" style="
          font-size: 24px;
          color: #ddd;
          cursor: pointer;
          transition: color 0.2s;
        ">☆</span>
        <span class="star-rating" style="
          font-size: 24px;
          color: #ddd;
          cursor: pointer;
          transition: color 0.2s;
        ">☆</span>
      </div>

      <!-- 我需要理由按钮 -->
      <div style="text-align: center; margin: 15px 0;">
        <button id="reason-toggle" style="
          background: none;
          border: none;
          color: #007bff;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
          padding: 4px 8px;
        ">${reasonBtnText}</button>
      </div>

      <!-- 理由内容（默认隐藏） -->
      <div id="reason-content" style="
        display: none;
        background: #f8f9fa;
        border-radius: 6px;
        padding: 12px;
        margin: 10px 0;
        font-size: 12px;
        color: #666;
        line-height: 1.4;
        border-left: 3px solid #28a745;
      ">
        <div style="margin-bottom: 12px;">
          <div style="margin-bottom: 8px; font-weight: 600; color: #333;">
            ${this.getI18nText('review.reasonContent.title', '为什么需要您的评价？')}
          </div>
          <div style="margin: 8px 0; padding: 12px; background-color: #ffffff; border-radius: 6px; line-height: 1.5; color: #555;">
            ${this.getI18nText('review.reasonContent.description', '你的评价能让更多人看到这个插件，无论他们是因为ADHD、阅读困难，还是因为大量阅读而感到疲倦的人，都有机会用这个插件降低阅读难度。')}
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div style="
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
      ">
        <button id="go-review-btn" style="
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        " onmouseover="this.style.backgroundColor='#0056b3'" onmouseout="this.style.backgroundColor='#007bff'">
          ${reviewBtnText}
        </button>
        <button id="never-review-prompt" style="
          background: none;
          border: none;
          color: #999;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
          padding: 4px 8px;
        " onmouseover="this.style.color='#666'" onmouseout="this.style.color='#999'">
          ${neverBtnText}
        </button>
      </div>
    `;

    // 添加到页面
    document.body.appendChild(this.promptDiv);

    // 确保DOM元素已经添加后再绑定事件
    setTimeout(() => {
      this.bindEvents();
    }, 0);

    // 3秒后自动淡化
    setTimeout(() => {
      if (this.promptDiv && this.promptDiv.parentNode) {
        this.promptDiv.style.transition = 'opacity 0.5s';
        this.promptDiv.style.opacity = '0.9';
      }
    }, 3000);
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