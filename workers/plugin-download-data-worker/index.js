/**
 * ADHDGoFly Plugin Download Data Worker
 * 专门处理下载数据的收集和存储
 * 
 * 功能：
 * 1. 接收下载数据请求
 * 2. 验证和处理数据
 * 3. 存储到专用的 D1 数据库
 * 4. 提供下载统计查询 API
 */

// CORS 配置
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    try {
      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
      }

      const url = new URL(request.url);
      const path = url.pathname;

      // 路由分发
      if (path === '/health') {
        return handleHealth();
      } else if (path === '/api/download-data' && request.method === 'POST') {
        return handleDownloadData(request, env);
      } else if (path.startsWith('/api/stats/')) {
        return handleStats(request, env);
      } else {
        return jsonResponse({ error: 'Not found' }, 404);
      }

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        error: 'Internal server error',
        message: error.message 
      }, 500);
    }
  }
};

/**
 * 健康检查
 */
function handleHealth() {
  return jsonResponse({
    status: 'healthy',
    service: 'plugin-download-data-worker',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}

/**
 * 处理下载数据
 */
async function handleDownloadData(request, env) {
  try {
    // 1. 解析请求数据
    const data = await request.json();
    
    // 2. 验证必要字段
    const required = ['version', 'browser', 'language'];
    for (const field of required) {
      if (!data[field]) {
        return jsonResponse({ 
          error: `Missing required field: ${field}` 
        }, 400);
      }
    }

    // 3. 处理和清理数据
    const downloadRecord = {
      version: data.version,
      browser: data.browser.toLowerCase(),
      language: data.language.toLowerCase(),
      country: data.country || 'unknown',
      user_agent: data.userAgent || 'unknown',
      referrer: data.referrer || 'unknown',
      timestamp: data.timestamp || Date.now(),
      date: data.date || new Date().toISOString().split('T')[0],
      ip_hash: data.ip ? await hashIP(data.ip) : 'unknown'
    };

    // 4. 检查重复下载（基于 IP 哈希和浏览器）
    const isDuplicate = await checkDuplicate(env, downloadRecord.ip_hash, downloadRecord.browser);
    
    // 5. 插入数据库
    const result = await env.plugin_download_data_database.prepare(`
      INSERT INTO downloads 
      (version, browser, language, country, user_agent, referrer, ip_hash, created_at, date, is_duplicate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      downloadRecord.version,
      downloadRecord.browser,
      downloadRecord.language,
      downloadRecord.country,
      downloadRecord.user_agent,
      downloadRecord.referrer,
      downloadRecord.ip_hash,
      downloadRecord.timestamp,
      downloadRecord.date,
      isDuplicate ? 1 : 0
    ).run();

    // 6. 更新每日统计（如果不是重复下载）
    if (!isDuplicate) {
      await updateDailyStats(env, downloadRecord);
    }

    // 7. 记录日志
    console.log('Download recorded:', {
      download_id: result.meta.last_row_id,
      version: downloadRecord.version,
      browser: downloadRecord.browser,
      country: downloadRecord.country,
      is_duplicate: isDuplicate
    });

    // 8. 返回成功响应
    return jsonResponse({
      success: true,
      message: 'Download data recorded successfully',
      data: {
        download_id: result.meta.last_row_id,
        version: downloadRecord.version,
        browser: downloadRecord.browser,
        language: downloadRecord.language,
        country: downloadRecord.country,
        timestamp: downloadRecord.timestamp,
        is_duplicate: isDuplicate
      }
    });

  } catch (error) {
    console.error('Error processing download data:', error);
    return jsonResponse({ 
      error: 'Failed to process download data',
      message: error.message 
    }, 500);
  }
}

/**
 * 处理统计查询
 */
async function handleStats(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === '/api/stats/total') {
      return jsonResponse(await getTotalDownloads(env));
    } else if (path === '/api/stats/by-browser') {
      return jsonResponse(await getDownloadsByBrowser(env));
    } else if (path === '/api/stats/by-language') {
      return jsonResponse(await getDownloadsByLanguage(env));
    } else if (path === '/api/stats/by-country') {
      return jsonResponse(await getDownloadsByCountry(env));
    } else if (path === '/api/stats/by-version') {
      return jsonResponse(await getDownloadsByVersion(env));
    } else if (path === '/api/stats/daily') {
      const days = parseInt(url.searchParams.get('days')) || 30;
      return jsonResponse(await getDailyStats(env, days));
    } else if (path === '/api/stats/recent') {
      const limit = parseInt(url.searchParams.get('limit')) || 10;
      return jsonResponse(await getRecentDownloads(env, limit));
    } else {
      return jsonResponse({ error: 'Stats endpoint not found' }, 404);
    }
  } catch (error) {
    console.error('Stats query error:', error);
    return jsonResponse({ 
      error: 'Failed to query stats',
      message: error.message 
    }, 500);
  }
}

/**
 * 统计查询函数
 */
async function getTotalDownloads(env) {
  const result = await env.plugin_download_data_database.prepare(`
    SELECT COUNT(*) as total, COUNT(DISTINCT ip_hash) as unique_users
    FROM downloads 
    WHERE is_duplicate = 0
  `).first();
  
  return {
    total_downloads: result.total,
    unique_users: result.unique_users,
    generated_at: new Date().toISOString()
  };
}

async function getDownloadsByBrowser(env) {
  const results = await env.plugin_download_data_database.prepare(`
    SELECT browser, COUNT(*) as count
    FROM downloads 
    WHERE is_duplicate = 0
    GROUP BY browser
    ORDER BY count DESC
  `).all();
  
  return {
    by_browser: results.results,
    generated_at: new Date().toISOString()
  };
}

async function getDownloadsByLanguage(env) {
  const results = await env.plugin_download_data_database.prepare(`
    SELECT language, COUNT(*) as count
    FROM downloads 
    WHERE is_duplicate = 0
    GROUP BY language
    ORDER BY count DESC
  `).all();
  
  return {
    by_language: results.results,
    generated_at: new Date().toISOString()
  };
}

async function getDownloadsByCountry(env) {
  const results = await env.plugin_download_data_database.prepare(`
    SELECT country, COUNT(*) as count
    FROM downloads 
    WHERE is_duplicate = 0 AND country != 'unknown'
    GROUP BY country
    ORDER BY count DESC
    LIMIT 20
  `).all();
  
  return {
    by_country: results.results,
    generated_at: new Date().toISOString()
  };
}

async function getDownloadsByVersion(env) {
  const results = await env.plugin_download_data_database.prepare(`
    SELECT version, COUNT(*) as count, MIN(created_at) as first_download
    FROM downloads 
    WHERE is_duplicate = 0
    GROUP BY version
    ORDER BY count DESC
  `).all();
  
  return {
    by_version: results.results,
    generated_at: new Date().toISOString()
  };
}

async function getDailyStats(env, days = 30) {
  const results = await env.plugin_download_data_database.prepare(`
    SELECT date, COUNT(*) as downloads, COUNT(DISTINCT ip_hash) as unique_users
    FROM downloads 
    WHERE is_duplicate = 0 AND date >= date('now', '-${days} days')
    GROUP BY date
    ORDER BY date DESC
  `).all();
  
  return {
    daily_stats: results.results,
    period_days: days,
    generated_at: new Date().toISOString()
  };
}

async function getRecentDownloads(env, limit = 10) {
  const results = await env.plugin_download_data_database.prepare(`
    SELECT version, browser, language, country, created_at
    FROM downloads 
    WHERE is_duplicate = 0
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all();
  
  return {
    recent_downloads: results.results,
    limit: limit,
    generated_at: new Date().toISOString()
  };
}

/**
 * 更新每日统计
 */
async function updateDailyStats(env, downloadRecord) {
  await env.plugin_download_data_database.prepare(`
    INSERT OR REPLACE INTO downloads_daily (date, total_downloads, chrome_downloads, edge_downloads, zh_downloads, en_downloads)
    VALUES (
      ?,
      COALESCE((SELECT total_downloads FROM downloads_daily WHERE date = ?), 0) + 1,
      COALESCE((SELECT chrome_downloads FROM downloads_daily WHERE date = ?), 0) + CASE WHEN ? = 'chrome' THEN 1 ELSE 0 END,
      COALESCE((SELECT edge_downloads FROM downloads_daily WHERE date = ?), 0) + CASE WHEN ? = 'edge' THEN 1 ELSE 0 END,
      COALESCE((SELECT zh_downloads FROM downloads_daily WHERE date = ?), 0) + CASE WHEN ? = 'zh' THEN 1 ELSE 0 END,
      COALESCE((SELECT en_downloads FROM downloads_daily WHERE date = ?), 0) + CASE WHEN ? = 'en' THEN 1 ELSE 0 END
    )
  `).bind(
    downloadRecord.date,
    downloadRecord.date,
    downloadRecord.date,
    downloadRecord.browser,
    downloadRecord.date,
    downloadRecord.browser,
    downloadRecord.date,
    downloadRecord.language,
    downloadRecord.date,
    downloadRecord.language
  ).run();
}

/**
 * 工具函数
 */
async function hashIP(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'adhdgofly-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

async function checkDuplicate(env, ipHash, browser) {
  const result = await env.plugin_download_data_database.prepare(`
    SELECT COUNT(*) as count
    FROM downloads 
    WHERE ip_hash = ? AND browser = ? AND date = date('now')
  `).bind(ipHash, browser).first();
  
  return result.count > 0;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}