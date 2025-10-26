/**
 * 插件数据分析 Worker
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

      // 检查是否为独立安装统计
      if (data.event_type === 'independent_installation') {
        console.log('Processing independent installation stats');
        return await handleIndependentInstallation(data, env, corsHeaders);
      }

      // 原有逻辑：验证必需字段
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

      // 插入数据到数据库
      const result = await env.plugin_data_analytics.prepare(`
        INSERT INTO plugin_installations (event_type, user_hash, version, timestamp, date)
        VALUES (?, ?, ?, ?, ?)
      `).bind(event_type, user_hash, version, timestamp, date).run();

      console.log('Data inserted:', result);

      return new Response(JSON.stringify({
        success: true,
        message: 'Plugin data recorded successfully',
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

/**
 * 处理独立安装统计
 */
async function handleIndependentInstallation(data, env, corsHeaders) {
  try {
    console.log('Handling independent installation:', data);

    // 验证独立安装统计的必需字段
    const { 
      event_type, 
      plugin_version, 
      browser_type, 
      platform, 
      language, 
      anonymous_id, 
      install_reason, 
      timestamp 
    } = data;

    if (!event_type || !plugin_version || !browser_type || !platform || 
        !language || !anonymous_id || !install_reason || !timestamp) {
      return new Response(JSON.stringify({ 
        error: 'Missing installation data',
        required: ['event_type', 'plugin_version', 'browser_type', 'platform', 'language', 'anonymous_id', 'install_reason', 'timestamp']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 生成日期
    const dateCreated = new Date(timestamp).toISOString().split('T')[0];

    // 插入到独立安装统计表
    const result = await env.plugin_data_analytics.prepare(`
      INSERT INTO independent_installation_stats (
        event_type, plugin_version, browser_type, platform, language, 
        anonymous_id, install_reason, timestamp, date_created
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event_type, plugin_version, browser_type, platform, language,
      anonymous_id, install_reason, timestamp, dateCreated
    ).run();

    console.log('Independent installation data inserted:', result);

    return new Response(JSON.stringify({
      success: true,
      message: 'Independent installation stats recorded successfully',
      event_type: event_type,
      event_id: result.meta.last_row_id,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Independent installation error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to record independent installation stats',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}