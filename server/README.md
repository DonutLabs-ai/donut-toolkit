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

## Usage

### Method 1: Using a Custom Wallet Provider

Create a custom wallet provider that integrates with your wallet service:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { 
  getMcpTools, 
  UnsignedTransactionWalletProvider 
} from "@coinbase/agentkit-model-context-protocol";
import { 
  walletActionProvider, 
  splActionProvider,
  Network 
} from "@coinbase/agentkit";

// Define your network
const network: Network = {
  protocolFamily: "evm",
  chainId: "1",
  networkId: "ethereum-mainnet",
};

// Create a custom wallet provider that returns unsigned transactions
const customWalletProvider = new UnsignedTransactionWalletProvider(
  "0xYourWalletAddress", 
  network
);

// Get MCP tools using your custom wallet provider
const { tools, toolHandler } = await getMcpTools({
  walletProvider: customWalletProvider,
  actionProviders: [
    walletActionProvider(),
    splActionProvider(), // Add other action providers as needed
  ],
});

const server = new Server(
  {
    name: "agentkit",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return toolHandler(request.params.name, request.params.arguments);
  } catch (error) {
    throw new Error(`Tool ${request.params.name} failed: ${error}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Method 2: Using Action Providers Directly

If you only need read-only actions (like price queries, DeFi data, etc.), you can use action providers directly:

```typescript
import { getMcpToolsFromProviders } from "@coinbase/agentkit-model-context-protocol";
import { 
  defillamaActionProvider,
  dexscreenerActionProvider 
} from "@coinbase/agentkit";

// Use only read-only action providers (no wallet required)
const { tools, toolHandler } = await getMcpToolsFromProviders([
  defillamaActionProvider(),
  dexscreenerActionProvider(),
]);

// Set up MCP server as above...
```

### Method 3: Using with an Existing AgentKit Instance

If you already have an AgentKit instance configured:

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { getMcpTools } from "@coinbase/agentkit-model-context-protocol";

// Your existing AgentKit instance
const agentKit = await AgentKit.from({
  walletProvider: yourExistingWalletProvider,
  actionProviders: yourActionProviders,
});

const { tools, toolHandler } = await getMcpTools(agentKit);

// Set up MCP server as above...
```

## Creating Your Own Wallet Provider

The `UnsignedTransactionWalletProvider` is a basic example. For production use, create your own wallet provider that integrates with your wallet service:

```typescript
import { WalletProvider, Network } from "@coinbase/agentkit";

export class YourCustomWalletProvider extends WalletProvider {
  private address: string;
  private network: Network;
  private walletService: YourWalletService;

  constructor(address: string, network: Network, walletService: YourWalletService) {
    super();
    this.address = address;
    this.network = network;
    this.walletService = walletService;
  }

  getAddress(): string {
    return this.address;
  }

  getNetwork(): Network {
    return this.network;
  }

  getName(): string {
    return "your-custom-wallet";
  }

  async getBalance(): Promise<bigint> {
    // Call your wallet service to get balance
    return this.walletService.getBalance(this.address);
  }

  async nativeTransfer(to: string, value: string): Promise<string> {
    // Create unsigned transaction via your wallet service
    const unsignedTx = await this.walletService.createUnsignedTransaction({
      from: this.address,
      to,
      value,
      chainId: this.network.chainId,
    });
    
    // Return base64 encoded unsigned transaction
    return this.walletService.encodeUnsignedTransaction(unsignedTx);
  }
}
```

## Available Action Providers

The MCP extension supports all AgentKit action providers:

- **Wallet Operations**: Transfer tokens, check balances
- **DeFi Protocols**: Jupiter, Meteora, SPL tokens
- **Price Data**: DexScreener, DefiLlama
- **NFTs**: Magic Eden, Solana NFTs
- **Analytics**: GoPlus security analysis
- **And many more...**

## Benefits

✅ **No CDP Dependency**: Use your own wallet service  
✅ **Flexible Integration**: Choose from multiple integration methods  
✅ **Security**: Transactions remain unsigned until you sign them  
✅ **Scalable**: Support for read-only operations without wallet requirements  

## Contributing

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for detailed setup instructions and contribution guidelines.
