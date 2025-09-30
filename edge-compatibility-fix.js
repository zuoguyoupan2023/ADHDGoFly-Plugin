// Edge浏览器兼容性修复脚本
// 解决Edge和Chrome之间的初始化时序差异

(function() {
    'use strict';
    
    console.log('Edge兼容性修复脚本开始执行...');
    
    // 检测浏览器类型
    const isEdge = navigator.userAgent.includes('Edg/');
    const isChrome = navigator.userAgent.includes('Chrome/') && !isEdge;
    
    console.log(`浏览器检测: ${isEdge ? 'Edge' : isChrome ? 'Chrome' : '其他'}`);
    
    if (isEdge) {
        console.log('检测到Edge浏览器，应用兼容性修复...');
        
        // 修复1: 延长初始化等待时间
        const originalADHDHighlighter = window.ADHDHighlighter;
        if (originalADHDHighlighter) {
            const originalInit = originalADHDHighlighter.prototype.init;
            originalADHDHighlighter.prototype.init = async function() {
                console.log('Edge兼容性修复: 延长初始化等待时间');
                
                // Edge需要更长的初始化时间
                await new Promise(resolve => setTimeout(resolve, 500));
                
                try {
                    return await originalInit.call(this);
                } catch (error) {
                    console.error('Edge初始化失败，尝试重试:', error);
                    
                    // 重试机制
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await originalInit.call(this);
                }
            };
        }
        
        // 修复2: 增强fetch错误处理
        const originalFetch = window.fetch;
        window.fetch = async function(url, options) {
            try {
                const response = await originalFetch.call(this, url, options);
                
                // Edge有时会返回不正确的状态码
                if (!response.ok && url.includes('chrome-extension://')) {
                    console.warn(`Edge fetch警告: ${url} 返回状态 ${response.status}`);
                    
                    // 尝试重新获取
                    await new Promise(resolve => setTimeout(resolve, 200));
                    return await originalFetch.call(this, url, options);
                }
                
                return response;
            } catch (error) {
                console.error(`Edge fetch错误: ${url}`, error);
                
                // 如果是扩展资源，尝试重试
                if (url.includes('chrome-extension://')) {
                    console.log('Edge兼容性修复: 重试fetch请求');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    return await originalFetch.call(this, url, options);
                }
                
                throw error;
            }
        };
        
        // 修复3: 增强DictionaryAdapter初始化
        if (window.DictionaryAdapter) {
            const originalInitialize = window.DictionaryAdapter.prototype.initialize;
            window.DictionaryAdapter.prototype.initialize = async function() {
                console.log('Edge兼容性修复: 增强DictionaryAdapter初始化');
                
                try {
                    // Edge需要确保chrome.runtime完全可用
                    if (!chrome.runtime || !chrome.runtime.getURL) {
                        console.log('Edge兼容性修复: 等待chrome.runtime可用');
                        await new Promise(resolve => {
                            const checkRuntime = () => {
                                if (chrome.runtime && chrome.runtime.getURL) {
                                    resolve();
                                } else {
                                    setTimeout(checkRuntime, 100);
                                }
                            };
                            checkRuntime();
                        });
                    }
                    
                    return await originalInitialize.call(this);
                } catch (error) {
                    console.error('Edge DictionaryAdapter初始化失败，尝试重试:', error);
                    
                    // 重试机制
                    await new Promise(resolve => setTimeout(resolve, 800));
                    return await originalInitialize.call(this);
                }
            };
        }
        
        // 修复4: 增强DictionaryManager初始化
        if (window.DictionaryManager) {
            const originalInitialize = window.DictionaryManager.prototype.initialize;
            window.DictionaryManager.prototype.initialize = async function() {
                console.log('Edge兼容性修复: 增强DictionaryManager初始化');
                
                try {
                    return await originalInitialize.call(this);
                } catch (error) {
                    console.error('Edge DictionaryManager初始化失败，尝试重试:', error);
                    
                    // 清理可能的缓存问题
                    if (this.clearCache) {
                        this.clearCache();
                    }
                    
                    // 重试
                    await new Promise(resolve => setTimeout(resolve, 600));
                    return await originalInitialize.call(this);
                }
            };
        }
        
        // 修复5: 增强页面处理器
        if (window.PageProcessor) {
            const originalProcessPage = window.PageProcessor.prototype.processPage;
            window.PageProcessor.prototype.processPage = async function(options) {
                console.log('Edge兼容性修复: 增强页面处理');
                
                try {
                    return await originalProcessPage.call(this, options);
                } catch (error) {
                    console.error('Edge页面处理失败:', error);
                    
                    // Edge可能需要更多时间来处理DOM
                    if (error.message && error.message.includes('DOM')) {
                        console.log('Edge兼容性修复: 等待DOM稳定');
                        await new Promise(resolve => setTimeout(resolve, 400));
                        return await originalProcessPage.call(this, options);
                    }
                    
                    throw error;
                }
            };
        }
        
        // 修复6: 监听扩展上下文失效
        if (chrome.runtime && chrome.runtime.onConnect) {
            chrome.runtime.onConnect.addListener((port) => {
                port.onDisconnect.addListener(() => {
                    if (chrome.runtime.lastError) {
                        console.log('Edge兼容性修复: 检测到扩展上下文变化');
                        
                        // 尝试重新初始化
                        setTimeout(() => {
                            if (window.adhdHighlighter && window.adhdHighlighter.init) {
                                console.log('Edge兼容性修复: 重新初始化高亮器');
                                window.adhdHighlighter.init().catch(console.error);
                            }
                        }, 1000);
                    }
                });
            });
        }
        
        console.log('Edge兼容性修复应用完成');
    }
    
    // 通用修复: 增强错误恢复
    const originalConsoleError = console.error;
    console.error = function(...args) {
        originalConsoleError.apply(console, args);
        
        // 如果是关键错误，尝试恢复
        const errorMessage = args.join(' ');
        if (errorMessage.includes('Failed to load') && 
            errorMessage.includes('dictionary') && 
            window.adhdHighlighter) {
            
            console.log('检测到词典加载错误，尝试恢复...');
            setTimeout(() => {
                if (window.adhdHighlighter.dictionaryManager && 
                    window.adhdHighlighter.dictionaryManager.clearCache) {
                    window.adhdHighlighter.dictionaryManager.clearCache();
                }
            }, 2000);
        }
    };
    
    console.log('Edge兼容性修复脚本执行完成');
})();