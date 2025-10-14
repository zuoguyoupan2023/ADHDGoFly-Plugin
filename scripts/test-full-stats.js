#!/usr/bin/env node

/**
 * 测试完整的统计数据生成流程
 * 验证 stats.json 文件生成和数据质量
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    DATABASE_NAME: 'adhdgofly_downloads',
    OUTPUT_FILE: 'public/stats.json',
    TIMEZONE: 'Asia/Shanghai',
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
                return firstResult.results;
            }
        }
        
        throw new Error('Invalid query result format');
        
    } catch (error) {
        console.error(`❌ 查询失败: ${error.message}`);
        throw error;
    }
}

/**
 * 获取所有统计数据
 */
async function fetchAllStats() {
    console.log('📊 开始获取完整统计数据...');
    
    const stats = {
        lastUpdated: getBeijingTime(),
        timezone: 'Asia/Shanghai',
        updateType: 'scheduled',
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
        return true;
        
    } catch (error) {
        console.error('❌ 保存文件失败:', error.message);
        throw error;
    }
}

/**
 * 验证生成的 stats.json 文件
 */
function validateStatsFile() {
    console.log('\n🔍 验证生成的 stats.json 文件...');
    
    try {
        // 检查文件是否存在
        if (!fs.existsSync(CONFIG.OUTPUT_FILE)) {
            throw new Error(`文件不存在: ${CONFIG.OUTPUT_FILE}`);
        }
        
        // 读取文件内容
        const fileContent = fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf8');
        const stats = JSON.parse(fileContent);
        
        // 验证文件结构
        const requiredFields = [
            'lastUpdated',
            'timezone', 
            'updateType',
            'data'
        ];
        
        const requiredDataFields = [
            'totalDownloads',
            'uniqueUsers',
            'browserStats',
            'versionStats',
            'languageStats',
            'todayDownloads',
            'weeklyTrend'
        ];
        
        console.log('📋 验证文件结构...');
        
        // 检查顶级字段
        for (const field of requiredFields) {
            if (!(field in stats)) {
                throw new Error(`缺少必需字段: ${field}`);
            }
        }
        
        // 检查 data 字段
        for (const field of requiredDataFields) {
            if (!(field in stats.data)) {
                throw new Error(`缺少必需的数据字段: data.${field}`);
            }
        }
        
        console.log('✅ 文件结构验证通过');
        
        // 验证数据类型和合理性
        console.log('📊 验证数据质量...');
        
        // 数值类型检查
        if (typeof stats.data.totalDownloads !== 'number' || stats.data.totalDownloads < 0) {
            throw new Error('totalDownloads 应该是非负数');
        }
        
        if (typeof stats.data.uniqueUsers !== 'number' || stats.data.uniqueUsers < 0) {
            throw new Error('uniqueUsers 应该是非负数');
        }
        
        if (typeof stats.data.todayDownloads !== 'number' || stats.data.todayDownloads < 0) {
            throw new Error('todayDownloads 应该是非负数');
        }
        
        // 逻辑合理性检查
        if (stats.data.uniqueUsers > stats.data.totalDownloads) {
            console.warn('⚠️ 警告: 独立用户数大于总下载数，这可能不合理');
        }
        
        if (stats.data.todayDownloads > stats.data.totalDownloads) {
            throw new Error('今日下载数不应该大于总下载数');
        }
        
        // 对象类型检查
        if (typeof stats.data.browserStats !== 'object') {
            throw new Error('browserStats 应该是对象');
        }
        
        if (typeof stats.data.versionStats !== 'object') {
            throw new Error('versionStats 应该是对象');
        }
        
        if (typeof stats.data.languageStats !== 'object') {
            throw new Error('languageStats 应该是对象');
        }
        
        if (typeof stats.data.weeklyTrend !== 'object') {
            throw new Error('weeklyTrend 应该是对象');
        }
        
        console.log('✅ 数据质量验证通过');
        
        // 输出数据摘要
        console.log('\n📊 === 数据摘要 ===');
        console.log(`📈 总下载量: ${stats.data.totalDownloads}`);
        console.log(`👥 独立用户: ${stats.data.uniqueUsers}`);
        console.log(`📅 今日下载: ${stats.data.todayDownloads}`);
        console.log(`🕐 更新时间: ${stats.lastUpdated}`);
        console.log(`🌏 时区: ${stats.timezone}`);
        console.log(`🔄 更新类型: ${stats.updateType}`);
        
        console.log('\n🌐 浏览器分布:');
        Object.entries(stats.data.browserStats).forEach(([browser, count]) => {
            console.log(`   - ${browser}: ${count}`);
        });
        
        console.log('\n📦 版本分布:');
        Object.entries(stats.data.versionStats).forEach(([version, count]) => {
            console.log(`   - v${version}: ${count}`);
        });
        
        console.log('\n🗣️ 语言分布:');
        Object.entries(stats.data.languageStats).forEach(([language, count]) => {
            console.log(`   - ${language}: ${count}`);
        });
        
        console.log('\n📊 最近 7 天趋势:');
        Object.entries(stats.data.weeklyTrend).forEach(([date, count]) => {
            console.log(`   - ${date}: ${count}`);
        });
        
        if (stats.data.latestDownload) {
            console.log(`\n🕐 最新下载时间: ${stats.data.latestDownload}`);
        }
        
        // 文件大小信息
        const fileStats = fs.statSync(CONFIG.OUTPUT_FILE);
        console.log(`\n📏 文件大小: ${fileStats.size} bytes`);
        
        return true;
        
    } catch (error) {
        console.error('❌ 文件验证失败:', error.message);
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🧪 测试完整统计数据生成流程...');
    console.log(`⏰ 测试时间: ${getBeijingTime()} (${CONFIG.TIMEZONE})`);
    
    try {
        // 检查环境
        if (!fs.existsSync('workers/download-tracker')) {
            throw new Error('找不到 workers/download-tracker 目录');
        }
        
        if (!fs.existsSync('workers/download-tracker/wrangler.toml')) {
            throw new Error('找不到 wrangler.toml 配置文件');
        }
        
        // 1. 获取统计数据
        console.log('\n=== 第一步：获取统计数据 ===');
        const stats = await fetchAllStats();
        
        // 2. 保存到文件
        console.log('\n=== 第二步：保存统计文件 ===');
        saveStatsToFile(stats);
        
        // 3. 验证文件质量
        console.log('\n=== 第三步：验证文件质量 ===');
        const isValid = validateStatsFile();
        
        if (isValid) {
            console.log('\n🎉 完整统计数据生成测试通过！');
            console.log('✅ 数据获取正常');
            console.log('✅ 文件生成成功');
            console.log('✅ 数据质量良好');
        } else {
            throw new Error('文件验证失败');
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