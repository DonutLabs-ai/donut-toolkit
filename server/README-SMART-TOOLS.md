# Smart MCP Tools

智能模型上下文协议（MCP）工具，基于向量搜索的智能工具发现和执行系统。

## 概述

Smart MCP Tools 解决了传统 MCP 服务器工具过多导致的"幻觉溢出"问题。通过将所有可用工具向量化并存储在 Pinecone 向量数据库中，AI 可以通过自然语言查询智能地发现和执行最相关的工具。

### 核心特性

- **智能工具发现**: 基于语义相似度的工具搜索
- **简化 MCP 接口**: 仅提供 2 个工具：`search_tools` 和 `execute_tool`
- **向量化索引**: 自动将 AgentKit actions 向量化存储
- **过滤支持**: 支持按 provider、网络、参数等过滤
- **兼容现有架构**: 完全兼容现有 AgentKit ActionProvider 系统

## 架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant │    │   MCP Server    │    │   Pinecone DB   │
│                 │    │                 │    │                 │
│ 1. search_tools │───▶│ SmartToolMgr    │───▶│ Vector Index    │
│ 2. execute_tool │    │                 │    │                 │
│                 │    │ AgentKit        │    │                 │
└─────────────────┘    │ Actions         │    └─────────────────┘
                       └─────────────────┘
```

### 核心组件

1. **VectorSearchService**: Pinecone 向量搜索服务
2. **SmartToolManager**: 工具管理和执行核心
3. **MCP Integration**: 简化的 MCP 工具接口

## 快速开始

### 1. 环境配置

```bash
# 必需的环境变量
export PINECONE_API_KEY="your-pinecone-api-key"

# 可选的环境变量（有默认值）
export PINECONE_INDEX_NAME="agentkit-tools-v1"
export PINECONE_NAMESPACE="production" 
export PINECONE_EMBEDDING_MODEL="multilingual-e5-large"
export PINECONE_EMBEDDING_DIMENSION="1024"
```

### 2. 基本使用

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { initializeSmartMcpTools } from "@coinbase/agentkit-model-context-protocol";

// 创建 AgentKit 实例
const agentKit = await AgentKit.from({
  walletProvider: yourWalletProvider,
  actionProviders: [
    // 你的 action providers
  ],
});

// 初始化智能 MCP 工具
const smartTools = await initializeSmartMcpTools(agentKit);

// 现在你有了 2 个 MCP 工具
console.log(smartTools.tools.map(t => t.name));
// 输出: ["search_tools", "execute_tool"]
```

### 3. 使用搜索工具

```typescript
// 搜索相关工具
const searchResult = await smartTools.toolHandler("search_tools", {
  query: "swap tokens on Solana",
  topK: 3,
  filters: {
    networks: ["solana"],
    requiresWallet: true,
  },
});

console.log(searchResult.content[0].text);
```

### 4. 执行工具

```typescript
// 执行特定工具
const executeResult = await smartTools.toolHandler("execute_tool", {
  actionId: "found-action-id",
  parameters: {
    inputToken: "So11111111111111111111111111111111111111112",
    outputToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 
    amount: "1.0",
  },
});

console.log(executeResult.content[0].text);
```

## 配置选项

### 向量搜索配置

```typescript
import { ConfigHelpers } from "@coinbase/agentkit-model-context-protocol";

// 从环境变量配置
const envConfig = ConfigHelpers.fromEnvironment();

// 生产环境配置
const prodConfig = ConfigHelpers.production();

// 开发环境配置  
const devConfig = ConfigHelpers.development();

// 自定义配置
const customConfig = {
  indexName: "my-custom-index",
  namespace: "production",
  embeddingModel: "multilingual-e5-large",
  embeddingDimension: 1024,
};
```

### 高级初始化

```typescript
import { getMcpToolsWithSearch } from "@coinbase/agentkit-model-context-protocol";

// 自定义配置初始化
const smartTools = await getMcpToolsWithSearch({
  agentKit,
  vectorConfig: customConfig,
  autoInitialize: true,
});

// 延迟初始化（手动控制时机）
const smartTools = await getMcpToolsWithSearch({
  agentKit,
  vectorConfig: customConfig,
  autoInitialize: false,
});

// 稍后手动初始化
await smartTools.smartToolManager.initialize(agentKit);
```

## 工具接口

### search_tools

搜索相关工具的自然语言接口。

**输入参数:**
```typescript
{
  query: string;           // 自然语言查询
  topK?: number;          // 返回结果数量 (默认 5，最大 50)
  filters?: {
    providerNames?: string[];    // 按 provider 名称过滤
    networks?: string[];         // 按网络过滤
    requiresWallet?: boolean;    // 按是否需要钱包过滤
    requiredParameters?: string[]; // 按必需参数过滤
  };
}
```

**输出示例:**
```json
{
  "query": "swap tokens on Solana",
  "results": [
    {
      "actionId": "uuid-1",
      "actionName": "JupiterActionProvider_swap",
      "providerName": "jupiter", 
      "description": "Creates an unsigned swap transaction using Jupiter's DEX aggregator",
      "parameters": [...],
      "requiresWallet": true,
      "score": 0.95
    }
  ],
  "totalResults": 1
}
```

### execute_tool

执行特定工具的接口。

**输入参数:**
```typescript
{
  actionId: string;              // 从 search_tools 获得的 actionId
  parameters: Record<string, any>; // 工具所需的参数
}
```

**输出示例:**
```json
{
  "actionId": "uuid-1",
  "success": true,
  "result": "{\"transaction\": \"base64-encoded-data\"}",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 监控和调试

### 健康检查

```typescript
import { getSmartMcpToolsHealth } from "@coinbase/agentkit-model-context-protocol";

const health = await getSmartMcpToolsHealth(smartTools);
console.log(health.status); // "healthy" | "unhealthy"
```

### 统计信息

```typescript
import { getSmartMcpToolsStats } from "@coinbase/agentkit-model-context-protocol";

const stats = await getSmartMcpToolsStats(smartTools);
console.log(`Indexed ${stats.totalActions} actions from ${stats.totalProviders} providers`);
```

### 重新索引

```typescript
import { reindexSmartMcpTools } from "@coinbase/agentkit-model-context-protocol";

// 当 AgentKit 配置发生变化时重新索引
await reindexSmartMcpTools(smartTools);
```

## 最佳实践

### 1. 查询优化

- 使用具体的描述性查询
- 利用过滤器缩小搜索范围
- 适当设置 topK 值

### 2. 错误处理

```typescript
try {
  const result = await smartTools.toolHandler("search_tools", searchRequest);
  const response = JSON.parse(result.content[0].text);
  
  if (response.results.length === 0) {
    console.log("No relevant tools found");
  }
} catch (error) {
  console.error("Search failed:", error);
}
```

### 3. 生产部署

- 使用生产环境 Pinecone 索引
- 设置适当的命名空间隔离
- 定期监控索引状态和查询性能

## 故障排除

### 常见问题

1. **Pinecone 连接失败**
   - 检查 `PINECONE_API_KEY` 是否正确
   - 确认 Pinecone 服务可访问

2. **搜索结果为空**
   - 检查索引是否已初始化
   - 尝试更宽泛的查询条件
   - 检查过滤器设置

3. **工具执行失败**
   - 验证 actionId 是否正确
   - 检查参数格式和类型
   - 确认 AgentKit 配置正确

### 调试模式

```typescript
// 启用详细日志
process.env.DEBUG = "smart-tools:*";

// 检查向量存储状态
const stats = await smartTools.smartToolManager.getStats();
console.log("Vector store stats:", stats.vectorStoreStats);
```

## 示例项目

查看 `examples/smart-tools-example.ts` 获取完整的使用示例。

## 依赖

- `@pinecone-database/pinecone ^3.0.0` - 向量数据库
- `uuid ^9.0.1` - UUID 生成
- `reflect-metadata ^0.1.13` - 元数据反射
- `zod ^3.22.4` - 模式验证

## 许可证

Apache-2.0