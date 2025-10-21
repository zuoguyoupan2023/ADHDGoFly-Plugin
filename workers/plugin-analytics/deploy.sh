#!/bin/bash

# ADHDGoFly Plugin Analytics Worker 部署脚本
# 用于部署插件埋点数据收集与分析服务

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

# 检查依赖
check_dependencies() {
    log_info "检查部署依赖..."
    
    if ! command -v wrangler &> /dev/null; then
        log_error "wrangler CLI 未安装，请先安装: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq 未安装，建议安装以便更好地处理JSON输出"
    fi
    
    log_success "依赖检查完成"
}

# 显示使用说明
show_usage() {
    echo "使用方法: $0 [OPTIONS]"
    echo ""
    echo "选项:"
    echo "  -e, --env ENV        部署环境 (dev|staging|production) [默认: dev]"
    echo "  -c, --create-db      创建新的D1数据库"
    echo "  -m, --migrate        运行数据库迁移"
    echo "  -t, --test           部署后运行测试"
    echo "  -h, --help           显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                   # 部署到开发环境"
    echo "  $0 -e production     # 部署到生产环境"
    echo "  $0 -c -m -t          # 创建数据库、迁移并测试"
}

# 检查配置文件
check_config() {
    local env="$1"
    log_info "检查配置文件..."
    
    if [ ! -f "wrangler.toml" ]; then
        log_error "wrangler.toml 配置文件不存在"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        log_error "package.json 文件不存在"
        exit 1
    fi
    
    if [ ! -f "schema.sql" ]; then
        log_error "schema.sql 数据库结构文件不存在"
        exit 1
    fi
    
    log_success "配置文件检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "依赖安装完成"
}

# 创建D1数据库
create_database() {
    local env=${1:-"dev"}
    log_info "创建D1数据库 (环境: $env)..."
    
    # 检查数据库是否已存在
    local db_name="adhdgofly-plugin-analytics"
    if [ "$env" = "production" ]; then
        db_name="adhdgofly-plugin-analytics-prod"
    elif [ "$env" = "dev" ]; then
        db_name="adhdgofly-plugin-analytics-dev"
    fi
    
    # 尝试创建数据库
    if wrangler d1 create "$db_name" 2>/dev/null; then
        log_success "数据库 $db_name 创建成功"
    else
        log_warning "数据库 $db_name 可能已存在或创建失败"
    fi
}

# 初始化数据库结构
init_database() {
    local env=${1:-"dev"}
    log_info "初始化数据库结构 (环境: $env)..."
    
    if [ "$env" = "production" ]; then
        wrangler d1 execute adhdgofly-plugin-analytics --env production --file=schema.sql
    elif [ "$env" = "dev" ]; then
        wrangler d1 execute adhdgofly-plugin-analytics --env dev --file=schema.sql
    else
        wrangler d1 execute adhdgofly-plugin-analytics --file=schema.sql
    fi
    
    log_success "数据库结构初始化完成"
}

# 部署Worker
deploy_worker() {
    local env=${1:-"dev"}
    log_info "部署Plugin Analytics Worker (环境: $env)..."
    
    if [ "$env" = "production" ]; then
        wrangler deploy --env production
    elif [ "$env" = "dev" ]; then
        wrangler deploy --env dev
    else
        wrangler deploy
    fi
    
    log_success "Worker部署完成"
}

# 验证部署
verify_deployment() {
    local env=${1:-"dev"}
    log_info "验证部署状态..."
    
    # 获取Worker URL
    local worker_url
    if [ "$env" = "production" ]; then
        worker_url="https://adhdgofly-plugin-analytics-prod.your-subdomain.workers.dev"
    elif [ "$env" = "dev" ]; then
        worker_url="https://adhdgofly-plugin-analytics-dev.your-subdomain.workers.dev"
    else
        worker_url="https://adhdgofly-plugin-analytics.your-subdomain.workers.dev"
    fi
    
    log_info "测试健康检查端点: $worker_url/health"
    
    # 测试健康检查
    if curl -s -f "$worker_url/health" > /dev/null; then
        log_success "健康检查通过"
        
        # 显示健康检查结果
        if command -v jq &> /dev/null; then
            curl -s "$worker_url/health" | jq .
        else
            curl -s "$worker_url/health"
        fi
    else
        log_error "健康检查失败，请检查部署状态"
        return 1
    fi
}

# 显示部署信息
show_deployment_info() {
    local env=${1:-"dev"}
    
    echo ""
    log_success "=== Plugin Analytics Worker 部署完成 ==="
    echo ""
    echo "环境: $env"
    echo "服务: Plugin Analytics Worker"
    echo "功能: 插件埋点数据收集与分析"
    echo ""
    echo "API端点:"
    echo "  - 健康检查: /health"
    echo "  - 事件收集: /api/plugin-events"
    echo "  - 安装统计: /api/stats/installations"
    echo "  - 使用统计: /api/stats/usage"
    echo "  - 统计摘要: /api/stats/summary"
    echo "  - 用户会话: /api/sessions"
    echo ""
    echo "下一步:"
    echo "  1. 配置环境变量 (WORKER_AUTH_TOKEN, CORS_ORIGINS)"
    echo "  2. 更新Vercel API层配置"
    echo "  3. 运行测试脚本验证功能"
    echo ""
}

# 运行部署后测试
run_tests() {
    local env="$1"
    
    log_info "运行部署后测试..."
    
    # 获取Worker URL
    local worker_url
    if [[ "$env" == "dev" ]]; then
        worker_url=$(wrangler whoami | grep -o 'https://.*\.workers\.dev' | head -1)
    else
        worker_url=$(grep -A 10 "\[env\.$env\]" wrangler.toml | grep -o 'https://.*' | head -1)
    fi
    
    if [[ -z "$worker_url" ]]; then
        log_warning "无法获取Worker URL，跳过测试"
        return 0
    fi
    
    log_info "测试Worker URL: $worker_url"
    
    # 运行兼容性测试
    if [[ -f "./test-compatibility.sh" ]]; then
        log_info "运行兼容性测试..."
        ./test-compatibility.sh "$worker_url"
    else
        log_warning "未找到测试脚本，跳过测试"
    fi
}

# 主函数
main() {
    echo ""
    log_info "=== ADHDGoFly Plugin Analytics Worker 部署开始 ==="
    echo ""
    
    # 默认参数
    local env="dev"
    local create_db=false
    local migrate=false
    local test=false
    local skip_db=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                env="$2"
                shift 2
                ;;
            -c|--create-db)
                create_db=true
                shift
                ;;
            -m|--migrate)
                migrate=true
                shift
                ;;
            -t|--test)
                test=true
                shift
                ;;
            --skip-db)
                skip_db=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            dev|production|staging)
                env="$1"
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # 验证环境参数
    if [[ ! "$env" =~ ^(dev|staging|production)$ ]]; then
        log_error "无效的环境: $env (支持: dev, staging, production)"
        exit 1
    fi
    
    log_info "部署环境: $env"
    
    # 检查当前目录
    if [ ! -f "index.js" ]; then
        log_error "请在Plugin Analytics Worker目录中运行此脚本"
        exit 1
    fi
    
    # 执行部署步骤
    check_dependencies
    check_config "$env"
    install_dependencies
    
    # 数据库操作
    if [ "$skip_db" != "true" ]; then
        if [[ "$create_db" == true ]]; then
            create_database "$env"
        fi
        
        if [[ "$migrate" == true ]]; then
            init_database "$env"
        fi
    else
        log_warning "跳过数据库操作"
    fi
    
    deploy_worker "$env"
    
    # 等待部署完成
    sleep 5
    
    verify_deployment "$env"
    
    # 运行测试 (如果需要)
    if [[ "$test" == true ]]; then
        run_tests "$env"
    fi
    
    show_deployment_info "$env"
    
    log_success "Plugin Analytics Worker 部署完成！"
}

# 显示帮助信息
show_help() {
    echo "ADHDGoFly Plugin Analytics Worker 部署脚本"
    echo ""
    echo "用法:"
    echo "  $0 [环境] [选项]"
    echo ""
    echo "环境:"
    echo "  dev         开发环境 (默认)"
    echo "  production  生产环境"
    echo ""
    echo "选项:"
    echo "  --skip-db   跳过数据库创建和初始化"
    echo "  --help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                    # 部署到开发环境"
    echo "  $0 production         # 部署到生产环境"
    echo "  $0 dev --skip-db      # 部署到开发环境，跳过数据库操作"
    echo ""
}

# 解析命令行参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# 运行主函数
main "$@"