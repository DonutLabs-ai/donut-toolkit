import { Network } from "../../network";
import { 
  SUPPORTED_PENDLE_NETWORKS, 
  PENDLE_CHAIN_IDS, 
  COMMON_TOKENS,
  PENDLE_API_ENDPOINTS,
  ERROR_MESSAGES 
} from "./constants";
import { PendleApiResponse, PendleMarket, PendleUserPosition } from "./types";

/**
 * Check if a network is supported by Pendle
 */
export function isNetworkSupported(network: Network): boolean {
  return SUPPORTED_PENDLE_NETWORKS.includes(network.networkId as any);
}

/**
 * Get chain ID from network
 */
export function getChainIdFromNetwork(network: Network): number {
  const chainId = PENDLE_CHAIN_IDS[network.networkId as keyof typeof PENDLE_CHAIN_IDS];
  if (!chainId) {
    throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
  }
  return chainId;
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Resolve token address from symbol or address
 */
export function resolveTokenAddress(tokenInput: string, chainId: number): string {
  // If it's already a valid address, return it
  if (isValidEthereumAddress(tokenInput)) {
    return tokenInput.toLowerCase();
  }
  
  // Look up common token symbols
  const chainTokens = COMMON_TOKENS[chainId];
  if (chainTokens && chainTokens[tokenInput.toUpperCase()]) {
    return chainTokens[tokenInput.toUpperCase()].toLowerCase();
  }
  
  throw new Error(`${ERROR_MESSAGES.INVALID_TOKEN}: ${tokenInput}`);
}

/**
 * Validate slippage percentage
 */
export function validateSlippage(slippage: number): void {
  if (slippage < 0 || slippage > 50) {
    throw new Error(ERROR_MESSAGES.INVALID_SLIPPAGE);
  }
}

/**
 * Convert slippage percentage to basis points
 */
export function slippageToBasPoints(slippage: number): number {
  return Math.floor(slippage * 100);
}

/**
 * Format amount to proper decimal places
 */
export function formatAmount(amount: string, decimals: number = 18): string {
  const num = parseFloat(amount);
  if (isNaN(num)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return (num * Math.pow(10, decimals)).toString();
}

/**
 * Parse amount from wei/raw format
 */
export function parseAmount(amount: string, decimals: number = 18): string {
  const num = parseFloat(amount);
  if (isNaN(num)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  return (num / Math.pow(10, decimals)).toString();
}

/**
 * Build Pendle API URL
 */
export function buildApiUrl(endpoint: string, params: Record<string, string | number>): string {
  let url = PENDLE_API_ENDPOINTS.BASE_URL + endpoint;
  
  // Replace path parameters
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{${key}}`, value.toString());
  }
  
  return url;
}

/**
 * Make HTTP request to Pendle API using axios
 */
export async function makeApiRequest<T>(
  url: string, 
  options: { method?: string; data?: any; headers?: Record<string, string> } = {}
): Promise<PendleApiResponse<T>> {
  try {
    // Import axios dynamically to avoid module issues
    const axios = await import('axios');
    
    const response = await axios.default({
      url,
      method: options.method || 'GET',
      data: options.data,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Coinbase-AgentKit-Pendle/1.0',
        ...options.headers,
      },
      timeout: 10000, // 10 second timeout
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Unknown API error';
    return {
      success: false,
      data: {} as T,
      error: `${ERROR_MESSAGES.API_ERROR}: ${errorMessage}`,
    };
  }
}

/**
 * Check if a market has expired
 */
export function isMarketExpired(expiry: string): boolean {
  const expiryDate = new Date(expiry);
  const now = new Date();
  return expiryDate < now;
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(
  inputAmount: string, 
  outputAmount: string, 
  marketPrice: string
): number {
  const input = parseFloat(inputAmount);
  const output = parseFloat(outputAmount);
  const price = parseFloat(marketPrice);
  
  const expectedOutput = input * price;
  const impact = ((expectedOutput - output) / expectedOutput) * 100;
  
  return Math.max(0, impact);
}

/**
 * Generate transaction hash for tracking
 */
export function generateTransactionId(): string {
  return `pendle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate transaction parameters
 */
export function validateTransactionParams(params: {
  amount?: string;
  slippage?: number;
  address?: string;
}): void {
  if (params.amount) {
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid amount: ${params.amount}`);
    }
  }
  
  if (params.slippage !== undefined) {
    validateSlippage(params.slippage);
  }
  
  if (params.address && !isValidEthereumAddress(params.address)) {
    throw new Error(`Invalid address: ${params.address}`);
  }
}

/**
 * Convert error to user-friendly message
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Calculate APY from market data
 */
export function calculateImpliedAPY(
  ptPrice: number, 
  timeToExpiry: number // in seconds
): number {
  if (timeToExpiry <= 0 || ptPrice <= 0) return 0;
  
  const yearsToExpiry = timeToExpiry / (365 * 24 * 60 * 60);
  const impliedRate = Math.pow(1 / ptPrice, 1 / yearsToExpiry) - 1;
  
  return impliedRate * 100; // Convert to percentage
}

/**
 * Sort markets by various criteria
 */
export function sortMarkets(
  markets: PendleMarket[], 
  sortBy: 'apy' | 'liquidity' | 'volume' | 'expiry' = 'apy'
): PendleMarket[] {
  return [...markets].sort((a, b) => {
    switch (sortBy) {
      case 'apy':
        return b.apy.pt - a.apy.pt;
      case 'liquidity':
        return parseFloat(b.liquidity) - parseFloat(a.liquidity);
      case 'volume':
        return parseFloat(b.volume24h) - parseFloat(a.volume24h);
      case 'expiry':
        return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
      default:
        return 0;
    }
  });
}

/**
 * Filter active markets
 */
export function filterActiveMarkets(markets: PendleMarket[]): PendleMarket[] {
  return markets.filter(market => market.isActive && !isMarketExpired(market.expiry));
}

/**
 * Get user positions summary
 */
export function summarizeUserPositions(positions: PendleUserPosition[]): {
  totalValue: number;
  activePositions: number;
  expiredPositions: number;
  totalRewards: number;
} {
  const totalValue = positions.reduce((sum, pos) => 
    sum + parseFloat(pos.underlyingValue), 0
  );
  
  const activePositions = positions.filter(pos => !pos.isExpired).length;
  const expiredPositions = positions.filter(pos => pos.isExpired).length;
  
  const totalRewards = positions.reduce((sum, pos) => 
    sum + pos.rewards.reduce((rewardSum, reward) => 
      rewardSum + parseFloat(reward.usdValue), 0
    ), 0
  );
  
  return {
    totalValue,
    activePositions,
    expiredPositions,
    totalRewards,
  };
} 