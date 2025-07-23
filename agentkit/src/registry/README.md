# AgentKit Registry System

The AgentKit Registry System provides intelligent tool discovery and execution through semantic search using Pinecone vector database. It automatically catalogs all ActionProviders and Actions, generates searchable embeddings, and enables AI agents to find the most relevant tools for any given task.

## Overview

The registry system solves the "hallucination overflow" problem by reducing hundreds of individual tools to just 2 intelligent tools:
- `search_tools`: Semantic search for relevant actions
- `execute_tool`: Execute discovered actions with validated parameters

## Key Components

### 1. Registry Types (`types.ts`)
- **RegistryActionProvider**: Extended ActionProvider with metadata for cataloging
- **RegistryAction**: Extended Action with searchable metadata and categorization
- **ActionRegistry**: Complete registry containing all providers and actions
- **Category Mappings**: Predefined categories for providers and actions

### 2. Registry Builder (`registryBuilder.ts`)
- Scans ActionProvider instances and extracts all actions
- Converts to registry format with enhanced metadata
- Automatically categorizes providers and actions
- Extracts parameter information from Zod schemas

### 3. Catalog Generator (`catalogGenerator.ts`)
- Creates Tool Spec Catalog from ActionRegistry
- Generates embedding texts in specific format: `"{provider_name} {action_name} | {description} | params: {param_str}"`
- Creates searchable indexes by category, provider, and tags
- Exports catalog data for Pinecone synchronization

### 4. Vector Search Service (`vectorSearchService.ts`)
- Pinecone integration with built-in embedding models
- Batch processing for efficient vector operations
- Semantic search with filtering capabilities
- Index management and health monitoring

### 5. Registry Manager (`registryManager.ts`)
- Orchestrates the complete build and sync workflow
- Coordinates between all components
- Provides unified interface for registry operations
- Handles error recovery and logging

## Usage

### Basic Setup

```typescript
import { 
  RegistryManager, 
  RegistryManagerConfig 
} from "@coinbase/agentkit";

// Configure registry manager
const config: RegistryManagerConfig = {
  registryConfig: {
    version: "1.0.0",
    providerCategoryMappings: {
      "jupiter": "DEX",
      "defillama": "Data"
    }
  },
  vectorSearchConfig: {
    apiKey: "your-pinecone-api-key",
    indexName: "agentkit-registry",
    embeddingModel: "multilingual-e5-large"
  },
  syncToPinecone: true,
  verbose: true
};

const registryManager = new RegistryManager(config);
```

### Building Registry

```typescript
// From ActionProvider instances
const providers = [
  jupiterActionProvider(),
  defillamaActionProvider(),
  compoundActionProvider()
];

const result = await registryManager.buildRegistry(providers, walletProvider);
console.log(`Built registry with ${result.stats.actionsExtracted} actions`);
```

### Searching Tools

```typescript
// Semantic search for tools
const results = await registryManager.searchActions({
  query: "swap tokens on solana",
  topK: 5,
  filters: {
    categories: ["DEX"],
    requiresWallet: true
  }
});

console.log("Found tools:", results.map(r => r.actionName));
```

### Executing Tools

```typescript
// Get action by ID and execute
const action = registryManager.getActionById("provider_jupiter_swap");
if (action) {
  const result = await action.invoke({
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: 1.0,
    slippageBps: 50
  });
  console.log("Execution result:", result);
}
```

### Integration with MCP Server

```typescript
import { RegistrySmartToolManager } from "./registrySmartToolManager";

// Enhanced smart tool manager using registry
const smartManager = new RegistrySmartToolManager({
  verbose: true,
  registryConfig: {
    syncToPinecone: true,
    clearBeforeSync: false
  }
});

// Initialize with ActionProviders
await smartManager.initializeWithProviders(agentKit, actionProviders);

// Use in MCP tools
export async function searchTools(query: string) {
  const results = await smartManager.searchTools(query, { topK: 10 });
  return results.map(r => ({
    id: r.actionId,
    name: r.actionName,
    description: r.description,
    provider: r.providerName,
    category: r.category,
    score: r.score
  }));
}

export async function executeTool(actionId: string, parameters: any) {
  return await smartManager.executeTool({ actionId, parameters });
}
```

## Environment Variables

```bash
# Pinecone Configuration
PINECONE_API_KEY=your-api-key
PINECONE_INDEX_NAME=agentkit-registry
PINECONE_NAMESPACE=actions
PINECONE_EMBEDDING_MODEL=multilingual-e5-large
PINECONE_EMBEDDING_DIMENSION=1024
```

## Categories

### Provider Categories
- **DeFi**: Decentralized finance protocols
- **DEX**: Decentralized exchanges
- **Lending**: Lending and borrowing protocols
- **Staking**: Staking and validation services
- **Data**: Data providers and analytics
- **Wallet**: Wallet operations
- **NFT**: NFT marketplaces and operations
- **Bridge**: Cross-chain bridges
- **Analytics**: Analytics and monitoring
- **Utility**: Utility functions
- **Social**: Social platforms
- **Gaming**: Gaming protocols

### Action Categories
- **Swap**: Token swapping
- **Trade**: Trading operations
- **Lend/Borrow**: Lending operations
- **Stake/Unstake**: Staking operations
- **Transfer**: Asset transfers
- **Approve**: Token approvals
- **Query**: Data queries
- **Price**: Price information
- **Balance**: Balance checks
- **History**: Historical data
- **Create/Mint/Burn**: Asset creation
- **Bridge Transfer**: Cross-chain transfers
- **Analytics**: Analytics operations
- **Social**: Social interactions

## Registry Statistics

```typescript
const stats = registryManager.getRegistryStats();
console.log({
  totalProviders: stats.totalProviders,
  totalActions: stats.totalActions,
  categories: stats.categoriesList,
  walletRequiredActions: stats.walletRequiredActions
});
```

## Performance Considerations

- **Batch Processing**: Vector operations are batched for efficiency
- **Caching**: Registry and catalog are built once and cached
- **Filtering**: Use filters to reduce search scope
- **Categories**: Organize tools by category for faster discovery
- **Tags**: Add relevant tags for enhanced searchability

## Error Handling

```typescript
try {
  const result = await registryManager.buildRegistry(providers);
} catch (error) {
  if (error instanceof RegistrySearchError) {
    console.error("Registry error:", error.code, error.message);
  }
}
```

## Monitoring

```typescript
// Health check
const health = await registryManager.getSearchServiceHealth();
console.log("Service status:", health.status);

// Index statistics
const vectorService = registryManager.getVectorSearchService();
if (vectorService) {
  const stats = await vectorService.getIndexStats();
  console.log("Vector index stats:", stats);
}
```

## Development

The registry system is designed to be:
- **Extensible**: Easy to add new providers and actions
- **Configurable**: Customizable categorization and metadata
- **Observable**: Comprehensive logging and monitoring
- **Testable**: Local search capabilities for testing
- **Maintainable**: Clear separation of concerns

## Future Enhancements

- **Dynamic Updates**: Hot reload of registry without restart
- **Performance Metrics**: Track action execution times
- **Usage Analytics**: Monitor tool usage patterns
- **Smart Recommendations**: ML-based tool suggestions
- **Federation**: Support for distributed registries