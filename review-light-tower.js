class ReviewLightTower {
  constructor() {
    this.promptDiv = null;
  }

  async show() {
    try {
      // 查询ReviewTimer信息
      const timer = new ReviewTimer();
      await timer.init();
      const timerInfo = await timer.getFormattedInstallInfo();
      
      // 查询ReviewCounter信息
      const counter = new ReviewCounter();
      await counter.init();
      const nodeCount = await counter.getNodeCount();
      const pageCount = await counter.getPageCount();
      
      // 创建评价提醒UI
      this.createReviewPrompt(timerInfo, nodeCount, pageCount);
      
    } catch (error) {
      console.error('ReviewLightTower查询失败:', error);
      // 即使查询失败也显示评价提醒UI
      this.createReviewPrompt('查询失败', 0, 0);
    }
  }

  createReviewPrompt(timerInfo, nodeCount, pageCount) {
    // 如果已经存在提醒框，先移除
    if (this.promptDiv && this.promptDiv.parentNode) {
      this.promptDiv.remove();
    }

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
      max-width: 400px;
      min-width: 350px;
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
        ">你愿意向其他人推荐这个插件吗？</h3>
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
        <div>
          <strong>处理节点数：</strong> ${nodeCount} 个 | <strong>页面数：</strong> ${pageCount} 个
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
        ">我需要理由</button>
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
      ">
        这个插件帮助您更好地阅读和理解网页内容，提供智能词汇高亮、翻译和学习功能。您的推荐将帮助更多人发现这个有用的工具。
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
          去评价
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
          不再提醒
        </button>
      </div>
    `;

    // 添加到页面
    document.body.appendChild(this.promptDiv);

    // 绑定事件
    this.bindEvents();

    // 3秒后自动淡化
    setTimeout(() => {
      if (this.promptDiv && this.promptDiv.parentNode) {
        this.promptDiv.style.transition = 'opacity 0.5s';
        this.promptDiv.style.opacity = '0.9';
      }
    }, 3000);
  }

  bindEvents() {
    const closeBtn = document.getElementById('close-review-prompt');
    const reasonToggle = document.getElementById('reason-toggle');
    const reasonContent = document.getElementById('reason-content');
    const neverBtn = document.getElementById('never-review-prompt');
    const goReviewBtn = document.getElementById('go-review-btn');
    const stars = this.promptDiv.querySelectorAll('.star-rating');
    
    const removePrompt = () => {
      if (this.promptDiv && this.promptDiv.parentNode) {
        this.promptDiv.remove();
        this.promptDiv = null;
      }
    };

    // 关闭按钮事件
    if (closeBtn) {
      closeBtn.addEventListener('click', removePrompt);
    }
    
    // "我需要理由"展开/收起事件
    if (reasonToggle && reasonContent) {
      reasonToggle.addEventListener('click', () => {
        const isVisible = reasonContent.style.display !== 'none';
        reasonContent.style.display = isVisible ? 'none' : 'block';
        reasonToggle.textContent = isVisible ? '我需要理由' : '收起理由';
      });
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