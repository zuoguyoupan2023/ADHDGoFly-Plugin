#!/bin/bash

echo "=== ADHDGoFly 下载统计 ==="
echo ""

echo "📊 总下载量："
npx wrangler d1 execute adhdgofly_downloads --remote \
  --command "SELECT COUNT(*) as total FROM downloads"

echo ""
echo "👥 独立用户数："
npx wrangler d1 execute adhdgofly_downloads --remote \
  --command "SELECT COUNT(DISTINCT ip_hash) as unique_users FROM downloads"

echo ""
echo "📦 版本分布："
npx wrangler d1 execute adhdgofly_downloads --remote \
  --command "SELECT version, COUNT(*) as count FROM downloads GROUP BY version ORDER BY count DESC"

echo ""
echo "🌐 浏览器分布："
npx wrangler d1 execute adhdgofly_downloads --remote \
  --command "SELECT browser, COUNT(*) as count FROM downloads GROUP BY browser ORDER BY count DESC"

echo ""
echo "🗣️ 语言分布："
npx wrangler d1 execute adhdgofly_downloads --remote \
  --command "SELECT language, COUNT(*) as count FROM downloads GROUP BY language ORDER BY count DESC"

echo ""
echo "📅 最近 7 天趋势："
npx wrangler d1 execute adhdgofly_downloads --remote \
  --command "SELECT date, COUNT(*) as count FROM downloads WHERE date >= date('now', '-7 days') GROUP BY date ORDER BY date DESC"
