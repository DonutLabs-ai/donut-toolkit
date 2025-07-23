# 🐳 AgentKit Docker 部署指南

本指南帮助您快速使用 Docker 部署和运行 AgentKit 项目。

## 📋 前置要求

- Docker (版本 20.10 或更高)
- Docker Compose (版本 2.0 或更高)
- 至少 4GB 可用内存
- 至少 2GB 可用磁盘空间

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd donut-toolkits
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件，填入您的配置
nano .env
```

### 3. 启动服务

使用提供的启动脚本：

```bash
# 启动开发环境
./scripts/docker-start.sh dev

# 或者启动生产环境
./scripts/docker-start.sh prod
```

## 🛠️ 使用方式

### 开发环境

开发环境包含热重载功能，代码修改会自动重新构建：

```bash
# 启动开发环境
./scripts/docker-start.sh dev

# 查看开发环境日志
./scripts/docker-start.sh logs agentkit-dev

# 进入开发容器 shell
./scripts/docker-start.sh shell agentkit-dev
```

### 生产环境

生产环境运行优化构建的应用：

```bash
# 启动生产环境
./scripts/docker-start.sh prod

# 查看生产环境日志
./scripts/docker-start.sh logs agentkit-mcp-server
```

### CLI 工具

使用 CLI 工具创建新的链上代理：

```bash
# 创建新代理
./scripts/docker-start.sh cli create-agent

# 或直接使用 docker-compose
docker-compose --profile cli run --rm agentkit-cli create-agent
```

## 📁 目录结构

Docker 部署会创建以下目录结构：

```
donut-toolkits/
├── config/          # 配置文件目录
├── output/          # CLI 工具输出目录
├── logs/            # 日志文件目录
├── Dockerfile       # Docker 镜像定义
├── docker-compose.yml  # Docker Compose 配置
├── .env             # 环境变量文件
└── scripts/
    └── docker-start.sh  # 启动脚本
```

## ⚙️ 环境配置

主要的环境变量配置：

```bash
# 基本配置
NODE_ENV=development
MCP_SERVER_PORT=3000

# Solana 配置
SOLANA_PRIVATE_KEY=your_solana_private_key

# OpenAI 配置 (可选)
OPENAI_API_KEY=your_openai_api_key
```

详细配置说明请参考 `.env.example` 文件。

## 🔧 Docker Compose 配置

项目提供三种配置模式：

### 1. 开发模式 (development profile)

- 支持热重载
- 挂载源代码目录
- 包含开发工具

```bash
docker-compose --profile development up
```

### 2. 生产模式 (production profile)

- 优化构建
- 最小化镜像大小
- 自动重启

```bash
docker-compose --profile production up
```

### 3. CLI 模式 (cli profile)

- 运行一次性 CLI 命令
- 适用于工具和脚本执行

```bash
docker-compose --profile cli run --rm agentkit-cli [command]
```

## 🌐 服务访问

- **MCP 服务器**: http://localhost:3000
- **开发环境日志**: `./scripts/docker-start.sh logs agentkit-dev`
- **生产环境日志**: `./scripts/docker-start.sh logs agentkit-mcp-server`

## 📝 常用命令

```bash
# 查看所有可用命令
./scripts/docker-start.sh help

# 构建镜像
./scripts/docker-start.sh build

# 停止所有服务
./scripts/docker-start.sh stop

# 清理容器和镜像
./scripts/docker-start.sh clean

# 查看容器状态
docker-compose ps

# 重启服务
docker-compose restart
```

## 🛠️ 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口使用情况
   lsof -i :3000
   
   # 修改 docker-compose.yml 中的端口映射
   ports:
     - "3001:3000"  # 使用不同的主机端口
   ```

2. **内存不足**
   ```bash
   # 检查 Docker 内存限制
   docker system df
   
   # 清理未使用的镜像和容器
   docker system prune -a
   ```

3. **权限问题**
   ```bash
   # 确保启动脚本有执行权限
   chmod +x scripts/docker-start.sh
   
   # 检查文件所有权
   sudo chown -R $USER:$USER .
   ```

4. **环境变量未加载**
   ```bash
   # 确保 .env 文件存在且格式正确
   cat .env
   
   # 重新构建容器
   ./scripts/docker-start.sh build
   ```

### 调试技巧

```bash
# 进入运行中的容器
docker exec -it agentkit-dev /bin/sh

# 查看容器日志
docker logs agentkit-dev --follow

# 检查容器内环境变量
docker exec agentkit-dev env
```

## 🔒 安全注意事项

1. **不要将私钥提交到版本控制**
   - `.env` 文件已在 `.gitignore` 中排除
   - 使用安全的密钥管理方案

2. **生产环境部署**
   - 使用 HTTPS
   - 配置防火墙
   - 定期更新镜像

3. **访问控制**
   - 限制容器网络访问
   - 使用非 root 用户运行

## 📚 更多资源

- [AgentKit 文档](./README.md)
- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 参考](https://docs.docker.com/compose/)

## 🆘 获取帮助

如果遇到问题：

1. 查看日志：`./scripts/docker-start.sh logs [container-name]`
2. 检查 GitHub Issues
3. 联系技术支持

---

**提示**: 首次运行可能需要较长时间下载依赖和构建镜像，请耐心等待。 