// Settings page functionality
class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    bindEvents() {
        // 自动更新开关
        const autoUpdateToggle = document.getElementById('auto-update-toggle');
        if (autoUpdateToggle) {
            autoUpdateToggle.addEventListener('change', (e) => {
                this.saveData({ autoUpdate: e.target.checked });
            });
        }

        // 匿名统计开关
        const anonymousStatsToggle = document.getElementById('anonymous-stats-toggle');
        if (anonymousStatsToggle) {
            anonymousStatsToggle.addEventListener('change', (e) => {
                this.saveData({ anonymousStats: e.target.checked });
            });
        }

        // 重置按钮
        const resetBtn = document.getElementById('reset-all-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetAllSettings();
            });
        }
    }

    async loadData() {
        try {
            const result = await chrome.storage.sync.get({
                autoUpdate: true,
                anonymousStats: false
            });

            // 更新开关状态
            const autoUpdateToggle = document.getElementById('auto-update-toggle');
            if (autoUpdateToggle) {
                autoUpdateToggle.checked = result.autoUpdate;
            }

            const anonymousStatsToggle = document.getElementById('anonymous-stats-toggle');
            if (anonymousStatsToggle) {
                anonymousStatsToggle.checked = result.anonymousStats;
            }

            // 显示版本信息
            const manifest = chrome.runtime.getManifest();
            const versionElement = document.querySelector('.version-info');
            if (versionElement) {
                versionElement.textContent = `版本 ${manifest.version}`;
            }
        } catch (error) {
            console.error('加载设置数据失败:', error);
        }
    }

    async saveData(data) {
        try {
            await chrome.storage.sync.set(data);
            console.log('设置已保存:', data);
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }

    async resetAllSettings() {
        if (confirm('确定要重置所有设置吗？这将清除所有自定义配置。')) {
            try {
                await chrome.storage.sync.clear();
                await chrome.storage.local.clear();
                
                // 重新加载默认设置
                await this.loadData();
                
                // 显示成功消息
                this.showMessage('所有设置已重置为默认值');
            } catch (error) {
                console.error('重置设置失败:', error);
                this.showMessage('重置失败，请重试', 'error');
            }
        }
    }

    showMessage(message, type = 'success') {
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `settings-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            background-color: ${type === 'error' ? '#f44336' : '#4CAF50'};
        `;

        document.body.appendChild(messageDiv);

        // 3秒后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// 当设置页面显示时初始化
function initSettings() {
    if (!window.settingsManager) {
        window.settingsManager = new SettingsManager();
    }
}

// 导出给popup.js使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SettingsManager, initSettings };
} else {
    window.SettingsManager = SettingsManager;
    window.initSettings = initSettings;
}