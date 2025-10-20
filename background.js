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
  } else if (request.action === 'tabStartup') {
    // 处理标签页启动事件
    handleTabStartupMessage(request.data, sender);
    sendResponse({ success: true });
  }
});

// 处理标签页启动事件消息
async function handleTabStartupMessage(data, sender) {
  try {
    const manifest = chrome.runtime.getManifest();
    const currentVersion = manifest.version;
    const userHash = await getUserHash();
    const now = Date.now();
    const dateStr = new Date(now).toISOString().split('T')[0];
    
    console.log('🎯 📄 收到标签页启动事件:', data.domain);
    
    // 发送标签页启动事件数据
    await sendPluginEvent('tab_startup', {
      started_at: data.timestamp || now,
      user_hash: userHash,
      version: currentVersion,
      domain_hash: data.domainHash,
      date: dateStr
    });
    
  } catch (error) {
    console.error('处理标签页启动事件失败:', error);
  }
}

// 初始化版本检查器
const versionChecker = new SimpleVersionChecker();

// 插件埋点配置
const ANALYTICS_CONFIG = {
  // 主API端点（使用自定义域名解决访问问题）
  API_URL: 'https://plugin-data.adhdgofly.online/api/plugin-analytics',
  // 备用端点（如果主端点不可用）
  FALLBACK_URL: 'https://adhdgofly-download-tracker.oliver-409.workers.dev/api/plugin-events',
  // 请求超时时间（增加到30秒）
  TIMEOUT: 30000,
  // 重试次数
  MAX_RETRIES: 3
};

// 生成用户哈希（匿名标识）
function generateUserHash() {
  // 使用插件ID和安装时间生成稳定的用户哈希
  const extensionId = chrome.runtime.id;
  const installTime = Date.now().toString();
  return btoa(extensionId + installTime).substring(0, 16);
}

// 发送插件事件数据到API
async function sendPluginEvent(eventType, eventData) {
  try {
    console.log(`🚀 发送${eventType}事件数据:`, eventData);
    
    const payload = {
      event_type: eventType,
      data: eventData,
      metadata: {
        request_id: generateRequestId(),
        timestamp: Date.now(),
        version: chrome.runtime.getManifest().version,
        user_agent: navigator.userAgent
      }
    };

    // 尝试发送到主API端点
    let response = await sendToAPI(ANALYTICS_CONFIG.API_URL, payload);
    
    if (!response.success) {
      console.log('主API端点失败，尝试备用端点...');
      response = await sendToAPI(ANALYTICS_CONFIG.FALLBACK_URL, payload);
    }

    if (response.success) {
      console.log(`✅ ${eventType}事件发送成功`);
    } else {
      console.error(`❌ ${eventType}事件发送失败:`, response.error);
    }

    return response;
  } catch (error) {
    console.error(`💥 发送${eventType}事件时出错:`, error);
    return { success: false, error: error.message };
  }
}

// 发送HTTP请求到API
async function sendToAPI(url, data, retries = 0) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYTICS_CONFIG.TIMEOUT);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-ID': chrome.runtime.id
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error(`API请求失败 (${url}):`, error);
    
    // 重试逻辑
    if (retries < ANALYTICS_CONFIG.MAX_RETRIES && !error.name === 'AbortError') {
      console.log(`重试第 ${retries + 1} 次...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      return sendToAPI(url, data, retries + 1);
    }
    
    return { success: false, error: error.message };
  }
}

// 生成请求ID
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

// 获取或生成用户哈希
async function getUserHash() {
  const result = await chrome.storage.local.get(['userHash']);
  if (result.userHash) {
    return result.userHash;
  }
  
  const newUserHash = generateUserHash();
  await chrome.storage.local.set({ userHash: newUserHash });
  return newUserHash;
}

// 插件生命周期事件收集
chrome.runtime.onInstalled.addListener(async (details) => {
  const manifest = chrome.runtime.getManifest();
  const currentVersion = manifest.version;
  const userHash = await getUserHash();
  const now = Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];
  
  // 获取存储的数据
  const result = await chrome.storage.local.get([
    'installTime', 
    'lastVersion', 
    'startupCount'
  ]);
  
  if (details.reason === 'install') {
    // 首次安装
    const installData = {
      installTime: now,
      lastVersion: currentVersion,
      startupCount: 0
    };
    
    await chrome.storage.local.set(installData);
    
    console.log('🎯 📦 ADHDGoFly插件首次安装');
    console.log('安装时间:', new Date(installData.installTime).toLocaleString());
    console.log('插件版本:', currentVersion);
    
    // 发送安装事件数据
    await sendPluginEvent('installation', {
      event_type: 'install',
      version: currentVersion,
      previous_version: null,
      installed_at: now,
      user_hash: userHash,
      date: dateStr
    });
    
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
    
    // 发送更新事件数据
    await sendPluginEvent('installation', {
      event_type: 'update',
      version: currentVersion,
      previous_version: previousVersion,
      installed_at: now,
      user_hash: userHash,
      date: dateStr
    });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const startupTime = Date.now();
  const manifest = chrome.runtime.getManifest();
  const currentVersion = manifest.version;
  const userHash = await getUserHash();
  const dateStr = new Date(startupTime).toISOString().split('T')[0];
  
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
  
  // 发送启动事件数据
  await sendPluginEvent('startup', {
    started_at: startupTime,
    user_hash: userHash,
    version: currentVersion,
    date: dateStr
  });
});