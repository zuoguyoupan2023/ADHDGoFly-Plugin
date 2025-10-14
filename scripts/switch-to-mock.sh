#!/bin/bash

# 快速切换到模拟数据模式的脚本

echo "🔄 切换到模拟数据模式..."

# 备份原始的 update-stats.yml
cp .github/workflows/update-stats.yml .github/workflows/update-stats.yml.backup

# 替换调用的脚本为模拟版本
sed -i.bak 's/node scripts\/fetch-stats\.js/node scripts\/fetch-stats-mock.js/g' .github/workflows/update-stats.yml

echo "✅ 已切换到模拟数据模式"
echo "📝 原始文件已备份为 update-stats.yml.backup"
echo ""
echo "🔄 要恢复真实数据模式，运行："
echo "   cp .github/workflows/update-stats.yml.backup .github/workflows/update-stats.yml"