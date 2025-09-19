// 简化的版本检测器
class SimpleVersionChecker {
  constructor() {
    this.updateUrl = 'https://api.github.com/repos/zuoguyoupan2023/ADHDGoFly-Plugin/releases/latest';
    this.currentVersion = chrome.runtime.getManifest().version;
  }

  // 检查最新版本
  async checkLatestVersion() {
    try {
      console.log('正在检查最新版本...');
      const response = await fetch(this.updateUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const release = await response.json();
      const latestVersion = release.tag_name.replace(/^v/, ''); // 移除 'v' 前缀
      
      // 临时演示：模拟检测到0.1.1版本
      const demoLatestVersion = '0.1.1';
      
      return {
        success: true,
        currentVersion: this.currentVersion,
        latestVersion: demoLatestVersion,
        hasUpdate: this.isNewerVersion(demoLatestVersion, this.currentVersion),
        releaseUrl: release.html_url,
        alternativeDownloads: {
          baidu: 'https://pan.baidu.com/s/example_link',
          gitee: 'https://gitee.com/example/releases',
          direct: 'https://example.com/direct_download'
        },
        contactInfo: '如果这些链接都不可用，请联系 WeChat: zuoguyoupan2023'
      };
    } catch (error) {
      console.error('检查版本失败:', error);
      return {
        success: false,
        currentVersion: this.currentVersion,
        latestVersion: '检查失败',
        hasUpdate: false,
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