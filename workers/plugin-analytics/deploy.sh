#!/bin/bash

# ADHDGoFly Plugin Analytics Worker 部署脚本

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

# 检查必要工具
check_dependencies() {
    log_info "检查依赖工具..."
    
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI 未安装，请先安装: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq 未安装，某些功能可能受限"
    fi
    
    log_success "依赖检查完成"
}

# 检查配置文件
check_config() {
    log_info "检查配置文件..."
    
    if [ ! -f "wrangler.toml" ]; then
        if [ -f "wrangler.toml.template" ]; then
            log_warning "wrangler.toml 不存在，从模板复制..."
            cp wrangler.toml.template wrangler.toml
            log_error "请编辑 wrangler.toml 文件，填入正确的数据库 ID 和环境变量"
            exit 1
        else
            log_error "配置文件不存在，请先创建 wrangler.toml"
            exit 1
        fi
    fi
    
    log_success "配置文件检查完成"
}

# 创建数据库
create_database() {
    local env=${1:-"development"}
    
    log_info "创建 D1 数据库 (环境: $env)..."
    
    if [ "$env" = "production" ]; then
        DB_NAME="adhdgofly-plugin-analytics"
    else
        DB_NAME="adhdgofly-plugin-analytics-dev"
    fi
    
    # 检查数据库是否已存在
    if wrangler d1 list | grep -q "$DB_NAME"; then
        log_warning "数据库 $DB_NAME 已存在，跳过创建"
    else
        log_info "创建新数据库: $DB_NAME"
        wrangler d1 create "$DB_NAME"
        log_success "数据库创建完成"
        log_warning "请将数据库 ID 更新到 wrangler.toml 文件中"
    fi
}

# 初始化数据库结构
init_database() {
    local env=${1:-"development"}
    
    log_info "初始化数据库结构 (环境: $env)..."
    
    if [ ! -f "schema.sql" ]; then
        log_error "schema.sql 文件不存在"
        exit 1
    fi
    
    if [ "$env" = "production" ]; then
        wrangler d1 execute adhdgofly-plugin-analytics --file=schema.sql --env=production
    else
        wrangler d1 execute adhdgofly-plugin-analytics-dev --file=schema.sql --env=development
    fi
    
    log_success "数据库结构初始化完成"
}

# 部署 Worker
deploy_worker() {
    local env=${1:-"development"}
    
    log_info "部署 Worker (环境: $env)..."
    
    if [ "$env" = "production" ]; then
        wrangler deploy --env=production
    else
        wrangler deploy --env=development
    fi
    
    log_success "Worker 部署完成"
}

# 验证部署
verify_deployment() {
    local env=${1:-"development"}
    
    log_info "验证部署 (环境: $env)..."
    
    if [ "$env" = "production" ]; then
        WORKER_URL="https://adhdgofly-plugin-analytics.oliver-409.workers.dev"
    else
        WORKER_URL="https://adhdgofly-plugin-analytics-dev.oliver-409.workers.dev"
    fi
    
    # 测试健康检查端点
    log_info "测试健康检查端点..."
    if curl -s "$WORKER_URL/health" | grep -q "ok"; then
        log_success "健康检查通过"
    else
        log_error "健康检查失败"
        exit 1
    fi
    
    # 测试公开统计端点
    log_info "测试公开统计端点..."
    if curl -s "$WORKER_URL/api/plugin-stats/public" | grep -q "totalInstallations"; then
        log_success "公开统计端点正常"
    else
        log_warning "公开统计端点可能有问题（可能是因为没有数据）"
    fi
    
    log_success "部署验证完成"
    log_info "Worker URL: $WORKER_URL"
}

# 显示帮助信息
show_help() {
    echo "ADHDGoFly Plugin Analytics Worker 部署脚本"
    echo ""
    echo "用法: $0 [选项] [环境]"
    echo ""
    echo "环境:"
    echo "  development  开发环境 (默认)"
    echo "  production   生产环境"
    echo ""
    echo "选项:"
    echo "  --create-db     仅创建数据库"
    echo "  --init-db       仅初始化数据库结构"
    echo "  --deploy-only   仅部署 Worker"
    echo "  --verify-only   仅验证部署"
    echo "  --full          完整部署流程 (默认)"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                          # 开发环境完整部署"
    echo "  $0 production               # 生产环境完整部署"
    echo "  $0 --create-db production   # 仅在生产环境创建数据库"
    echo "  $0 --deploy-only development # 仅部署到开发环境"
}

# 主函数
main() {
    local env="development"
    local action="full"
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --create-db)
                action="create-db"
                shift
                ;;
            --init-db)
                action="init-db"
                shift
                ;;
            --deploy-only)
                action="deploy-only"
                shift
                ;;
            --verify-only)
                action="verify-only"
                shift
                ;;
            --full)
                action="full"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            development|production)
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
    
    log_info "开始部署 Plugin Analytics Worker"
    log_info "环境: $env"
    log_info "操作: $action"
    echo ""
    
    # 基础检查
    check_dependencies
    check_config
    
    # 根据操作执行相应步骤
    case $action in
        create-db)
            create_database "$env"
            ;;
        init-db)
            init_database "$env"
            ;;
        deploy-only)
            deploy_worker "$env"
            ;;
        verify-only)
            verify_deployment "$env"
            ;;
        full)
            create_database "$env"
            init_database "$env"
            deploy_worker "$env"
            verify_deployment "$env"
            ;;
    esac
    
    echo ""
    log_success "部署流程完成！"
    
    if [ "$action" = "full" ] || [ "$action" = "deploy-only" ]; then
        echo ""
        log_info "下一步操作建议："
        log_info "1. 更新 Vercel API 层配置，指向新的 Plugin Analytics Worker"
        log_info "2. 测试插件事件上报功能"
        log_info "3. 验证统计数据查询功能"
        log_info "4. 配置监控和告警"
    fi
}

# 执行主函数
main "$@"