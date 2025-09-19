// ADHD Text Highlighter - Background Script
// 更新检查服务

class UpdateChecker {
  constructor() {
    // GitHub Releases API 地址
    this.updateUrl = 'https://api.github.com/repos/zuoguyoupan2023/ADHDGoFly-Plugin/releases/latest';
    this.checkInterval = 24 * 60 * 60 * 1000; // 24小时检查一次
    this.currentVersion = chrome.runtime.getManifest().version;
  }

  // 启动更新检查
  async startUpdateCheck() {
    console.log('启动更新检查服务');
    
    // 插件安装后立即检查一次
    await this.checkForUpdates();
    
    // 设置定时检查
    setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }

  // 检查更新
  async checkForUpdates() {
    try {
      console.log('正在检查更新...');
      const response = await fetch(this.updateUrl);
      
      if (!response.ok) {
        console.log('检查更新失败:', response.status);
        return;
      }

      const latestRelease = await response.json();
      const latestVersion = latestRelease.tag_name.replace('v', ''); // 移除 'v' 前缀
      
      console.log('当前版本:', this.currentVersion);
      console.log('最新版本:', latestVersion);

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        console.log('发现新版本!');
        await this.handleNewVersion(latestRelease);
      } else {
        console.log('已是最新版本');
      }
    } catch (error) {
      console.error('检查更新时出错:', error);
    }
  }

  // 版本比较
  isNewerVersion(newVersion, currentVersion) {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }
    
    return false;
  }

  // 处理新版本
  async handleNewVersion(release) {
    // 存储更新信息
    const updateInfo = {
      version: release.tag_name,
      name: release.name,
      body: release.body,
      downloadUrl: release.html_url, // GitHub Release 页面
      publishedAt: release.published_at,
      discovered: Date.now()
    };

    await chrome.storage.local.set({
      updateAvailable: updateInfo,
      updateNotificationShown: false
    });

    // 显示系统通知
    this.showSystemNotification(updateInfo);
    
    // 设置插件图标徽章
    this.setBadge('NEW');
  }

  // 显示系统通知
  showSystemNotification(updateInfo) {
    chrome.notifications.create('update-available', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'ADHD阅读助手有新版本！',
      message: `发现新版本 ${updateInfo.version}，点击查看详情`,
      buttons: [
        { title: '立即查看' },
        { title: '稍后提醒' }
      ]
    });
  }

  // 设置徽章
  setBadge(text) {
    chrome.action.setBadgeText({ text: text });
    chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
  }

  // 清除徽章
  clearBadge() {
    chrome.action.setBadgeText({ text: '' });
  }
}

// 通知点击处理
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'update-available') {
    // 打开插件弹窗或直接跳转到下载页面
    chrome.tabs.create({
      url: 'https://github.com/zuoguyoupan2023/ADHDGoFly-Plugin/releases/latest'
    });
  }
});

// 通知按钮点击处理
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'update-available') {
    if (buttonIndex === 0) { // 立即查看
      chrome.tabs.create({
        url: 'https://github.com/zuoguyoupan2023/ADHDGoFly-Plugin/releases/latest'
      });
    } else if (buttonIndex === 1) { // 稍后提醒
      // 设置稍后提醒（4小时后）
      setTimeout(() => {
        chrome.storage.local.get('updateAvailable', (result) => {
          if (result.updateAvailable) {
            updateChecker.showSystemNotification(result.updateAvailable);
          }
        });
      }, 4 * 60 * 60 * 1000);
    }
  }
});

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clearBadge') {
    updateChecker.clearBadge();
    sendResponse({ success: true });
  } else if (request.action === 'checkUpdate') {
    updateChecker.checkForUpdates();
    sendResponse({ success: true });
  }
});

// 初始化更新检查器
const updateChecker = new UpdateChecker();

// 插件启动时开始检查
chrome.runtime.onStartup.addListener(() => {
  updateChecker.startUpdateCheck();
});

// 插件安装时开始检查
chrome.runtime.onInstalled.addListener(() => {
  updateChecker.startUpdateCheck();
});