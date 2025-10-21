#!/bin/bash

# ADHDGoFly Plugin Analytics Worker 功能测试脚本
# 用于测试 plugin-analytics Worker 的各项功能

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
WORKER_URL="${WORKER_URL:-https://plugin-analytics.your-subdomain.workers.dev}"
ADMIN_TOKEN="${ADMIN_TOKEN:-your-admin-token}"

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

# 生成测试数据
generate_test_data() {
    local user_hash=$(echo "test-user-$(date +%s)" | sha256sum | cut -d' ' -f1)
    local domain_hash=$(echo "example.com" | sha256sum | cut -d' ' -f1)
    local date=$(date +%Y-%m-%d)
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
    
    echo "$user_hash,$domain_hash,$date,$timestamp"
}

# 测试健康检查
test_health_check() {
    log_info "测试健康检查..."
    
    response=$(curl -s -w "%{http_code}" "$WORKER_URL/health" -o /tmp/health_test.json)
    
    if [ "$response" = "200" ]; then
        log_success "健康检查通过"
        echo "响应内容:"
        cat /tmp/health_test.json | jq . 2>/dev/null || cat /tmp/health_test.json
    else
        log_error "健康检查失败，HTTP 状态码: $response"
        cat /tmp/health_test.json 2>/dev/null || echo "无响应内容"
        return 1
    fi
    
    rm -f /tmp/health_test.json
    echo ""
}

# 测试插件安装事件
test_installation_event() {
    log_info "测试插件安装事件..."
    
    local test_data=$(generate_test_data)
    local user_hash=$(echo "$test_data" | cut -d',' -f1)
    local date=$(echo "$test_data" | cut -d',' -f3)
    local timestamp=$(echo "$test_data" | cut -d',' -f4)
    
    local payload=$(cat <<EOF
{
  "event_type": "installation",
  "data": {
    "event_type": "install",
    "version": "1.0.0",
    "previous_version": null,
    "installed_at": "$timestamp",
    "user_hash": "$user_hash",
    "date": "$date"
  },
  "metadata": {
    "request_id": "test-install-$(date +%s)",
    "version": "1.0.0"
  }
}
EOF
)
    
    response=$(curl -s -w "%{http_code}" -X POST "$WORKER_URL/api/plugin-events" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        -o /tmp/install_test.json)
    
    if [ "$response" = "200" ]; then
        log_success "插件安装事件测试通过"
        echo "响应内容:"
        cat /tmp/install_test.json | jq . 2>/dev/null || cat /tmp/install_test.json
    else
        log_error "插件安装事件测试失败，HTTP 状态码: $response"
        cat /tmp/install_test.json 2>/dev/null || echo "无响应内容"
        return 1
    fi
    
    rm -f /tmp/install_test.json
    echo ""
}

# 测试插件启动事件
test_startup_event() {
    log_info "测试插件启动事件..."
    
    local test_data=$(generate_test_data)
    local user_hash=$(echo "$test_data" | cut -d',' -f1)
    local date=$(echo "$test_data" | cut -d',' -f3)
    local timestamp=$(echo "$test_data" | cut -d',' -f4)
    
    local payload=$(cat <<EOF
{
  "event_type": "startup",
  "data": {
    "started_at": "$timestamp",
    "user_hash": "$user_hash",
    "version": "1.0.0",
    "date": "$date"
  },
  "metadata": {
    "request_id": "test-startup-$(date +%s)",
    "version": "1.0.0"
  }
}
EOF
)
    
    response=$(curl -s -w "%{http_code}" -X POST "$WORKER_URL/api/plugin-events" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        -o /tmp/startup_test.json)
    
    if [ "$response" = "200" ]; then
        log_success "插件启动事件测试通过"
        echo "响应内容:"
        cat /tmp/startup_test.json | jq . 2>/dev/null || cat /tmp/startup_test.json
    else
        log_error "插件启动事件测试失败，HTTP 状态码: $response"
        cat /tmp/startup_test.json 2>/dev/null || echo "无响应内容"
        return 1
    fi
    
    rm -f /tmp/startup_test.json
    echo ""
}

# 测试标签页启动事件
test_tab_startup_event() {
    log_info "测试标签页启动事件..."
    
    local test_data=$(generate_test_data)
    local user_hash=$(echo "$test_data" | cut -d',' -f1)
    local domain_hash=$(echo "$test_data" | cut -d',' -f2)
    local date=$(echo "$test_data" | cut -d',' -f3)
    local timestamp=$(echo "$test_data" | cut -d',' -f4)
    
    local payload=$(cat <<EOF
{
  "event_type": "tab_startup",
  "data": {
    "started_at": "$timestamp",
    "user_hash": "$user_hash",
    "version": "1.0.0",
    "domain_hash": "$domain_hash",
    "date": "$date"
  },
  "metadata": {
    "request_id": "test-tab-startup-$(date +%s)",
    "version": "1.0.0"
  }
}
EOF
)
    
    response=$(curl -s -w "%{http_code}" -X POST "$WORKER_URL/api/plugin-events" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        -o /tmp/tab_startup_test.json)
    
    if [ "$response" = "200" ]; then
        log_success "标签页启动事件测试通过"
        echo "响应内容:"
        cat /tmp/tab_startup_test.json | jq . 2>/dev/null || cat /tmp/tab_startup_test.json
    else
        log_error "标签页启动事件测试失败，HTTP 状态码: $response"
        cat /tmp/tab_startup_test.json 2>/dev/null || echo "无响应内容"
        return 1
    fi
    
    rm -f /tmp/tab_startup_test.json
    echo ""
}

# 测试公开统计 API
test_public_stats() {
    log_info "测试公开统计 API..."
    
    # 测试摘要统计
    response=$(curl -s -w "%{http_code}" "$WORKER_URL/api/plugin-stats?type=summary" \
        -o /tmp/public_stats_test.json)
    
    if [ "$response" = "200" ]; then
        log_success "公开统计 API 测试通过"
        echo "摘要统计响应:"
        cat /tmp/public_stats_test.json | jq . 2>/dev/null || cat /tmp/public_stats_test.json
    else
        log_error "公开统计 API 测试失败，HTTP 状态码: $response"
        cat /tmp/public_stats_test.json 2>/dev/null || echo "无响应内容"
        return 1
    fi
    
    rm -f /tmp/public_stats_test.json
    echo ""
}

# 测试管理员统计 API
test_admin_stats() {
    log_info "测试管理员统计 API..."
    
    if [ "$ADMIN_TOKEN" = "your-admin-token" ]; then
        log_warning "跳过管理员统计测试（未配置有效的 ADMIN_TOKEN）"
        echo ""
        return
    fi
    
    response=$(curl -s -w "%{http_code}" "$WORKER_URL/api/plugin-admin-stats?type=full" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -o /tmp/admin_stats_test.json)
    
    if [ "$response" = "200" ]; then
        log_success "管理员统计 API 测试通过"
        echo "完整统计响应:"
        cat /tmp/admin_stats_test.json | jq . 2>/dev/null || cat /tmp/admin_stats_test.json
    else
        log_error "管理员统计 API 测试失败，HTTP 状态码: $response"
        cat /tmp/admin_stats_test.json 2>/dev/null || echo "无响应内容"
        return 1
    fi
    
    rm -f /tmp/admin_stats_test.json
    echo ""
}

# 测试错误处理
test_error_handling() {
    log_info "测试错误处理..."
    
    # 测试无效的事件类型
    local payload=$(cat <<EOF
{
  "event_type": "invalid_event",
  "data": {
    "test": "data"
  }
}
EOF
)
    
    response=$(curl -s -w "%{http_code}" -X POST "$WORKER_URL/api/plugin-events" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        -o /tmp/error_test.json)
    
    if [ "$response" = "400" ]; then
        log_success "错误处理测试通过（无效事件类型）"
        echo "错误响应:"
        cat /tmp/error_test.json | jq . 2>/dev/null || cat /tmp/error_test.json
    else
        log_error "错误处理测试失败，期望 400，实际: $response"
        cat /tmp/error_test.json 2>/dev/null || echo "无响应内容"
        return 1
    fi
    
    rm -f /tmp/error_test.json
    echo ""
}

# 测试 CORS
test_cors() {
    log_info "测试 CORS..."
    
    response=$(curl -s -w "%{http_code}" -X OPTIONS "$WORKER_URL/api/plugin-events" \
        -H "Origin: https://adhdgofly.online" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -o /tmp/cors_test.json)
    
    if [ "$response" = "200" ]; then
        log_success "CORS 测试通过"
    else
        log_error "CORS 测试失败，HTTP 状态码: $response"
        return 1
    fi
    
    rm -f /tmp/cors_test.json
    echo ""
}

# 性能测试
test_performance() {
    log_info "测试性能..."
    
    local start_time=$(date +%s%3N)
    
    # 并发发送多个请求
    for i in {1..5}; do
        test_installation_event > /dev/null 2>&1 &
    done
    
    wait
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    log_success "性能测试完成，5个并发请求耗时: ${duration}ms"
    echo ""
}

# 显示使用说明
show_usage() {
    echo "用法: $0 [选项]"
    echo ""
    echo "环境变量:"
    echo "  WORKER_URL     Worker URL (默认: https://plugin-analytics.your-subdomain.workers.dev)"
    echo "  ADMIN_TOKEN    管理员令牌 (用于管理员 API 测试)"
    echo ""
    echo "选项:"
    echo "  -a, --all      运行所有测试"
    echo "  -h, --health   测试健康检查"
    echo "  -e, --events   测试事件收集"
    echo "  -s, --stats    测试统计查询"
    echo "  -p, --perf     测试性能"
    echo "  --help         显示帮助信息"
    echo ""
    echo "示例:"
    echo "  WORKER_URL=https://your-worker.workers.dev $0 --all"
    echo "  ADMIN_TOKEN=your-token $0 --stats"
}

# 主函数
main() {
    echo "=== ADHDGoFly Plugin Analytics Worker 功能测试 ==="
    echo "Worker URL: $WORKER_URL"
    echo ""
    
    # 检查参数
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    local test_count=0
    local pass_count=0
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--all)
                test_count=$((test_count + 7))
                test_health_check && pass_count=$((pass_count + 1))
                test_installation_event && pass_count=$((pass_count + 1))
                test_startup_event && pass_count=$((pass_count + 1))
                test_tab_startup_event && pass_count=$((pass_count + 1))
                test_public_stats && pass_count=$((pass_count + 1))
                test_admin_stats && pass_count=$((pass_count + 1))
                test_error_handling && pass_count=$((pass_count + 1))
                test_cors && pass_count=$((pass_count + 1))
                test_performance
                shift
                ;;
            -h|--health)
                test_count=$((test_count + 1))
                test_health_check && pass_count=$((pass_count + 1))
                shift
                ;;
            -e|--events)
                test_count=$((test_count + 3))
                test_installation_event && pass_count=$((pass_count + 1))
                test_startup_event && pass_count=$((pass_count + 1))
                test_tab_startup_event && pass_count=$((pass_count + 1))
                shift
                ;;
            -s|--stats)
                test_count=$((test_count + 2))
                test_public_stats && pass_count=$((pass_count + 1))
                test_admin_stats && pass_count=$((pass_count + 1))
                shift
                ;;
            -p|--perf)
                test_performance
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # 显示测试结果
    echo "=== 测试结果 ==="
    log_info "总测试数: $test_count"
    log_success "通过测试: $pass_count"
    
    if [ $test_count -gt 0 ] && [ $pass_count -eq $test_count ]; then
        log_success "所有测试通过！"
        exit 0
    elif [ $test_count -gt 0 ]; then
        log_error "部分测试失败"
        exit 1
    fi
}

# 运行主函数
main "$@"