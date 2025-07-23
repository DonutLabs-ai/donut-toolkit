/**
 * Smart Tool Search and Execution Module for AgentKit MCP
 * 
 * This module provides intelligent tool discovery and execution capabilities
 * for Model Context Protocol (MCP) servers using vector-based semantic search.
 */

// Core types and interfaces
export type {
  ActionParameter,
  SearchableActionMetadata,
  SearchableActionProviderMetadata,
  ActionSearchRequest,
  ActionSearchResponse,
  ExecuteActionRequest,
  ExecuteActionResponse,
  VectorSearchConfig,
} from "./types.js";

// Error handling
export {
  SearchError,
  SearchErrorCode,
} from "./types.js";

// Configuration constants
export {
  DEFAULT_CONFIG,
} from "./types.js";

// Zod schemas for validation
export {
  ActionSearchRequestSchema,
  ExecuteActionRequestSchema,
} from "./types.js";

// Vector search service
export {
  VectorSearchService,
} from "./vectorSearchService.js";

// Smart tool manager
export {
  SmartToolManager,
} from "./smartToolManager.js";

// MCP integration - main exports
export type {
  SmartAgentKitMcpTools,
  SmartMcpToolsConfig,
} from "./mcpSmartTools.js";

export {
  getMcpToolsWithSearch,
  initializeSmartMcpTools,
  getMcpToolsWithLazySearch,
  initializeSmartToolManager,
  getSmartMcpToolsHealth,
  getSmartMcpToolsStats,
  reindexSmartMcpTools,
  SmartMcpToolsExample,
} from "./mcpSmartTools.js";

/**
 * Quick start example for common use cases
 */
export const QuickStart = {
  /**
   * Initialize smart MCP tools with minimal configuration
   * 
   * @example
   * ```typescript
   * import { AgentKit } from "@coinbase/agentkit";
   * import { QuickStart } from "@coinbase/agentkit-model-context-protocol/search";
   * 
   * const agentKit = await AgentKit.from({ ... });
   * const smartTools = await QuickStart.initialize(agentKit);
   * 
   * // Now you have 2 MCP tools: search_tools and execute_tool
   * console.log(smartTools.tools.map(t => t.name));
   * ```
   */
  async initialize(agentKit: any) {
    const { initializeSmartMcpTools } = await import("./mcpSmartTools.js");
    return initializeSmartMcpTools(agentKit);
  },

  /**
   * Initialize with custom Pinecone configuration
   * 
   * @example
   * ```typescript
   * const smartTools = await QuickStart.initializeWithConfig(agentKit, {
   *   indexName: "my-custom-index",
   *   embeddingModel: "text-embedding-ada-002",
   *   namespace: "production",
   * });
   * ```
   */
  async initializeWithConfig(agentKit: any, vectorConfig: any) {
    const { initializeSmartMcpTools } = await import("./mcpSmartTools.js");
    return initializeSmartMcpTools(agentKit, vectorConfig);
  },

  /**
   * Initialize with lazy loading (manual initialization)
   * 
   * @example
   * ```typescript
   * const smartTools = await QuickStart.initializeLazy(agentKit);
   * // ... do other setup ...
   * await smartTools.smartToolManager.initialize(agentKit);
   * ```
   */
  async initializeLazy(agentKit: any, vectorConfig?: any) {
    const { getMcpToolsWithLazySearch } = await import("./mcpSmartTools.js");
    return getMcpToolsWithLazySearch(agentKit, vectorConfig);
  },
};

/**
 * Configuration helpers
 */
export const ConfigHelpers = {
  /**
   * Create vector search configuration from environment variables
   */
  fromEnvironment(): Partial<import("./types.js").VectorSearchConfig> {
    return {
      apiKey: process.env.PINECONE_API_KEY,
      indexName: process.env.PINECONE_INDEX_NAME,
      namespace: process.env.PINECONE_NAMESPACE,
      embeddingModel: process.env.PINECONE_EMBEDDING_MODEL,
      embeddingDimension: process.env.PINECONE_EMBEDDING_DIMENSION 
        ? parseInt(process.env.PINECONE_EMBEDDING_DIMENSION, 10) 
        : undefined,
    };
  },

  /**
   * Validate configuration and provide defaults
   */
  validate(config: Partial<import("./types.js").VectorSearchConfig>): Partial<import("./types.js").VectorSearchConfig> {
    const validated = { ...config };
    
    if (!validated.apiKey) {
      throw new Error("PINECONE_API_KEY is required");
    }
    
    return validated;
  },

  /**
   * Get recommended production configuration
   */
  production(): Partial<import("./types.js").VectorSearchConfig> {
    return {
      indexName: "agentkit-tools-prod",
      namespace: "production",
      embeddingModel: "multilingual-e5-large",
      embeddingDimension: 1024,
    };
  },

  /**
   * Get development/testing configuration
   */
  development(): Partial<import("./types.js").VectorSearchConfig> {
    return {
      indexName: "agentkit-tools-dev",
      namespace: "development", 
      embeddingModel: "multilingual-e5-large",
      embeddingDimension: 1024,
    };
  },
};

/**
 * Re-export core types from base module for convenience
 */
export type { AgentKit, ActionProvider, Action } from "@coinbase/agentkit";
export type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";