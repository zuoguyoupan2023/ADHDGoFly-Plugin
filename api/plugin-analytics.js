// Vercel Serverless Function for ADHDGoFly Plugin Analytics Data Collection
// 专门处理插件埋点数据（installation、startup、tab_startup事件）

export default async function handler(req, res) {
  // 设置 CORS 头，允许插件跨域访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Extension-ID');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Only POST requests are supported.'
    });
  }

  // 检查必要的环境变量 - Plugin Analytics Worker
  const workerUrl = process.env.PLUGIN_ANALYTICS_WORKER_URL || process.env.CLOUDFLARE_WORKER_URL;
  if (!workerUrl) {
    return res.status(500).json({
      success: false,
      error: 'Plugin Analytics Worker URL not configured'
    });
  }
  console.log('🔗 使用 Plugin Analytics Worker:', workerUrl);

  try {
    // 解析请求数据
    const requestData = req.body;
    
    console.log('📥 收到插件埋点请求:', {
      event_type: requestData?.event_type,
      has_data: !!requestData?.data,
      user_agent: req.headers['user-agent']?.substring(0, 50) + '...'
    });
    
    // 基础数据验证
    if (!requestData.event_type || !requestData.data) {
      console.error('❌ 缺少必要字段:', { event_type: requestData?.event_type, has_data: !!requestData?.data });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: event_type, data'
      });
    }

    // 验证事件类型
    const validEventTypes = ['installation', 'startup', 'tab_startup'];
    if (!validEventTypes.includes(requestData.event_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`
      });
    }

    // 验证数据结构
    const validationResult = validateEventData(requestData.event_type, requestData.data);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: `Data validation failed: ${validationResult.error}`
      });
    }

    // 增强数据收集
    const enhancedData = {
      event_type: requestData.event_type,
      data: requestData.data,
      metadata: {
        // 服务器时间戳
        server_timestamp: new Date().toISOString(),
        // 客户端时间戳（如果提供）
        client_timestamp: requestData.metadata?.timestamp || null,
        // 用户代理
        user_agent: req.headers['user-agent'] || 'unknown',
        // 扩展ID（从请求头获取）
        extension_id: req.headers['x-extension-id'] || 'unknown',
        // 地理位置信息（Vercel 提供）
        country: req.headers['x-vercel-ip-country'] || 'unknown',
        city: req.headers['x-vercel-ip-city'] || 'unknown',
        // 请求ID
        request_id: generateUUID(),
        // 版本信息
        version: requestData.data.version || requestData.metadata?.version || 'unknown'
      }
    };

    // 转发到 Plugin Analytics Worker
    try {
      const result = await storeToCloudflareWorker(enhancedData, workerUrl, process.env.WORKER_AUTH_TOKEN);
      
      console.log('✅ 数据成功存储到Plugin Analytics Worker');
      
      return res.status(200).json({
        success: true,
        message: 'Plugin analytics data collected successfully',
        request_id: enhancedData.metadata.request_id,
        event_type: requestData.event_type
      });
      
    } catch (workerError) {
      console.error('Cloudflare Worker storage failed:', workerError.message);
      
      // 即使Worker失败，也记录到Vercel日志作为备份
      console.log('Plugin Analytics Data (Worker Failed):', JSON.stringify(enhancedData, null, 2));
      
      return res.status(500).json({
        success: false,
        error: 'Failed to store data to backend',
        message: workerError.message,
        request_id: enhancedData.metadata.request_id
      });
    }

  } catch (error) {
    console.error('Plugin analytics collection error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// 验证事件数据结构
function validateEventData(eventType, data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be an object' };
  }

  switch (eventType) {
    case 'installation':
      // 验证安装事件必需字段
      const installationRequired = ['event_type', 'version', 'installed_at', 'user_hash', 'date'];
      for (const field of installationRequired) {
        if (!data[field]) {
          return { valid: false, error: `Missing required field for installation: ${field}` };
        }
      }
      
      // 验证event_type值
      if (!['install', 'update'].includes(data.event_type)) {
        return { valid: false, error: 'installation event_type must be "install" or "update"' };
      }
      break;

    case 'startup':
      // 验证启动事件必需字段
      const startupRequired = ['started_at', 'user_hash', 'version', 'date'];
      for (const field of startupRequired) {
        if (!data[field]) {
          return { valid: false, error: `Missing required field for startup: ${field}` };
        }
      }
      break;

    case 'tab_startup':
      // 验证标签页启动事件必需字段
      const tabStartupRequired = ['started_at', 'user_hash', 'version', 'domain_hash', 'date'];
      for (const field of tabStartupRequired) {
        if (!data[field]) {
          return { valid: false, error: `Missing required field for tab_startup: ${field}` };
        }
      }
      break;

    default:
      return { valid: false, error: `Unknown event type: ${eventType}` };
  }

  return { valid: true };
}

// 转发到 Cloudflare Worker 的插件事件端点
async function storeToCloudflareWorker(data, workerUrl, authToken) {
  const headers = { 
    'Content-Type': 'application/json',
    'User-Agent': 'ADHDGoFly-Plugin-Analytics/1.0'
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // 规范化URL，去除尾部斜杠，并确保路径唯一
  const normalized = (workerUrl || '').replace(/\/+$/, '');
  const targetUrl = normalized.endsWith('/api/plugin-events')
    ? normalized
    : `${normalized}/api/plugin-events`;

  console.log('🔗 发送数据到Plugin Analytics Worker:', targetUrl);

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Plugin Analytics Worker API 错误:', response.status, response.statusText, errorText);
    throw new Error(`Plugin Analytics Worker API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  return result;
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}