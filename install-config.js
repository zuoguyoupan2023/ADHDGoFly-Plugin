// ADHDGoFly 安装配置 - 构建时自动生成
window.ADHD_INSTALL_CONFIG = {
  "installType": "selfinstallmark",
  "targetBrowser": "chrome",
  "version": "0.1.5",
  "buildTime": "2025-10-29T00:08:03.454Z",
  "storeUrl": "https://feedback.adhdgofly.online/"
};

// 获取安装类型的便捷函数
window.getInstallType = function() {
    return window.ADHD_INSTALL_CONFIG ? window.ADHD_INSTALL_CONFIG.installType : 'selfinstallmark';
};

// 获取商店链接的便捷函数（智能回退支持）
window.getStoreUrl = function() {
    if (!window.ADHD_INSTALL_CONFIG) {
        return 'https://feedback.adhdgofly.online/';
    }
    
    const config = window.ADHD_INSTALL_CONFIG;
    
    // Chrome商店智能回退处理
    if (config.chromeStoreFallback && config.chromeStoreFallback.isPlaceholder) {
        // 显示用户友好的提示
        if (typeof alert !== 'undefined') {
            alert('Chrome应用商店版本即将上线！\n\n' + 
                  '当前请访问Chrome应用商店，搜索 "' + config.chromeStoreFallback.searchHint + '" 即可找到我们的插件。\n\n' +
                  '点击确定将跳转到Chrome应用商店扩展页面。');
        }
    }
    
    return config.storeUrl;
};

// 获取Chrome商店搜索提示信息
window.getChromeStoreHint = function() {
    if (window.ADHD_INSTALL_CONFIG && window.ADHD_INSTALL_CONFIG.chromeStoreFallback) {
        return window.ADHD_INSTALL_CONFIG.chromeStoreFallback;
    }
    return null;
};