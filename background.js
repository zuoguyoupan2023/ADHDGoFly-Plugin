// 导入隐私设置管理器
importScripts('privacy-settings-manager.js');

// 初始化隐私设置管理器
const privacyManager = new PrivacySettingsManager();

// Make the plugin's main interface open as the browser-managed Side Panel.
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

// ==================== 独立安装信息收集系统 ====================

/**
 * 🚫 已废弃 - 旧安装逻辑的配置 (随旧安装逻辑一起废弃)
 * @deprecated 此配置用于旧的安装数据发送逻辑，已被独立Worker方式替代
 * 新的独立安装统计使用 sendIndependentStatsToWorker 直接发送到 Worker
 */
const INSTALLATION_CONFIG = {
  API_URL: 'https://plugin-data.readgofly.online/api/plugin-data-analytics',
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
  if (request.action === 'openExtensionSettings') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html#settings') }).then(() => sendResponse({ success: true })).catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'toggleExtension') {
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
  } else if (request.action === 'captureVisibleTabScreenshot') {
    (async () => {
      try {
        const tabId = sender && sender.tab && sender.tab.id;
        if (!tabId) { sendResponse({ success: false, error: '无法确定当前网页标签页' }); return; }
        const tab = await chrome.tabs.get(tabId);
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        sendResponse({ success: true, dataUrl });
      } catch (error) {
        sendResponse({ success: false, error: `网页截图失败：${error.message || error}` });
      }
    })();
    return true;
  } else if (request.action === 'aiChatStream') {
    (function(){
      function g(){ return { deepseek: { perMinute: 10, concurrency: 1 } }; }
      const S = '__aiProviderState';
      if (!self[S]) self[S] = {};
      function st(p){ if (!self[S][p]) { const d = g()[p] || { perMinute: 5, concurrency: 1 }; self[S][p] = { queue: [], running: 0, used: 0, resetAt: Date.now()+60000, perMinute: d.perMinute, concurrency: d.concurrency }; } return self[S][p]; }
      async function run(t){
        const tabId = t.tabId;
        const prov = t.prov;
        const model = t.model;
        const msgs = t.msgs || [];
        let base = '';
        let key = '';
        try {
          const res = await new Promise(r => chrome.storage.local.get(['aiBaseUrls','aiBaseUrl','aiProvider','aiKeys'], r));
          base = (res.aiBaseUrls && res.aiBaseUrls[prov]) || (prov === (res.aiProvider || '') ? (res.aiBaseUrl || '') : '');
          const ks = res.aiKeys || {};
          key = String(ks[prov] || '').trim();
        } catch (_) {}
        function fallbackBase(p){
          switch(p){
            case 'deepseek': return 'https://api.deepseek.com/v1/chat/completions';
            case 'moonshot': return 'https://api.moonshot.ai/v1/chat/completions';
            case 'openai': return 'https://api.openai.com/v1/chat/completions';
            case 'openrouter': return 'https://openrouter.ai/api/v1/chat/completions';
            case 'groq': return 'https://api.groq.com/openai/v1/chat/completions';
            case 'siliconflow': return 'https://api.siliconflow.cn/v1/chat/completions';
            case 'qwen': return 'https://dashscope.aliyuncs.com/api/v1/chat/completions';
            case 'chatglm': return 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            case 'minimax': return 'https://api.minimax.io/v1/chat/completions';
            case 'grok': return 'https://api.x.ai/v1/chat/completions';
            default: return '';
          }
        }
        const url = base || fallbackBase(prov);
        const headers = { 'Content-Type': 'application/json' };
        if (key) headers.Authorization = 'Bearer ' + key;
        const body = JSON.stringify({ model, messages: msgs, stream: true });
        let resp;
        try { resp = await fetch(url, { method: 'POST', headers, body }); } catch (e) { return handleErr(t, { network: true, error: e }); }
        if (!resp.ok) {
          let text = '';
          try { text = await resp.text(); } catch(_){}
          return handleErr(t, { status: resp.status, body: text });
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        if (tabId) try { chrome.tabs.sendMessage(tabId, { action: 'aiChatStreamStarted' }); } catch(_){ }
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
            if (delta && tabId) try { chrome.tabs.sendMessage(tabId, { action: 'aiChatStreamDelta', delta }); } catch(_){ }
          }
        }
        if (tabId) try { chrome.tabs.sendMessage(tabId, { action: 'aiChatStreamDone' }); } catch(_){ }
      }
      function handleErr(t, info){
        const tabId = t.tabId;
        const prov = t.prov;
        const s = st(prov);
        const rc = t.retryCount || 0;
        const mr = t.maxRetries || 3;
        const status = info && info.status ? info.status : 0;
        const is429 = status === 429;
        const is5xx = status >= 500 && status < 600;
        const isNet = !!info && !!info.network;
        const can = is429 || is5xx || isNet;
        if (can && rc < mr) {
          const delay = is429 ? 60000 : Math.min(15000, Math.pow(2, rc) * 1000);
          setTimeout(()=>{ t.retryCount = rc + 1; s.queue.unshift(t); dispatch(prov); }, delay);
          return;
        }
        if (t.fallbackProvider && !t.fallbackTried) {
          t.prov = t.fallbackProvider;
          t.model = t.fallbackModel || t.model;
          t.fallbackTried = true;
          t.retryCount = 0;
          const fallbackState = st(t.prov);
          fallbackState.queue.unshift(t);
          dispatch(t.prov);
          return;
        }
        if (tabId) try { chrome.tabs.sendMessage(tabId, { action: 'aiChatStreamError', error: (info && info.body) ? info.body : (info && info.error && info.error.message) ? info.error.message : String(status || 'error') }); } catch(_){ }
      }
      function dispatch(prov){
        const s = st(prov);
        const now = Date.now();
        if (now >= s.resetAt) { s.resetAt = now + 60000; s.used = 0; }
        while (s.running < s.concurrency && s.queue.length > 0 && s.used < s.perMinute) {
          const t = s.queue.shift();
          s.running += 1;
          s.used += 1;
          run(t).then(()=>{}).catch(e=>{ handleErr(t,{ error:e }); }).finally(()=>{ s.running -= 1; dispatch(prov); });
        }
        if (s.queue.length > 0 && s.used >= s.perMinute) {
          const d = Math.max(0, s.resetAt - now) + 10;
          setTimeout(()=>dispatch(prov), d);
        }
      }
      const tabId = sender && sender.tab && sender.tab.id;
      const prov = request.provider;
      const model = request.model;
      const msgs = request.messages || [];
      const s = st(prov);
      s.queue.push({ tabId, prov, model, msgs, fallbackProvider: request.fallbackProvider || '', fallbackModel: request.fallbackModel || '', fallbackTried: false, retryCount: 0, maxRetries: 3 });
      dispatch(prov);
      sendResponse({ success: true, queued: true });
    })();
    return true;
  } else if (request.action === 'agfConvPut') {
    const obj = request.data || {};
    const reqOpen = indexedDB.open('agf_ai_db_unified', 2);
    reqOpen.onupgradeneeded = () => {
      const db = reqOpen.result;
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('domain', 'domain');
      } else {
        const store = reqOpen.transaction.objectStore('conversations');
        if (!store.indexNames.contains('domain')) store.createIndex('domain', 'domain');
      }
    };
    reqOpen.onsuccess = () => {
      try {
        const db = reqOpen.result;
        const tx = db.transaction('conversations', 'readwrite');
        const st = tx.objectStore('conversations');
        const reqPut = st.put(obj);
        reqPut.onsuccess = () => sendResponse({ success: true });
        reqPut.onerror = () => sendResponse({ success: false, error: String(reqPut.error||'put_error') });
      } catch (e) { sendResponse({ success: false, error: String(e) }); }
    };
    reqOpen.onerror = () => sendResponse({ success: false, error: String(reqOpen.error||'open_error') });
    return true;
  } else if (request.action === 'agfConvGet') {
    const id = request.id;
    const reqOpen = indexedDB.open('agf_ai_db_unified', 2);
    reqOpen.onupgradeneeded = () => {
      const db = reqOpen.result;
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('domain', 'domain');
      } else {
        const store = reqOpen.transaction.objectStore('conversations');
        if (!store.indexNames.contains('domain')) store.createIndex('domain', 'domain');
      }
    };
    reqOpen.onsuccess = () => {
      try {
        const db = reqOpen.result;
        const tx = db.transaction('conversations', 'readonly');
        const st = tx.objectStore('conversations');
        const reqGet = st.get(id);
        reqGet.onsuccess = () => sendResponse({ success: true, item: reqGet.result || null });
        reqGet.onerror = () => sendResponse({ success: false, error: String(reqGet.error||'get_error') });
      } catch (e) { sendResponse({ success: false, error: String(e) }); }
    };
    reqOpen.onerror = () => sendResponse({ success: false, error: String(reqOpen.error||'open_error') });
    return true;
  } else if (request.action === 'agfConvList') {
    const limit = Math.max(1, Math.min(1000, Number(request.limit||500)));
    const reqOpen = indexedDB.open('agf_ai_db_unified', 2);
    reqOpen.onupgradeneeded = () => {
      const db = reqOpen.result;
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('domain', 'domain');
      } else {
        const store = reqOpen.transaction.objectStore('conversations');
        if (!store.indexNames.contains('domain')) store.createIndex('domain', 'domain');
      }
    };
    reqOpen.onsuccess = () => {
      try {
        const db = reqOpen.result;
        const tx = db.transaction('conversations', 'readonly');
        const st = tx.objectStore('conversations');
        const idx = st.index('createdAt');
        const items = [];
        const reqCur = idx.openCursor(null, 'prev');
        reqCur.onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) { sendResponse({ success: true, items }); return; }
          items.push(cursor.value);
          if (items.length >= limit) { sendResponse({ success: true, items }); return; }
          cursor.continue();
        };
        reqCur.onerror = () => sendResponse({ success: false, error: String(reqCur.error||'cursor_error') });
      } catch (e) { sendResponse({ success: false, error: String(e) }); }
    };
    reqOpen.onerror = () => sendResponse({ success: false, error: String(reqOpen.error||'open_error') });
    return true;
  } else if (request.action === 'agfConvDelete') {
    const id = request.id;
    const reqOpen = indexedDB.open('agf_ai_db_unified', 2);
    reqOpen.onupgradeneeded = () => {
      const db = reqOpen.result;
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('domain', 'domain');
      } else {
        const store = reqOpen.transaction.objectStore('conversations');
        if (!store.indexNames.contains('domain')) store.createIndex('domain', 'domain');
      }
    };
    reqOpen.onsuccess = () => {
      try {
        const db = reqOpen.result;
        const tx = db.transaction('conversations', 'readwrite');
        const st = tx.objectStore('conversations');
        const reqDel = st.delete(id);
        reqDel.onsuccess = () => sendResponse({ success: true });
        reqDel.onerror = () => sendResponse({ success: false, error: String(reqDel.error||'delete_error') });
      } catch (e) { sendResponse({ success: false, error: String(e) }); }
    };
    reqOpen.onerror = () => sendResponse({ success: false, error: String(reqOpen.error||'open_error') });
    return true;
  } else if (request.action === 'agfTestSaveText') {
    const data = request.data || {};
    const reqOpen = indexedDB.open('agf_test_text_db', 1);
    reqOpen.onupgradeneeded = () => {
      const db = reqOpen.result;
      if (!db.objectStoreNames.contains('page_texts')) {
        const store = db.createObjectStore('page_texts', { keyPath: 'id' });
        store.createIndex('canonicalUrl', 'canonicalUrl');
        store.createIndex('pageUrl', 'pageUrl');
        store.createIndex('domain', 'domain');
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('textHash', 'textHash');
      }
    };
    reqOpen.onsuccess = () => {
      try {
        const db = reqOpen.result;
        const id = (data.canonicalUrl || data.pageUrl || '') + '|' + (data.textHash || '');
        const rec = {
          id,
          pageUrl: data.pageUrl || '',
          canonicalUrl: data.canonicalUrl || data.pageUrl || '',
          domain: data.domain || '',
          title: data.title || '',
          timestamp: data.timestamp || Date.now(),
          textHash: data.textHash || '',
          textLength: data.textLength || (data.text ? String(data.text).length : 0),
          text: data.text || ''
        };
        const tx = db.transaction('page_texts', 'readwrite');
        const st = tx.objectStore('page_texts');
        const rq = st.put(rec);
        rq.onsuccess = () => sendResponse({ success: true });
        rq.onerror = () => sendResponse({ success: false, error: String(rq.error || 'put_error') });
      } catch (e) {
        sendResponse({ success: false, error: String(e) });
      }
    };
    reqOpen.onerror = () => sendResponse({ success: false, error: String(reqOpen.error || 'open_error') });
    return true;
  } else if (request.action === 'agfTestGetTextForPage') {
    const pageUrl = request.pageUrl || '';
    const canonicalUrl = request.canonicalUrl || pageUrl;
    const reqOpen = indexedDB.open('agf_test_text_db', 1);
    reqOpen.onupgradeneeded = () => {
      const db = reqOpen.result;
      if (!db.objectStoreNames.contains('page_texts')) {
        const store = db.createObjectStore('page_texts', { keyPath: 'id' });
        store.createIndex('canonicalUrl', 'canonicalUrl');
        store.createIndex('pageUrl', 'pageUrl');
        store.createIndex('domain', 'domain');
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('textHash', 'textHash');
      }
    };
    reqOpen.onsuccess = () => {
      try {
        const db = reqOpen.result;
        const tx = db.transaction('page_texts', 'readonly');
        const st = tx.objectStore('page_texts');
        const idx = st.index('canonicalUrl');
        const reqAll = idx.getAll(canonicalUrl);
        reqAll.onsuccess = () => {
          const items = Array.isArray(reqAll.result) ? reqAll.result : [];
          let chosen = null;
          if (items.length) {
            chosen = items.sort((a,b) => (b.timestamp||0) - (a.timestamp||0))[0];
          } else {
            const idx2 = st.index('pageUrl');
            const reqAll2 = idx2.getAll(pageUrl);
            reqAll2.onsuccess = () => {
              const items2 = Array.isArray(reqAll2.result) ? reqAll2.result : [];
              let c = null;
              if (items2.length) c = items2.sort((a,b) => (b.timestamp||0) - (a.timestamp||0))[0];
              sendResponse({ success: true, text: c && c.text || '' });
            };
            reqAll2.onerror = () => sendResponse({ success: false, error: String(reqAll2.error || 'getall_error') });
            return;
          }
          sendResponse({ success: true, text: chosen && chosen.text || '' });
        };
        reqAll.onerror = () => sendResponse({ success: false, error: String(reqAll.error || 'getall_error') });
      } catch (e) {
        sendResponse({ success: false, error: String(e) });
      }
    };
    reqOpen.onerror = () => sendResponse({ success: false, error: String(reqOpen.error || 'open_error') });
    return true;
  } else if (request.action === 'agfOpenReaderAndSend') {
    (async () => {
      try {
        const payload = request.payload || null;
        const sourceTabId = request.sourceTabId || (sender && sender.tab && sender.tab.id);
        const log = async (text) => { try { if (sourceTabId) await chrome.tabs.sendMessage(sourceTabId, { action: 'agfLogProgress', text }); } catch(_){} };
        if (!payload || typeof payload !== 'object') { sendResponse({ success: false, error: 'no_payload' }); return; }
        let base = 'https://v7.adhdgofly.online';
        try {
          const o = await chrome.storage.local.get(['agfReaderBaseUrl']);
          if (o && o.agfReaderBaseUrl) base = String(o.agfReaderBaseUrl);
          if (base.replace(/\/$/, '') === 'https://v7.readgofly.online') {
            base = 'https://v7.adhdgofly.online';
            await chrome.storage.local.set({ agfReaderBaseUrl: base });
          }
        } catch (_){ }
        await log('打开Reader标签页（主通道）');
        const fallbackUrl = request.fallbackUrl || `${base}${base.endsWith('/') ? '' : '/'}?from=plugin`;
        const created = await chrome.tabs.create({ url: fallbackUrl });
        const readerTabId = created && created.id ? created.id : null;
        if (!readerTabId) { await log('Reader标签页创建失败'); sendResponse({ success: false, error: 'create_failed' }); return; }
        // query 导入已经由 V7 页面自行解析；不要再通过 content script 重复发送一份。
        if (/[?&](?:agf_import|agf-import)=/.test(fallbackUrl)) {
          await log('已打开带内容的Reader导入页，等待用户确认');
          sendResponse({ success: true, status: 'awaiting_confirmation', importId: payload.importId || null });
          return;
        }
        const handler = async (tabId, changeInfo) => {
          if (tabId === readerTabId && changeInfo.status === 'complete') {
            try { chrome.tabs.onUpdated.removeListener(handler); } catch (_) {}
            try {
              await log('Reader已加载，尝试postMessage发送');
              await chrome.tabs.sendMessage(readerTabId, { action: 'deliverPayloadToReader', payload });
              await log('通过内容脚本发送成功');
            } catch (e) {
              await log('内容脚本发送失败，尝试脚本注入');
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: readerTabId },
                  func: (pl) => { try { window.postMessage({ type: 'AGF_DOC_V1', payload: pl }, '*'); } catch (_) {} },
                  args: [payload]
                });
                await log('脚本注入成功，postMessage已发送');
              } catch (ee) {
                await log('脚本注入失败：' + (ee && ee.message || 'unknown'));
                sendResponse({ success: false, error: 'inject_failed' });
                return;
              }
            }
            sendResponse({ success: true });
          }
        };
        chrome.tabs.onUpdated.addListener(handler);
      } catch (error) {
        try { await chrome.tabs.sendMessage((sender && sender.tab && sender.tab.id) || 0, { action: 'agfLogProgress', text: '后台流程失败：' + (error && error.message || 'unknown') }); } catch (_){ }
        sendResponse({ success: false, error: error && error.message || 'unknown' });
      }
    })();
    return true;
  }
});

let __pdfOffscreen = null;
let __pdfOffscreenReady = false;
let __pdfPendingQueue = [];
const __pdfTriggered = new Set();
const PAYWALL_BLOCKED_DOMAINS_DEFAULT = [
  'qidian.com','youdubook.com','webnovel.com','jjwxc.net','m.jjwxc.net','zongheng.com','17k.com','yunqi.qq.com','hongxiu.com','xxsy.net','faloo.com','ciweimao.com','weread.qq.com','zhangyue.com','shuqi.com','migu.cn','read.douban.com','read.amazon.com','kindlecloudreader.com'
];

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
  } else if (msg && msg.type === 'OFFSCREEN_PDF_LIB_STATUS') {
    const tabsQuery = { active: true, currentWindow: true };
    chrome.tabs.query(tabsQuery).then(tabs => {
      const tab = tabs && tabs[0];
      if (tab && tab.id) {
        try { chrome.tabs.sendMessage(tab.id, { action: 'notifyOffscreenPdfLibStatus', present: !!msg.present }); } catch (_) {}
      }
    }).catch(()=>{});
    sendResponse && sendResponse({ ok: true });
    return true;
  } else if (msg && msg.action === 'collectPdfFromUrl') {
    (async () => {
      try {
        const tabId = sender && sender.tab && sender.tab.id;
        if (!__pdfOffscreen) {
          try {
            await chrome.offscreen.createDocument({ url: chrome.runtime.getURL('offscreen/pdf-parser.html'), reasons: ['DOM_SCRAPING','BLOBS'], justification: 'Parse PDF text' });
            __pdfOffscreen = true;
          } catch (e) {
            sendResponse({ success: false, error: e && e.message || 'offscreen_failed' });
            return;
          }
        }
        let sent = false;
        try {
          const resp = await fetch(msg.url);
          if (resp && resp.ok) {
            const buf = await resp.arrayBuffer();
            if (buf && buf.byteLength > 0) {
              const bytes = Array.from(new Uint8Array(buf));
              const mbuf = { type: 'OFFSCREEN_PDF_PARSE_BUFFER', bytes, tabId };
              if (__pdfOffscreenReady) {
                await chrome.runtime.sendMessage(mbuf);
              } else {
                __pdfPendingQueue.push(mbuf);
              }
              sent = true;
            }
          }
        } catch (_) {}
        if (!sent) {
          const m = { type: 'OFFSCREEN_PDF_PARSE_URL', url: msg.url, tabId };
          if (__pdfOffscreenReady) {
            try { await chrome.runtime.sendMessage(m); } catch (e) { sendResponse({ success: false, error: e && e.message || 'send_failed' }); return; }
          } else {
            __pdfPendingQueue.push(m);
          }
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error && error.message || 'unknown' });
      }
    })();
    return true;
  }
  else if (msg && msg.action === 'storeSegments') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) { sendResponse({ success: false, error: 'no_active_tab' }); return; }
        const sections = Array.isArray(msg.sections) ? msg.sections : [];
        await chrome.tabs.sendMessage(tab.id, { action: 'storeSegments', sections });
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error && error.message || 'unknown' });
      }
    })();
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    const url = changeInfo.url || tab.url || '';
    const done = changeInfo.status === 'complete';
    if (!url) return;
    const isPdf = /\.pdf($|\?|#)/i.test(url) || /\/pdf\//i.test(url);
    if (!isPdf) return;
    const key = tabId + '|' + url;
    if (__pdfTriggered.has(key)) return;
    if (!done) return;
    (async () => {
      try {
        let enabled = true;
        let blocked = [];
        try {
          const settings = await chrome.storage.local.get(['pdfAutoCollectEnabled','pdfBlockedDomains']);
          enabled = settings.pdfAutoCollectEnabled !== undefined ? !!settings.pdfAutoCollectEnabled : true;
          const customBlocked = Array.isArray(settings.pdfBlockedDomains) ? settings.pdfBlockedDomains : [];
          blocked = Array.from(new Set([ ...PAYWALL_BLOCKED_DOMAINS_DEFAULT, ...customBlocked ]));
        } catch (_) {}
        try {
          const host = new URL(url).hostname;
          if (blocked.includes(host)) return;
        } catch (_) {}
        if (!enabled) return;
        if (!__pdfOffscreen) {
          await chrome.offscreen.createDocument({ url: chrome.runtime.getURL('offscreen/pdf-parser.html'), reasons: ['DOM_SCRAPING','BLOBS'], justification: 'Parse PDF text' });
          __pdfOffscreen = true;
        }
        let sent = false;
        try {
          const resp = await fetch(url);
          if (resp && resp.ok) {
            const buf = await resp.arrayBuffer();
            if (buf && buf.byteLength > 0) {
              const bytes = Array.from(new Uint8Array(buf));
              const mbuf = { type: 'OFFSCREEN_PDF_PARSE_BUFFER', bytes, tabId };
              if (__pdfOffscreenReady) {
                await chrome.runtime.sendMessage(mbuf);
              } else {
                __pdfPendingQueue.push(mbuf);
              }
              sent = true;
            }
          }
        } catch (_) {}
        if (!sent) {
          const m = { type: 'OFFSCREEN_PDF_PARSE_URL', url, tabId };
          if (__pdfOffscreenReady) {
            await chrome.runtime.sendMessage(m);
          } else {
            __pdfPendingQueue.push(m);
          }
        }
        __pdfTriggered.add(key);
      } catch (e) {}
    })();
  } catch (_) {}
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
  PRIMARY_URL: 'https://plugin-data.readgofly.online/api/plugin-data-analytics',
  FALLBACK_URL: 'https://plugin-data.readgofly.online/api/plugin-data-analytics',
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

    // 默认开启插件
    await chrome.storage.local.set({ enabled: true });

    // 自动打开新手引导页面
    try {
      await chrome.tabs.create({ url: 'https://adhdgofly.online/plugin/guide' });
    } catch (e) {
      // 静默失败，不影响安装流程
    }
  }

  // 获取存储的数据
  const result = await chrome.storage.local.get([
    'installTime',
    'lastVersion',
    'startupCount'
  ]);

  if (details.reason === 'install') {
    // 首次安装 - 确保默认启用
    await chrome.storage.local.set({ enabled: true });

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
