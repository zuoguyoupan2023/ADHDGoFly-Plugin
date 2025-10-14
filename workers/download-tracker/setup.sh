#!/bin/bash

# ADHDGoFly 下载统计服务快速设置脚本
# 使用方法：chmod +x setup.sh && ./setup.sh

set -e

echo "🚀 ADHDGoFly 下载统计服务 - 快速设置"
echo "========================================"
echo ""

# 检查 wrangler 是否已安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

echo "✅ Wrangler CLI 已安装"
echo ""

# 检查是否已登录
echo "📝 检查 Cloudflare 登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo "请先登录 Cloudflare:"
    wrangler login
fi

echo "✅ 已登录 Cloudflare"
echo ""

# 创建 D1 数据库
echo "📦 创建 D1 数据库..."
echo "请记录返回的 database_id，稍后需要用到"
echo ""
wrangler d1 create adhdgofly_downloads

echo ""
echo "⚠️  重要：请将上面返回的 database_id 复制到 wrangler.toml 文件中"
echo "按 Enter 继续..."
read

# 生成管理员 Token
echo ""
echo "🔐 生成管理员 Token..."
TOKEN=$(openssl rand -hex 32)
echo "生成的 Token: $TOKEN"
echo ""
echo "⚠️  重要：请将此 Token 保存到 wrangler.toml 的 ADMIN_TOKEN 变量中"
echo "按 Enter 继续..."
read

# 初始化数据库
echo ""
echo "🗄️  初始化数据库表结构..."
wrangler d1 execute adhdgofly_downloads --file=schema.sql

echo ""
echo "✅ 数据库表创建成功"
echo ""

# 验证表
echo "🔍 验证数据库表..."
wrangler d1 execute adhdgofly_downloads --command="SELECT name FROM sqlite_master WHERE type='table'"

echo ""
echo "✅ 设置完成！"
echo ""
echo "下一步："
echo "1. 编辑 wrangler.toml，填入 database_id 和 ADMIN_TOKEN"
echo "2. 运行 'wrangler deploy' 部署到 Cloudflare"
echo "3. 记录返回的 Workers URL"
echo "4. 更新项目根目录的 build.js 中的 ANALYTICS_API"
echo ""
echo "详细说明请查看 DEPLOYMENT.md"
