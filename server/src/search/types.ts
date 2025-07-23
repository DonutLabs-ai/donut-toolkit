import { z } from "zod";
import { Network } from "@coinbase/agentkit";

/**
 * Represents a parameter of an action
 */
export interface ActionParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

/**
 * Extended ActionMetadata with unique IDs for search functionality
 * Extends the existing ActionMetadata from actionDecorator.ts
 */
export interface SearchableActionMetadata {
  /**
   * Unique identifier for this action
   */
  actionId: string;
  
  /**
   * Unique identifier for the action provider this action belongs to
   */
  providerId: string;
  
  /**
   * Name of the action provider
   */
  providerName: string;
  
  /**
   * The name of the action (includes provider prefix)
   */
  name: string;
  
  /**
   * The description of the action
   */
  description: string;
  
  /**
   * The schema of the action for parameter validation
   */
  schema: z.ZodSchema;
  
  /**
   * Parsed parameters from the schema for search indexing
   */
  parameters: ActionParameter[];
  
  /**
   * Whether this action requires a wallet provider
   */
  requiresWallet: boolean;
  
  /**
   * The function to invoke the action
   */
  invoke: (...args: any[]) => Promise<string>;
}

/**
 * Extended ActionProvider metadata with unique ID for search functionality
 */
export interface SearchableActionProviderMetadata {
  /**
   * Unique identifier for this action provider
   */
  providerId: string;
  
  /**
   * Name of the action provider
   */
  name: string;
  
  /**
   * Description of what this action provider does
   */
  description: string;
  
  /**
   * The network this action provider supports
   */
  network: Network;
  
  /**
   * All actions provided by this action provider
   */
  actions: SearchableActionMetadata[];
}

/**
 * Request for searching actions
 */
export interface ActionSearchRequest {
  /**
   * Natural language query describing what the user wants to do
   */
  query: string;
  
  /**
   * Maximum number of results to return (default: 5)
   */
  topK?: number;
  
  /**
   * Optional filters to narrow down the search
   */
  filters?: {
    /**
     * Filter by action provider names
     */
    providerNames?: string[];
    
    /**
     * Filter by supported networks
     */
    networks?: string[];
    
    /**
     * Filter by whether the action requires a wallet
     */
    requiresWallet?: boolean;
    
    /**
     * Filter by specific parameter names that must be present
     */
    requiredParameters?: string[];
  };
}

/**
 * Response from action search
 */
export interface ActionSearchResponse {
  /**
   * Unique identifier for this action
   */
  actionId: string;
  
  /**
   * Name of the action
   */
  actionName: string;
  
  /**
   * Unique identifier for the action provider
   */
  providerId: string;
  
  /**
   * Name of the action provider
   */
  providerName: string;
  
  /**
   * Description of what this action does
   */
  description: string;
  
  /**
   * Parameters this action accepts
   */
  parameters: ActionParameter[];
  
  /**
   * Whether this action requires a wallet provider
   */
  requiresWallet: boolean;
  
  /**
   * Similarity score (0-1, higher is more relevant)
   */
  score: number;
}

/**
 * Request for executing a specific action
 */
export interface ExecuteActionRequest {
  /**
   * Unique identifier for the action to execute
   */
  actionId: string;
  
  /**
   * Parameters to pass to the action
   */
  parameters: Record<string, any>;
}

/**
 * Response from action execution
 */
export interface ExecuteActionResponse {
  /**
   * Whether the execution was successful
   */
  success: boolean;
  
  /**
   * Result data from the action execution
   */
  result?: string;
  
  /**
   * Error message if execution failed
   */
  error?: string;
}

/**
 * Error codes for the search system
 */
export enum SearchErrorCode {
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INITIALIZATION_ERROR = "INITIALIZATION_ERROR", 
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  DEPENDENCY_ERROR = "DEPENDENCY_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  EMBEDDING_ERROR = "EMBEDDING_ERROR",
  PINECONE_ERROR = "PINECONE_ERROR",
  UPSERT_ERROR = "UPSERT_ERROR",
  QUERY_ERROR = "QUERY_ERROR",
  DELETE_ERROR = "DELETE_ERROR",
  FETCH_ERROR = "FETCH_ERROR",
  ACTION_NOT_FOUND_ERROR = "ACTION_NOT_FOUND_ERROR",
  EXECUTION_ERROR = "EXECUTION_ERROR"
}

/**
 * Custom error for search-related operations
 */
export class SearchError extends Error {
  public readonly code: SearchErrorCode;
  
  constructor(message: string, code: SearchErrorCode = SearchErrorCode.UNKNOWN_ERROR) {
    super(message);
    this.name = "SearchError";
    this.code = code;
  }
}

/**
 * Configuration for the vector search service
 */
export interface VectorSearchConfig {
  /**
   * Pinecone API key
   */
  apiKey: string;
  
  /**
   * Pinecone index name
   */
  indexName: string;
  
  /**
   * Pinecone namespace for organizing vectors
   */
  namespace: string;
  
  /**
   * Embedding model to use (Pinecone built-in)
   */
  embeddingModel: string;
  
  /**
   * Dimension of the embedding vectors
   */
  embeddingDimension: number;
}

/**
 * Zod schemas for MCP tool input validation
 */
export const ActionSearchRequestSchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  topK: z.number().int().min(1).max(50).optional().default(5),
  filters: z.object({
    providerNames: z.array(z.string()).optional(),
    networks: z.array(z.string()).optional(),
    requiresWallet: z.boolean().optional(),
    requiredParameters: z.array(z.string()).optional(),
  }).optional(),
});

export const ExecuteActionRequestSchema = z.object({
  actionId: z.string().min(1, "Action ID cannot be empty"),
  parameters: z.record(z.any()),
});

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  INDEX_NAME: "agentkit-tools-v1",
  NAMESPACE: "production",
  EMBEDDING_MODEL: "multilingual-e5-large", // Pinecone built-in model
  EMBEDDING_DIMENSION: 1024, // Dimension for multilingual-e5-large
  DEFAULT_TOP_K: 5,
  MAX_TOP_K: 50,
  BATCH_SIZE: 100,
} as const;