# ==============================================================================
# AgentKit Docker Makefile
# ==============================================================================

.PHONY: help dev prod cli build stop clean logs shell setup test

# 默认目标
.DEFAULT_GOAL := help

# 颜色定义
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

# 项目配置
PROJECT_NAME := agentkit
DOCKER_COMPOSE := docker-compose

help: ## 显示帮助信息
	@echo "$(BLUE)AgentKit Docker 管理命令$(NC)"
	@echo ""
	@echo "$(YELLOW)使用方法:$(NC)"
	@echo "  make <target>"
	@echo ""
	@echo "$(YELLOW)可用命令:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## 初始化项目环境
	@echo "$(YELLOW)初始化 AgentKit Docker 环境...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(GREEN)复制环境变量模板...$(NC)"; \
		cp .env.example .env; \
		echo "$(YELLOW)请编辑 .env 文件配置您的环境变量$(NC)"; \
	else \
		echo "$(GREEN).env 文件已存在$(NC)"; \
	fi
	@mkdir -p config output logs
	@echo "$(GREEN)环境初始化完成！$(NC)"

dev: setup ## 启动开发环境
	@echo "$(GREEN)启动开发环境...$(NC)"
	@$(DOCKER_COMPOSE) --profile development up --build -d
	@echo "$(GREEN)开发环境已启动！访问: http://localhost:3000$(NC)"

prod: setup ## 启动生产环境
	@echo "$(GREEN)启动生产环境...$(NC)"
	@$(DOCKER_COMPOSE) --profile production up --build -d
	@echo "$(GREEN)生产环境已启动！访问: http://localhost:3000$(NC)"

cli: setup ## 运行 CLI 工具 (使用: make cli ARGS="create-agent")
	@echo "$(GREEN)运行 CLI 工具...$(NC)"
	@$(DOCKER_COMPOSE) --profile cli run --rm agentkit-cli $(ARGS)

build: ## 构建 Docker 镜像
	@echo "$(GREEN)构建 Docker 镜像...$(NC)"
	@$(DOCKER_COMPOSE) build
	@echo "$(GREEN)镜像构建完成！$(NC)"

stop: ## 停止所有服务
	@echo "$(YELLOW)停止所有服务...$(NC)"
	@$(DOCKER_COMPOSE) --profile development --profile production --profile cli down
	@echo "$(GREEN)所有服务已停止$(NC)"

clean: ## 清理容器和镜像
	@echo "$(RED)清理 Docker 容器和镜像...$(NC)"
	@$(DOCKER_COMPOSE) --profile development --profile production --profile cli down --rmi all --volumes --remove-orphans
	@echo "$(GREEN)清理完成$(NC)"

logs: ## 查看日志 (使用: make logs SERVICE=agentkit-dev)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(YELLOW)请指定服务名称，例如: make logs SERVICE=agentkit-dev$(NC)"; \
		echo "可用服务: agentkit-dev, agentkit-mcp-server, agentkit-cli"; \
	else \
		$(DOCKER_COMPOSE) logs -f $(SERVICE); \
	fi

shell: ## 进入容器 shell (使用: make shell SERVICE=agentkit-dev)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(GREEN)进入默认开发容器 shell...$(NC)"; \
		docker exec -it agentkit-dev /bin/sh; \
	else \
		echo "$(GREEN)进入容器 $(SERVICE) shell...$(NC)"; \
		docker exec -it $(SERVICE) /bin/sh; \
	fi

test: ## 运行测试
	@echo "$(GREEN)运行测试...$(NC)"
	@$(DOCKER_COMPOSE) exec agentkit-dev pnpm run test

status: ## 查看容器状态
	@echo "$(BLUE)容器状态:$(NC)"
	@$(DOCKER_COMPOSE) ps

restart: ## 重启服务 (使用: make restart SERVICE=agentkit-dev)
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(YELLOW)重启所有服务...$(NC)"; \
		$(DOCKER_COMPOSE) restart; \
	else \
		echo "$(YELLOW)重启服务 $(SERVICE)...$(NC)"; \
		$(DOCKER_COMPOSE) restart $(SERVICE); \
	fi

# 开发相关命令
dev-logs: ## 查看开发环境日志
	@$(DOCKER_COMPOSE) logs -f agentkit-dev

prod-logs: ## 查看生产环境日志
	@$(DOCKER_COMPOSE) logs -f agentkit-mcp-server

dev-shell: ## 进入开发环境 shell
	@docker exec -it agentkit-dev /bin/sh

# 实用命令
prune: ## 清理未使用的 Docker 资源
	@echo "$(RED)清理未使用的 Docker 资源...$(NC)"
	@docker system prune -a --volumes
	@echo "$(GREEN)清理完成$(NC)"

update: ## 更新项目和重新构建
	@echo "$(YELLOW)更新项目...$(NC)"
	@git pull
	@make build
	@echo "$(GREEN)更新完成$(NC)"

# 健康检查
health: ## 检查服务健康状态
	@echo "$(BLUE)检查服务健康状态...$(NC)"
	@curl -f http://localhost:3000/health || echo "$(RED)服务不可用$(NC)"

# 快速命令组合
quick-start: setup build dev ## 一键启动 (初始化 + 构建 + 开发环境)
	@echo "$(GREEN)AgentKit 已启动！$(NC)"

quick-clean: stop clean ## 一键清理 (停止 + 清理)
	@echo "$(GREEN)清理完成！$(NC)" 