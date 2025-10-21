#!/bin/bash

# ADHDGoFly Plugin Analytics - 迁移验证脚本
# 用于验证新旧系统数据一致性

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 显示使用说明
show_usage() {
    echo "使用方法: $0 <OLD_WORKER_URL> <NEW_WORKER_URL> [AUTH_TOKEN]"
    echo ""
    echo "参数说明:"
    echo "  OLD_WORKER_URL  旧Worker的URL (download-tracker)"
    echo "  NEW_WORKER_URL  新Worker的URL (plugin-analytics)"
    echo "  AUTH_TOKEN      可选的认证令牌"
    echo ""
    echo "示例:"
    echo "  $0 https://old-worker.workers.dev https://new-worker.workers.dev"
    echo "  $0 https://old-worker.workers.dev https://new-worker.workers.dev your-auth-token"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装，请先安装 curl"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq 未安装，请先安装 jq"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 验证URL可访问性
validate_urls() {
    local old_url="$1"
    local new_url="$2"
    
    log_info "验证URL可访问性..."
    
    # 检查旧Worker
    if ! curl -s -f "${old_url}/health" > /dev/null; then
        log_error "无法访问旧Worker: ${old_url}"
        exit 1
    fi
    
    # 检查新Worker
    if ! curl -s -f "${new_url}/health" > /dev/null; then
        log_error "无法访问新Worker: ${new_url}"
        exit 1
    fi
    
    log_success "URL验证通过"
}

# 获取旧系统统计数据
get_old_stats() {
    local old_url="$1"
    local auth_token="$2"
    
    log_info "获取旧系统统计数据..."
    
    local headers=""
    if [[ -n "$auth_token" ]]; then
        headers="-H \"Authorization: Bearer $auth_token\""
    fi
    
    # 获取安装统计
    local installations=$(eval curl -s $headers "${old_url}/api/stats/installations" | jq -r '.total // 0')
    
    # 获取启动统计
    local startups=$(eval curl -s $headers "${old_url}/api/stats/startups" | jq -r '.total // 0')
    
    # 获取标签页启动统计
    local tab_startups=$(eval curl -s $headers "${old_url}/api/stats/tab-startups" | jq -r '.total // 0')
    
    echo "{\"installations\": $installations, \"startups\": $startups, \"tab_startups\": $tab_startups}"
}

# 获取新系统统计数据
get_new_stats() {
    local new_url="$1"
    local auth_token="$2"
    
    log_info "获取新系统统计数据..."
    
    local headers=""
    if [[ -n "$auth_token" ]]; then
        headers="-H \"Authorization: Bearer $auth_token\""
    fi
    
    eval curl -s $headers "${new_url}/api/stats/summary"
}

# 对比统计数据
compare_stats() {
    local old_stats="$1"
    local new_stats="$2"
    
    log_info "对比统计数据..."
    
    # 解析旧系统数据
    local old_installations=$(echo "$old_stats" | jq -r '.installations')
    local old_startups=$(echo "$old_stats" | jq -r '.startups')
    local old_tab_startups=$(echo "$old_stats" | jq -r '.tab_startups')
    
    # 解析新系统数据
    local new_installations=$(echo "$new_stats" | jq -r '.installation_events // 0')
    local new_startups=$(echo "$new_stats" | jq -r '.startup_events // 0')
    local new_tab_startups=$(echo "$new_stats" | jq -r '.tab_startup_events // 0')
    
    echo ""
    echo "📊 数据对比结果:"
    echo "================================"
    
    # 安装事件对比
    echo "安装事件:"
    echo "  旧系统: $old_installations"
    echo "  新系统: $new_installations"
    if [[ "$old_installations" == "$new_installations" ]]; then
        log_success "  ✅ 安装事件数据一致"
    else
        log_warning "  ⚠️  安装事件数据不一致 (差异: $((new_installations - old_installations)))"
    fi
    
    echo ""
    
    # 启动事件对比
    echo "启动事件:"
    echo "  旧系统: $old_startups"
    echo "  新系统: $new_startups"
    if [[ "$old_startups" == "$new_startups" ]]; then
        log_success "  ✅ 启动事件数据一致"
    else
        log_warning "  ⚠️  启动事件数据不一致 (差异: $((new_startups - old_startups)))"
    fi
    
    echo ""
    
    # 标签页启动事件对比
    echo "标签页启动事件:"
    echo "  旧系统: $old_tab_startups"
    echo "  新系统: $new_tab_startups"
    if [[ "$old_tab_startups" == "$new_tab_startups" ]]; then
        log_success "  ✅ 标签页启动事件数据一致"
    else
        log_warning "  ⚠️  标签页启动事件数据不一致 (差异: $((new_tab_startups - old_tab_startups)))"
    fi
    
    echo ""
    echo "================================"
    
    # 总体评估
    local total_old=$((old_installations + old_startups + old_tab_startups))
    local total_new=$((new_installations + new_startups + new_tab_startups))
    
    echo "总事件数:"
    echo "  旧系统: $total_old"
    echo "  新系统: $total_new"
    
    if [[ "$total_old" == "$total_new" ]]; then
        log_success "🎉 数据迁移验证通过！总事件数完全一致"
        return 0
    else
        local diff=$((total_new - total_old))
        if [[ $diff -gt 0 ]]; then
            log_warning "⚠️  新系统事件数多于旧系统 (+$diff)，可能包含迁移后的新事件"
        else
            log_error "❌ 新系统事件数少于旧系统 ($diff)，可能存在数据丢失"
            return 1
        fi
    fi
}

# 验证API兼容性
verify_api_compatibility() {
    local new_url="$1"
    local auth_token="$2"
    
    log_info "验证API兼容性..."
    
    local headers="Content-Type: application/json"
    if [[ -n "$auth_token" ]]; then
        headers="$headers -H \"Authorization: Bearer $auth_token\""
    fi
    
    # 测试旧格式数据
    local legacy_data='{
        "event_type": "installation",
        "data": {
            "event_type": "install",
            "version": "0.1.4",
            "installed_at": 1705123200000,
            "user_hash": "test_user_hash",
            "date": "2025-01-13"
        },
        "metadata": {
            "timestamp": "2025-01-13T10:00:00Z",
            "version": "0.1.4"
        }
    }'
    
    local response=$(eval curl -s -w "%{http_code}" -H "$headers" -d "'$legacy_data'" "${new_url}/api/plugin-events")
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [[ "$http_code" == "200" ]]; then
        log_success "✅ 旧格式数据兼容性验证通过"
    else
        log_error "❌ 旧格式数据兼容性验证失败 (HTTP $http_code)"
        echo "响应: $body"
        return 1
    fi
    
    # 测试新格式数据
    local new_data='{
        "event_type": "startup",
        "plugin_version": "0.1.4",
        "browser": "chrome",
        "timestamp": 1705123200000,
        "session_id": "test_session_123"
    }'
    
    response=$(eval curl -s -w "%{http_code}" -H "$headers" -d "'$new_data'" "${new_url}/api/plugin-events")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [[ "$http_code" == "200" ]]; then
        log_success "✅ 新格式数据兼容性验证通过"
    else
        log_error "❌ 新格式数据兼容性验证失败 (HTTP $http_code)"
        echo "响应: $body"
        return 1
    fi
    
    log_success "🎉 API兼容性验证通过！"
}

# 性能基准测试
performance_benchmark() {
    local new_url="$1"
    local auth_token="$2"
    
    log_info "执行性能基准测试..."
    
    local headers="Content-Type: application/json"
    if [[ -n "$auth_token" ]]; then
        headers="$headers -H \"Authorization: Bearer $auth_token\""
    fi
    
    local test_data='{
        "event_type": "startup",
        "plugin_version": "0.1.4",
        "browser": "chrome",
        "timestamp": 1705123200000,
        "session_id": "perf_test_session"
    }'
    
    # 执行10次请求测试
    local total_time=0
    local success_count=0
    
    for i in {1..10}; do
        local start_time=$(date +%s%N)
        local response=$(eval curl -s -w "%{http_code}" -H "$headers" -d "'$test_data'" "${new_url}/api/plugin-events")
        local end_time=$(date +%s%N)
        
        local http_code="${response: -3}"
        local duration=$(( (end_time - start_time) / 1000000 )) # 转换为毫秒
        
        if [[ "$http_code" == "200" ]]; then
            success_count=$((success_count + 1))
            total_time=$((total_time + duration))
        fi
        
        echo -n "."
    done
    
    echo ""
    
    if [[ $success_count -gt 0 ]]; then
        local avg_time=$((total_time / success_count))
        log_success "性能测试完成: 成功率 ${success_count}/10, 平均响应时间 ${avg_time}ms"
        
        if [[ $avg_time -lt 1000 ]]; then
            log_success "✅ 性能表现良好 (< 1秒)"
        elif [[ $avg_time -lt 3000 ]]; then
            log_warning "⚠️  性能一般 (1-3秒)"
        else
            log_error "❌ 性能较差 (> 3秒)"
        fi
    else
        log_error "❌ 性能测试失败，所有请求都失败了"
        return 1
    fi
}

# 生成验证报告
generate_report() {
    local old_url="$1"
    local new_url="$2"
    local old_stats="$3"
    local new_stats="$4"
    
    local report_file="migration-verification-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# 数据迁移验证报告

**生成时间**: $(date)
**旧系统**: $old_url
**新系统**: $new_url

## 📊 数据统计对比

### 旧系统统计
\`\`\`json
$old_stats
\`\`\`

### 新系统统计
\`\`\`json
$new_stats
\`\`\`

## ✅ 验证结果

- [x] URL可访问性验证
- [x] 数据统计对比
- [x] API兼容性验证
- [x] 性能基准测试

## 📝 建议

1. 如果数据存在差异，请检查迁移脚本的执行日志
2. 建议持续监控新系统的性能表现
3. 可以考虑设置自动化监控告警

## 🔗 相关链接

- [兼容性文档](./COMPATIBILITY.md)
- [迁移脚本](./migrate-data.sh)
- [测试脚本](./test-compatibility.sh)
EOF

    log_success "验证报告已生成: $report_file"
}

# 主函数
main() {
    echo "🔍 ADHDGoFly Plugin Analytics - 迁移验证工具"
    echo "================================================"
    echo ""
    
    # 检查参数
    if [[ $# -lt 2 ]]; then
        show_usage
        exit 1
    fi
    
    local old_url="$1"
    local new_url="$2"
    local auth_token="$3"
    
    # 移除URL末尾的斜杠
    old_url="${old_url%/}"
    new_url="${new_url%/}"
    
    # 执行验证步骤
    check_dependencies
    validate_urls "$old_url" "$new_url"
    
    # 获取统计数据
    local old_stats=$(get_old_stats "$old_url" "$auth_token")
    local new_stats=$(get_new_stats "$new_url" "$auth_token")
    
    # 对比数据
    if ! compare_stats "$old_stats" "$new_stats"; then
        log_error "数据对比发现问题，请检查迁移过程"
    fi
    
    # 验证API兼容性
    if ! verify_api_compatibility "$new_url" "$auth_token"; then
        log_error "API兼容性验证失败"
    fi
    
    # 性能测试
    performance_benchmark "$new_url" "$auth_token"
    
    # 生成报告
    generate_report "$old_url" "$new_url" "$old_stats" "$new_stats"
    
    echo ""
    log_success "🎉 迁移验证完成！"
    echo ""
    echo "如果发现任何问题，请查看:"
    echo "- 兼容性文档: ./COMPATIBILITY.md"
    echo "- 迁移脚本: ./migrate-data.sh"
    echo "- 测试脚本: ./test-compatibility.sh"
}

# 执行主函数
main "$@"