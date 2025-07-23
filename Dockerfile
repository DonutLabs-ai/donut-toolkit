# ==============================================================================
# Build Stage - 用于构建 TypeScript 项目
# ==============================================================================
FROM node:20-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm@10.7.0

# 设置工作目录
WORKDIR /app

# 复制包配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./

# 复制所有包的 package.json 文件
COPY agentkit/package.json ./agentkit/
COPY server/package.json ./server/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm run build

# ==============================================================================
# Production Stage - 用于生产环境运行
# ==============================================================================
FROM node:20-alpine AS production

# 安装 pnpm
RUN npm install -g pnpm@10.7.0

WORKDIR /app

# 复制 package 配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# 复制各个包的 package.json
COPY agentkit/package.json ./agentkit/
COPY server/package.json ./server/

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建产物
COPY --from=builder /app/agentkit/dist ./agentkit/dist/
COPY --from=builder /app/server/dist ./server/dist/

# 复制必要的配置文件
COPY server/mcp-server.js ./server/
COPY server/claude_desktop_config.json ./server/

# 创建非 root 用户
RUN addgroup -g 1001 -S agentkit && \
    adduser -S agentkit -u 1001

# 更改所有权
RUN chown -R agentkit:agentkit /app
USER agentkit

# 暴露端口（MCP 服务器默认端口）
EXPOSE 3000

# 默认启动 MCP 服务器
CMD ["node", "server/mcp-server.js"]

# ==============================================================================
# Development Stage - 用于开发环境
# ==============================================================================
FROM node:20-alpine AS development

# 安装 pnpm 和开发工具
RUN npm install -g pnpm@10.7.0 nodemon

WORKDIR /app

# 复制包配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./

# 复制各个包的配置文件
COPY agentkit/package.json agentkit/tsconfig.json ./agentkit/
COPY server/package.json server/tsconfig.json ./server/

# 安装所有依赖（包括开发依赖）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 创建非 root 用户
RUN addgroup -g 1001 -S agentkit && \
    adduser -S agentkit -u 1001

# 更改所有权
RUN chown -R agentkit:agentkit /app
USER agentkit

# 暴露端口
EXPOSE 3000

# 开发模式启动
CMD ["pnpm", "run", "dev"] 