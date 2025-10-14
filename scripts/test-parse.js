#!/usr/bin/env node

/**
 * 测试 wrangler 返回格式解析
 */

// 模拟 wrangler 返回的数据格式
const mockWranglerResult = `[{"results": [{"total": 4}],"success": true,"meta": {"served_by": "v3-prod","served_by_region": "APAC","served_by_primary": true,"timings": {"sql_duration_ms": 0.9221},"duration": 0.9221,"changes": 0,"last_row_id": 0,"changed_db": false,"size_after": 49152,"rows_read": 4,"rows_written": 0,"total_attempts": 1}}]`;

function parseWranglerResult(result) {
    try {
        console.log('📄 原始结果:', result);
        
        // 解析 JSON 结果
        const jsonResult = JSON.parse(result);
        
        // wrangler 返回的格式是数组，包含一个对象
        if (Array.isArray(jsonResult) && jsonResult.length > 0) {
            const firstResult = jsonResult[0];
            if (firstResult && firstResult.results && Array.isArray(firstResult.results)) {
                console.log(`✅ 查询成功，返回 ${firstResult.results.length} 行数据`);
                return firstResult.results;
            }
        }
        
        // 如果格式不符合预期，显示详细信息
        console.log(`⚠️ 意外的结果格式:`, JSON.stringify(jsonResult, null, 2));
        throw new Error('Invalid query result format');
        
    } catch (error) {
        console.error('❌ 解析失败:', error.message);
        throw error;
    }
}

// 测试解析
console.log('🧪 测试 wrangler 结果解析...');

try {
    const results = parseWranglerResult(mockWranglerResult);
    console.log('✅ 解析成功!');
    console.log('📊 结果数据:', results);
    console.log('📈 总下载量:', results[0]?.total);
} catch (error) {
    console.error('❌ 测试失败:', error.message);
}