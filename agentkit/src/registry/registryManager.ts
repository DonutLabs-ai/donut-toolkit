import { ActionProvider } from "../action-providers/actionProvider";
import { WalletProvider } from "../wallet-providers";
import { 
  ActionRegistry, 
  RegistryConfig, 
  RegistrySearchFilters 
} from "./types";
import { RegistryBuilder } from "./registryBuilder";
import { CatalogGenerator, ToolSpecCatalog, ToolSpec } from "./catalogGenerator";
import { 
  RegistryVectorSearchService, 
  RegistryVectorSearchConfig, 
  RegistrySearchRequest, 
  RegistrySearchResponse 
} from "./vectorSearchService";

/**
 * Configuration for RegistryManager
 */
export interface RegistryManagerConfig {
  /** Registry building configuration */
  registryConfig?: RegistryConfig;
  
  /** Vector search configuration */
  vectorSearchConfig?: RegistryVectorSearchConfig;
  
  /** Whether to sync to Pinecone after building registry */
  syncToPinecone?: boolean;
  
  /** Whether to clear existing vectors before sync */
  clearBeforeSync?: boolean;
  
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

/**
 * Registry build result
 */
export interface RegistryBuildResult {
  /** Built registry */
  registry: ActionRegistry;
  
  /** Generated catalog */
  catalog: ToolSpecCatalog;
  
  /** Build statistics */
  stats: {
    providersProcessed: number;
    actionsExtracted: number;
    catalogGenerated: boolean;
    syncedToPinecone: boolean;
    buildTimeMs: number;
    syncTimeMs?: number;
  };
}

/**
 * RegistryManager orchestrates the complete registry building and Pinecone sync workflow
 */
export class RegistryManager {
  private config: RegistryManagerConfig;
  private registryBuilder: RegistryBuilder;
  private catalogGenerator: CatalogGenerator;
  private vectorSearchService?: RegistryVectorSearchService;
  private registry?: ActionRegistry;
  private catalog?: ToolSpecCatalog;

  constructor(config: RegistryManagerConfig = {}) {
    this.config = {
      syncToPinecone: true,
      clearBeforeSync: false,
      verbose: false,
      ...config
    };

    this.registryBuilder = new RegistryBuilder(this.config.registryConfig);
    this.catalogGenerator = new CatalogGenerator();

    // Initialize vector search service if Pinecone sync is enabled
    if (this.config.syncToPinecone) {
      this.vectorSearchService = new RegistryVectorSearchService(this.config.vectorSearchConfig);
    }
  }

  /**
   * Build registry from ActionProviders and optionally sync to Pinecone
   */
  async buildRegistry(
    providers: ActionProvider[],
    walletProvider?: WalletProvider
  ): Promise<RegistryBuildResult> {
    const buildStartTime = Date.now();
    
    try {
      this.log("Starting registry build process...");
      this.log(`Processing ${providers.length} action providers`);

      // Step 1: Build registry from providers
      this.log("Building registry from action providers...");
      this.registry = await this.registryBuilder.buildFromProviders(providers, walletProvider);
      
      this.log(`Registry built successfully:`);
      this.log(`  - ${this.registry.metadata.providerCount} providers`);
      this.log(`  - ${this.registry.metadata.actionCount} actions`);

      // Step 2: Generate catalog from registry
      this.log("Generating tool spec catalog...");
      this.catalog = this.catalogGenerator.generateCatalog(this.registry);
      
      this.log(`Catalog generated successfully:`);
      this.log(`  - ${this.catalog.metadata.totalTools} tools`);
      this.log(`  - ${this.catalog.metadata.categories.length} categories`);

      const buildTime = Date.now() - buildStartTime;
      let syncTime: number | undefined;

      // Step 3: Sync to Pinecone if enabled
      let syncedToPinecone = false;
      if (this.config.syncToPinecone && this.vectorSearchService) {
        const syncStartTime = Date.now();
        await this.syncToPinecone();
        syncTime = Date.now() - syncStartTime;
        syncedToPinecone = true;
      }

      const result: RegistryBuildResult = {
        registry: this.registry,
        catalog: this.catalog,
        stats: {
          providersProcessed: providers.length,
          actionsExtracted: this.registry.metadata.actionCount,
          catalogGenerated: true,
          syncedToPinecone,
          buildTimeMs: buildTime,
          syncTimeMs: syncTime,
        }
      };

      this.log(`Registry build completed successfully in ${buildTime}ms`);
      if (syncTime) {
        this.log(`Pinecone sync completed in ${syncTime}ms`);
      }

      return result;

    } catch (error) {
      const errorMessage = `Registry build failed: ${error}`;
      this.log(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Sync current catalog to Pinecone
   */
  async syncToPinecone(): Promise<void> {
    if (!this.vectorSearchService) {
      throw new Error("Vector search service not initialized. Set syncToPinecone: true in config");
    }

    if (!this.catalog) {
      throw new Error("No catalog available. Build registry first");
    }

    try {
      this.log("Initializing Pinecone vector search service...");
      await this.vectorSearchService.initialize();

      // Clear existing vectors if requested
      if (this.config.clearBeforeSync) {
        this.log("Clearing existing vectors from Pinecone...");
        await this.vectorSearchService.clearNamespace();
      }

      // Convert catalog to tool specs array
      const toolSpecs = Array.from(this.catalog.tools.values());
      
      this.log(`Syncing ${toolSpecs.length} tool specs to Pinecone...`);
      await this.vectorSearchService.syncToolSpecs(toolSpecs);

      this.log("Pinecone sync completed successfully");

    } catch (error) {
      const errorMessage = `Pinecone sync failed: ${error}`;
      this.log(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Search for actions using vector search
   */
  async searchActions(request: RegistrySearchRequest): Promise<RegistrySearchResponse[]> {
    if (!this.vectorSearchService) {
      throw new Error("Vector search service not initialized. Set syncToPinecone: true in config");
    }

    try {
      return await this.vectorSearchService.searchActions(request);
    } catch (error) {
      this.log(`Search failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get action by ID from registry
   */
  getActionById(actionId: string): any | undefined {
    if (!this.registry) {
      throw new Error("No registry available. Build registry first");
    }

    return this.registry.actions.get(actionId);
  }

  /**
   * Get provider by ID from registry
   */
  getProviderById(providerId: string): any | undefined {
    if (!this.registry) {
      throw new Error("No registry available. Build registry first");
    }

    return this.registry.providers.get(providerId);
  }

  /**
   * Get tool spec by ID from catalog
   */
  getToolSpecById(toolId: string): ToolSpec | undefined {
    if (!this.catalog) {
      throw new Error("No catalog available. Build registry first");
    }

    return this.catalog.tools.get(toolId);
  }

  /**
   * Filter actions by criteria
   */
  filterActions(filters: RegistrySearchFilters): any[] {
    if (!this.registry) {
      throw new Error("No registry available. Build registry first");
    }

    let filteredActions = Array.from(this.registry.actions.values());

    // Apply filters
    if (filters.actionCategories?.length) {
      filteredActions = filteredActions.filter(action => 
        filters.actionCategories!.includes(action.category as any)
      );
    }

    if (filters.providerNames?.length) {
      filteredActions = filteredActions.filter(action => 
        filters.providerNames!.includes(action.providerName)
      );
    }

    if (filters.requiresWallet !== undefined) {
      filteredActions = filteredActions.filter(action => 
        action.requiresWallet === filters.requiresWallet
      );
    }

    if (filters.tags?.length) {
      filteredActions = filteredActions.filter(action =>
        filters.tags!.some(tag => action.metadata.tags.includes(tag))
      );
    }

    return filteredActions;
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): any {
    if (!this.registry) {
      throw new Error("No registry available. Build registry first");
    }

    const categories = new Set<string>();
    const providers = new Set<string>();
    let walletRequiredCount = 0;
    let expensiveActionCount = 0;

    for (const action of this.registry.actions.values()) {
      categories.add(action.category);
      providers.add(action.providerName);
      
      if (action.requiresWallet) {
        walletRequiredCount++;
      }
      
      if (action.metadata.performance?.isExpensive) {
        expensiveActionCount++;
      }
    }

    return {
      totalProviders: this.registry.metadata.providerCount,
      totalActions: this.registry.metadata.actionCount,
      uniqueCategories: categories.size,
      categoriesList: Array.from(categories).sort(),
      uniqueProviders: providers.size,
      providersList: Array.from(providers).sort(),
      walletRequiredActions: walletRequiredCount,
      expensiveActions: expensiveActionCount,
      buildTime: this.registry.metadata.buildTime,
      version: this.registry.metadata.version,
    };
  }

  /**
   * Export catalog as JSON
   */
  exportCatalogAsJson(): string {
    if (!this.catalog) {
      throw new Error("No catalog available. Build registry first");
    }

    return this.catalogGenerator.exportCatalogAsJson(this.catalog);
  }

  /**
   * Get vector search service health status
   */
  async getSearchServiceHealth(): Promise<any> {
    if (!this.vectorSearchService) {
      return { status: "disabled", message: "Vector search not configured" };
    }

    return await this.vectorSearchService.healthCheck();
  }

  /**
   * Get current registry
   */
  getRegistry(): ActionRegistry | undefined {
    return this.registry;
  }

  /**
   * Get current catalog
   */
  getCatalog(): ToolSpecCatalog | undefined {
    return this.catalog;
  }

  /**
   * Get vector search service
   */
  getVectorSearchService(): RegistryVectorSearchService | undefined {
    return this.vectorSearchService;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[RegistryManager] ${message}`);
    }
  }

  /**
   * Rebuild registry and resync to Pinecone
   */
  async rebuildAndSync(
    providers: ActionProvider[],
    walletProvider?: WalletProvider
  ): Promise<RegistryBuildResult> {
    this.log("Starting registry rebuild...");
    
    // Force clear before sync on rebuild
    const originalClearBeforeSync = this.config.clearBeforeSync;
    this.config.clearBeforeSync = true;
    
    try {
      const result = await this.buildRegistry(providers, walletProvider);
      this.log("Registry rebuild completed successfully");
      return result;
    } finally {
      // Restore original setting
      this.config.clearBeforeSync = originalClearBeforeSync;
    }
  }

  /**
   * Search tools in catalog (local search for testing)
   */
  searchToolsLocally(query: string, limit: number = 10): ToolSpec[] {
    if (!this.catalog) {
      throw new Error("No catalog available. Build registry first");
    }

    return this.catalogGenerator.searchTools(this.catalog, query, limit);
  }
}