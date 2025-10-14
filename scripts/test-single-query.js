#!/usr/bin/env node

/**
 * 测试单个数据库查询
 */

const { execSync } = require('child_process');
const fs = require('fs');

// 配置
const CONFIG = {
    DATABASE_NAME: 'adhdgofly_downloads',
};

/**
 * 执行 wrangler 命令查询数据库
 */
function executeWranglerQuery(sql) {
    try {
        console.log(`🔍 执行查询: ${sql}`);
        
        const command = `npx wrangler d1 execute ${CONFIG.DATABASE_NAME} --remote --command "${sql}" --json`;
        console.log(`📝 执行命令: ${command}`);
        
        const result = execSync(command, { 
            cwd: 'workers/download-tracker',
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'inherit']
        });
        
        console.log(`📄 原始结果: ${result}`);
        
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
        console.error(`❌ 查询失败: ${error.message}`);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🧪 测试单个数据库查询...');
    
    try {
        // 检查环境
        if (!fs.existsSync('workers/download-tracker')) {
            throw new Error('找不到 workers/download-tracker 目录');
        }
        
        // 测试简单查询
        console.log('📈 测试总下载量查询...');
        const totalResult = executeWranglerQuery('SELECT COUNT(*) as total FROM downloads');
        console.log('📊 查询结果:', totalResult);
        console.log('📈 总下载量:', totalResult[0]?.total);
        
        console.log('🎉 测试成功！');
        
    } catch (error) {
        console.error('💥 测试失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}