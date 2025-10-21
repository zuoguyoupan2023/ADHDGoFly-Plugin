#!/bin/bash

# ADHDGoFly Plugin Analytics Worker 测试脚本
# 用于测试插件埋点数据收集与分析服务的各项功能

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

# 默认配置
WORKER_URL="https://adhdgofly-plugin-analytics.your-subdomain.workers.dev"
AUTH_TOKEN=""
VERBOSE=false

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 执行HTTP请求并检查结果
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=${4:-200}
    local description=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log_info "测试: $description"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ -n "$AUTH_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi
    
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$WORKER_URL$endpoint'"
    
    if [ "$VERBOSE" = true ]; then
        log_info "执行命令: $curl_cmd"
    fi
    
    local response=$(eval $curl_cmd)
    local status_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "✓ 状态码: $status_code (预期: $expected_status)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        if [ "$VERBOSE" = true ] && [ -n "$body" ]; then
            echo "响应内容:"
            if command -v jq &> /dev/null; then
                echo "$body" | jq .
            else
                echo "$body"
            fi
        fi
        
        return 0
    else
        log_error "✗ 状态码: $status_code (预期: $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        
        if [ -n "$body" ]; then
            echo "响应内容: $body"
        fi
        
        return 1
    fi
}

# 测试健康检查
test_health_check() {
    echo ""
    log_info "=== 测试健康检查 ==="
    
    make_request "GET" "/health" "" "200" "健康检查端点"
    make_request "GET" "/" "" "200" "根路径健康检查"
}

# 测试插件事件收集
test_plugin_events() {
    echo ""
    log_info "=== 测试插件事件收集 ==="
    
    # 测试安装事件
    local install_data='{
        "event_type": "installation",
        "plugin_version": "1.0.0",
        "browser": "chrome",
        "browser_version": "120.0.0",
        "language": "zh-CN",
        "timestamp": '$(date +%s000)'
    }'
    
    make_request "POST" "/api/plugin-events" "$install_data" "200" "插件安装事件"
    
    # 测试启动事件
    local startup_data='{
        "event_type": "startup",
        "plugin_version": "1.0.0",
        "browser": "chrome",
        "browser_version": "120.0.0",
        "language": "zh-CN",
        "timestamp": '$(date +%s000)'
    }'
    
    make_request "POST" "/api/plugin-events" "$startup_data" "200" "插件启动事件"
    
    # 测试标签页启动事件
    local tab_startup_data='{
        "event_type": "tab_startup",
        "plugin_version": "1.0.0",
        "browser": "chrome",
        "browser_version": "120.0.0",
        "language": "zh-CN",
        "timestamp": '$(date +%s000)'
    }'
    
    make_request "POST" "/api/plugin-events" "$tab_startup_data" "200" "标签页启动事件"
    
    # 测试无效事件类型
    local invalid_data='{
        "event_type": "invalid_event",
        "plugin_version": "1.0.0",
        "timestamp": '$(date +%s000)'
    }'
    
    make_request "POST" "/api/plugin-events" "$invalid_data" "400" "无效事件类型 (应该失败)"
    
    # 测试缺少必需字段
    local missing_data='{
        "plugin_version": "1.0.0"
    }'
    
    make_request "POST" "/api/plugin-events" "$missing_data" "400" "缺少必需字段 (应该失败)"
    
    # 测试GET方法 (应该失败)
    make_request "GET" "/api/plugin-events" "" "405" "GET方法 (应该失败)"
}

# 测试统计查询
test_statistics() {
    echo ""
    log_info "=== 测试统计查询 ==="
    
    # 等待数据处理
    log_info "等待数据处理..."
    sleep 2
    
    # 测试安装统计
    make_request "GET" "/api/stats/installations" "" "200" "安装统计查询"
    make_request "GET" "/api/stats/installations?days=7" "" "200" "7天安装统计"
    make_request "GET" "/api/stats/installations?version=1.0.0" "" "200" "特定版本安装统计"
    make_request "GET" "/api/stats/installations?browser=chrome" "" "200" "特定浏览器安装统计"
    
    # 测试使用统计
    make_request "GET" "/api/stats/usage" "" "200" "使用统计查询"
    make_request "GET" "/api/stats/usage?event_type=startup" "" "200" "启动事件统计"
    make_request "GET" "/api/stats/usage?days=30" "" "200" "30天使用统计"
    
    # 测试统计摘要
    make_request "GET" "/api/stats/summary" "" "200" "统计摘要查询"
    
    # 测试用户会话
    make_request "GET" "/api/sessions" "" "200" "用户会话查询"
    make_request "GET" "/api/sessions?days=1" "" "200" "1天用户会话"
    make_request "GET" "/api/sessions?limit=50" "" "200" "限制50条会话记录"
}

# 测试CORS
test_cors() {
    echo ""
    log_info "=== 测试CORS ==="
    
    # 测试OPTIONS请求
    local cors_response=$(curl -s -w '%{http_code}' -X OPTIONS \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        "$WORKER_URL/api/plugin-events")
    
    local cors_status="${cors_response: -3}"
    
    if [ "$cors_status" = "200" ]; then
        log_success "✓ CORS预检请求成功"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log_error "✗ CORS预检请求失败: $cors_status"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# 测试错误处理
test_error_handling() {
    echo ""
    log_info "=== 测试错误处理 ==="
    
    # 测试不存在的端点
    make_request "GET" "/api/nonexistent" "" "404" "不存在的端点"
    
    # 测试无效JSON
    local invalid_json='{"invalid": json}'
    make_request "POST" "/api/plugin-events" "$invalid_json" "400" "无效JSON格式"
    
    # 测试空请求体
    make_request "POST" "/api/plugin-events" "" "400" "空请求体"
}

# 性能测试
test_performance() {
    echo ""
    log_info "=== 性能测试 ==="
    
    local start_time=$(date +%s%N)
    
    # 发送多个请求
    for i in {1..5}; do
        local event_data='{
            "event_type": "startup",
            "plugin_version": "1.0.0",
            "browser": "chrome",
            "timestamp": '$(date +%s000)'
        }'
        
        make_request "POST" "/api/plugin-events" "$event_data" "200" "性能测试请求 $i" > /dev/null
    done
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    log_info "5个请求总耗时: ${duration}ms"
    log_info "平均响应时间: $((duration / 5))ms"
}

# 显示测试结果
show_test_results() {
    echo ""
    log_info "=== 测试结果摘要 ==="
    echo ""
    echo "总测试数: $TOTAL_TESTS"
    echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "失败: ${RED}$FAILED_TESTS${NC}"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "🎉 所有测试通过！"
        echo ""
        echo "Plugin Analytics Worker 运行正常，可以开始使用。"
    else
        log_error "❌ 有 $FAILED_TESTS 个测试失败"
        echo ""
        echo "请检查Worker配置和部署状态。"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "ADHDGoFly Plugin Analytics Worker 测试脚本"
    echo ""
    echo "用法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -u, --url URL        Worker URL (默认: $WORKER_URL)"
    echo "  -t, --token TOKEN    认证令牌"
    echo "  -v, --verbose        详细输出"
    echo "  -h, --help           显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                                    # 使用默认配置测试"
    echo "  $0 -u https://your-worker.workers.dev # 指定Worker URL"
    echo "  $0 -t your-auth-token                 # 使用认证令牌"
    echo "  $0 -v                                 # 详细输出模式"
    echo ""
}

# 主函数
main() {
    echo ""
    log_info "=== ADHDGoFly Plugin Analytics Worker 测试开始 ==="
    echo ""
    log_info "Worker URL: $WORKER_URL"
    
    if [ -n "$AUTH_TOKEN" ]; then
        log_info "使用认证令牌: ${AUTH_TOKEN:0:10}..."
    else
        log_warning "未设置认证令牌"
    fi
    
    # 检查依赖
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装，请先安装curl"
        exit 1
    fi
    
    # 执行测试
    test_health_check
    test_plugin_events
    test_statistics
    test_cors
    test_error_handling
    
    if [ "$VERBOSE" = true ]; then
        test_performance
    fi
    
    show_test_results
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            WORKER_URL="$2"
            shift 2
            ;;
        -t|--token)
            AUTH_TOKEN="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 运行主函数
main