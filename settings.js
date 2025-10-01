// 设置页面管理器
class SettingsManager {
    constructor() {
        this.versionInfo = null;
    }

    async loadVersionInfo() {
        try {
            // 获取当前版本
            const manifest = chrome.runtime.getManifest();
            const currentVersion = manifest.version;
            
            // 初始化版本信息对象
            this.versionInfo = {
                currentVersion: currentVersion,
                latestVersion: null,
                hasUpdate: false,
                isChecking: true,
                installType: null,
                browserType: null,
                storeUrl: null,
                downloadUrl: null,
                releaseUrl: null,
                alternativeDownloads: null,
                contactInfo: null,
                message: null,
                actionText: null,
                skipUpdate: false,
                error: null
            };
            
            // 更新UI显示检查状态
            this.updateVersionUI();
            
            // 向后台脚本请求版本检查
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'checkVersion'
                });
                
                if (response && response.success) {
                    // 更新版本信息
                    this.versionInfo.isChecking = false;
                    this.versionInfo.latestVersion = response.latestVersion;
                    this.versionInfo.hasUpdate = response.hasUpdate;
                    this.versionInfo.installType = response.installType;
                    this.versionInfo.browserType = response.browserType;
                    this.versionInfo.storeUrl = response.storeUrl;
                    this.versionInfo.downloadUrl = response.downloadUrl;
                    this.versionInfo.releaseUrl = response.releaseUrl;
                    this.versionInfo.alternativeDownloads = response.alternativeDownloads;
                    this.versionInfo.contactInfo = response.contactInfo;
                    this.versionInfo.message = response.message;
                    this.versionInfo.actionText = response.actionText;
                    this.versionInfo.skipUpdate = response.skipUpdate;
                } else {
                    this.versionInfo.isChecking = false;
                    this.versionInfo.error = response?.error || 'Unknown error';
                }
            } catch (error) {
                console.error('Version check failed:', error);
                this.versionInfo.isChecking = false;
                this.versionInfo.error = 'Network error';
            }
            
            // 更新UI
            this.updateVersionUI();
            
        } catch (error) {
            console.error('Failed to load version info:', error);
            // 设置错误状态
            this.versionInfo = {
                currentVersion: '未知',
                latestVersion: null,
                hasUpdate: false,
                isChecking: false,
                installType: null,
                browserType: null,
                storeUrl: null,
                downloadUrl: null,
                releaseUrl: null,
                alternativeDownloads: null,
                contactInfo: null,
                message: null,
                actionText: null,
                skipUpdate: false,
                error: 'Failed to load version info'
            };
            this.updateVersionUI();
        }
    }

    updateVersionUI() {
        if (!this.versionInfo) return;
        
        // 更新当前版本显示
        const currentVersionElement = document.getElementById('settings-current-version');
        if (currentVersionElement) {
            currentVersionElement.textContent = this.versionInfo.currentVersion;
        }
        
        // 更新最新版本显示
        const latestVersionElement = document.getElementById('settings-latest-version');
        const latestVersionItem = document.getElementById('settings-latest-version-item');
        if (latestVersionElement) {
            if (this.versionInfo.isChecking) {
                latestVersionElement.setAttribute('data-i18n', 'pages.settings.version.checking');
                latestVersionElement.textContent = '检查中...';
            } else if (this.versionInfo.error) {
                latestVersionElement.setAttribute('data-i18n', 'pages.settings.version.checkFailed');
                latestVersionElement.textContent = '检查失败';
            } else {
                latestVersionElement.removeAttribute('data-i18n');
                latestVersionElement.textContent = this.versionInfo.latestVersion;
            }
            
            // 显示最新版本项
            if (latestVersionItem && !this.versionInfo.isChecking) {
                latestVersionItem.style.display = 'block';
            }
        }
        
        // 如果是开发版本，跳过更新检查
        if (this.versionInfo.skipUpdate) {
            const versionStatus = document.getElementById('settings-version-status');
            if (versionStatus) {
                versionStatus.style.display = 'none';
            }
            return;
        }
        
        const versionStatus = document.getElementById('settings-version-status');
        
        if (this.versionInfo.hasUpdate && !this.versionInfo.isChecking) {
            // 显示状态消息
            const statusMessage = document.getElementById('settings-status-message');
            if (statusMessage && this.versionInfo.message) {
                statusMessage.textContent = this.versionInfo.message;
            }
            
            // 根据安装类型显示不同的按钮和链接
            if (this.versionInfo.installType === 'webstore') {
                // 商店版本 - 显示"查看商店页面"按钮
                this.setupWebstoreUI();
            } else {
                // 手动安装版本 - 显示下载链接
                this.setupManualInstallUI();
            }
            
            versionStatus.style.display = 'block';
        } else if (!this.versionInfo.isChecking && !this.versionInfo.error) {
            // 没有更新时显示最新版本信息
            const statusMessage = document.getElementById('settings-status-message');
            if (statusMessage) {
                if (this.versionInfo.installType === 'webstore') {
                    // 使用国际化文本
                    statusMessage.setAttribute('data-i18n', 'pages.settings.version.autoUpdateAvailable');
                    statusMessage.textContent = '浏览器将自动更新到最新版本';
                } else {
                    // 使用国际化文本
                    statusMessage.setAttribute('data-i18n', 'pages.settings.version.upToDate');
                    statusMessage.textContent = '已是最新版本';
                }
            }
            
            // 隐藏操作按钮
            const versionActions = document.getElementById('settings-version-actions');
            if (versionActions) {
                versionActions.style.display = 'none';
            }
            
            versionStatus.style.display = 'block';
        } else if (this.versionInfo.error) {
            versionStatus.style.display = 'none';
        }
    }
    
    // 设置商店版本UI
    setupWebstoreUI() {
        // 隐藏手动安装相关的链接
        const manualActions = document.getElementById('settings-manual-actions');
        if (manualActions) {
            manualActions.style.display = 'none';
        }
        
        // 显示商店链接
        const storeButton = document.getElementById('settings-store-button');
        if (storeButton && this.versionInfo.storeUrl) {
            storeButton.href = this.versionInfo.storeUrl;
            storeButton.querySelector('span').textContent = this.versionInfo.actionText || '查看商店页面';
            storeButton.style.display = 'inline-flex';
        }
        
        // 显示操作按钮区域
        const versionActions = document.getElementById('settings-version-actions');
        if (versionActions) {
            versionActions.style.display = 'flex';
        }
    }
    
    // 设置手动安装版本UI
    setupManualInstallUI() {
        // 隐藏商店按钮
        const storeButton = document.getElementById('settings-store-button');
        if (storeButton) {
            storeButton.style.display = 'none';
        }
        
        // 设置主要下载链接
        const primaryDownloadLink = document.getElementById('settings-download-button');
        if (primaryDownloadLink && this.versionInfo.downloadUrl) {
            primaryDownloadLink.href = this.versionInfo.downloadUrl;
            primaryDownloadLink.querySelector('span').textContent = this.versionInfo.actionText || '立即下载';
        }
        
        // 显示手动安装操作区域
        const manualActions = document.getElementById('settings-manual-actions');
        if (manualActions) {
            manualActions.style.display = 'block';
        }
        
        // 设置替代下载链接
        if (this.versionInfo.alternativeDownloads) {
            const githubLink = document.getElementById('settings-github-link');
            const baiduLink = document.getElementById('settings-baidu-link');
            const giteeLink = document.getElementById('settings-gitee-link');
            
            if (githubLink && this.versionInfo.releaseUrl) {
                githubLink.href = this.versionInfo.releaseUrl;
            }
            if (baiduLink && this.versionInfo.alternativeDownloads.baidu) {
                baiduLink.href = this.versionInfo.alternativeDownloads.baidu;
            }
            if (giteeLink && this.versionInfo.alternativeDownloads.gitee) {
                giteeLink.href = this.versionInfo.alternativeDownloads.gitee;
            }
        }
        
        // 显示操作按钮区域
        const versionActions = document.getElementById('settings-version-actions');
        if (versionActions) {
            versionActions.style.display = 'flex';
        }
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    bindEvents() {
        // 绑定自动更新开关
        const autoUpdateToggle = document.getElementById('auto-update-toggle');
        if (autoUpdateToggle) {
            autoUpdateToggle.addEventListener('change', (e) => {
                this.saveData({ autoUpdate: e.target.checked });
            });
        }

        // 绑定匿名统计开关
        const analyticsToggle = document.getElementById('analytics-toggle');
        if (analyticsToggle) {
            analyticsToggle.addEventListener('change', (e) => {
                this.saveData({ analytics: e.target.checked });
            });
        }

        // 绑定重置按钮
        const resetButton = document.getElementById('reset-button');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetAllSettings();
            });
        }

        // 绑定存储设置相关事件
        this.bindStorageEvents();
    }

    bindStorageEvents() {
        // 缓存保留时间选择
        const retentionSelect = document.getElementById('cache-retention');
        if (retentionSelect) {
            retentionSelect.addEventListener('change', (e) => {
                this.saveStorageSettings({ cacheRetention: parseInt(e.target.value) });
            });
        }

        // 清理过期缓存按钮
        const cleanupExpiredBtn = document.getElementById('cleanup-expired');
        if (cleanupExpiredBtn) {
            cleanupExpiredBtn.addEventListener('click', () => {
                this.cleanupExpiredCache();
            });
        }

        // 清除所有缓存按钮
        const cleanupAllBtn = document.getElementById('cleanup-all');
        if (cleanupAllBtn) {
            cleanupAllBtn.addEventListener('click', () => {
                this.cleanupAllCache();
            });
        }

        // 保存存储设置按钮
        const saveStorageBtn = document.getElementById('save-storage');
        if (saveStorageBtn) {
            saveStorageBtn.addEventListener('click', () => {
                this.saveCurrentStorageSettings();
            });
        }
    }

    async loadData() {
        try {
            const result = await chrome.storage.sync.get({
                autoUpdate: true,
                analytics: false
            });

            // 更新UI
            const autoUpdateToggle = document.getElementById('auto-update-toggle');
            if (autoUpdateToggle) {
                autoUpdateToggle.checked = result.autoUpdate;
            }

            const analyticsToggle = document.getElementById('analytics-toggle');
            if (analyticsToggle) {
                analyticsToggle.checked = result.analytics;
            }

            // 加载存储设置
            await this.loadStorageSettings(result);
            
            // 加载版本信息
            await this.loadVersionInfo();

        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async loadStorageSettings(settings) {
        try {
            const storageResult = await chrome.storage.local.get({
                cacheRetention: 7 // 默认7天
            });

            // 更新缓存保留时间选择
            const retentionSelect = document.getElementById('cache-retention');
            if (retentionSelect) {
                retentionSelect.value = storageResult.cacheRetention;
            }

            // 更新存储使用情况
            await this.updateStorageUsage();

        } catch (error) {
            console.error('Failed to load storage settings:', error);
        }
    }

    async updateStorageUsage() {
        try {
            const stats = await this.getCacheStatistics();
            
            // 更新缓存页面数
            const cachedPagesElement = document.getElementById('cached-pages');
            if (cachedPagesElement) {
                cachedPagesElement.textContent = stats.pageCount;
            }

            // 更新已用空间
            const usedSpaceElement = document.getElementById('used-space');
            if (usedSpaceElement) {
                usedSpaceElement.textContent = this.formatBytes(stats.totalSize);
            }

            // 更新上次清理时间
            const lastCleanupElement = document.getElementById('last-cleanup');
            if (lastCleanupElement) {
                const lastCleanup = await chrome.storage.local.get('lastCleanup');
                if (lastCleanup.lastCleanup) {
                    const date = new Date(lastCleanup.lastCleanup);
                    lastCleanupElement.textContent = date.toLocaleString();
                } else {
                    lastCleanupElement.textContent = '从未清理';
                }
            }

        } catch (error) {
            console.error('Failed to update storage usage:', error);
        }
    }

    async getCacheStatistics() {
        try {
            const allData = await chrome.storage.local.get(null);
            let pageCount = 0;
            let totalSize = 0;

            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('highlight_')) {
                    pageCount++;
                    totalSize += JSON.stringify(value).length;
                }
            }

            return { pageCount, totalSize };
        } catch (error) {
            console.error('Failed to get cache statistics:', error);
            return { pageCount: 0, totalSize: 0 };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async saveData(data) {
        try {
            await chrome.storage.sync.set(data);
            this.showMessage('设置已保存');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showMessage('保存失败', 'error');
        }
    }

    async saveStorageSettings(data) {
        try {
            await chrome.storage.local.set(data);
            this.showMessage('存储设置已保存');
        } catch (error) {
            console.error('Failed to save storage settings:', error);
            this.showMessage('保存失败', 'error');
        }
    }

    async saveCurrentStorageSettings() {
        try {
            const retentionSelect = document.getElementById('cache-retention');
            if (retentionSelect) {
                await this.saveStorageSettings({
                    cacheRetention: parseInt(retentionSelect.value)
                });
            }
        } catch (error) {
            console.error('Failed to save current storage settings:', error);
        }
    }

    async cleanupExpiredCache() {
        try {
            const result = await chrome.storage.local.get('cacheRetention');
            const retentionDays = result.cacheRetention || 7;
            const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

            const allData = await chrome.storage.local.get(null);
            const keysToRemove = [];

            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('highlight_') && value.timestamp && value.timestamp < cutoffTime) {
                    keysToRemove.push(key);
                }
            }

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                await chrome.storage.local.set({ lastCleanup: Date.now() });
                this.showMessage(`已清理 ${keysToRemove.length} 个过期缓存`);
                await this.updateStorageUsage();
            } else {
                this.showMessage('没有过期缓存需要清理');
            }

        } catch (error) {
            console.error('Failed to cleanup expired cache:', error);
            this.showMessage('清理失败', 'error');
        }
    }

    async cleanupAllCache() {
        try {
            const allData = await chrome.storage.local.get(null);
            const keysToRemove = [];

            for (const key of Object.keys(allData)) {
                if (key.startsWith('highlight_')) {
                    keysToRemove.push(key);
                }
            }

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                await chrome.storage.local.set({ lastCleanup: Date.now() });
                this.showMessage(`已清理 ${keysToRemove.length} 个缓存`);
                await this.updateStorageUsage();
            } else {
                this.showMessage('没有缓存需要清理');
            }

        } catch (error) {
            console.error('Failed to cleanup all cache:', error);
            this.showMessage('清理失败', 'error');
        }
    }

    notifyContentScripts(action, data) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: action,
                    data: data
                }).catch(() => {
                    // 忽略无法发送消息的标签页
                });
            });
        });
    }

    async resetAllSettings() {
        if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
            try {
                await chrome.storage.sync.clear();
                await chrome.storage.local.clear();
                this.showMessage('所有设置已重置');
                
                // 重新加载页面以应用默认设置
                setTimeout(() => {
                    location.reload();
                }, 1000);
                
            } catch (error) {
                console.error('Failed to reset settings:', error);
                this.showMessage('重置失败', 'error');
            }
        }
    }

    showMessage(message, type = 'success') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        // 添加样式
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        if (type === 'success') {
            messageEl.style.backgroundColor = '#4CAF50';
        } else if (type === 'error') {
            messageEl.style.backgroundColor = '#f44336';
        } else {
            messageEl.style.backgroundColor = '#2196F3';
        }
        
        document.body.appendChild(messageEl);
        
        // 显示动画
        setTimeout(() => {
            messageEl.style.opacity = '1';
            messageEl.style.transform = 'translateX(0)';
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }
}

// 初始化设置页面
function initSettings() {
    const settingsManager = new SettingsManager();
    settingsManager.init();
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SettingsManager, initSettings };
} else {
    window.SettingsManager = SettingsManager;
    window.initSettings = initSettings;
}