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
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // 添加到页面顶部
        document.body.insertBefore(messageDiv, document.body.firstChild);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    async checkVersion() {
        try {
            // 检测安装来源
            const installSource = await this.detectInstallSource();
            
            // 显示当前版本
            const manifest = chrome.runtime.getManifest();
            const currentVersion = manifest.version;
            
            // 初始化版本信息缓存
            this.versionInfo = {
                currentVersion: currentVersion,
                latestVersion: null,
                isChecking: false,
                hasUpdate: false,
                error: null,
                releaseUrl: null,
                alternativeDownloads: null,
                contactInfo: null,
                installSource: installSource,
                isManualInstall: installSource === 'manual'
            };
            
            // 如果是官方商店安装，只显示当前版本和官网推广
            if (!this.versionInfo.isManualInstall) {
                this.versionInfo.officialWebsite = 'https://adhdgofly.online';
                this.updateVersionUI();
                return;
            }
            
            // 手动安装才进行版本检查
            // 检查今日是否已经检查过版本
            const cachedVersionData = await this.getCachedVersionData();
            if (cachedVersionData && this.isToday(cachedVersionData.timestamp)) {
                console.log('使用今日缓存的版本信息');
                this.versionInfo = { ...cachedVersionData.versionInfo, installSource, isManualInstall: true };
                this.updateVersionUI();
                return;
            }
            
            // 设置检查状态
            this.versionInfo.isChecking = true;
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
                contactInfo: null,
                installSource: 'unknown',
                isManualInstall: true // 出错时默认为手动安装
            };
            this.updateVersionUI();
        }
    }

    // 检测插件安装来源
    async detectInstallSource() {
        try {
            const management = await chrome.management.getSelf();
            const manifest = chrome.runtime.getManifest();
            
            console.log('=== 安装来源检测详细信息 ===');
            console.log('Management信息:', {
                installType: management.installType,
                enabled: management.enabled,
                id: management.id,
                mayBeFromStore: management.mayBeFromStore,
                name: management.name,
                version: management.version
            });
            console.log('Manifest信息:', {
                update_url: manifest.update_url,
                version: manifest.version,
                name: manifest.name
            });
            
            // 开发者模式
            if (management.installType === 'development') {
                console.log('✅ 检测结果: 开发者模式');
                return 'development';
            }
            
            // 侧载安装（sideload）通常是手动安装
            if (management.installType === 'sideload') {
                console.log('✅ 检测结果: 侧载安装（手动安装）');
                return 'manual';
            }
            
            // 检查是否从Chrome Web Store安装
            // Chrome Web Store安装的扩展有以下特征：
            // 1. installType为'normal'
            // 2. 扩展ID符合Chrome Web Store的格式（32位字符）
            // 3. 没有自定义update_url，或者update_url包含google.com
            if (management.installType === 'normal') {
                console.log('检测到normal安装类型，进一步检查...');
                
                // 检查扩展ID是否符合Chrome Web Store格式（32位小写字母）
                const isWebStoreId = /^[a-p]{32}$/.test(management.id);
                console.log('ID格式检查:', {
                    id: management.id,
                    isWebStoreFormat: isWebStoreId,
                    idLength: management.id.length
                });
                
                // 检查update_url
                const hasStoreUpdateUrl = !manifest.update_url || manifest.update_url.includes('clients2.google.com');
                console.log('Update URL检查:', {
                    update_url: manifest.update_url,
                    hasStoreUpdateUrl: hasStoreUpdateUrl
                });
                
                // 如果ID符合Web Store格式，且没有自定义update_url，则可能是从商店安装
                if (isWebStoreId && hasStoreUpdateUrl) {
                    console.log('✅ 检测结果: 可能来自Chrome Web Store');
                    return 'webstore';
                } else {
                    console.log('✅ 检测结果: normal类型但非商店安装，判定为手动安装');
                    return 'manual';
                }
            }
            
            // 其他情况视为手动安装
            console.log('✅ 检测结果: 其他情况，判定为手动安装');
            console.log('InstallType:', management.installType);
            return 'manual';
        } catch (error) {
            console.warn('无法检测安装来源:', error);
            // 如果检测失败，默认为手动安装（保守策略）
            return 'manual';
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
        
        // 根据安装来源显示不同内容
        if (!this.versionInfo.isManualInstall) {
            // 官方商店安装：只显示当前版本和官网推广
            this.showOfficialStoreUI();
        } else {
            // 手动安装：显示完整的版本检查功能
            this.showManualInstallUI();
        }
    }
    
    // 显示官方商店用户的UI
    showOfficialStoreUI() {
        // 隐藏最新版本检查相关元素
        const latestVersionElement = document.getElementById('latestVersion');
        const updateNotice = document.getElementById('updateNotice');
        
        if (latestVersionElement) {
            latestVersionElement.textContent = this.i18nManager.t('version.autoUpdate');
        }
        
        if (updateNotice) {
            updateNotice.style.display = 'none';
        }
        
        // 显示官网推广
        this.showOfficialWebsitePromotion();
    }
    
    // 显示手动安装用户的UI
    showManualInstallUI() {
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
        } else {
            // 隐藏更新提示
            const updateNotice = document.getElementById('updateNotice');
            if (updateNotice) {
                updateNotice.style.display = 'none';
            }
        }
    }
    
    // 显示官网推广
    showOfficialWebsitePromotion() {
        // 查找或创建官网推广区域
        let promotionArea = document.getElementById('officialWebsitePromotion');
        
        if (!promotionArea) {
            // 创建推广区域
            promotionArea = document.createElement('div');
            promotionArea.id = 'officialWebsitePromotion';
            promotionArea.className = 'official-website-promotion';
            
            // 插入到版本信息区域后面
            const versionSection = document.querySelector('.version-section');
            if (versionSection) {
                versionSection.appendChild(promotionArea);
            }
        }
        
        // 设置推广内容
        promotionArea.innerHTML = `
            <div class="promotion-content">
                <h4>${this.i18nManager.t('version.officialWebsite')}</h4>
                <p>${this.i18nManager.t('version.visitOfficialSite')}</p>
                <a href="https://adhdgofly.online" target="_blank" class="official-website-link">
                    🌐 adhdgofly.online
                </a>
                <p class="auto-update-note">${this.i18nManager.t('version.autoUpdateNote')}</p>
            </div>
        `;
        
        promotionArea.style.display = 'block';
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