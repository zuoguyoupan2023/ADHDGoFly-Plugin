#!/usr/bin/env node

/**
 * ADHDGoFly 插件构建脚本
 * 支持多浏览器版本构建和双语言页面生成
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// 检查环境
function checkEnvironment() {
    console.log('🔍 检查构建环境...');
    // 环境检查逻辑
}

// 浏览器配置
const browserConfigs = {
    chrome: {
        suffix: 'chrome',
        manifestChanges: {
            name: 'ADHDGoFly, 点亮你的视野 (Chrome)',
            description: 'Text highlighting for better reading - Chrome Edition'
        }
    },
    edge: {
        suffix: 'edge', 
        manifestChanges: {
            name: 'ADHDGoFly, 点亮你的视野 (Edge)',
            description: 'Text highlighting for better reading - Edge Edition'
        }
    }
};

// 主构建函数
async function main() {
    console.log('🚀 开始构建 ADHDGoFly 插件发布包 (多浏览器版本)...');
    
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
        'content.js',
        'popup.html', 
        'popup.js',
        'styles.css',
        'i18n.js',
        'settings.js',
        'settings.css',
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
        
        // 创建zip文件
        const zipName = path.join(outputDir, `${projectName}-v${version}-${config.suffix}.zip`);
        
        try {
            // 将临时manifest文件添加到包含文件列表中
            const filesWithManifest = [...includeFiles, tempManifestPath];
            await createZipFile(zipName, filesWithManifest, browserName, tempManifestPath);
            
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
        } catch (error) {
            console.error(`❌ ${browserName.toUpperCase()} 版本构建失败:`, error.message);
            if (fs.existsSync(tempManifestPath)) {
                fs.unlinkSync(tempManifestPath);
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
        // 生成下载链接HTML
        // 中文版本的下载链接
        const downloadLinksHtml = buildResults.map(result => {
            const browserNameZh = result.browser === 'chrome' ? 'Chrome' : 'Edge';
            return `
                        <div class="download-item">
                            <h3>${browserNameZh} 版本</h3>
                            <p>适用于 ${result.browser === 'chrome' ? 'Chrome 浏览器' : 'Microsoft Edge 浏览器'}</p>
                            <a href="ADHDGoFly-Plugin-v${version}-${result.browser}.zip" class="download-btn" download>
                                📥 下载 ${browserNameZh} 版本 (${result.size}MB)
                            </a>
                            <div class="version-info">
                                <small>版本: v${version} | 大小: ${result.size}MB</small>
                            </div>
                        </div>`;
        }).join('');

        // 英文版本的下载链接
        const downloadLinksHtmlEn = buildResults.map(result => {
            const browserNameEn = result.browser === 'chrome' ? 'Chrome' : 'Edge';
            return `
                        <div class="download-item">
                            <h3>${browserNameEn} Version</h3>
                            <p>For ${result.browser === 'chrome' ? 'Chrome Browser' : 'Microsoft Edge Browser'}</p>
                            <a href="ADHDGoFly-Plugin-v${version}-${result.browser}.zip" class="download-btn" download>
                                📥 Download ${browserNameEn} Version (${result.size}MB)
                            </a>
                            <div class="version-info">
                                <small>Version: v${version} | Size: ${result.size}MB</small>
                            </div>
                        </div>`;
        }).join('');
            
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
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
    <!-- 语言切换器 -->
    <div class="language-switcher">
        <a href="index.html" class="active">中文</a>
        <a href="index-en.html">English</a>
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
                            <div class="stat-number" id="total-downloads">${downloadCount}</div>
                            <div class="stat-label">总下载量</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="unique-users">${uniqueUsers}</div>
                            <div class="stat-label">用户数量</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="today-downloads">${todayDownloads}</div>
                            <div class="stat-label">今日下载</div>
                        </div>
                    </div>
                    <div class="stats-update-info">
                        <small id="update-time">更新时间: ${lastUpdated || '获取中...'}</small>
                        <div id="api-status" style="margin-top: 5px; font-size: 11px; opacity: 0.8;">
                            🔄 正在连接 API...
                        </div>
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
        const ANALYTICS_API = 'https://adhdgofly-download-tracker.oliver-409.workers.dev/api/track-download';
        const STATS_API = 'https://adhdgofly-download-tracker.oliver-409.workers.dev/api/stats';
        const VERSION = '${version}';
        const LANGUAGE = 'zh';
        
        // 页面加载完成后获取最新统计数据
        document.addEventListener('DOMContentLoaded', function() {
            updateStatsDisplay();
        });
        
        // 监听所有下载按钮
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                // 提取浏览器类型（从按钮的 href）
                const href = this.getAttribute('href');
                const browser = href.includes('chrome') ? 'chrome' : 'edge';
                
                // 发送统计数据
                trackDownload(browser);
                
                // 延迟更新统计显示（给服务器时间处理）
                setTimeout(updateStatsDisplay, 2000);
            });
        });
        
        function trackDownload(browser) {
            const data = {
                version: VERSION,
                browser: browser,
                language: LANGUAGE,
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                timestamp: Date.now()
            };
            
            // 使用 fetch 发送统计数据
            fetch(ANALYTICS_API, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                mode: 'cors',
                credentials: 'omit'
            })
            .then(response => {
                if (response.ok) {
                    console.log('Download tracked successfully');
                } else {
                    console.warn('Download tracking failed:', response.status);
                }
            })
            .catch(err => {
                console.error('Download tracking error:', err);
            });
        }
        
        function updateStatsDisplay() {
            // 添加加载状态
            const statsDisplay = document.querySelector('.stats-display');
            const statusElement = document.getElementById('api-status');
            
            if (statsDisplay) {
                statsDisplay.classList.add('stats-loading');
            }
            
            if (statusElement) {
                statusElement.textContent = '🔄 正在获取最新数据...';
                statusElement.style.color = '#007cba';
            }
            
            // 获取最新统计数据
            fetch(STATS_API + '?t=' + Date.now(), {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-cache'
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to fetch stats');
            })
            .then(data => {
                // 调试信息
                console.log('📊 API 返回数据:', data);
                console.log('📱 设备信息:', navigator.userAgent);
                console.log('🌐 当前 URL:', window.location.href);
                
                // 更新显示的数据
                updateElement('total-downloads', data.totalDownloads || 0);
                updateElement('unique-users', data.uniqueUsers || 0);
                updateElement('today-downloads', data.todayDownloads || 0);
                
                // 更新时间
                const updateTimeElement = document.getElementById('update-time');
                if (updateTimeElement && data.lastUpdated) {
                    const timeText = LANGUAGE === 'zh' ? '更新时间: ' : 'Updated: ';
                    updateTimeElement.textContent = timeText + data.lastUpdated;
                }
                
                // 移除加载状态，添加更新动画
                if (statsDisplay) {
                    statsDisplay.classList.remove('stats-loading');
                    statsDisplay.classList.add('stats-updated');
                    setTimeout(() => {
                        statsDisplay.classList.remove('stats-updated');
                    }, 500);
                }
                
                // 更新状态指示器
                if (statusElement) {
                    statusElement.textContent = '✅ 数据已更新 (' + new Date().toLocaleTimeString() + ')';
                    statusElement.style.color = '#28a745';
                }
                
                // 在页面上显示调试信息（仅开发模式）
                if (window.location.hostname.includes('localhost') || window.location.hostname.includes('pages.dev')) {
                    const debugInfo = document.createElement('div');
                    debugInfo.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.8);color:white;padding:10px;font-size:12px;z-index:9999;border-radius:5px;';
                    debugInfo.innerHTML = '<div>📊 API 数据更新成功</div>' +
                        '<div>总下载: ' + data.totalDownloads + '</div>' +
                        '<div>独立用户: ' + data.uniqueUsers + '</div>' +
                        '<div>今日下载: ' + data.todayDownloads + '</div>' +
                        '<div>更新时间: ' + data.lastUpdated + '</div>';
                    document.body.appendChild(debugInfo);
                    setTimeout(() => debugInfo.remove(), 5000);
                }
                
                console.log('Stats updated successfully');
            })
            .catch(err => {
                console.warn('Failed to update stats:', err);
                // 移除加载状态
                if (statsDisplay) {
                    statsDisplay.classList.remove('stats-loading');
                }
                
                // 更新状态指示器显示错误
                if (statusElement) {
                    statusElement.textContent = '❌ 连接失败: ' + err.message;
                    statusElement.style.color = '#dc3545';
                }
            });
        }
        
        function updateElement(id, value) {
            const element = document.getElementById(id);
            if (element) {
                // 数字动画效果
                const currentValue = parseInt(element.textContent) || 0;
                const targetValue = parseInt(value) || 0;
                
                if (currentValue !== targetValue) {
                    animateNumber(element, currentValue, targetValue, 1000);
                }
            }
        }
        
        function animateNumber(element, start, end, duration) {
            const startTime = performance.now();
            const difference = end - start;
            
            function updateNumber(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // 使用缓动函数
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.round(start + difference * easeProgress);
                
                element.textContent = currentValue;
                
                if (progress < 1) {
                    requestAnimationFrame(updateNumber);
                }
            }
            
            requestAnimationFrame(updateNumber);
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
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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
        <a href="index.html">中文</a>
        <a href="index-en.html" class="active">English</a>
    </div>

    <div class="container">
        <header class="header">
            <div class="header-content">
                <h1>ADHDGoFly</h1>
                <p>Smart Reading Assistant - Make web reading easier and learning more efficient</p>
            </div>
        </header>

        <main class="main-content">
            <section class="features">
                <h2>Core Features</h2>
                <div class="feature-grid">
                    <div class="feature-card">
                        <h3>🎯 Smart POS Tagging</h3>
                        <p>Automatically identify parts of speech in web text, highlighting nouns, verbs, adjectives, etc. with different colors to help understand sentence structure</p>
                    </div>
                    <div class="feature-card">
                        <h3>🌍 Multi-language Support</h3>
                        <p>Support intelligent recognition and processing of multiple languages including Chinese, English, Japanese, French, Spanish, Russian, etc.</p>
                    </div>
                    <div class="feature-card">
                        <h3>⚡ Real-time Processing</h3>
                        <p>Automatically process text when pages load, no manual operation required, providing a smooth reading experience</p>
                    </div>
                    <div class="feature-card">
                        <h3>🎨 Personalized Settings</h3>
                        <p>Customize color schemes and toggle specific features according to personal preferences to adjust reading assistance effects</p>
                    </div>
                    <div class="feature-card">
                        <h3>🔄 Auto Update</h3>
                        <p>Built-in version detection function, automatically remind users to update to the latest version to ensure complete functionality</p>
                    </div>
                    <div class="feature-card">
                        <h3>🚀 Lightweight & Efficient</h3>
                        <p>Optimized algorithm design, low resource consumption, does not affect normal web browsing speed</p>
                    </div>
                </div>
            </section>
            
            <section class="download-section">
                <h2>🎉 New Version Found!</h2>
                <p>Update recommended to get the latest features and fixes</p>
                
                <div class="download-grid">
                    ${downloadLinksHtmlEn}
                </div>
                
                <!-- Download Statistics Display -->
                <div class="stats-display">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number" id="total-downloads">${downloadCount}</div>
                            <div class="stat-label">Total Downloads</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="unique-users">${uniqueUsers}</div>
                            <div class="stat-label">Users</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="today-downloads">${todayDownloads}</div>
                            <div class="stat-label">Today</div>
                        </div>
                    </div>
                    <div class="stats-update-info">
                        <small id="update-time">Updated: ${lastUpdated || 'Loading...'}</small>
                        <div id="api-status" style="margin-top: 5px; font-size: 11px; opacity: 0.8;">
                            🔄 Connecting to API...
                        </div>
                    </div>
                </div>
            </section>
        </main>

        <footer class="footer">
            <p>© 2024 ADHDGoFly Plugin. Designed to enhance reading experience.</p>
            <p>Current Version: v${version} | Compatible with Chrome, Edge and other modern browsers</p>
        </footer>
    </div>
    
    <!-- Download Tracking Code -->
    <script>
    (function() {
        // Analytics configuration
        const ANALYTICS_API = 'https://adhdgofly-download-tracker.oliver-409.workers.dev/api/track-download';
        const STATS_API = 'https://adhdgofly-download-tracker.oliver-409.workers.dev/api/stats';
        const VERSION = '${version}';
        const LANGUAGE = 'en';
        
        // Update stats display when page loads
        document.addEventListener('DOMContentLoaded', function() {
            updateStatsDisplay();
        });
        
        // Listen to all download buttons
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                // Extract browser type from button href
                const href = this.getAttribute('href');
                const browser = href.includes('chrome') ? 'chrome' : 'edge';
                
                // Send tracking data
                trackDownload(browser);
                
                // Delay stats update (give server time to process)
                setTimeout(updateStatsDisplay, 2000);
            });
        });
        
        function trackDownload(browser) {
            const data = {
                version: VERSION,
                browser: browser,
                language: LANGUAGE,
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                timestamp: Date.now()
            };
            
            // Use fetch to send tracking data
            fetch(ANALYTICS_API, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                mode: 'cors',
                credentials: 'omit'
            })
            .then(response => {
                if (response.ok) {
                    console.log('Download tracked successfully');
                } else {
                    console.warn('Download tracking failed:', response.status);
                }
            })
            .catch(err => {
                console.error('Download tracking error:', err);
            });
        }
        
        function updateStatsDisplay() {
            // Add loading state
            const statsDisplay = document.querySelector('.stats-display');
            const statusElement = document.getElementById('api-status');
            
            if (statsDisplay) {
                statsDisplay.classList.add('stats-loading');
            }
            
            if (statusElement) {
                statusElement.textContent = '🔄 Fetching latest data...';
                statusElement.style.color = '#007cba';
            }
            
            // Fetch latest statistics
            fetch(STATS_API + '?t=' + Date.now(), {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-cache'
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to fetch stats');
            })
            .then(data => {
                // Debug information
                console.log('📊 API Response Data:', data);
                console.log('📱 Device Info:', navigator.userAgent);
                console.log('🌐 Current URL:', window.location.href);
                
                // Update displayed data
                updateElement('total-downloads', data.totalDownloads || 0);
                updateElement('unique-users', data.uniqueUsers || 0);
                updateElement('today-downloads', data.todayDownloads || 0);
                
                // Update time
                const updateTimeElement = document.getElementById('update-time');
                if (updateTimeElement && data.lastUpdated) {
                    const timeText = LANGUAGE === 'zh' ? '更新时间: ' : 'Updated: ';
                    updateTimeElement.textContent = timeText + data.lastUpdated;
                }
                
                // Remove loading state, add update animation
                if (statsDisplay) {
                    statsDisplay.classList.remove('stats-loading');
                    statsDisplay.classList.add('stats-updated');
                    setTimeout(() => {
                        statsDisplay.classList.remove('stats-updated');
                    }, 500);
                }
                
                // Update status indicator
                if (statusElement) {
                    statusElement.textContent = '✅ Data updated (' + new Date().toLocaleTimeString() + ')';
                    statusElement.style.color = '#28a745';
                }
                
                // Show debug info on page (development mode only)
                if (window.location.hostname.includes('localhost') || window.location.hostname.includes('pages.dev')) {
                    const debugInfo = document.createElement('div');
                    debugInfo.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.8);color:white;padding:10px;font-size:12px;z-index:9999;border-radius:5px;';
                    debugInfo.innerHTML = '<div>📊 API Data Updated</div>' +
                        '<div>Total: ' + data.totalDownloads + '</div>' +
                        '<div>Users: ' + data.uniqueUsers + '</div>' +
                        '<div>Today: ' + data.todayDownloads + '</div>' +
                        '<div>Updated: ' + data.lastUpdated + '</div>';
                    document.body.appendChild(debugInfo);
                    setTimeout(() => debugInfo.remove(), 5000);
                }
                
                console.log('Stats updated successfully');
            })
            .catch(err => {
                console.warn('Failed to update stats:', err);
                // Remove loading state
                if (statsDisplay) {
                    statsDisplay.classList.remove('stats-loading');
                }
                
                // Update status indicator to show error
                if (statusElement) {
                    statusElement.textContent = '❌ Connection failed: ' + err.message;
                    statusElement.style.color = '#dc3545';
                }
            });
        }
        
        function updateElement(id, value) {
            const element = document.getElementById(id);
            if (element) {
                // Number animation effect
                const currentValue = parseInt(element.textContent) || 0;
                const targetValue = parseInt(value) || 0;
                
                if (currentValue !== targetValue) {
                    animateNumber(element, currentValue, targetValue, 1000);
                }
            }
        }
        
        function animateNumber(element, start, end, duration) {
            const startTime = performance.now();
            const difference = end - start;
            
            function updateNumber(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Use easing function
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.round(start + difference * easeProgress);
                
                element.textContent = currentValue;
                
                if (progress < 1) {
                    requestAnimationFrame(updateNumber);
                }
            }
            
            requestAnimationFrame(updateNumber);
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
function createZipFile(zipName, includeFiles, browserName, tempManifestPath) {
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
                    // 如果是临时manifest文件，重命名为manifest.json
                    const fileName = item === tempManifestPath ? 'manifest.json' : item;
                    archive.file(item, { name: fileName });
                }
            } else {
                console.warn(`⚠️  文件不存在，跳过: ${item}`);
            }
        });

        archive.finalize();
    });
}