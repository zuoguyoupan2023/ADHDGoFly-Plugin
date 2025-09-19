// 设置页面JavaScript逻辑

// DOM元素
const backBtn = document.getElementById('back-btn');
const autoUpdateCheckbox = document.getElementById('auto-update');
const analyticsCheckbox = document.getElementById('analytics');
const resetBtn = document.getElementById('reset-settings');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    bindEvents();
});

// 绑定事件
function bindEvents() {
    // 返回按钮
    backBtn.addEventListener('click', function() {
        // 关闭设置页面，返回主页面
        window.close();
    });
    
    // 自动更新设置
    autoUpdateCheckbox.addEventListener('change', function() {
        saveSettings();
    });
    
    // 匿名统计设置
    analyticsCheckbox.addEventListener('change', function() {
        saveSettings();
    });
    
    // 重置设置按钮
    resetBtn.addEventListener('click', function() {
        if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
            resetAllSettings();
        }
    });
    
    // 外部链接处理
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            chrome.tabs.create({ url: this.href });
        });
    });
}

// 加载设置
function loadSettings() {
    chrome.storage.sync.get({
        autoUpdate: true,
        analytics: true
    }, function(items) {
        autoUpdateCheckbox.checked = items.autoUpdate;
        analyticsCheckbox.checked = items.analytics;
    });
}

// 保存设置
function saveSettings() {
    const settings = {
        autoUpdate: autoUpdateCheckbox.checked,
        analytics: analyticsCheckbox.checked
    };
    
    chrome.storage.sync.set(settings, function() {
        // 显示保存成功提示
        showNotification('设置已保存');
    });
}

// 重置所有设置
function resetAllSettings() {
    // 清除所有存储的设置
    chrome.storage.sync.clear(function() {
        chrome.storage.local.clear(function() {
            // 重新加载默认设置
            loadSettings();
            showNotification('所有设置已重置为默认值');
        });
    });
}

// 显示通知
function showNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 获取插件版本信息
function getExtensionInfo() {
    const manifest = chrome.runtime.getManifest();
    return {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description
    };
}

// 检查更新
function checkForUpdates() {
    // 这里可以实现检查更新的逻辑
    // 由于是演示，暂时显示一个提示
    showNotification('当前已是最新版本');
}

// 导出统计数据（如果用户同意）
function exportAnalytics() {
    chrome.storage.sync.get('analytics', function(items) {
        if (items.analytics) {
            // 这里可以实现导出统计数据的逻辑
            console.log('导出匿名使用统计数据');
        }
    });
}

// 错误处理
window.addEventListener('error', function(e) {
    console.error('设置页面错误:', e.error);
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateSettings') {
        loadSettings();
    }
    return true;
});