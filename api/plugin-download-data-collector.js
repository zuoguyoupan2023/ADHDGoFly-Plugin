// Vercel Serverless Function for ADHDGoFly Plugin Download Data Collection
// 新架构：专门处理下载数据收集，转发到专用的 download-data Worker

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  try {
    // 1. 验证请求数据
    const { version, browser, language, userAgent, referrer, timestamp } = req.body;

    if (!version || !browser || !language) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'version, browser, and language are required'
      });
    }

    // 2. 构建要发送给 Worker 的数据
    const downloadData = {
      version,
      browser,
      language,
      userAgent: userAgent || req.headers['user-agent'] || 'unknown',
      referrer: referrer || req.headers.referer || 'unknown',
      timestamp: timestamp || Date.now(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD 格式
      // 服务端信息
      country: req.headers['x-vercel-ip-country'] || 'unknown',
      city: req.headers['x-vercel-ip-city'] || 'unknown',
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'
    };

    // 3. 转发到 Cloudflare Worker
    const workerUrl = 'https://plugin-download-data-worker.oliver-409.workers.dev/api/download-data';
    
    const workerResponse = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ADHDGoFly-Vercel-API/1.0'
      },
      body: JSON.stringify(downloadData)
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error('Worker response error:', {
        status: workerResponse.status,
        statusText: workerResponse.statusText,
        body: errorText
      });
      
      return res.status(500).json({
        success: false,
        error: 'Worker processing failed',
        message: `Worker returned ${workerResponse.status}: ${errorText}`
      });
    }

    const workerResult = await workerResponse.json();

    // 4. 记录到 Vercel 日志
    console.log('Download data processed:', {
      version: downloadData.version,
      browser: downloadData.browser,
      language: downloadData.language,
      country: downloadData.country,
      timestamp: downloadData.timestamp,
      worker_response: workerResult
    });

    // 5. 返回成功响应
    return res.status(200).json({
      success: true,
      message: 'Download data recorded successfully',
      data: {
        version: downloadData.version,
        browser: downloadData.browser,
        language: downloadData.language,
        timestamp: downloadData.timestamp
      },
      worker_response: workerResult
    });

  } catch (error) {
    console.error('Download data collection error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}