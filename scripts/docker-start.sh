#!/bin/bash

# ==============================================================================
# AgentKit Docker 启动脚本
# ==============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
print_banner() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "      AgentKit Docker 环境管理脚本"
    echo "=================================================="
    echo -e "${NC}"
}

print_help() {
    echo -e "${YELLOW}使用方法:${NC}"
    echo "  $0 [命令] [选项]"
    echo ""
    echo -e "${YELLOW}命令:${NC}"
    echo "  dev         启动开发环境（MCP 服务器）"
    echo "  prod        启动生产环境（MCP 服务器）"
    echo "  test        启动测试环境（MCP 连接测试）"
    echo "  demo        启动 HTTP 演示服务器"
    echo "  build       构建 Docker 镜像"
    echo "  stop        停止所有容器"
    echo "  clean       清理容器和镜像"
    echo "  prune       深度清理 Docker 资源（释放磁盘空间）"
    echo "  space       检查磁盘和 Docker 空间使用情况"
    echo "  logs        查看日志"
    echo "  shell       进入容器 shell"
    echo "  status      查看容器状态"
    echo "  help        显示此帮助信息"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  $0 dev                    # 启动 MCP 开发环境"
    echo "  $0 prod                   # 启动 MCP 生产环境"
    echo "  $0 test                   # 测试 MCP 连接"
    echo "  $0 demo                   # 启动 HTTP 演示服务器"
    echo "  $0 logs agentkit-dev      # 查看开发环境日志"
    echo "  $0 status                 # 查看所有容器状态"
    echo ""
    echo -e "${YELLOW}环境配置:${NC}"
    echo "  env.minimal      最小化配置（推荐新手）"
    echo "  env.example      完整配置选项"
    echo "  .env             当前配置文件"
    echo ""
    echo -e "${YELLOW}配置文件使用:${NC}"
    echo "  cp env.minimal .env      # 使用最小化配置"
    echo "  cp env.example .env      # 使用完整配置"
    echo ""
    echo -e "${YELLOW}注意:${NC}"
    echo "  - MCP 服务器通过 stdio 与 Claude Desktop 通信"
    echo "  - 使用 'demo' 模式可启动 HTTP 服务器进行演示"
    echo "  - 真正的 MCP 功能需要配置 Claude Desktop"
    echo "  - 首次运行会自动创建 .env 文件（基于 env.minimal）"
}

check_requirements() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}错误: Docker Compose 未安装${NC}"
        exit 1
    fi
}

setup_environment() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}未找到 .env 文件，正在创建...${NC}"
        
        if [ -f env.minimal ]; then
            # 优先使用最小化配置
            cp env.minimal .env
            echo -e "${GREEN}已从 env.minimal 创建最小化 .env 文件${NC}"
            echo -e "${BLUE}📝 基础配置已就绪，项目可直接运行${NC}"
            echo -e "${YELLOW}如需更多配置选项，请参考：${NC}"
            echo "  - env.example: 完整配置示例"
            echo "  - ENVIRONMENT_SETUP.md: 详细配置指南"
        elif [ -f env.example ]; then
            # 备选：使用完整示例文件
            cp env.example .env
            echo -e "${GREEN}已从 env.example 创建 .env 文件${NC}"
            echo -e "${BLUE}📝 请编辑 .env 文件，添加您的实际配置值${NC}"
        else
            # 最后选择：创建基本配置
            cat > .env << EOF
# AgentKit 最小化配置
NODE_ENV=development
MCP_SERVER_PORT=3000
LOG_LEVEL=info
PORT=3000
SOLANA_RPC_URL=https://api.devnet.solana.com
DUMMY_WALLET_PUBLIC_KEY=11111111111111111111111111111111
NETWORK_ID=solana-devnet

# 可选配置（取消注释以启用）
# SOLANA_PRIVATE_KEY=your_base58_private_key_here
# MESSARI_API_KEY=your_messari_api_key_here
# MAGIC_EDEN_API_KEY=your_magic_eden_api_key_here
EOF
            echo -e "${GREEN}已创建最小化 .env 文件${NC}"
            echo -e "${BLUE}📝 更多配置选项请参考项目文档${NC}"
        fi
    fi

    # 确保 .env 文件包含 PORT 变量
    if ! grep -q "^PORT=" .env; then
        echo "PORT=3000" >> .env
    fi

    # 创建必要的目录
    mkdir -p config output logs
    echo -e "${GREEN}已创建必要目录: config/, output/, logs/${NC}"
}

start_development() {
    echo -e "${GREEN}启动 MCP 开发环境...${NC}"
    docker-compose --profile development up --build -d
    echo -e "${GREEN}MCP 开发环境已启动！${NC}"
    echo -e "${BLUE}容器名称: agentkit-dev${NC}"
    echo -e "${YELLOW}查看日志: $0 logs agentkit-dev${NC}"
    echo -e "${YELLOW}进入容器: $0 shell agentkit-dev${NC}"
    echo ""
    echo -e "${BLUE}📝 注意: 这是 MCP 服务器，需要配置 Claude Desktop 才能使用${NC}"
}

start_production() {
    echo -e "${GREEN}启动 MCP 生产环境...${NC}"
    docker-compose --profile production up --build -d
    echo -e "${GREEN}MCP 生产环境已启动！${NC}"
    echo -e "${BLUE}容器名称: agentkit-mcp-server${NC}"
    echo -e "${YELLOW}查看日志: $0 logs agentkit-mcp-server${NC}"
    echo -e "${YELLOW}进入容器: $0 shell agentkit-mcp-server${NC}"
    echo ""
    echo -e "${BLUE}📝 注意: 这是 MCP 服务器，需要配置 Claude Desktop 才能使用${NC}"
}

start_test() {
    echo -e "${GREEN}启动 MCP 测试环境...${NC}"
    docker-compose --profile test run --rm agentkit-mcp-test
    echo -e "${GREEN}MCP 测试完成${NC}"
}

start_demo() {
    echo -e "${GREEN}启动 HTTP 演示服务器...${NC}"
    docker-compose --profile demo up --build -d
    echo -e "${GREEN}HTTP 演示服务器已启动！${NC}"
    echo -e "${BLUE}访问地址: http://localhost:3000${NC}"
    echo -e "${BLUE}健康检查: http://localhost:3000/health${NC}"
    echo -e "${YELLOW}查看日志: $0 logs agentkit-http-demo${NC}"
    echo ""
    echo -e "${BLUE}📝 注意: 这只是演示服务器，真正的 MCP 功能需要 stdio 通信${NC}"
}

build_images() {
    echo -e "${GREEN}构建 Docker 镜像...${NC}"
    docker-compose build
    echo -e "${GREEN}镜像构建完成！${NC}"
}

stop_services() {
    echo -e "${YELLOW}停止所有服务...${NC}"
    docker-compose --profile development --profile production --profile test --profile demo down
    echo -e "${GREEN}所有服务已停止${NC}"
}

clean_docker() {
    echo -e "${YELLOW}清理 Docker 容器和镜像...${NC}"
    docker-compose --profile development --profile production --profile test --profile demo down --rmi all --volumes --remove-orphans
    echo -e "${GREEN}清理完成${NC}"
}

show_logs() {
    if [ -z "$2" ]; then
        echo -e "${YELLOW}请指定容器名称${NC}"
        echo "可用容器:"
        echo "  - agentkit-dev (开发环境)"
        echo "  - agentkit-mcp-server (生产环境)"
        echo "  - agentkit-mcp-test (测试环境)"
        echo "  - agentkit-http-demo (演示服务器)"
        exit 1
    fi
    docker-compose logs -f "$2"
}

enter_shell() {
    container_name="${2:-agentkit-dev}"
    echo -e "${GREEN}进入容器 $container_name shell...${NC}"
    docker exec -it "$container_name" /bin/sh
}

show_status() {
    echo -e "${GREEN}Docker 容器状态:${NC}"
    docker-compose ps
    echo ""
    echo -e "${GREEN}运行中的容器:${NC}"
    docker ps --filter "name=agentkit" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

check_disk_space() {
    echo -e "${BLUE}📊 磁盘空间使用情况:${NC}"
    echo ""
    echo -e "${YELLOW}系统磁盘空间:${NC}"
    df -h | head -1
    df -h | grep -E "^/dev/" | head -3
    echo ""
    
    echo -e "${YELLOW}Docker 资源使用:${NC}"
    docker system df 2>/dev/null || echo "Docker 未运行"
    echo ""
    
    # 检查可用空间并给出警告
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local available_gb=$((available_space / 1024 / 1024))
    
    if [ $available_gb -lt 5 ]; then
        echo -e "${RED}⚠️  警告: 可用磁盘空间不足 ${available_gb}GB${NC}"
        echo -e "${YELLOW}建议执行: $0 prune${NC}"
        echo ""
    elif [ $available_gb -lt 10 ]; then
        echo -e "${YELLOW}⚠️  注意: 可用磁盘空间仅 ${available_gb}GB${NC}"
        echo ""
    else
        echo -e "${GREEN}✅ 磁盘空间充足 (${available_gb}GB 可用)${NC}"
        echo ""
    fi
}

prune_docker() {
    echo -e "${YELLOW}🧹 开始深度清理 Docker 资源...${NC}"
    echo ""
    
    # 检查清理前的使用情况
    echo -e "${BLUE}清理前的使用情况:${NC}"
    docker system df 2>/dev/null || echo "Docker 未运行"
    echo ""
    
    # 停止所有相关容器
    echo -e "${YELLOW}停止相关容器...${NC}"
    docker-compose --profile test --profile demo down 2>/dev/null || true
    docker-compose down 2>/dev/null || true
    
    # 深度清理
    echo -e "${YELLOW}清理未使用的容器、网络、镜像和构建缓存...${NC}"
    docker system prune -a --volumes -f
    
    # 清理 Docker 构建缓存
    echo -e "${YELLOW}清理构建缓存...${NC}"
    docker builder prune -a -f
    
    echo ""
    echo -e "${BLUE}清理后的使用情况:${NC}"
    docker system df 2>/dev/null || echo "Docker 未运行"
    echo ""
    echo -e "${GREEN}✅ Docker 资源清理完成！${NC}"
}

# 主逻辑
print_banner
check_requirements
setup_environment

case "$1" in
    "dev")
        start_development
        ;;
    "prod")
        start_production
        ;;
    "test")
        start_test
        ;;
    "demo")
        start_demo
        ;;
    "build")
        build_images
        ;;
    "stop")
        stop_services
        ;;
    "clean")
        clean_docker
        ;;
    "prune")
        prune_docker
        ;;
    "space")
        check_disk_space
        ;;
    "logs")
        show_logs "$@"
        ;;
    "shell")
        enter_shell "$@"
        ;;
    "status")
        show_status
        ;;
    "help"|"--help"|"-h")
        print_help
        ;;
    "")
        print_help
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        print_help
        exit 1
        ;;
esac 