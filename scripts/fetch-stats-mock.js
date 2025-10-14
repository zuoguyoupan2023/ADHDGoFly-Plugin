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
    
    // 基于真实数据生成模拟数据（当前真实数据是 4 次下载）
    const baseDownloads = 4;
    const mockMultiplier = 50; // 模拟更多数据
    
    return {
        totalDownloads: baseDownloads * mockMultiplier,
        uniqueUsers: Math.floor(baseDownloads * mockMultiplier * 0.7), // 假设 70% 是独立用户
        browserStats: {
            chrome: Math.floor(baseDownloads * mockMultiplier * 0.65),
            edge: Math.floor(baseDownloads * mockMultiplier * 0.35)
        },
        versionStats: {
            '0.1.4': Math.floor(baseDownloads * mockMultiplier * 0.95),
            '0.1.3': Math.floor(baseDownloads * mockMultiplier * 0.05)
        },
        languageStats: {
            zh: Math.floor(baseDownloads * mockMultiplier * 0.6),
            en: Math.floor(baseDownloads * mockMultiplier * 0.4)
        },
        todayDownloads: Math.floor(baseDownloads * 0.5),
        weeklyTrend: {
            '2025-10-14': Math.floor(baseDownloads * 0.5),
            '2025-10-13': Math.floor(baseDownloads * 0.8),
            '2025-10-12': Math.floor(baseDownloads * 0.3),
            '2025-10-11': Math.floor(baseDownloads * 0.2),
            '2025-10-10': Math.floor(baseDownloads * 0.1),
            '2025-10-09': 0,
            '2025-10-08': 0
        },
        latestDownload: '2025-10-14 17:27'
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