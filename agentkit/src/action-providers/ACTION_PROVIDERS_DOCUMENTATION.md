# AgentKit Action Providers 完整文档

本文档详细列出了 AgentKit 中所有可用的 Action Providers 及其支持的 Actions。

## 📊 总览统计

| **指标** | **数量** |
|----------|----------|
| **总计 Action Providers** | 22 |
| **总计 Actions** | 47 |
| **读操作 (查询)** | 31 |
| **写操作 (需签名)** | 16 |
| **仅 EVM 网络** | 2 |
| **仅 SVM 网络** | 13 |
| **网络无关** | 6 |
| **多网络支持** | 1 |

## 📋 图标说明

### Action 类型
- 🔐 **需要钱包签名** - 涉及区块链交易的写操作，需要用户钱包签名
- 📖 **仅查询操作** - 只读操作，不需要钱包签名，用于获取信息
- 🔧 **模板示例** - 开发模板，仅用于参考实现

### 网络兼容性
- 🟢 **Solana 原生** - 完全支持 SVM 网络，推荐使用
- 🟡 **数据通用** - 跨链数据查询，网络无关
- 🟠 **跨链桥接** - 支持多网络，包含 Solana 支持
- 🔴 **外部网络** - 仅支持 EVM 网络

## 🗂️ Action Providers 总览

| **Provider** | **网络支持** | **Actions 数量** | **读操作** | **写操作** | **API 密钥要求** | **主要功能** |
|--------------|--------------|------------------|------------|------------|------------------|-------------|
| **Allora** 🟡 | Network-agnostic | 3 | 3 | 0 | 无 | 预测市场数据查询 |
| **DefiLlama** 🟡 | Network-agnostic | 3 | 3 | 0 | 无 | DeFi 协议数据查询 |
| **DexScreener** 🟠 | Multi-network | 3 | 3 | 0 | 无 | 代币交易对数据 |
| **Drift** 🔧 | SVM only | 1 | 0 | 0 | 无 | 开发模板 |
| **GoPlus** 🟡 | Network-agnostic | 5 | 5 | 0 | 无 | 安全分析工具 |
| **Jupiter** 🟢 | SVM (mainnet) | 1 | 0 | 1 | 无 | DEX 聚合交易 |
| **Magic Eden** 🟢 | SVM (mainnet) | 3 | 2 | 1 | MAGIC_EDEN_API_KEY (可选) | NFT 市场交易 |
| **Messari** 🟡 | Network-agnostic | 1 | 1 | 0 | MESSARI_API_KEY | 加密市场研究 |
| **Meteora** 🟢 | SVM (mainnet/devnet) | 6 | 4 | 2 | 无 | 流动性挖矿 (DLMM) |
| **Onramp** 🔴 | EVM only | 1 | 1 | 0 | projectId | 法币入金服务 |
| **Pump.fun** 🟢 | SVM (mainnet) | 3 | 0 | 3 | 无 | Meme 代币创建/交易 |
| **Pyth** 🟡 | Network-agnostic | 2 | 2 | 0 | 无 | 价格预言机数据 |
| **Sanctum** 🔧 | SVM only | 1 | 0 | 0 | 无 | 开发模板 |
| **SNS** 🟢 | SVM only | 4 | 4 | 0 | 无 | Solana 域名服务 |
| **Solana NFT** 🟢 | SVM only | 2 | 1 | 1 | 无 | NFT 操作工具 |
| **Solayer** 🔧 | SVM only | 1 | 0 | 0 | 无 | 开发模板 |
| **SPL Token** 🟢 | SVM only | 2 | 1 | 1 | 无 | SPL 代币操作 |
| **Voltr** 🔧 | SVM only | 1 | 0 | 0 | 无 | 开发模板 |
| **Wallet** 🟡 | Network-agnostic | 2 | 1 | 1 | 无 | 钱包基础操作 |
| **Wormhole** 🟠 | Multi-network | 4 | 4 | 0 | 无 | 跨链数据查询 |
| **X402** 🔴 | EVM (Base) | 1 | 1 | 0 | 无 | HTTP 请求工具 |

---

## 🟢 层级 1: Solana 原生 Actions

这些 Action Providers 完全运行在 Solana 网络上，是 AgentKit 的核心功能。

### WalletActionProvider 🟢
**网络支持**: 通用钱包操作  
**描述**: 提供基础钱包操作和信息查询功能

#### Actions:
- 📖 `get_wallet_details` - 获取钱包详情
  - 返回钱包地址、网络信息、原生代币余额
  - 支持 Solana 钱包信息显示
- 🔐 `native_transfer` - 转账原生代币
  - 主要支持 SOL 转账

### JupiterActionProvider 🟢
**网络支持**: Solana 主网  
**描述**: 使用 Jupiter DEX 聚合器进行代币交易

#### Actions:
- 🔐 `swap` - 代币交换
  - 支持所有 SPL 代币交换
  - 自动寻找最佳交易路径
  - 返回未签名交易数据

### SPLActionProvider 🟢
**网络支持**: Solana 网络  
**描述**: SPL 代币操作和管理

#### Actions:
- 🔐 `transfer` - 转账 SPL 代币
  - 自动处理 ATA（关联代币账户）创建
- 📖 `get_balance` - 获取 SPL 代币余额
  - 支持按小数位显示余额

### PumpfunActionProvider 🟢
**网络支持**: Solana 主网  
**描述**: 在 Pump.fun 上创建和交易 meme 代币

#### Actions:
- 🔐 `create_token` - 创建新代币
  - 支持元数据存储到 IPFS
  - 自动生成 mint keypair
- 🔐 `buy_token` - 购买代币
- 🔐 `create_and_buy_token` - 创建并购买代币

### MeteoraDLMMActionProvider 🟢
**网络支持**: Solana 主网和开发网  
**描述**: Meteora 动态流动性做市商协议

#### Actions:
- 🔐 `create_position` - 创建流动性头寸
- 🔐 `close_position` - 关闭头寸
- 🔐 `add_liquidity` - 添加流动性
- 🔐 `remove_liquidity` - 移除流动性
- 🔐 `claim_fees` - 领取手续费
- 📖 `get_position_info` - 获取头寸信息
- 📖 `get_pool_info` - 获取池信息
- 📖 `list_user_positions` - 列出用户头寸

### MagicEdenActionProvider 🟢
**网络支持**: Solana 主网  
**描述**: Magic Eden NFT 市场操作

#### Actions:
- 📖 `get_nft_listings` - 获取 NFT 挂单
- 📖 `get_nft_info` - 获取 NFT 信息
- 🔐 `buy_nft_listing` - 购买 NFT

### SNSActionProvider 🟢
**网络支持**: Solana  
**描述**: Solana 域名服务

#### Actions:
- 📖 `resolve_address` - 域名解析为地址
- 📖 `reverse_lookup` - 地址反向查找域名

### SolanaNftActionProvider 🟢
**网络支持**: Solana  
**描述**: Solana NFT 操作工具

#### Actions:
- 🔐 `transfer_nft` - 转移 NFT
- 📖 `get_nft_metadata` - 获取 NFT 元数据

### X402ActionProvider 🟢
**网络支持**: Solana  
**描述**: X402 协议相关功能

#### Actions:
- 📖 `get_account_info` - 获取账户信息
- 📖 `get_token_metadata` - 获取代币元数据

---

## 🟡 层级 2: 数据查询 Actions (网络无关)

这些 Action Providers 提供纯数据查询，不涉及钱包交互，Solana 用户可安全使用。

### DexScreenerActionProvider 🟡
**网络支持**: 多链（包含 Solana）  
**描述**: 查询 DEX 代币信息和交易对数据

#### Actions:
- 📖 `search_token` - 按符号搜索代币（支持 Solana）
- 📖 `get_token_address` - 获取代币地址
- 📖 `get_token_pairs` - 获取代币交易对信息

### PythActionProvider 🟡
**网络支持**: 多链价格预言机  
**描述**: Pyth 网络价格数据查询，支持包括 Solana 在内的多链价格

#### Actions:
- 📖 `fetch_price_feed` - 获取价格 feed ID
- 📖 `fetch_price` - 根据 feed ID 获取价格


### DefiLlamaActionProvider 🟡
**网络支持**: 所有网络（数据查询）  
**描述**: 查询 DeFi 协议数据和代币价格

#### Actions:
- 📖 `find_protocol` - 搜索 DeFi 协议
- 📖 `get_protocol` - 获取协议详细信息
- 📖 `get_token_prices` - 获取代币价格

### MessariActionProvider 🟡
**网络支持**: 所有网络（数据查询）  
**描述**: Messari AI 工具包，用于加密市场研究

#### Actions:
- 📖 `research_question` - 加密货币研究查询
  - 支持新闻、交易所、链上数据、代币解锁等查询

### AlloraActionProvider 🟡
**网络支持**: Allora 测试网  
**描述**: Allora 网络预测市场数据

#### Actions:
- 📖 `get_all_topics` - 获取所有预测主题
- 📖 `get_inference_by_topic_id` - 按主题 ID 获取推理
- 📖 `get_price_inference` - 获取价格推理

### GoplusActionProvider 🟡
**网络支持**: 主要 Solana，也支持 EVM  
**描述**: GoPlus 安全分析，检测恶意代币和地址

#### Actions:
- 📖 `get_solana_token_security` - Solana 代币安全分析
- 📖 `check_malicious_address` - 检查恶意地址
- 📖 `get_batch_token_security` - 批量代币安全检查（最多20个）

---

## 🟠 层级 3: 跨链桥接 Actions

这些 Action Providers 帮助 Solana 用户进行跨链操作和资产管理。

### WormholeActionProvider 🟠
**网络支持**: Ethereum, Solana, Polygon, BSC, Avalanche 等  
**描述**: Wormhole 跨链数据查询，提供链信息和转账状态查询

#### Actions:
- 📖 `get_transfer_status` - 获取转账状态
- 📖 `get_supported_chains` - 获取支持的链
- 📖 `get_token_info` - 获取代币信息
- 📖 `estimate_fees` - 估算手续费

### OnrampActionProvider 🟠
**网络支持**: 多链法币入金  
**描述**: 法币入金服务，可选择 Solana 作为目标网络

#### Actions:
- 🔐 `get_onramp_buy_url` - 获取法币购买加密货币链接
  - 返回 Coinbase 驱动的安全购买界面链接
  - 可配置购买后转入 Solana

---

## 🔴 层级 4: 外部网络 Actions

⚠️  **重要提示**: 这些 Action Providers 需要其他网络，对于 Solana 用户仅提供数据查询功能。

### PolymarketActionProvider 🔴
**网络要求**: ⚠️  Polygon 主网  
**描述**: Polymarket 预测市场，仅提供数据查询

#### Actions:
- 📖 `search_markets` - 搜索预测市场
- 📖 `get_market_details` - 获取市场详情
- 📖 `get_market_prices` - 获取市场价格
- 📖 `get_trending_markets` - 获取热门市场
- 🔴 `place_bet` - ⚠️  需要 Polygon 网络和 EVM 钱包
- 📖 `get_user_positions` - 获取用户头寸

### PendleActionProvider 🔴
**网络要求**: ⚠️  Ethereum, Arbitrum, BNB Chain, Optimism, Polygon, Mantle  
**描述**: Pendle 收益代币化协议，仅提供数据查询

#### Actions:
- 🔴 `mint_yield_tokens` - ⚠️  需要 EVM 网络
- 🔴 `redeem_yield_tokens` - ⚠️  需要 EVM 网络
- 🔴 `swap_tokens` - ⚠️  需要 EVM 网络
- 🔴 `add_liquidity` - ⚠️  需要 EVM 网络
- 🔴 `remove_liquidity` - ⚠️  需要 EVM 网络
- 📖 `get_pool_info` - 获取池信息（数据查询）
- 📖 `get_user_positions` - 获取用户头寸（数据查询）

---

## 🛠️ 自定义 Action Provider

### CustomActionProvider
**网络支持**: 取决于具体实现  
**描述**: 允许注册自定义 actions 的提供者

支持动态添加自定义 actions，可以选择是否需要钱包提供者。推荐优先创建 Solana 原生的自定义 actions。

---

## 💡 重要信息和建议

### 🎯 Solana 优先策略
- **优先使用** 🟢 层级 1 的 Solana 原生 Actions，这些提供最完整的功能体验
- **安全使用** 🟡 层级 2 的数据查询 Actions，这些不涉及钱包交互
- **谨慎使用** 🟠 层级 3 的跨链桥接 Actions，确保理解跨链风险
- **了解限制** 🔴 层级 4 的外部网络 Actions，仅用于数据查询

### 🔐 钱包签名和网络要求
- **🔐 Solana 签名**: 需要 Solana 钱包签名的操作，消耗 SOL 作为 gas
- **🔴 EVM 签名**: 需要 EVM 钱包和相应网络的 gas 费用  
- **📖 无签名**: 纯数据查询，不产生任何费用

### 🌐 网络兼容性策略
- **主要网络**: Solana 主网、开发网、测试网
- **跨链支持**: 通过 Wormhole 等桥接协议支持资产转入
- **数据查询**: 支持多链数据获取，但执行限制在 Solana

### 🔑 API 密钥要求
以下 Action Providers 需要 API 密钥：
- `MessariActionProvider`: MESSARI_API_KEY  
- `MagicEdenActionProvider`: MAGIC_EDEN_API_KEY (可选)
- `OnrampActionProvider`: PROJECT_ID

### ⚠️ 安全建议
1. **优先 Solana 安全工具**: 使用 GoplusActionProvider 检查 Solana 代币安全性
2. **验证交易详情**: 在签名前仔细检查 Solana 交易内容
3. **合理设置滑点**: Jupiter 交易时设置适当滑点保护
4. **跨链谨慎**: 使用 Wormhole 等跨链功能时，确保理解跨链风险
5. **小额测试**: 大额操作前先进行小额测试

### 🚀 性能优化
1. **Solana RPC 优化**: 使用高质量的 Solana RPC 节点
2. **批量查询**: 利用支持批量的 Actions（如 Goplus 批量安全检查）
3. **缓存策略**: 缓存不经常变化的数据（代币信息、价格等）
4. **并行操作**: 同时调用多个数据查询 Actions

### 📈 常见用例

#### DeFi 操作流程
1. **代币安全检查** → GoPlus `get_solana_token_security`
2. **价格查询** → Pyth `fetch_price` 或 DexScreener `search_token`
3. **代币交换** → Jupiter `swap`
4. **余额查询** → SPL `get_balance`

#### NFT 操作流程
1. **NFT 信息查询** → Magic Eden `get_nft_info`
2. **市场挂单查询** → Magic Eden `get_nft_listings`
3. **购买 NFT** → Magic Eden `buy_nft_listing`
4. **转移 NFT** → Solana NFT `transfer_nft`

#### 跨链资产管理
1. **支持链查询** → Wormhole `get_supported_chains`
2. **费用估算** → Wormhole `estimate_fees`
3. **跨链转账** → Wormhole `transfer_token`
4. **状态跟踪** → Wormhole `get_transfer_status`

### 🔄 错误处理模式
- **网络验证**: 调用前检查 `supportsNetwork()`
- **余额检查**: 交易前验证 SOL 和代币余额
- **统一响应**: 所有 Actions 返回结构化 JSON
- **优雅降级**: 提供备选方案和清晰错误信息

### 🛠️ 开发集成

#### 添加新 Action Provider
1. 继承 `ActionProvider` 基类
2. 实现 `supportsNetwork()` 方法
3. 使用 `@CreateAction` 装饰器定义 actions
4. 创建 Zod schemas 进行参数验证
5. 导出工厂函数

#### 参考模板
使用 Drift、Sanctum、Solayer、Voltr 作为实现参考，了解:
- SVM 网络集成模式
- Action 定义和参数验证
- 错误处理和响应格式
- 测试和文档结构

---

## 🔄 生态系统映射

### 从其他链到 Solana 的功能映射

| **功能类别** | **以太坊/EVM** | **Solana 对应** | **AgentKit Provider** |
|-------------|---------------|----------------|----------------------|
| **DEX 聚合** | Uniswap, 1inch | Jupiter | `JupiterActionProvider` |
| **NFT 市场** | OpenSea, Blur | Magic Eden | `MagicEdenActionProvider` |
| **域名服务** | ENS | SNS (.sol) | `SNSActionProvider` |
| **代币操作** | ERC-20 | SPL Token | `SPLActionProvider` |
| **流动性挖矿** | Uniswap V3 | Meteora DLMM | `MeteoraDLMMActionProvider` |
| **Meme 代币** | Pump.fun (ETH) | Pump.fun (SOL) | `PumpfunActionProvider` |
| **跨链桥接** | 各种桥 | Wormhole | `WormholeActionProvider` |

### 多链兼容性策略

| **层级** | **策略** | **适用场景** |
|----------|----------|-------------|
| **数据层** | 使用网络无关的 providers | 价格查询、安全分析、市场研究 |
| **执行层** | 主要在 Solana 执行，其他链仅查询 | DeFi 操作、NFT 交易、代币转账 |
| **桥接层** | 通过 Wormhole 等协议连接 | 跨链资产转移、多链流动性 |
| **用户体验** | 统一接口，透明网络要求 | AI Agent 自动选择最优路径 |

---

## 📚 总结

AgentKit 提供了 **22 个 Action Providers** 和 **47 个 Actions**，覆盖:

- **🟢 13 个 Solana 原生** providers (核心功能)
- **🟡 6 个网络无关** providers (数据查询)
- **🟠 2 个多网络** providers (跨链功能)
- **🔴 2 个 EVM 专用** providers (特殊协议)
- **🔧 4 个开发模板** (参考实现)

通过这些 providers，AI Agents 可以执行完整的 DeFi、NFT、跨链和数据分析工作流，同时保持高度的安全性和可扩展性。 