import { 
  AgentKit, 
  ActionProvider, 
  RegistryManager, 
  RegistryManagerConfig,
  RegistrySearchRequest,
  RegistrySearchResponse,
  RegistryAction
} from "@coinbase/agentkit";
import {
  ExecuteActionRequest,
  ExecuteActionResponse,
  SearchError,
  SearchErrorCode,
} from "./types.js";

/**
 * Configuration for RegistrySmartToolManager
 */
export interface RegistrySmartToolManagerConfig {
  /** Registry manager configuration */
  registryConfig?: RegistryManagerConfig;
  
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

/**
 * Enhanced SmartToolManager that uses the registry system for intelligent tool management
 */
export class RegistrySmartToolManager {
  private registryManager: RegistryManager;
  private agentKit: AgentKit | null = null;
  private initialized = false;
  private config: RegistrySmartToolManagerConfig;

  constructor(config: RegistrySmartToolManagerConfig = {}) {
    this.config = {
      verbose: false,
      ...config
    };

    // Initialize registry manager with enhanced config
    const registryConfig: RegistryManagerConfig = {
      syncToPinecone: true,
      clearBeforeSync: false,
      verbose: this.config.verbose,
      ...this.config.registryConfig
    };

    this.registryManager = new RegistryManager(registryConfig);
  }

  /**
   * Initialize the smart tool manager with an AgentKit instance
   */
  async initialize(agentKit: AgentKit): Promise<void> {
    if (this.initialized) {
      console.warn("RegistrySmartToolManager is already initialized");
      return;
    }

    try {
      this.agentKit = agentKit;
      
      this.log("Initializing RegistrySmartToolManager...");
      
      // Extract action providers from AgentKit
      const actionProviders = this.extractActionProviders(agentKit);
      this.log(`Extracted ${actionProviders.length} action providers from AgentKit`);

      // Build registry and sync to Pinecone
      const result = await this.registryManager.buildRegistry(actionProviders, agentKit.getWalletProvider());
      
      this.log("Registry build completed:");
      this.log(`  - Providers processed: ${result.stats.providersProcessed}`);
      this.log(`  - Actions extracted: ${result.stats.actionsExtracted}`);
      this.log(`  - Build time: ${result.stats.buildTimeMs}ms`);
      this.log(`  - Synced to Pinecone: ${result.stats.syncedToPinecone}`);
      
      if (result.stats.syncTimeMs) {
        this.log(`  - Sync time: ${result.stats.syncTimeMs}ms`);
      }

      this.initialized = true;
      this.log("RegistrySmartToolManager initialized successfully");
    } catch (error) {
      throw new SearchError(
        `Failed to initialize RegistrySmartToolManager: ${error}`,
        SearchErrorCode.INITIALIZATION_ERROR
      );
    }
  }

  /**
   * Extract ActionProvider instances from AgentKit
   */
  private extractActionProviders(agentKit: AgentKit): ActionProvider[] {
    try {
      // Get all actions from AgentKit
      const allActions = agentKit.getActions();
      
      // This is a simplified approach since we don't have direct access to ActionProvider instances
      // In practice, you might need to modify AgentKit to expose getActionProviders() method
      // For now, we'll create dummy providers based on action names
      
      const providerMap = new Map<string, any[]>();
      
      for (const action of allActions) {
        const providerName = this.extractProviderName(action.name);
        if (!providerMap.has(providerName)) {
          providerMap.set(providerName, []);
        }
        providerMap.get(providerName)!.push(action);
      }

      // Create ActionProvider instances (this is a workaround)
      // In reality, AgentKit should provide access to the actual ActionProvider instances
      const providers: ActionProvider[] = [];
      
      // Since we can't directly create ActionProvider instances without the actual classes,
      // we'll need to work with what we have from AgentKit
      // This might require modifications to AgentKit to expose providers
      
      this.log(`Found ${providerMap.size} unique providers by name`);
      
      // For now, return empty array and log a warning
      console.warn("Direct ActionProvider extraction not available. Consider modifying AgentKit to expose getActionProviders() method.");
      
      return providers;
    } catch (error) {
      this.log(`Failed to extract action providers: ${error}`);
      throw error;
    }
  }

  /**
   * Extract provider name from action name
   */
  private extractProviderName(actionName: string): string {
    const parts = actionName.split('_');
    if (parts.length > 1) {
      return parts[0];
    }
    return "Unknown";
  }

  /**
   * Initialize with pre-built ActionProvider instances (alternative method)
   */
  async initializeWithProviders(
    agentKit: AgentKit, 
    actionProviders: ActionProvider[]
  ): Promise<void> {
    if (this.initialized) {
      console.warn("RegistrySmartToolManager is already initialized");
      return;
    }

    try {
      this.agentKit = agentKit;
      
      this.log("Initializing RegistrySmartToolManager with provided ActionProviders...");
      this.log(`Processing ${actionProviders.length} action providers`);

      // Build registry and sync to Pinecone
      const result = await this.registryManager.buildRegistry(actionProviders, agentKit.getWalletProvider());
      
      this.log("Registry build completed:");
      this.log(`  - Providers processed: ${result.stats.providersProcessed}`);
      this.log(`  - Actions extracted: ${result.stats.actionsExtracted}`);
      this.log(`  - Build time: ${result.stats.buildTimeMs}ms`);
      this.log(`  - Synced to Pinecone: ${result.stats.syncedToPinecone}`);
      
      if (result.stats.syncTimeMs) {
        this.log(`  - Sync time: ${result.stats.syncTimeMs}ms`);
      }

      this.initialized = true;
      this.log("RegistrySmartToolManager initialized successfully");
    } catch (error) {
      throw new SearchError(
        `Failed to initialize RegistrySmartToolManager: ${error}`,
        SearchErrorCode.INITIALIZATION_ERROR
      );
    }
  }

  /**
   * Search for tools based on natural language query using vector search
   */
  async searchTools(query: string, options?: {
    topK?: number;
    filters?: {
      categories?: string[];
      providerNames?: string[];
      requiresWallet?: boolean;
      tags?: string[];
    };
  }): Promise<RegistrySearchResponse[]> {
    if (!this.initialized) {
      throw new SearchError("RegistrySmartToolManager not initialized", SearchErrorCode.INITIALIZATION_ERROR);
    }

    try {
      const request: RegistrySearchRequest = {
        query,
        topK: options?.topK || 10,
        filters: options?.filters
      };

      return await this.registryManager.searchActions(request);
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
      throw new SearchError("RegistrySmartToolManager not initialized", SearchErrorCode.INITIALIZATION_ERROR);
    }

    try {
      // Get action from registry
      const registryAction = this.registryManager.getActionById(request.actionId);
      if (!registryAction) {
        return {
          success: false,
          error: `Action with ID ${request.actionId} not found in registry`,
        };
      }

      // Validate parameters against schema
      let validatedParams: any;
      try {
        validatedParams = registryAction.schema.parse(request.parameters);
      } catch (validationError) {
        return {
          success: false,
          error: `Parameter validation failed: ${validationError}`,
        };
      }

      // Execute the action
      const result = await registryAction.invoke(validatedParams);

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
   * Get action details by ID from registry
   */
  getActionById(actionId: string): RegistryAction | undefined {
    return this.registryManager.getActionById(actionId);
  }

  /**
   * Get tool spec by ID from catalog
   */
  getToolSpecById(toolId: string): any {
    return this.registryManager.getToolSpecById(toolId);
  }

  /**
   * Filter actions by criteria
   */
  filterActions(filters: any): RegistryAction[] {
    return this.registryManager.filterActions(filters);
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): any {
    return this.registryManager.getRegistryStats();
  }

  /**
   * Get statistics about the indexed tools
   */
  async getStats(): Promise<{
    registryStats: any;
    vectorStoreStats: any;
  }> {
    const registryStats = this.getRegistryStats();
    
    const vectorSearchService = this.registryManager.getVectorSearchService();
    let vectorStoreStats = null;
    
    if (vectorSearchService) {
      try {
        vectorStoreStats = await vectorSearchService.getIndexStats();
      } catch (error) {
        this.log(`Failed to get vector store stats: ${error}`);
      }
    }
    
    return {
      registryStats,
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

      // Check vector search service health
      const vectorHealth = await this.registryManager.getSearchServiceHealth();
      
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
   * Rebuild registry and re-sync to Pinecone
   */
  async rebuildRegistry(actionProviders: ActionProvider[]): Promise<void> {
    if (!this.initialized || !this.agentKit) {
      throw new SearchError("RegistrySmartToolManager not properly initialized", SearchErrorCode.INITIALIZATION_ERROR);
    }

    this.log("Rebuilding registry...");
    
    const result = await this.registryManager.rebuildAndSync(actionProviders, this.agentKit.getWalletProvider());
    
    this.log("Registry rebuild completed:");
    this.log(`  - Providers processed: ${result.stats.providersProcessed}`);
    this.log(`  - Actions extracted: ${result.stats.actionsExtracted}`);
    this.log(`  - Build time: ${result.stats.buildTimeMs}ms`);
    this.log(`  - Sync time: ${result.stats.syncTimeMs}ms`);
  }

  /**
   * Export catalog as JSON
   */
  exportCatalogAsJson(): string {
    return this.registryManager.exportCatalogAsJson();
  }

  /**
   * Search tools locally in catalog (for testing)
   */
  searchToolsLocally(query: string, limit: number = 10): any[] {
    return this.registryManager.searchToolsLocally(query, limit);
  }

  /**
   * Get registry manager instance
   */
  getRegistryManager(): RegistryManager {
    return this.registryManager;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[RegistrySmartToolManager] ${message}`);
    }
  }
}