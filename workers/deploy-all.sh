#!/bin/bash

# ADHDGoFly Plugin Workers 统一部署脚本
# 支持同时部署 Download Tracker Worker 和 Plugin Analytics Worker

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
        log_error "Wrangler CLI 未安装，请运行: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq 未安装，请运行: brew install jq (macOS) 或 apt-get install jq (Ubuntu)"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 部署单个Worker
deploy_worker() {
    local worker_name=$1
    local worker_dir=$2
    
    log_info "开始部署 $worker_name..."
    
    if [ ! -d "$worker_dir" ]; then
        log_error "Worker目录不存在: $worker_dir"
        return 1
    fi
    
    cd "$worker_dir"
    
    # 检查配置文件
    if [ ! -f "wrangler.toml" ]; then
        log_error "$worker_name: wrangler.toml 配置文件不存在"
        log_info "请从 wrangler.toml.template 复制并配置"
        return 1
    fi
    
    # 检查是否有部署脚本
    if [ -f "deploy.sh" ]; then
        log_info "$worker_name: 使用专用部署脚本"
        chmod +x deploy.sh
        ./deploy.sh
    else
        log_info "$worker_name: 使用标准部署流程"
        
        # 安装依赖
        if [ -f "package.json" ]; then
            log_info "$worker_name: 安装依赖..."
            npm install
        fi
        
        # 部署到生产环境
        log_info "$worker_name: 部署到生产环境..."
        wrangler deploy
    fi
    
    if [ $? -eq 0 ]; then
        log_success "$worker_name 部署成功"
    else
        log_error "$worker_name 部署失败"
        return 1
    fi
    
    cd - > /dev/null
}

# 验证部署
verify_deployment() {
    local worker_name=$1
    local health_url=$2
    
    if [ -z "$health_url" ]; then
        log_warning "$worker_name: 未提供健康检查URL，跳过验证"
        return 0
    fi
    
    log_info "$worker_name: 验证部署..."
    
    # 等待服务启动
    sleep 5
    
    # 健康检查
    if curl -s -f "$health_url" > /dev/null; then
        log_success "$worker_name: 健康检查通过"
    else
        log_warning "$worker_name: 健康检查失败，请手动验证"
    fi
}

# 主函数
main() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local workers_dir="$script_dir"
    
    log_info "ADHDGoFly Plugin Workers 统一部署开始"
    log_info "工作目录: $workers_dir"
    
    # 检查依赖
    check_dependencies
    
    # 部署计数器
    local success_count=0
    local total_count=0
    
    # 部署 Download Tracker Worker
    if [ -d "$workers_dir/download-tracker" ]; then
        total_count=$((total_count + 1))
        if deploy_worker "Download Tracker Worker" "$workers_dir/download-tracker"; then
            success_count=$((success_count + 1))
            # 验证部署（需要根据实际URL调整）
            # verify_deployment "Download Tracker Worker" "https://your-download-tracker.workers.dev/health"
        fi
    else
        log_warning "Download Tracker Worker 目录不存在，跳过部署"
    fi
    
    # 部署 Plugin Analytics Worker
    if [ -d "$workers_dir/plugin-analytics" ]; then
        total_count=$((total_count + 1))
        if deploy_worker "Plugin Analytics Worker" "$workers_dir/plugin-analytics"; then
            success_count=$((success_count + 1))
            # 验证部署（需要根据实际URL调整）
            # verify_deployment "Plugin Analytics Worker" "https://your-plugin-analytics.workers.dev/health"
        fi
    else
        log_warning "Plugin Analytics Worker 目录不存在，跳过部署"
    fi
    
    # 部署总结
    echo
    log_info "部署总结:"
    log_info "成功: $success_count/$total_count"
    
    if [ $success_count -eq $total_count ] && [ $total_count -gt 0 ]; then
        log_success "所有Worker部署成功！"
        echo
        log_info "下一步操作:"
        log_info "1. 更新Vercel环境变量，配置Worker URLs"
        log_info "2. 运行测试脚本验证功能: ./test-all.sh"
        log_info "3. 更新前端代码中的API端点配置"
    else
        log_error "部分Worker部署失败，请检查错误信息"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "ADHDGoFly Plugin Workers 统一部署脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -v, --verbose  详细输出模式"
    echo
    echo "环境变量:"
    echo "  WRANGLER_API_TOKEN  Cloudflare API Token"
    echo
    echo "示例:"
    echo "  $0                 # 部署所有Worker"
    echo "  $0 --verbose       # 详细模式部署"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 执行主函数
main