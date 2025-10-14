#!/usr/bin/env node

/**
 * ADHDGoFly 下载统计数据获取脚本 - 模拟版本
 * 用于测试脚本逻辑，使用模拟数据
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
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
 * 模拟数据库查询结果
 */
function getMockStats() {
    console.log('🎭 使用模拟数据进行测试...');
    
    return {
        totalDownloads: 1256,
        uniqueUsers: 902,
        browserStats: {
            chrome: 815,
            edge: 441
        },
        versionStats: {
            '0.1.4': 1200,
            '0.1.3': 56
        },
        languageStats: {
            zh: 800,
            en: 456
        },
        todayDownloads: 23,
        weeklyTrend: {
            '2025-10-14': 23,
            '2025-10-13': 45,
            '2025-10-12': 32,
            '2025-10-11': 28,
            '2025-10-10': 19,
            '2025-10-09': 15,
            '2025-10-08': 12
        },
        latestDownload: '2025-10-14 07:45'
    };
}

/**
 * 获取所有统计数据
 */
async function fetchAllStats() {
    console.log('📊 开始获取下载统计数据...');
    
    const stats = {
        lastUpdated: getBeijingTime(),
        timezone: 'Asia/Shanghai',
        updateType: 'scheduled', // scheduled | realtime
        data: {}
    };
    
    try {
        // 使用模拟数据
        const mockData = getMockStats();
        stats.data = mockData;
        
        console.log('✅ 统计数据获取完成（模拟数据）');
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
        console.log(`   - 更新类型: ${stats.updateType}`);
        
    } catch (error) {
        console.error('❌ 保存文件失败:', error.message);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 ADHDGoFly 统计数据更新开始（模拟模式）...');
    console.log(`⏰ 执行时间: ${getBeijingTime()} (${CONFIG.TIMEZONE})`);
    
    try {
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