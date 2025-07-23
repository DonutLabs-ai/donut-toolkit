import { ActionRegistry, RegistryAction, RegistryActionProvider, ActionParameter } from "./types";

/**
 * Tool specification for catalog generation
 */
export interface ToolSpec {
  /** Unique tool identifier */
  id: string;
  
  /** Tool name */
  name: string;
  
  /** Tool description */
  description: string;
  
  /** Provider information */
  provider: {
    id: string;
    name: string;
    category: string;
  };
  
  /** Tool category */
  category: string;
  
  /** Parameters */
  parameters: ActionParameter[];
  
  /** Parameter string for embedding */
  parameterString: string;
  
  /** Embedding text in the specified format */
  embeddingText: string;
  
  /** Whether requires wallet */
  requiresWallet: boolean;
  
  /** Supported networks */
  supportedNetworks: string[];
  
  /** Tags for enhanced search */
  tags: string[];
  
  /** Additional metadata */
  metadata: {
    examples?: string[];
    performance?: {
      avgExecutionTime?: number;
      isExpensive?: boolean;
    };
    lastUpdated: Date;
  };
}

/**
 * Tool Spec Catalog containing all tools organized for search and execution
 */
export interface ToolSpecCatalog {
  /** Map of tool ID to tool spec */
  tools: Map<string, ToolSpec>;
  
  /** Index by category */
  categoryIndex: Map<string, string[]>;
  
  /** Index by provider */
  providerIndex: Map<string, string[]>;
  
  /** Index by tags */
  tagIndex: Map<string, string[]>;
  
  /** Catalog metadata */
  metadata: {
    totalTools: number;
    totalProviders: number;
    categories: string[];
    buildTime: Date;
    version: string;
  };
}

/**
 * CatalogGenerator creates Tool Spec Catalog from ActionRegistry
 * with embedding texts in the format: "{provider_name} {action_name} | {description} | params: {param_str}"
 */
export class CatalogGenerator {
  
  /**
   * Generate Tool Spec Catalog from ActionRegistry
   */
  generateCatalog(registry: ActionRegistry): ToolSpecCatalog {
    const catalog: ToolSpecCatalog = {
      tools: new Map(),
      categoryIndex: new Map(),
      providerIndex: new Map(),
      tagIndex: new Map(),
      metadata: {
        totalTools: 0,
        totalProviders: registry.providers.size,
        categories: [],
        buildTime: new Date(),
        version: registry.metadata.version
      }
    };

    // Process all actions in the registry
    for (const [actionId, action] of registry.actions) {
      const provider = registry.providers.get(action.providerId);
      if (!provider) {
        console.warn(`Provider ${action.providerId} not found for action ${actionId}`);
        continue;
      }

      const toolSpec = this.createToolSpec(action, provider);
      catalog.tools.set(actionId, toolSpec);

      // Update indexes
      this.updateCategoryIndex(catalog.categoryIndex, action.category, actionId);
      this.updateProviderIndex(catalog.providerIndex, action.providerId, actionId);
      this.updateTagIndex(catalog.tagIndex, toolSpec.tags, actionId);
    }

    // Update metadata
    this.updateCatalogMetadata(catalog);
    
    return catalog;
  }

  /**
   * Create ToolSpec from RegistryAction and RegistryActionProvider
   */
  private createToolSpec(action: RegistryAction, provider: RegistryActionProvider): ToolSpec {
    const parameterString = this.generateParameterString(action.parameters);
    const embeddingText = this.generateEmbeddingText(
      provider.name,
      action.name,
      action.description,
      parameterString
    );

    return {
      id: action.id,
      name: action.name,
      description: action.description,
      provider: {
        id: provider.id,
        name: provider.name,
        category: provider.category
      },
      category: action.category,
      parameters: action.parameters,
      parameterString,
      embeddingText,
      requiresWallet: action.requiresWallet,
      supportedNetworks: action.supportedNetworks.map(n => n.networkId).filter((id): id is string => id !== undefined),
      tags: this.generateTags(action, provider),
      metadata: {
        examples: action.metadata.examples,
        performance: action.metadata.performance,
        lastUpdated: action.metadata.lastUpdated
      }
    };
  }

  /**
   * Generate parameter string for embedding
   * Format: param1: type1, param2: type2, ...
   */
  private generateParameterString(parameters: ActionParameter[]): string {
    if (parameters.length === 0) {
      return "none";
    }

    return parameters
      .map(param => {
        let paramStr = `${param.name}: ${param.type}`;
        
        if (!param.required) {
          paramStr += " (optional)";
        }
        
        if (param.defaultValue !== undefined) {
          paramStr += ` (default: ${param.defaultValue})`;
        }
        
        if (param.enumValues && param.enumValues.length > 0) {
          paramStr += ` (${param.enumValues.join('|')})`;
        }
        
        return paramStr;
      })
      .join(", ");
  }

  /**
   * Generate embedding text in the specified format:
   * "{provider_name} {action_name} | {description} | params: {param_str}"
   */
  private generateEmbeddingText(
    providerName: string,
    actionName: string,
    description: string,
    parameterString: string
  ): string {
    // Clean action name by removing provider prefix if present
    const cleanActionName = actionName.startsWith(`${providerName}_`) 
      ? actionName.substring(`${providerName}_`.length)
      : actionName;

    return `${providerName} ${cleanActionName} | ${description} | params: ${parameterString}`;
  }

  /**
   * Generate comprehensive tags for search
   */
  private generateTags(action: RegistryAction, provider: RegistryActionProvider): string[] {
    const tags = new Set<string>();

    // Add provider tags
    provider.metadata.tags.forEach(tag => tags.add(tag));
    
    // Add action tags
    action.metadata.tags.forEach(tag => tags.add(tag));

    // Add category tags
    tags.add(action.category.toLowerCase());
    tags.add(provider.category.toLowerCase());

    // Add provider name
    tags.add(provider.name.toLowerCase());

    // Add action name variations
    const actionNameParts = action.name.toLowerCase().split('_');
    actionNameParts.forEach(part => {
      if (part.length > 2) { // Avoid very short words
        tags.add(part);
      }
    });

    // Add network tags
    action.supportedNetworks.forEach(network => {
      if (network.networkId) {
        tags.add(network.networkId.toLowerCase());
      }
      tags.add(network.protocolFamily.toLowerCase());
    });

    // Add wallet requirement tag
    if (action.requiresWallet) {
      tags.add("wallet-required");
    } else {
      tags.add("no-wallet");
    }

    // Add performance tags
    if (action.metadata.performance?.isExpensive) {
      tags.add("expensive");
    }

    return Array.from(tags).sort();
  }

  /**
   * Update category index
   */
  private updateCategoryIndex(
    categoryIndex: Map<string, string[]>,
    category: string,
    actionId: string
  ): void {
    if (!categoryIndex.has(category)) {
      categoryIndex.set(category, []);
    }
    categoryIndex.get(category)!.push(actionId);
  }

  /**
   * Update provider index
   */
  private updateProviderIndex(
    providerIndex: Map<string, string[]>,
    providerId: string,
    actionId: string
  ): void {
    if (!providerIndex.has(providerId)) {
      providerIndex.set(providerId, []);
    }
    providerIndex.get(providerId)!.push(actionId);
  }

  /**
   * Update tag index
   */
  private updateTagIndex(
    tagIndex: Map<string, string[]>,
    tags: string[],
    actionId: string
  ): void {
    for (const tag of tags) {
      if (!tagIndex.has(tag)) {
        tagIndex.set(tag, []);
      }
      tagIndex.get(tag)!.push(actionId);
    }
  }

  /**
   * Update catalog metadata
   */
  private updateCatalogMetadata(catalog: ToolSpecCatalog): void {
    catalog.metadata.totalTools = catalog.tools.size;
    catalog.metadata.categories = Array.from(catalog.categoryIndex.keys()).sort();
  }

  /**
   * Export catalog as JSON
   */
  exportCatalogAsJson(catalog: ToolSpecCatalog): string {
    // Convert Maps to Objects for JSON serialization
    const exportData = {
      tools: Object.fromEntries(catalog.tools),
      categoryIndex: Object.fromEntries(catalog.categoryIndex),
      providerIndex: Object.fromEntries(catalog.providerIndex),
      tagIndex: Object.fromEntries(catalog.tagIndex),
      metadata: catalog.metadata
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get embedding texts for all tools (for Pinecone sync)
   */
  getEmbeddingTexts(catalog: ToolSpecCatalog): Array<{ id: string; text: string; metadata: any }> {
    const embeddingData: Array<{ id: string; text: string; metadata: any }> = [];

    for (const [toolId, toolSpec] of catalog.tools) {
      embeddingData.push({
        id: toolId,
        text: toolSpec.embeddingText,
        metadata: {
          name: toolSpec.name,
          description: toolSpec.description,
          category: toolSpec.category,
          providerId: toolSpec.provider.id,
          providerName: toolSpec.provider.name,
          providerCategory: toolSpec.provider.category,
          requiresWallet: toolSpec.requiresWallet,
          supportedNetworks: toolSpec.supportedNetworks,
          tags: toolSpec.tags,
          parameterString: toolSpec.parameterString,
          lastUpdated: toolSpec.metadata.lastUpdated.toISOString()
        }
      });
    }

    return embeddingData;
  }

  /**
   * Search tools by query (for testing purposes)
   */
  searchTools(catalog: ToolSpecCatalog, query: string, limit: number = 10): ToolSpec[] {
    const queryLower = query.toLowerCase();
    const results: Array<{ tool: ToolSpec; score: number }> = [];

    for (const [, toolSpec] of catalog.tools) {
      let score = 0;

      // Score based on name match
      if (toolSpec.name.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Score based on description match
      if (toolSpec.description.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Score based on provider name match
      if (toolSpec.provider.name.toLowerCase().includes(queryLower)) {
        score += 3;
      }

      // Score based on tag match
      for (const tag of toolSpec.tags) {
        if (tag.includes(queryLower)) {
          score += 2;
        }
      }

      // Score based on category match
      if (toolSpec.category.toLowerCase().includes(queryLower)) {
        score += 3;
      }

      if (score > 0) {
        results.push({ tool: toolSpec, score });
      }
    }

    // Sort by score descending and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.tool);
  }
}