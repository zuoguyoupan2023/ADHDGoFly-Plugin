// 最简单的ReviewLightTower - 完全独立，不破坏任何旧逻辑
class SimpleReviewReminder {
    constructor() {
        this.isShowing = false;
    }

    // 查询ReviewTimer并显示时间信息
    async show() {
        if (this.isShowing) return;
        
        this.isShowing = true;
        
        // 查询ReviewTimer时间信息
        let timeInfo = "正在查询时间信息...";
        try {
            if (window.ReviewTimer) {
                const timer = new window.ReviewTimer();
                await timer.init();
                const installInfo = await timer.getFormattedInstallInfo();
                
                if (installInfo) {
                    timeInfo = `插件已使用：${installInfo.formatted}`;
                } else {
                    timeInfo = "无法获取使用时间";
                }
            } else {
                timeInfo = "ReviewTimer未加载";
            }
        } catch (error) {
            console.error('查询ReviewTimer失败:', error);
            timeInfo = "查询时间失败";
        }
        
        // 创建提醒框
        const reminder = document.createElement('div');
        reminder.id = 'simple-review-reminder';
        reminder.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fff;
                border: 2px solid #007cba;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: Arial, sans-serif;
                max-width: 300px;
            ">
                <div style="
                    font-size: 16px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 10px;
                ">ReviewTimer查询结果</div>
                <div style="
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 15px;
                ">${timeInfo}</div>
                <button onclick="document.getElementById('simple-review-reminder').remove(); window.simpleReviewReminder.isShowing = false;" style="
                    background: #007cba;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">关闭</button>
            </div>
        `;
        
        document.body.appendChild(reminder);
        
        // 5秒后自动关闭
        setTimeout(() => {
            const element = document.getElementById('simple-review-reminder');
            if (element) {
                element.remove();
                this.isShowing = false;
            }
        }, 5000);
    }
}

// 全局实例
window.simpleReviewReminder = new SimpleReviewReminder();