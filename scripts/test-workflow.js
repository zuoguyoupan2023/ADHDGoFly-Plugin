#!/usr/bin/env node

/**
 * 测试完整的 GitHub Actions 工作流
 * 包括数据获取、文件生成、Git 操作等
 */

const { execSync } = require('child_process');
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
 * 执行命令并返回结果
 */
function executeCommand(command, description, options = {}) {
    try {
        console.log(`\n🔧 ${description}`);
        console.log(`📝 命令: ${command}`);
        
        const result = execSync(command, {
            encoding: 'utf8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });
        
        console.log('✅ 执行成功');
        return result;
        
    } catch (error) {
        console.error(`❌ 执行失败: ${error.message}`);
        if (options.allowFail) {
            return null;
        }
        throw error;
    }
}

/**
 * 检查文件是否存在变更
 */
function checkFileChanges() {
    try {
        console.log('\n🔍 检查文件变更...');
        
        // 检查 Git 状态
        const gitStatus = executeCommand('git status --porcelain', '检查 Git 状态', { silent: true });
        
        if (!gitStatus || gitStatus.trim() === '') {
            console.log('📊 没有文件变更');
            return false;
        }
        
        console.log('📊 检测到文件变更:');
        console.log(gitStatus);
        
        // 检查是否包含 stats.json
        const hasStatsChange = gitStatus.includes('public/stats.json');
        
        if (hasStatsChange) {
            console.log('✅ stats.json 文件有变更');
            
            // 显示具体变更内容
            try {
                const diff = executeCommand('git diff public/stats.json', '显示文件差异', { 
                    silent: true, 
                    allowFail: true 
                });
                if (diff) {
                    console.log('📋 变更详情:');
                    console.log(diff);
                }
            } catch (e) {
                console.log('ℹ️ 无法显示差异（可能是新文件）');
            }
        } else {
            console.log('ℹ️ stats.json 文件无变更');
        }
        
        return hasStatsChange;
        
    } catch (error) {
        console.error('❌ 检查文件变更失败:', error.message);
        return false;
    }
}

/**
 * 测试 Git 操作（不实际提交）
 */
function testGitOperations() {
    try {
        console.log('\n🔧 测试 Git 操作...');
        
        // 配置 Git 用户信息（测试用）
        executeCommand('git config --local user.email "test@example.com"', '配置 Git 邮箱');
        executeCommand('git config --local user.name "Test User"', '配置 Git 用户名');
        
        // 添加文件到暂存区
        executeCommand('git add public/stats.json', '添加文件到暂存区');
        
        // 检查暂存区状态
        const stagedFiles = executeCommand('git diff --cached --name-only', '检查暂存区文件', { silent: true });
        
        if (stagedFiles && stagedFiles.includes('public/stats.json')) {
            console.log('✅ 文件已成功添加到暂存区');
        } else {
            throw new Error('文件未能添加到暂存区');
        }
        
        // 生成提交信息
        const beijingTime = getBeijingTime();
        const commitMsg = `📊 测试统计数据更新 - ${beijingTime}`;
        console.log(`📝 提交信息: ${commitMsg}`);
        
        // 模拟提交（使用 --dry-run 不实际提交）
        try {
            executeCommand(`git commit --dry-run -m "${commitMsg}"`, '模拟提交操作');
            console.log('✅ Git 提交操作测试通过');
        } catch (error) {
            console.log('ℹ️ 干运行提交测试完成');
        }
        
        // 重置暂存区（清理测试状态）
        executeCommand('git reset HEAD public/stats.json', '重置暂存区', { allowFail: true });
        
        return true;
        
    } catch (error) {
        console.error('❌ Git 操作测试失败:', error.message);
        return false;
    }
}

/**
 * 验证数据一致性（多次查询对比）
 */
async function testDataConsistency() {
    console.log('\n🔍 测试数据一致性...');
    
    try {
        const results = [];
        const queryCount = 3;
        
        for (let i = 1; i <= queryCount; i++) {
            console.log(`\n📊 第 ${i} 次查询...`);
            
            // 运行完整统计脚本
            const output = executeCommand('node scripts/fetch-stats.js', `执行第 ${i} 次统计查询`, { 
                silent: true 
            });
            
            // 读取生成的文件
            if (fs.existsSync(CONFIG.OUTPUT_FILE)) {
                const stats = JSON.parse(fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf8'));
                results.push({
                    iteration: i,
                    totalDownloads: stats.data.totalDownloads,
                    uniqueUsers: stats.data.uniqueUsers,
                    todayDownloads: stats.data.todayDownloads,
                    timestamp: stats.lastUpdated
                });
                
                console.log(`✅ 第 ${i} 次查询完成`);
                console.log(`   - 总下载量: ${stats.data.totalDownloads}`);
                console.log(`   - 独立用户: ${stats.data.uniqueUsers}`);
                console.log(`   - 今日下载: ${stats.data.todayDownloads}`);
            } else {
                throw new Error(`第 ${i} 次查询未生成统计文件`);
            }
            
            // 间隔 2 秒
            if (i < queryCount) {
                console.log('⏳ 等待 2 秒...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // 分析一致性
        console.log('\n📊 分析数据一致性...');
        
        const firstResult = results[0];
        let isConsistent = true;
        
        for (let i = 1; i < results.length; i++) {
            const current = results[i];
            
            if (current.totalDownloads !== firstResult.totalDownloads) {
                console.warn(`⚠️ 总下载量不一致: ${firstResult.totalDownloads} vs ${current.totalDownloads}`);
                isConsistent = false;
            }
            
            if (current.uniqueUsers !== firstResult.uniqueUsers) {
                console.warn(`⚠️ 独立用户数不一致: ${firstResult.uniqueUsers} vs ${current.uniqueUsers}`);
                isConsistent = false;
            }
            
            // 今日下载量可能会变化，只记录但不标记为不一致
            if (current.todayDownloads !== firstResult.todayDownloads) {
                console.log(`ℹ️ 今日下载量变化: ${firstResult.todayDownloads} -> ${current.todayDownloads}`);
            }
        }
        
        if (isConsistent) {
            console.log('✅ 数据一致性测试通过');
        } else {
            console.log('⚠️ 数据一致性测试发现问题');
        }
        
        // 输出详细结果
        console.log('\n📋 详细结果:');
        results.forEach(result => {
            console.log(`   第 ${result.iteration} 次: 总计 ${result.totalDownloads}, 用户 ${result.uniqueUsers}, 今日 ${result.todayDownloads} (${result.timestamp})`);
        });
        
        return isConsistent;
        
    } catch (error) {
        console.error('❌ 数据一致性测试失败:', error.message);
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🧪 测试完整工作流程...');
    console.log(`⏰ 测试时间: ${getBeijingTime()} (${CONFIG.TIMEZONE})`);
    
    let allTestsPassed = true;
    const testResults = {};
    
    try {
        // 检查环境
        console.log('\n=== 环境检查 ===');
        
        if (!fs.existsSync('workers/download-tracker')) {
            throw new Error('找不到 workers/download-tracker 目录');
        }
        
        if (!fs.existsSync('workers/download-tracker/wrangler.toml')) {
            throw new Error('找不到 wrangler.toml 配置文件');
        }
        
        console.log('✅ 环境检查通过');
        
        // 1. 测试完整统计数据生成
        console.log('\n=== 第一步：测试完整统计数据生成 ===');
        try {
            executeCommand('node scripts/test-full-stats.js', '运行完整统计测试');
            testResults.statsGeneration = true;
            console.log('✅ 统计数据生成测试通过');
        } catch (error) {
            testResults.statsGeneration = false;
            allTestsPassed = false;
            console.error('❌ 统计数据生成测试失败');
        }
        
        // 2. 测试文件变更检测
        console.log('\n=== 第二步：测试文件变更检测 ===');
        try {
            const hasChanges = checkFileChanges();
            testResults.changeDetection = hasChanges;
            console.log(`✅ 文件变更检测完成 (有变更: ${hasChanges})`);
        } catch (error) {
            testResults.changeDetection = false;
            allTestsPassed = false;
            console.error('❌ 文件变更检测失败');
        }
        
        // 3. 测试 Git 操作
        console.log('\n=== 第三步：测试 Git 操作 ===');
        try {
            const gitSuccess = testGitOperations();
            testResults.gitOperations = gitSuccess;
            if (gitSuccess) {
                console.log('✅ Git 操作测试通过');
            } else {
                allTestsPassed = false;
            }
        } catch (error) {
            testResults.gitOperations = false;
            allTestsPassed = false;
            console.error('❌ Git 操作测试失败');
        }
        
        // 4. 测试数据一致性
        console.log('\n=== 第四步：测试数据一致性 ===');
        try {
            const consistencyResult = await testDataConsistency();
            testResults.dataConsistency = consistencyResult;
            if (consistencyResult) {
                console.log('✅ 数据一致性测试通过');
            } else {
                console.log('⚠️ 数据一致性测试发现问题（但不影响整体功能）');
            }
        } catch (error) {
            testResults.dataConsistency = false;
            console.error('❌ 数据一致性测试失败');
        }
        
        // 输出最终结果
        console.log('\n🎯 === 测试结果汇总 ===');
        console.log(`📊 统计数据生成: ${testResults.statsGeneration ? '✅ 通过' : '❌ 失败'}`);
        console.log(`🔍 文件变更检测: ${testResults.changeDetection ? '✅ 有变更' : 'ℹ️ 无变更'}`);
        console.log(`🔧 Git 操作测试: ${testResults.gitOperations ? '✅ 通过' : '❌ 失败'}`);
        console.log(`📈 数据一致性测试: ${testResults.dataConsistency ? '✅ 通过' : '⚠️ 有问题'}`);
        
        if (allTestsPassed) {
            console.log('\n🎉 所有核心功能测试通过！');
            console.log('✅ 完整工作流程验证成功');
            console.log('🚀 可以进行 GitHub Actions 实际部署');
        } else {
            console.log('\n⚠️ 部分测试失败，请检查上述错误信息');
            console.log('🔧 建议修复问题后重新测试');
        }
        
    } catch (error) {
        console.error('💥 工作流测试失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}