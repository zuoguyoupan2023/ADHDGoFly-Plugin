/**
 * 极简插件数据分析 Worker
 * 功能：接收 Vercel API 转发的数据，存储到 D1 数据库
 */

export default {
  async fetch(request, env, ctx) {
    // CORS 处理
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 只处理 POST 请求
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // 解析请求数据
      const data = await request.json();
      console.log('Received data:', data);

      // 验证必需字段
      const { event_type, user_hash, version, timestamp, date } = data;
      if (!event_type || !user_hash || !version || !timestamp || !date) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields',
          required: ['event_type', 'user_hash', 'version', 'timestamp', 'date']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 插入数据到 D1 数据库
      const result = await env.plugin_data_analytics.prepare(
        'INSERT INTO plugin_installations (event_type, user_hash, version, timestamp, date) VALUES (?, ?, ?, ?, ?)'
      ).bind(event_type, user_hash, version, timestamp, date).run();

      console.log('Database insert result:', result);

      // 返回成功响应
      return new Response(JSON.stringify({
        success: true,
        message: 'Data recorded successfully',
        event_type: event_type,
        event_id: result.meta.last_row_id,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};