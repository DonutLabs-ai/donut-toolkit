/**
 * Configuration options for the PendleActionProvider
 */
export interface PendleActionProviderConfig {
  /**
   * Pendle API key (optional)
   */
  apiKey?: string;
  
  /**
   * Custom RPC endpoint (optional)
   */
  rpcEndpoint?: string;
  
  /**
   * Enable/disable aggregator by default
   */
  enableAggregator?: boolean;
}

/**
 * Pendle market information
 */
export interface PendleMarket {
  address: string;
  name: string;
  symbol: string;
  expiry: string;
  pt: {
    address: string;
    symbol: string;
    decimals: number;
  };
  yt: {
    address: string;
    symbol: string;
    decimals: number;
  };
  sy: {
    address: string;
    symbol: string;
    decimals: number;
  };
  underlyingAsset: {
    address: string;
    symbol: string;
    decimals: number;
  };
  liquidity: string;
  volume24h: string;
  apy: {
    pt: number;
    yt: number;
    lp: number;
  };
  isActive: boolean;
  chainId: number;
}

/**
 * User position in Pendle markets
 */
export interface PendleUserPosition {
  marketAddress: string;
  marketName: string;
  chainId: number;
  ptBalance: string;
  ytBalance: string;
  lpBalance: string;
  underlyingValue: string;
  expiry: string;
  isExpired: boolean;
  rewards: {
    token: string;
    amount: string;
    usdValue: string;
  }[];
}

/**
 * Swap quote information
 */
export interface PendleSwapQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  route: string[];
  gas: string;
  minOutputAmount: string;
  exchangeRate: string;
}

/**
 * Liquidity operation result
 */
export interface PendleLiquidityResult {
  lpTokensReceived?: string;
  tokensReceived?: string[];
  priceImpact: number;
  gas: string;
}

/**
 * Transaction response format
 */
export interface PendleTransactionResponse {
  success: boolean;
  unsignedTransaction?: string;
  transactionType: string;
  message: string;
  error?: string;
  data?: any;
}

/**
 * Market data with historical information
 */
export interface PendleMarketData {
  market: PendleMarket;
  priceHistory: {
    timestamp: string;
    ptPrice: number;
    ytPrice: number;
    impliedApy: number;
  }[];
  liquidityHistory: {
    timestamp: string;
    totalLiquidity: string;
    volume24h: string;
  }[];
  stats: {
    totalValueLocked: string;
    totalVolume: string;
    uniqueUsers: number;
    averageApy: number;
  };
}

/**
 * Asset information
 */
export interface PendleAssetInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  type: 'PT' | 'YT' | 'SY' | 'LP' | 'UNDERLYING';
  marketAddress?: string;
  expiry?: string;
  underlyingAsset?: {
    address: string;
    symbol: string;
    name: string;
  };
  currentPrice: string;
  totalSupply: string;
  isActive: boolean;
}

/**
 * API response wrapper
 */
export interface PendleApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * Transaction build parameters
 */
export interface TransactionBuildParams {
  chainId: number;
  userAddress: string;
  slippage: number;
  gasPrice?: string;
  gasLimit?: string;
}

/**
 * Mint transaction parameters
 */
export interface MintTransactionParams extends TransactionBuildParams {
  marketAddress: string;
  amount: string;
  tokenIn: string;
  enableAggregator: boolean;
}

/**
 * Redeem transaction parameters
 */
export interface RedeemTransactionParams extends TransactionBuildParams {
  marketAddress: string;
  ptAmount: string;
  ytAmount: string;
  tokenOut?: string;
}

/**
 * Swap transaction parameters
 */
export interface SwapTransactionParams extends TransactionBuildParams {
  marketAddress: string;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  enableAggregator: boolean;
}

/**
 * Add liquidity transaction parameters
 */
export interface AddLiquidityTransactionParams extends TransactionBuildParams {
  poolAddress: string;
  tokenAmount: string;
  tokenAddress: string;
  minimumLpOut?: string;
}

/**
 * Remove liquidity transaction parameters
 */
export interface RemoveLiquidityTransactionParams extends TransactionBuildParams {
  poolAddress: string;
  lpTokenAmount: string;
  minimumTokenOut?: string;
  tokenOut?: string;
} 