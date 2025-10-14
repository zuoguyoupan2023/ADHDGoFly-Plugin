#!/bin/bash

# 下载统计诊断脚本

echo "🔍 ADHDGoFly 下载统计诊断"
echo "================================"
echo ""

# 1. 检查 Workers 是否部署
echo "1️⃣ 检查 Workers 部署状态..."
echo ""
wrangler deployments list
echo ""

# 2. 检查远程数据库
echo "2️⃣ 检查远程数据库记录..."
echo ""
wrangler d1 execute adhdgofly_downloads --remote --command="SELECT COUNT(*) as total FROM downloads"
echo ""

# 3. 检查最近的记录
echo "3️⃣ 查看最近的下载记录..."
echo ""
wrangler d1 execute adhdgofly_downloads --remote --command="SELECT * FROM downloads ORDER BY created_at DESC LIMIT 5"
echo ""

# 4. 测试 Workers API
echo "4️⃣ 测试 Workers API..."
echo ""
echo "请输入你的 Workers URL（例如：https://xxx.workers.dev）："
read WORKER_URL

if [ -n "$WORKER_URL" ]; then
    echo ""
    echo "测试健康检查..."
    curl -s "$WORKER_URL/health" | jq '.' || curl -s "$WORKER_URL/health"
    
    echo ""
    echo ""
    echo "测试统计记录..."
    curl -X POST "$WORKER_URL/api/track-download" \
      -H "Content-Type: application/json" \
      -d '{
        "version": "0.1.4",
        "browser": "chrome",
        "language": "zh",
        "userAgent": "Test",
        "referrer": "https://test.com"
      }' | jq '.' || curl -X POST "$WORKER_URL/api/track-download" \
      -H "Content-Type: application/json" \
      -d '{
        "version": "0.1.4",
        "browser": "chrome",
        "language": "zh",
        "userAgent": "Test",
        "referrer": "https://test.com"
      }'
    
    echo ""
    echo ""
    echo "再次检查数据库..."
    wrangler d1 execute adhdgofly_downloads --remote --command="SELECT COUNT(*) as total FROM downloads"
fi

echo ""
echo "================================"
echo "✅ 诊断完成"
