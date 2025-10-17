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
      //const demoLatestVersion = '0.1.1';
      
      return {
        success: true,
        currentVersion: this.currentVersion,
        latestVersion: release.tag_name,
        hasUpdate: this.isNewerVersion(release.tag_name, this.currentVersion),
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
  } else if (request.action === 'getStorage') {
    // 获取存储数据用于调试
    chrome.storage.local.get(null, (result) => {
      sendResponse({
        success: true,
        data: result,
        keys: Object.keys(result),
        customDictRegistry: result.customDictRegistry || null,
        dictionaryKeys: Object.keys(result).filter(key => key.startsWith('dictionary_'))
      });
    });
    return true; // 保持消息通道开放以支持异步响应
  }
});

// 初始化版本检查器
const versionChecker = new SimpleVersionChecker();

// 插件生命周期事件收集
chrome.runtime.onInstalled.addListener(async (details) => {
  const manifest = chrome.runtime.getManifest();
  const currentVersion = manifest.version;
  
  // 获取存储的数据
  const result = await chrome.storage.local.get([
    'installTime', 
    'lastVersion', 
    'startupCount'
  ]);
  
  if (details.reason === 'install') {
    // 首次安装
    const installData = {
      installTime: Date.now(),
      lastVersion: currentVersion,
      startupCount: 0
    };
    
    await chrome.storage.local.set(installData);
    
    console.log('🎯 📦 ADHDGoFly插件首次安装');
    console.log('安装时间:', new Date(installData.installTime).toLocaleString());
    console.log('插件版本:', currentVersion);
    
  } else if (details.reason === 'update') {
    // 插件更新
    const previousVersion = details.previousVersion;
    
    await chrome.storage.local.set({
      lastVersion: currentVersion
    });
    
    console.log('🎯 🔄 ADHDGoFly插件已更新');
    console.log('从版本:', previousVersion);
    console.log('到版本:', currentVersion);
    console.log('原安装时间:', new Date(result.installTime).toLocaleString());
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const startupTime = Date.now();
  
  // 获取当前的启动次数
  const result = await chrome.storage.local.get([
    'startupCount', 
    'installTime'
  ]);
  
  const newStartupCount = (result.startupCount || 0) + 1;
  
  // 更新启动数据
  await chrome.storage.local.set({
    lastStartupTime: startupTime,
    startupCount: newStartupCount
  });
  
  console.log('🎯 🚀 ADHDGoFly插件启动');
  console.log('启动时间:', new Date(startupTime).toLocaleString());
  console.log('启动次数:', newStartupCount);
  
  if (result.installTime) {
    const daysSinceInstall = Math.floor(
      (startupTime - result.installTime) / (24 * 60 * 60 * 1000)
    );
    console.log('安装后天数:', daysSinceInstall);
  }
});