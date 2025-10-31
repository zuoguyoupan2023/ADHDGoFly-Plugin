#!/bin/bash

# ADHDGoFly 插件截图工具
# 用于生成符合Edge扩展商店要求的精确尺寸截图

echo "🎯 ADHDGoFly 截图工具"
echo "📐 将生成 1280x800 像素的截图"
echo ""

# 检查是否安装了必要工具
if ! command -v screencapture &> /dev/null; then
    echo "❌ screencapture 命令不可用"
    exit 1
fi

if ! command -v sips &> /dev/null; then
    echo "❌ sips 命令不可用"
    exit 1
fi

# 创建输出目录
mkdir -p public/screenshots

echo "📸 请在5秒后准备截图..."
echo "⏰ 倒计时: 5..."
sleep 1
echo "⏰ 倒计时: 4..."
sleep 1
echo "⏰ 倒计时: 3..."
sleep 1
echo "⏰ 倒计时: 2..."
sleep 1
echo "⏰ 倒计时: 1..."
sleep 1

# 生成时间戳
timestamp=$(date +"%Y%m%d_%H%M%S")
temp_file="public/screenshots/temp_${timestamp}.png"
final_file="public/screenshots/screenshot_1280x800_${timestamp}.png"

echo "📷 开始截图..."

# 截取屏幕（用户需要手动选择区域）
screencapture -i "$temp_file"

# 检查截图是否成功
if [ ! -f "$temp_file" ]; then
    echo "❌ 截图取消或失败"
    exit 1
fi

echo "🔧 调整尺寸到 1280x800..."

# 调整到精确尺寸
sips -z 800 1280 "$temp_file" --out "$final_file"

# 删除临时文件
rm "$temp_file"

# 验证最终尺寸
echo "✅ 截图完成！"
echo "📁 文件位置: $final_file"
echo "📐 验证尺寸:"
sips -g pixelWidth -g pixelHeight "$final_file"

echo ""
echo "🎉 截图已保存，可以直接用于Edge扩展商店！"