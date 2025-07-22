import { RISK_LEVELS, SECURITY_THRESHOLDS } from "./constants";

/**
 * Risk level type
 */
export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

/**
 * Security score threshold type
 */
export type SecurityThreshold = (typeof SECURITY_THRESHOLDS)[keyof typeof SECURITY_THRESHOLDS];

/**
 * GoPlus API response for Solana token security
 */
export interface SolanaTokenSecurityResponse {
  code: number;
  message: string;
  result: {
    [tokenAddress: string]: SolanaTokenSecurityData;
  };
}

/**
 * Solana token security data from GoPlus API
 */
export interface SolanaTokenSecurityData {
  // Basic token info
  token_name?: string;
  token_symbol?: string;
  holder_count?: string;
  total_supply?: string;

  // Security indicators (0, 1, or null)
  is_true_token?: string;
  is_airdrop_scam?: string;
  trust_list?: string;

  // Ownership and contract risks
  owner_address?: string;
  creator_address?: string;
  is_open_source?: string;

  // Trading risks
  cannot_buy?: string;
  cannot_sell_all?: string;
  slippage_modifiable?: string;
  trading_cooldown?: string;

  // Economic model risks
  transfer_pausable?: string;
  can_take_back_ownership?: string;
  owner_change_balance?: string;
  hidden_owner?: string;
  selfdestruct?: string;

  // Tax information
  buy_tax?: string;
  sell_tax?: string;

  // Liquidity information
  dex?: Array<{
    name: string;
    liquidity: string;
    pair: string;
  }>;

  // Additional metadata
  note?: string;
}

/**
 * Processed token security analysis result
 */
export interface ProcessedTokenSecurity {
  // Basic info
  tokenAddress: string;
  tokenName?: string;
  tokenSymbol?: string;

  // Calculated security metrics
  securityScore: number;
  riskLevel: RiskLevel;

  // Risk analysis
  riskFactors: string[];
  safetyIndicators: string[];
  warnings: string[];
  recommendations: string[];

  // Trading info
  buyTax?: number;
  sellTax?: number;
  canBuy: boolean;
  canSellAll: boolean;

  // Liquidity info
  liquidityInfo?: {
    totalLiquidity: number;
    dexes: Array<{
      name: string;
      liquidity: number;
      pair: string;
    }>;
  };

  // Additional metadata
  holderCount?: number;
  totalSupply?: string;
  note?: string;
  lastAnalyzed: string;
}

/**
 * Batch token security analysis result
 */
export interface BatchTokenSecurityResult {
  success: boolean;
  totalTokens: number;
  processedTokens: number;
  results: ProcessedTokenSecurity[];
  errors: Array<{
    tokenAddress: string;
    error: string;
  }>;
  summary: {
    safeTokens: number;
    riskyTokens: number;
    dangerousTokens: number;
  };
}

/**
 * API error response
 */
export interface GoplusApiError {
  code: number;
  message: string;
  details?: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Configuration for GoPlus ActionProvider
 */
export interface GoplusActionProviderConfig {
  /**
   * Custom API base URL (optional)
   */
  apiBaseUrl?: string;

  /**
   * Request timeout in milliseconds (optional)
   */
  timeout?: number;

  /**
   * Maximum number of retries for failed requests (optional)
   */
  maxRetries?: number;

  /**
   * Enable detailed logging (optional)
   */
  enableLogging?: boolean;
}

/**
 * Token security analysis request
 */
export interface TokenSecurityRequest {
  tokenAddress: string;
}

/**
 * Batch token security analysis request
 */
export interface BatchTokenSecurityRequest {
  tokenAddresses: string[];
}

/**
 * Wallet security analysis request
 */
export interface WalletSecurityRequest {
  walletAddress: string;
}

/**
 * Wallet security analysis result
 */
export interface WalletSecurityResult {
  walletAddress: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
  recommendations: string[];
  suspiciousTokens?: string[];
  lastAnalyzed: string;
}

/**
 * Token comparison result
 */
export interface TokenComparisonResult {
  tokenAddresses: string[];
  comparison: {
    safest: string;
    riskiest: string;
    averageScore: number;
  };
  individualResults: ProcessedTokenSecurity[];
}
