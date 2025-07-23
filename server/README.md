# AgentKit Extension - Model Context Protocol (MCP)

Anthropic Model Context Protocol (MCP) extension of AgentKit. Enables agentic workflows to interact with onchain actions using your own wallet service.

## Setup

### Prerequisites

- Node.js 18 or higher
- Your own wallet service that handles transaction signing

### Installation

```bash
npm install @coinbase/agentkit-model-context-protocol @coinbase/agentkit @modelcontextprotocol/sdk
```

## Quick Start Guide

### Simplified Server Startup

我们已经将多个启动相关的文件整合为一个统一的 `mcp-server.js` 文件，简化了管理和维护。

#### 核心文件

- **`mcp-server.js`** - 集成的MCP服务器启动文件（合并了原 `start-server.js` 和 `mcp-start.sh` 的功能）
- **`claude_desktop_config.json`** - Claude Desktop配置文件
- **`package.json`** - 项目依赖和脚本配置

#### 启动方式

##### 1. 直接启动
```bash
node mcp-server.js
```

##### 2. Claude Desktop 启动
配置文件已自动更新，Claude Desktop 将直接调用 `mcp-server.js`

#### 功能特性

- **环境自动设置** - 自动切换到正确的工作目录
- **增强日志记录** - 同时输出到 stderr 和日志文件 (`/tmp/agentkit-mcp.log`)
- **优雅关闭** - 支持 SIGINT 和 SIGTERM 信号处理
- **错误处理** - 完整的错误捕获和日志记录
- **Action Providers** - 集成了 DeFiLlama 和 DexScreener 等功能

#### 日志查看

```bash
# 查看实时日志
tail -f /tmp/agentkit-mcp.log

# 查看最近的日志
cat /tmp/agentkit-mcp.log
```

#### 故障排除

1. **权限问题** - 确保文件有执行权限：`chmod +x mcp-server.js`
2. **依赖问题** - 运行 `npm install` 安装所需依赖
3. **路径问题** - 确保在 server 目录下运行，或使用绝对路径

