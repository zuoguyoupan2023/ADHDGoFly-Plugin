/**
 * ReviewLightTower - 评价提醒灯塔系统
 * 
 * 功能说明：
 * 1. 独立实现评价提醒功能，不影响现有reviewtimer和reviewcounter逻辑
 * 2. 基于时间和使用量双重维度的触发条件
 * 3. 硬编码触发点：时间维度(1小时、10小时、22小时)，使用量维度(100次、200次、300次)
 * 4. 提供独立的UI展示逻辑
 * 5. 记录用户行为和触发历史
 * 
 * 设计原则：
 * - 完全独立，不修改现有代码
 * - 渐进式实现，先硬编码后配置化
 * - 安全可回滚，保持现有功能稳定
 */

class ReviewLightTower {
    constructor() {
        // 硬编码的触发条件（第一阶段）
        this.TRIGGER_CONDITIONS = {
            // 时间维度触发点（小时）
            TIME_HOURS: [1, 10, 22],
            // 使用量维度触发点（处理节点数）
            PROCESS_COUNTS: [100, 200, 300]
        };
        
        // 存储键定义
        this.STORAGE_KEYS = {
            TRIGGER_HISTORY: 'review_light_tower_trigger_history',
            USER_ACTIONS: 'review_light_tower_user_actions',
            LAST_CHECK: 'review_light_tower_last_check',
            DISMISSED_FOREVER: 'review_light_tower_dismissed_forever'
        };
        
        // 初始化ReviewTimer和ReviewCounter实例
        this.reviewTimer = null;
        this.reviewCounter = null;
        
        console.log('ReviewLightTower：🗼 评价提醒灯塔系统已初始化');
    }

    /**
     * 初始化系统
     */
    async init() {
        try {
            // 初始化依赖的计时器和计数器
            if (typeof ReviewTimer !== 'undefined') {
                this.reviewTimer = new ReviewTimer();
                await this.reviewTimer.init();
            }
            
            if (typeof ReviewCounter !== 'undefined') {
                this.reviewCounter = new ReviewCounter();
                await this.reviewCounter.init();
            }
            
            console.log('ReviewLightTower：✅ 系统初始化完成');
            return true;
        } catch (error) {
            console.error('ReviewLightTower：❌ 初始化失败:', error);
            return false;
        }
    }

    /**
     * 检查是否满足触发条件
     * @returns {Object} 触发检查结果
     */
    async shouldShowReview() {
        try {
            // 检查是否已被永久禁用
            const dismissedForever = await this._getStorageData(this.STORAGE_KEYS.DISMISSED_FOREVER, false);
            if (dismissedForever) {
                return {
                    shouldShow: false,
                    reason: 'user_dismissed_forever',
                    message: '用户已选择永不提醒'
                };
            }

            // 获取触发历史
            const triggerHistory = await this._getStorageData(this.STORAGE_KEYS.TRIGGER_HISTORY, []);
            
            // 检查时间维度触发条件
            const timeResult = await this._checkTimeConditions(triggerHistory);
            if (timeResult.shouldTrigger) {
                return {
                    shouldShow: true,
                    triggerType: 'time',
                    triggerValue: timeResult.triggerHour,
                    currentValue: timeResult.currentHours,
                    reason: `使用时间达到${timeResult.triggerHour}小时`,
                    data: timeResult
                };
            }

            // 检查使用量维度触发条件
            const usageResult = await this._checkUsageConditions(triggerHistory);
            if (usageResult.shouldTrigger) {
                return {
                    shouldShow: true,
                    triggerType: 'usage',
                    triggerValue: usageResult.triggerCount,
                    currentValue: usageResult.currentNodes,
                    reason: `处理节点达到${usageResult.triggerCount}次`,
                    data: usageResult
                };
            }

            return {
                shouldShow: false,
                reason: 'conditions_not_met',
                message: '未达到触发条件'
            };

        } catch (error) {
            console.error('ReviewLightTower：检查触发条件失败:', error);
            return {
                shouldShow: false,
                reason: 'check_failed',
                message: '检查失败'
            };
        }
    }

    /**
     * 检查时间维度触发条件
     * @param {Array} triggerHistory - 触发历史
     * @returns {Object} 时间检查结果
     */
    async _checkTimeConditions(triggerHistory) {
        try {
            const usageData = await this.getUsageData();
            if (!usageData || usageData.totalUsageHours === undefined) {
                return { shouldTrigger: false, reason: 'no_time_data' };
            }

            const currentHours = usageData.totalUsageHours;
            
            // 检查每个时间触发点
            for (const targetHour of this.TRIGGER_CONDITIONS.TIME_HOURS) {
                const triggerKey = `time_${targetHour}h`;
                
                // 如果已经触发过这个时间点，跳过
                if (triggerHistory.some(item => item.triggerKey === triggerKey)) {
                    continue;
                }
                
                // 检查是否达到触发条件
                if (currentHours >= targetHour) {
                    return {
                        shouldTrigger: true,
                        triggerHour: targetHour,
                        currentHours: currentHours,
                        triggerKey: triggerKey
                    };
                }
            }

            return { shouldTrigger: false, currentHours };
        } catch (error) {
            console.error('ReviewLightTower：检查时间条件失败:', error);
            return { shouldTrigger: false, reason: 'time_check_failed' };
        }
    }

    /**
     * 检查使用量维度触发条件
     * @param {Array} triggerHistory - 触发历史
     * @returns {Object} 使用量检查结果
     */
    async _checkUsageConditions(triggerHistory) {
        try {
            const processData = await this.getProcessData();
            if (!processData || processData.totalProcessedNodes === undefined) {
                return { shouldTrigger: false, reason: 'no_usage_data' };
            }

            const currentNodes = processData.totalProcessedNodes;
            
            // 检查每个使用量触发点
            for (const targetCount of this.TRIGGER_CONDITIONS.PROCESS_COUNTS) {
                const triggerKey = `usage_${targetCount}n`;
                
                // 如果已经触发过这个使用量点，跳过
                if (triggerHistory.some(item => item.triggerKey === triggerKey)) {
                    continue;
                }
                
                // 检查是否达到触发条件
                if (currentNodes >= targetCount) {
                    return {
                        shouldTrigger: true,
                        triggerCount: targetCount,
                        currentNodes: currentNodes,
                        triggerKey: triggerKey
                    };
                }
            }

            return { shouldTrigger: false, currentNodes };
        } catch (error) {
            console.error('ReviewLightTower：检查使用量条件失败:', error);
            return { shouldTrigger: false, reason: 'usage_check_failed' };
        }
    }

    /**
     * 显示评价提醒
     * @param {Object} triggerData - 触发数据
     */
    showReviewPrompt(triggerData) {
        try {
            console.log('ReviewLightTower：🎯 显示评价提醒', triggerData);
            
            // 创建提醒UI
            const promptElement = this._createPromptUI(triggerData);
            
            // 添加到页面
            document.body.appendChild(promptElement);
            
            // 记录显示事件
            this.recordUserAction('shown', triggerData);
            
            return promptElement;
        } catch (error) {
            console.error('ReviewLightTower：显示评价提醒失败:', error);
            return null;
        }
    }

    /**
     * 创建提醒UI元素
     * @param {Object} triggerData - 触发数据
     * @returns {HTMLElement} 提醒UI元素
     */
    _createPromptUI(triggerData) {
        const overlay = document.createElement('div');
        overlay.className = 'review-light-tower-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.className = 'review-light-tower-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            text-align: center;
        `;

        const title = document.createElement('h3');
        title.textContent = '🌟 喜欢这个插件吗？';
        title.style.cssText = `
            margin: 0 0 16px 0;
            color: #333;
            font-size: 20px;
        `;

        const message = document.createElement('p');
        message.textContent = `您已经使用插件${triggerData.reason}，如果觉得有帮助，请考虑给我们一个好评！`;
        message.style.cssText = `
            margin: 0 0 24px 0;
            color: #666;
            line-height: 1.5;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
        `;

        // 评价按钮
        const rateButton = document.createElement('button');
        rateButton.textContent = '⭐ 去评价';
        rateButton.style.cssText = `
            padding: 10px 20px;
            background: #007aff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        `;
        rateButton.onclick = () => {
            this.recordUserAction('rated', triggerData);
            this._openRatingPage();
            overlay.remove();
        };

        // 稍后提醒按钮
        const laterButton = document.createElement('button');
        laterButton.textContent = '稍后提醒';
        laterButton.style.cssText = `
            padding: 10px 20px;
            background: #f0f0f0;
            color: #333;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        `;
        laterButton.onclick = () => {
            this.recordUserAction('later', triggerData);
            overlay.remove();
        };

        // 永不提醒按钮
        const neverButton = document.createElement('button');
        neverButton.textContent = '不再提醒';
        neverButton.style.cssText = `
            padding: 10px 20px;
            background: #ff3b30;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        `;
        neverButton.onclick = () => {
            this.recordUserAction('never', triggerData);
            overlay.remove();
        };

        buttonContainer.appendChild(rateButton);
        buttonContainer.appendChild(laterButton);
        buttonContainer.appendChild(neverButton);

        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);

        return overlay;
    }

    /**
     * 打开评价页面
     */
    _openRatingPage() {
        // 打开Chrome Web Store评价页面
        const extensionId = chrome.runtime.id;
        const ratingUrl = `https://chrome.google.com/webstore/detail/${extensionId}/reviews`;
        chrome.tabs.create({ url: ratingUrl });
    }

    /**
     * 记录用户行为
     * @param {string} action - 用户行为 ('shown', 'rated', 'later', 'never')
     * @param {Object} triggerData - 触发数据
     */
    async recordUserAction(action, triggerData) {
        try {
            const timestamp = Date.now();
            
            // 记录触发历史
            const triggerHistory = await this._getStorageData(this.STORAGE_KEYS.TRIGGER_HISTORY, []);
            const triggerKey = triggerData.data?.triggerKey || `${triggerData.triggerType}_${triggerData.triggerValue}`;
            
            // 添加新的触发记录
            if (!triggerHistory.some(item => item.triggerKey === triggerKey)) {
                triggerHistory.push({
                    triggerKey: triggerKey,
                    triggerType: triggerData.triggerType,
                    triggerValue: triggerData.triggerValue,
                    timestamp: timestamp,
                    action: action
                });
            }

            // 记录用户行为历史
            const userActions = await this._getStorageData(this.STORAGE_KEYS.USER_ACTIONS, []);
            userActions.push({
                action: action,
                triggerKey: triggerKey,
                triggerType: triggerData.triggerType,
                triggerValue: triggerData.triggerValue,
                timestamp: timestamp
            });

            // 保存数据
            const updateData = {
                [this.STORAGE_KEYS.TRIGGER_HISTORY]: triggerHistory,
                [this.STORAGE_KEYS.USER_ACTIONS]: userActions,
                [this.STORAGE_KEYS.LAST_CHECK]: timestamp
            };

            // 如果用户选择永不提醒
            if (action === 'never') {
                updateData[this.STORAGE_KEYS.DISMISSED_FOREVER] = true;
                console.log('ReviewLightTower：🚫 用户选择永不提醒，系统已禁用');
            }

            await this._setStorageData(updateData);
            
            console.log(`ReviewLightTower：📝 记录用户行为: ${action} (${triggerKey})`);
        } catch (error) {
            console.error('ReviewLightTower：记录用户行为失败:', error);
        }
    }

    /**
     * 获取使用时间数据（从ReviewTimer）
     * @returns {Object} 时间数据
     */
    async getUsageData() {
        try {
            if (this.reviewTimer) {
                const installInfo = await this.reviewTimer.getFormattedInstallInfo();
                if (installInfo) {
                    return {
                        installTime: Date.now() - (installInfo.days * 24 + installInfo.hours) * 60 * 60 * 1000,
                        lastActiveTime: Date.now(),
                        totalUsageHours: installInfo.days * 24 + installInfo.hours + installInfo.minutes / 60
                    };
                }
            }
            
            // 降级方案：直接从存储获取
            const installTime = await this._getStorageData('review_install_timestamp');
            if (installTime) {
                const diffMs = Date.now() - installTime;
                const totalUsageHours = diffMs / (1000 * 60 * 60);
                return {
                    installTime: installTime,
                    lastActiveTime: Date.now(),
                    totalUsageHours: totalUsageHours
                };
            }
            
            return null;
        } catch (error) {
            console.error('ReviewLightTower：获取使用时间数据失败:', error);
            return null;
        }
    }

    /**
     * 获取处理数据（从ReviewCounter）
     * @returns {Object} 处理数据
     */
    async getProcessData() {
        try {
            if (this.reviewCounter) {
                const nodeCount = await this.reviewCounter.getNodeCount();
                const pageCount = await this.reviewCounter.getPageCount();
                const metadata = await this.reviewCounter.getMetadata();
                
                return {
                    totalProcessedNodes: nodeCount,
                    dailyProcessedNodes: metadata.averageNodesPerDay || 0,
                    lastProcessDate: new Date().toISOString().split('T')[0],
                    totalPages: pageCount
                };
            }
            
            // 降级方案：直接从存储获取
            const nodeCount = await this._getStorageData('review_counter_node_count', 0);
            const pageCount = await this._getStorageData('review_counter_page_count', 0);
            
            return {
                totalProcessedNodes: nodeCount,
                dailyProcessedNodes: 0,
                lastProcessDate: new Date().toISOString().split('T')[0],
                totalPages: pageCount
            };
        } catch (error) {
            console.error('ReviewLightTower：获取处理数据失败:', error);
            return null;
        }
    }

    /**
     * 获取系统状态信息
     * @returns {Object} 状态信息
     */
    async getStatus() {
        try {
            const triggerHistory = await this._getStorageData(this.STORAGE_KEYS.TRIGGER_HISTORY, []);
            const userActions = await this._getStorageData(this.STORAGE_KEYS.USER_ACTIONS, []);
            const dismissedForever = await this._getStorageData(this.STORAGE_KEYS.DISMISSED_FOREVER, false);
            const lastCheck = await this._getStorageData(this.STORAGE_KEYS.LAST_CHECK);
            
            const usageData = await this.getUsageData();
            const processData = await this.getProcessData();
            
            return {
                triggerHistory: triggerHistory,
                userActions: userActions,
                dismissedForever: dismissedForever,
                lastCheck: lastCheck ? new Date(lastCheck).toLocaleString() : null,
                usageData: usageData,
                processData: processData,
                triggerConditions: this.TRIGGER_CONDITIONS
            };
        } catch (error) {
            console.error('ReviewLightTower：获取状态信息失败:', error);
            return null;
        }
    }

    /**
     * 重置系统（仅用于测试）
     */
    async reset() {
        try {
            const keys = Object.values(this.STORAGE_KEYS);
            await this._removeStorageData(keys);
            console.log('ReviewLightTower：🧪 系统已重置');
        } catch (error) {
            console.error('ReviewLightTower：重置系统失败:', error);
        }
    }

    // ==================== 私有方法 ====================

    /**
     * 获取存储数据
     */
    async _getStorageData(keys, defaultValue = null) {
        return new Promise((resolve) => {
            const keyArray = Array.isArray(keys) ? keys : [keys];
            chrome.storage.local.get(keyArray, (result) => {
                if (Array.isArray(keys)) {
                    resolve(result);
                } else {
                    resolve(result[keys] !== undefined ? result[keys] : defaultValue);
                }
            });
        });
    }

    /**
     * 设置存储数据
     */
    async _setStorageData(data) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(data, () => {
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
    async _removeStorageData(keys) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove(keys, () => {
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
    module.exports = ReviewLightTower;
} else if (typeof window !== 'undefined') {
    window.ReviewLightTower = ReviewLightTower;
}