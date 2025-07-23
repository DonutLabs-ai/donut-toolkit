import { Pinecone } from "@pinecone-database/pinecone";
import { RegistryAction, ActionRegistry } from "./types";
import { ToolSpec } from "./catalogGenerator";

/**
 * Vector search configuration for registry
 */
export interface RegistryVectorSearchConfig {
  apiKey?: string;
  indexName?: string;
  namespace?: string;
  embeddingModel?: string;
  embeddingDimension?: number;
  batchSize?: number;
}

/**
 * Search request for registry actions
 */
export interface RegistrySearchRequest {
  query: string;
  topK?: number;
  filters?: {
    categories?: string[];
    providerNames?: string[];
    requiresWallet?: boolean;
    tags?: string[];
  };
}

/**
 * Search response for registry actions
 */
export interface RegistrySearchResponse {
  actionId: string;
  actionName: string;
  providerId: string;
  providerName: string;
  description: string;
  category: string;
  requiresWallet: boolean;
  tags: string[];
  score: number;
}

/**
 * Registry search error
 */
export class RegistrySearchError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "RegistrySearchError";
  }
}

/**
 * Default configuration for registry vector search
 */
const DEFAULT_REGISTRY_CONFIG = {
  INDEX_NAME: "agentkit-registry",
  NAMESPACE: "actions",
  EMBEDDING_MODEL: "multilingual-e5-large",
  EMBEDDING_DIMENSION: 1024,
  DEFAULT_TOP_K: 10,
  MAX_TOP_K: 100,
  BATCH_SIZE: 50,
} as const;

/**
 * Enhanced VectorSearchService for registry actions with Pinecone integration
 */
export class RegistryVectorSearchService {
  private pinecone: Pinecone;
  private indexName: string;
  private namespace: string;
  private embeddingModel: string;
  private embeddingDimension: number;
  private batchSize: number;

  constructor(config?: Partial<RegistryVectorSearchConfig>) {
    const finalConfig = {
      apiKey: config?.apiKey || process.env.PINECONE_API_KEY,
      indexName: config?.indexName || process.env.PINECONE_INDEX_NAME || DEFAULT_REGISTRY_CONFIG.INDEX_NAME,
      namespace: config?.namespace || process.env.PINECONE_NAMESPACE || DEFAULT_REGISTRY_CONFIG.NAMESPACE,
      embeddingModel: config?.embeddingModel || process.env.PINECONE_EMBEDDING_MODEL || DEFAULT_REGISTRY_CONFIG.EMBEDDING_MODEL,
      embeddingDimension: config?.embeddingDimension || Number(process.env.PINECONE_EMBEDDING_DIMENSION) || DEFAULT_REGISTRY_CONFIG.EMBEDDING_DIMENSION,
      batchSize: config?.batchSize || DEFAULT_REGISTRY_CONFIG.BATCH_SIZE,
    };

    if (!finalConfig.apiKey) {
      throw new RegistrySearchError(
        "Pinecone API key is required. Set PINECONE_API_KEY environment variable or pass it in config.",
        "CONFIGURATION_ERROR"
      );
    }

    this.pinecone = new Pinecone({ apiKey: finalConfig.apiKey });
    this.indexName = finalConfig.indexName;
    this.namespace = finalConfig.namespace;
    this.embeddingModel = finalConfig.embeddingModel;
    this.embeddingDimension = finalConfig.embeddingDimension;
    this.batchSize = finalConfig.batchSize;
  }

  /**
   * Initialize the vector search service and ensure index exists
   */
  async initialize(): Promise<void> {
    try {
      // Check if index exists
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(index => index.name === this.indexName);

      if (!indexExists) {
        // Create index with serverless spec
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: this.embeddingDimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }
    } catch (error) {
      throw new RegistrySearchError(
        `Failed to initialize Pinecone index: ${error}`,
        "INITIALIZATION_ERROR"
      );
    }
  }

  /**
   * Wait for the Pinecone index to be ready
   */
  private async waitForIndexReady(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const indexStats = await this.pinecone.index(this.indexName).describeIndexStats();
        if (indexStats) {
          return; // Index is ready
        }
      } catch (error) {
        // Index not ready yet, wait and retry
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new RegistrySearchError(
      "Timeout waiting for Pinecone index to be ready",
      "INITIALIZATION_ERROR"
    );
  }

  /**
   * Generate embedding using Pinecone's built-in embedding models
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.pinecone.inference.embed(
        this.embeddingModel,
        [text],
        { inputType: 'query' }
      );
      
      if (!response.data || response.data.length === 0) {
        throw new Error("No embedding returned from Pinecone");
      }

      const embedding = response.data[0].values;
      if (!embedding) {
        throw new Error("Invalid embedding returned from Pinecone");
      }

      return embedding;
    } catch (error) {
      throw new RegistrySearchError(
        `Failed to generate embedding: ${error}`,
        "EMBEDDING_ERROR"
      );
    }
  }

  /**
   * Generate batch embeddings for multiple texts
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.pinecone.inference.embed(
        this.embeddingModel,
        texts,
        { inputType: 'passage' }
      );
      
      if (!response.data || response.data.length !== texts.length) {
        throw new Error("Mismatch between number of texts and embeddings");
      }

      const embeddings: number[][] = [];
      for (const data of response.data) {
        if (!data.values) {
          throw new Error("Invalid embedding returned from Pinecone");
        }
        embeddings.push(data.values);
      }

      return embeddings;
    } catch (error) {
      throw new RegistrySearchError(
        `Failed to generate batch embeddings: ${error}`,
        "EMBEDDING_ERROR"
      );
    }
  }

  /**
   * Create embedding text for a registry action using the specified format:
   * "{provider_name} {action_name} | {description} | params: {param_str}"
   */
  private createEmbeddingText(action: RegistryAction): string {
    const paramStr = action.parameters.length > 0 
      ? action.parameters.map(p => `${p.name}: ${p.type}`).join(", ")
      : "none";
    
    // Clean action name by removing provider prefix if present
    const cleanActionName = action.name.startsWith(`${action.providerName}_`) 
      ? action.name.substring(`${action.providerName}_`.length)
      : action.name;

    return `${action.providerName} ${cleanActionName} | ${action.description} | params: ${paramStr}`;
  }

  /**
   * Build metadata for Pinecone vector from registry action
   */
  private buildVectorMetadata(action: RegistryAction): Record<string, any> {
    return {
      actionId: action.id,
      actionName: action.name,
      providerId: action.providerId,
      providerName: action.providerName,
      description: action.description,
      category: action.category,
      requiresWallet: action.requiresWallet,
      supportedNetworks: action.supportedNetworks.map(n => n.networkId),
      tags: action.metadata.tags,
      parameterCount: action.parameters.length,
      isExpensive: action.metadata.performance?.isExpensive || false,
      lastUpdated: action.metadata.lastUpdated.toISOString(),
    };
  }

  /**
   * Build metadata for Pinecone vector from tool spec
   */
  private buildToolSpecMetadata(toolSpec: ToolSpec): Record<string, any> {
    return {
      actionId: toolSpec.id,
      actionName: toolSpec.name,
      providerId: toolSpec.provider.id,
      providerName: toolSpec.provider.name,
      providerCategory: toolSpec.provider.category,
      description: toolSpec.description,
      category: toolSpec.category,
      requiresWallet: toolSpec.requiresWallet,
      supportedNetworks: toolSpec.supportedNetworks,
      tags: toolSpec.tags,
      parameterCount: toolSpec.parameters.length,
      parameterString: toolSpec.parameterString,
      isExpensive: toolSpec.metadata.performance?.isExpensive || false,
      lastUpdated: toolSpec.metadata.lastUpdated.toISOString(),
    };
  }

  /**
   * Sync registry actions to Pinecone vector store
   */
  async syncRegistryActions(actions: RegistryAction[]): Promise<void> {
    if (actions.length === 0) {
      console.log("No actions to sync");
      return;
    }

    try {
      console.log(`Starting sync of ${actions.length} registry actions to Pinecone`);
      const index = this.pinecone.index(this.indexName);
      let processedCount = 0;

      // Process in batches
      for (let i = 0; i < actions.length; i += this.batchSize) {
        const batch = actions.slice(i, i + this.batchSize);
        
        // Generate embeddings for the batch
        const embeddingTexts = batch.map(action => this.createEmbeddingText(action));
        console.log(`Generating embeddings for batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(actions.length / this.batchSize)}`);
        
        const embeddings = await this.generateBatchEmbeddings(embeddingTexts);

        // Prepare vectors for upsert
        const vectors = batch.map((action, idx) => ({
          id: action.id,
          values: embeddings[idx],
          metadata: this.buildVectorMetadata(action),
        }));

        // Upsert the batch
        console.log(`Upserting batch of ${vectors.length} vectors`);
        await index.namespace(this.namespace).upsert(vectors);
        
        processedCount += batch.length;
        console.log(`Processed ${processedCount}/${actions.length} actions`);
      }

      console.log(`Successfully synced ${actions.length} registry actions to Pinecone`);
    } catch (error) {
      throw new RegistrySearchError(
        `Failed to sync registry actions: ${error}`,
        "SYNC_ERROR"
      );
    }
  }

  /**
   * Sync tool specs to Pinecone vector store (using embeddingText from catalog)
   */
  async syncToolSpecs(toolSpecs: ToolSpec[]): Promise<void> {
    if (toolSpecs.length === 0) {
      console.log("No tool specs to sync");
      return;
    }

    try {
      console.log(`Starting sync of ${toolSpecs.length} tool specs to Pinecone`);
      const index = this.pinecone.index(this.indexName);
      let processedCount = 0;

      // Process in batches
      for (let i = 0; i < toolSpecs.length; i += this.batchSize) {
        const batch = toolSpecs.slice(i, i + this.batchSize);
        
        // Use pre-generated embedding texts from catalog
        const embeddingTexts = batch.map(toolSpec => toolSpec.embeddingText);
        console.log(`Generating embeddings for batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(toolSpecs.length / this.batchSize)}`);
        
        const embeddings = await this.generateBatchEmbeddings(embeddingTexts);

        // Prepare vectors for upsert
        const vectors = batch.map((toolSpec, idx) => ({
          id: toolSpec.id,
          values: embeddings[idx],
          metadata: this.buildToolSpecMetadata(toolSpec),
        }));

        // Upsert the batch
        console.log(`Upserting batch of ${vectors.length} vectors`);
        await index.namespace(this.namespace).upsert(vectors);
        
        processedCount += batch.length;
        console.log(`Processed ${processedCount}/${toolSpecs.length} tool specs`);
      }

      console.log(`Successfully synced ${toolSpecs.length} tool specs to Pinecone`);
    } catch (error) {
      throw new RegistrySearchError(
        `Failed to sync tool specs: ${error}`,
        "SYNC_ERROR"
      );
    }
  }

  /**
   * Clear all vectors in the namespace
   */
  async clearNamespace(): Promise<void> {
    try {
      console.log(`Clearing namespace ${this.namespace}`);
      const index = this.pinecone.index(this.indexName);
      await index.namespace(this.namespace).deleteAll();
      console.log("Namespace cleared successfully");
    } catch (error) {
      throw new RegistrySearchError(
        `Failed to clear namespace: ${error}`,
        "CLEAR_ERROR"
      );
    }
  }

  /**
   * Build Pinecone filter from search request
   */
  private buildPineconeFilter(request: RegistrySearchRequest): Record<string, any> | undefined {
    if (!request.filters) return undefined;

    const filter: Record<string, any> = {};
    
    if (request.filters.categories?.length) {
      filter.category = { $in: request.filters.categories };
    }
    
    if (request.filters.providerNames?.length) {
      filter.providerName = { $in: request.filters.providerNames };
    }
    
    if (request.filters.requiresWallet !== undefined) {
      filter.requiresWallet = { $eq: request.filters.requiresWallet };
    }

    // Tags filter using $in operator for any tag match
    if (request.filters.tags?.length) {
      filter.tags = { $in: request.filters.tags };
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * Convert Pinecone match to RegistrySearchResponse
   */
  private convertToRegistrySearchResponse(match: any): RegistrySearchResponse {
    const metadata = match.metadata;
    
    return {
      actionId: metadata.actionId,
      actionName: metadata.actionName,
      providerId: metadata.providerId,
      providerName: metadata.providerName,
      description: metadata.description,
      category: metadata.category,
      requiresWallet: metadata.requiresWallet === true,
      tags: metadata.tags || [],
      score: this.normalizeScore(match.score),
    };
  }

  /**
   * Normalize Pinecone cosine similarity score to 0-1 range
   */
  private normalizeScore(score: number): number {
    // Cosine similarity ranges from -1 to 1, normalize to 0-1
    const normalized = (score + 1) / 2;
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Search for registry actions based on query and filters
   */
  async searchActions(request: RegistrySearchRequest): Promise<RegistrySearchResponse[]> {
    try {
      const topK = Math.min(request.topK || DEFAULT_REGISTRY_CONFIG.DEFAULT_TOP_K, DEFAULT_REGISTRY_CONFIG.MAX_TOP_K);
      
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(request.query);
      
      // Build filter
      const filter = this.buildPineconeFilter(request);
      
      // Perform search
      const index = this.pinecone.index(this.indexName);
      const queryResponse = await index.namespace(this.namespace).query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
      });

      if (!queryResponse.matches) {
        return [];
      }

      // Convert results
      const results = queryResponse.matches.map(match => 
        this.convertToRegistrySearchResponse(match)
      );

      return results;
    } catch (error) {
      throw new RegistrySearchError(
        `Failed to search registry actions: ${error}`,
        "QUERY_ERROR"
      );
    }
  }

  /**
   * Get statistics about the index
   */
  async getIndexStats(): Promise<any> {
    try {
      const index = this.pinecone.index(this.indexName);
      return await index.describeIndexStats();
    } catch (error) {
      throw new RegistrySearchError(
        `Failed to get index stats: ${error}`,
        "FETCH_ERROR"
      );
    }
  }

  /**
   * Health check for the vector search service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Test embedding generation
      await this.generateEmbedding("test query");
      
      // Test index access
      const stats = await this.getIndexStats();
      
      return {
        status: "healthy",
        details: {
          indexName: this.indexName,
          namespace: this.namespace,
          embeddingModel: this.embeddingModel,
          embeddingDimension: this.embeddingDimension,
          batchSize: this.batchSize,
          indexStats: stats,
          timestamp: Date.now(),
        },
      };
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
}