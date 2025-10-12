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
        
        // 匿名统计开关 - 暂时注释掉，后续实现埋点后启用
        /*
        const anonymousStatsToggle = document.getElementById('anonymous-stats-toggle');
        if (anonymousStatsToggle) {
            anonymousStatsToggle.addEventListener('change', (e) => {
                this.saveData({ anonymousStats: e.target.checked });
            });
        }
        */

        // 重置按钮 - 暂时注释掉，后续需要时启用
        /*
        const resetBtn = document.getElementById('reset-all-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetAllSettings();
            });
        }
        */
    }

    bindStorageEvents() {
        // 缓存保留时间选择
        const retentionRadios = document.querySelectorAll('input[name="storage-retention"]');
        retentionRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const retentionDays = parseFloat(e.target.value);
                    this.saveStorageSettings({ cacheRetentionDays: retentionDays });
                    
                    // 特殊提示：3分钟测试模式
                    if (retentionDays === 0.002) {
                        this.showMessage('🧪 已启用3分钟测试模式，缓存将在3分钟后过期', 'info');
                    }
                }
            });
        });



        // 清理所有缓存按钮
        const cleanupAllBtn = document.getElementById('cleanup-all');
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

            // 匿名统计开关状态 - 暂时注释掉，后续实现埋点后启用
            /*
            const anonymousStatsToggle = document.getElementById('anonymous-stats-toggle');
            if (anonymousStatsToggle) {
                anonymousStatsToggle.checked = result.anonymousStats;
            }
            */

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
        const retentionValue = settings.cacheEnabled ? settings.cacheRetentionDays : 0;
        const retentionRadio = document.querySelector(`input[name="storage-retention"][value="${retentionValue}"]`);
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

            const usedSpaceElement = document.getElementById('used-storage-space');
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
            // 从 IndexedDB 获取真实的缓存统计数据
            // 通过消息传递与 content script 通信
            // 先尝试获取当前活动标签页
            let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // 如果没有找到活动标签页，或者活动标签页是扩展页面，尝试找其他标签页
            if (!tabs.length || tabs[0].url.startsWith('chrome-extension://')) {
                tabs = await chrome.tabs.query({ currentWindow: true });
                // 过滤掉扩展页面和特殊页面
                tabs = tabs.filter(tab => 
                    !tab.url.startsWith('chrome-extension://') && 
                    !tab.url.startsWith('chrome://') &&
                    !tab.url.startsWith('edge://') &&
                    !tab.url.startsWith('about:')
                );
            }
            
            if (!tabs.length) {
                console.warn('没有找到可用的网页标签');
                return { totalRecords: 0, totalSize: 0, lastCleanup: null };
            }

            const tab = tabs[0];
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getCacheStats'
            });

            if (response && response.success) {
                const stats = response.stats;
                return {
                    pageCount: stats.totalRecords || 0,
                    totalSize: stats.totalSize || 0,
                    lastCleanup: stats.lastCleanup || null,
                    // 保持向后兼容，同时提供新的字段名
                    totalRecords: stats.totalRecords || 0,
                    oldestRecord: stats.oldestRecord || null,
                    newestRecord: stats.newestRecord || null,
                    retentionDays: stats.retentionDays || 7,
                    enabled: stats.enabled !== false
                };
            } else {
                console.warn('获取缓存统计失败:', response?.error || '未知错误');
                return { pageCount: 0, totalSize: 0, lastCleanup: null };
            }
        } catch (error) {
            console.error('获取缓存统计失败:', error);
            // 如果是因为没有 content script 或页面不支持，返回默认值
            if (error.message && error.message.includes('Could not establish connection')) {
                console.info('当前页面不支持缓存功能（可能是扩展页面或特殊页面）');
            }
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
        const selectedRetention = document.querySelector('input[name="storage-retention"]:checked');
        if (selectedRetention) {
            const retentionValue = parseFloat(selectedRetention.value);
            const settings = {
                cacheEnabled: retentionValue !== 0,
                cacheRetentionDays: retentionValue > 0 ? retentionValue : 7
            };
            
            await this.saveStorageSettings(settings);
            this.showMessage('存储设置已保存');
        }
    }

    // cleanupExpiredCache 方法已删除
    // 原因：系统在读取缓存时会自动检查并删除过期数据，无需手动清理
    // 用户可以使用"清除所有缓存"按钮来彻底清理所有缓存数据

    async cleanupAllCache() {
        if (confirm('确定要清除所有缓存吗？这将删除所有已保存的高亮数据。')) {
            try {
                // 显示清理中的提示
                this.showMessage('正在清除所有缓存...', 'info');
                
                // 通过消息传递调用 content script 中的 EventCacheManager
                // 先尝试获取当前活动标签页
                let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                console.log('🔍 活动标签页:', tabs);
                
                // 如果没有找到活动标签页，或者活动标签页是扩展页面，尝试找其他标签页
                if (!tabs.length || tabs[0].url.startsWith('chrome-extension://')) {
                    tabs = await chrome.tabs.query({ currentWindow: true });
                    console.log('🔍 当前窗口所有标签页:', tabs);
                    // 过滤掉扩展页面和特殊页面
                    tabs = tabs.filter(tab => 
                        !tab.url.startsWith('chrome-extension://') && 
                        !tab.url.startsWith('chrome://') &&
                        !tab.url.startsWith('edge://') &&
                        !tab.url.startsWith('about:')
                    );
                    console.log('🔍 过滤后的标签页:', tabs);
                }
                
                if (!tabs.length) {
                    this.showMessage('没有找到可用的网页标签，请先打开一个普通网页', 'error');
                    return;
                }

                const tab = tabs[0];
                console.log('📤 发送消息到标签页:', tab.id, tab.url, { action: 'clearAllCache' });
                
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'clearAllCache'
                });

                if (response && response.success) {
                    this.showMessage('所有缓存已清除');
                    // 更新显示的统计数据
                    await this.updateStorageUsage();
                } else {
                    const errorMsg = response?.error || '未知错误';
                    console.error('清除所有缓存失败:', errorMsg);
                    this.showMessage(`清除失败: ${errorMsg}`, 'error');
                }
            } catch (error) {
                console.error('清除所有缓存失败:', error);
                if (error.message && error.message.includes('Could not establish connection')) {
                    this.showMessage('当前页面不支持缓存功能，请在普通网页中打开设置', 'error');
                } else {
                    this.showMessage('清除失败，请重试', 'error');
                }
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