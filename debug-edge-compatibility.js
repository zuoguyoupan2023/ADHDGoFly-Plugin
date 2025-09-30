// Edge浏览器兼容性调试脚本
// 用于检测Edge和Chrome之间的差异

console.log('=== Edge兼容性调试开始 ===');

// 1. 检查浏览器环境
function detectBrowser() {
    const userAgent = navigator.userAgent;
    console.log('User Agent:', userAgent);
    
    if (userAgent.includes('Edg/')) {
        console.log('浏览器: Microsoft Edge');
        return 'edge';
    } else if (userAgent.includes('Chrome/')) {
        console.log('浏览器: Google Chrome');
        return 'chrome';
    } else {
        console.log('浏览器: 其他');
        return 'other';
    }
}

// 2. 检查Chrome API可用性
function checkChromeAPIs() {
    console.log('=== Chrome API检查 ===');
    
    const apis = [
        'chrome.runtime',
        'chrome.runtime.getURL',
        'chrome.storage',
        'chrome.storage.local',
        'chrome.tabs',
        'chrome.tabs.sendMessage'
    ];
    
    apis.forEach(api => {
        try {
            const parts = api.split('.');
            let obj = window;
            for (const part of parts) {
                obj = obj[part];
            }
            console.log(`✅ ${api}: 可用`);
        } catch (error) {
            console.log(`❌ ${api}: 不可用 - ${error.message}`);
        }
    });
}

// 3. 检查fetch和URL处理
async function checkFetchAndURL() {
    console.log('=== Fetch和URL检查 ===');
    
    try {
        // 测试chrome.runtime.getURL
        const testURL = chrome.runtime.getURL('dictionaries/dictionary-registry.json');
        console.log('生成的URL:', testURL);
        
        // 测试fetch
        const response = await fetch(testURL);
        console.log('Fetch响应状态:', response.status);
        console.log('Fetch响应类型:', response.type);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ 词典注册表加载成功');
            console.log('注册表内容:', data);
            
            // 测试中文词典加载
            const zhDictURL = chrome.runtime.getURL('dictionaries/ZH_word.json');
            console.log('中文词典URL:', zhDictURL);
            
            const zhResponse = await fetch(zhDictURL);
            console.log('中文词典响应状态:', zhResponse.status);
            
            if (zhResponse.ok) {
                const zhData = await zhResponse.json();
                console.log('✅ 中文词典加载成功');
                console.log('中文词典元数据:', zhData.meta);
                console.log('中文词典词汇数量:', Object.keys(zhData.words || {}).length);
                
                // 测试几个中文词汇
                const testWords = ['这', '是', '一个', '测试', '学生', '学校', '老师'];
                testWords.forEach(word => {
                    if (zhData.words && zhData.words[word]) {
                        console.log(`✅ 找到词汇 "${word}":`, zhData.words[word]);
                    } else {
                        console.log(`❌ 未找到词汇 "${word}"`);
                    }
                });
            } else {
                console.log('❌ 中文词典加载失败:', zhResponse.status);
            }
        } else {
            console.log('❌ 词典注册表加载失败:', response.status);
        }
    } catch (error) {
        console.error('❌ Fetch测试失败:', error);
    }
}

// 4. 检查文本分词功能
function checkTextSegmentation() {
    console.log('=== 文本分词检查 ===');
    
    try {
        if (typeof TextSegmenter !== 'undefined') {
            console.log('✅ TextSegmenter类可用');
            
            const segmenter = new TextSegmenter();
            console.log('✅ TextSegmenter实例创建成功');
            
            // 测试CJK语言检测
            const testLanguages = ['zh', 'en', 'ja', 'ko'];
            testLanguages.forEach(lang => {
                const isCJK = segmenter.isCJKLanguage(lang);
                console.log(`语言 ${lang} 是否为CJK: ${isCJK}`);
            });
            
        } else {
            console.log('❌ TextSegmenter类不可用');
        }
    } catch (error) {
        console.error('❌ 文本分词检查失败:', error);
    }
}

// 5. 检查词典管理器
async function checkDictionaryManager() {
    console.log('=== 词典管理器检查 ===');
    
    try {
        if (typeof DictionaryAdapter !== 'undefined') {
            console.log('✅ DictionaryAdapter类可用');
            
            const adapter = new DictionaryAdapter();
            console.log('✅ DictionaryAdapter实例创建成功');
            
            // 初始化
            await adapter.initialize();
            console.log('✅ DictionaryAdapter初始化完成');
            
            // 检查中文词典
            const zhDict = adapter.getDictionary('zh');
            if (zhDict) {
                console.log('✅ 中文词典获取成功');
                console.log('中文词典词汇数量:', Object.keys(zhDict).length);
                
                // 测试几个词汇
                const testWords = ['这', '是', '学生', '老师'];
                testWords.forEach(word => {
                    const pos = zhDict[word];
                    if (pos) {
                        console.log(`✅ 词汇 "${word}" 词性: ${pos}`);
                    } else {
                        console.log(`❌ 词汇 "${word}" 未找到`);
                    }
                });
            } else {
                console.log('❌ 中文词典获取失败');
            }
            
            // 检查语言启用状态
            const isZhEnabled = adapter.isLanguageEnabled('zh');
            console.log('中文语言是否启用:', isZhEnabled);
            
        } else {
            console.log('❌ DictionaryAdapter类不可用');
        }
    } catch (error) {
        console.error('❌ 词典管理器检查失败:', error);
    }
}

// 6. 主调试函数
async function runDebug() {
    const browser = detectBrowser();
    checkChromeAPIs();
    await checkFetchAndURL();
    checkTextSegmentation();
    await checkDictionaryManager();
    
    console.log('=== Edge兼容性调试完成 ===');
    
    // 返回调试结果
    return {
        browser,
        timestamp: new Date().toISOString(),
        completed: true
    };
}

// 自动运行调试
if (typeof window !== 'undefined') {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runDebug);
    } else {
        setTimeout(runDebug, 1000);
    }
}

// 导出调试函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runDebug, detectBrowser, checkChromeAPIs };
} else if (typeof window !== 'undefined') {
    window.EdgeCompatibilityDebug = { runDebug, detectBrowser, checkChromeAPIs };
}