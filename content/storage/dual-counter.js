/**
 * DualCounter - 双重计数器系统
 * 
 * 功能说明：
 * 1. 页面计数器：统计不重复页面访问，1小时内同一页面只计数一次
 * 2. 节点计数器：统计实际处理的文本节点数量，每个节点处理完计数一次
 * 3. 评价提醒：基于天数+节点数双重条件触发
 * 4. 隐私保护：URL使用SHA-256哈希值存储
 */

class DualCounter {
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
        
        // 评价提醒阈值配置
        this.RATING_THRESHOLDS = [
            { days: 7, nodes: 1000 },   // 第一次提醒：7天 + 1000节点
            { days: 21, nodes: 5000 },  // 第二次提醒：21天 + 5000节点  
            { days: 50, nodes: 10000 }  // 第三次提醒：50天 + 10000节点
        ];
    }

    /**
     * 增加节点计数
     * @param {number} count - 增加的节点数量，默认为1
     */
    async incrementNodeCount(count = 1) {
        try {
            const currentCount = await this.getNodeCount();
            const newCount = currentCount + count;
            
            await this._setStorageData(this.STORAGE_KEYS.NODE_COUNT, newCount);
            
            console.log(`📊 节点计数更新: ${currentCount} → ${newCount} (+${count})`);
            return newCount;
        } catch (error) {
            console.error('❌ 节点计数更新失败:', error);
            return 0;
        }
    }

    /**
     * 增加页面计数（带去重逻辑）
     * @param {string} url - 当前页面URL
     */
    async incrementPageCount(url = window.location.href) {
        try {
            // 生成URL哈希
            const urlHash = await this._generateUrlHash(url);
            const currentTime = Date.now();
            
            // 获取页面访问记录
            const pageVisits = await this._getStorageData(this.STORAGE_KEYS.PAGE_VISITS, {});
            
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
                await this._setStorageData(this.STORAGE_KEYS.PAGE_VISITS, pageVisits);
                
                // 增加页面计数
                const currentPageCount = await this.getPageCount();
                const newPageCount = currentPageCount + 1;
                await this._setStorageData(this.STORAGE_KEYS.PAGE_COUNT, newPageCount);
                
                console.log(`📄 页面计数更新: ${currentPageCount} → ${newPageCount} (新页面: ${url})`);
                return newPageCount;
            } else {
                const timeSinceLastVisit = Math.round((currentTime - lastVisit.timestamp) / (1000 * 60));
                console.log(`⏰ 页面重复访问，跳过计数 (距离上次访问: ${timeSinceLastVisit}分钟)`);
                return await this.getPageCount();
            }
        } catch (error) {
            console.error('❌ 页面计数更新失败:', error);
            return 0;
        }
    }

    /**
     * 获取节点计数
     */
    async getNodeCount() {
        return await this._getStorageData(this.STORAGE_KEYS.NODE_COUNT, 0);
    }

    /**
     * 获取页面计数
     */
    async getPageCount() {
        return await this._getStorageData(this.STORAGE_KEYS.PAGE_COUNT, 0);
    }

    /**
     * 检查是否应该显示评价提醒
     */
    async shouldShowRatingReminder() {
        try {
            const metadata = await this._getStorageData(this.STORAGE_KEYS.METADATA, {});
            const installTime = metadata.installTime || Date.now();
            const shownReminders = metadata.shownReminders || [];
            const nodeCount = await this.getNodeCount();
            
            const daysSinceInstall = Math.floor((Date.now() - installTime) / (1000 * 60 * 60 * 24));
            
            // 检查每个阈值
            for (let i = 0; i < this.RATING_THRESHOLDS.length; i++) {
                const threshold = this.RATING_THRESHOLDS[i];
                const reminderKey = `${threshold.days}d_${threshold.nodes}n`;
                
                // 如果已经显示过这个提醒，跳过
                if (shownReminders.includes(reminderKey)) {
                    continue;
                }
                
                // 检查是否同时满足天数和节点数条件
                if (daysSinceInstall >= threshold.days && nodeCount >= threshold.nodes) {
                    return {
                        shouldShow: true,
                        reminderKey,
                        days: daysSinceInstall,
                        nodes: nodeCount,
                        threshold
                    };
                }
            }
            
            return { shouldShow: false };
        } catch (error) {
            console.error('❌ 检查评价提醒失败:', error);
            return { shouldShow: false };
        }
    }

    /**
     * 标记评价提醒已显示
     */
    async markRatingReminderShown(reminderKey) {
        try {
            const metadata = await this._getStorageData(this.STORAGE_KEYS.METADATA, {});
            const shownReminders = metadata.shownReminders || [];
            
            if (!shownReminders.includes(reminderKey)) {
                shownReminders.push(reminderKey);
                metadata.shownReminders = shownReminders;
                await this._setStorageData(this.STORAGE_KEYS.METADATA, metadata);
                
                console.log(`✅ 评价提醒已标记为显示: ${reminderKey}`);
            }
        } catch (error) {
            console.error('❌ 标记评价提醒失败:', error);
        }
    }

    /**
     * 获取统计元数据
     */
    async getMetadata() {
        try {
            const metadata = await this._getStorageData(this.STORAGE_KEYS.METADATA, {});
            const nodeCount = await this.getNodeCount();
            const pageCount = await this.getPageCount();
            
            // 确保安装时间存在
            if (!metadata.installTime) {
                metadata.installTime = Date.now();
                await this._setStorageData(this.STORAGE_KEYS.METADATA, metadata);
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
            console.error('❌ 获取元数据失败:', error);
            return {};
        }
    }

    /**
     * 重置所有计数器（仅用于测试）
     */
    async resetAllCounters() {
        try {
            await this._removeStorageData(this.STORAGE_KEYS.NODE_COUNT);
            await this._removeStorageData(this.STORAGE_KEYS.PAGE_COUNT);
            await this._removeStorageData(this.STORAGE_KEYS.PAGE_VISITS);
            await this._removeStorageData(this.STORAGE_KEYS.METADATA);
            
            console.log('🔄 所有计数器已重置');
        } catch (error) {
            console.error('❌ 重置计数器失败:', error);
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

    /**
     * 获取存储数据
     */
    async _getStorageData(key, defaultValue = null) {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] !== undefined ? result[key] : defaultValue);
            });
        });
    }

    /**
     * 设置存储数据
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
     * 删除存储数据
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
    module.exports = DualCounter;
} else if (typeof window !== 'undefined') {
    window.DualCounter = DualCounter;
}