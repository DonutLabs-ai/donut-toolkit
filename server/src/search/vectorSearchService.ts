import { Pinecone } from "@pinecone-database/pinecone";
import {
  SearchableActionMetadata,
  ActionSearchRequest,
  ActionSearchResponse,
  VectorSearchConfig,
  SearchError,
  SearchErrorCode,
  DEFAULT_CONFIG,
  ActionParameter,
} from "./types.js";

/**
 * Vector search service using Pinecone with built-in embedding models
 */
export class VectorSearchService {
  private pinecone: Pinecone;
  private indexName: string;
  private namespace: string;
  private embeddingModel: string;
  private embeddingDimension: number;

  constructor(config?: Partial<VectorSearchConfig>) {
    const finalConfig = {
      apiKey: config?.apiKey || process.env.PINECONE_API_KEY,
      indexName: config?.indexName || process.env.PINECONE_INDEX_NAME || DEFAULT_CONFIG.INDEX_NAME,
      namespace: config?.namespace || process.env.PINECONE_NAMESPACE || DEFAULT_CONFIG.NAMESPACE,
      embeddingModel: config?.embeddingModel || process.env.PINECONE_EMBEDDING_MODEL || DEFAULT_CONFIG.EMBEDDING_MODEL,
      embeddingDimension: config?.embeddingDimension || Number(process.env.PINECONE_EMBEDDING_DIMENSION) || DEFAULT_CONFIG.EMBEDDING_DIMENSION,
    };

    if (!finalConfig.apiKey) {
      throw new SearchError(
        "Pinecone API key is required. Set PINECONE_API_KEY environment variable or pass it in config.",
        SearchErrorCode.CONFIGURATION_ERROR
      );
    }

    this.pinecone = new Pinecone({ apiKey: finalConfig.apiKey });
    this.indexName = finalConfig.indexName;
    this.namespace = finalConfig.namespace;
    this.embeddingModel = finalConfig.embeddingModel;
    this.embeddingDimension = finalConfig.embeddingDimension;
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
      throw new SearchError(
        `Failed to initialize Pinecone index: ${error}`,
        SearchErrorCode.INITIALIZATION_ERROR
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

    throw new SearchError(
      "Timeout waiting for Pinecone index to be ready",
      SearchErrorCode.INITIALIZATION_ERROR
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
      throw new SearchError(
        `Failed to generate embedding: ${error}`,
        SearchErrorCode.EMBEDDING_ERROR
      );
    }
  }

  /**
   * Create embedding text for an action
   */
  private createEmbeddingText(action: SearchableActionMetadata): string {
    const paramNames = action.parameters.map(p => p.name).join(", ");
    const paramStr = paramNames || "none";
    
    // Format: "{providerName} {actionName} | {description} | params: {param1}, {param2}, ..."
    return `${action.providerName} ${action.name} | ${action.description} | params: ${paramStr}`;
  }

  /**
   * Build metadata for Pinecone vector
   */
  private buildVectorMetadata(action: SearchableActionMetadata): Record<string, any> {
    return {
      actionId: action.actionId,
      providerId: action.providerId,
      providerName: action.providerName,
      actionName: action.name,
      description: action.description,
      requiresWallet: action.requiresWallet,
      parameters: JSON.stringify(action.parameters),
    };
  }

  /**
   * Upsert a single action into the vector store
   */
  async upsertAction(action: SearchableActionMetadata): Promise<void> {
    try {
      const embeddingText = this.createEmbeddingText(action);
      const embedding = await this.generateEmbedding(embeddingText);
      const metadata = this.buildVectorMetadata(action);

      const index = this.pinecone.index(this.indexName);
      await index.namespace(this.namespace).upsert([
        {
          id: action.actionId,
          values: embedding,
          metadata,
        },
      ]);
    } catch (error) {
      throw new SearchError(
        `Failed to upsert action ${action.actionId}: ${error}`,
        SearchErrorCode.UPSERT_ERROR
      );
    }
  }

  /**
   * Upsert multiple actions in batch
   */
  async upsertActions(actions: SearchableActionMetadata[]): Promise<void> {
    if (actions.length === 0) return;

    try {
      const batchSize = DEFAULT_CONFIG.BATCH_SIZE;
      const index = this.pinecone.index(this.indexName);

      // Process in batches
      for (let i = 0; i < actions.length; i += batchSize) {
        const batch = actions.slice(i, i + batchSize);
        
        // Generate embeddings for the batch
        const embeddingTexts = batch.map(action => this.createEmbeddingText(action));
        const embeddingResponse = await this.pinecone.inference.embed(
          this.embeddingModel,
          embeddingTexts,
          { inputType: 'passage' }
        );

        if (!embeddingResponse.data || embeddingResponse.data.length !== batch.length) {
          throw new Error("Mismatch between number of actions and embeddings");
        }

        // Prepare vectors for upsert
        const vectors = batch.map((action, idx) => {
          const embedding = embeddingResponse.data[idx].values;
          if (!embedding) {
            throw new Error(`No embedding for action ${action.actionId}`);
          }
          return {
            id: action.actionId,
            values: embedding,
            metadata: this.buildVectorMetadata(action),
          };
        });

        // Upsert the batch
        await index.namespace(this.namespace).upsert(vectors);
      }
    } catch (error) {
      throw new SearchError(
        `Failed to upsert actions: ${error}`,
        SearchErrorCode.UPSERT_ERROR
      );
    }
  }

  /**
   * Build Pinecone filter from search request
   */
  private buildPineconeFilter(request: ActionSearchRequest): Record<string, any> | undefined {
    if (!request.filters) return undefined;

    const filter: Record<string, any> = {};
    
    if (request.filters.providerNames?.length) {
      filter.providerName = { $in: request.filters.providerNames };
    }
    
    if (request.filters.networks?.length) {
      filter.network = { $in: request.filters.networks };
    }
    
    if (request.filters.requiresWallet !== undefined) {
      filter.requiresWallet = { $eq: request.filters.requiresWallet };
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * Convert Pinecone match to ActionSearchResponse
   */
  private convertToActionSearchResponse(match: any): ActionSearchResponse {
    const metadata = match.metadata;
    
    let parameters: ActionParameter[] = [];
    try {
      if (metadata.parameters) {
        parameters = JSON.parse(metadata.parameters);
      }
    } catch (error) {
      console.warn(`Failed to parse parameters for action ${metadata.actionId}:`, error);
    }

    return {
      actionId: metadata.actionId,
      actionName: metadata.actionName,
      providerId: metadata.providerId,
      providerName: metadata.providerName,
      description: metadata.description,
      parameters,
      requiresWallet: metadata.requiresWallet === true,
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
   * Search for actions based on query and filters
   */
  async searchActions(request: ActionSearchRequest): Promise<ActionSearchResponse[]> {
    try {
      const topK = Math.min(request.topK || DEFAULT_CONFIG.DEFAULT_TOP_K, DEFAULT_CONFIG.MAX_TOP_K);
      
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
        this.convertToActionSearchResponse(match)
      );

      // Apply post-processing filters that couldn't be done in Pinecone
      return this.applyPostFilters(results, request);
    } catch (error) {
      throw new SearchError(
        `Failed to search actions: ${error}`,
        SearchErrorCode.QUERY_ERROR
      );
    }
  }

  /**
   * Apply filters that couldn't be applied at the Pinecone level
   */
  private applyPostFilters(
    results: ActionSearchResponse[],
    request: ActionSearchRequest
  ): ActionSearchResponse[] {
    if (!request.filters?.requiredParameters?.length) {
      return results;
    }

    return results.filter(result => {
      const paramNames = result.parameters.map(p => p.name.toLowerCase());
      return request.filters!.requiredParameters!.every(requiredParam =>
        paramNames.includes(requiredParam.toLowerCase())
      );
    });
  }

  /**
   * Delete an action from the vector store
   */
  async deleteAction(actionId: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.namespace(this.namespace).deleteOne(actionId);
    } catch (error) {
      throw new SearchError(
        `Failed to delete action ${actionId}: ${error}`,
        SearchErrorCode.DELETE_ERROR
      );
    }
  }

  /**
   * Delete multiple actions from the vector store
   */
  async deleteActions(actionIds: string[]): Promise<void> {
    if (actionIds.length === 0) return;

    try {
      const index = this.pinecone.index(this.indexName);
      await index.namespace(this.namespace).deleteMany(actionIds);
    } catch (error) {
      throw new SearchError(
        `Failed to delete actions: ${error}`,
        SearchErrorCode.DELETE_ERROR
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
      throw new SearchError(
        `Failed to get index stats: ${error}`,
        SearchErrorCode.FETCH_ERROR
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