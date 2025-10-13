#!/bin/bash

echo "🔍 查找 Workers URL..."
echo ""

# 方法 1：从部署信息中查找
echo "方法 1：检查最近的部署..."
wrangler deployments list 2>&1 | head -20

echo ""
echo "================================"
echo ""

# 方法 2：尝试部署并获取 URL
echo "方法 2：重新部署以获取 URL..."
echo "这会重新部署 Workers，是否继续？(y/n)"
read -r response

if [ "$response" = "y" ]; then
    wrangler deploy
fi

echo ""
echo "================================"
echo ""
echo "💡 提示："
echo "1. Workers URL 格式通常是："
echo "   https://adhdgofly-download-tracker.YOUR-SUBDOMAIN.workers.dev"
echo ""
echo "2. 你也可以在 Cloudflare Dashboard 查看："
echo "   https://dash.cloudflare.com/ → Workers & Pages → adhdgofly-download-tracker"
echo ""
echo "3. 找到 URL 后，更新 build.js 中的两处 ANALYTICS_API"
