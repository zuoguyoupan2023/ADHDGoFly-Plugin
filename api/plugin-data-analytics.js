/**
 * 极简插件数据分析 API
 * 功能：接收插件数据，转发到 Worker，返回结果
 */

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只处理 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received request body:', req.body);

    // 验证请求数据
    const { event_type, data } = req.body;
    if (!event_type || !data) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['event_type', 'data']
      });
    }

    // 处理数据格式，映射插件字段到Worker期望的格式
    const processedData = {
      event_type: data.event_type || event_type,
      user_hash: data.user_hash,
      version: data.version,
      timestamp: data.installed_at || data.started_at || data.timestamp || new Date().toISOString(),
      date: data.date || new Date().toISOString().split('T')[0]
    };

    console.log('Processed data for Worker:', processedData);

    // 转发到 Worker
    const workerUrl = 'https://plugin-data-analytics-worker.oliver-409.workers.dev';
    const workerResponse = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processedData)
    });

    const workerResult = await workerResponse.json();
    console.log('Worker response:', workerResult);

    if (!workerResponse.ok) {
      throw new Error(`Worker error: ${workerResult.error || 'Unknown error'}`);
    }

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: 'Plugin data recorded successfully',
      event_type: event_type,
      worker_response: workerResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}