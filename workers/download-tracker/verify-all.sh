#!/bin/bash

echo "🔍 完整验证脚本"
echo "================"
echo ""

WORKER_URL="https://adhdgofly-download-tracker.oliver-409.workers.dev"

echo "1️⃣ 测试健康检查..."
HEALTH=$(curl -s "$WORKER_URL/health")
echo "   响应: $HEALTH"
echo ""

echo "2️⃣ 测试统计 API..."
TRACK=$(curl -s -X POST "$WORKER_URL/api/track-download" \
  -H "Content-Type: application/json" \
  -d '{"version":"0.1.4","browser":"edge","language":"en","userAgent":"VerifyScript","referrer":"https://verify.test"}')
echo "   响应: $TRACK"
echo ""

echo "3️⃣ 查询数据库记录数..."
echo ""
wrangler d1 execute adhdgofly_downloads --remote --command="SELECT COUNT(*) as total FROM downloads"
echo ""

echo "4️⃣ 查看最近 3 条记录..."
echo ""
wrangler d1 execute adhdgofly_downloads --remote --command="SELECT id, version, browser, language, country, date FROM downloads ORDER BY created_at DESC LIMIT 3"
echo ""

echo "5️⃣ 按浏览器统计..."
echo ""
wrangler d1 execute adhdgofly_downloads --remote --command="SELECT browser, COUNT(*) as count FROM downloads GROUP BY browser"
echo ""

echo "6️⃣ 按语言统计..."
echo ""
wrangler d1 execute adhdgofly_downloads --remote --command="SELECT language, COUNT(*) as count FROM downloads GROUP BY language"
echo ""

echo "✅ 验证完成！"
echo ""
echo "💡 提示："
echo "- 如果所有测试都通过，说明 Workers 和数据库都正常工作"
echo "- 现在可以在浏览器中测试前端下载页面了"
echo "- 访问你的网站，点击下载按钮，然后再次运行此脚本查看新记录"
