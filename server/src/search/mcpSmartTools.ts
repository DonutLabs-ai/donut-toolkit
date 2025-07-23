import { zodToJsonSchema } from "zod-to-json-schema";
import { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { AgentKit } from "@coinbase/agentkit";
import { SmartToolManager } from "./smartToolManager.js";
import {
  ActionSearchRequestSchema,
  ExecuteActionRequestSchema,
  ActionSearchRequest,
  ExecuteActionRequest,
  VectorSearchConfig,
  SearchError,
  SearchErrorCode,
} from "./types.js";

/**
 * MCP tools interface for smart tool functionality
 */
export interface SmartAgentKitMcpTools {
  tools: Tool[];
  toolHandler: (name: string, args: unknown) => Promise<CallToolResult>;
  smartToolManager: SmartToolManager;
}

/**
 * Configuration options for smart MCP tools
 */
export interface SmartMcpToolsConfig {
  /**
   * AgentKit instance to extract tools from
   */
  agentKit: AgentKit;
  
  /**
   * Optional vector search configuration
   */
  vectorConfig?: Partial<VectorSearchConfig>;
  
  /**
   * Whether to initialize the tool manager immediately (default: true)
   */
  autoInitialize?: boolean;
}

/**
 * Get Model Context Protocol (MCP) tools with intelligent search capabilities
 * This provides only 2 tools: search_tools and execute_tool
 *
 * @param config - Configuration for smart MCP tools
 * @returns Smart MCP tools interface with search and execution capabilities
 */
export async function getMcpToolsWithSearch(
  config: SmartMcpToolsConfig
): Promise<SmartAgentKitMcpTools> {
  const { agentKit, vectorConfig, autoInitialize = true } = config;

  // Create smart tool manager
  const smartToolManager = new SmartToolManager(vectorConfig);

  // Initialize if requested
  if (autoInitialize) {
    try {
      await smartToolManager.initialize(agentKit);
    } catch (error) {
      throw new SearchError(
        `Failed to initialize smart tool manager: ${error}`,
        SearchErrorCode.INITIALIZATION_ERROR
      );
    }
  }

  // Define the two MCP tools
  const tools: Tool[] = [
    {
      name: "search_tools",
      description: `
Search for relevant tools based on a natural language query.
This tool helps find the most appropriate actions from all available AgentKit action providers.

Usage:
- Provide a descriptive query about what you want to accomplish
- Optionally filter by provider names, networks, or other criteria
- Get back a ranked list of relevant tools with similarity scores

Example queries:
- "swap tokens on Solana"
- "check wallet balance" 
- "transfer ETH to another address"
- "get price data for Bitcoin"
      `.trim(),
      inputSchema: zodToJsonSchema(ActionSearchRequestSchema) as any,
    },
    {
      name: "execute_tool",
      description: `
Execute a specific tool by its unique action ID with the provided parameters.
Use this after finding the right tool with search_tools.

Usage:
- Provide the actionId from a search_tools result
- Provide the required parameters as specified in the tool's schema
- The tool will be executed and return the result

Note: Make sure all required parameters are provided and match the expected types.
      `.trim(),
      inputSchema: zodToJsonSchema(ExecuteActionRequestSchema) as any,
    },
  ];

  // Tool handler function
  const toolHandler = async (name: string, args: unknown): Promise<CallToolResult> => {
    try {
      switch (name) {
        case "search_tools": {
          // Validate and parse search request
          const searchRequest = ActionSearchRequestSchema.parse(args) as ActionSearchRequest;
          
          // Perform search
          const results = await smartToolManager.searchTools(searchRequest);
          
          // Format results for MCP response
          const response = {
            query: searchRequest.query,
            filters: searchRequest.filters,
            results: results.map(result => ({
              actionId: result.actionId,
              actionName: result.actionName,
              providerName: result.providerName,
              description: result.description,
              parameters: result.parameters,
              requiresWallet: result.requiresWallet,
              score: result.score,
            })),
            totalResults: results.length,
            timestamp: new Date().toISOString(),
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        }

        case "execute_tool": {
          // Validate and parse execution request
          const executeRequest = ExecuteActionRequestSchema.parse(args) as ExecuteActionRequest;
          
          // Execute the tool
          const result = await smartToolManager.executeTool(executeRequest);
          
          // Format result for MCP response
          const response = {
            actionId: executeRequest.actionId,
            parameters: executeRequest.parameters,
            success: result.success,
            result: result.result,
            error: result.error,
            timestamp: new Date().toISOString(),
          };

          return {
            content: [
              {
                type: "text", 
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        }

        default:
          throw new SearchError(
            `Unknown tool: ${name}. Available tools: search_tools, execute_tool`,
            SearchErrorCode.VALIDATION_ERROR
          );
      }
    } catch (error) {
      // Handle validation errors and other issues
      let errorMessage: string;
      let errorCode: string;

      if (error instanceof SearchError) {
        errorMessage = error.message;
        errorCode = error.code;
      } else if (error instanceof Error) {
        errorMessage = error.message;
        errorCode = SearchErrorCode.UNKNOWN_ERROR;
      } else {
        errorMessage = String(error);
        errorCode = SearchErrorCode.UNKNOWN_ERROR;
      }

      // Return error as MCP response
      const errorResponse = {
        success: false,
        error: errorMessage,
        errorCode,
        tool: name,
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(errorResponse, null, 2),
          },
        ],
      };
    }
  };

  return {
    tools,
    toolHandler,
    smartToolManager,
  };
}

/**
 * Initialize smart MCP tools with default configuration
 * Convenience function for common use cases
 */
export async function initializeSmartMcpTools(
  agentKit: AgentKit,
  vectorConfig?: Partial<VectorSearchConfig>
): Promise<SmartAgentKitMcpTools> {
  return getMcpToolsWithSearch({
    agentKit,
    vectorConfig,
    autoInitialize: true,
  });
}

/**
 * Get MCP tools with search capability but without auto-initialization
 * Useful when you want to control the initialization timing
 */
export async function getMcpToolsWithLazySearch(
  agentKit: AgentKit,
  vectorConfig?: Partial<VectorSearchConfig>
): Promise<SmartAgentKitMcpTools> {
  return getMcpToolsWithSearch({
    agentKit,
    vectorConfig,
    autoInitialize: false,
  });
}

/**
 * Utility function to manually initialize a smart tool manager
 */
export async function initializeSmartToolManager(
  smartTools: SmartAgentKitMcpTools,
  agentKit: AgentKit
): Promise<void> {
  await smartTools.smartToolManager.initialize(agentKit);
}

/**
 * Get health status of smart MCP tools
 */
export async function getSmartMcpToolsHealth(
  smartTools: SmartAgentKitMcpTools
): Promise<{ status: string; details: any }> {
  return smartTools.smartToolManager.healthCheck();
}

/**
 * Get statistics about the smart MCP tools
 */
export async function getSmartMcpToolsStats(
  smartTools: SmartAgentKitMcpTools
): Promise<{
  totalActions: number;
  totalProviders: number;
  vectorStoreStats: any;
}> {
  return smartTools.smartToolManager.getStats();
}

/**
 * Re-index all tools in the smart MCP tools system
 * Useful when the AgentKit configuration changes
 */
export async function reindexSmartMcpTools(
  smartTools: SmartAgentKitMcpTools
): Promise<void> {
  await smartTools.smartToolManager.reindex();
}

/**
 * Example usage and integration helper
 */
export const SmartMcpToolsExample = {
  /**
   * Example of how to set up smart MCP tools
   */
  async setup(agentKit: AgentKit) {
    // Basic setup
    const smartTools = await initializeSmartMcpTools(agentKit);
    
    console.log("Smart MCP Tools initialized");
    console.log("Available tools:", smartTools.tools.map(t => t.name));
    
    // Check health
    const health = await getSmartMcpToolsHealth(smartTools);
    console.log("Health status:", health.status);
    
    // Get stats
    const stats = await getSmartMcpToolsStats(smartTools);
    console.log(`Indexed ${stats.totalActions} actions from ${stats.totalProviders} providers`);
    
    return smartTools;
  },

  /**
   * Example search query
   */
  async exampleSearch(smartTools: SmartAgentKitMcpTools) {
    const searchResult = await smartTools.toolHandler("search_tools", {
      query: "swap tokens on Solana",
      topK: 3,
      filters: {
        networks: ["solana"],
        requiresWallet: true,
      },
    });
    
    console.log("Search result:", searchResult.content[0].text);
    return searchResult;
  },

  /**
   * Example tool execution
   */
  async exampleExecution(smartTools: SmartAgentKitMcpTools, actionId: string) {
    const executeResult = await smartTools.toolHandler("execute_tool", {
      actionId,
      parameters: {
        // Example parameters - would vary by tool
        amount: "1.0",
        inputToken: "So11111111111111111111111111111111111111112", // SOL
        outputToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      },
    });
    
    console.log("Execution result:", executeResult.content[0].text);
    return executeResult;
  },
};