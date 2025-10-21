#!/bin/bash

# ADHDGoFly Plugin Analytics Worker 测试脚本

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
DEFAULT_DEV_URL="https://adhdgofly-plugin-analytics-dev.oliver-409.workers.dev"
DEFAULT_PROD_URL="https://adhdgofly-plugin-analytics.oliver-409.workers.dev"
DEFAULT_ADMIN_TOKEN="dev-admin-token"

# 测试健康检查
test_health() {
    local url=$1
    
    log_info "测试健康检查端点: $url/health"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url/health")
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq 200 ]; then
        log_success "健康检查通过"
        echo "响应: $body"
    else
        log_error "健康检查失败 (HTTP $http_code)"
        echo "响应: $body"
        return 1
    fi
}

# 测试插件事件上报
test_plugin_event() {
    local url=$1
    local event_type=$2
    
    log_info "测试插件事件上报: $event_type"
    
    case $event_type in
        "installation")
            data='{
                "event_type": "installation",
                "data": {
                    "version": "1.2.3",
                    "user_id": "test-user-123",
                    "install_type": "install"
                },
                "metadata": {
                    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            }'
            ;;
        "update")
            data='{
                "event_type": "installation",
                "data": {
                    "version": "1.2.4",
                    "user_id": "test-user-123",
                    "install_type": "update",
                    "previous_version": "1.2.3"
                },
                "metadata": {
                    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            }'
            ;;
        "startup")
            data='{
                "event_type": "startup",
                "data": {
                    "version": "1.2.3",
                    "user_id": "test-user-123"
                },
                "metadata": {
                    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            }'
            ;;
        "tab_startup")
            data='{
                "event_type": "tab_startup",
                "data": {
                    "version": "1.2.3",
                    "user_id": "test-user-123",
                    "domain": "example.com"
                },
                "metadata": {
                    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            }'
            ;;
        *)
            log_error "未知事件类型: $event_type"
            return 1
            ;;
    esac
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$url/api/plugin-events")
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq 200 ]; then
        log_success "$event_type 事件上报成功"
        echo "响应: $body"
    else
        log_error "$event_type 事件上报失败 (HTTP $http_code)"
        echo "响应: $body"
        return 1
    fi
}

# 测试公开统计查询
test_public_stats() {
    local url=$1
    
    log_info "测试公开统计查询: $url/api/plugin-stats/public"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url/api/plugin-stats/public")
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq 200 ]; then
        log_success "公开统计查询成功"
        if command -v jq &> /dev/null; then
            echo "$body" | jq .
        else
            echo "响应: $body"
        fi
    else
        log_error "公开统计查询失败 (HTTP $http_code)"
        echo "响应: $body"
        return 1
    fi
}

# 测试管理员统计查询
test_admin_stats() {
    local url=$1
    local token=$2
    
    log_info "测试管理员统计查询: $url/api/plugin-stats"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $token" \
        "$url/api/plugin-stats")
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq 200 ]; then
        log_success "管理员统计查询成功"
        if command -v jq &> /dev/null; then
            echo "$body" | jq .
        else
            echo "响应: $body"
        fi
    else
        log_error "管理员统计查询失败 (HTTP $http_code)"
        echo "响应: $body"
        return 1
    fi
}

# 测试错误处理
test_error_handling() {
    local url=$1
    
    log_info "测试错误处理..."
    
    # 测试无效的事件类型
    log_info "测试无效事件类型"
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"event_type": "invalid", "data": {}}' \
        "$url/api/plugin-events")
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ "$http_code" -eq 400 ]; then
        log_success "无效事件类型正确返回 400 错误"
    else
        log_error "无效事件类型应该返回 400 错误，实际返回 $http_code"
    fi
    
    # 测试缺少必要字段
    log_info "测试缺少必要字段"
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"event_type": "startup"}' \
        "$url/api/plugin-events")
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ "$http_code" -eq 400 ]; then
        log_success "缺少必要字段正确返回 400 错误"
    else
        log_error "缺少必要字段应该返回 400 错误，实际返回 $http_code"
    fi
    
    # 测试无效的管理员 Token
    log_info "测试无效管理员 Token"
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer invalid-token" \
        "$url/api/plugin-stats")
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ "$http_code" -eq 401 ]; then
        log_success "无效管理员 Token 正确返回 401 错误"
    else
        log_error "无效管理员 Token 应该返回 401 错误，实际返回 $http_code"
    fi
}

# 性能测试
test_performance() {
    local url=$1
    local concurrent_requests=${2:-10}
    
    log_info "性能测试 (并发请求数: $concurrent_requests)"
    
    # 创建临时文件存储测试数据
    temp_file=$(mktemp)
    
    # 准备测试数据
    test_data='{
        "event_type": "startup",
        "data": {
            "version": "1.2.3",
            "user_id": "perf-test-user"
        },
        "metadata": {
            "user_agent": "Mozilla/5.0 (Performance Test)"
        }
    }'
    
    # 并发发送请求
    start_time=$(date +%s.%N)
    
    for i in $(seq 1 $concurrent_requests); do
        {
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
                -X POST \
                -H "Content-Type: application/json" \
                -d "$test_data" \
                "$url/api/plugin-events")
            
            http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
            echo "$http_code" >> "$temp_file"
        } &
    done
    
    # 等待所有请求完成
    wait
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    
    # 统计结果
    success_count=$(grep -c "200" "$temp_file" || echo "0")
    total_count=$(wc -l < "$temp_file")
    
    log_info "性能测试结果:"
    log_info "  总请求数: $total_count"
    log_info "  成功请求数: $success_count"
    log_info "  总耗时: ${duration}s"
    log_info "  平均响应时间: $(echo "scale=3; $duration / $total_count" | bc)s"
    
    if [ "$success_count" -eq "$total_count" ]; then
        log_success "性能测试通过"
    else
        log_warning "性能测试部分失败 ($success_count/$total_count)"
    fi
    
    # 清理临时文件
    rm -f "$temp_file"
}

# 显示帮助信息
show_help() {
    echo "ADHDGoFly Plugin Analytics Worker 测试脚本"
    echo ""
    echo "用法: $0 [选项] [环境]"
    echo ""
    echo "环境:"
    echo "  development  开发环境 (默认)"
    echo "  production   生产环境"
    echo "  custom       自定义 URL"
    echo ""
    echo "选项:"
    echo "  --url URL           自定义 Worker URL"
    echo "  --token TOKEN       管理员 Token"
    echo "  --health-only       仅测试健康检查"
    echo "  --events-only       仅测试事件上报"
    echo "  --stats-only        仅测试统计查询"
    echo "  --errors-only       仅测试错误处理"
    echo "  --performance       仅测试性能"
    echo "  --concurrent N      性能测试并发数 (默认: 10)"
    echo "  --full              完整测试 (默认)"
    echo "  --help              显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                                    # 开发环境完整测试"
    echo "  $0 production                         # 生产环境完整测试"
    echo "  $0 --url https://custom.workers.dev   # 自定义 URL 测试"
    echo "  $0 --health-only development          # 仅测试开发环境健康检查"
    echo "  $0 --performance --concurrent 20      # 性能测试，20 并发"
}

# 主函数
main() {
    local env="development"
    local url=""
    local token="$DEFAULT_ADMIN_TOKEN"
    local test_type="full"
    local concurrent_requests=10
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --url)
                url="$2"
                shift 2
                ;;
            --token)
                token="$2"
                shift 2
                ;;
            --health-only)
                test_type="health"
                shift
                ;;
            --events-only)
                test_type="events"
                shift
                ;;
            --stats-only)
                test_type="stats"
                shift
                ;;
            --errors-only)
                test_type="errors"
                shift
                ;;
            --performance)
                test_type="performance"
                shift
                ;;
            --concurrent)
                concurrent_requests="$2"
                shift 2
                ;;
            --full)
                test_type="full"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            development|production|custom)
                env=$1
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 确定 URL
    if [ -z "$url" ]; then
        case $env in
            development)
                url="$DEFAULT_DEV_URL"
                ;;
            production)
                url="$DEFAULT_PROD_URL"
                token="prod-admin-token-change-me"  # 生产环境需要真实 token
                ;;
            custom)
                log_error "使用自定义环境时必须指定 --url 参数"
                exit 1
                ;;
        esac
    fi
    
    log_info "开始测试 Plugin Analytics Worker"
    log_info "环境: $env"
    log_info "URL: $url"
    log_info "测试类型: $test_type"
    echo ""
    
    # 执行测试
    case $test_type in
        health)
            test_health "$url"
            ;;
        events)
            test_plugin_event "$url" "installation"
            test_plugin_event "$url" "update"
            test_plugin_event "$url" "startup"
            test_plugin_event "$url" "tab_startup"
            ;;
        stats)
            test_public_stats "$url"
            test_admin_stats "$url" "$token"
            ;;
        errors)
            test_error_handling "$url"
            ;;
        performance)
            test_performance "$url" "$concurrent_requests"
            ;;
        full)
            test_health "$url"
            echo ""
            
            test_plugin_event "$url" "installation"
            test_plugin_event "$url" "update"
            test_plugin_event "$url" "startup"
            test_plugin_event "$url" "tab_startup"
            echo ""
            
            test_public_stats "$url"
            test_admin_stats "$url" "$token"
            echo ""
            
            test_error_handling "$url"
            echo ""
            
            test_performance "$url" 5  # 完整测试时使用较少并发
            ;;
    esac
    
    echo ""
    log_success "测试完成！"
}

# 执行主函数
main "$@"