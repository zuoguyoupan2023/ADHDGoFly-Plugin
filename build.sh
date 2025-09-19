#!/bin/bash

# 自动化构建脚本 - 创建插件发布包
# 从manifest.json中提取项目信息并生成标准化的zip文件

set -e  # 遇到错误时退出

echo "🚀 开始构建 ADHDGoFly 插件发布包..."

# 检查manifest.json是否存在
if [ ! -f "manifest.json" ]; then
    echo "❌ 错误: 找不到 manifest.json 文件"
    exit 1
fi

# 从manifest.json中提取版本号
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/')
if [ -z "$VERSION" ]; then
    echo "❌ 错误: 无法从 manifest.json 中提取版本号"
    exit 1
fi

# 项目名称（简化版，用于文件名）
PROJECT_NAME="ADHDGoFly-Plugin"

# 生成文件名
ZIP_NAME="${PROJECT_NAME}-v${VERSION}.zip"

echo "📦 项目名称: $PROJECT_NAME"
echo "🏷️  版本号: $VERSION"
echo "📁 输出文件: $ZIP_NAME"

# 删除旧的构建文件
rm -f *.zip *.7z
echo "🧹 清理旧的构建文件"

# 创建zip文件，包含所有必要的插件文件
echo "📦 正在打包插件文件..."
zip -r "$ZIP_NAME" \
    manifest.json \
    background.js \
    content.js \
    popup.html \
    popup.js \
    styles.css \
    content/ \
    dictionaries/ \
    -x '*.md' '*.html' 'test*' '.vscode/*' '.git*' 'index.html' 'build.sh' '*.zip' '*.7z'

if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    echo "📁 输出文件: $ZIP_NAME"
    echo "📊 文件大小: $(du -h "$ZIP_NAME" | cut -f1)"
    
    # 更新index.html中的下载链接
    if [ -f "index.html" ]; then
        echo "🔄 更新 landing page 中的下载链接..."
        # 使用sed替换下载链接
        sed -i.bak "s/ADHDGoFly-Plugin\.[^\"]*\.zip/$ZIP_NAME/g" index.html
        sed -i.bak "s/ADHDGoFly-Plugin\.[^\"]*\.7z/$ZIP_NAME/g" index.html
        rm -f index.html.bak
        echo "✅ Landing page 更新完成"
    fi
    
    echo ""
    echo "🎉 构建完成！可以部署到 Cloudflare Pages 了"
    echo "📋 部署文件列表:"
    echo "   - index.html (landing page)"
    echo "   - $ZIP_NAME (插件包)"
else
    echo "❌ 构建失败"
    exit 1
fi