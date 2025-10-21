#!/bin/bash

# ADHDGoFly Plugin Analytics - 数据迁移脚本
# 从旧的download-tracker Worker迁移plugin相关数据到新的plugin-analytics Worker

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
OLD_WORKER_URL="${1:-}"
NEW_WORKER_URL="${2:-}"
AUTH_TOKEN="${3:-}"
DRY_RUN="${4:-true}"

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

# 检查依赖
check_dependencies() {
    local deps=("curl" "jq")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is required but not installed"
            exit 1
        fi
    done
}

# 验证配置
validate_config() {
    if [[ -z "$OLD_WORKER_URL" ]]; then
        log_error "Old worker URL is required"
        show_help
        exit 1
    fi
    
    if [[ -z "$NEW_WORKER_URL" ]]; then
        log_error "New worker URL is required"
        show_help
        exit 1
    fi
    
    log_info "Old Worker: $OLD_WORKER_URL"
    log_info "New Worker: $NEW_WORKER_URL"
    log_info "Dry Run: $DRY_RUN"
}

# 获取旧数据
fetch_old_data() {
    local table="$1"
    local headers=(-H "Content-Type: application/json")
    
    if [[ -n "$AUTH_TOKEN" ]]; then
        headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi
    
    log_info "Fetching data from $table..."
    
    # 这里需要根据实际的API端点调整
    local response
    response=$(curl -s "${headers[@]}" "$OLD_WORKER_URL/api/admin/export/$table")
    
    if [[ $? -eq 0 ]]; then
        echo "$response"
    else
        log_error "Failed to fetch data from $table"
        return 1
    fi
}

# 转换数据格式
transform_installation_data() {
    local data="$1"
    
    echo "$data" | jq -r '.[] | {
        event_type: "installation",
        data: {
            event_type: .event_type,
            version: .version,
            previous_version: .previous_version,
            installed_at: .installed_at,
            user_hash: .user_hash,
            date: .date
        },
        metadata: {
            timestamp: (.installed_at | tostring),
            version: .version,
            migrated: true,
            source: "download-tracker"
        }
    }'
}

transform_startup_data() {
    local data="$1"
    
    echo "$data" | jq -r '.[] | {
        event_type: "startup",
        data: {
            started_at: .started_at,
            user_hash: .user_hash,
            version: .version,
            date: .date
        },
        metadata: {
            timestamp: (.started_at | tostring),
            version: .version,
            migrated: true,
            source: "download-tracker"
        }
    }'
}

transform_tab_startup_data() {
    local data="$1"
    
    echo "$data" | jq -r '.[] | {
        event_type: "tab_startup",
        data: {
            started_at: .started_at,
            user_hash: .user_hash,
            version: .version,
            domain_hash: .domain_hash,
            date: .date
        },
        metadata: {
            timestamp: (.started_at | tostring),
            version: .version,
            migrated: true,
            source: "download-tracker"
        }
    }'
}

# 发送数据到新Worker
send_to_new_worker() {
    local data="$1"
    local headers=(-H "Content-Type: application/json")
    
    if [[ -n "$AUTH_TOKEN" ]]; then
        headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would send data to $NEW_WORKER_URL/api/plugin-events"
        echo "$data" | jq '.'
        return 0
    fi
    
    local response
    response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -X POST -d "$data" "$NEW_WORKER_URL/api/plugin-events")
    
    local status_code
    status_code=$(echo "$response" | tail -n1)
    local response_body
    response_body=$(echo "$response" | head -n -1)
    
    if [[ "$status_code" == "200" ]]; then
        log_success "Data migrated successfully"
        return 0
    else
        log_error "Failed to migrate data (Status: $status_code)"
        echo "Response: $response_body"
        return 1
    fi
}

# 迁移安装事件
migrate_installations() {
    log_info "Migrating plugin installation events..."
    
    local data
    data=$(fetch_old_data "plugin_installations")
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to fetch installation data"
        return 1
    fi
    
    local count
    count=$(echo "$data" | jq '. | length')
    log_info "Found $count installation records"
    
    if [[ "$count" -eq 0 ]]; then
        log_warning "No installation data to migrate"
        return 0
    fi
    
    local transformed
    transformed=$(transform_installation_data "$data")
    
    # 逐条发送数据
    echo "$transformed" | while IFS= read -r record; do
        if [[ -n "$record" ]]; then
            send_to_new_worker "$record"
            sleep 0.1  # 避免过快请求
        fi
    done
}

# 迁移启动事件
migrate_startups() {
    log_info "Migrating plugin startup events..."
    
    local data
    data=$(fetch_old_data "plugin_startups")
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to fetch startup data"
        return 1
    fi
    
    local count
    count=$(echo "$data" | jq '. | length')
    log_info "Found $count startup records"
    
    if [[ "$count" -eq 0 ]]; then
        log_warning "No startup data to migrate"
        return 0
    fi
    
    local transformed
    transformed=$(transform_startup_data "$data")
    
    # 逐条发送数据
    echo "$transformed" | while IFS= read -r record; do
        if [[ -n "$record" ]]; then
            send_to_new_worker "$record"
            sleep 0.1  # 避免过快请求
        fi
    done
}

# 迁移标签页启动事件
migrate_tab_startups() {
    log_info "Migrating plugin tab startup events..."
    
    local data
    data=$(fetch_old_data "plugin_tab_startups")
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to fetch tab startup data"
        return 1
    fi
    
    local count
    count=$(echo "$data" | jq '. | length')
    log_info "Found $count tab startup records"
    
    if [[ "$count" -eq 0 ]]; then
        log_warning "No tab startup data to migrate"
        return 0
    fi
    
    local transformed
    transformed=$(transform_tab_startup_data "$data")
    
    # 逐条发送数据
    echo "$transformed" | while IFS= read -r record; do
        if [[ -n "$record" ]]; then
            send_to_new_worker "$record"
            sleep 0.1  # 避免过快请求
        fi
    done
}

# 验证迁移结果
verify_migration() {
    log_info "Verifying migration results..."
    
    local headers=(-H "Content-Type: application/json")
    if [[ -n "$AUTH_TOKEN" ]]; then
        headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi
    
    # 检查新Worker的统计数据
    local stats
    stats=$(curl -s "${headers[@]}" "$NEW_WORKER_URL/api/stats/summary")
    
    if [[ $? -eq 0 ]]; then
        log_success "Migration verification completed"
        echo "$stats" | jq '.'
    else
        log_error "Failed to verify migration"
    fi
}

# 主函数
main() {
    echo "=================================================="
    echo "ADHDGoFly Plugin Analytics - 数据迁移"
    echo "=================================================="
    
    check_dependencies
    validate_config
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "运行在DRY RUN模式，不会实际迁移数据"
    fi
    
    echo "=================================================="
    
    # 执行迁移
    migrate_installations
    echo
    
    migrate_startups
    echo
    
    migrate_tab_startups
    echo
    
    if [[ "$DRY_RUN" != "true" ]]; then
        verify_migration
    fi
    
    echo "=================================================="
    log_success "数据迁移完成！"
    echo "=================================================="
}

# 显示帮助信息
show_help() {
    echo "用法: $0 OLD_WORKER_URL NEW_WORKER_URL [AUTH_TOKEN] [DRY_RUN]"
    echo ""
    echo "参数:"
    echo "  OLD_WORKER_URL  旧Worker URL (必需)"
    echo "  NEW_WORKER_URL  新Worker URL (必需)"
    echo "  AUTH_TOKEN      认证令牌 (可选)"
    echo "  DRY_RUN         试运行模式 (true/false, 默认: true)"
    echo ""
    echo "示例:"
    echo "  $0 https://old-worker.workers.dev https://new-worker.workers.dev"
    echo "  $0 https://old-worker.workers.dev https://new-worker.workers.dev token123 false"
}

# 检查帮助参数
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 运行主程序
main