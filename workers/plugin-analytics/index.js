/**
 * ADHDGoFly 插件分析 Cloudflare Workers
 * 
 * 功能：
 * 1. 接收插件埋点事件（安装、启动、标签页启动）
 * 2. 验证请求合法性
 * 3. 写入 D1 数据库
 * 4. 提供插件统计查询 API
 * 5. 生成每日统计汇总
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    // 路由处理（规范化路径，去除重复斜杠）
    const path = url.pathname.replace(/\/+$/,'').replace(/\/+/g, '/');

    // 插件事件收集 API
    if (path === '/api/plugin-events' && request.method === 'POST') {
      return handlePluginEvents(request, env);
    }
    
    // 插件统计查询 API
    if (path === '/api/plugin-stats' && request.method === 'GET') {
      return handlePluginStats(request, env);
    }
    
    // 插件管理员统计 API
    if (path === '/api/plugin-admin-stats' && request.method === 'GET') {
      return handlePluginAdminStats(request, env);
    }
    
    // 健康检查
    if (path === '/health' && request.method === 'GET') {
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
 * 处理插件埋点事件请求
 */
async function handlePluginEvents(request, env) {
  try {
    // 1. 解析请求数据
    const data = await request.json();
    
    // 2. 验证必要字段
    if (!data.event_type || !data.data) {
      return jsonResponse({ error: 'Missing required fields: event_type, data' }, 400);
    }
    
    // 3. 验证事件类型
    const validEventTypes = ['installation', 'startup', 'tab_startup'];
    if (!validEventTypes.includes(data.event_type)) {
      return jsonResponse({ 
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` 
      }, 400);
    }
    
    // 4. 根据事件类型处理数据
    let result;
    switch (data.event_type) {
      case 'installation':
        result = await handleInstallationEvent(data, env);
        break;
      case 'startup':
        result = await handleStartupEvent(data, env);
        break;
      case 'tab_startup':
        result = await handleTabStartupEvent(data, env);
        break;
      default:
        return jsonResponse({ error: 'Unknown event type' }, 400);
    }
    
    console.log('Plugin event processed:', {
      event_type: data.event_type,
      request_id: data.metadata?.request_id,
      version: data.metadata?.version || data.data?.version
    });
    
    // 5. 返回成功响应
    return jsonResponse({
      success: true,
      message: 'Event recorded successfully',
      event_type: data.event_type,
      event_id: result.event_id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing plugin event:', error);
    return jsonResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
}

/**
 * 处理插件安装/更新事件
 */
async function handleInstallationEvent(data, env) {
  const eventData = data.data;
  const metadata = data.metadata || {};
  
  // 验证必需字段
  const required = ['event_type', 'version', 'installed_at', 'user_hash', 'date'];
  for (const field of required) {
    if (!eventData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // 插入数据库
  const result = await env.DB.prepare(`
    INSERT INTO plugin_installations 
    (event_type, version, previous_version, installed_at, user_hash, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    eventData.event_type,
    eventData.version,
    eventData.previous_version || null,
    eventData.installed_at,
    eventData.user_hash,
    eventData.date
  ).run();
  
  // 更新用户统计
  await updateUserStats(env, eventData.user_hash, eventData.version, 'installation');
  
  return { event_id: result.meta.last_row_id };
}

/**
 * 处理插件启动事件
 */
async function handleStartupEvent(data, env) {
  const eventData = data.data;
  const metadata = data.metadata || {};
  
  // 验证必需字段
  const required = ['started_at', 'user_hash', 'version', 'date'];
  for (const field of required) {
    if (!eventData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // 检查重复（同一用户同一天的重复启动，防抖处理）
  const isDuplicate = await checkPluginStartupDuplicate(env, eventData.user_hash, eventData.date);
  if (isDuplicate) {
    console.log('Duplicate plugin startup detected, skipping');
    return { event_id: null, duplicate: true };
  }
  
  // 插入数据库
  const result = await env.DB.prepare(`
    INSERT INTO plugin_startups 
    (started_at, user_hash, version, date)
    VALUES (?, ?, ?, ?)
  `).bind(
    eventData.started_at,
    eventData.user_hash,
    eventData.version,
    eventData.date
  ).run();
  
  // 更新用户统计
  await updateUserStats(env, eventData.user_hash, eventData.version, 'startup');
  
  return { event_id: result.meta.last_row_id };
}

/**
 * 处理标签页启动事件
 */
async function handleTabStartupEvent(data, env) {
  const eventData = data.data;
  const metadata = data.metadata || {};
  
  // 验证必需字段
  const required = ['started_at', 'user_hash', 'version', 'domain_hash', 'date'];
  for (const field of required) {
    if (!eventData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // 检查重复（同一用户同一域名同一天的重复启动，防抖处理）
  const isDuplicate = await checkTabStartupDuplicate(
    env, 
    eventData.user_hash, 
    eventData.domain_hash, 
    eventData.date
  );
  if (isDuplicate) {
    console.log('Duplicate tab startup detected, skipping');
    return { event_id: null, duplicate: true };
  }
  
  // 插入数据库
  const result = await env.DB.prepare(`
    INSERT INTO plugin_tab_startups 
    (started_at, user_hash, version, domain_hash, date)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    eventData.started_at,
    eventData.user_hash,
    eventData.version,
    eventData.domain_hash,
    eventData.date
  ).run();
  
  // 更新用户统计
  await updateUserStats(env, eventData.user_hash, eventData.version, 'tab_startup');
  
  return { event_id: result.meta.last_row_id };
}

/**
 * 更新用户统计
 */
async function updateUserStats(env, userHash, version, eventType) {
  try {
    const now = new Date().toISOString();
    
    // 尝试更新现有记录
    const updateResult = await env.DB.prepare(`
      UPDATE plugin_user_stats 
      SET last_activity = ?, version = ?, 
          startup_count = CASE WHEN ? = 'startup' THEN startup_count + 1 ELSE startup_count END,
          tab_startup_count = CASE WHEN ? = 'tab_startup' THEN tab_startup_count + 1 ELSE tab_startup_count END
      WHERE user_hash = ?
    `).bind(now, version, eventType, eventType, userHash).run();
    
    // 如果没有更新任何记录，则插入新记录
    if (updateResult.changes === 0) {
      await env.DB.prepare(`
        INSERT INTO plugin_user_stats 
        (user_hash, version, first_seen, last_activity, startup_count, tab_startup_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        userHash, 
        version, 
        now, 
        now,
        eventType === 'startup' ? 1 : 0,
        eventType === 'tab_startup' ? 1 : 0
      ).run();
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
    // 不抛出错误，避免影响主要功能
  }
}

/**
 * 检查插件启动重复
 */
async function checkPluginStartupDuplicate(env, userHash, date) {
  try {
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM plugin_startups 
      WHERE user_hash = ? AND date = ?
    `).bind(userHash, date).first();
    
    return result.count > 0;
  } catch (error) {
    console.error('Error checking plugin startup duplicate:', error);
    return false; // 出错时不阻止插入
  }
}

/**
 * 检查标签页启动重复
 */
async function checkTabStartupDuplicate(env, userHash, domainHash, date) {
  try {
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM plugin_tab_startups 
      WHERE user_hash = ? AND domain_hash = ? AND date = ?
    `).bind(userHash, domainHash, date).first();
    
    return result.count > 0;
  } catch (error) {
    console.error('Error checking tab startup duplicate:', error);
    return false; // 出错时不阻止插入
  }
}

/**
 * 处理插件统计查询（公开数据）
 */
async function handlePluginStats(request, env) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'summary';
    
    let stats = {};
    
    switch (type) {
      case 'summary':
        stats = await getPluginSummaryStats(env);
        break;
      case 'daily':
        const days = parseInt(url.searchParams.get('days')) || 30;
        stats = await getPluginDailyStats(env, days);
        break;
      case 'versions':
        stats = await getPluginVersionStats(env);
        break;
      default:
        return jsonResponse({ error: 'Invalid stats type' }, 400);
    }
    
    return jsonResponse({
      success: true,
      type: type,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching plugin stats:', error);
    return jsonResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
}

/**
 * 处理插件管理员统计查询（详细数据）
 */
async function handlePluginAdminStats(request, env) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    
    const token = authHeader.substring(7);
    if (token !== env.ADMIN_TOKEN) {
      return jsonResponse({ error: 'Invalid token' }, 403);
    }
    
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'full';
    
    let stats = {};
    
    switch (type) {
      case 'full':
        stats = await getPluginFullStats(env);
        break;
      case 'users':
        stats = await getPluginUserStats(env);
        break;
      case 'events':
        const limit = parseInt(url.searchParams.get('limit')) || 100;
        stats = await getRecentPluginEvents(env, limit);
        break;
      default:
        return jsonResponse({ error: 'Invalid stats type' }, 400);
    }
    
    return jsonResponse({
      success: true,
      type: type,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching plugin admin stats:', error);
    return jsonResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
}

/**
 * 获取插件摘要统计
 */
async function getPluginSummaryStats(env) {
  const [
    totalInstallations,
    totalUsers,
    todayStartups,
    totalTabStartups
  ] = await Promise.all([
    getTotalInstallations(env),
    getTotalUsers(env),
    getTodayStartups(env),
    getTotalTabStartups(env)
  ]);
  
  return {
    total_installations: totalInstallations,
    total_users: totalUsers,
    today_startups: todayStartups,
    total_tab_startups: totalTabStartups
  };
}

/**
 * 获取插件每日统计
 */
async function getPluginDailyStats(env, days = 30) {
  const result = await env.DB.prepare(`
    SELECT date, event_type, count
    FROM plugin_daily_stats 
    WHERE date >= date('now', '-${days} days')
    ORDER BY date DESC, event_type
  `).all();
  
  return result.results || [];
}

/**
 * 获取插件版本统计
 */
async function getPluginVersionStats(env) {
  const result = await env.DB.prepare(`
    SELECT current_version as version, COUNT(*) as count
    FROM plugin_user_stats
    GROUP BY current_version
    ORDER BY count DESC
  `).all();
  
  return result.results || [];
}

/**
 * 获取插件完整统计（管理员）
 */
async function getPluginFullStats(env) {
  const [
    summary,
    versionStats,
    recentEvents
  ] = await Promise.all([
    getPluginSummaryStats(env),
    getPluginVersionStats(env),
    getRecentPluginEvents(env, 50)
  ]);
  
  return {
    summary,
    version_stats: versionStats,
    recent_events: recentEvents
  };
}

/**
 * 获取插件用户统计（管理员）
 */
async function getPluginUserStats(env) {
  const result = await env.DB.prepare(`
    SELECT version, first_seen, last_activity, startup_count, tab_startup_count
    FROM plugin_user_stats
    ORDER BY last_activity DESC
    LIMIT 1000
  `).all();
  
  return result.results || [];
}

/**
 * 获取最近插件事件（管理员）
 */
async function getRecentPluginEvents(env, limit = 100) {
  const limitPerType = Math.floor(limit / 3);
  const [installations, startups, tabStartups] = await Promise.all([
    env.DB.prepare(`
      SELECT 'installation' as event_type, version, installed_at as timestamp, date
      FROM plugin_installations
      ORDER BY installed_at DESC
      LIMIT ?
    `).bind(limitPerType).all(),
    
    env.DB.prepare(`
      SELECT 'startup' as event_type, version, started_at as timestamp, date
      FROM plugin_startups
      ORDER BY started_at DESC
      LIMIT ?
    `).bind(limitPerType).all(),
    
    env.DB.prepare(`
      SELECT 'tab_startup' as event_type, version, started_at as timestamp, date
      FROM plugin_tab_startups
      ORDER BY started_at DESC
      LIMIT ?
    `).bind(limitPerType).all()
  ]);
  
  // 合并并排序所有事件
  const allEvents = [
    ...(installations.results || []),
    ...(startups.results || []),
    ...(tabStartups.results || [])
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return allEvents.slice(0, limit);
}

/**
 * 获取总安装数
 */
async function getTotalInstallations(env) {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM plugin_installations
  `).first();
  return result.count || 0;
}

/**
 * 获取总用户数
 */
async function getTotalUsers(env) {
  const result = await env.DB.prepare(`
    SELECT COUNT(DISTINCT user_hash) as count FROM plugin_user_stats
  `).first();
  return result.count || 0;
}

/**
 * 获取今日启动数
 */
async function getTodayStartups(env) {
  const today = new Date().toISOString().split('T')[0];
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count 
    FROM plugin_startups 
    WHERE date = ?
  `).bind(today).first();
  return result.count || 0;
}

/**
 * 获取总标签页启动数
 */
async function getTotalTabStartups(env) {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM plugin_tab_startups
  `).first();
  return result.count || 0;
}

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