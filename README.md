# 🍩 Donut Toolkits

基于 Coinbase AgentKit 的区块链 AI 代理工具包，专注于 Solana 生态系统的 DeFi 操作和数据查询。

## 📋 项目概述

Donut Toolkits 是一个综合性的区块链 AI 代理框架，提供了丰富的 Action Providers 来支持各种链上操作，包括代币交换、NFT 交易、数据查询、跨链桥接等功能。项目同时提供了 Model Context Protocol (MCP) 服务器支持，可与 Claude Desktop 等 AI 工具无缝集成。

### 🎯 主要特性

- **🟢 Solana 原生支持**: 钱包操作、SPL 代币转账、Jupiter 交换、Meteora 流动性等
- **🟡 数据查询服务**: DEX 数据、DeFi 协议信息、价格数据、安全分析等  
- **🟠 跨链桥接**: Wormhole 跨链、法币入金等
- **🔴 EVM 兼容**: X402 支付协议、以太坊操作等
- **🤖 MCP 服务器**: 与 Claude Desktop 等 AI 工具集成
- **🐳 Docker 支持**: 开箱即用的容器化部署
- **🔧 可扩展架构**: 易于添加自定义 Action Providers

### 🛠️ 技术栈

- **语言**: TypeScript
- **区块链**: Solana, Ethereum
- **包管理**: pnpm workspace
- **构建工具**: Turbo, Jest
- **容器化**: Docker, Docker Compose
- **协议支持**: Model Context Protocol (MCP)

## 📦 项目结构

```
donut-toolkits/
├── agentkit/                 # 核心 AgentKit 包
│   ├── src/
│   │   ├── action-providers/ # Action Provider 实现
│   │   │   ├── jupiter/      # Jupiter DEX 聚合器
│   │   │   ├── goplus/       # GoPlus 安全分析
│   │   │   ├── defillama/    # DeFiLlama 数据
│   │   │   ├── wallet/       # 钱包操作
│   │   │   ├── spl/          # SPL 代币操作
│   │   │   └── ...           # 更多 providers
│   │   ├── wallet-providers/ # 钱包提供者
│   │   └── utils.ts          # 工具函数
│   └── package.json
├── server/                   # MCP 服务器
│   ├── src/
│   │   └── index.ts          # MCP 服务器实现
│   ├── mcp-server.js         # 服务器入口
│   └── package.json
├── config/                   # 配置文件目录
├── output/                   # 输出目录
├── scripts/                  # 脚本文件
│   └── docker-start.sh       # Docker 启动脚本
├── Dockerfile                # Docker 镜像定义
├── docker-compose.yml        # Docker Compose 配置
├── DOCKER.md                 # Docker 部署指南
└── README.md                 # 项目文档
```

## 🔧 系统要求

### 基础要求
- **Node.js**: 20.x 或更高版本
- **pnpm**: 10.7.0 或更高版本
- **内存**: 至少 4GB
- **存储**: 至少 2GB 可用空间

### Docker 部署要求
- **Docker**: 20.10 或更高版本
- **Docker Compose**: 2.0 或更高版本

## 🚀 快速开始

### 方法一：本地开发环境

#### 1. 克隆项目

```bash
git clone <repository-url>
cd donut-toolkits
```

#### 2. 安装依赖

```bash
# 安装 pnpm (如果未安装)
npm install -g pnpm@10.7.0

# 安装项目依赖
pnpm install
```

#### 3. 环境配置

```bash
# 复制环境变量模板
cp config/example-config.json config/config.json

# 编辑配置文件
nano config/config.json
```

配置示例：
```json
{
  "SOLANA_PRIVATE_KEY": "your_base58_private_key",
  "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com",
  "MESSARI_API_KEY": "your_messari_api_key",
  "NODE_ENV": "development"
}
```

#### 4. 构建项目

```bash
# 构建所有包
pnpm run build

# 或者开发模式（支持热重载）
pnpm run dev
```

#### 5. 启动服务

```bash
# 启动 MCP 服务器
cd server
node mcp-server.js

# 或者使用开发模式
pnpm run dev
```

### 方法二：Docker 部署（推荐）

#### 1. 克隆项目

```bash
git clone <repository-url>
cd donut-toolkits
```

#### 2. 配置环境

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑环境变量
nano .env
```

#### 3. 启动服务

```bash
# 启动开发环境
./scripts/docker-start.sh dev

# 或者启动生产环境
./scripts/docker-start.sh prod
```

## 📖 使用指南

### 基础钱包操作

```typescript
import { 
  walletActionProvider,
  SolanaKeypairWalletProvider 
} from "@coinbase/agentkit";

// 创建钱包提供者
const walletProvider = new SolanaKeypairWalletProvider({
  keypair: process.env.SOLANA_PRIVATE_KEY!,
  rpcUrl: "https://api.mainnet-beta.solana.com",
  genesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
});

// 获取钱包详情
const provider = walletActionProvider();
const actions = provider.getActions(walletProvider);

const getDetailsAction = actions.find(a => a.name.includes("get_wallet_details"));
const details = await getDetailsAction?.invoke({});
console.log("钱包详情:", details);
```

### 代币交换（Jupiter）

```typescript
import { jupiterActionProvider } from "@coinbase/agentkit";

const provider = jupiterActionProvider();
const actions = provider.getActions(walletProvider);

const swapAction = actions.find(a => a.name.includes("swap"));
const result = await swapAction?.invoke({
  inputMint: "So11111111111111111111111111111111111111112", // SOL
  outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  amount: 0.001,
  slippageBps: 50
});
```

### 安全检查（GoPlus）

```typescript
import { goplusActionProvider } from "@coinbase/agentkit";

const provider = goplusActionProvider();
const actions = provider.getActions(null); // 不需要钱包

const securityAction = actions.find(a => a.name.includes("check_token_security"));
const security = await securityAction?.invoke({
  tokenAddress: "your_token_address"
});
```

### MCP 服务器集成

项目提供了完整的 MCP 服务器，可与 Claude Desktop 等工具集成：

```bash
# 启动 MCP 服务器
node server/mcp-server.js

# 服务器将在 http://localhost:3000 启动
```

## 🔧 开发指南

### 添加自定义 Action Provider

```typescript
import { ActionProvider, CreateAction } from "@coinbase/agentkit";
import { z } from "zod";

const MyActionSchema = z.object({
  message: z.string().describe("要处理的消息")
});

export class MyCustomActionProvider extends ActionProvider {
  constructor() {
    super("my-custom", []);
  }

  @CreateAction({
    name: "my_custom_action",
    description: "自定义操作",
    schema: MyActionSchema
  })
  async myCustomAction(
    walletProvider: any,
    args: z.infer<typeof MyActionSchema>
  ): Promise<string> {
    return `处理结果: ${args.message}`;
  }
}
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定 provider 测试
pnpm test -- --testNamePattern="Jupiter"

# 运行端到端测试
pnpm run test:e2e
```

### 代码格式化

```bash
# 检查代码格式
pnpm run format:check

# 自动格式化代码
pnpm run format

# 修复 ESLint 问题
pnpm run lint:fix
```

## 🐳 Docker 使用指南

项目提供了完整的 Docker 支持，详细信息请参考 [DOCKER.md](./DOCKER.md)。

### 常用 Docker 命令

```bash
# 构建镜像
./scripts/docker-start.sh build

# 启动开发环境
./scripts/docker-start.sh dev

# 启动生产环境
./scripts/docker-start.sh prod

# 查看日志
./scripts/docker-start.sh logs agentkit-dev

# 进入容器
./scripts/docker-start.sh shell agentkit-dev

# 停止服务
./scripts/docker-start.sh stop

# 清理环境
./scripts/docker-start.sh clean
```

## 🌐 API 服务

### MCP 服务器
- **地址**: http://localhost:3000
- **协议**: Model Context Protocol
- **用途**: 与 AI 工具集成

### 支持的区块链网络

- **Solana**: 主网、测试网、开发网
- **以太坊**: 主网、测试网
- **Base**: 主网、测试网

## 🔍 故障排除

### 常见问题

#### 1. 钱包连接失败
```bash
Error: Failed to connect to Solana network
```
**解决方案**:
- 检查 RPC URL 是否正确
- 确认网络连接
- 验证私钥格式（应为 Base58）

#### 2. 依赖安装失败
```bash
Error: EACCES permission denied
```
**解决方案**:
```bash
# 清理缓存
pnpm store prune

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 3. Docker 端口冲突
```bash
Error: Port 3000 is already in use
```
**解决方案**:
```bash
# 查看端口使用情况
lsof -i :3000

# 修改 docker-compose.yml 中的端口映射
ports:
  - "3001:3000"
```

#### 4. 内存不足
```bash
JavaScript heap out of memory
```
**解决方案**:
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=8192"

# 或在启动脚本中设置
NODE_OPTIONS="--max-old-space-size=8192" pnpm run dev
```

### 调试技巧

```bash
# 启用调试日志
export DEBUG="agentkit:*"

# 查看所有可用的 Actions
npx tsx -e "
import { jupiterActionProvider } from './agentkit/dist';
const provider = jupiterActionProvider();
console.log(provider.getActions(null).map(a => a.name));
"

# 检查环境变量
printenv | grep -E "(SOLANA|NODE_ENV)"
```

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

### 贡献流程

1. **Fork 项目**
   ```bash
   git clone https://github.com/your-username/donut-toolkits.git
   cd donut-toolkits
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/new-action-provider
   ```

3. **开发和测试**
   ```bash
   # 安装依赖
   pnpm install
   
   # 运行测试
   pnpm test
   
   # 检查代码格式
   pnpm run lint
   ```

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add new action provider for XYZ protocol"
   ```

5. **推送并创建 PR**
   ```bash
   git push origin feature/new-action-provider
   ```

### 代码规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 和 Prettier 配置
- 为新功能添加测试
- 更新相关文档

### 添加新的 Action Provider

1. 在 `agentkit/src/action-providers/` 中创建新目录
2. 实现 ActionProvider 类
3. 添加 schemas.ts 和测试文件
4. 更新 index.ts 导出
5. 添加 README.md 文档

## 📚 文档资源

- [Action Providers 文档](./agentkit/src/action-providers/README.md)
- [Docker 部署指南](./DOCKER.md)
- [Coinbase AgentKit 官方文档](https://github.com/coinbase/agentkit)
- [Model Context Protocol 规范](https://modelcontextprotocol.io/)

## 📄 许可证

本项目采用 Apache-2.0 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🆘 获取帮助

如果遇到问题或需要帮助：

1. 查看 [故障排除](#-故障排除) 部分
2. 搜索现有的 [GitHub Issues](https://github.com/your-repo/issues)
3. 创建新的 Issue 描述您的问题
4. 加入我们的社区讨论

## ⭐ 支持项目

如果这个项目对您有帮助，请给我们一个 ⭐️！

---

**注意**: 本项目仍在活跃开发中，API 可能会发生变化。请定期检查更新并查看 changelog。
