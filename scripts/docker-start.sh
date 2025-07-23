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
    echo "  dev         启动开发环境"
    echo "  prod        启动生产环境"
    echo "  cli         运行 CLI 工具"
    echo "  build       构建 Docker 镜像"
    echo "  stop        停止所有容器"
    echo "  clean       清理容器和镜像"
    echo "  logs        查看日志"
    echo "  shell       进入容器 shell"
    echo "  help        显示此帮助信息"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  $0 dev                    # 启动开发环境"
    echo "  $0 prod                   # 启动生产环境"
    echo "  $0 cli create-agent       # 运行 CLI 创建代理"
    echo "  $0 logs agentkit-dev      # 查看开发环境日志"
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
        if [ -f .env.example ]; then
            cp .env.example .env
            echo -e "${GREEN}已创建 .env 文件，请编辑配置后重新运行${NC}"
            exit 1
        else
            echo -e "${RED}错误: 未找到 .env.example 文件${NC}"
            exit 1
        fi
    fi

    # 创建必要的目录
    mkdir -p config output logs
}

start_development() {
    echo -e "${GREEN}启动开发环境...${NC}"
    docker-compose --profile development up --build -d
    echo -e "${GREEN}开发环境已启动！${NC}"
    echo -e "${BLUE}访问地址: http://localhost:3000${NC}"
    echo -e "${YELLOW}查看日志: $0 logs agentkit-dev${NC}"
}

start_production() {
    echo -e "${GREEN}启动生产环境...${NC}"
    docker-compose --profile production up --build -d
    echo -e "${GREEN}生产环境已启动！${NC}"
    echo -e "${BLUE}访问地址: http://localhost:3000${NC}"
    echo -e "${YELLOW}查看日志: $0 logs agentkit-mcp-server${NC}"
}

run_cli() {
    echo -e "${GREEN}运行 CLI 工具...${NC}"
    shift # 移除 'cli' 参数
    docker-compose --profile cli run --rm agentkit-cli "$@"
}

build_images() {
    echo -e "${GREEN}构建 Docker 镜像...${NC}"
    docker-compose build
    echo -e "${GREEN}镜像构建完成！${NC}"
}

stop_services() {
    echo -e "${YELLOW}停止所有服务...${NC}"
    docker-compose --profile development --profile production --profile cli down
    echo -e "${GREEN}所有服务已停止${NC}"
}

clean_docker() {
    echo -e "${YELLOW}清理 Docker 容器和镜像...${NC}"
    docker-compose --profile development --profile production --profile cli down --rmi all --volumes --remove-orphans
    echo -e "${GREEN}清理完成${NC}"
}

show_logs() {
    if [ -z "$2" ]; then
        echo -e "${YELLOW}请指定容器名称${NC}"
        echo "可用容器: agentkit-dev, agentkit-mcp-server, agentkit-cli"
        exit 1
    fi
    docker-compose logs -f "$2"
}

enter_shell() {
    container_name="${2:-agentkit-dev}"
    echo -e "${GREEN}进入容器 $container_name shell...${NC}"
    docker exec -it "$container_name" /bin/sh
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
    "cli")
        run_cli "$@"
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
    "logs")
        show_logs "$@"
        ;;
    "shell")
        enter_shell "$@"
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