#!/usr/bin/env node

/**
 * ADHDGoFly 下载统计数据获取脚本
 * 用于 GitHub Actions 定期更新统计数据
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    DATABASE_NAME: 'plugin-download-data-database',
    OUTPUT_FILE: 'public/stats.json',
    TIMEZONE: 'Asia/Shanghai', // 东八区
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
function executeWranglerQuery(sql) {
    try {
        console.log(`🔍 执行查询: ${sql}`);
        
        const command = `npx wrangler d1 execute ${CONFIG.DATABASE_NAME} --remote --command "${sql}" --json`;
        console.log(`📝 执行命令: ${command}`);
        
        const result = execSync(command, { 
            cwd: 'workers/plugin-download-data-worker',
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'inherit'] // 显示错误输出
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
        if (error.stdout) {
            console.error(`📤 stdout: ${error.stdout}`);
        }
        if (error.stderr) {
            console.error(`📥 stderr: ${error.stderr}`);
        }
        throw error;
    }
}

/**
 * 获取所有统计数据
 */
async function fetchAllStats() {
    console.log('📊 开始获取下载统计数据...');
    
    const stats = {
        lastUpdated: getBeijingTime(),
        timezone: 'Asia/Shanghai',
        data: {}
    };
    
    try {
        // 1. 总下载量
        console.log('📈 获取总下载量...');
        const totalResult = executeWranglerQuery('SELECT COUNT(*) as total FROM downloads');
        stats.data.totalDownloads = totalResult[0]?.total || 0;
        
        // 2. 独立用户数
        console.log('👥 获取独立用户数...');
        const uniqueUsersResult = executeWranglerQuery('SELECT COUNT(DISTINCT ip_hash) as unique_users FROM downloads');
        stats.data.uniqueUsers = uniqueUsersResult[0]?.unique_users || 0;
        
        // 3. 按浏览器统计
        console.log('🌐 获取浏览器分布...');
        const browserResult = executeWranglerQuery('SELECT browser, COUNT(*) as count FROM downloads GROUP BY browser ORDER BY count DESC');
        stats.data.browserStats = {};
        browserResult.forEach(row => {
            stats.data.browserStats[row.browser] = row.count;
        });
        
        // 4. 按版本统计
        console.log('📦 获取版本分布...');
        const versionResult = executeWranglerQuery('SELECT version, COUNT(*) as count FROM downloads GROUP BY version ORDER BY count DESC');
        stats.data.versionStats = {};
        versionResult.forEach(row => {
            stats.data.versionStats[row.version] = row.count;
        });
        
        // 5. 按语言统计
        console.log('🗣️ 获取语言分布...');
        const languageResult = executeWranglerQuery('SELECT language, COUNT(*) as count FROM downloads GROUP BY language ORDER BY count DESC');
        stats.data.languageStats = {};
        languageResult.forEach(row => {
            stats.data.languageStats[row.language] = row.count;
        });
        
        // 6. 今日下载量
        console.log('📅 获取今日下载量...');
        const todayResult = executeWranglerQuery("SELECT COUNT(*) as today_count FROM downloads WHERE date = date('now')");
        stats.data.todayDownloads = todayResult[0]?.today_count || 0;
        
        // 7. 最近 7 天趋势
        console.log('📊 获取最近 7 天趋势...');
        const trendResult = executeWranglerQuery("SELECT date, COUNT(*) as count FROM downloads WHERE date >= date('now', '-7 days') GROUP BY date ORDER BY date DESC");
        stats.data.weeklyTrend = {};
        trendResult.forEach(row => {
            stats.data.weeklyTrend[row.date] = row.count;
        });
        
        // 8. 最新记录时间
        console.log('🕐 获取最新记录时间...');
        const latestResult = executeWranglerQuery('SELECT MAX(created_at) as latest_timestamp FROM downloads');
        if (latestResult[0]?.latest_timestamp) {
            const latestDate = new Date(latestResult[0].latest_timestamp);
            stats.data.latestDownload = latestDate.toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        console.log('✅ 统计数据获取完成');
        return stats;
        
    } catch (error) {
        console.error('❌ 获取统计数据失败:', error.message);
        throw error;
    }
}

/**
 * 保存统计数据到文件
 */
function saveStatsToFile(stats) {
    try {
        // 确保输出目录存在
        const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 创建输出目录: ${outputDir}`);
        }
        
        // 写入文件
        const jsonContent = JSON.stringify(stats, null, 2);
        fs.writeFileSync(CONFIG.OUTPUT_FILE, jsonContent, 'utf8');
        
        console.log(`💾 统计数据已保存到: ${CONFIG.OUTPUT_FILE}`);
        console.log(`📊 数据摘要:`);
        console.log(`   - 总下载量: ${stats.data.totalDownloads}`);
        console.log(`   - 独立用户: ${stats.data.uniqueUsers}`);
        console.log(`   - 今日下载: ${stats.data.todayDownloads}`);
        console.log(`   - 更新时间: ${stats.lastUpdated}`);
        
    } catch (error) {
        console.error('❌ 保存文件失败:', error.message);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 ADHDGoFly 统计数据更新开始...');
    console.log(`⏰ 执行时间: ${getBeijingTime()} (${CONFIG.TIMEZONE})`);
    
    try {
        // 检查环境
        if (!fs.existsSync('workers/plugin-download-data-worker')) {
            throw new Error('找不到 workers/plugin-download-data-worker 目录');
        }
        
        if (!fs.existsSync('workers/plugin-download-data-worker/wrangler.toml')) {
            throw new Error('找不到 wrangler.toml 配置文件');
        }
        
        // 获取统计数据
        const stats = await fetchAllStats();
        
        // 保存到文件
        saveStatsToFile(stats);
        
        console.log('🎉 统计数据更新完成！');
        
    } catch (error) {
        console.error('💥 统计数据更新失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    fetchAllStats,
    saveStatsToFile,
    getBeijingTime
};