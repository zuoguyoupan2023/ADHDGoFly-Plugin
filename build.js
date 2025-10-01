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
const archiver = require('archiver');

// 检查运行环境 - 移除zip命令依赖
function checkEnvironment() {
    // 不再检查zip命令，使用Node.js原生archiver库
    console.log('✅ 环境检查通过，使用Node.js原生压缩');
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

// 主函数
async function main() {
    console.log('🚀 开始构建 ADHDGoFly 插件发布包 (多浏览器版本)...');
    
    // 检查运行环境
    checkEnvironment();
    
    // 创建public输出目录
    const outputDir = 'public';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log('📁 创建输出目录: public/');
    }
    
    // 检查必要文件
    if (!fs.existsSync('manifest.json')) {
        console.error('❌ 错误: 找不到 manifest.json 文件');
        process.exit(1);
    }
    
    // 读取 manifest.json
    let baseManifest;
    try {
        const manifestContent = fs.readFileSync('manifest.json', 'utf8');
        baseManifest = JSON.parse(manifestContent);
    } catch (error) {
        console.error('❌ 错误: 无法解析 manifest.json 文件:', error.message);
        process.exit(1);
    }
    
    // 提取版本号和项目信息
    const version = baseManifest.version;
    const projectName = 'ADHDGoFly-Plugin';
    
    console.log(`📦 项目名称: ${projectName}`);
     console.log(`🏷️  版本号: ${version}`);
     
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
    'background.js',
    'content.js',
    'popup.html', 
    'popup.js',
    'styles.css',
    'i18n.js',        // 添加
    'settings.js',    // 添加  
    'settings.css',   // 添加
    'content/',
    'dictionaries/',
    'locales/'        // 添加
     ];
     
     // 检查所有必要文件是否存在
     const missingFiles = includeFiles.filter(file => !fs.existsSync(file));
     if (missingFiles.length > 0) {
         console.error('❌ 错误: 缺少必要文件:', missingFiles.join(', '));
         process.exit(1);
     }
     
     // 为每个浏览器构建版本
     const buildResults = [];
     
     for (const [browserName, config] of Object.entries(browserConfigs)) {
         console.log(`\n🌐 构建 ${browserName.toUpperCase()} 版本...`);
         
         // 创建浏览器特定的manifest
         const browserManifest = {
             ...baseManifest,
             ...config.manifestChanges
         };
         
         // 生成临时manifest文件
         const tempManifestPath = `manifest-${browserName}.json`;
         fs.writeFileSync(tempManifestPath, JSON.stringify(browserManifest, null, 2));
         
         // 创建包含文件列表（包含临时manifest）
         const browserIncludeFiles = [
             tempManifestPath,
             ...includeFiles
         ];
         
         // 生成zip文件名（输出到public目录）
         const zipName = path.join(outputDir, `${projectName}-v${version}-${config.suffix}.zip`);
         console.log(`📁 输出文件: ${zipName}`);
         
         try {
             await createZipFile(zipName, browserIncludeFiles, browserName, tempManifestPath);
             
             // 检查文件是否创建成功
             if (!fs.existsSync(zipName)) {
                 throw new Error(`${browserName} ZIP 文件创建失败`);
             }
             
             const stats = fs.statSync(zipName);
             const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);
             
             buildResults.push({
                 browser: browserName,
                 zipName,
                 size: fileSizeMB
             });
             
             console.log(`✅ ${browserName.toUpperCase()} 版本构建完成: ${fileSizeMB}MB`);
             
         } catch (error) {
             console.error(`❌ ${browserName.toUpperCase()} 版本构建失败:`, error.message);
             throw error;
         } finally {
             // 清理临时manifest文件
             if (fs.existsSync(tempManifestPath)) {
                 fs.unlinkSync(tempManifestPath);
             }
         }
     }
     
     // 显示构建总结
     console.log('\n🎉 多浏览器构建完成!');
     buildResults.forEach(result => {
         console.log(`   📦 ${result.browser.toUpperCase()}: ${result.zipName} (${result.size}MB)`);
     });
     
     const totalSize = buildResults.reduce((sum, result) => sum + parseFloat(result.size), 0).toFixed(1);
     console.log(`📊 总大小: ${totalSize}MB`);
     console.log('✅ 多浏览器构建成功！');
       
       // 生成动态的 index.html
        console.log('🔄 生成动态 landing page...');
        try {
            // 生成下载链接HTML - 基于版本号自动匹配
         const downloadLinksHtml = buildResults.map(result => {
             const browserDisplayName = result.browser === 'chrome' ? 'Chrome' : 'Edge';
             const versionedFileName = `${projectName}-v${version}-${result.browser}.zip`;
             return `
                    <div class="download-item">
                        <h3>${browserDisplayName} 版本</h3>
                        <p>版本: v${version} | 大小: ${result.size}MB</p>
                        <a href="./${versionedFileName}" class="download-btn" download>
                            <span class="icon">📦</span>
                            下载 ${browserDisplayName} v${version}
                        </a>
                        <div class="version-info">
                            <small style="color: #333;">文件名: ${versionedFileName}</small>
                        </div>
                    </div>`;
         }).join('');
            
            const indexTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADHDGoFly - 智能阅读助手插件 (多浏览器版本)</title>
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
            margin: 0 auto 30px auto;
        }
        
        .browser-downloads {
            margin-top: 30px;
        }
        
        .download-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .download-item {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .download-item h3 {
            color: white;
            margin-bottom: 10px;
            font-size: 1.2rem;
        }
        
        .download-item p {
             color: rgba(255,255,255,0.8);
             margin-bottom: 15px;
             font-size: 0.9rem;
         }
         
         .version-info {
             margin-top: 10px;
             padding-top: 10px;
             border-top: 1px solid rgba(255,255,255,0.1);
         }
         
         .version-info small {
             color: rgba(255,255,255,0.6);
             font-size: 0.8rem;
             font-family: monospace;
         }
         
         .installation-guide {
             margin-top: 50px;
             padding: 30px;
             background: rgba(255,255,255,0.05);
             border-radius: 20px;
             border: 1px solid rgba(255,255,255,0.1);
         }
         
         .guide-grid {
             display: grid;
             grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
             gap: 30px;
             margin-bottom: 30px;
         }
         
         .guide-item {
             background: rgba(255,255,255,0.08);
             padding: 25px;
             border-radius: 15px;
             border: 1px solid rgba(255,255,255,0.1);
         }
         
         .guide-item h4 {
             color: white;
             margin-bottom: 15px;
             font-size: 1.1rem;
         }
         
         .guide-item ol {
             color: rgba(255,255,255,0.9);
             padding-left: 20px;
             line-height: 1.8;
         }
         
         .guide-item li {
             margin-bottom: 8px;
         }
         
         .guide-item code {
             background: rgba(0,0,0,0.3);
             padding: 2px 6px;
             border-radius: 4px;
             font-family: monospace;
             color: #ffd700;
         }
         
         .tips-section {
             background: rgba(255,215,0,0.1);
             padding: 20px;
             border-radius: 10px;
             border: 1px solid rgba(255,215,0,0.2);
         }
         
         .tips-section ul {
             color: rgba(255,255,255,0.9);
             padding-left: 20px;
             line-height: 1.6;
         }
         
         .tips-section li {
             margin-bottom: 5px;
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
                    <a href="https://github.com/zuoguyoupan2023/ADHDGoFly-Plugin/releases/latest" class="download-btn github" target="_blank">
                        📦 GitHub Release
                    </a>
                    
                </div>
                
                <div class="browser-downloads">
                     <h3 style="color: white; margin: 30px 0 20px 0;">选择适合您浏览器的版本:</h3>
                     <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px; text-align: center;">
                         当前版本: <strong>v${version}</strong> | 发布时间: ${new Date().toLocaleDateString('zh-CN')}
                     </p>
                     <div class="download-grid">
                         ${downloadLinksHtml}
                     </div>
                 </div>
                
                <div class="installation-guide">
                     <h3 style="color: white; margin: 40px 0 20px 0;">📖 安装指南</h3>
                     <div class="guide-grid">
                         <div class="guide-item">
                             <h4>🌐 Chrome 浏览器安装</h4>
                             <ol>
                                 <li>下载对应的 Chrome 版本 zip 文件</li>
                                 <li>解压缩到任意文件夹</li>
                                 <li>打开 Chrome，进入 <code>chrome://extensions/</code></li>
                                 <li>开启右上角的"开发者模式"</li>
                                 <li>点击"加载已解压的扩展程序"</li>
                                 <li>选择解压后的文件夹</li>
                                 <li>插件安装完成！🎉</li>
                             </ol>
                         </div>
                         <div class="guide-item">
                             <h4>🔷 Edge 浏览器安装</h4>
                             <ol>
                                 <li>下载对应的 Edge 版本 zip 文件</li>
                                 <li>解压缩到任意文件夹</li>
                                 <li>打开 Edge，进入 <code>edge://extensions/</code></li>
                                 <li>开启左下角的"开发人员模式"</li>
                                 <li>点击"加载解压缩的扩展"</li>
                                 <li>选择解压后的文件夹</li>
                                 <li>插件安装完成！🎉</li>
                             </ol>
                         </div>
                     </div>
                     <div class="tips-section">
                         <h4 style="color: #ffd700; margin: 20px 0 10px 0;">💡 安装小贴士</h4>
                         <ul>
                             <li>确保下载的版本与您的浏览器匹配</li>
                             <li><strong>⚠️ 重要：解压后请保留文件夹，删除会导致插件失效！</strong></li>
                             <li>首次安装可能需要重启浏览器</li>
                             <li>如遇问题，请检查浏览器版本是否支持 Manifest V3</li>
                         </ul>
                     </div>
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
    
            const indexPath = path.join(outputDir, 'index.html');
            fs.writeFileSync(indexPath, indexTemplate);
            console.log('✅ Landing page 生成完成');
            
        } catch (error) {
            console.error('❌ 生成 landing page 失败:', error.message);
            process.exit(1);
        }
        
        console.log('');
        console.log('🎉 构建完成！可以部署到 Cloudflare Pages 了');
         console.log('📋 部署文件列表:');
         console.log(`   - index.html (多浏览器下载页面)`);
         buildResults.forEach(result => {
             console.log(`   - ${result.zipName} (${result.browser.toUpperCase()} 版本, ${result.size}MB)`);
         });
         console.log('');
         console.log('🚀 Cloudflare Pages 将自动部署这些文件');
         console.log('🌐 用户可以选择下载适合的浏览器版本');
}

// 运行主函数
main().catch(error => {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
});

// Node.js原生压缩函数
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
        
        // 添加文件和目录
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