class ReviewLightTower {
  constructor() {
    this.promptDiv = null;
    this.isReasonExpanded = false;
  }

  async show() {
    try {
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
      
      // 获取安装时间（小时）
      const installHours = await this.getInstallHours(timer);
      
      // 检查是否满足显示条件
      const shouldShow = await this.checkDisplayConditions(installHours, nodeCount);
      
      if (shouldShow.show) {
        // 创建评价提醒UI
        this.createReviewPrompt(timerInfo, nodeCount, pageCount, shouldShow.displayCount);
      } else {
        console.log('ReviewLightTower: 不满足显示条件');
      }
      
    } catch (error) {
      console.error('ReviewLightTower查询失败:', error);
    }
  }

  async getInstallHours(timer) {
    try {
      const installTime = await timer.getInstallTime();
      if (installTime) {
        const now = Date.now();
        const diffMs = now - installTime;
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours;
      }
      return 0;
    } catch (error) {
      console.error('获取安装时间失败:', error);
      return 0;
    }
  }

  async checkDisplayConditions(installHours, nodeCount) {
    try {
      // 获取当前版本和显示记录
      const currentVersion = await this.getCurrentVersion();
      const displayRecord = await this.getDisplayRecord();
      
      // 检查是否需要重置（大版本更新）
      if (this.shouldResetForMajorVersion(currentVersion, displayRecord.lastVersion)) {
        await this.resetDisplayRecord(currentVersion);
        displayRecord.count = 0;
        displayRecord.lastVersion = currentVersion;
      }
      
      // 如果已经显示过3次，不再显示
      if (displayRecord.count >= 3) {
        return { show: false, displayCount: displayRecord.count };
      }
      
      // 检查显示条件
      const conditions = [
        { hours: 10, nodes: 1000, displayIndex: 1 },
        { hours: 20, nodes: 2000, displayIndex: 2 },
        { hours: 23, nodes: 5000, displayIndex: 3 }
      ];
      
      for (const condition of conditions) {
        if (installHours >= condition.hours && nodeCount >= condition.nodes) {
          // 检查是否已经在这个条件下显示过
          if (displayRecord.count < condition.displayIndex) {
            // 更新显示记录
            await this.updateDisplayRecord(condition.displayIndex, currentVersion);
            return { show: true, displayCount: condition.displayIndex };
          }
        }
      }
      
      return { show: false, displayCount: displayRecord.count };
    } catch (error) {
      console.error('检查显示条件失败:', error);
      return { show: false, displayCount: 0 };
    }
  }

  async getCurrentVersion() {
    try {
      const manifest = chrome.runtime.getManifest();
      return manifest.version;
    } catch (error) {
      console.error('获取版本失败:', error);
      return '0.1.5'; // 默认版本
    }
  }

  async getDisplayRecord() {
    try {
      const result = await chrome.storage.local.get(['reviewDisplayRecord']);
      return result.reviewDisplayRecord || { count: 0, lastVersion: '0.0.0' };
    } catch (error) {
      console.error('获取显示记录失败:', error);
      return { count: 0, lastVersion: '0.0.0' };
    }
  }

  shouldResetForMajorVersion(currentVersion, lastVersion) {
    try {
      const currentMajor = parseInt(currentVersion.split('.')[0]);
      const lastMajor = parseInt(lastVersion.split('.')[0]);
      return currentMajor > lastMajor;
    } catch (error) {
      console.error('版本比较失败:', error);
      return false;
    }
  }

  async resetDisplayRecord(currentVersion) {
    try {
      await chrome.storage.local.set({
        reviewDisplayRecord: { count: 0, lastVersion: currentVersion }
      });
    } catch (error) {
      console.error('重置显示记录失败:', error);
    }
  }

  async updateDisplayRecord(displayCount, currentVersion) {
    try {
      await chrome.storage.local.set({
        reviewDisplayRecord: { count: displayCount, lastVersion: currentVersion }
      });
    } catch (error) {
      console.error('更新显示记录失败:', error);
    }
  }

  createReviewPrompt(timerInfo, nodeCount, pageCount, displayCount = 1) {
    // 如果已经存在提醒框，先移除
    if (this.promptDiv && this.promptDiv.parentNode) {
      this.promptDiv.remove();
    }

    // 使用简单的文本
    const title = '你愿意向其他人推荐这个插件吗？';
    const description = '你的评价能让更多人看到这个插件，无论他们是因为ADHD、阅读困难，还是因为大量阅读而感到疲倦的人，都有机会用这个插件降低阅读难度。';
    const reviewBtnText = '去评价';
    const reasonBtnText = '我需要理由';
    const reasonCollapseBtnText = '收起理由';
    const neverBtnText = '不再提醒';

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
        <div style="color: #28a745; font-weight: 600;">
          <strong>这是第 ${displayCount} 次显示</strong>
        </div>
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
            为什么需要您的评价？
          </div>
          <div style="margin: 8px 0; padding: 12px; background-color: #ffffff; border-radius: 6px; line-height: 1.5; color: #555;">
            你的评价能让更多人看到这个插件，无论他们是因为ADHD、阅读困难，还是因为大量阅读而感到疲倦的人，都有机会用这个插件降低阅读难度。
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