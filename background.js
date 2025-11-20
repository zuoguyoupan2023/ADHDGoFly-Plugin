// 导入隐私设置管理器
importScripts('privacy-settings-manager.js');

// 初始化隐私设置管理器
const privacyManager = new PrivacySettingsManager();

// ==================== 独立安装信息收集系统 ====================

/**
 * 🚫 已废弃 - 旧安装逻辑的配置 (随旧安装逻辑一起废弃)
 * @deprecated 此配置用于旧的安装数据发送逻辑，已被独立Worker方式替代
 * 新的独立安装统计使用 sendIndependentStatsToWorker 直接发送到 Worker
 */
const INSTALLATION_CONFIG = {
  API_URL: 'https://plugin-data.adhdgofly.online/api/plugin-data-analytics',
  FALLBACK_URL: 'https://plugin-data-analytics-worker.oliver-409.workers.dev',
  TIMEOUT: 10000,
  MAX_RETRIES: 10,
  RETRY_INTERVAL_MINUTES: 30,
  ALARM_NAME: 'retry_install_data'
};

/**
 * 🚫 已废弃 - 旧的安装数据发送逻辑
 * @deprecated 此函数已被 sendIndependentInstallationStats 替代
 * 旧逻辑：发送到 Vercel API，存储到 plugin_installations 表
 * 新逻辑：直接发送到 Worker，存储到 independent_installation_stats 表
 * @param {Object} installDetails - Chrome安装详情
 */
async function sendInstallationData(installDetails) {
  console.log('🏗️ 开始收集安装信息...');
  
  const installData = {
    event_type: 'plugin_install',
    timestamp: new Date().toISOString(),
    plugin_version: chrome.runtime.getManifest().version,
    browser_type: getBrowserType(),
    browser_version: getBrowserVersion(),
    platform: navigator.platform,
    language: chrome.i18n.getUILanguage(),
    install_reason: installDetails.reason,
    anonymous_id: await generateAnonymousInstallId()
  };

  console.log('🏗️ 安装数据已生成:', installData);

  // 尝试立即发送
  const success = await sendInstallDataToAPI(installData);
  
  if (success) {
    console.log('🏗️ ✅ 安装数据发送成功');
  } else {
    console.log('🏗️ ⚠️ 安装数据发送失败，启动重试机制');
    // 发送失败，存储到本地待重试
    await storeInstallDataForRetry(installData);
    // 设置重试机制
    scheduleInstallDataRetry();
  }
}

/**
 * 🚫 已废弃 - 发送安装数据到API (支持主备URL)
 * @deprecated 此函数已被 sendIndependentStatsToWorker 替代
 * @param {Object} data - 安装数据
 * @returns {boolean} 发送是否成功
 */
async function sendInstallDataToAPI(data) {
  // 使用原来的数据格式
  const apiData = {
    event_type: 'plugin_install',
    data: data
  };

  // 尝试主URL
  try {
    console.log('🏗️ 正在发送安装数据到主服务器...');
    
    const response = await fetch(INSTALLATION_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
      signal: AbortSignal.timeout(INSTALLATION_CONFIG.TIMEOUT)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('🏗️ ✅ 安装数据发送成功 (主URL):', result);
      return true;
    } else {
      console.warn('🏗️ ⚠️ 主URL发送失败 - HTTP状态:', response.status);
    }
  } catch (error) {
    console.warn('🏗️ ⚠️ 主URL发送异常:', error.message);
  }

  // 尝试备用URL
  try {
    console.log('🏗️ 正在尝试备用服务器...');
    
    const response = await fetch(INSTALLATION_CONFIG.FALLBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
      signal: AbortSignal.timeout(INSTALLATION_CONFIG.TIMEOUT)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('🏗️ ✅ 安装数据发送成功 (备用URL):', result);
      return true;
    } else {
      console.warn('🏗️ ⚠️ 备用URL发送失败 - HTTP状态:', response.status);
      return false;
    }
  } catch (error) {
    console.warn('🏗️ ⚠️ 备用URL发送异常:', error.message);
    return false;
  }
}

/**
 * 📊 独立安装统计 - 发送到独立表
 * @param {Object} installDetails - Chrome安装详情
 */
async function sendIndependentInstallationStats(installDetails) {
  console.log('📊 开始收集独立安装统计...');
  
  const installData = {
    event_type: 'independent_installation',
    timestamp: new Date().toISOString(),
    plugin_version: chrome.runtime.getManifest().version,
    browser_type: getBrowserType(),
    browser_version: getBrowserVersion(),
    platform: navigator.platform,
    language: chrome.i18n.getUILanguage(),
    install_reason: installDetails.reason,
    anonymous_id: await generateAnonymousInstallId()
  };

  console.log('📊 独立安装统计数据已生成:', installData);

  // 直接发送到Worker，不经过Vercel API
  const success = await sendIndependentStatsToWorker(installData);
  
  if (success) {
    console.log('📊 ✅ 独立安装统计发送成功');
  } else {
    console.log('📊 ⚠️ 独立安装统计发送失败');
  }
}

/**
 * 📊 直接发送独立统计到Worker
 * @param {Object} data - 安装统计数据
 * @returns {boolean} 发送是否成功
 */
async function sendIndependentStatsToWorker(data) {
  try {
    console.log('📊 发送独立统计到Worker:', data);
    
    const response = await fetch('https://plugin-data-analytics-worker.oliver-409.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(INSTALLATION_CONFIG.TIMEOUT)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('📊 Worker响应:', result);
      return true;
    } else {
      console.error('📊 Worker响应错误:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('📊 发送独立统计失败:', error);
    return false;
  }
}

/**
 * 🚫 已废弃 - 存储安装数据用于重试
 * @deprecated 随旧安装逻辑一起废弃
 */
async function storeInstallDataForRetry(data) {
  try {
    await chrome.storage.local.set({
      'pending_install_data': data,
      'install_data_retry_count': 0,
      'install_data_last_retry': Date.now()
    });
    console.log('🏗️ 📦 安装数据已存储，等待重试');
  } catch (error) {
    console.error('🏗️ ❌ 存储安装数据失败:', error);
  }
}

/**
 * 🚫 已废弃 - 安排安装数据重试
 * @deprecated 随旧安装逻辑一起废弃
 */
function scheduleInstallDataRetry() {
  console.log('🏗️ ⏰ 设置安装数据重试定时器');
  chrome.alarms.create(INSTALLATION_CONFIG.ALARM_NAME, {
    delayInMinutes: 5, // 5分钟后首次重试
    periodInMinutes: INSTALLATION_CONFIG.RETRY_INTERVAL_MINUTES // 之后每30分钟重试一次
  });
}

/**
 * 🚫 已废弃 - 重试发送安装数据
 * @deprecated 随旧安装逻辑一起废弃
 */
async function retryInstallDataSending() {
  try {
    console.log('🏗️ 🔄 开始重试发送安装数据...');
    
    const result = await chrome.storage.local.get([
      'pending_install_data', 
      'install_data_retry_count'
    ]);
    
    if (!result.pending_install_data) {
      console.log('🏗️ ℹ️ 没有待重试的安装数据，清除定时器');
      chrome.alarms.clear(INSTALLATION_CONFIG.ALARM_NAME);
      return;
    }

    const retryCount = result.install_data_retry_count || 0;
    
    // 最多重试10次
    if (retryCount >= INSTALLATION_CONFIG.MAX_RETRIES) {
      console.warn('🏗️ ⚠️ 安装数据重试次数已达上限，放弃发送');
      await chrome.storage.local.remove([
        'pending_install_data', 
        'install_data_retry_count',
        'install_data_last_retry'
      ]);
      chrome.alarms.clear(INSTALLATION_CONFIG.ALARM_NAME);
      return;
    }

    console.log(`🏗️ 🔄 第${retryCount + 1}次重试发送安装数据`);
    
    // 尝试发送
    const success = await sendInstallDataToAPI(result.pending_install_data);
    
    if (success) {
      // 发送成功，清理存储和定时器
      await chrome.storage.local.remove([
        'pending_install_data', 
        'install_data_retry_count',
        'install_data_last_retry'
      ]);
      chrome.alarms.clear(INSTALLATION_CONFIG.ALARM_NAME);
      console.log('🏗️ ✅ 安装数据重试发送成功');
    } else {
      // 发送失败，增加重试计数
      await chrome.storage.local.set({
        'install_data_retry_count': retryCount + 1,
        'install_data_last_retry': Date.now()
      });
      console.log(`🏗️ ⚠️ 安装数据重试失败，第${retryCount + 1}次`);
    }
  } catch (error) {
    console.error('🏗️ ❌ 安装数据重试处理异常:', error);
  }
}

/**
 * 🏗️ 获取浏览器类型
 */
function getBrowserType() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Edg/')) {
    return 'edge';
  } else if (userAgent.includes('Chrome/')) {
    return 'chrome';
  } else {
    return 'unknown';
  }
}

/**
 * 🏗️ 获取浏览器版本
 */
function getBrowserVersion() {
  const userAgent = navigator.userAgent;
  const match = userAgent.match(/(Chrome|Edg)\/([0-9.]+)/);
  return match ? match[2] : 'unknown';
}

/**
 * 🏗️ 生成安装匿名ID
 */
async function generateAnonymousInstallId() {
  // 基于安装时间和随机数生成匿名ID
  const installTime = Date.now();
  const randomValue = Math.random().toString(36).substring(2);
  const combined = `install-${installTime}-${randomValue}`;
  
  // 使用Web Crypto API生成哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.substring(0, 16); // 取前16位作为匿名ID
}

// 监听定时器事件
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === INSTALLATION_CONFIG.ALARM_NAME) {
    await retryInstallDataSending();
  }
});

// ==================== 独立安装信息收集系统结束 ====================

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
  } else if (request.type === 'PRIVACY_SETTINGS_CHANGED') {
    // 处理隐私设置变更通知
    handlePrivacySettingsChanged(request.data);
    sendResponse({ success: true });
  } else if (request.action === 'TEST_ANALYTICS') {
    // 测试分析事件发送
    console.log('收到测试分析请求:', request.data);
    sendPluginEvent('test_event', {
      test_data: request.data,
      timestamp: Date.now()
    });
    sendResponse({ success: true, message: '测试事件已发送' });
  } else if (request.action === 'SIMULATE_INSTALL') {
    // 模拟安装事件
    console.log('模拟安装事件');
    sendPluginEvent('install', {
      reason: 'test_simulation',
      version: chrome.runtime.getManifest().version,
      timestamp: Date.now()
    });
    sendResponse({ success: true, message: '安装事件已模拟' });
  } else if (request.action === 'SIMULATE_STARTUP') {
    // 模拟启动事件
    console.log('模拟启动事件');
    sendPluginEvent('startup', {
      reason: 'test_simulation',
      version: chrome.runtime.getManifest().version,
      timestamp: Date.now()
    });
    sendResponse({ success: true, message: '启动事件已模拟' });
  } else if (request.action === 'showReviewLightTower') {
    // 显示评价灯塔
    showReviewLightTower(request.data);
    sendResponse({ success: true });
  } else if (request.action === 'hideReviewLightTower') {
      hideReviewLightTower();
        sendResponse({ success: true });
    } else if (request.action === 'collectAndStorePageSegments') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) { sendResponse({ success: false, error: 'no_active_tab' }); return; }
        const resp = await chrome.tabs.sendMessage(tab.id, { action: 'collectAndStorePageSegments' });
        sendResponse(resp || { success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
    } else if (request.action === 'aiChatRequest') {
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), request.timeout || 30000);
        const resp = await fetch(request.url, {
          method: request.method || 'POST',
          headers: request.headers || {},
          body: request.body || null,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const contentType = resp.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
          data = await resp.json();
        } else {
          data = await resp.text();
        }
        sendResponse({ success: true, status: resp.status, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  } else if (request.action === 'aiChatStream') {
    (async () => {
      try {
        const tabId = sender && sender.tab && sender.tab.id;
        const prov = request.provider;
        const model = request.model;
        const msgs = request.messages || [];
        let base = '';
        let key = '';
        try {
          const res = await new Promise(r => chrome.storage.local.get(['aiBaseUrl','aiKeys'], r));
          base = res.aiBaseUrl || '';
          const ks = res.aiKeys || {};
          key = ks[prov] || '';
        } catch (_) {}
        const url = base || (prov === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' : '');
        const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
        const body = JSON.stringify({ model, messages: msgs, stream: true });
        const resp = await fetch(url, { method: 'POST', headers, body });
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        if (tabId) chrome.tabs.sendMessage(tabId, { action: 'aiChatStreamStarted' });
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || '';
          for (let i = 0; i < parts.length; i++) {
            const line = parts[i].trim();
            if (!line) continue;
            const payload = line.startsWith('data:') ? line.slice(5).trim() : line;
            if (!payload || payload === '[DONE]') continue;
            let delta = '';
            try {
              const j = JSON.parse(payload);
              delta = (j && j.choices && j.choices[0] && (j.choices[0].delta && j.choices[0].delta.content)) ||
                      (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) ||
                      j.output_text || j.content || '';
            } catch (e) {
              delta = payload;
            }
            if (delta && tabId) chrome.tabs.sendMessage(tabId, { action: 'aiChatStreamDelta', delta });
          }
        }
        if (tabId) chrome.tabs.sendMessage(tabId, { action: 'aiChatStreamDone' });
        sendResponse({ success: true, started: true });
      } catch (error) {
        try {
          const tabId = sender && sender.tab && sender.tab.id;
          if (tabId) chrome.tabs.sendMessage(tabId, { action: 'aiChatStreamError', error: error.message });
        } catch (_) {}
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

let __pdfOffscreen = null;
let __pdfOffscreenReady = false;
let __pdfPendingQueue = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'OFFSCREEN_PDF_READY') {
    __pdfOffscreenReady = true;
    __pdfPendingQueue.splice(0).forEach(m => { try { chrome.runtime.sendMessage(m); } catch (_) {} });
    sendResponse && sendResponse({ ok: true });
    return true;
  } else if (msg && msg.type === 'OFFSCREEN_PDF_RESULT') {
    const tabId = msg.tabId;
    const sections = msg.sections || [];
    if (tabId) {
      try { chrome.tabs.sendMessage(tabId, { action: 'storeSegments', sections }); } catch (_) {}
    }
    sendResponse && sendResponse({ ok: true });
    return true;
  } else if (msg && msg.type === 'OFFSCREEN_PDF_ERROR') {
    const tabId = msg.tabId;
    if (tabId) {
      try { chrome.tabs.sendMessage(tabId, { action: 'notifyOffscreenPdfError', error: msg.error || 'unknown' }); } catch (_) {}
    }
    sendResponse && sendResponse({ ok: false, error: msg.error || 'unknown' });
    return true;
  } else if (msg && msg.action === 'collectPdfFromUrl') {
    (async () => {
      try {
        const tabId = sender && sender.tab && sender.tab.id;
        if (!__pdfOffscreen) {
          try {
            await chrome.offscreen.createDocument({ url: chrome.runtime.getURL('offscreen/pdf-parser.html'), reasons: ['BLOBS'], justification: 'Parse PDF text' });
            __pdfOffscreen = true;
          } catch (e) {
            sendResponse({ success: false, error: e && e.message || 'offscreen_failed' });
            return;
          }
        }
        const m = { type: 'OFFSCREEN_PDF_PARSE_URL', url: msg.url, tabId };
        if (__pdfOffscreenReady) {
          try { await chrome.runtime.sendMessage(m); } catch (e) { sendResponse({ success: false, error: e && e.message || 'send_failed' }); return; }
        } else {
          __pdfPendingQueue.push(m);
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error && error.message || 'unknown' });
      }
    })();
    return true;
  }
});

// ==================== 评价徽章管理 ====================

// 显示评价灯塔
function showReviewLightTower(badgeData) {
  try {
    // 设置徽章文本为星星符号
    chrome.action.setBadgeText({ text: '⭐' });
    
    // 设置徽章背景色为红色
    chrome.action.setBadgeBackgroundColor({ color: '#f42626ff' });
    
    // 存储灯塔数据，供popup使用
    chrome.storage.local.set({
      reviewLightTowerData: badgeData,
      reviewLightTowerVisible: true
    });
    
    console.log('评价徽章已显示', badgeData);
  } catch (error) {
    console.error('显示评价徽章失败:', error);
  }
}

// 隐藏评价灯塔
function hideReviewLightTower() {
  try {
    // 清除徽章文本
    chrome.action.setBadgeText({ text: '' });
    
    // 移除存储的灯塔数据
    chrome.storage.local.remove(['reviewLightTowerData', 'reviewLightTowerVisible']);
    
    console.log('评价徽章已隐藏');
  } catch (error) {
    console.error('隐藏评价徽章失败:', error);
  }
}



// 处理隐私设置变更通知
function handlePrivacySettingsChanged(data) {
  try {
    console.log('🔒 隐私设置已变更:', data);
    
    if (data.changeType === 'analyticsEnabled') {
      const status = data.value ? '启用' : '禁用';
      console.log(`📊 匿名信息收集已${status}`);
      
      // 可以在这里添加其他需要响应隐私设置变更的逻辑
      // 例如：清理已收集的数据、通知其他组件等
      
      if (!data.value) {
        console.log('🗑️ 用户禁用了数据收集，后续将不再发送匿名统计数据');
      } else {
        console.log('📈 用户启用了数据收集，将继续发送匿名统计数据');
      }
    } else if (data.changeType === 'reset') {
      console.log('🔄 隐私设置已重置到默认值');
    }
  } catch (error) {
    console.error('处理隐私设置变更失败:', error);
  }
}

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
  PRIMARY_URL: 'https://plugin-data.adhdgofly.online/api/plugin-data-analytics',
  FALLBACK_URL: 'https://plugin-data.adhdgofly.online/api/plugin-data-analytics',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000
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
    // 检查用户是否启用了匿名信息收集
    const isAnalyticsEnabled = await privacyManager.isAnalyticsEnabled();
    
    if (!isAnalyticsEnabled) {
      console.log(`🔒 用户已禁用匿名信息收集，跳过${eventType}事件发送`);
      return { 
        success: true, 
        skipped: true, 
        reason: 'Analytics disabled by user privacy settings' 
      };
    }
    
    console.log(`🚀 发送${eventType}事件数据:`, eventData);
    
    const payload = {
      event_type: eventType,
      data: eventData,
      metadata: {
        request_id: generateRequestId(),
        timestamp: Date.now(),
        version: chrome.runtime.getManifest().version,
        user_agent: navigator.userAgent,
        privacy_consent: true // 标记用户已同意数据收集
      }
    };

    // 尝试发送到主API端点
    let response = await sendToAPI(ANALYTICS_CONFIG.PRIMARY_URL, payload);
    
    if (!response.success) {
      console.error(`主API端点失败:`, response.error);
      
      // 如果有备用端点，尝试备用端点
      if (ANALYTICS_CONFIG.FALLBACK_URL) {
        console.log('主API端点失败，尝试备用端点...');
        response = await sendToAPI(ANALYTICS_CONFIG.FALLBACK_URL, payload);
        
        if (!response.success) {
          console.error(`备用API端点也失败:`, response.error);
        }
      }
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
  
  // 🏗️ 独立安装信息收集 - 不受隐私设置控制
  if (details.reason === 'install') {
    console.log('🏗️ 检测到首次安装，启动独立安装数据收集');
    // await sendInstallationData(details); // 🚫 已禁用旧逻辑 - 使用独立逻辑替代
    
    // 📊 发送独立安装统计到新表
    console.log('📊 启动独立安装统计收集');
    await sendIndependentInstallationStats(details);
  }
  
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