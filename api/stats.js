// Vercel Edge Function for ADHDGoFly Plugin Statistics
// 提供统计数据查看功能

export default async function handler(request) {
  // 设置 CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // 只允许 GET 请求
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // 解析查询参数
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'summary';
    const days = parseInt(url.searchParams.get('days')) || 7;

    // 模拟统计数据 (实际项目中这里会从数据库或日志中获取)
    const mockStats = generateMockStats(type, days);

    // 如果配置了 GitHub Token，可以从 GitHub Issues 获取真实数据
    const githubToken = process.env.GITHUB_TOKEN;
    let realStats = null;
    
    if (githubToken) {
      try {
        realStats = await fetchGitHubStats(githubToken, days);
      } catch (error) {
        console.error('GitHub stats fetch failed:', error);
        // 使用模拟数据作为后备
      }
    }

    const stats = realStats || mockStats;

    return new Response(JSON.stringify({
      success: true,
      data: stats,
      meta: {
        type,
        days,
        generatedAt: new Date().toISOString(),
        source: realStats ? 'github' : 'mock'
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Stats error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 生成模拟统计数据
function generateMockStats(type, days) {
  const now = new Date();
  const stats = {
    summary: {
      totalDownloads: Math.floor(Math.random() * 1000) + 500,
      totalUsers: Math.floor(Math.random() * 200) + 100,
      avgDailyDownloads: Math.floor(Math.random() * 50) + 20,
      topCountries: ['CN', 'US', 'JP', 'KR', 'DE'],
      period: `${days} days`
    },
    daily: [],
    actions: {
      download: Math.floor(Math.random() * 800) + 400,
      install: Math.floor(Math.random() * 600) + 300,
      update: Math.floor(Math.random() * 200) + 100,
      uninstall: Math.floor(Math.random() * 50) + 10
    }
  };

  // 生成每日数据
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    stats.daily.push({
      date: date.toISOString().split('T')[0],
      downloads: Math.floor(Math.random() * 100) + 10,
      users: Math.floor(Math.random() * 30) + 5,
      countries: Math.floor(Math.random() * 10) + 3
    });
  }

  return type === 'summary' ? stats.summary : stats;
}

// 从 GitHub Issues 获取真实统计数据
async function fetchGitHubStats(token, days) {
  const owner = 'burenweiye'; // 替换为你的 GitHub 用户名
  const repo = 'ADHDGoFly-Plugin'; // 替换为你的仓库名
  
  // 计算日期范围
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  // 获取数据收集相关的 Issues
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?` +
    `labels=data-collection&since=${since.toISOString()}&state=all&per_page=100`,
    {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'ADHDGoFly-Plugin-Stats'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const issues = await response.json();
  
  // 解析统计数据
  const stats = {
    summary: {
      totalDownloads: 0,
      totalUsers: new Set(),
      avgDailyDownloads: 0,
      topCountries: {},
      period: `${days} days`
    },
    daily: {},
    actions: {
      download: 0,
      install: 0,
      update: 0,
      uninstall: 0
    }
  };

  // 处理每个 Issue
  issues.forEach(issue => {
    try {
      // 从 Issue 标题和内容中提取数据
      const title = issue.title;
      const body = issue.body;
      
      // 提取动作类型
      const actionMatch = title.match(/Data Collection - (\w+)/);
      if (actionMatch) {
        const action = actionMatch[1].toLowerCase();
        if (stats.actions[action] !== undefined) {
          stats.actions[action]++;
        }
      }

      // 提取国家信息
      const countryMatch = body.match(/\*\*Country:\*\* (\w+)/);
      if (countryMatch) {
        const country = countryMatch[1];
        stats.summary.topCountries[country] = (stats.summary.topCountries[country] || 0) + 1;
      }

      // 提取IP (用于统计用户数)
      const ipMatch = body.match(/\*\*IP:\*\* ([\d.]+)/);
      if (ipMatch) {
        stats.summary.totalUsers.add(ipMatch[1]);
      }

      // 按日期分组
      const date = issue.created_at.split('T')[0];
      if (!stats.daily[date]) {
        stats.daily[date] = { downloads: 0, users: new Set(), countries: new Set() };
      }
      stats.daily[date].downloads++;
      if (ipMatch) stats.daily[date].users.add(ipMatch[1]);
      if (countryMatch) stats.daily[date].countries.add(countryMatch[1]);

    } catch (error) {
      console.error('Error parsing issue:', error);
    }
  });

  // 转换为最终格式
  stats.summary.totalDownloads = Object.values(stats.actions).reduce((a, b) => a + b, 0);
  stats.summary.totalUsers = stats.summary.totalUsers.size;
  stats.summary.avgDailyDownloads = Math.round(stats.summary.totalDownloads / days);
  
  // 转换国家统计为数组
  stats.summary.topCountries = Object.entries(stats.summary.topCountries)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([country]) => country);

  // 转换每日数据
  stats.daily = Object.entries(stats.daily).map(([date, data]) => ({
    date,
    downloads: data.downloads,
    users: data.users.size,
    countries: data.countries.size
  }));

  return stats;
}