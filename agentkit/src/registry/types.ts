import { z } from "zod";
import { Action, ActionProvider } from "../action-providers/actionProvider";
import { WalletProvider } from "../wallet-providers";
import { Network } from "../network";

/**
 * Registry extension of ActionProvider with additional metadata for cataloging and vector search
 */
export interface RegistryActionProvider {
  /** Unique identifier for the action provider */
  id: string;
  
  /** The action provider name */
  name: string;
  
  /** Description of what this action provider does */
  description: string;
  
  /** Category for grouping similar providers */
  category: string;
  
  /** Networks this provider supports */
  supportedNetworks: Network[];
  
  /** Whether this provider requires a wallet */
  requiresWallet: boolean;
  
  /** The actual ActionProvider instance */
  provider: ActionProvider;
  
  /** Additional metadata for search and categorization */
  metadata: {
    /** Tags for enhanced search */
    tags: string[];
    
    /** External documentation URL */
    documentationUrl?: string;
    
    /** Provider version */
    version?: string;
    
    /** Last updated timestamp */
    lastUpdated: Date;
  };
}

/**
 * Registry extension of Action with additional metadata for vector search and execution
 */
export interface RegistryAction {
  /** Unique identifier for the action */
  id: string;
  
  /** The action name (includes provider prefix) */
  name: string;
  
  /** Action description */
  description: string;
  
  /** Category for grouping similar actions */
  category: string;
  
  /** Reference to parent provider */
  providerId: string;
  
  /** Provider name for context */
  providerName: string;
  
  /** Zod schema for parameters */
  schema: z.ZodSchema;
  
  /** Extracted parameter information for embedding */
  parameters: ActionParameter[];
  
  /** Whether this action requires a wallet */
  requiresWallet: boolean;
  
  /** Networks this action supports */
  supportedNetworks: Network[];
  
  /** The actual invoke function */
  invoke: (...args: any[]) => Promise<string>;
  
  /** Additional metadata for search and execution */
  metadata: {
    /** Tags for enhanced search */
    tags: string[];
    
    /** Usage examples */
    examples?: string[];
    
    /** Performance hints */
    performance?: {
      /** Expected execution time in ms */
      avgExecutionTime?: number;
      
      /** Whether this action is expensive */
      isExpensive?: boolean;
    };
    
    /** Last updated timestamp */
    lastUpdated: Date;
  };
}

/**
 * Extracted parameter information for better search and documentation
 */
export interface ActionParameter {
  /** Parameter name */
  name: string;
  
  /** Parameter type */
  type: string;
  
  /** Whether parameter is required */
  required: boolean;
  
  /** Parameter description if available */
  description?: string;
  
  /** Default value if any */
  defaultValue?: any;
  
  /** Possible values for enum types */
  enumValues?: string[];
}

/**
 * Configuration for provider categories
 */
export const PROVIDER_CATEGORIES = {
  DEFI: "DeFi",
  DEX: "DEX",
  LENDING: "Lending", 
  STAKING: "Staking",
  DATA: "Data",
  WALLET: "Wallet",
  NFT: "NFT",
  BRIDGE: "Bridge",
  ANALYTICS: "Analytics",
  UTILITY: "Utility",
  SOCIAL: "Social",
  GAMING: "Gaming",
} as const;

/**
 * Configuration for action categories  
 */
export const ACTION_CATEGORIES = {
  SWAP: "Swap",
  TRADE: "Trade",
  LEND: "Lend",
  BORROW: "Borrow",
  STAKE: "Stake",
  UNSTAKE: "Unstake",
  TRANSFER: "Transfer",
  APPROVE: "Approve",
  QUERY: "Query",
  PRICE: "Price",
  BALANCE: "Balance",
  HISTORY: "History",
  CREATE: "Create",
  MINT: "Mint",
  BURN: "Burn",
  BRIDGE_TRANSFER: "Bridge Transfer",
  ANALYTICS: "Analytics",
  SOCIAL_POST: "Social Post",
  SOCIAL_FOLLOW: "Social Follow",
} as const;

export type ProviderCategory = typeof PROVIDER_CATEGORIES[keyof typeof PROVIDER_CATEGORIES];
export type ActionCategory = typeof ACTION_CATEGORIES[keyof typeof ACTION_CATEGORIES];

/**
 * Complete registry containing all providers and actions
 */
export interface ActionRegistry {
  /** Map of provider ID to registry provider */
  providers: Map<string, RegistryActionProvider>;
  
  /** Map of action ID to registry action */
  actions: Map<string, RegistryAction>;
  
  /** Registry metadata */
  metadata: {
    /** Total number of providers */
    providerCount: number;
    
    /** Total number of actions */
    actionCount: number;
    
    /** When registry was built */
    buildTime: Date;
    
    /** Registry version */
    version: string;
  };
}

/**
 * Search filters for querying the registry
 */
export interface RegistrySearchFilters {
  /** Filter by provider categories */
  providerCategories?: ProviderCategory[];
  
  /** Filter by action categories */
  actionCategories?: ActionCategory[];
  
  /** Filter by supported networks */
  networks?: Network[];
  
  /** Filter by wallet requirement */
  requiresWallet?: boolean;
  
  /** Filter by provider names */
  providerNames?: string[];
  
  /** Filter by tags */
  tags?: string[];
}

/**
 * Configuration for registry building
 */
export interface RegistryConfig {
  /** Custom category mappings for providers */
  providerCategoryMappings?: Record<string, ProviderCategory>;
  
  /** Custom category mappings for actions */
  actionCategoryMappings?: Record<string, ActionCategory>;
  
  /** Custom descriptions for providers */
  providerDescriptions?: Record<string, string>;
  
  /** Custom tags for providers */
  providerTags?: Record<string, string[]>;
  
  /** Custom tags for actions */
  actionTags?: Record<string, string[]>;
  
  /** Version for the registry */
  version?: string;
}