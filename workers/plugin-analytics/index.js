/**
 * ADHDGoFly Plugin Analytics Worker
 * 
 * 专门处理插件埋点数据收集与分析的Cloudflare Worker
 * 功能包括：
 * - 插件事件收集 (installation, startup, tab_startup)
 * - 数据统计与聚合
 * - 用户行为分析
 * - 数据查询API
 * 
 * @author ADHDGoFly Team
 * @version 1.0.0
 */

// CORS 配置
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 支持的事件类型
const SUPPORTED_EVENT_TYPES = ['installation', 'startup', 'tab_startup'];

// 主要处理函数
export default {
  async fetch(request, env, ctx) {
    try {
      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: CORS_HEADERS,
        });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // 路由处理
      switch (path) {
        case '/':
        case '/health':
          return handleHealthCheck(env);
        
        case '/api/plugin-events':
          return handlePluginEvents(request, env);
        
        case '/api/stats/installations':
          return handleInstallationStats(request, env);
        
        case '/api/stats/usage':
          return handleUsageStats(request, env);
        
        case '/api/stats/summary':
          return handleStatsSummary(request, env);
        
        case '/api/sessions':
          return handleSessions(request, env);
        
        default:
          return new Response('Not Found', { 
            status: 404,
            headers: CORS_HEADERS 
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      });
    }
  },
};

/**
 * 健康检查端点
 */
async function handleHealthCheck(env) {
  try {
    // 测试数据库连接
    const result = await env.DB.prepare('SELECT 1 as test').first();
    
    return new Response(JSON.stringify({
      status: 'healthy',
      service: 'plugin-analytics',
      timestamp: new Date().toISOString(),
      database: result ? 'connected' : 'disconnected',
      environment: env.ENVIRONMENT || 'unknown'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      service: 'plugin-analytics',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

/**
 * 处理插件事件数据收集 (支持新旧数据格式)
 */
async function handlePluginEvents(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: 'Only POST method is supported'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }

  try {
    // 验证授权
    const authResult = await validateAuth(request, env);
    if (!authResult.valid) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: authResult.message
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      });
    }

    // 解析请求数据
    const rawData = await request.json();
    
    // 检测数据格式 (新格式 vs 旧格式)
    const isLegacyFormat = rawData.data && typeof rawData.data === 'object';
    
    let normalizedData;
    if (isLegacyFormat) {
      // 处理旧格式数据 (来自现有API)
      normalizedData = normalizeLegacyData(rawData);
    } else {
      // 处理新格式数据
      normalizedData = rawData;
    }
    
    // 验证事件数据
    const validation = validateEventData(normalizedData);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Invalid data',
        message: validation.message,
        details: validation.details
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      });
    }

    // 增强数据
    const enhancedData = await enhanceEventData(normalizedData, request);
    
    // 存储事件数据
    const eventId = await storePluginEvent(enhancedData, env);
    
    // 更新统计数据
    await updateStats(enhancedData, env);
    
    // 更新用户会话
    await updateUserSession(enhancedData, env);

    return new Response(JSON.stringify({
      success: true,
      eventId: eventId,
      message: 'Event recorded successfully',
      timestamp: new Date().toISOString(),
      format: isLegacyFormat ? 'legacy' : 'new'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error('Error handling plugin event:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to process event data',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

/**
 * 验证请求授权
 */
async function validateAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  const expectedToken = env.WORKER_AUTH_TOKEN;

  if (!expectedToken) {
    return { valid: true }; // 如果没有配置token，则跳过验证
  }

  if (!authHeader) {
    return { 
      valid: false, 
      message: 'Authorization header is required' 
    };
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== expectedToken) {
    return { 
      valid: false, 
      message: 'Invalid authorization token' 
    };
  }

  return { valid: true };
}

/**
 * 标准化旧格式数据
 */
function normalizeLegacyData(rawData) {
  const data = rawData.data || {};
  
  return {
    event_type: data.event_type || rawData.event_type,
    timestamp: data.timestamp || rawData.timestamp || Date.now(),
    plugin_version: data.plugin_version || data.version,
    browser: data.browser,
    browser_version: data.browser_version,
    language: data.language || data.lang,
    user_id: data.user_id,
    session_id: data.session_id,
    // 保留原始数据以备调试
    _raw: rawData
  };
}

/**
 * 验证事件数据格式
 */
function validateEventData(data) {
  const errors = [];

  // 检查必需字段
  if (!data.event_type) {
    errors.push('event_type is required');
  } else if (!SUPPORTED_EVENT_TYPES.includes(data.event_type)) {
    errors.push(`event_type must be one of: ${SUPPORTED_EVENT_TYPES.join(', ')}`);
  }

  if (!data.timestamp) {
    errors.push('timestamp is required');
  } else if (typeof data.timestamp !== 'number') {
    errors.push('timestamp must be a number');
  }

  // 检查可选字段格式
  if (data.plugin_version && typeof data.plugin_version !== 'string') {
    errors.push('plugin_version must be a string');
  }

  if (data.browser && typeof data.browser !== 'string') {
    errors.push('browser must be a string');
  }

  if (data.language && typeof data.language !== 'string') {
    errors.push('language must be a string');
  }

  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? 'Validation failed' : 'Valid',
    details: errors
  };
}

/**
 * 增强事件数据
 */
async function enhanceEventData(data, request) {
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For') || 
                   'unknown';
  
  const userAgent = request.headers.get('User-Agent') || '';
  const referrer = request.headers.get('Referer') || '';
  
  // 从Cloudflare获取地理位置信息
  const country = request.cf?.country || 'unknown';
  const city = request.cf?.city || 'unknown';

  return {
    ...data,
    event_id: data.event_id || generateUUID(),
    client_ip: clientIP,
    user_agent: userAgent,
    referrer: referrer,
    country: country,
    city: city,
    server_timestamp: Date.now()
  };
}

/**
 * 存储插件事件数据 (支持兼容性字段)
 */
async function storePluginEvent(data, env) {
  // 处理兼容性字段
  const isLegacyData = data._raw && data._raw.data;
  let legacyData = {};
  
  if (isLegacyData) {
    legacyData = data._raw.data;
  }
  
  const stmt = env.DB.prepare(`
    INSERT INTO plugin_events (
      event_id, event_type, 
      plugin_version, version, previous_version,
      timestamp, installed_at, started_at, server_timestamp,
      user_hash, client_ip, session_id, date,
      browser, browser_version, language, user_agent, referrer,
      country, city, domain_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    data.event_id,
    data.event_type,
    // 版本信息 (新旧兼容)
    data.plugin_version || null,
    legacyData.version || data.plugin_version || null,
    legacyData.previous_version || null,
    // 时间戳 (新旧兼容)
    data.timestamp,
    legacyData.installed_at || null,
    legacyData.started_at || null,
    data.server_timestamp,
    // 用户标识 (新旧兼容)
    legacyData.user_hash || null,
    data.client_ip || null,
    data.session_id || null,
    legacyData.date || null,
    // 环境信息
    data.browser || null,
    data.browser_version || null,
    data.language || null,
    data.user_agent || null,
    data.referrer || null,
    data.country || null,
    data.city || null,
    legacyData.domain_hash || null
  ).run();

  return data.event_id;
}

/**
 * 更新统计数据
 */
async function updateStats(data, env) {
  const date = new Date(data.timestamp).toISOString().split('T')[0];
  
  // 更新安装统计
  if (data.event_type === 'installation') {
    await updateInstallationStats(data, date, env);
  }
  
  // 更新使用统计
  await updateUsageStats(data, date, env);
}

/**
 * 更新安装统计
 */
async function updateInstallationStats(data, date, env) {
  const stmt = env.DB.prepare(`
    INSERT INTO plugin_installation_stats (
      date, plugin_version, browser, country, installation_count
    ) VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(date, plugin_version, browser, country) 
    DO UPDATE SET 
      installation_count = installation_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `);

  await stmt.bind(
    date,
    data.plugin_version || 'unknown',
    data.browser || 'unknown',
    data.country || 'unknown'
  ).run();
}

/**
 * 更新使用统计
 */
async function updateUsageStats(data, date, env) {
  const stmt = env.DB.prepare(`
    INSERT INTO plugin_usage_stats (
      date, plugin_version, browser, event_type, country, event_count, unique_users
    ) VALUES (?, ?, ?, ?, ?, 1, 1)
    ON CONFLICT(date, plugin_version, browser, event_type, country) 
    DO UPDATE SET 
      event_count = event_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `);

  await stmt.bind(
    date,
    data.plugin_version || 'unknown',
    data.browser || 'unknown',
    data.event_type,
    data.country || 'unknown'
  ).run();
}

/**
 * 更新用户会话
 */
async function updateUserSession(data, env) {
  const sessionId = generateSessionId(data.client_ip, data.user_agent);
  
  // 检查会话是否存在
  const existingSession = await env.DB.prepare(`
    SELECT * FROM user_sessions WHERE session_id = ?
  `).bind(sessionId).first();

  if (existingSession) {
    // 更新现有会话
    await env.DB.prepare(`
      UPDATE user_sessions SET
        last_event_time = ?,
        event_count = event_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `).bind(data.timestamp, sessionId).run();
  } else {
    // 创建新会话
    await env.DB.prepare(`
      INSERT INTO user_sessions (
        session_id, client_ip, user_agent, plugin_version, browser,
        country, city, first_event_time, last_event_time, event_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      sessionId,
      data.client_ip,
      data.user_agent,
      data.plugin_version || 'unknown',
      data.browser || 'unknown',
      data.country || 'unknown',
      data.city || 'unknown',
      data.timestamp,
      data.timestamp
    ).run();
  }
}

/**
 * 处理安装统计查询
 */
async function handleInstallationStats(request, env) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days')) || 30;
  const version = url.searchParams.get('version');
  const browser = url.searchParams.get('browser');
  const country = url.searchParams.get('country');

  try {
    let query = `
      SELECT date, plugin_version, browser, country, 
             SUM(installation_count) as total_installations
      FROM plugin_installation_stats 
      WHERE date >= date('now', '-${days} days')
    `;
    
    const params = [];
    
    if (version) {
      query += ' AND plugin_version = ?';
      params.push(version);
    }
    
    if (browser) {
      query += ' AND browser = ?';
      params.push(browser);
    }
    
    if (country) {
      query += ' AND country = ?';
      params.push(country);
    }
    
    query += ' GROUP BY date, plugin_version, browser, country ORDER BY date DESC';

    const stmt = env.DB.prepare(query);
    const results = await stmt.bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      data: results.results || [],
      total: results.results?.length || 0,
      filters: { days, version, browser, country },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error('Error fetching installation stats:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to fetch installation statistics'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

/**
 * 处理使用统计查询
 */
async function handleUsageStats(request, env) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days')) || 30;
  const eventType = url.searchParams.get('event_type');
  const version = url.searchParams.get('version');
  const browser = url.searchParams.get('browser');

  try {
    let query = `
      SELECT date, plugin_version, browser, event_type, country,
             SUM(event_count) as total_events,
             SUM(unique_users) as total_users
      FROM plugin_usage_stats 
      WHERE date >= date('now', '-${days} days')
    `;
    
    const params = [];
    
    if (eventType) {
      query += ' AND event_type = ?';
      params.push(eventType);
    }
    
    if (version) {
      query += ' AND plugin_version = ?';
      params.push(version);
    }
    
    if (browser) {
      query += ' AND browser = ?';
      params.push(browser);
    }
    
    query += ' GROUP BY date, plugin_version, browser, event_type, country ORDER BY date DESC';

    const stmt = env.DB.prepare(query);
    const results = await stmt.bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      data: results.results || [],
      total: results.results?.length || 0,
      filters: { days, eventType, version, browser },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to fetch usage statistics'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

/**
 * 处理统计摘要查询
 */
async function handleStatsSummary(request, env) {
  try {
    // 获取总体统计
    const totalInstallations = await env.DB.prepare(`
      SELECT SUM(installation_count) as total FROM plugin_installation_stats
    `).first();

    const totalEvents = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM plugin_events
    `).first();

    const activeSessions = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM user_sessions 
      WHERE last_event_time >= ?
    `).bind(Date.now() - 24 * 60 * 60 * 1000).first(); // 24小时内活跃

    // 获取版本分布
    const versionStats = await env.DB.prepare(`
      SELECT plugin_version, SUM(installation_count) as installations
      FROM plugin_installation_stats 
      GROUP BY plugin_version 
      ORDER BY installations DESC 
      LIMIT 10
    `).all();

    // 获取浏览器分布
    const browserStats = await env.DB.prepare(`
      SELECT browser, SUM(installation_count) as installations
      FROM plugin_installation_stats 
      GROUP BY browser 
      ORDER BY installations DESC 
      LIMIT 10
    `).all();

    // 获取国家分布
    const countryStats = await env.DB.prepare(`
      SELECT country, SUM(installation_count) as installations
      FROM plugin_installation_stats 
      GROUP BY country 
      ORDER BY installations DESC 
      LIMIT 10
    `).all();

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_installations: totalInstallations?.total || 0,
        total_events: totalEvents?.total || 0,
        active_sessions_24h: activeSessions?.total || 0,
        version_distribution: versionStats.results || [],
        browser_distribution: browserStats.results || [],
        country_distribution: countryStats.results || []
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error('Error fetching stats summary:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to fetch statistics summary'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

/**
 * 处理用户会话查询
 */
async function handleSessions(request, env) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days')) || 7;
  const limit = parseInt(url.searchParams.get('limit')) || 100;

  try {
    const stmt = env.DB.prepare(`
      SELECT session_id, client_ip, plugin_version, browser, country, city,
             first_event_time, last_event_time, event_count,
             (last_event_time - first_event_time) as session_duration
      FROM user_sessions 
      WHERE first_event_time >= ?
      ORDER BY last_event_time DESC 
      LIMIT ?
    `);

    const results = await stmt.bind(
      Date.now() - days * 24 * 60 * 60 * 1000,
      limit
    ).all();

    return new Response(JSON.stringify({
      success: true,
      data: results.results || [],
      total: results.results?.length || 0,
      filters: { days, limit },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to fetch session data'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

/**
 * 生成UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成会话ID
 */
function generateSessionId(ip, userAgent) {
  const data = `${ip}-${userAgent}`;
  // 简单的哈希函数
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
}