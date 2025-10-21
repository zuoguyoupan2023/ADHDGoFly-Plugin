#!/bin/bash

# ADHDGoFly Plugin Analytics - 兼容性测试脚本
# 测试新Worker是否能正确处理旧数据格式

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
WORKER_URL="${1:-http://localhost:8787}"
AUTH_TOKEN="${2:-}"
VERBOSE="${3:-false}"

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# HTTP请求函数
make_request() {
    local url="$1"
    local method="$2"
    local data="$3"
    local expected_status="${4:-200}"
    
    ((TOTAL_TESTS++))
    
    local headers=(-H "Content-Type: application/json")
    if [[ -n "$AUTH_TOKEN" ]]; then
        headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Request: $method $url"
        log_info "Data: $data"
    fi
    
    local response
    local status_code
    
    if [[ "$method" == "POST" ]]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -X POST -d "$data" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -X "$method" "$url")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [[ "$status_code" == "$expected_status" ]]; then
        log_success "Status: $status_code (Expected: $expected_status)"
        if [[ "$VERBOSE" == "true" ]]; then
            echo "Response: $response_body"
        fi
        return 0
    else
        log_error "Status: $status_code (Expected: $expected_status)"
        echo "Response: $response_body"
        return 1
    fi
}

# 测试函数
test_health_check() {
    log_info "Testing health check..."
    make_request "$WORKER_URL/health" "GET" "" 200
}

test_legacy_installation_event() {
    log_info "Testing legacy installation event format..."
    
    local data='{
        "event_type": "installation",
        "data": {
            "event_type": "install",
            "version": "0.1.4",
            "installed_at": 1705123200000,
            "user_hash": "abc123def456",
            "date": "2025-01-13"
        },
        "metadata": {
            "timestamp": "2025-01-13T10:00:00Z",
            "version": "0.1.4"
        }
    }'
    
    make_request "$WORKER_URL/api/plugin-events" "POST" "$data" 200
}

test_legacy_startup_event() {
    log_info "Testing legacy startup event format..."
    
    local data='{
        "event_type": "startup",
        "data": {
            "started_at": 1705123200000,
            "user_hash": "abc123def456",
            "version": "0.1.4",
            "date": "2025-01-13"
        },
        "metadata": {
            "timestamp": "2025-01-13T10:00:00Z"
        }
    }'
    
    make_request "$WORKER_URL/api/plugin-events" "POST" "$data" 200
}

test_legacy_tab_startup_event() {
    log_info "Testing legacy tab startup event format..."
    
    local data='{
        "event_type": "tab_startup",
        "data": {
            "started_at": 1705123200000,
            "user_hash": "abc123def456",
            "version": "0.1.4",
            "domain_hash": "example.com.hash",
            "date": "2025-01-13"
        },
        "metadata": {
            "timestamp": "2025-01-13T10:00:00Z"
        }
    }'
    
    make_request "$WORKER_URL/api/plugin-events" "POST" "$data" 200
}

test_new_installation_event() {
    log_info "Testing new installation event format..."
    
    local data='{
        "event_type": "installation",
        "plugin_version": "0.1.4",
        "browser": "chrome",
        "browser_version": "120.0.0.0",
        "language": "zh-CN",
        "timestamp": 1705123200000,
        "session_id": "session_123"
    }'
    
    make_request "$WORKER_URL/api/plugin-events" "POST" "$data" 200
}

test_new_startup_event() {
    log_info "Testing new startup event format..."
    
    local data='{
        "event_type": "startup",
        "plugin_version": "0.1.4",
        "browser": "chrome",
        "browser_version": "120.0.0.0",
        "language": "zh-CN",
        "timestamp": 1705123200000,
        "session_id": "session_123"
    }'
    
    make_request "$WORKER_URL/api/plugin-events" "POST" "$data" 200
}

test_invalid_data() {
    log_info "Testing invalid data handling..."
    
    local data='{"invalid": "data"}'
    make_request "$WORKER_URL/api/plugin-events" "POST" "$data" 400
}

test_statistics_endpoints() {
    log_info "Testing statistics endpoints..."
    
    make_request "$WORKER_URL/api/stats/installations" "GET" "" 200
    make_request "$WORKER_URL/api/stats/usage" "GET" "" 200
    make_request "$WORKER_URL/api/stats/summary" "GET" "" 200
}

# 主测试流程
main() {
    echo "=================================================="
    echo "ADHDGoFly Plugin Analytics - 兼容性测试"
    echo "=================================================="
    echo "Worker URL: $WORKER_URL"
    echo "Auth Token: ${AUTH_TOKEN:+[SET]}${AUTH_TOKEN:-[NOT SET]}"
    echo "Verbose: $VERBOSE"
    echo "=================================================="
    
    # 检查依赖
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    # 运行测试
    test_health_check
    echo
    
    log_info "Testing legacy data format compatibility..."
    test_legacy_installation_event
    test_legacy_startup_event
    test_legacy_tab_startup_event
    echo
    
    log_info "Testing new data format..."
    test_new_installation_event
    test_new_startup_event
    echo
    
    log_info "Testing error handling..."
    test_invalid_data
    echo
    
    log_info "Testing statistics endpoints..."
    test_statistics_endpoints
    echo
    
    # 测试结果汇总
    echo "=================================================="
    echo "测试结果汇总"
    echo "=================================================="
    echo "总测试数: $TOTAL_TESTS"
    echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "失败: ${RED}$FAILED_TESTS${NC}"
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        echo -e "${GREEN}✅ 所有兼容性测试通过！${NC}"
        exit 0
    else
        echo -e "${RED}❌ 有 $FAILED_TESTS 个测试失败${NC}"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [WORKER_URL] [AUTH_TOKEN] [VERBOSE]"
    echo ""
    echo "参数:"
    echo "  WORKER_URL   Worker URL (默认: http://localhost:8787)"
    echo "  AUTH_TOKEN   认证令牌 (可选)"
    echo "  VERBOSE      详细输出 (true/false, 默认: false)"
    echo ""
    echo "示例:"
    echo "  $0"
    echo "  $0 https://your-worker.workers.dev"
    echo "  $0 https://your-worker.workers.dev your-token true"
}

# 检查帮助参数
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 运行主程序
main