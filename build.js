#!/usr/bin/env node

/**
 * ADHDGoFly Plugin 自动化构建脚本
 * 适用于 Cloudflare Pages 部署环境
 * 从 manifest.json 提取版本信息，生成标准化的插件包
 * 
 * 环境要求:
 * - Node.js 14+ (Cloudflare Pages 默认提供)
 * - zip 命令 (系统自带)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 检查运行环境
function checkEnvironment() {
    try {
        execSync('zip --version', { stdio: 'pipe' });
    } catch (error) {
        console.error('❌ 错误: 系统缺少 zip 命令');
        console.error('💡 解决方案: 请安装 zip 工具或在支持的环境中运行');
        process.exit(1);
    }
}

console.log('🚀 开始构建 ADHDGoFly 插件发布包...');

// 检查运行环境
checkEnvironment();

// 检查必要文件
if (!fs.existsSync('manifest.json')) {
    console.error('❌ 错误: 找不到 manifest.json 文件');
    process.exit(1);
}

// 读取 manifest.json
let manifest;
try {
    const manifestContent = fs.readFileSync('manifest.json', 'utf8');
    manifest = JSON.parse(manifestContent);
} catch (error) {
    console.error('❌ 错误: 无法解析 manifest.json 文件:', error.message);
    process.exit(1);
}

// 提取版本号和项目信息
const version = manifest.version;
const projectName = 'ADHDGoFly-Plugin';
const zipName = `${projectName}-v${version}.zip`;

console.log(`📦 项目名称: ${projectName}`);
console.log(`🏷️  版本号: ${version}`);
console.log(`📁 输出文件: ${zipName}`);

// 清理旧的构建文件
try {
    const oldFiles = fs.readdirSync('.').filter(file => 
        file.endsWith('.zip') || file.endsWith('.7z')
    );
    oldFiles.forEach(file => {
        fs.unlinkSync(file);
        console.log(`🧹 删除旧文件: ${file}`);
    });
} catch (error) {
    console.log('🧹 清理旧文件 (无旧文件)');
}

// 定义要包含的文件和目录
const includeFiles = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'styles.css',
    'content/',
    'dictionaries/'
];

// 检查所有必要文件是否存在
const missingFiles = includeFiles.filter(file => !fs.existsSync(file));
if (missingFiles.length > 0) {
    console.error('❌ 错误: 缺少必要文件:', missingFiles.join(', '));
    process.exit(1);
}

// 创建 zip 文件
console.log('📦 正在打包插件文件...');
try {
    // 构建 zip 命令
    const zipCommand = `zip -r "${zipName}" ${includeFiles.join(' ')} -x '*.md' '*.html' 'test*' '.vscode/*' '.git*' 'index.html' 'build.sh' 'build.js' '*.zip' '*.7z' 'package.json' 'node_modules/*'`;
    
    execSync(zipCommand, { stdio: 'pipe' });
    
    // 检查文件是否创建成功
    if (!fs.existsSync(zipName)) {
        throw new Error('ZIP 文件创建失败');
    }
    
    const stats = fs.statSync(zipName);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    
    console.log('✅ 构建成功！');
    console.log(`📁 输出文件: ${zipName}`);
    console.log(`📊 文件大小: ${fileSizeMB}MB`);
    
} catch (error) {
    console.error('❌ 打包失败:', error.message);
    process.exit(1);
}

// 生成动态的 index.html
console.log('🔄 生成动态 landing page...');
try {
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
            margin-bottom: 30px;
        }
        
        .features {
            padding: 60px 40px;
        }
        
        .features h2 {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 50px;
            color: #333;
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
        
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 20px;
        }
        
        .feature-card h3 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            color: #667eea;
        }
        
        .feature-card p {
            color: #666;
            line-height: 1.6;
        }
        
        .download-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 60px 40px;
            text-align: center;
        }
        
        .download-section h2 {
            color: white;
            font-size: 2.5rem;
            margin-bottom: 30px;
        }
        
        .download-section p {
            color: white;
            opacity: 0.9;
            font-size: 1.2rem;
            margin-bottom: 40px;
        }
        
        .download-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .download-btn {
            display: inline-block;
            padding: 15px 30px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .download-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        
        .download-btn.github {
            background: #24292e;
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
                <p>选择适合您的下载方式，开始更智能的阅读体验</p>
                
                <div class="download-options">
                    <a href="https://github.com/burenweiye/ADHDGoFly-Plugin/releases/latest" class="download-btn github" target="_blank">
                        📦 GitHub Release
                    </a>
                    <a href="#" class="download-btn baidu" onclick="alert('百度网盘链接：\\n链接: https://pan.baidu.com/s/example\\n提取码: abcd')">
                        ☁️ 百度网盘下载
                    </a>
                    <a href="./${zipName}" class="download-btn direct" download>
                        ⬇️ 直接下载 (ZIP)
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
    
    fs.writeFileSync('index.html', indexTemplate);
    console.log('✅ Landing page 生成完成');
    
} catch (error) {
    console.error('❌ 生成 landing page 失败:', error.message);
    process.exit(1);
}

console.log('');
console.log('🎉 构建完成！可以部署到 Cloudflare Pages 了');
console.log('📋 部署文件列表:');
console.log(`   - index.html (landing page)`);
console.log(`   - ${zipName} (插件包)`);
console.log('');
console.log('🚀 Cloudflare Pages 将自动部署这些文件');