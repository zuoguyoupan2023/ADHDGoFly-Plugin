/**
 * ADHDGoFly 插件分析 Cloudflare Workers
 * 
 * 功能：
 * 1. 接收插件生命周期事件（安装、启动、标签页启动）
 * 2. 验证请求合法性
 * 3. 提取客户端信息（国家、用户哈希）
 * 4. 写入 D1 数据库
 * 5. 提供插件使用统计查询 API
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    // 路由处理
    if (url.pathname === '/api/plugin-events' && request.method === 'POST') {
      return handlePluginEvent(request, env);
    }
    
    if (url.pathname === '/api/plugin-stats/public' && request.method === 'GET') {
      return handlePublicStats(request, env);
    }
    
    if (url.pathname === '/api/plugin-stats' && request.method === 'GET') {
      // 检查是否有认证头，有则返回管理员数据，无则返回公开数据
      const authHeader = request.headers.get('Authorization');
      if (authHeader) {
        return handleAdminStats(request, env);
      } else {
        return handlePublicStats(request, env);
      }
    }
    
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: Date.now(),
        version: '1.0.0',
        service: 'plugin-analytics'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
};

/**
 * 处理插件事件请求
 */
async function handlePluginEvent(request, env) {
  try {
    // 1. 解析请求数据
    const data = await request.json();
    
    // 2. 验证必要字段
    if (!data.event_type || !data.data) {
      return jsonResponse({ error: 'Invalid data: missing required fields (event_type, data)' }, 400);
    }
    
    // 3. 验证事件类型
    const validEventTypes = ['installation', 'startup', 'tab_startup'];
    if (!validEventTypes.includes(data.event_type)) {
      return jsonResponse({ error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` }, 400);
    }
    
    // 4. 验证数据结构
    const validationResult = validateEventData(data.event_type, data.data);
    if (!validationResult.valid) {
      return jsonResponse({ error: `Data validation failed: ${validationResult.error}` }, 400);
    }
    
    // 5. 提取客户端信息
    const country = request.cf?.country || 'UNKNOWN';
    const userAgent = data.metadata?.user_agent || request.headers.get('User-Agent') || 'unknown';
    const browser = extractBrowser(userAgent);
    
    // 6. 生成用户哈希（基于多个标识符）
    const userHash = await generateUserHash(data.data, userAgent, request);
    
    // 7. 检查是否重复事件（防止短时间内重复提交）
    const isDuplicate = await checkDuplicateEvent(env, data.event_type, userHash, data.data);
    if (isDuplicate) {
      console.log('Duplicate event detected, skipping');
      return jsonResponse({ success: true, duplicate: true });
    }
    
    // 8. 准备数据库记录
    const now = Date.now();
    const date = new Date(now).toISOString().split('T')[0];
    
    // 9. 根据事件类型写入对应表
    await storeEventData(env, data.event_type, data.data, {
      userHash,
      browser,
      country,
      userAgent: userAgent.substring(0, 200),
      timestamp: now,
      date
    });
    
    console.log('Plugin event tracked:', {
      event_type: data.event_type,
      version: data.data.version,
      user_hash: userHash.substring(0, 8) + '...',
      browser,
      country
    });
    
    // 10. 返回成功响应
    return jsonResponse({ success: true });
    
  } catch (error) {
    console.error('Error tracking plugin event:', error);
    return jsonResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
}

/**
 * 验证事件数据结构
 */
function validateEventData(eventType, data) {
  // 通用字段验证
  if (!data.version) {
    return { valid: false, error: 'Missing version field' };
  }
  
  if (!data.user_id) {
    return { valid: false, error: 'Missing user_id field' };
  }
  
  // 根据事件类型进行特定验证
  switch (eventType) {
    case 'installation':
      if (!data.install_type || !['install', 'update'].includes(data.install_type)) {
        return { valid: false, error: 'Invalid install_type, must be install or update' };
      }
      if (data.install_type === 'update' && !data.previous_version) {
        return { valid: false, error: 'Missing previous_version for update event' };
      }
      break;
      
    case 'startup':
      // startup 事件只需要基本字段
      break;
      
    case 'tab_startup':
      if (!data.domain) {
        return { valid: false, error: 'Missing domain field for tab_startup event' };
      }
      break;
      
    default:
      return { valid: false, error: 'Unknown event type' };
  }
  
  return { valid: true };
}

/**
 * 生成用户哈希
 */
async function generateUserHash(data, userAgent, request) {
  // 使用多个标识符生成稳定的用户哈希
  const identifiers = [
    data.user_id || 'unknown',
    userAgent.substring(0, 100),
    request.cf?.country || 'unknown'
  ].join('|');
  
  const encoder = new TextEncoder();
  const dataToHash = encoder.encode(identifiers + 'salt-adhdgofly-plugin');
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataToHash);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * 提取浏览器类型
 */
function extractBrowser(userAgent) {
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
    return 'chrome';
  } else if (userAgent.includes('Edge')) {
    return 'edge';
  } else if (userAgent.includes('Firefox')) {
    return 'firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'safari';
  }
  return 'unknown';
}

/**
 * 检查重复事件
 */
async function checkDuplicateEvent(env, eventType, userHash, data) {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // 5分钟内的重复检查
  
  let tableName;
  switch (eventType) {
    case 'installation':
      tableName = 'plugin_installations';
      break;
    case 'startup':
      tableName = 'plugin_startups';
      break;
    case 'tab_startup':
      tableName = 'plugin_tab_startups';
      break;
    default:
      return false;
  }
  
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM ${tableName}
    WHERE user_hash = ? AND version = ? AND ${eventType === 'installation' ? 'installed_at' : 'started_at'} > ?
  `).bind(userHash, data.version, fiveMinutesAgo).first();
  
  return (result?.count || 0) > 0;
}

/**
 * 存储事件数据
 */
async function storeEventData(env, eventType, data, metadata) {
  switch (eventType) {
    case 'installation':
      await env.DB.prepare(`
        INSERT INTO plugin_installations 
        (event_type, version, previous_version, installed_at, user_hash, browser, country, user_agent, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.install_type,
        data.version,
        data.previous_version || null,
        metadata.timestamp,
        metadata.userHash,
        metadata.browser,
        metadata.country,
        metadata.userAgent,
        metadata.date
      ).run();
      break;
      
    case 'startup':
      await env.DB.prepare(`
        INSERT INTO plugin_startups 
        (started_at, user_hash, version, browser, country, user_agent, date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        metadata.timestamp,
        metadata.userHash,
        data.version,
        metadata.browser,
        metadata.country,
        metadata.userAgent,
        metadata.date
      ).run();
      break;
      
    case 'tab_startup':
      const domainHash = await hashDomain(data.domain);
      await env.DB.prepare(`
        INSERT INTO plugin_tab_startups 
        (started_at, user_hash, version, domain_hash, browser, country, user_agent, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        metadata.timestamp,
        metadata.userHash,
        data.version,
        domainHash,
        metadata.browser,
        metadata.country,
        metadata.userAgent,
        metadata.date
      ).run();
      break;
  }
}

/**
 * 域名哈希（保护隐私）
 */
async function hashDomain(domain) {
  if (!domain) return 'unknown';
  
  const encoder = new TextEncoder();
  const data = encoder.encode(domain + 'salt-domain-adhdgofly');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
}

/**
 * 处理公开统计查询（不需要认证）
 */
async function handlePublicStats(request, env) {
  try {
    const stats = {
      totalInstallations: await getTotalInstallations(env),
      totalUpdates: await getTotalUpdates(env),
      activeUsers: await getActiveUsers(env, 7), // 7天内活跃用户
      todayActiveUsers: await getTodayActiveUsers(env),
      browserStats: await getBrowserStats(env),
      versionStats: await getVersionStats(env),
      lastUpdated: new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    
    return jsonResponse(stats);
    
  } catch (error) {
    console.error('Error fetching public plugin stats:', error);
    return jsonResponse({ error: 'Failed to fetch stats' }, 500);
  }
}

/**
 * 处理管理员统计查询（需要认证）
 */
async function handleAdminStats(request, env) {
  try {
    // 简单的 Token 认证
    const authHeader = request.headers.get('Authorization');
    const expectedToken = env.ADMIN_TOKEN || 'change-me-in-production';
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    
    // 返回详细统计数据
    const stats = {
      installations: {
        total: await getTotalInstallations(env),
        updates: await getTotalUpdates(env),
        byDate: await getInstallationsByDate(env, 30),
        byVersion: await getInstallationsByVersion(env)
      },
      usage: {
        activeUsers: await getActiveUsers(env, 30),
        dailyActiveUsers: await getDailyActiveUsers(env, 30),
        topDomains: await getTopDomains(env, 20)
      },
      demographics: {
        byBrowser: await getBrowserStats(env),
        byCountry: await getCountryStats(env),
        byVersion: await getVersionStats(env)
      },
      recent: {
        installations: await getRecentInstallations(env, 10),
        startups: await getRecentStartups(env, 10)
      }
    };
    
    return jsonResponse(stats);
    
  } catch (error) {
    console.error('Error fetching admin plugin stats:', error);
    return jsonResponse({ error: 'Failed to fetch stats' }, 500);
  }
}

/**
 * 统计查询函数
 */

// 总安装次数
async function getTotalInstallations(env) {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as total FROM plugin_installations WHERE event_type = 'install'
  `).first();
  return result?.total || 0;
}

// 总更新次数
async function getTotalUpdates(env) {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as total FROM plugin_installations WHERE event_type = 'update'
  `).first();
  return result?.total || 0;
}

// 活跃用户数（指定天数内有启动记录）
async function getActiveUsers(env, days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  const result = await env.DB.prepare(`
    SELECT COUNT(DISTINCT user_hash) as active_users 
    FROM plugin_startups 
    WHERE date >= ?
  `).bind(cutoffDateStr).first();
  
  return result?.active_users || 0;
}

// 今日活跃用户数
async function getTodayActiveUsers(env) {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await env.DB.prepare(`
    SELECT COUNT(DISTINCT user_hash) as today_active 
    FROM plugin_startups 
    WHERE date = ?
  `).bind(today).first();
  
  return result?.today_active || 0;
}

// 按浏览器统计
async function getBrowserStats(env) {
  const results = await env.DB.prepare(`
    SELECT browser, COUNT(DISTINCT user_hash) as users
    FROM plugin_startups
    WHERE date >= date('now', '-30 days')
    GROUP BY browser
    ORDER BY users DESC
  `).all();
  
  return results.results || [];
}

// 按版本统计
async function getVersionStats(env) {
  const results = await env.DB.prepare(`
    SELECT version, COUNT(DISTINCT user_hash) as users
    FROM plugin_startups
    WHERE date >= date('now', '-30 days')
    GROUP BY version
    ORDER BY users DESC
    LIMIT 10
  `).all();
  
  return results.results || [];
}

// 按日期统计安装量
async function getInstallationsByDate(env, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  const results = await env.DB.prepare(`
    SELECT date, 
           COUNT(CASE WHEN event_type = 'install' THEN 1 END) as installs,
           COUNT(CASE WHEN event_type = 'update' THEN 1 END) as updates
    FROM plugin_installations
    WHERE date >= ?
    GROUP BY date
    ORDER BY date ASC
  `).bind(cutoffDateStr).all();
  
  return results.results || [];
}

// 按版本统计安装量
async function getInstallationsByVersion(env) {
  const results = await env.DB.prepare(`
    SELECT version, 
           COUNT(CASE WHEN event_type = 'install' THEN 1 END) as installs,
           COUNT(CASE WHEN event_type = 'update' THEN 1 END) as updates
    FROM plugin_installations
    GROUP BY version
    ORDER BY installs + updates DESC
    LIMIT 10
  `).all();
  
  return results.results || [];
}

// 每日活跃用户数
async function getDailyActiveUsers(env, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  const results = await env.DB.prepare(`
    SELECT date, COUNT(DISTINCT user_hash) as active_users
    FROM plugin_startups
    WHERE date >= ?
    GROUP BY date
    ORDER BY date ASC
  `).bind(cutoffDateStr).all();
  
  return results.results || [];
}

// 热门域名
async function getTopDomains(env, limit = 20) {
  const results = await env.DB.prepare(`
    SELECT domain_hash, COUNT(*) as visits
    FROM plugin_tab_startups
    WHERE date >= date('now', '-30 days')
    GROUP BY domain_hash
    ORDER BY visits DESC
    LIMIT ?
  `).bind(limit).all();
  
  return results.results || [];
}

// 按国家统计
async function getCountryStats(env) {
  const results = await env.DB.prepare(`
    SELECT country, COUNT(DISTINCT user_hash) as users
    FROM plugin_startups
    WHERE date >= date('now', '-30 days')
    GROUP BY country
    ORDER BY users DESC
    LIMIT 10
  `).all();
  
  return results.results || [];
}

// 最近安装记录
async function getRecentInstallations(env, limit = 10) {
  const results = await env.DB.prepare(`
    SELECT event_type, version, previous_version, browser, country, date, installed_at
    FROM plugin_installations
    ORDER BY installed_at DESC
    LIMIT ?
  `).bind(limit).all();
  
  return results.results || [];
}

// 最近启动记录
async function getRecentStartups(env, limit = 10) {
  const results = await env.DB.prepare(`
    SELECT version, browser, country, date, started_at
    FROM plugin_startups
    ORDER BY started_at DESC
    LIMIT ?
  `).bind(limit).all();
  
  return results.results || [];
}

/**
 * 工具函数
 */

// CORS 处理
function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// JSON 响应辅助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}