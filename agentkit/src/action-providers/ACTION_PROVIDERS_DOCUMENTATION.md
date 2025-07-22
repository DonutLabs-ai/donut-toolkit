# AgentKit Action Providers 完整文档

本文档详细列出了 AgentKit 中所有可用的 Action Providers 及其支持的 Actions。

**主要专注**: Solana 生态系统，同时保留对其他有价值工具的数据查询能力。

## 📋 图标说明

### Action 类型
- 🔐 **需要钱包签名** - 涉及区块链交易的写操作，需要用户钱包签名
- 📖 **仅查询操作** - 只读操作，不需要钱包签名，用于获取信息

### 网络兼容性
- 🟢 **Solana 原生** - 完全支持，推荐使用
- 🟡 **数据通用** - 跨链数据查询，Solana 用户可安全使用
- 🟠 **跨链桥接** - 帮助 Solana 用户进行跨链操作
- 🔴 **外部网络** - 需要其他网络，仅提供数据查询

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

### AlchemyTokenPricesActionProvider 🟡
**网络支持**: 多链代币价格 API  
**描述**: 通过 Alchemy API 获取代币价格

#### Actions:
- 📖 `token_prices_by_symbol` - 按符号获取代币价格
- 📖 `token_prices_by_address` - 按地址获取代币价格

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
**描述**: Wormhole 跨链桥代币转账，支持资产转入 Solana

#### Actions:
- 🔐 `transfer_token` - 跨链转账代币（可转入 Solana）
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
- `AlchemyTokenPricesActionProvider`: ALCHEMY_API_KEY
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

### 📈 最佳实践

#### Solana 原生操作
1. **SPL 代币**: 优先使用 SPLActionProvider 进行代币操作
2. **DEX 交易**: Jupiter 提供最佳的 Solana DEX 聚合
3. **NFT 操作**: 使用 MagicEden 和 SolanaNft 进行 NFT 交易
4. **域名服务**: 通过 SNS 使用 .sol 域名

#### 跨链集成
1. **资产桥接**: 使用 Wormhole 将其他链资产转入 Solana
2. **法币入金**: 通过 Onramp 直接购买并转入 Solana
3. **数据整合**: 利用多链数据 providers 获取全面市场信息

#### 错误处理
1. **网络检查**: 调用前验证 Action Provider 的网络兼容性
2. **余额验证**: 交易前检查 SOL 和 SPL 代币余额
3. **结构化响应**: 所有 Actions 返回统一的 JSON 响应格式
4. **优雅降级**: 跨链功能不可用时，提供替代方案

### 🔄 迁移路径

#### 从其他链迁移到 Solana
1. **资产转移**: 使用 Wormhole 将 EVM 资产桥接到 Solana
2. **功能替代**: 
   - Uniswap → Jupiter
   - OpenSea → Magic Eden  
   - ENS → SNS
3. **DeFi 协议**: 探索 Solana 原生 DeFi（如 Meteora）

#### 保持多链兼容性
1. **数据层统一**: 使用通用数据 providers 获取多链信息
2. **执行层分离**: 主要执行在 Solana，其他链仅用于数据查询
3. **用户体验**: 为跨链操作提供清晰的网络要求说明 