#!/usr/bin/env node

/**
 * ADHDGoFly 插件构建脚本
 * 支持多浏览器版本构建
 * 
 * 使用方法:
 * npm run build        - 构建手动安装版本
 * npm run build:store  - 构建商店版本
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// 检查命令行参数
const isStoreVersion = process.argv.includes('--store');

// 检查环境
function checkEnvironment() {
    console.log('🔍 检查构建环境...');
    // 环境检查逻辑
}

// 创建安装配置文件
// Chrome商店链接智能处理函数
function getChromeStoreInfo(storeUrl) {
    // 检测是否包含占位符
    if (storeUrl.includes('CHROME_APP_ID')) {
        return {
            url: 'https://feedback.adhdgofly.online/',
            isPlaceholder: true,
            searchHint: 'ADHDGoFly'
        };
    }
    return {
        url: storeUrl,
        isPlaceholder: false,
        searchHint: null
    };
}

function createInstallConfig(installType, browserName, version) {
    let storeUrl = STORE_URLS[installType] || STORE_URLS[INSTALL_TYPES.SELF_INSTALL];
    let chromeStoreInfo = null;
    
    // 如果是Chrome商店版本，进行智能处理
    if (installType === INSTALL_TYPES.CHROME_STORE) {
        chromeStoreInfo = getChromeStoreInfo(storeUrl);
        storeUrl = chromeStoreInfo.url;
    }
    
    const config = {
        installType: installType,
        targetBrowser: browserName,
        version: version,
        buildTime: new Date().toISOString(),
        storeUrl: storeUrl
    };
    
    // 如果是Chrome占位符模式，添加额外信息
    if (chromeStoreInfo && chromeStoreInfo.isPlaceholder) {
        config.chromeStoreFallback = {
            isPlaceholder: true,
            searchHint: chromeStoreInfo.searchHint,
            message: '请在Chrome应用商店搜索 "ADHDGoFly" 进行评价'
        };
    }
    
    const configContent = `// ADHDGoFly 安装配置 - 构建时自动生成
window.ADHD_INSTALL_CONFIG = ${JSON.stringify(config, null, 2)};

// 获取安装类型的便捷函数
window.getInstallType = function() {
    return window.ADHD_INSTALL_CONFIG ? window.ADHD_INSTALL_CONFIG.installType : 'selfinstallmark';
};

// 获取商店链接的便捷函数（智能回退支持）
window.getStoreUrl = function() {
    if (!window.ADHD_INSTALL_CONFIG) {
        return 'https://feedback.adhdgofly.online/';
    }
    
    const config = window.ADHD_INSTALL_CONFIG;
    
    
    return config.storeUrl;
};

// 获取Chrome商店搜索提示信息
window.getChromeStoreHint = function() {
    if (window.ADHD_INSTALL_CONFIG && window.ADHD_INSTALL_CONFIG.chromeStoreFallback) {
        return window.ADHD_INSTALL_CONFIG.chromeStoreFallback;
    }
    return null;
};`;
    
    return configContent;
}

// 安装类型配置
const INSTALL_TYPES = {
    SELF_INSTALL: 'selfinstallmark',
    CHROME_STORE: 'chromestore',
    EDGE_STORE: 'edgestore',
    FIREFOX_STORE: 'firefoxstore',
    SAFARI_STORE: 'safaristore',
    OPERA_STORE: 'operastore'
};

// 商店评价链接配置
const STORE_URLS = {
    // Chrome商店：上架后请将 CHROME_APP_ID 替换为实际的应用ID
    [INSTALL_TYPES.CHROME_STORE]: process.env.CHROME_STORE_URL || 'https://chrome.google.com/webstore/detail/CHROME_APP_ID',
    // Edge商店：实际链接（包含中文字符）
    [INSTALL_TYPES.EDGE_STORE]: 'https://microsoftedge.microsoft.com/addons/detail/adhdgofly-%E7%82%B9%E4%BA%AE%E4%BD%A0%E7%9A%84%E8%A7%86%E9%87%8E-edge/odleggjpbedagojaljdopcgolkcibljh',
    [INSTALL_TYPES.FIREFOX_STORE]: 'https://addons.mozilla.org/firefox/addon/adhdgofly/reviews/',
    [INSTALL_TYPES.SAFARI_STORE]: 'https://apps.apple.com/app/adhdgofly',
    [INSTALL_TYPES.OPERA_STORE]: 'https://addons.opera.com/extensions/details/adhdgofly/',
    [INSTALL_TYPES.SELF_INSTALL]: 'https://feedback.adhdgofly.online/'
};

// 浏览器配置
const browserConfigs = {
    chrome: {
        suffix: 'chrome',
        installType: isStoreVersion ? INSTALL_TYPES.CHROME_STORE : INSTALL_TYPES.SELF_INSTALL,
        manifestChanges: {
            name: 'ADHDGoFly, 点亮你的视野 (Chrome)',
            description: 'Text highlighting for better reading - Chrome Edition'
        }
    },
    edge: {
        suffix: 'edge',
        installType: isStoreVersion ? INSTALL_TYPES.EDGE_STORE : INSTALL_TYPES.SELF_INSTALL,
        manifestChanges: {
            name: 'ADHDGoFly, 点亮你的视野 (Edge)',
            description: 'Text highlighting for better reading - Edge Edition'
        }
    }
    // Firefox 和 Safari 版本正在开发中，敬请期待
    // firefox: { ... }
    // safari: { ... }
};

// 主构建函数
async function main() {
    const buildType = isStoreVersion ? '商店版本' : '手动安装版本';
    console.log(`🚀 开始构建 ADHDGoFly 插件发布包 (${buildType})...`);
    
    if (isStoreVersion) {
        console.log('📦 构建模式: 商店版本 - 包含商店特定的安装标识');
    } else {
        console.log('📦 构建模式: 手动安装版本 - 包含自安装标识');
    }
    
    // 检查环境
    checkEnvironment();
    
    // 创建输出目录
    const outputDir = 'public';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log('📁 创建输出目录: public/');
    }
    
    // 检查manifest.json
    if (!fs.existsSync('manifest.json')) {
        console.error('❌ 错误: 找不到 manifest.json 文件');
        process.exit(1);
    }
    
    // 读取基础manifest
    let baseManifest;
    try {
        baseManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    } catch (error) {
        console.error('❌ 错误: 无法解析 manifest.json 文件:', error.message);
        process.exit(1);
    }
    
    const version = baseManifest.version;
    const projectName = 'ADHDGoFly-Plugin';
    
    console.log(`📦 项目名称: ${projectName}`);
    console.log(`🏷️  版本号: ${version}`);
     
    // 清理旧文件
    try {
        fs.readdirSync(outputDir).forEach(file => {
            if (file.endsWith('.zip')) {
                fs.unlinkSync(path.join(outputDir, file));
            }
        });
    } catch (error) {
        console.log('🧹 清理旧文件 (无旧文件)');
    }
     
    // 需要包含的文件
    const includeFiles = [
        'background.js',
        'privacy-settings-manager.js',
        'content.js',
        'popup.html', 
        'popup.js',
        'styles.css',
        'i18n.js',
        'settings.js',
        'settings.css',
        'review-light-tower.js',
        'public/logo-300x300.png',
        'content/',
        'dictionaries/',
        'locales/'
    ];
     
    // 检查必要文件
    const missingFiles = includeFiles.filter(file => !fs.existsSync(file));
    if (missingFiles.length > 0) {
        console.error('❌ 错误: 缺少必要文件:', missingFiles.join(', '));
        process.exit(1);
    }
     
    const buildResults = [];
     
    // 为每个浏览器构建
    for (const [browserName, config] of Object.entries(browserConfigs)) {
        console.log(`\n🔨 构建 ${browserName.toUpperCase()} 版本...`);
        
        // 创建临时manifest
        const browserManifest = { ...baseManifest, ...config.manifestChanges };
        const tempManifestPath = path.join(outputDir, `manifest-${config.suffix}.json`);
        fs.writeFileSync(tempManifestPath, JSON.stringify(browserManifest, null, 2));
        
        // 创建安装配置文件
        const installConfigContent = createInstallConfig(config.installType, browserName, version);
        const tempConfigPath = path.join(outputDir, `install-config-${config.suffix}.js`);
        fs.writeFileSync(tempConfigPath, installConfigContent);
        
        // 创建zip文件
        const zipName = path.join(outputDir, `${projectName}-v${version}-${config.suffix}.zip`);
        
        try {
            // 将临时文件添加到包含文件列表中
            const filesWithManifest = [...includeFiles, tempManifestPath, tempConfigPath];
            await createZipFile(zipName, filesWithManifest, browserName, tempManifestPath, tempConfigPath);
            
            // 获取文件大小
            const stats = fs.statSync(zipName);
            const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            buildResults.push({
                browser: browserName,
                zipName: path.basename(zipName),
                size: fileSizeInMB
            });
            
            console.log(`✅ ${browserName.toUpperCase()} 版本构建完成: ${fileSizeInMB}MB`);
            
            // 清理临时文件
            if (fs.existsSync(tempManifestPath)) {
                fs.unlinkSync(tempManifestPath);
            }
            if (fs.existsSync(tempConfigPath)) {
                fs.unlinkSync(tempConfigPath);
            }
        } catch (error) {
            console.error(`❌ ${browserName.toUpperCase()} 版本构建失败:`, error.message);
            if (fs.existsSync(tempManifestPath)) {
                fs.unlinkSync(tempManifestPath);
            }
            if (fs.existsSync(tempConfigPath)) {
                fs.unlinkSync(tempConfigPath);
            }
        }
    }
     
    // 计算总大小
    const totalSize = buildResults.reduce((sum, result) => sum + parseFloat(result.size), 0).toFixed(2);
    console.log('\n🎉 多浏览器构建完成!');
    buildResults.forEach(result => {
        console.log(`   - ${result.browser.toUpperCase()}: ${result.zipName} (${result.size}MB)`);
    });
     
    console.log(`📊 总大小: ${totalSize}MB`);
    console.log('✅ 多浏览器构建成功！');
       
    // 读取统计数据
    console.log('📊 读取下载统计数据...');
    let stats = null;
    const statsPath = 'public/stats.json';
    
    try {
        if (fs.existsSync(statsPath)) {
            stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
            console.log(`✅ 统计数据读取成功: ${stats.data.totalDownloads} 次下载`);
        } else {
            console.log('ℹ️ 统计数据文件不存在，使用默认值');
        }
    } catch (error) {
        console.log('⚠️ 统计数据读取失败，使用默认值:', error.message);
    }
    
    // 提取统计数据
    const downloadCount = stats?.data?.totalDownloads || 0;
    const uniqueUsers = stats?.data?.uniqueUsers || 0;
    const todayDownloads = stats?.data?.todayDownloads || 0;
    const lastUpdated = stats?.lastUpdated || '';
    const browserStats = stats?.data?.browserStats || {};
    
    // 生成双语言页面
    console.log('🔄 生成双语言 landing page...');
    try {
        // 浏览器名称映射
        const browserNameMap = {
            chrome: { zh: 'Chrome', en: 'Chrome', desc_zh: 'Chrome 浏览器', desc_en: 'Chrome Browser' },
            edge: { zh: 'Edge', en: 'Edge', desc_zh: 'Microsoft Edge 浏览器', desc_en: 'Microsoft Edge Browser' }
            // Firefox 和 Safari 版本正在开发中，敬请期待
        };

        // 生成下载链接HTML
        // 中文版本的下载链接
        const downloadLinksHtml = buildResults.map(result => {
            const browserInfo = browserNameMap[result.browser] || { zh: result.browser, desc_zh: `${result.browser} 浏览器` };
            return `
                        <div class="download-item">
                            <h3>${browserInfo.zh} 版本</h3>
                            <p>适用于 ${browserInfo.desc_zh}</p>
                            <a href="ADHDGoFly-Plugin-v${version}-${result.browser}.zip" class="download-btn" download>
                                📥 下载 ${browserInfo.zh} 版本 (${result.size}MB)
                            </a>
                            <div class="version-info">
                                <small>版本: v${version} | 大小: ${result.size}MB</small>
                            </div>
                        </div>`;
        }).join('') + `
                        <div class="coming-soon-item">
                            <h3>Firefox & Safari 版本</h3>
                            <p>正在开发中，敬请期待</p>
                            <div class="coming-soon-btn">
                                🚧 Coming Soon
                            </div>
                            <div class="version-info">
                                <small>预计发布时间：待定</small>
                            </div>
                        </div>`;

        // 英文版本的下载链接
        const downloadLinksHtmlEn = buildResults.map(result => {
            const browserInfo = browserNameMap[result.browser] || { en: result.browser, desc_en: `${result.browser} Browser` };
            return `
                        <div class="download-item">
                            <h3>${browserInfo.en} Version</h3>
                            <p>For ${browserInfo.desc_en}</p>
                            <a href="ADHDGoFly-Plugin-v${version}-${result.browser}.zip" class="download-btn" download>
                                📥 Download ${browserInfo.en} Version (${result.size}MB)
                            </a>
                            <div class="version-info">
                                <small>Version: v${version} | Size: ${result.size}MB</small>
                            </div>
                        </div>`;
        }).join('') + `
                        <div class="coming-soon-item">
                            <h3>Firefox & Safari Versions</h3>
                            <p>Under development, coming soon</p>
                            <div class="coming-soon-btn">
                                🚧 Coming Soon
                            </div>
                            <div class="version-info">
                                <small>Expected release: TBD</small>
                            </div>
                        </div>`;
            
        // 创建中文版本模板
        function createChineseTemplate() {
            return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>ADHDGoFly - 关键词高亮阅读助手插件</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%);
            min-height: 100vh;
        }
        
        .language-switcher {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }
        
        .language-switcher a {
            display: inline-block;
            padding: 8px 15px;
            margin: 0 2px;
            background: rgba(255,255,255,0.9);
            color: #333;
            text-decoration: none;
            border-radius: 20px;
            font-weight: bold;
            transition: all 0.3s ease;
            border: 1px solid #ddd;
        }
        
        .language-switcher a:hover {
            background: white;
            transform: translateY(-2px);
            border-color: #333;
        }
        
        .language-switcher a.active {
            background: #333;
            color: white;
            border-color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            color: #495057;
            margin-bottom: 50px;
            padding: 80px 0 60px 0;
            background: linear-gradient(135deg, #6c757d 0%, #495057 50%, #343a40 100%);
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url('logo.svg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center top;
            opacity: 0.1;
            z-index: 1;
        }
        
        /* 响应式背景图像尺寸 */
        @media (max-width: 480px) {
            .header::before {
                background-size: 80px 80px;
                background-position: center 20px;
            }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
            .header::before {
                background-size: 100px 100px;
                background-position: center 25px;
            }
        }
        
        @media (min-width: 769px) and (max-width: 1200px) {
            .header::before {
                background-size: 120px 120px;
                background-position: center 30px;
            }
        }
        
        @media (min-width: 1201px) {
            .header::before {
                background-size: 150px 150px;
                background-position: center 35px;
            }
        }
        
        .header-content {
            position: relative;
            z-index: 2;
        }
        
        .header h1 {
            font-size: 3.5rem;
            margin-bottom: 20px;
            margin-top: 60px;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.3rem;
            opacity: 0.95;
            max-width: 600px;
            margin: 0 auto;
            color: #f8f9fa;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        .main-content {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .features {
            margin-bottom: 40px;
        }
        
        .features h2 {
            color: #333;
            font-size: 2.5rem;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 50px;
        }
        
        .feature-card {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
        }
        
        .feature-card h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }
        
        .feature-card p {
            color: #666;
            line-height: 1.6;
        }
        
        .download-section {
            margin-bottom: 40px;
        }
        
        .download-section h2 {
            color: #333;
            font-size: 2.5rem;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .stats-display {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            color: white;
            text-align: center;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px 15px;
            transition: transform 0.3s ease;
        }
        
        .stat-item:hover {
            transform: translateY(-3px);
            background: rgba(255, 255, 255, 0.15);
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
            color: #fff;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .stats-update-info {
            opacity: 0.8;
            font-size: 0.85rem;
        }
        
        .stats-loading {
            opacity: 0.6;
        }
        
        .stats-updated {
            animation: pulse 0.5s ease-in-out;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .download-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .download-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .download-item:hover {
            transform: translateY(-3px);
        }
        
        .download-item h3 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .download-btn {
            display: inline-block;
            padding: 15px 30px;
            background: #333;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .download-btn:hover {
            background: #555;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        
        .coming-soon-item {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            border: 2px dashed #dee2e6;
        }
        
        .coming-soon-btn {
            display: inline-block;
            padding: 15px 30px;
            background: #6c757d;
            color: white;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1rem;
            cursor: not-allowed;
            opacity: 0.7;
        }
        
        .footer {
            text-align: center;
            color: white;
            padding: 40px 0;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2.5rem;
            }
            
            .header p {
                font-size: 1.1rem;
            }
            
            .main-content {
                padding: 40px 20px;
            }
            
            .feature-grid, .download-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Language Switcher -->
    <div class="language-switcher">
        <a href="./index.html" class="active">中文</a>
        <a href="./index-en.html">English</a>
    </div>

    <div class="container">
        <header class="header">
            <div class="header-content">
                <h1>ADHDGoFly</h1>
                <p>关键词高亮阅读助手 - 让网页阅读更轻松，学习更高效</p>
            </div>
        </header>

        <main class="main-content">
            <section class="features">
                <h2>核心功能</h2>
                <div class="feature-grid">
                    <div class="feature-card">
                        <h3>🎯 智能词性标注</h3>
                        <p>自动识别网页文本中的词性，用不同颜色高亮名词、动词、形容词等，帮助理解句子结构</p>
                    </div>
                    <div class="feature-card">
                        <h3>🌍 多语言支持</h3>
                        <p>支持中文、英文、日文、法文、西班牙文、俄文等多种语言的智能识别和处理</p>
                    </div>
                    <div class="feature-card">
                        <h3>⚡ 实时处理</h3>
                        <p>页面加载时自动处理文本，无需手动操作，提供流畅的阅读体验</p>
                    </div>
                    <div class="feature-card">
                        <h3>🎨 个性化设置</h3>
                        <p>可根据个人喜好自定义颜色方案，开关特定功能，调节阅读辅助效果</p>
                    </div>
                    <div class="feature-card">
                        <h3>🔄 自动更新</h3>
                        <p>内置版本检测功能，自动提醒用户更新到最新版本，确保功能完整</p>
                    </div>
                    <div class="feature-card">
                        <h3>🚀 轻量高效</h3>
                        <p>优化的算法设计，占用资源少，不影响网页正常浏览速度</p>
                    </div>
                </div>
            </section>
            
            <section class="download-section">
                <h2>🎉 发现新版本！</h2>
                <p>建议更新以获取最新功能和修复</p>
                
                <div class="download-grid">
                    ${downloadLinksHtml}
                </div>
                
                <!-- 下载统计显示 -->
                <div class="stats-display">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number">${downloadCount}</div>
                            <div class="stat-label">总下载量</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${todayDownloads}</div>
                            <div class="stat-label">今日下载</div>
                        </div>
                    </div>
                    <div class="stats-update-info">
                        <small>数据更新时间: ${lastUpdated || '获取中...'}</small>
                    </div>
                </div>
            </section>
        </main>

        <footer class="footer">
            <p>© 2024 ADHDGoFly Plugin. 专为提升阅读体验而设计。</p>
            <p>当前版本: v${version} | 适用于 Chrome、Edge 等现代浏览器</p>
        </footer>
    </div>
    
    <!-- 下载统计代码 -->
    <script>
    (function() {
        // 统计配置
        const ANALYTICS_API = 'https://plugin-download-data-worker.oliver-409.workers.dev/api/download-data';
        const STATS_API = 'https://plugin-download-data-worker.oliver-409.workers.dev/api/stats';
        const VERSION = '${version}';
        const LANGUAGE = 'zh';
        
        // 静态数据模式：不再动态获取数据
        // document.addEventListener('DOMContentLoaded', function() {
        //     updateStatsDisplay();
        // });
        
        // 监听所有下载按钮（仅用于统计，不更新显示）
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                // 提取浏览器类型（从按钮的 href）
                const href = this.getAttribute('href');
                const browser = href.includes('chrome') ? 'chrome' : 'edge';
                
                // 发送统计数据
                trackDownload(browser);
                
                // 静态模式：不再动态更新显示
                // setTimeout(updateStatsDisplay, 2000);
            });
        });
        
        function trackDownload(browser) {
            const data = {
                action: 'download',
                version: VERSION,
                browser: browser,
                language: LANGUAGE,
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                timestamp: new Date().toISOString(),
                url: window.location.href
            };
            
            // 使用 Vercel + 自定义域名方案
            // 替换为您的自定义域名，避免被墙问题
            const vercelEndpoint = 'https://download-collector.adhdgofly.online/api/plugin-download-data-collector';
            
            // 发送数据到 Vercel
            trackDownloadToVercel(data, vercelEndpoint);
        }
        
        // Vercel 数据收集函数
        async function trackDownloadToVercel(data, endpoint) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ 数据收集成功:', result.requestId);
                } else {
                    console.warn('⚠️ 数据收集失败:', response.status);
                }
            } catch (error) {
                console.warn('⚠️ 数据收集错误:', error.message);
                // 静默失败，不影响用户体验
            }
        }
        
        // 用户环境检测
        function detectUserEnvironment() {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const language = navigator.language || navigator.userLanguage;
            const userAgent = navigator.userAgent;
            
            // 检测是否为中国大陆用户
            const isChina = 
                timezone.includes('Shanghai') || 
                timezone.includes('Beijing') || 
                timezone.includes('Chongqing') ||
                language.startsWith('zh-CN') ||
                (language.startsWith('zh') && !language.includes('TW') && !language.includes('HK'));
            
            // 检测网络环境
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const networkType = connection ? connection.effectiveType : 'unknown';
            
            return {
                isChina: isChina,
                timezone: timezone,
                language: language,
                networkType: networkType,
                userAgent: userAgent,
                timestamp: Date.now()
            };
        }
        
        // 智能路由下载统计
        async function trackDownloadWithSmartRouting(data, environment, endpoints) {
            // 增强数据 - 添加环境信息
            const enhancedData = {
                ...data,
                environment: environment,
                routingStrategy: endpoints[0], // 记录选择的主要策略
                clientTimestamp: Date.now()
            };
            
            console.log(\`🎯 智能路由: 检测到\${environment.isChina ? '中国大陆' : '海外'}用户，使用策略: \${endpoints.join(' → ')}\`);
            
            // 按优先级尝试各个端点
            for (let i = 0; i < endpoints.length; i++) {
                const endpoint = endpoints[i];
                const isLastAttempt = i === endpoints.length - 1;
                
                try {
                    const success = await attemptTrackDownload(enhancedData, endpoint, isLastAttempt);
                    if (success) {
                        console.log(\`✅ 数据收集成功: \${endpoint} (第\${i + 1}次尝试)\`);
                        return;
                    }
                } catch (error) {
                    console.log(\`⚠️ \${endpoint} 端点失败: \${error.message}\${isLastAttempt ? '' : '，尝试下一个端点'}\`);
                    
                    if (isLastAttempt) {
                        // 最后降级：本地存储
                        trackViaLocalStorage(enhancedData);
                        console.log('📱 所有端点失败，数据已保存到本地存储');
                    }
                }
            }
        }
        
        // 尝试特定端点的数据收集
        async function attemptTrackDownload(data, endpoint, isLastAttempt) {
            const timeout = isLastAttempt ? 10000 : 5000; // 最后一次尝试给更长时间
            
            switch (endpoint) {
                case 'qiniu':
                    return await trackViaQiniu(data, timeout);
                case 'cloudflare':
                    return await trackViaCloudflare(data, timeout);
                case 'github':
                    return await trackViaGitHub(data, timeout);
                default:
                    throw new Error(\`未知端点: \${endpoint}\`);
            }
        }
        
        // 七牛云端点统计
        async function trackViaQiniu(data, timeout = 5000) {
            const QINIU_API = 'https://stats.adhdgofly.com/api/track-download'; // 七牛云端点
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(QINIU_API, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Source': 'adhdgofly-plugin'
                    },
                    body: JSON.stringify({
                        ...data,
                        source: 'qiniu-endpoint',
                        collector: 'smart-routing-v1'
                    }),
                    mode: 'cors',
                    credentials: 'omit',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return true;
                }
                throw new Error(\`HTTP \${response.status}\`);
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }
        
        // Cloudflare Workers端点统计
        async function trackViaCloudflare(data, timeout = 5000) {
            const CLOUDFLARE_API = 'https://plugin-download-data-worker.oliver-409.workers.dev/api/download-data';
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(CLOUDFLARE_API, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...data,
                        source: 'cloudflare-workers',
                        collector: 'smart-routing-v1'
                    }),
                    mode: 'cors',
                    credentials: 'omit',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return true;
                }
                throw new Error(\`HTTP \${response.status}\`);
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }
        
        // GitHub Issues API 统计
        async function trackViaGitHub(data, timeout = 8000) {
            const issueBody = \`## 📊 下载统计数据 (智能路由备用通道)

**基本信息**:
- 版本: \${data.version}
- 浏览器: \${data.browser}
- 语言: \${data.language}
- 时间戳: \${data.timestamp}
- 时间: \${new Date(data.timestamp).toLocaleString('en-US', {timeZone: 'UTC'})}

**用户环境**:
- 地区: \${data.environment.isChina ? '中国大陆' : '海外'}
- 时区: \${data.environment.timezone}
- 网络类型: \${data.environment.networkType}
- 路由策略: \${data.routingStrategy}

**技术信息**:
- User Agent: \${data.userAgent.substring(0, 100)}\${data.userAgent.length > 100 ? '...' : ''}
- 来源页面: \${data.referrer || 'direct'}

> 🔄 此数据通过智能路由系统的GitHub备用通道收集，将自动同步到主数据库\`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch('https://api.github.com/repos/burenweiye/ADHDGoFly/issues', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: \`📊 智能路由统计 - \${data.browser} - \${new Date(data.timestamp).toISOString().split('T')[0]}\`,
                        body: issueBody,
                        labels: ['download-stats', 'smart-routing', data.browser, data.language, data.environment.isChina ? 'china' : 'overseas']
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return true;
                }
                throw new Error(\`GitHub API 失败: \${response.status}\`);
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }
        
        // 本地存储降级（离线统计）
        function trackViaLocalStorage(data) {
            try {
                const key = 'adhdgofly_pending_stats';
                const pending = JSON.parse(localStorage.getItem(key) || '[]');
                
                // 添加智能路由标记
                const enhancedData = {
                    ...data,
                    localStorageTimestamp: Date.now(),
                    failureReason: 'all-endpoints-failed',
                    needsSync: true
                };
                
                pending.push(enhancedData);
                
                // 限制本地存储数量，避免占用过多空间
                if (pending.length > 50) {
                    pending.splice(0, pending.length - 50);
                }
                
                localStorage.setItem(key, JSON.stringify(pending));
                console.log('📱 数据已保存到本地存储，等待网络恢复后同步');
                
                // 尝试在后台同步之前失败的数据
                setTimeout(() => syncPendingData(), 30000); // 30秒后尝试同步
            } catch (error) {
                console.error('❌ 本地存储失败:', error);
            }
        }
        
        // 同步待处理的本地数据
        async function syncPendingData() {
            try {
                const key = 'adhdgofly_pending_stats';
                const pending = JSON.parse(localStorage.getItem(key) || '[]');
                
                if (pending.length === 0) return;
                
                console.log(\`🔄 尝试同步 \${pending.length} 条待处理数据\`);
                
                const synced = [];
                for (const data of pending) {
                    try {
                        // 尝试使用智能路由重新发送
                        const environment = data.environment || detectUserEnvironment();
                        const endpoints = environment.isChina ? ['qiniu', 'cloudflare'] : ['cloudflare', 'qiniu'];
                        
                        for (const endpoint of endpoints) {
                            const success = await attemptTrackDownload(data, endpoint, false);
                            if (success) {
                                synced.push(data);
                                console.log(\`✅ 同步成功: \${endpoint}\`);
                                break;
                            }
                        }
                    } catch (error) {
                        console.log(\`⚠️ 同步失败: \${error.message}\`);
                    }
                }
                
                // 移除已同步的数据
                if (synced.length > 0) {
                    const remaining = pending.filter(item => !synced.includes(item));
                    localStorage.setItem(key, JSON.stringify(remaining));
                    console.log(\`🎉 成功同步 \${synced.length} 条数据，剩余 \${remaining.length} 条\`);
                }
            } catch (error) {
                console.error('❌ 同步待处理数据失败:', error);
            }
        }
    })();
    </script>
</body>
</html>`;
        }

        // 创建英文版本模板
        function createEnglishTemplate(downloadLinksHtmlEn) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>ADHDGoFly - Smart Reading Assistant Plugin</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%);
            min-height: 100vh;
        }
        
        .language-switcher {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }
        
        .language-switcher a {
            display: inline-block;
            padding: 8px 15px;
            margin: 0 2px;
            background: rgba(255,255,255,0.9);
            color: #333;
            text-decoration: none;
            border-radius: 20px;
            font-weight: bold;
            transition: all 0.3s ease;
            border: 1px solid #ddd;
        }
        
        .language-switcher a:hover {
            background: white;
            transform: translateY(-2px);
            border-color: #333;
        }
        
        .language-switcher a.active {
            background: #333;
            color: white;
            border-color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            color: #495057;
            margin-bottom: 50px;
            padding: 80px 0 60px 0;
            background: linear-gradient(135deg, #6c757d 0%, #495057 50%, #343a40 100%);
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url('logo.svg');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center top;
            opacity: 0.1;
            z-index: 1;
        }
        
        /* 响应式背景图像尺寸 */
        @media (max-width: 480px) {
            .header::before {
                background-size: 80px 80px;
                background-position: center 20px;
            }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
            .header::before {
                background-size: 100px 100px;
                background-position: center 25px;
            }
        }
        
        @media (min-width: 769px) and (max-width: 1200px) {
            .header::before {
                background-size: 120px 120px;
                background-position: center 30px;
            }
        }
        
        @media (min-width: 1201px) {
            .header::before {
                background-size: 150px 150px;
                background-position: center 35px;
            }
        }
        
        .header-content {
            position: relative;
            z-index: 2;
        }
        
        .header h1 {
            font-size: 3.5rem;
            margin-bottom: 20px;
            margin-top: 60px;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.3rem;
            opacity: 0.95;
            max-width: 600px;
            margin: 0 auto;
            color: #f8f9fa;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        .main-content {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .features {
            margin-bottom: 40px;
        }
        
        .features h2 {
            color: #667eea;
            font-size: 2.5rem;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 50px;
        }
        
        .feature-card {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
        }
        
        .feature-card h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }
        
        .feature-card p {
            color: #666;
            line-height: 1.6;
        }
        
        .download-section {
            margin-bottom: 40px;
        }
        
        .download-section h2 {
            color: #667eea;
            font-size: 2.5rem;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .stats-display {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            color: white;
            text-align: center;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px 15px;
            transition: transform 0.3s ease;
        }
        
        .stat-item:hover {
            transform: translateY(-3px);
            background: rgba(255, 255, 255, 0.15);
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
            color: #fff;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .stats-update-info {
            opacity: 0.8;
            font-size: 0.85rem;
        }
        
        .stats-loading {
            opacity: 0.6;
        }
        
        .stats-updated {
            animation: pulse 0.5s ease-in-out;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .download-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .download-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .download-item:hover {
            transform: translateY(-3px);
        }
        
        .download-item h3 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .download-btn {
            display: inline-block;
            padding: 15px 30px;
            background: #333;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .download-btn:hover {
            background: #555;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        
        .coming-soon-item {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            border: 2px dashed #dee2e6;
        }
        
        .coming-soon-btn {
            display: inline-block;
            padding: 15px 30px;
            background: #6c757d;
            color: white;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1rem;
            cursor: not-allowed;
            opacity: 0.7;
        }
        
        .footer {
            text-align: center;
            color: white;
            padding: 40px 0;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2.5rem;
            }
            
            .header p {
                font-size: 1.1rem;
            }
            
            .main-content {
                padding: 40px 20px;
            }
            
            .feature-grid, .download-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Language Switcher -->
    <div class="language-switcher">
        <a href="./index.html">中文</a>
        <a href="./index-en.html" class="active">English</a>
    </div>

    <div class="container">
        <header class="header">
            <div class="header-content">
                <h1>ADHDGoFly</h1>
                <p>Keyword highlighting assistant — easier, more efficient web reading</p>
            </div>
        </header>

        <main class="main-content">
            <section class="features">
                <h2>Core Features</h2>
                <div class="feature-grid">
                    <div class="feature-card">
                        <h3>🎯 Intelligent POS Tagging</h3>
                        <p>Automatically identifies parts of speech and highlights nouns, verbs, adjectives in distinct colors for better sentence understanding.</p>
                    </div>
                    <div class="feature-card">
                        <h3>🌍 Multi-language Support</h3>
                        <p>Supports intelligent recognition and processing for Chinese, English, Japanese, French, Spanish, Russian, and more.</p>
                    </div>
                    <div class="feature-card">
                        <h3>⚡ Real-time Processing</h3>
                        <p>Processes text automatically on page load with no manual steps, delivering a smooth reading experience.</p>
                    </div>
                    <div class="feature-card">
                        <h3>🎨 Personalized Settings</h3>
                        <p>Customize color schemes, toggle specific features, and tune assistance to personal preference.</p>
                    </div>
                    <div class="feature-card">
                        <h3>🔄 Auto Updates</h3>
                        <p>Built-in version checks remind you to update to the latest release to ensure complete functionality.</p>
                    </div>
                    <div class="feature-card">
                        <h3>🚀 Lightweight & Efficient</h3>
                        <p>Optimized algorithms with low resource usage that won’t slow down browsing.</p>
                    </div>
                </div>
            </section>
            
            <section class="download-section">
                <h2>🎉 New Version Available!</h2>
                <p>Update recommended to get the latest features and fixes.</p>
                
                <div class="download-grid">
                    ${downloadLinksHtmlEn}
                </div>
                
                <!-- 下载统计显示 -->
                <div class="stats-display">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number">${downloadCount}</div>
                            <div class="stat-label">Total Downloads</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${todayDownloads}</div>
                            <div class="stat-label">Today's Downloads</div>
                        </div>
                    </div>
                    <div class="stats-update-info">
                        <small>Last Updated: ${lastUpdated || 'Fetching...'}</small>
                    </div>
                </div>
            </section>
        </main>

        <footer class="footer">
            <p>© 2024 ADHDGoFly Plugin. Designed to improve the reading experience.</p>
            <p>Current Version: v${version} | For modern browsers like Chrome and Edge</p>
        </footer>
    </div>
    
    <!-- 下载统计代码 -->
    <script>
    (function() {
        // 统计配置
        const ANALYTICS_API = 'https://plugin-download-data-worker.oliver-409.workers.dev/api/download-data';
        const STATS_API = 'https://plugin-download-data-worker.oliver-409.workers.dev/api/stats';
        const VERSION = '${version}';
        const LANGUAGE = 'en';
        
        // 静态数据模式：不再动态获取数据
        // document.addEventListener('DOMContentLoaded', function() {
        //     updateStatsDisplay();
        // });
        
        // 监听所有下载按钮（仅用于统计，不更新显示）
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                // 提取浏览器类型（从按钮的 href）
                const href = this.getAttribute('href');
                const browser = href.includes('chrome') ? 'chrome' : 'edge';
                
                // 发送统计数据
                trackDownload(browser);
                
                // 静态模式：不再动态更新显示
                // setTimeout(updateStatsDisplay, 2000);
            });
        });
        
        function trackDownload(browser) {
            const data = {
                action: 'download',
                version: VERSION,
                browser: browser,
                language: LANGUAGE,
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                timestamp: new Date().toISOString(),
                url: window.location.href
            };
            
            // 使用 Vercel + 自定义域名方案
            // 替换为您的自定义域名，避免被墙问题
            const vercelEndpoint = 'https://download-collector.adhdgofly.online/api/plugin-download-data-collector';
            
            // 发送数据到 Vercel
            trackDownloadToVercel(data, vercelEndpoint);
        }
        
        // Vercel 数据收集函数
        async function trackDownloadToVercel(data, endpoint) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ 数据收集成功:', result.requestId);
                } else {
                    console.warn('⚠️ 数据收集失败:', response.status);
                }
            } catch (error) {
                console.warn('⚠️ 数据收集错误:', error.message);
                // 静默失败，不影响用户体验
            }
        }
        
        // 用户环境检测
        function detectUserEnvironment() {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const language = navigator.language || navigator.userLanguage;
            const userAgent = navigator.userAgent;
            
            // 检测是否为中国大陆用户
            const isChina = 
                timezone.includes('Shanghai') || 
                timezone.includes('Beijing') || 
                timezone.includes('Chongqing') ||
                language.startsWith('zh-CN') ||
                (language.startsWith('zh') && !language.includes('TW') && !language.includes('HK'));
            
            // 检测网络环境
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const networkType = connection ? connection.effectiveType : 'unknown';
            
            return {
                isChina: isChina,
                timezone: timezone,
                language: language,
                networkType: networkType,
                userAgent: userAgent,
                timestamp: Date.now()
            };
        }
        
        // 智能路由下载统计
        async function trackDownloadWithSmartRouting(data, environment, endpoints) {
            // 增强数据 - 添加环境信息
            const enhancedData = {
                ...data,
                environment: environment,
                routingStrategy: endpoints[0], // 记录选择的主要策略
                clientTimestamp: Date.now()
            };
            
            console.log(\`🎯 智能路由: 检测到\${environment.isChina ? '中国大陆' : '海外'}用户，使用策略: \${endpoints.join(' → ')}\`);
            
            // 按优先级尝试各个端点
            for (let i = 0; i < endpoints.length; i++) {
                const endpoint = endpoints[i];
                const isLastAttempt = i === endpoints.length - 1;
                
                try {
                    const success = await attemptTrackDownload(enhancedData, endpoint, isLastAttempt);
                    if (success) {
                        console.log(\`✅ 数据收集成功: \${endpoint} (第\${i + 1}次尝试)\`);
                        return;
                    }
                } catch (error) {
                    console.log(\`⚠️ \${endpoint} 端点失败: \${error.message}\${isLastAttempt ? '' : '，尝试下一个端点'}\`);
                    
                    if (isLastAttempt) {
                        // 最后降级：本地存储
                        trackViaLocalStorage(enhancedData);
                        console.log('📱 所有端点失败，数据已保存到本地存储');
                    }
                }
            }
        }
        
        // 尝试特定端点的数据收集
        async function attemptTrackDownload(data, endpoint, isLastAttempt) {
            const timeout = isLastAttempt ? 10000 : 5000; // 最后一次尝试给更长时间
            
            switch (endpoint) {
                case 'qiniu':
                    return await trackViaQiniu(data, timeout);
                case 'cloudflare':
                    return await trackViaCloudflare(data, timeout);
                case 'github':
                    return await trackViaGitHub(data, timeout);
                default:
                    throw new Error(\`未知端点: \${endpoint}\`);
            }
        }
        
        // 七牛云端点统计
        async function trackViaQiniu(data, timeout = 5000) {
            const QINIU_API = 'https://stats.adhdgofly.com/api/track-download'; // 七牛云端点
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(QINIU_API, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Source': 'adhdgofly-plugin'
                    },
                    body: JSON.stringify({
                        ...data,
                        source: 'qiniu-endpoint',
                        collector: 'smart-routing-v1'
                    }),
                    mode: 'cors',
                    credentials: 'omit',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return true;
                }
                throw new Error(\`HTTP \${response.status}\`);
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }
        
        // Cloudflare Workers端点统计
        async function trackViaCloudflare(data, timeout = 5000) {
            const CLOUDFLARE_API = 'https://plugin-download-data-worker.oliver-409.workers.dev/api/download-data';
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(CLOUDFLARE_API, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...data,
                        source: 'cloudflare-workers',
                        collector: 'smart-routing-v1'
                    }),
                    mode: 'cors',
                    credentials: 'omit',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return true;
                }
                throw new Error(\`HTTP \${response.status}\`);
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }
        
        // GitHub Issues API 统计
        async function trackViaGitHub(data, timeout = 8000) {
            const issueBody = \`## 📊 下载统计数据 (智能路由备用通道)

**基本信息**:
- 版本: \${data.version}
- 浏览器: \${data.browser}
- 语言: \${data.language}
- 时间戳: \${data.timestamp}
- 时间: \${new Date(data.timestamp).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}

**用户环境**:
- 地区: \${data.environment.isChina ? '中国大陆' : '海外'}
- 时区: \${data.environment.timezone}
- 网络类型: \${data.environment.networkType}
- 路由策略: \${data.routingStrategy}

**技术信息**:
- User Agent: \${data.userAgent.substring(0, 100)}\${data.userAgent.length > 100 ? '...' : ''}
- 来源页面: \${data.referrer || 'direct'}

> 🔄 此数据通过智能路由系统的GitHub备用通道收集，将自动同步到主数据库\`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch('https://api.github.com/repos/burenweiye/ADHDGoFly/issues', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: \`📊 智能路由统计 - \${data.browser} - \${new Date(data.timestamp).toISOString().split('T')[0]}\`,
                        body: issueBody,
                        labels: ['download-stats', 'smart-routing', data.browser, data.language, data.environment.isChina ? 'china' : 'overseas']
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return true;
                }
                throw new Error(\`GitHub API 失败: \${response.status}\`);
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }
        
        // 本地存储降级（离线统计）
        function trackViaLocalStorage(data) {
            try {
                const key = 'adhdgofly_pending_stats';
                const pending = JSON.parse(localStorage.getItem(key) || '[]');
                
                // 添加智能路由标记
                const enhancedData = {
                    ...data,
                    localStorageTimestamp: Date.now(),
                    failureReason: 'all-endpoints-failed',
                    needsSync: true
                };
                
                pending.push(enhancedData);
                
                // 限制本地存储数量，避免占用过多空间
                if (pending.length > 50) {
                    pending.splice(0, pending.length - 50);
                }
                
                localStorage.setItem(key, JSON.stringify(pending));
                console.log('📱 数据已保存到本地存储，等待网络恢复后同步');
                
                // 尝试在后台同步之前失败的数据
                setTimeout(() => syncPendingData(), 30000); // 30秒后尝试同步
            } catch (error) {
                console.error('❌ 本地存储失败:', error);
            }
        }
        
        // 同步待处理的本地数据
        async function syncPendingData() {
            try {
                const key = 'adhdgofly_pending_stats';
                const pending = JSON.parse(localStorage.getItem(key) || '[]');
                
                if (pending.length === 0) return;
                
                console.log(\`🔄 Attempting to sync \${pending.length} pending data entries\`);
                
                const synced = [];
                for (const data of pending) {
                    try {
                        // 尝试使用智能路由重新发送
                        const environment = data.environment || detectUserEnvironment();
                        const endpoints = environment.isChina ? ['qiniu', 'cloudflare'] : ['cloudflare', 'qiniu'];
                        
                        for (const endpoint of endpoints) {
                            const success = await attemptTrackDownload(data, endpoint, false);
                            if (success) {
                                synced.push(data);
                                console.log(\`✅ Sync successful: \${endpoint}\`);
                                break;
                            }
                        }
                    } catch (error) {
                        console.log(\`⚠️ Sync failed: \${error.message}\`);
                    }
                }
                
                // 移除已同步的数据
                if (synced.length > 0) {
                    const remaining = pending.filter(item => !synced.includes(item));
                    localStorage.setItem(key, JSON.stringify(remaining));
                    console.log(\`🎉 Successfully synced \${synced.length} entries, \${remaining.length} remaining\`);
                }
            } catch (error) {
                console.error('❌ Failed to sync pending data:', error);
            }
        }
    })();
    </script>
</body>
</html>`;
        }

        // 写入中文版本作为默认首页
        const chineseTemplate = createChineseTemplate();
        const defaultIndexPath = path.join(outputDir, 'index.html');
        fs.writeFileSync(defaultIndexPath, chineseTemplate);
        
        // 写入英文版本
        const englishTemplate = createEnglishTemplate(downloadLinksHtmlEn);
        const englishIndexPath = path.join(outputDir, 'index-en.html');
        fs.writeFileSync(englishIndexPath, englishTemplate);
        
        
        console.log('✅ 多语言页面生成完成');
        console.log('   - index.html (中文版默认首页)');
        console.log('   - index-en.html (英文版)');

    } catch (error) {
        console.error('❌ 生成 landing page 失败:', error.message);
        process.exit(1);
    }

    console.log('');
    console.log('🎉 构建完成！可以部署到 Cloudflare Pages 了');
    console.log('📋 部署文件列表:');
    console.log(`   - index.html (中文版默认首页)`);
    console.log(`   - index-en.html (英文版下载页面)`);
    buildResults.forEach(result => {
        console.log(`   - ${result.zipName} (${result.browser.toUpperCase()} 版本, ${result.size}MB)`);
    });
    console.log('');
    console.log('🚀 Cloudflare Pages 将自动部署这些文件');
    console.log('🌐 用户可以选择下载适合的浏览器版本');
}

// 启动构建
main().catch(error => {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
});

// 创建ZIP文件的函数
function createZipFile(zipName, includeFiles, browserName, tempManifestPath, tempConfigPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipName);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`📦 压缩完成: ${archive.pointer()} bytes`);
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);
        
        // 添加文件到压缩包
        includeFiles.forEach(item => {
            if (fs.existsSync(item)) {
                const stat = fs.statSync(item);
                if (stat.isDirectory()) {
                    console.log(`📁 添加目录: ${item}`);
                    archive.directory(item, item);
                } else {
                    console.log(`📄 添加文件: ${item}`);
                    // 处理特殊文件重命名
                    let fileName = item;
                    if (item === tempManifestPath) {
                        fileName = 'manifest.json';
                    } else if (item === tempConfigPath) {
                        fileName = 'install-config.js';
                    }
                    archive.file(item, { name: fileName });
                }
            } else {
                console.warn(`⚠️  文件不存在，跳过: ${item}`);
            }
        });

        archive.finalize();
    });
}