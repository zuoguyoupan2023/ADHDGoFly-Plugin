/**
 * 高亮次数计数器
 * 统计用户高亮操作次数，纯计数存储功能
 */
class HighlightCounter {
    constructor() {
        this.storageKeys = {
            HIGHLIGHT_COUNT: 'highlight_count',
            HIGHLIGHT_METADATA: 'highlight_metadata'
        };
        
        this.init();
    }

    /**
     * 初始化计数器
     */
    async init() {
        try {
            await this.ensureMetadata();
        } catch (error) {
            console.error('HighlightCounter初始化失败:', error);
        }
    }

    /**
     * 增加高亮次数
     */
    async incrementCount() {
        try {
            const currentCount = await this.getCount();
            const newCount = currentCount + 1;
            
            // 存储新的计数
            await chrome.storage.local.set({
                [this.storageKeys.HIGHLIGHT_COUNT]: newCount
            });
            
            // 更新元数据
            await this.updateMetadata();
            
            return newCount;
        } catch (error) {
            console.error('增加高亮次数失败:', error);
            return 0;
        }
    }

    /**
     * 获取当前高亮次数
     */
    async getCount() {
        try {
            const result = await chrome.storage.local.get([this.storageKeys.HIGHLIGHT_COUNT]);
            return result[this.storageKeys.HIGHLIGHT_COUNT] || 0;
        } catch (error) {
            console.error('获取高亮次数失败:', error);
            return 0;
        }
    }

    /**
     * 获取并确保元数据存在
     */
    async getMetadata() {
        try {
            const result = await chrome.storage.local.get([this.storageKeys.HIGHLIGHT_METADATA]);
            return result[this.storageKeys.HIGHLIGHT_METADATA] || await this.ensureMetadata();
        } catch (error) {
            console.error('获取元数据失败:', error);
            return await this.ensureMetadata();
        }
    }

    /**
     * 确保元数据存在
     */
    async ensureMetadata() {
        try {
            const metadata = {
                firstHighlight: new Date().toISOString(),
                lastHighlight: new Date().toISOString(),
                totalDays: 1
            };
            
            await chrome.storage.local.set({
                [this.storageKeys.HIGHLIGHT_METADATA]: metadata
            });
            
            return metadata;
        } catch (error) {
            console.error('创建元数据失败:', error);
            return {
                firstHighlight: new Date().toISOString(),
                lastHighlight: new Date().toISOString(),
                totalDays: 1
            };
        }
    }

    /**
     * 更新元数据
     */
    async updateMetadata() {
        try {
            const metadata = await this.getMetadata();
            const now = new Date().toISOString();
            
            metadata.lastHighlight = now;
            
            // 计算总天数
            const firstDate = new Date(metadata.firstHighlight);
            const currentDate = new Date();
            metadata.totalDays = Math.max(1, this.getDaysDifference(firstDate, currentDate) + 1);
            
            await chrome.storage.local.set({
                [this.storageKeys.HIGHLIGHT_METADATA]: metadata
            });
        } catch (error) {
            console.error('更新元数据失败:', error);
        }
    }

    /**
     * 计算两个日期之间的天数差
     */
    getDaysDifference(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.floor((date2 - date1) / oneDay);
    }

    /**
     * 重置计数器（用于测试）
     */
    async reset() {
        try {
            await chrome.storage.local.remove([
                this.storageKeys.HIGHLIGHT_COUNT,
                this.storageKeys.HIGHLIGHT_METADATA
            ]);
            await this.init();
        } catch (error) {
            console.error('重置计数器失败:', error);
        }
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        try {
            const count = await this.getCount();
            const metadata = await this.getMetadata();
            
            return {
                totalHighlights: count,
                firstHighlight: metadata.firstHighlight,
                lastHighlight: metadata.lastHighlight,
                totalDays: metadata.totalDays,
                averagePerDay: Math.round(count / metadata.totalDays * 100) / 100
            };
        } catch (error) {
            console.error('获取统计信息失败:', error);
            return {
                totalHighlights: 0,
                firstHighlight: null,
                lastHighlight: null,
                totalDays: 0,
                averagePerDay: 0
            };
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighlightCounter;
}