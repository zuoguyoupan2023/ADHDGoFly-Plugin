#!/bin/bash

# ADHDGoFly Plugin Workers 统一测试脚本
# 验证 Download Tracker Worker 和 Plugin Analytics Worker 的功能完整性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试结果记录
test_result() {
    local test_name="$1"
    local result="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "✓ $test_name"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "✗ $test_name"
    fi
}

# 健康检查测试
test_health_check() {
    local worker_name="$1"
    local health_url="$2"
    
    log_info "测试 $worker_name 健康检查..."
    
    if [ -z "$health_url" ]; then
        test_result "$worker_name Health Check" "FAIL"
        log_error "健康检查URL未配置"
        return 1
    fi
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$health_url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local content=$(cat /tmp/health_response 2>/dev/null || echo "{}")
        if echo "$content" | jq -e '.status == "ok"' > /dev/null 2>&1; then
            test_result "$worker_name Health Check" "PASS"
        else
            test_result "$worker_name Health Check" "FAIL"
            log_error "健康检查响应格式错误: $content"
        fi
    else
        test_result "$worker_name Health Check" "FAIL"
        log_error "健康检查失败，HTTP状态码: $response"
    fi
    
    rm -f /tmp/health_response
}

# 下载统计测试
test_download_tracking() {
    local worker_url="$1"
    
    log_info "测试下载统计功能..."
    
    if [ -z "$worker_url" ]; then
        test_result "Download Tracking" "FAIL"
        log_error "Download Tracker Worker URL未配置"
        return 1
    fi
    
    local test_data='{
        "version": "1.0.0",
        "browser": "Chrome",
        "language": "zh-CN",
        "userAgent": "Mozilla/5.0 (Test)",
        "referrer": "https://test.com",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "clientIp": "127.0.0.1"
    }'
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/download_response \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$test_data" \
        "$worker_url/api/track-download" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local content=$(cat /tmp/download_response 2>/dev/null || echo "{}")
        if echo "$content" | jq -e '.success == true' > /dev/null 2>&1; then
            test_result "Download Tracking" "PASS"
        else
            test_result "Download Tracking" "FAIL"
            log_error "下载统计响应错误: $content"
        fi
    else
        test_result "Download Tracking" "FAIL"
        log_error "下载统计请求失败，HTTP状态码: $response"
    fi
    
    rm -f /tmp/download_response
}

# 插件埋点测试
test_plugin_analytics() {
    local worker_url="$1"
    
    log_info "测试插件埋点功能..."
    
    if [ -z "$worker_url" ]; then
        test_result "Plugin Analytics" "FAIL"
        log_error "Plugin Analytics Worker URL未配置"
        return 1
    fi
    
    # 测试安装事件
    local install_data='{
        "event_type": "installation",
        "data": {
            "event_type": "install",
            "version": "1.0.0",
            "installed_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
            "user_hash": "test_user_hash",
            "date": "'$(date -u +%Y-%m-%d)'"
        }
    }'
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/analytics_response \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$install_data" \
        "$worker_url/api/plugin-events" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local content=$(cat /tmp/analytics_response 2>/dev/null || echo "{}")
        if echo "$content" | jq -e '.success == true' > /dev/null 2>&1; then
            test_result "Plugin Analytics - Installation" "PASS"
        else
            test_result "Plugin Analytics - Installation" "FAIL"
            log_error "插件埋点响应错误: $content"
        fi
    else
        test_result "Plugin Analytics - Installation" "FAIL"
        log_error "插件埋点请求失败，HTTP状态码: $response"
    fi
    
    rm -f /tmp/analytics_response
}

# 统计查询测试
test_stats_query() {
    local worker_name="$1"
    local worker_url="$2"
    
    log_info "测试 $worker_name 统计查询..."
    
    if [ -z "$worker_url" ]; then
        test_result "$worker_name Stats Query" "FAIL"
        log_error "$worker_name URL未配置"
        return 1
    fi
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/stats_response \
        "$worker_url/api/stats/public" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local content=$(cat /tmp/stats_response 2>/dev/null || echo "{}")
        if echo "$content" | jq -e 'type == "object"' > /dev/null 2>&1; then
            test_result "$worker_name Stats Query" "PASS"
        else
            test_result "$worker_name Stats Query" "FAIL"
            log_error "统计查询响应格式错误: $content"
        fi
    else
        test_result "$worker_name Stats Query" "FAIL"
        log_error "统计查询失败，HTTP状态码: $response"
    fi
    
    rm -f /tmp/stats_response
}

# Vercel API 测试
test_vercel_apis() {
    local vercel_base_url="$1"
    
    if [ -z "$vercel_base_url" ]; then
        log_warning "Vercel API URL未配置，跳过Vercel API测试"
        return 0
    fi
    
    log_info "测试Vercel API层..."
    
    # 测试下载统计API
    local download_data='{
        "action": "download",
        "version": "1.0.0",
        "browser": "Chrome",
        "language": "zh-CN",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    }'
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/vercel_download_response \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$download_data" \
        "$vercel_base_url/api/collect" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        test_result "Vercel Download API" "PASS"
    else
        test_result "Vercel Download API" "FAIL"
        log_error "Vercel下载API失败，HTTP状态码: $response"
    fi
    
    # 测试插件埋点API
    local analytics_data='{
        "event_type": "startup",
        "data": {
            "started_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
            "user_hash": "test_user_hash",
            "version": "1.0.0",
            "date": "'$(date -u +%Y-%m-%d)'"
        }
    }'
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/vercel_analytics_response \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$analytics_data" \
        "$vercel_base_url/api/plugin-analytics" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        test_result "Vercel Analytics API" "PASS"
    else
        test_result "Vercel Analytics API" "FAIL"
        log_error "Vercel埋点API失败，HTTP状态码: $response"
    fi
    
    rm -f /tmp/vercel_download_response /tmp/vercel_analytics_response
}

# 主测试函数
main() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    log_info "ADHDGoFly Plugin Workers 功能测试开始"
    
    # 检查依赖
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装，请先安装 curl"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq 未安装，请运行: brew install jq (macOS) 或 apt-get install jq (Ubuntu)"
        exit 1
    fi
    
    # 从环境变量或参数获取配置
    local download_tracker_url="${DOWNLOAD_TRACKER_WORKER_URL:-$1}"
    local plugin_analytics_url="${PLUGIN_ANALYTICS_WORKER_URL:-$2}"
    local vercel_base_url="${VERCEL_BASE_URL:-$3}"
    
    echo
    log_info "测试配置:"
    log_info "Download Tracker Worker: ${download_tracker_url:-未配置}"
    log_info "Plugin Analytics Worker: ${plugin_analytics_url:-未配置}"
    log_info "Vercel Base URL: ${vercel_base_url:-未配置}"
    echo
    
    # 执行测试
    if [ -n "$download_tracker_url" ]; then
        test_health_check "Download Tracker Worker" "$download_tracker_url/health"
        test_download_tracking "$download_tracker_url"
        test_stats_query "Download Tracker Worker" "$download_tracker_url"
    else
        log_warning "Download Tracker Worker URL未配置，跳过相关测试"
    fi
    
    if [ -n "$plugin_analytics_url" ]; then
        test_health_check "Plugin Analytics Worker" "$plugin_analytics_url/health"
        test_plugin_analytics "$plugin_analytics_url"
        test_stats_query "Plugin Analytics Worker" "$plugin_analytics_url"
    else
        log_warning "Plugin Analytics Worker URL未配置，跳过相关测试"
    fi
    
    if [ -n "$vercel_base_url" ]; then
        test_vercel_apis "$vercel_base_url"
    fi
    
    # 测试总结
    echo
    log_info "测试总结:"
    log_info "总计: $TOTAL_TESTS"
    log_success "通过: $PASSED_TESTS"
    if [ $FAILED_TESTS -gt 0 ]; then
        log_error "失败: $FAILED_TESTS"
    else
        log_info "失败: $FAILED_TESTS"
    fi
    
    echo
    if [ $FAILED_TESTS -eq 0 ] && [ $TOTAL_TESTS -gt 0 ]; then
        log_success "🎉 所有测试通过！双Worker架构运行正常"
    elif [ $TOTAL_TESTS -eq 0 ]; then
        log_warning "⚠️ 未执行任何测试，请检查配置"
    else
        log_error "❌ 部分测试失败，请检查错误信息"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "ADHDGoFly Plugin Workers 统一测试脚本"
    echo
    echo "用法: $0 [download_tracker_url] [plugin_analytics_url] [vercel_base_url]"
    echo
    echo "参数:"
    echo "  download_tracker_url    Download Tracker Worker URL"
    echo "  plugin_analytics_url    Plugin Analytics Worker URL"
    echo "  vercel_base_url         Vercel API 基础URL"
    echo
    echo "环境变量:"
    echo "  DOWNLOAD_TRACKER_WORKER_URL   Download Tracker Worker URL"
    echo "  PLUGIN_ANALYTICS_WORKER_URL   Plugin Analytics Worker URL"
    echo "  VERCEL_BASE_URL               Vercel API 基础URL"
    echo
    echo "示例:"
    echo "  $0"
    echo "  $0 https://download-tracker.workers.dev https://plugin-analytics.workers.dev"
    echo "  DOWNLOAD_TRACKER_WORKER_URL=https://... $0"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -*)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

# 执行主函数
main "$@"