// ADHDGoFly 安装配置 - 构建时自动生成
window.ADHD_INSTALL_CONFIG = {
  "installType": "selfinstallmark",
  "targetBrowser": "chrome",
  "version": "0.1.5",
  "buildTime": "2025-10-29T00:08:03.454Z",
  "storeUrl": "https://chromewebstore.google.com/detail/bdpadkojpehfdepjjadmpjeieiddeodl",
  "reviewAutoResetOnMajor": true,
  "reviewAutoClearReviewedOnMajor": true
};

window.getInstallType = function() {
    return window.ADHD_INSTALL_CONFIG ? window.ADHD_INSTALL_CONFIG.installType : 'selfinstallmark';
};

window.getStoreUrl = function() {
    if (!window.ADHD_INSTALL_CONFIG) {
        return 'https://feedback.adhdgofly.online/';
    }
    const config = window.ADHD_INSTALL_CONFIG;
    return config.storeUrl;
};

window.getChromeStoreHint = function() {
    if (window.ADHD_INSTALL_CONFIG && window.ADHD_INSTALL_CONFIG.chromeStoreFallback) {
        return window.ADHD_INSTALL_CONFIG.chromeStoreFallback;
    }
    return null;
};

window.getReviewAutoResetOnMajor = function() {
    if (!window.ADHD_INSTALL_CONFIG) return true;
    return !!window.ADHD_INSTALL_CONFIG.reviewAutoResetOnMajor;
};

window.getReviewAutoClearOnMajor = function() {
    if (!window.ADHD_INSTALL_CONFIG) return true;
    return !!window.ADHD_INSTALL_CONFIG.reviewAutoClearReviewedOnMajor;
};