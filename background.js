// 智能版本检测器 - 支持多渠道差异化策略
class SimpleVersionChecker {
  constructor() {
    this.updateUrl = 'https://api.github.com/repos/zuoguyoupan2023/ADHDGoFly-Plugin/releases/latest';
    this.currentVersion = chrome.runtime.getManifest().version;
    this.installationInfo = null;
  }

  // 检测安装来源
  async detectInstallationSource() {
    try {
      const info = await chrome.management.getSelf();
      this.installationInfo = {
        installType: info.installType, // "normal", "development", "sideload", "admin"
        fromWebstore: info.installType === 'normal',
        isDevMode: info.installType === 'development',
        isSideload: info.installType === 'sideload'
      };
      console.log('安装来源检测结果:', this.installationInfo);
      return this.installationInfo;
    } catch (error) {
      console.error('检测安装来源失败:', error);
      this.installationInfo = { 
        installType: 'unknown', 
        fromWebstore: false, 
        isDevMode: false,
        isSideload: false 
      };
      return this.installationInfo;
    }
  }

  // 获取浏览器类型
  getBrowserType() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Edg/')) {
      return 'edge';
    } else if (userAgent.includes('Chrome/')) {
      return 'chrome';
    }
    return 'unknown';
  }

  // 生成商店链接
  getStoreUrl() {
    const browserType = this.getBrowserType();
    // 注意：这里需要替换为实际的扩展ID
    const storeUrls = {
      chrome: 'https://chrome.google.com/webstore/detail/adhdgofly/[EXTENSION_ID]',
      edge: 'https://microsoftedge.microsoft.com/addons/detail/adhdgofly/[EXTENSION_ID]'
    };
    return storeUrls[browserType] || storeUrls.chrome;
  }

  // 检查最新版本 - 支持差异化策略
  async checkLatestVersion() {
    try {
      console.log('正在检查最新版本...');
      
      // 首先检测安装来源
      await this.detectInstallationSource();
      
      // 如果是开发模式，不检查更新
      if (this.installationInfo.isDevMode) {
        return {
          success: true,
          currentVersion: this.currentVersion,
          latestVersion: this.currentVersion,
          hasUpdate: false,
          installType: 'development',
          message: '开发版本，无需检查更新',
          skipUpdate: true
        };
      }
      
      const response = await fetch(this.updateUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const release = await response.json();
      const latestVersion = release.tag_name.replace(/^v/, ''); // 移除 'v' 前缀
      const hasUpdate = this.isNewerVersion(release.tag_name, this.currentVersion);
      
      // 根据安装来源返回不同的结果
      if (this.installationInfo.fromWebstore) {
        // 商店版本
        return {
          success: true,
          currentVersion: this.currentVersion,
          latestVersion: release.tag_name,
          hasUpdate: hasUpdate,
          installType: 'webstore',
          browserType: this.getBrowserType(),
          storeUrl: this.getStoreUrl(),
          message: hasUpdate ? '新版本将通过浏览器商店自动更新' : '已是最新版本（商店版）',
          actionText: '查看商店页面'
        };
      } else {
        // 手动安装版本
        return {
          success: true,
          currentVersion: this.currentVersion,
          latestVersion: release.tag_name,
          hasUpdate: hasUpdate,
          installType: 'manual',
          releaseUrl: release.html_url,
          downloadUrl: 'https://adhdgofly.pages.dev/download', // 官网下载页面
          alternativeDownloads: {
            baidu: 'https://pan.baidu.com/s/example_link',
            gitee: 'https://gitee.com/example/releases',
            direct: 'https://adhdgofly.pages.dev/download'
          },
          message: hasUpdate ? '发现新版本，请手动下载更新' : '已是最新版本（手动安装）',
          actionText: '立即下载',
          contactInfo: '如果下载链接都不可用，请联系 WeChat: zuoguyoupan2023'
        };
      }
    } catch (error) {
      console.error('检查版本失败:', error);
      return {
        success: false,
        currentVersion: this.currentVersion,
        latestVersion: '检查失败',
        hasUpdate: false,
        installType: this.installationInfo?.fromWebstore ? 'webstore' : 'manual',
        error: error.message
      };
    }
  }

  // 版本比较
  isNewerVersion(newVersion, currentVersion) {
    const parseVersion = (version) => {
      return version.split('.').map(num => parseInt(num, 10));
    };
    
    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);
    
    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }
    
    return false;
  }
}

// 消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleExtension') {
    // 向所有标签页的content script发送状态变化消息
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'toggleHighlight',
          enabled: request.enabled
        }).catch(() => {
          // 忽略无法发送消息的标签页（如chrome://页面）
        });
      });
    });
    sendResponse({ success: true });
  } else if (request.action === 'checkVersion') {
    // 检查版本
    const versionChecker = new SimpleVersionChecker();
    versionChecker.checkLatestVersion().then(result => {
      sendResponse(result);
    });
    return true; // 保持消息通道开放以支持异步响应
  }
});

// 初始化版本检查器
const versionChecker = new SimpleVersionChecker();

// 插件启动时的初始化
chrome.runtime.onStartup.addListener(() => {
  console.log('ADHDGoFly Plugin 启动');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('ADHDGoFly Plugin 安装完成');
});