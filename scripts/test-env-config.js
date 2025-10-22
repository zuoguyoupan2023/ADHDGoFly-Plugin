#!/usr/bin/env node

/**
 * 测试环境变量配置
 * 验证新的无 wrangler.toml 方案是否正常工作
 */

console.log('🧪 测试环境变量配置...');

// 检查必需的环境变量
const requiredEnvVars = [
    'PLUGIN_DOWNLOAD_DATABASE_ID',
    'CLOUDFLARE_API_TOKEN', 
    'CLOUDFLARE_ACCOUNT_ID',
    'ADMIN_TOKEN'
];

let allPresent = true;

requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`✅ ${envVar}: 已设置`);
    } else {
        console.log(`❌ ${envVar}: 未设置`);
        allPresent = false;
    }
});

if (allPresent) {
    console.log('\n🎉 所有环境变量都已正确配置！');
    console.log('📋 可以运行 fetch-stats.js 脚本了');
} else {
    console.log('\n⚠️ 部分环境变量缺失，请检查配置');
    process.exit(1);
}

// 测试简单的 wrangler 命令
console.log('\n🔍 测试 wrangler 连接...');
const { execSync } = require('child_process');

try {
    const result = execSync('npx wrangler whoami', {
        encoding: 'utf8',
        env: {
            ...process.env,
            CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN
        }
    });
    console.log('✅ Wrangler 认证成功');
    console.log(`👤 当前用户: ${result.trim()}`);
} catch (error) {
    console.log('❌ Wrangler 认证失败');
    console.error(error.message);
}