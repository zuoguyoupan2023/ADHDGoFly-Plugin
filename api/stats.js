// 统一统计来源：代理到 Cloudflare Worker 的 D1 真实数据
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { type = 'all', days = '7' } = req.query;
    const daysNum = parseInt(days) || 7;

    const workerStatsUrl = resolveWorkerStatsUrl();
    if (!workerStatsUrl) {
      // 无 Worker 配置时，降级到本地静态文件（不再返回 mock）
      const localStats = await readLocalStats();
      return res.status(200).json({
        success: true,
        data: localStats?.data || localStats || {},
        meta: {
          type,
          days: daysNum,
          generatedAt: new Date().toISOString(),
          source: 'static'
        }
      });
    }

    // 代理到 Worker 的公开统计端点
    const fetchMod = (await import('node-fetch')).default;
    const response = await fetchMod(workerStatsUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      // Worker 不可用则降级到静态文件
      const localStats = await readLocalStats();
      return res.status(200).json({
        success: true,
        data: localStats?.data || localStats || {},
        meta: {
          type,
          days: daysNum,
          generatedAt: new Date().toISOString(),
          source: 'static',
          fallback: true,
          error: `Worker ${response.status}`
        }
      });
    }

    const workerData = await response.json();
    return res.status(200).json({
      success: true,
      data: workerData,
      meta: {
        type,
        days: daysNum,
        generatedAt: new Date().toISOString(),
        source: 'worker',
        endpoint: workerStatsUrl
      }
    });

  } catch (error) {
    console.error('Stats proxy error:', error);
    // 兜底：尝试静态文件
    try {
      const localStats = await readLocalStats();
      return res.status(200).json({ success: true, data: localStats?.data || localStats || {}, meta: { source: 'static', error: error.message } });
    } catch (_) {
      return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
  }
}

function resolveWorkerStatsUrl() {
  const configured = process.env.CLOUDFLARE_WORKER_STATS_URL || process.env.CLOUDFLARE_WORKER_URL || '';
  if (!configured) return null;
  // 兼容传入 track-download 端点：替换为 stats/public
  let url = configured.trim();
  if (url.includes('/api/track-download')) {
    url = url.replace('/api/track-download', '/api/stats/public');
  }
  if (!url.endsWith('/api/stats') && !url.endsWith('/api/stats/public')) {
    url = url.replace(/\/$/, '') + '/api/stats/public';
  }
  return url;
}

async function readLocalStats() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const statsPath = path.join(process.cwd(), 'public', 'stats.json');
    if (!fs.existsSync(statsPath)) return null;
    const content = fs.readFileSync(statsPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Read local stats failed:', e.message);
    return null;
  }
}