# AgentKit Action Providers

这个目录包含了 AgentKit 的所有 Action Providers，专注于 Solana 生态系统的区块链操作和数据查询。Action Providers 是可组合的模块，为 AI 代理提供特定的功能集合。

## 📁 项目结构

```
action-providers/
├── actionProvider.ts              # 基础 ActionProvider 抽象类
├── actionDecorator.ts             # @CreateAction 装饰器实现
├── customActionProvider.ts        # 自定义 Action Provider 工具
├── index.ts                      # 所有 Action Providers 的导出
├── ACTION_PROVIDERS_DOCUMENTATION.md  # 详细 API 文档
│
├── 🟢 Solana 原生 Providers
├── wallet/                       # 钱包基础操作
├── spl/                         # SPL 代币操作
├── jupiter/                     # Jupiter DEX 聚合器
├── meteora/                     # Meteora DLMM 协议
├── pumpfun/                     # Pumpfun 代币操作
├── magiceden/                   # Magic Eden NFT 市场
├── sns/                         # Solana 域名服务
├── solana-nft/                  # Solana NFT 操作
│
├── 🟡 数据查询 Providers (跨链兼容)
├── defillama/                   # DefiLlama 数据
├── dexscreener/                 # DEX 交易数据
├── messari/                     # Messari 市场分析
├── pyth/                        # Pyth 价格数据
├── allora/                      # Allora 网络数据
├── goplus/                      # GoPlus 安全分析
│
├── 🟠 跨链桥接 Providers
├── wormhole/                # Wormhole 跨链数据
├── onramp/                  # 法币入金服务
│
└── 🔴 EVM 专用 Providers
    └── x402/                    # X402 HTTP 支付协议 (Base)
```

## 🚀 快速开始

### 安装依赖

```bash
# 安装 AgentKit 核心包
npm install @coinbase/agentkit

# 安装特定 Action Provider 的依赖 (根据需要)
npm install @jup-ag/api                    # Jupiter
npm install @solana/web3.js               # Solana 操作
npm install @alloralabs/allora-sdk        # Allora
```

### 基础用法

#### 1. 单独使用 Action Providers

```typescript
import { 
  walletActionProvider, 
  splActionProvider,
  jupiterActionProvider
} from "@coinbase/agentkit";
import { SolanaKeypairWalletProvider } from "@coinbase/agentkit";

// 创建钱包提供者，可以创建一个新的钱包测试
const walletProvider = new SolanaKeypairWalletProvider({
  keypair: "your-base58-private-key",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  genesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
});

// 创建 Action Providers
const providers = [
  walletActionProvider(),
  splActionProvider(),
  jupiterActionProvider()
];

// 获取所有可用的 Actions
const allActions = providers.flatMap(provider => 
  provider.getActions(walletProvider)
);

// 执行特定的 Action
const walletAction = allActions.find(action => action.name === "get_wallet_details");
if (walletAction) {
  const result = await walletAction.invoke({});
  console.log("钱包详情:", result);
}
```

#### 2. 与 AgentKit 集成使用

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { 
  walletActionProvider,
  splActionProvider,
  jupiterActionProvider,
  dexscreenerActionProvider
} from "@coinbase/agentkit";

// 使用自定义钱包提供者创建 AgentKit
const agentKit = await AgentKit.from({
  walletProvider: yourCustomWalletProvider,
  actionProviders: [
    walletActionProvider(),
    splActionProvider(),
    jupiterActionProvider(),
    dexscreenerActionProvider(), // 只读数据查询
  ]
});

// 获取所有可用的 Actions
const actions = agentKit.getActions();
console.log(`可用的 Actions: ${actions.length} 个`);

// 执行代币交换
const swapAction = actions.find(action => action.name === "swap");
if (swapAction) {
  const result = await swapAction.invoke({
    inputMint: "So11111111111111111111111111111111111111112", // SOL
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    amount: 0.001,
    slippageBps: 50
  });
  console.log("交换结果:", result);
}
```

## 🔧 Action Provider 类型详解

### 🟢 Solana 原生 Providers

这些 Providers 直接与 Solana 区块链交互，需要钱包签名：

#### **WalletActionProvider**
```typescript
import { walletActionProvider } from "@coinbase/agentkit";

const provider = walletActionProvider();

// 可用 Actions:
// - get_wallet_details: 获取钱包信息和余额
// - native_transfer: 转账 SOL
```

#### **SPLActionProvider**
```typescript
import { splActionProvider } from "@coinbase/agentkit";

const provider = splActionProvider();

// 可用 Actions:
// - get_balance: 获取 SPL 代币余额
// - transfer_token: 转账 SPL 代币
```

#### **JupiterActionProvider**
```typescript
import { jupiterActionProvider } from "@coinbase/agentkit";

const provider = jupiterActionProvider();

// 可用 Actions:
// - swap: 通过 Jupiter 进行代币交换
```

### 🟡 数据查询 Providers

这些 Providers 只进行数据查询，不需要钱包签名：

#### **DexscreenerActionProvider**
```typescript
import { dexscreenerActionProvider } from "@coinbase/agentkit";

const provider = dexscreenerActionProvider();

// 可用 Actions:
// - get_token_data: 获取代币信息和价格
// - search_tokens: 搜索代币
```

#### **DefillamaActionProvider**
```typescript
import { defillamaActionProvider } from "@coinbase/agentkit";

const provider = defillamaActionProvider();

// 可用 Actions:
// - get_defi_protocols: 获取 DeFi 协议信息
// - get_protocol_tvl: 获取协议 TVL 数据
```

## 🛠️ 创建自定义 Action Provider

### 方法 1: 继承 ActionProvider 类

```typescript
import { ActionProvider } from "@coinbase/agentkit";
import { CreateAction } from "@coinbase/agentkit";
import { z } from "zod";

// 定义 Schema
const MyActionSchema = z.object({
  message: z.string().describe("要处理的消息")
});

export class MyCustomActionProvider extends ActionProvider {
  constructor() {
    super("my-custom", []); // 名称和子 providers
  }

  @CreateAction({
    name: "my_custom_action",
    description: "这是我的自定义操作",
    schema: MyActionSchema
  })
  async myCustomAction(
    walletProvider: WalletProvider,
    args: z.infer<typeof MyActionSchema>
  ): Promise<string> {
    const { message } = args;
    
    // 自定义逻辑
    const result = await this.processMessage(message);
    
    return `处理结果: ${result}`;
  }

  private async processMessage(message: string): Promise<string> {
    // 实现您的业务逻辑
    return `已处理消息: ${message}`;
  }
}

// 使用自定义 Provider
const customProvider = new MyCustomActionProvider();
```

### 方法 2: 使用 CustomActionProvider 工具

```typescript
import { customActionProvider } from "@coinbase/agentkit";
import { z } from "zod";

const myProvider = customActionProvider([
  {
    name: "hello_world",
    description: "简单的问候功能",
    schema: z.object({
      name: z.string().describe("姓名")
    }),
    invoke: async (args) => {
      return `Hello, ${args.name}!`;
    }
  },
  {
    name: "get_wallet_info",
    description: "获取钱包基础信息",
    schema: z.object({}),
    invoke: async (walletProvider, args) => {
      return `钱包地址: ${walletProvider.getAddress()}`;
    }
  }
]);
```

## 📋 运行示例

### 示例 1: 基础钱包操作

```typescript
// examples/basic-wallet.ts
import { 
  walletActionProvider,
  SolanaKeypairWalletProvider 
} from "@coinbase/agentkit";

async function basicWalletExample() {
  // 创建钱包提供者
  const walletProvider = new SolanaKeypairWalletProvider({
    keypair: process.env.SOLANA_PRIVATE_KEY!, // Base58 格式
    rpcUrl: "https://api.mainnet-beta.solana.com",
    genesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
  });

  // 创建钱包 Action Provider
  const provider = walletActionProvider();
  const actions = provider.getActions(walletProvider);

  // 获取钱包详情
  const getDetailsAction = actions.find(a => a.name.includes("get_wallet_details"));
  if (getDetailsAction) {
    const details = await getDetailsAction.invoke({});
    console.log("钱包详情:", details);
  }

  // 转账 SOL
  const transferAction = actions.find(a => a.name.includes("native_transfer"));
  if (transferAction) {
    const result = await transferAction.invoke({
      to: "目标地址",
      value: "0.001" // SOL 数量
    });
    console.log("转账结果:", result);
  }
}

// 运行示例
basicWalletExample().catch(console.error);
```

### 示例 2: 代币交换 (Jupiter)

```typescript
// examples/jupiter-swap.ts
import { 
  jupiterActionProvider,
  SolanaKeypairWalletProvider 
} from "@coinbase/agentkit";

async function jupiterSwapExample() {
  const walletProvider = new SolanaKeypairWalletProvider({
    keypair: process.env.SOLANA_PRIVATE_KEY!,
    rpcUrl: "https://api.mainnet-beta.solana.com",
    genesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
  });

  const provider = jupiterActionProvider();
  const actions = provider.getActions(walletProvider);

  const swapAction = actions.find(a => a.name.includes("swap"));
  if (swapAction) {
    const result = await swapAction.invoke({
      inputMint: "So11111111111111111111111111111111111111112", // SOL
      outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      amount: 0.001, // 0.001 SOL
      slippageBps: 50 // 0.5% 滑点
    });
    console.log("交换结果:", result);
  }
}

jupiterSwapExample().catch(console.error);
```

### 示例 3: 只读数据查询

```typescript
// examples/readonly-data.ts
import { 
  dexscreenerActionProvider,
  defillamaActionProvider 
} from "@coinbase/agentkit";

async function readOnlyDataExample() {
  // 这些 providers 不需要钱包提供者
  const dexProvider = dexscreenerActionProvider();
  const defiProvider = defillamaActionProvider();

  // 获取 Actions (传入 null 作为钱包提供者)
  const dexActions = dexProvider.getActions(null as any);
  const defiActions = defiProvider.getActions(null as any);

  // 查询代币数据
  const tokenAction = dexActions.find(a => a.name.includes("get_token_data"));
  if (tokenAction) {
    const tokenData = await tokenAction.invoke({
      tokenAddress: "So11111111111111111111111111111111111111112" // SOL
    });
    console.log("代币数据:", tokenData);
  }

  // 查询 DeFi 协议
  const protocolAction = defiActions.find(a => a.name.includes("get_defi_protocols"));
  if (protocolAction) {
    const protocols = await protocolAction.invoke({});
    console.log("DeFi 协议:", protocols);
  }
}

readOnlyDataExample().catch(console.error);
```

## 🏃‍♂️ 运行指令

### 设置环境变量

```bash
# .env 文件
SOLANA_PRIVATE_KEY=your_base58_private_key
MESSARI_API_KEY=your_messari_api_key
```

### 运行示例

```bash
# 运行基础示例
npx tsx examples/basic-wallet.ts

# 运行 Jupiter 交换示例
npx tsx examples/jupiter-swap.ts

# 运行只读数据查询示例
npx tsx examples/readonly-data.ts

# 运行特定 provider 的测试
npx tsx src/action-providers/jupiter/test-jupiter-swap.ts
```

### 测试所有 Providers

```bash
# 运行所有测试
npm test

# 运行特定 provider 测试
npm test -- --testNamePattern="Jupiter"
npm test -- --testNamePattern="SPL"

# 运行集成测试
npm run test:e2e
```

## 🔍 调试和故障排除

### 常见问题

1. **钱包连接失败**
   ```bash
   Error: Failed to connect to Solana network
   ```
   - 检查 RPC URL 是否正确
   - 确认网络连接
   - 验证私钥格式 (应为 Base58)

2. **Action 找不到**
   ```bash
   Error: Action 'swap' not found
   ```
   - 确认 Action Provider 已正确导入
   - 检查网络兼容性
   - 验证 Action 名称 (使用 `.getActions()` 查看所有可用 Actions)

3. **权限不足**
   ```bash
   Error: Transaction failed: insufficient funds
   ```
   - 检查钱包余额
   - 确认代币余额足够
   - 验证交易参数

### 调试技巧

```typescript
// 列出所有可用的 Actions
const provider = jupiterActionProvider();
const actions = provider.getActions(walletProvider);
console.log("可用 Actions:", actions.map(a => a.name));

// 查看 Action 的 Schema
const swapAction = actions.find(a => a.name.includes("swap"));
console.log("Swap Action Schema:", swapAction?.schema);

// 启用详细日志
process.env.DEBUG = "agentkit:*";
```

## 📚 更多资源

- [ACTION_PROVIDERS_DOCUMENTATION.md](./ACTION_PROVIDERS_DOCUMENTATION.md) - 完整 API 文档
- [Jupiter API 文档](https://station.jup.ag/docs/apis/swap-api)
- [Solana Web3.js 文档](https://solana-labs.github.io/solana-web3.js/)
- [AgentKit 主文档](../../README.md)

## 🤝 贡献指南

1. **添加新的 Action Provider**
   - 创建新目录: `src/action-providers/your-provider/`
   - 实现 ActionProvider 类
   - 添加 schemas.ts 和 tests
   - 更新 index.ts 导出

2. **添加新的 Action**
   - 在相应的 Provider 中添加方法
   - 使用 `@CreateAction` 装饰器
   - 定义 Zod Schema
   - 添加测试用例

3. **文档更新**
   - 更新 README.md
   - 更新 ACTION_PROVIDERS_DOCUMENTATION.md
   - 添加使用示例
