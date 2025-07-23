import { AgentKit, ActionProvider, Action } from "@coinbase/agentkit";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { VectorSearchService } from "./vectorSearchService.js";
import {
  SearchableActionMetadata,
  SearchableActionProviderMetadata,
  ActionSearchRequest,
  ActionSearchResponse,
  ExecuteActionRequest,
  ExecuteActionResponse,
  SearchError,
  SearchErrorCode,
  ActionParameter,
  VectorSearchConfig,
} from "./types.js";

/**
 * Smart tool manager that handles intelligent tool retrieval and execution
 */
export class SmartToolManager {
  private vectorService: VectorSearchService;
  private agentKit: AgentKit | null = null;
  private actionRegistry: Map<string, SearchableActionMetadata> = new Map();
  private providerRegistry: Map<string, SearchableActionProviderMetadata> = new Map();
  private initialized = false;

  constructor(vectorConfig?: Partial<VectorSearchConfig>) {
    this.vectorService = new VectorSearchService(vectorConfig);
  }

  /**
   * Initialize the smart tool manager with an AgentKit instance
   */
  async initialize(agentKit: AgentKit): Promise<void> {
    if (this.initialized) {
      console.warn("SmartToolManager is already initialized");
      return;
    }

    try {
      this.agentKit = agentKit;
      
      // Initialize vector search service
      await this.vectorService.initialize();
      
      // Extract and index all actions from AgentKit
      await this.extractAndIndexActions();
      
      this.initialized = true;
      console.log(`SmartToolManager initialized with ${this.actionRegistry.size} actions from ${this.providerRegistry.size} providers`);
    } catch (error) {
      throw new SearchError(
        `Failed to initialize SmartToolManager: ${error}`,
        SearchErrorCode.INITIALIZATION_ERROR
      );
    }
  }

  /**
   * Extract all actions from AgentKit and index them
   */
  private async extractAndIndexActions(): Promise<void> {
    if (!this.agentKit) {
      throw new SearchError("AgentKit instance not available", SearchErrorCode.INITIALIZATION_ERROR);
    }

    try {
      // Get all actions from AgentKit
      const allActions = this.agentKit.getActions();
      
      // Group actions by provider name
      const providerActionsMap = new Map<string, Action[]>();
      for (const action of allActions) {
        const providerName = this.extractProviderName(action.name);
        if (!providerActionsMap.has(providerName)) {
          providerActionsMap.set(providerName, []);
        }
        providerActionsMap.get(providerName)!.push(action);
      }

      // Process each provider and its actions
      const allSearchableActions: SearchableActionMetadata[] = [];
      for (const [providerName, actions] of providerActionsMap) {
        const providerId = uuidv4();
        
        // Convert actions to searchable metadata
        const searchableActions = actions.map(action => 
          this.createSearchableActionMetadata(action, providerId, providerName)
        );

        // Create provider metadata
        const providerMetadata: SearchableActionProviderMetadata = {
          providerId,
          name: providerName,
          description: this.generateProviderDescription(providerName, actions),
          network: this.inferNetworkFromActions(actions),
          actions: searchableActions,
        };

        // Register provider and actions
        this.providerRegistry.set(providerId, providerMetadata);
        for (const action of searchableActions) {
          this.actionRegistry.set(action.actionId, action);
        }

        allSearchableActions.push(...searchableActions);
      }

      // Index all actions in vector store
      await this.vectorService.upsertActions(allSearchableActions);
      
      console.log(`Indexed ${allSearchableActions.length} actions from ${providerActionsMap.size} providers`);
    } catch (error) {
      throw new SearchError(
        `Failed to extract and index actions: ${error}`,
        SearchErrorCode.INITIALIZATION_ERROR
      );
    }
  }

  /**
   * Extract provider name from action name (removes provider prefix)
   */
  private extractProviderName(actionName: string): string {
    // Action names are typically in format: "ProviderName_actionName"
    const parts = actionName.split('_');
    if (parts.length > 1) {
      return parts[0];
    }
    return "Unknown";
  }

  /**
   * Generate a description for a provider based on its actions
   */
  private generateProviderDescription(providerName: string, actions: Action[]): string {
    if (actions.length === 0) {
      return `${providerName} action provider`;
    }

    // Create a summary based on common themes in action descriptions
    const actionNames = actions.map(a => a.name.replace(`${providerName}_`, '')).join(', ');
    return `${providerName} provides actions for: ${actionNames}`;
  }

  /**
   * Infer network from actions (this is a simplified approach)
   */
  private inferNetworkFromActions(actions: Action[]): any {
    // This is a placeholder - in reality, you'd need to access the ActionProvider
    // to get its network information. For now, we'll return a generic network object.
    return { networkId: "unknown", chainId: 0, protocolFamily: "unknown" };
  }

  /**
   * Parse Zod schema to extract parameter information
   */
  private parseSchemaToParameters(schema: any): ActionParameter[] {
    try {
      // Simplified parser that avoids complex type inference
      if (schema && typeof schema === 'object' && schema.shape) {
        const parameters: ActionParameter[] = [];
        
        for (const [key, fieldSchema] of Object.entries(schema.shape as Record<string, any>)) {
          const parameter: ActionParameter = {
            name: key,
            type: this.getZodTypeString(fieldSchema),
            required: !this.isOptional(fieldSchema),
            description: this.getDescription(fieldSchema),
          };
          parameters.push(parameter);
        }
        
        return parameters;
      }
      
      return [];
    } catch (error) {
      console.warn(`Failed to parse schema parameters: ${error}`);
      return [];
    }
  }

  /**
   * Get string representation of Zod type
   */
  private getZodTypeString(schema: any): string {
    if (schema instanceof z.ZodString) return "string";
    if (schema instanceof z.ZodNumber) return "number";
    if (schema instanceof z.ZodBoolean) return "boolean";
    if (schema instanceof z.ZodArray) return "array";
    if (schema instanceof z.ZodObject) return "object";
    if (schema instanceof z.ZodOptional) return this.getZodTypeString(schema.unwrap());
    if (schema instanceof z.ZodDefault) return this.getZodTypeString(schema._def.innerType);
    return "unknown";
  }

  /**
   * Check if Zod schema is optional
   */
  private isOptional(schema: any): boolean {
    return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault;
  }

  /**
   * Get description from Zod schema
   */
  private getDescription(schema: any): string | undefined {
    if ('description' in schema._def) {
      return schema._def.description as string;
    }
    if (schema instanceof z.ZodOptional) {
      return this.getDescription(schema.unwrap());
    }
    if (schema instanceof z.ZodDefault) {
      return this.getDescription(schema._def.innerType);
    }
    return undefined;
  }

  /**
   * Check if action requires wallet by examining its invoke function
   */
  private requiresWallet(action: Action): boolean {
    // This is a heuristic - we assume if the action name contains certain keywords
    // or if it's in categories that typically require wallets, then it requires a wallet
    const actionName = action.name.toLowerCase();
    const description = action.description.toLowerCase();
    
    const walletKeywords = [
      'transfer', 'send', 'swap', 'trade', 'stake', 'unstake', 
      'withdraw', 'deposit', 'approve', 'mint', 'burn',
      'transaction', 'sign', 'balance'
    ];
    
    return walletKeywords.some(keyword => 
      actionName.includes(keyword) || description.includes(keyword)
    );
  }

  /**
   * Create searchable action metadata from AgentKit action
   */
  private createSearchableActionMetadata(
    action: Action, 
    providerId: string, 
    providerName: string
  ): SearchableActionMetadata {
    const actionId = uuidv4();
    const parameters = this.parseSchemaToParameters(action.schema);
    const requiresWallet = this.requiresWallet(action);

    // Create result with explicit typing to avoid type inference issues
    return {
      actionId: actionId as string,
      providerId: providerId as string,
      providerName: providerName as string,
      name: action.name as string,
      description: action.description as string,
      schema: action.schema as any,
      parameters: parameters as ActionParameter[],
      requiresWallet: requiresWallet as boolean,
      invoke: action.invoke as any,
    };
  }

  /**
   * Search for tools based on natural language query
   */
  async searchTools(request: ActionSearchRequest): Promise<ActionSearchResponse[]> {
    if (!this.initialized) {
      throw new SearchError("SmartToolManager not initialized", SearchErrorCode.INITIALIZATION_ERROR);
    }

    try {
      return await this.vectorService.searchActions(request);
    } catch (error) {
      if (error instanceof SearchError) {
        throw error;
      }
      throw new SearchError(
        `Failed to search tools: ${error}`,
        SearchErrorCode.QUERY_ERROR
      );
    }
  }

  /**
   * Execute a specific tool by its ID
   */
  async executeTool(request: ExecuteActionRequest): Promise<ExecuteActionResponse> {
    if (!this.initialized) {
      throw new SearchError("SmartToolManager not initialized", SearchErrorCode.INITIALIZATION_ERROR);
    }

    try {
      // Find the action in our registry
      const action = this.actionRegistry.get(request.actionId);
      if (!action) {
        return {
          success: false,
          error: `Action with ID ${request.actionId} not found`,
        };
      }

      // Validate parameters against schema
      let validatedParams: any;
      try {
        validatedParams = action.schema.parse(request.parameters);
      } catch (validationError) {
        return {
          success: false,
          error: `Parameter validation failed: ${validationError}`,
        };
      }

      // Execute the action
      const result = await action.invoke(validatedParams);

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Execution failed: ${error}`,
      };
    }
  }

  /**
   * Get action details by ID
   */
  getActionById(actionId: string): SearchableActionMetadata | undefined {
    return this.actionRegistry.get(actionId);
  }

  /**
   * Get all available providers
   */
  getProviders(): SearchableActionProviderMetadata[] {
    return Array.from(this.providerRegistry.values());
  }

  /**
   * Get actions for a specific provider
   */
  getActionsByProvider(providerId: string): SearchableActionMetadata[] {
    const provider = this.providerRegistry.get(providerId);
    return provider?.actions || [];
  }

  /**
   * Get statistics about the indexed tools
   */
  async getStats(): Promise<{
    totalActions: number;
    totalProviders: number;
    vectorStoreStats: any;
  }> {
    const vectorStoreStats = await this.vectorService.getIndexStats();
    
    return {
      totalActions: this.actionRegistry.size,
      totalProviders: this.providerRegistry.size,
      vectorStoreStats,
    };
  }

  /**
   * Health check for the smart tool manager
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.initialized) {
        return {
          status: "unhealthy",
          details: { error: "Not initialized", timestamp: Date.now() },
        };
      }

      // Check vector service health
      const vectorHealth = await this.vectorService.healthCheck();
      
      // Get our own stats
      const stats = await this.getStats();

      if (vectorHealth.status === "healthy") {
        return {
          status: "healthy",
          details: {
            initialized: this.initialized,
            stats,
            vectorService: vectorHealth.details,
            timestamp: Date.now(),
          },
        };
      } else {
        return {
          status: "unhealthy",
          details: {
            error: "Vector service unhealthy",
            vectorService: vectorHealth.details,
            timestamp: Date.now(),
          },
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Re-index all actions (useful for updates)
   */
  async reindex(): Promise<void> {
    if (!this.initialized || !this.agentKit) {
      throw new SearchError("SmartToolManager not properly initialized", SearchErrorCode.INITIALIZATION_ERROR);
    }

    console.log("Re-indexing all actions...");
    
    // Clear existing registries
    this.actionRegistry.clear();
    this.providerRegistry.clear();
    
    // Re-extract and index actions
    await this.extractAndIndexActions();
    
    console.log("Re-indexing completed");
  }
}