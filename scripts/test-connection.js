#!/usr/bin/env node

/**
 * 测试 Cloudflare D1 数据库连接
 */

const { execSync } = require('child_process');

function testConnection() {
    console.log('🔍 测试 Cloudflare D1 数据库连接...');
    
    try {
        // 测试简单查询
        console.log('📊 执行测试查询...');
        
        const command = 'npx wrangler d1 execute adhdgofly_downloads --remote --command "SELECT COUNT(*) as total FROM downloads"';
        console.log(`📝 命令: ${command}`);
        
        const result = execSync(command, { 
            cwd: 'workers/download-tracker',
            encoding: 'utf8',
            stdio: 'inherit'
        });
        
        console.log('✅ 数据库连接成功！');
        
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        console.log('\n🔧 可能的解决方案:');
        console.log('1. 检查网络连接');
        console.log('2. 确认 Cloudflare 认证状态: npx wrangler auth list');
        console.log('3. 重新登录: npx wrangler auth login');
        console.log('4. 检查数据库名称和配置');
        
        process.exit(1);
    }
}

if (require.main === module) {
    testConnection();
}