# coinbase_agentkit 外部服务 API Key 管理分析

## 总览

coinbase_agentkit 通过**构造函数配置**和**环境变量**两种方式管理各个外部服务的 API key。每个 Action Provider 都独立管理自己的 API key，遵循统一的模式。

## 核心架构

### 1. AgentKit 主配置
```typescript
export type AgentKitOptions = {
  cdpApiKeyId?: string;           // CDP API Key ID
  cdpApiKeySecret?: string;       // CDP API Key Secret
  cdpWalletSecret?: string;       // CDP Wallet Secret
  walletProvider?: WalletProvider;
  actionProviders?: ActionProvider[];
};
```

### 2. Action Provider 配置模式
每个 Action Provider 都采用统一的配置模式：

```typescript
export interface ActionProviderConfig {
  apiKey?: string;
  // 其他特定配置...
}

export class ActionProvider {
  constructor(config: ActionProviderConfig = {}) {
    // 1. 优先使用传入的配置
    // 2. 回退到环境变量
    // 3. 验证必需的配置
    config.apiKey ||= process.env.PROVIDER_API_KEY;
    
    if (!config.apiKey) {
      throw new Error("API_KEY is not configured.");
    }
  }
}
```

## 各服务 API Key 管理详情

### Twitter (X) API
**配置参数**：
```typescript
export interface TwitterActionProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
}
```

**环境变量**：
```bash
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
```

**使用方式**：
```typescript
// 方式1: 构造函数配置
const twitterProvider = new TwitterActionProvider({
  apiKey: "your_key",
  apiSecret: "your_secret",
  accessToken: "your_token",
  accessTokenSecret: "your_token_secret"
});

// 方式2: 环境变量（推荐）
const twitterProvider = new TwitterActionProvider();
```

### OpenSea API
**配置参数**：
```typescript
export interface OpenseaActionProviderConfig {
  apiKey?: string;
  networkId?: string;
  privateKey?: string;
}
```

**环境变量**：
```bash
OPENSEA_API_KEY=your_opensea_api_key
```

**使用方式**：
```typescript
// 方式1: 构造函数配置
const openseaProvider = new OpenseaActionProvider({
  apiKey: "your_opensea_api_key"
});

// 方式2: 环境变量
const openseaProvider = new OpenseaActionProvider();
```

### Alchemy API
**配置参数**：
```typescript
export interface AlchemyTokenPricesActionProviderConfig {
  apiKey?: string;
}
```

**环境变量**：
```bash
ALCHEMY_API_KEY=your_alchemy_api_key
```

**使用方式**：
```typescript
// 方式1: 构造函数配置
const alchemyProvider = new AlchemyTokenPricesActionProvider({
  apiKey: "your_alchemy_api_key"
});

// 方式2: 环境变量
const alchemyProvider = new AlchemyTokenPricesActionProvider();
```

### Messari API
**配置参数**：
```typescript
export interface MessariActionProviderConfig {
  apiKey?: string;
}
```

**环境变量**：
```bash
MESSARI_API_KEY=your_messari_api_key
```

### Farcaster API
**配置参数**：
```typescript
export interface FarcasterActionProviderConfig {
  apiKey?: string;
  bearerToken?: string;
  signerUuid?: string;
}
```

**环境变量**：
```bash
FARCASTER_API_KEY=your_farcaster_api_key
FARCASTER_BEARER_TOKEN=your_bearer_token
FARCASTER_SIGNER_UUID=your_signer_uuid
```

### VaultsFYI API
**配置参数**：
```typescript
export interface VaultsFYIActionProviderConfig {
  apiKey?: string;
}
```

**环境变量**：
```bash
VAULTSFYI_API_KEY=your_vaultsfyi_api_key
```

### Allora API
**配置参数**：
```typescript
export interface AlloraActionProviderConfig {
  apiKey?: string;
}
```

**环境变量**：
```bash
ALLORA_API_KEY=your_allora_api_key
```

### Jupiter API
**特殊情况**：Jupiter 有免费和付费版本
```typescript
// 免费版本 (quote-api.jup.ag) - 无需 API Key
const jupiterApi = createJupiterApiClient({
  basePath: "https://quote-api.jup.ag"
});

// 付费版本 (api.jup.ag) - 需要 API Key
const jupiterApi = createJupiterApiClient({
  basePath: "https://api.jup.ag",
  apiKey: process.env.JUPITER_API_KEY
});
```

**环境变量**：
```bash
JUPITER_API_KEY=your_jupiter_api_key  # 仅付费版本需要
```

### Coinbase Developer Platform (CDP)
**配置参数**：
```typescript
export type AgentKitOptions = {
  cdpApiKeyId?: string;
  cdpApiKeySecret?: string;
  cdpWalletSecret?: string;
};
```

**环境变量**：
```bash
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret
CDP_WALLET_SECRET=your_cdp_wallet_secret
```

## 最佳实践

### 1. 环境变量管理
推荐使用环境变量管理所有 API key，避免硬编码在代码中：

```bash
# .env 文件
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret
CDP_WALLET_SECRET=your_cdp_wallet_secret

TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

OPENSEA_API_KEY=your_opensea_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
MESSARI_API_KEY=your_messari_api_key
FARCASTER_API_KEY=your_farcaster_api_key
VAULTSFYI_API_KEY=your_vaultsfyi_api_key
ALLORA_API_KEY=your_allora_api_key
JUPITER_API_KEY=your_jupiter_api_key
```

### 2. 完整的 AgentKit 配置示例
```typescript
import { AgentKit, twitterActionProvider, openseaActionProvider } from '@coinbase/agentkit';

// 使用环境变量的方式（推荐）
const agentKit = await AgentKit.from({
  cdpApiKeyId: process.env.CDP_API_KEY_ID,
  cdpApiKeySecret: process.env.CDP_API_KEY_SECRET,
  cdpWalletSecret: process.env.CDP_WALLET_SECRET,
  actionProviders: [
    twitterActionProvider(),      // 自动从环境变量读取
    openseaActionProvider(),      // 自动从环境变量读取
    // 其他 providers...
  ]
});
```

### 3. 选择性配置
```typescript
// 只为特定服务提供 API key
const agentKit = await AgentKit.from({
  cdpApiKeyId: process.env.CDP_API_KEY_ID,
  cdpApiKeySecret: process.env.CDP_API_KEY_SECRET,
  cdpWalletSecret: process.env.CDP_WALLET_SECRET,
  actionProviders: [
    // 显式配置
    twitterActionProvider({
      apiKey: "custom_twitter_key",
      apiSecret: "custom_twitter_secret"
    }),
    // 环境变量配置
    openseaActionProvider()
  ]
});
```

## 安全考虑

1. **永不提交 API key 到代码库**
2. **使用 .env 文件存储敏感信息**
3. **在生产环境中使用密钥管理服务**
4. **定期轮换 API key**
5. **为不同环境使用不同的 API key**

## 错误处理

所有 Action Provider 都会在构造函数中验证必需的 API key：

```typescript
constructor(config: ActionProviderConfig = {}) {
  config.apiKey ||= process.env.PROVIDER_API_KEY;
  
  if (!config.apiKey) {
    throw new Error("PROVIDER_API_KEY is not configured.");
  }
}
```

如果缺少必需的 API key，系统会抛出明确的错误信息。

## 总结

coinbase_agentkit 的 API key 管理特点：

1. **统一模式**：所有 Action Provider 都遵循相同的配置模式
2. **灵活配置**：支持构造函数参数和环境变量两种方式
3. **环境变量优先**：推荐使用环境变量管理敏感信息
4. **明确错误**：缺少必需配置时会抛出清晰的错误信息
5. **独立管理**：每个服务独立管理自己的 API key
6. **安全第一**：避免硬编码，支持密钥管理最佳实践

这种设计使得开发者可以轻松地为不同的外部服务配置 API key，同时保持代码的安全性和可维护性。
