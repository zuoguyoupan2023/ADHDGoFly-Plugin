/**
 * ADHDGoFly 下载统计 Cloudflare Workers
 * 
 * 功能：
 * 1. 接收下载统计请求
 * 2. 验证请求合法性
 * 3. 提取客户端信息（国家、IP 哈希）
 * 4. 写入 D1 数据库
 * 5. 提供统计查询 API
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    // 路由处理
    if (url.pathname === '/api/track-download' && request.method === 'POST') {
      return handleTrackDownload(request, env);
    }
    
    if (url.pathname === '/api/stats/public' && request.method === 'GET') {
      return handlePublicStats(request, env);
    }
    
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      return handleAdminStats(request, env);
    }
    
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: Date.now(),
        version: '1.0.0'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
};

/**
 * 处理下载统计请求
 */
async function handleTrackDownload(request, env) {
  try {
    // 1. 解析请求数据
    const data = await request.json();
    
    // 2. 验证必要字段
    if (!data.version || !data.browser || !data.language) {
      return jsonResponse({ error: 'Invalid data: missing required fields' }, 400);
    }
    
    // 3. 验证字段值
    if (!['chrome', 'edge'].includes(data.browser)) {
      return jsonResponse({ error: 'Invalid browser type' }, 400);
    }
    
    if (!['zh', 'en'].includes(data.language)) {
      return jsonResponse({ error: 'Invalid language' }, 400);
    }
    
    // 4. 提取客户端信息
    const country = request.cf?.country || 'UNKNOWN';
    const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = await hashIP(ipAddress);
    
    // 5. 检查是否重复（同一 IP 在 1 分钟内的重复下载）
    const isDuplicate = await checkDuplicate(env, ipHash, data.browser);
    if (isDuplicate) {
      console.log('Duplicate download detected, skipping');
      return jsonResponse({ success: true, duplicate: true });
    }
    
    // 6. 准备数据库记录
    const now = Date.now();
    const date = new Date(now).toISOString().split('T')[0];
    
    const record = {
      version: data.version,
      browser: data.browser,
      language: data.language,
      country: country,
      user_agent: (data.userAgent || '').substring(0, 200), // 限制长度
      referrer: (data.referrer || '').substring(0, 200),
      ip_hash: ipHash,
      created_at: now,
      date: date
    };
    
    // 7. 写入 D1 数据库
    await env.DB.prepare(`
      INSERT INTO downloads 
      (version, browser, language, country, user_agent, referrer, ip_hash, created_at, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      record.version,
      record.browser,
      record.language,
      record.country,
      record.user_agent,
      record.referrer,
      record.ip_hash,
      record.created_at,
      record.date
    ).run();
    
    console.log('Download tracked:', {
      version: record.version,
      browser: record.browser,
      language: record.language,
      country: record.country
    });
    
    // 8. 返回成功响应
    return jsonResponse({ success: true });
    
  } catch (error) {
    console.error('Error tracking download:', error);
    return jsonResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
}

/**
 * 处理公开统计查询（不需要认证）
 */
async function handlePublicStats(request, env) {
  try {
    // 只返回基础统计数据
    const stats = {
      total: await getTotalDownloads(env),
      byBrowser: await getDownloadsByBrowser(env),
      byLanguage: await getDownloadsByLanguage(env)
    };
    
    return jsonResponse(stats);
    
  } catch (error) {
    console.error('Error fetching public stats:', error);
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
      total: await getTotalDownloads(env),
      byBrowser: await getDownloadsByBrowser(env),
      byLanguage: await getDownloadsByLanguage(env),
      byDate: await getDownloadsByDate(env, 30),
      byCountry: await getDownloadsByCountry(env),
      byVersion: await getLatestVersionDownloads(env),
      recent: await getRecentDownloads(env, 10)
    };
    
    return jsonResponse(stats);
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return jsonResponse({ error: 'Failed to fetch stats' }, 500);
  }
}

/**
 * 统计查询函数
 */

// 总下载次数
async function getTotalDownloads(env) {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as total FROM downloads
  `).first();
  
  return result?.total || 0;
}

// 按浏览器统计
async function getDownloadsByBrowser(env) {
  const results = await env.DB.prepare(`
    SELECT browser, COUNT(*) as count
    FROM downloads
    GROUP BY browser
    ORDER BY count DESC
  `).all();
  
  return results.results || [];
}

// 按语言统计
async function getDownloadsByLanguage(env) {
  const results = await env.DB.prepare(`
    SELECT language, COUNT(*) as count
    FROM downloads
    GROUP BY language
    ORDER BY count DESC
  `).all();
  
  return results.results || [];
}

// 按日期统计
async function getDownloadsByDate(env, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
  
  const results = await env.DB.prepare(`
    SELECT date, COUNT(*) as count
    FROM downloads
    WHERE date >= ?
    GROUP BY date
    ORDER BY date ASC
  `).bind(cutoffDateStr).all();
  
  return results.results || [];
}

// 按国家统计
async function getDownloadsByCountry(env) {
  const results = await env.DB.prepare(`
    SELECT country, COUNT(*) as count
    FROM downloads
    GROUP BY country
    ORDER BY count DESC
    LIMIT 10
  `).all();
  
  return results.results || [];
}

// 最新版本下载情况
async function getLatestVersionDownloads(env) {
  const results = await env.DB.prepare(`
    SELECT version, COUNT(*) as count
    FROM downloads
    GROUP BY version
    ORDER BY version DESC
    LIMIT 5
  `).all();
  
  return results.results || [];
}

// 最近下载记录
async function getRecentDownloads(env, limit = 10) {
  const results = await env.DB.prepare(`
    SELECT version, browser, language, country, date, created_at
    FROM downloads
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all();
  
  return results.results || [];
}

/**
 * 工具函数
 */

// IP 哈希（保护隐私）
async function hashIP(ip) {
  if (!ip || ip === 'unknown') return 'unknown';
  
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'salt-adhdgofly'); // 添加盐值
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// 检查重复下载（1分钟内同一IP的相同浏览器下载）
async function checkDuplicate(env, ipHash, browser) {
  const oneMinuteAgo = Date.now() - 60000;
  
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM downloads
    WHERE ip_hash = ? AND browser = ? AND created_at > ?
  `).bind(ipHash, browser, oneMinuteAgo).first();
  
  return (result?.count || 0) > 0;
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
      'Access-Control-Allow-Origin': '*'
    }
  });
}
