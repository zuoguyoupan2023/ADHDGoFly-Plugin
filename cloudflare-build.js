#!/usr/bin/env node

/**
 * Cloudflare Pages 构建脚本
 * 基于 build.js，但针对 Cloudflare Pages 环境进行了优化
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 环境检查
function checkEnvironment() {
    console.log('🔍 检查 Cloudflare Pages 构建环境...');
    
    if (!fs.existsSync('manifest.json')) {
        console.error('❌ 未找到 manifest.json 文件');
        process.exit(1);
    }
    
    console.log('✅ 环境检查通过');
}

// 浏览器配置
const browsers = {
    chrome: {
        name: 'Chrome',
        manifestVersion: 3,
        zipName: 'ADHDGoFly-Plugin-Chrome-v{version}.zip'
    },
    firefox: {
        name: 'Firefox', 
        manifestVersion: 2,
        zipName: 'ADHDGoFly-Plugin-Firefox-v{version}.zip'
    }
};

async function main() {
    try {
        checkEnvironment();
        
        // 创建输出目录
        const outputDir = 'public';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 读取版本信息
        const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
        const version = manifest.version;
        
        console.log(`📦 开始构建 ADHDGoFly Plugin v${version} for Cloudflare Pages`);
        
        // 清理旧文件
        const files = fs.readdirSync(outputDir);
        files.forEach(file => {
            if (file.endsWith('.zip')) {
                fs.unlinkSync(path.join(outputDir, file));
            }
        });
        
        // 需要包含的文件
        const includeFiles = [
            'manifest.json',
            'background.js',
            'content.js',
            'popup.html',
            'popup.js',
            'styles.css',
            'settings.js',
            'settings.css',
            'content/',
            'dictionaries/'
        ];
        
        // 检查必要文件
        console.log('🔍 检查必要文件...');
        for (const file of includeFiles) {
            if (!fs.existsSync(file)) {
                console.error(`❌ 缺少必要文件: ${file}`);
                process.exit(1);
            }
        }
        
        const buildResults = [];
        
        // 为每个浏览器构建
        for (const [browserKey, browserConfig] of Object.entries(browsers)) {
            console.log(`\n🔨 构建 ${browserConfig.name} 版本...`);
            
            const zipName = browserConfig.zipName.replace('{version}', version);
            const zipPath = path.join(outputDir, zipName);
            
            await createZipFile(zipPath, includeFiles, browserConfig, version);
            
            const stats = fs.statSync(zipPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            
            buildResults.push({
                browser: browserConfig.name,
                file: zipName,
                size: sizeKB
            });
            
            console.log(`✅ ${browserConfig.name} 构建完成: ${zipName} (${sizeKB} KB)`);
        }
        
        // 输出构建结果
        console.log('\n📊 构建结果:');
        let totalSize = 0;
        buildResults.forEach(result => {
            console.log(`   ${result.browser}: ${result.file} (${result.size} KB)`);
            totalSize += parseFloat(result.size);
        });
        console.log(`   总大小: ${totalSize.toFixed(2)} KB`);
        
        // 生成动态 index.html (Landing Page)
        console.log('\n🌐 生成 Landing Page...');
        
        const downloadLinksHtml = buildResults.map(result => 
            `<a href="./${result.file}" class="download-btn ${result.browser.toLowerCase()}" download>
                ⬇️ 下载 ${result.browser} 版本 (${result.size} KB)
            </a>`
        ).join('\n                    ');
        
        const indexTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADHDGoFly - 智能阅读助手插件</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 50px;
            padding: 50px 0;
        }
        
        .header h1 {
            font-size: 3.5rem;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.3rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .main-content {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .features {
            padding: 60px 40px;
            text-align: center;
        }
        
        .features h2 {
            font-size: 2.5rem;
            margin-bottom: 40px;
            color: #333;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }
        
        .feature-card {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 20px;
        }
        
        .feature-card h3 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #333;
        }
        
        .feature-card p {
            color: #666;
            line-height: 1.6;
        }
        
        .download-section {
            background: #f8f9fa;
            padding: 60px 40px;
            text-align: center;
        }
        
        .download-section h2 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            color: #333;
        }
        
        .download-section p {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 40px;
        }
        
        .download-options {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 30px;
        }
        
        .download-btn {
            display: inline-block;
            padding: 15px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            min-width: 200px;
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .download-btn.chrome {
            background: #4285f4;
            color: white;
        }
        
        .download-btn.firefox {
            background: #ff9500;
            color: white;
        }
        
        .download-btn.github {
            background: #333;
            color: white;
        }
        
        .download-btn.baidu {
            background: #2932e1;
            color: white;
        }
        
        .download-btn.direct {
            background: #28a745;
            color: white;
        }
        
        .tips-section {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
            text-align: center;
        }
        
        .tips-section p {
            color: #856404;
            margin: 0;
        }
        
        .version-info {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #eee;
        }
        
        .version-info p {
            color: #666;
            margin-bottom: 10px;
        }
        
        .contact-info {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
            text-align: center;
        }
        
        .contact-info p {
            color: #856404;
            margin: 0;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2.5rem;
            }
            
            .features, .download-section {
                padding: 40px 20px;
            }
            
            .feature-grid {
                grid-template-columns: 1fr;
            }
            
            .download-options {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>ADHDGoFly</h1>
            <p>智能阅读助手 - 让网页阅读更轻松，让学习更高效</p>
        </header>
        
        <main class="main-content">
            <section class="features">
                <h2>核心功能</h2>
                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-icon">🎯</div>
                        <h3>智能词性标注</h3>
                        <p>自动识别网页文本中的词性，用不同颜色高亮显示名词、动词、形容词等，帮助理解句子结构</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🌍</div>
                        <h3>多语言支持</h3>
                        <p>支持中文、英文、日文、法文、西班牙文、俄文等多种语言的智能识别和处理</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">⚡</div>
                        <h3>实时处理</h3>
                        <p>页面加载时自动处理文本，无需手动操作，提供流畅的阅读体验</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🎨</div>
                        <h3>个性化设置</h3>
                        <p>可自定义颜色方案、开关特定功能，根据个人喜好调整阅读辅助效果</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔄</div>
                        <h3>自动更新</h3>
                        <p>内置版本检测功能，自动提醒用户更新到最新版本，确保功能完善</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🚀</div>
                        <h3>轻量高效</h3>
                        <p>优化的算法设计，占用资源少，不影响网页正常浏览速度</p>
                    </div>
                </div>
            </section>
            
            <section class="download-section">
                <h2>立即下载</h2>
                <p>选择适合您浏览器的版本，开始更智能的阅读体验</p>
                
                <div class="download-options">
                    ${downloadLinksHtml}
                    <a href="https://github.com/burenweiye/ADHDGoFly-Plugin/releases/latest" class="download-btn github" target="_blank">
                        📦 GitHub Release
                    </a>
                    <a href="#" class="download-btn baidu" onclick="alert('百度网盘链接：\\n链接: https://pan.baidu.com/s/example\\n提取码: abcd')">
                        ☁️ 百度网盘下载
                    </a>
                </div>
                
                <div class="contact-info">
                    <p>如果下载链接都不可用，请联系 WeChat: zuoguyoupan2023</p>
                </div>
            </section>
        </main>
        
        <footer class="version-info">
            <p><strong>当前版本:</strong> v${version}</p>
            <p>适用于 Chrome、Edge、Firefox 等现代浏览器</p>
            <p>© 2024 ADHDGoFly Plugin. 专为提升阅读体验而设计。</p>
        </footer>
    </div>
</body>
</html>`;
        
        // 写入 index.html
        fs.writeFileSync(path.join(outputDir, 'index.html'), indexTemplate);
        console.log('✅ Landing Page 生成完成: public/index.html');
        
        console.log('\n🎉 Cloudflare Pages 构建完成!');
        console.log('📁 输出目录: public/');
        console.log('🌐 Landing Page: public/index.html');
        console.log('📦 插件包:');
        buildResults.forEach(result => {
            console.log(`   - public/${result.file}`);
        });
        
    } catch (error) {
        console.error('❌ 构建失败:', error.message);
        process.exit(1);
    }
}

// 创建 ZIP 文件
async function createZipFile(zipPath, includeFiles, browserConfig, version) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        
        output.on('close', () => {
            resolve();
        });
        
        archive.on('error', (err) => {
            reject(err);
        });
        
        archive.pipe(output);
        
        // 添加文件到压缩包
        includeFiles.forEach(file => {
            if (fs.statSync(file).isDirectory()) {
                archive.directory(file, file);
            } else {
                archive.file(file, { name: file });
            }
        });
        
        archive.finalize();
    });
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { main, createZipFile };