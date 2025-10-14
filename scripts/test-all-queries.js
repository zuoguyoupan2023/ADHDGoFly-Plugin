#!/usr/bin/env node

/**
 * 测试所有数据库查询功能
 * 验证多维度统计数据获取
 */

const { execSync } = require('child_process');
const fs = require('fs');

// 配置
const CONFIG = {
    DATABASE_NAME: 'adhdgofly_downloads',
};

/**
 * 获取东八区时间字符串
 */
function getBeijingTime() {
    const now = new Date();
    const beijingTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
    return beijingTime.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * 执行 wrangler 命令查询数据库
 */
function executeWranglerQuery(sql, description) {
    try {
        console.log(`\n🔍 ${description}`);
        console.log(`📝 SQL: ${sql}`);
        
        const command = `npx wrangler d1 execute ${CONFIG.DATABASE_NAME} --remote --command "${sql}" --json`;
        
        const result = execSync(command, { 
            cwd: 'workers/download-tracker',
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // 解析 JSON 结果
        const jsonResult = JSON.parse(result);
        
        // wrangler 返回的格式是数组，包含一个对象
        if (Array.isArray(jsonResult) && jsonResult.length > 0) {
            const firstResult = jsonResult[0];
            if (firstResult && firstResult.results && Array.isArray(firstResult.results)) {
                console.log(`✅ 查询成功，返回 ${firstResult.results.length} 行数据`);
                console.log(`📊 结果:`, JSON.stringify(firstResult.results, null, 2));
                return firstResult.results;
            }
        }
        
        console.log(`⚠️ 意外的结果格式:`, JSON.stringify(jsonResult, null, 2));
        throw new Error('Invalid query result format');
        
    } catch (error) {
        console.error(`❌ 查询失败: ${error.message}`);
        return null;
    }
}

/**
 * 测试所有统计查询
 */
async function testAllQueries() {
    console.log('🧪 测试所有数据库查询功能...');
    console.log(`⏰ 测试时间: ${getBeijingTime()} (Asia/Shanghai)`);
    
    const results = {};
    let successCount = 0;
    let totalCount = 0;
    
    // 定义所有测试查询
    const queries = [
        {
            key: 'totalDownloads',
            sql: 'SELECT COUNT(*) as total FROM downloads',
            description: '获取总下载量'
        },
        {
            key: 'uniqueUsers',
            sql: 'SELECT COUNT(DISTINCT ip_hash) as unique_users FROM downloads',
            description: '获取独立用户数'
        },
        {
            key: 'browserStats',
            sql: 'SELECT browser, COUNT(*) as count FROM downloads GROUP BY browser ORDER BY count DESC',
            description: '获取浏览器分布'
        },
        {
            key: 'versionStats',
            sql: 'SELECT version, COUNT(*) as count FROM downloads GROUP BY version ORDER BY count DESC',
            description: '获取版本分布'
        },
        {
            key: 'languageStats',
            sql: 'SELECT language, COUNT(*) as count FROM downloads GROUP BY language ORDER BY count DESC',
            description: '获取语言分布'
        },
        {
            key: 'todayDownloads',
            sql: "SELECT COUNT(*) as today_count FROM downloads WHERE date = date('now')",
            description: '获取今日下载量'
        },
        {
            key: 'weeklyTrend',
            sql: "SELECT date, COUNT(*) as count FROM downloads WHERE date >= date('now', '-7 days') GROUP BY date ORDER BY date DESC",
            description: '获取最近 7 天趋势'
        },
        {
            key: 'latestRecord',
            sql: 'SELECT MAX(created_at) as latest_timestamp FROM downloads',
            description: '获取最新记录时间'
        },
        {
            key: 'allRecords',
            sql: 'SELECT * FROM downloads ORDER BY created_at DESC LIMIT 5',
            description: '获取最近 5 条记录'
        }
    ];
    
    // 执行所有查询
    for (const query of queries) {
        totalCount++;
        const result = executeWranglerQuery(query.sql, query.description);
        
        if (result !== null) {
            results[query.key] = result;
            successCount++;
        } else {
            results[query.key] = null;
        }
    }
    
    // 输出测试结果摘要
    console.log('\n📊 === 测试结果摘要 ===');
    console.log(`✅ 成功: ${successCount}/${totalCount} 个查询`);
    console.log(`❌ 失败: ${totalCount - successCount}/${totalCount} 个查询`);
    
    // 输出具体数据
    console.log('\n📈 === 统计数据详情 ===');
    
    if (results.totalDownloads && results.totalDownloads[0]) {
        console.log(`📊 总下载量: ${results.totalDownloads[0].total}`);
    }
    
    if (results.uniqueUsers && results.uniqueUsers[0]) {
        console.log(`👥 独立用户: ${results.uniqueUsers[0].unique_users}`);
    }
    
    if (results.browserStats && results.browserStats.length > 0) {
        console.log('🌐 浏览器分布:');
        results.browserStats.forEach(row => {
            console.log(`   - ${row.browser}: ${row.count} 次`);
        });
    }
    
    if (results.versionStats && results.versionStats.length > 0) {
        console.log('📦 版本分布:');
        results.versionStats.forEach(row => {
            console.log(`   - v${row.version}: ${row.count} 次`);
        });
    }
    
    if (results.languageStats && results.languageStats.length > 0) {
        console.log('🗣️ 语言分布:');
        results.languageStats.forEach(row => {
            console.log(`   - ${row.language}: ${row.count} 次`);
        });
    }
    
    if (results.todayDownloads && results.todayDownloads[0]) {
        console.log(`📅 今日下载: ${results.todayDownloads[0].today_count} 次`);
    }
    
    if (results.weeklyTrend && results.weeklyTrend.length > 0) {
        console.log('📊 最近 7 天趋势:');
        results.weeklyTrend.forEach(row => {
            console.log(`   - ${row.date}: ${row.count} 次`);
        });
    }
    
    if (results.latestRecord && results.latestRecord[0] && results.latestRecord[0].latest_timestamp) {
        const latestDate = new Date(results.latestRecord[0].latest_timestamp);
        const beijingTime = latestDate.toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        console.log(`🕐 最新下载: ${beijingTime}`);
    }
    
    if (results.allRecords && results.allRecords.length > 0) {
        console.log(`📋 最近记录数: ${results.allRecords.length} 条`);
    }
    
    return {
        success: successCount === totalCount,
        successCount,
        totalCount,
        results
    };
}

/**
 * 主函数
 */
async function main() {
    try {
        // 检查环境
        if (!fs.existsSync('workers/download-tracker')) {
            throw new Error('找不到 workers/download-tracker 目录');
        }
        
        if (!fs.existsSync('workers/download-tracker/wrangler.toml')) {
            throw new Error('找不到 wrangler.toml 配置文件');
        }
        
        // 执行测试
        const testResult = await testAllQueries();
        
        if (testResult.success) {
            console.log('\n🎉 所有查询测试通过！');
            process.exit(0);
        } else {
            console.log('\n⚠️ 部分查询测试失败，请检查上述错误信息');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 测试失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}