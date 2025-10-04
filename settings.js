// Settings page functionality
class SettingsManager {
    constructor() {
        this.i18nManager = new I18nManager();
        this.init();
    }

    async init() {
        // 初始化i18n
        await this.i18nManager.init();
        
        this.bindEvents();
        this.loadData();
        
        // 清理过期的版本缓存
        await this.clearExpiredVersionCache();
        
        // 检查版本
        this.checkVersion();
    }

    bindEvents() {
        // 存储管理相关事件
        this.bindStorageEvents();
        
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

        // 监听语言变化事件，更新版本信息UI
        document.addEventListener('languageChanged', (event) => {
            // 只更新UI显示，不重新检查版本
            if (this.versionInfo) {
                this.updateVersionUI();
            }
        });
    }

    bindStorageEvents() {
        // 缓存保留时间选择
        const retentionRadios = document.querySelectorAll('input[name="cache-retention"]');
        retentionRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.saveStorageSettings({ cacheRetentionDays: parseInt(e.target.value) });
                }
            });
        });

        // 清理过期缓存按钮
        const cleanupExpiredBtn = document.getElementById('cleanup-expired-btn');
        if (cleanupExpiredBtn) {
            cleanupExpiredBtn.addEventListener('click', () => {
                this.cleanupExpiredCache();
            });
        }

        // 清理所有缓存按钮
        const cleanupAllBtn = document.getElementById('cleanup-all-btn');
        if (cleanupAllBtn) {
            cleanupAllBtn.addEventListener('click', () => {
                this.cleanupAllCache();
            });
        }

        // 保存存储设置按钮
        const saveStorageBtn = document.getElementById('save-storage-btn');
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
                anonymousStats: false,
                cacheRetentionDays: 7,
                cacheEnabled: true
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

            // 加载存储设置
            await this.loadStorageSettings(result);

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

    async loadStorageSettings(settings) {
        // 设置缓存保留时间单选按钮
        const retentionValue = settings.cacheEnabled ? settings.cacheRetentionDays : -1;
        const retentionRadio = document.querySelector(`input[name="cache-retention"][value="${retentionValue}"]`);
        if (retentionRadio) {
            retentionRadio.checked = true;
        }

        // 加载存储使用情况
        await this.updateStorageUsage();
    }

    async updateStorageUsage() {
        try {
            // 获取缓存统计信息
            const cacheStats = await this.getCacheStatistics();
            
            // 更新显示
            const cachedPagesElement = document.getElementById('cached-pages-count');
            if (cachedPagesElement) {
                cachedPagesElement.textContent = cacheStats.pageCount || 0;
            }

            const usedSpaceElement = document.getElementById('used-space-size');
            if (usedSpaceElement) {
                usedSpaceElement.textContent = this.formatBytes(cacheStats.totalSize || 0);
            }

            const lastCleanupElement = document.getElementById('last-cleanup-time');
            if (lastCleanupElement) {
                const lastCleanup = cacheStats.lastCleanup;
                lastCleanupElement.textContent = lastCleanup ? 
                    new Date(lastCleanup).toLocaleString() : '从未清理';
            }
        } catch (error) {
            console.error('更新存储使用情况失败:', error);
        }
    }

    async getCacheStatistics() {
        try {
            // 获取所有缓存数据
            const allData = await chrome.storage.local.get(null);
            let pageCount = 0;
            let totalSize = 0;
            let lastCleanup = null;

            // 统计缓存页面和大小
            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('cache_')) {
                    pageCount++;
                    totalSize += JSON.stringify(value).length;
                } else if (key === 'lastCleanupTime') {
                    lastCleanup = value;
                }
            }

            return {
                pageCount,
                totalSize,
                lastCleanup
            };
        } catch (error) {
            console.error('获取缓存统计失败:', error);
            return { pageCount: 0, totalSize: 0, lastCleanup: null };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async saveData(data) {
        try {
            await chrome.storage.sync.set(data);
            console.log('设置已保存:', data);
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }

    async saveStorageSettings(data) {
        try {
            await chrome.storage.sync.set(data);
            console.log('存储设置已保存:', data);
            
            // 通知内容脚本更新缓存配置
            this.notifyContentScripts('storageSettingsChanged', data);
        } catch (error) {
            console.error('保存存储设置失败:', error);
        }
    }

    async saveCurrentStorageSettings() {
        const selectedRetention = document.querySelector('input[name="cache-retention"]:checked');
        if (selectedRetention) {
            const retentionValue = parseInt(selectedRetention.value);
            const settings = {
                cacheEnabled: retentionValue !== -1,
                cacheRetentionDays: retentionValue > 0 ? retentionValue : 7
            };
            
            await this.saveStorageSettings(settings);
            this.showMessage('存储设置已保存');
        }
    }

    async cleanupExpiredCache() {
        try {
            const settings = await chrome.storage.sync.get({
                cacheRetentionDays: 7,
                cacheEnabled: true
            });

            if (!settings.cacheEnabled) {
                this.showMessage('缓存已禁用，无需清理', 'info');
                return;
            }

            const cutoffTime = Date.now() - (settings.cacheRetentionDays * 24 * 60 * 60 * 1000);
            const allData = await chrome.storage.local.get(null);
            const keysToRemove = [];

            // 查找过期的缓存项
            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith('cache_') && value.timestamp && value.timestamp < cutoffTime) {
                    keysToRemove.push(key);
                }
            }

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                await chrome.storage.local.set({ lastCleanupTime: Date.now() });
                
                this.showMessage(`已清理 ${keysToRemove.length} 个过期缓存项`);
                await this.updateStorageUsage();
            } else {
                this.showMessage('没有找到过期的缓存项', 'info');
            }
        } catch (error) {
            console.error('清理过期缓存失败:', error);
            this.showMessage('清理失败，请重试', 'error');
        }
    }

    async cleanupAllCache() {
        if (confirm('确定要清除所有缓存吗？这将删除所有已保存的高亮数据。')) {
            try {
                const allData = await chrome.storage.local.get(null);
                const cacheKeys = Object.keys(allData).filter(key => key.startsWith('cache_'));
                
                if (cacheKeys.length > 0) {
                    await chrome.storage.local.remove(cacheKeys);
                    await chrome.storage.local.set({ lastCleanupTime: Date.now() });
                    
                    this.showMessage(`已清理 ${cacheKeys.length} 个缓存项`);
                    await this.updateStorageUsage();
                } else {
                    this.showMessage('没有找到缓存数据', 'info');
                }
            } catch (error) {
                console.error('清理所有缓存失败:', error);
                this.showMessage('清理失败，请重试', 'error');
            }
        }
    }

    notifyContentScripts(action, data) {
        // 通知所有标签页的内容脚本
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: action,
                    data: data
                }).catch(() => {
                    // 忽略无法发送消息的标签页（如chrome://页面）
                });
            });
        });
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
        
        // 根据消息类型设置样式
        let backgroundColor;
        switch (type) {
            case 'error':
                backgroundColor = '#f44336';
                break;
            case 'info':
                backgroundColor = '#2196F3';
                break;
            case 'warning':
                backgroundColor = '#ff9800';
                break;
            default:
                backgroundColor = '#4CAF50';
        }
        
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
            background-color: ${backgroundColor};
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

        // 添加滑入动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(messageDiv);

        // 3秒后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    async checkVersion() {
        try {
            // 检查今日是否已经检查过版本
            const cachedVersionData = await this.getCachedVersionData();
            if (cachedVersionData && this.isToday(cachedVersionData.timestamp)) {
                console.log('使用今日缓存的版本信息');
                this.versionInfo = cachedVersionData.versionInfo;
                this.updateVersionUI();
                return;
            }

            // 显示当前版本
            const manifest = chrome.runtime.getManifest();
            const currentVersion = manifest.version;
            
            // 初始化版本信息缓存
            this.versionInfo = {
                currentVersion: currentVersion,
                latestVersion: null,
                isChecking: true,
                hasUpdate: false,
                error: null,
                releaseUrl: null,
                alternativeDownloads: null,
                contactInfo: null
            };
            
            // 更新UI显示
            this.updateVersionUI();
            
            // 请求后台检查最新版本
            chrome.runtime.sendMessage({ action: 'checkVersion' }, async (response) => {
                this.versionInfo.isChecking = false;
                
                if (response && response.success) {
                    this.versionInfo.latestVersion = response.latestVersion;
                    this.versionInfo.hasUpdate = response.hasUpdate;
                    this.versionInfo.releaseUrl = response.releaseUrl;
                    this.versionInfo.alternativeDownloads = response.alternativeDownloads;
                    this.versionInfo.contactInfo = response.contactInfo;
                } else {
                    this.versionInfo.error = response?.error || 'Unknown error';
                }
                
                // 缓存今日的版本检查结果
                await this.cacheVersionData(this.versionInfo);
                
                // 更新UI显示
                this.updateVersionUI();
            });
        } catch (error) {
            console.error('版本检测失败:', error);
            this.versionInfo = {
                currentVersion: '未知',
                latestVersion: null,
                isChecking: false,
                hasUpdate: false,
                error: error.message,
                releaseUrl: null,
                alternativeDownloads: null,
                contactInfo: null
            };
            this.updateVersionUI();
        }
    }

    // 获取缓存的版本数据
    async getCachedVersionData() {
        try {
            const result = await chrome.storage.local.get(['versionCheckCache']);
            return result.versionCheckCache || null;
        } catch (error) {
            console.error('获取版本缓存失败:', error);
            return null;
        }
    }

    // 缓存版本数据
    async cacheVersionData(versionInfo) {
        try {
            const cacheData = {
                timestamp: Date.now(),
                versionInfo: { ...versionInfo }
            };
            await chrome.storage.local.set({ versionCheckCache: cacheData });
            console.log('版本信息已缓存');
        } catch (error) {
            console.error('缓存版本信息失败:', error);
        }
    }

    // 检查时间戳是否为今天
    isToday(timestamp) {
        const today = new Date();
        const checkDate = new Date(timestamp);
        
        return today.getFullYear() === checkDate.getFullYear() &&
               today.getMonth() === checkDate.getMonth() &&
               today.getDate() === checkDate.getDate();
    }

    // 清理过期的版本缓存（在每日0点后首次访问时调用）
    async clearExpiredVersionCache() {
        const cachedData = await this.getCachedVersionData();
        if (cachedData && !this.isToday(cachedData.timestamp)) {
            await chrome.storage.local.remove(['versionCheckCache']);
            console.log('已清理过期的版本缓存');
        }
    }
    
    updateVersionUI() {
        if (!this.versionInfo) return;
        
        // 更新当前版本显示
        const currentVersionElement = document.getElementById('currentVersion');
        if (currentVersionElement) {
            currentVersionElement.textContent = this.versionInfo.currentVersion;
        }
        
        // 更新最新版本显示
        const latestVersionElement = document.getElementById('latestVersion');
        if (latestVersionElement) {
            if (this.versionInfo.isChecking) {
                latestVersionElement.textContent = this.i18nManager.t('version.checking');
            } else if (this.versionInfo.error) {
                latestVersionElement.textContent = this.i18nManager.t('version.checkFailed');
            } else {
                latestVersionElement.textContent = this.versionInfo.latestVersion;
            }
        }
        
        // 处理更新提示
        if (this.versionInfo.hasUpdate && !this.versionInfo.isChecking) {
            const updateNotice = document.getElementById('updateNotice');
            
            // 设置官方GitHub链接
            const githubLink = document.getElementById('githubLink');
            if (githubLink && this.versionInfo.releaseUrl) {
                githubLink.href = this.versionInfo.releaseUrl;
            }
            
            // 设置替代下载链接
            if (this.versionInfo.alternativeDownloads) {
                const baiduLink = document.getElementById('baiduLink');
                const giteeLink = document.getElementById('giteeLink');
                const directLink = document.getElementById('directLink');
                
                if (baiduLink) baiduLink.href = this.versionInfo.alternativeDownloads.baidu;
                if (giteeLink) giteeLink.href = this.versionInfo.alternativeDownloads.gitee;
                if (directLink) directLink.href = this.versionInfo.alternativeDownloads.direct;
            }
            
            // 设置联系信息
            if (this.versionInfo.contactInfo) {
                const contactInfoElement = document.querySelector('.contact-info');
                if (contactInfoElement) {
                    contactInfoElement.textContent = this.versionInfo.contactInfo;
                }
            }
            
            if (updateNotice) {
                updateNotice.style.display = 'block';
            }
        }
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