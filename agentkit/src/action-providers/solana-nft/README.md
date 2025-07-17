# Solana NFT Action Provider

Solana NFT Action Provider 为 Coinbase AgentKit 提供了与 Solana NFT 的集成功能。

## 功能特性

- 🔍 **获取 NFT 信息** - 查询 NFT 的详细元数据和所有权信息
- 📤 **NFT 转移** - 创建 NFT 转移的未签名交易
- 🔐 **安全第一** - 返回未签名交易，由用户控制签名过程
- 🌐 **支持 Solana** - 专为 Solana 生态系统设计
- 🔀 **支持多种 NFT 类型** - 兼容常规 NFT 和压缩 NFT (cNFT)

## 支持的 Actions

### 1. `get_nft_info`
获取指定 NFT 的详细信息和元数据。

**参数:**
- `assetId` (string): NFT 的 mint 地址
- `address` (string, 可选): 要检查 NFT 所有权的地址，默认使用连接的钱包地址

**返回:** JSON 格式的 NFT 信息，包含：
- NFT 基本信息（名称、符号、描述、图片等）
- 所有权信息
- 元数据属性
- 创建者和版税信息
- 集合信息

### 2. `transfer_nft`
创建 NFT 转移的未签名交易。

**参数:**
- `recipient` (string): 接收者的 Solana 地址
- `assetId` (string): NFT 的 mint 地址

**返回:** 包含未签名交易数据的 JSON 对象。

## 安装和配置

### 1. 基本配置

```typescript
import { AgentKit, solanaNftActionProvider } from "@coinbase/agentkit";

const agentKit = await AgentKit.from({
  cdpApiKeyId: process.env.CDP_API_KEY_ID,
  cdpApiKeySecret: process.env.CDP_API_KEY_SECRET,
  cdpWalletSecret: process.env.CDP_WALLET_SECRET,
  actionProviders: [
    solanaNftActionProvider(), // 使用默认配置
  ]
});
```

### 2. 高级配置

```typescript
import { solanaNftActionProvider } from "@coinbase/agentkit";

const nftProvider = solanaNftActionProvider({
  rpcUrl: "https://api.mainnet-beta.solana.com", // 可选的自定义 RPC 端点
  timeout: 30000, // 请求超时时间（毫秒）
});
```

## 使用示例

### 获取 NFT 信息

```typescript
// 检查当前钱包拥有的 NFT
const nftInfo = await agentKit.run("获取 NFT 信息", {
  assetId: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
});

// 检查特定地址拥有的 NFT
const nftInfo = await agentKit.run("获取 NFT 信息", {
  assetId: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
});
```

### 转移 NFT

```typescript
const result = await agentKit.run("转移 NFT", {
  recipient: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  assetId: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
});

// 返回的结果包含未签名交易
const { unsignedTransaction, requiresBlockhashUpdate } = JSON.parse(result);
```

## 网络支持

- **Solana Mainnet**: 完全支持
- **Solana Devnet**: 完全支持  
- **Solana Testnet**: 完全支持
- **其他网络**: 不支持（仅限 Solana）

## 重要说明

### 安全性
- 所有操作都返回**未签名交易**，需要用户手动签名
- 用户完全控制交易的签名和广播过程
- 建议在签名前验证交易内容

### Blockhash 更新
- 返回的未签名交易使用占位符 blockhash
- **必须**在签名前更新为最新的 blockhash
- 这是 Solana 网络的安全要求

### NFT 类型支持
- **常规 NFT**: 使用标准 SPL Token 转移
- **压缩 NFT (cNFT)**: 如果可用，使用 Metaplex Bubblegum 协议
- 自动检测 NFT 类型并选择合适的转移方法

## 错误处理

该 Action Provider 包含完善的错误处理：

- **网络错误**: 自动重试机制
- **无效地址**: 详细的验证错误信息
- **NFT 不存在**: 明确的错误提示
- **所有权验证**: 转移前检查 NFT 所有权
- **元数据获取失败**: 优雅降级，返回基本信息

## 技术架构

### 依赖项
- `@solana/web3.js`: 核心 Solana 功能
- `@solana/spl-token`: SPL Token 支持
- `@metaplex-foundation/*` (可选): 压缩 NFT 和元数据支持

### 设计模式
- 继承自 `ActionProvider<SvmWalletProvider>`
- 使用 `@CreateAction` 装饰器定义操作
- 基于 zod schema 的参数验证
- 返回序列化的 JSON 结果

## 开发指南

### 添加新功能

1. 在 `schemas.ts` 中定义新的 schema
2. 在 `types.ts` 中添加相关类型定义
3. 在 `solanaNftActionProvider.ts` 中实现新的方法
4. 使用 `@CreateAction` 装饰器注册操作
5. 更新 `index.ts` 导出

### 测试

```bash
# 运行单元测试
npm test

# 运行集成测试
npm run test:integration
```

## 故障排除

### 常见问题

1. **"NFT not found"**: 确认 assetId 是有效的 NFT mint 地址
2. **"Network not supported"**: 确保使用 Solana 网络
3. **"Transaction failed"**: 检查 blockhash 是否已更新
4. **"Insufficient funds"**: 确保账户有足够的 SOL 支付交易费用

### 调试模式

```typescript
// 启用详细日志
const provider = solanaNftActionProvider({
  timeout: 60000, // 增加超时时间以便调试
});
```

## 更多资源

- [Solana NFT 标准](https://docs.metaplex.com/programs/token-metadata/)
- [Coinbase AgentKit 文档](https://docs.cdp.coinbase.com/agentkit/)
- [Solana Web3.js 文档](https://solana-labs.github.io/solana-web3.js/) 