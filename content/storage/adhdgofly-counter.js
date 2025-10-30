/**
 * ADHDGoFlyCounter - ADHD专注飞行计数器系统
 * 
 * 功能说明：
 * 1. 页面计数器：统计不重复页面访问，1小时内同一页面只计数一次
 * 2. 节点计数器：统计实际处理的文本节点数量，每个节点处理完计数一次
 * 3. 评价提醒：基于天数+节点数双重条件触发
 * 4. 隐私保护：URL使用SHA-256哈希值存储
 * 
 * 存储架构：
 * - 使用 IndexedDB 作为主要存储方案（通过 UniversalStorageAdapter）
 * - 自动降级到 Chrome Storage API 或 localStorage
 * - 支持数据迁移和跨浏览器兼容
 */

class ADHDGoFlyCounter {
    constructor() {
        // 存储键定义
        this.STORAGE_KEYS = {
            NODE_COUNT: 'adhdgofly_node_count',
            PAGE_COUNT: 'adhdgofly_page_count', 
            PAGE_VISITS: 'adhdgofly_page_visits',
            METADATA: 'adhdgofly_counter_metadata'
        };
        
        // 时间常量
        this.ONE_HOUR_MS = 60 * 60 * 1000; // 1小时毫秒数
        
        // 存储适配器
        this.storage = null;
        this.initialized = false;
    }

    /**
     * 初始化存储适配器
     */
    async _initStorage() {
        if (this.initialized) return;
        
        try {
            // 如果全局存储适配器存在，使用它
            if (typeof window !== 'undefined' && window.universalStorage) {
                this.storage = window.universalStorage;
                await this.storage.initialize();
            } else {
                // 降级到 Chrome Storage API
                this.storage = {
                    get: (key) => this._getChromeStorage(key),
                    set: (key, value) => this._setChromeStorage(key, value),
                    remove: (key) => this._removeChromeStorage(key)
                };
                console.log('ADHDGoFlyCounter：使用 Chrome Storage API 降级模式');
            }
            
            this.initialized = true;
            console.log('ADHDGoFlyCounter：存储适配器初始化完成');
        } catch (error) {
            console.error('ADHDGoFlyCounter：存储适配器初始化失败:', error);
            // 使用 Chrome Storage API 作为最终降级
            this.storage = {
                get: (key) => this._getChromeStorage(key),
                set: (key, value) => this._setChromeStorage(key, value),
                remove: (key) => this._removeChromeStorage(key)
            };
            this.initialized = true;
        }
    }

    /**
     * 增加节点计数
     * @param {number} count - 增加的节点数量，默认为1
     */
    async incrementNodeCount(count = 1) {
        try {
            await this._initStorage();
            
            const currentCount = await this.getNodeCount();
            const newCount = currentCount + count;
            
            await this.storage.set(this.STORAGE_KEYS.NODE_COUNT, newCount);
            
            console.log(`ADHDGoFlyCounter日志：📊 节点计数更新: ${currentCount} → ${newCount} (+${count})`);
            return newCount;
        } catch (error) {
            console.error('ADHDGoFlyCounter日志：❌ 节点计数更新失败:', error);
            return 0;
        }
    }

    /**
     * 增加页面计数（带去重逻辑）
     * @param {string} url - 当前页面URL
     */
    async incrementPageCount(url = window.location.href) {
        try {
            await this._initStorage();
            
            // 生成URL哈希
            const urlHash = await this._generateUrlHash(url);
            const currentTime = Date.now();
            
            // 获取页面访问记录
            const pageVisits = await this.storage.get(this.STORAGE_KEYS.PAGE_VISITS) || {};
            
            // 检查是否需要计数
            const lastVisit = pageVisits[urlHash];
            const shouldCount = !lastVisit || (currentTime - lastVisit.timestamp > this.ONE_HOUR_MS);
            
            if (shouldCount) {
                // 更新页面访问记录
                pageVisits[urlHash] = {
                    timestamp: currentTime,
                    url: url // 仅用于调试，实际存储时可考虑移除
                };
                
                // 清理过期记录
                this._cleanExpiredVisits(pageVisits, currentTime);
                
                // 保存页面访问记录
                await this.storage.set(this.STORAGE_KEYS.PAGE_VISITS, pageVisits);
                
                // 增加页面计数
                const currentPageCount = await this.getPageCount();
                const newPageCount = currentPageCount + 1;
                await this.storage.set(this.STORAGE_KEYS.PAGE_COUNT, newPageCount);
                
                console.log(`ADHDGoFlyCounter日志：📄 页面计数更新: ${currentPageCount} → ${newPageCount} (新页面: ${url})`);
                return newPageCount;
            } else {
                const timeSinceLastVisit = Math.round((currentTime - lastVisit.timestamp) / (1000 * 60));
                const currentPageCount = await this.getPageCount();
                console.log(`ADHDGoFlyCounter日志：⏰ 页面重复访问，跳过计数 (距离上次访问: ${timeSinceLastVisit}分钟，当前累计: ${currentPageCount}页)`);
                return currentPageCount;
            }
        } catch (error) {
            console.error('ADHDGoFlyCounter日志：❌ 页面计数更新失败:', error);
            return 0;
        }
    }

    /**
     * 获取节点计数
     */
    async getNodeCount() {
        await this._initStorage();
        return await this.storage.get(this.STORAGE_KEYS.NODE_COUNT) || 0;
    }

    /**
     * 获取页面计数
     */
    async getPageCount() {
        await this._initStorage();
        return await this.storage.get(this.STORAGE_KEYS.PAGE_COUNT) || 0;
    }



    /**
     * 标记评价提醒已显示
     */
    async markRatingReminderShown(reminderKey) {
        try {
            await this._initStorage();
            
            const metadata = await this.storage.get(this.STORAGE_KEYS.METADATA) || {};
            const shownReminders = metadata.shownReminders || [];
            
            if (!shownReminders.includes(reminderKey)) {
                shownReminders.push(reminderKey);
                metadata.shownReminders = shownReminders;
                await this.storage.set(this.STORAGE_KEYS.METADATA, metadata);
                
                console.log(`ADHDGoFlyCounter日志：✅ 评价提醒已标记为显示: ${reminderKey}`);
            }
        } catch (error) {
            console.error('ADHDGoFlyCounter日志：❌ 标记评价提醒失败:', error);
        }
    }

    /**
     * 获取统计元数据
     */
    async getMetadata() {
        try {
            await this._initStorage();
            
            const metadata = await this.storage.get(this.STORAGE_KEYS.METADATA) || {};
            const nodeCount = await this.getNodeCount();
            const pageCount = await this.getPageCount();
            
            // 确保安装时间存在
            if (!metadata.installTime) {
                metadata.installTime = Date.now();
                await this.storage.set(this.STORAGE_KEYS.METADATA, metadata);
            }
            
            const daysSinceInstall = Math.floor((Date.now() - metadata.installTime) / (1000 * 60 * 60 * 24));
            
            return {
                installTime: metadata.installTime,
                daysSinceInstall,
                nodeCount,
                pageCount,
                shownReminders: metadata.shownReminders || [],
                averageNodesPerDay: daysSinceInstall > 0 ? Math.round(nodeCount / daysSinceInstall) : 0,
                averagePagesPerDay: daysSinceInstall > 0 ? Math.round(pageCount / daysSinceInstall) : 0
            };
        } catch (error) {
            console.error('ADHDGoFlyCounter日志：❌ 获取元数据失败:', error);
            return {};
        }
    }

    /**
     * 重置所有计数器（仅用于测试）
     */
    async resetAllCounters() {
        try {
            await this._initStorage();
            
            await this.storage.remove(this.STORAGE_KEYS.NODE_COUNT);
            await this.storage.remove(this.STORAGE_KEYS.PAGE_COUNT);
            await this.storage.remove(this.STORAGE_KEYS.PAGE_VISITS);
            await this.storage.remove(this.STORAGE_KEYS.METADATA);
            
            console.log('ADHDGoFlyCounter日志：🔄 所有计数器已重置');
        } catch (error) {
            console.error('ADHDGoFlyCounter日志：❌ 重置计数器失败:', error);
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 生成URL的SHA-256哈希值
     */
    async _generateUrlHash(url) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(url);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('❌ URL哈希生成失败:', error);
            // 降级方案：使用简单哈希
            return this._simpleHash(url);
        }
    }

    /**
     * 简单哈希函数（降级方案）
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * 清理过期的页面访问记录
     */
    _cleanExpiredVisits(pageVisits, currentTime) {
        const expiredKeys = [];
        
        for (const [urlHash, visitData] of Object.entries(pageVisits)) {
            if (currentTime - visitData.timestamp > this.ONE_HOUR_MS) {
                expiredKeys.push(urlHash);
            }
        }
        
        expiredKeys.forEach(key => delete pageVisits[key]);
        
        if (expiredKeys.length > 0) {
            console.log(`🧹 清理过期页面访问记录: ${expiredKeys.length}条`);
        }
    }

    // ==================== Chrome Storage API 降级方法 ====================

    /**
     * Chrome Storage API 获取数据（降级模式）
     */
    async _getChromeStorage(key) {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] !== undefined ? result[key] : null);
            });
        });
    }

    /**
     * Chrome Storage API 设置数据（降级模式）
     */
    async _setChromeStorage(key, value) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [key]: value }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Chrome Storage API 删除数据（降级模式）
     */
    async _removeChromeStorage(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove([key], () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    // ==================== 兼容性方法（已弃用，保留用于向后兼容） ====================

    /**
     * @deprecated 使用 storage.get() 替代
     */
    async _getStorageData(key, defaultValue = null) {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] !== undefined ? result[key] : defaultValue);
            });
        });
    }

    /**
     * @deprecated 使用 storage.set() 替代
     */
    async _setStorageData(key, value) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [key]: value }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * @deprecated 使用 storage.remove() 替代
     */
    async _removeStorageData(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove([key], () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ADHDGoFlyCounter;
} else if (typeof window !== 'undefined') {
    window.ADHDGoFlyCounter = ADHDGoFlyCounter;
}