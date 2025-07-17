/**
 * Supported networks for Pendle operations
 */
export const SUPPORTED_PENDLE_NETWORKS = [
  "ethereum-mainnet",
  "arbitrum-mainnet", 
  "bnb-mainnet",
  "optimism-mainnet",
  "polygon-mainnet",
  "mantle-mainnet",
  // Testnets
  "ethereum-sepolia",
  "arbitrum-sepolia",
] as const;

/**
 * Chain ID mappings for Pendle networks
 */
export const PENDLE_CHAIN_IDS: Record<string, number> = {
  "ethereum-mainnet": 1,
  "arbitrum-mainnet": 42161,
  "bnb-mainnet": 56,
  "optimism-mainnet": 10,
  "polygon-mainnet": 137,
  "mantle-mainnet": 5000,
  "ethereum-sepolia": 11155111,
  "arbitrum-sepolia": 421614,
};

/**
 * Pendle Router contract addresses by chain ID
 */
export const PENDLE_ROUTER_ADDRESSES: Record<number, string> = {
  1: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Ethereum
  42161: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Arbitrum
  56: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // BNB Chain
  10: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Optimism
  137: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Polygon
  5000: "0x00000000005BBB0EF59571E58418F9a4357b68A0", // Mantle
};

/**
 * Pendle Market Factory addresses by chain ID
 */
export const PENDLE_MARKET_FACTORY_ADDRESSES: Record<number, string> = {
  1: "0x27b1dAcd74688aF24a64BD3C9C1B143118740784", // Ethereum
  42161: "0x2FCb47B58350cD377f94d3821e7373Df60bD9Ced", // Arbitrum
  56: "0x2FcC917Cba50194B095a0C9b93c8dAb5B74B1e6c", // BNB Chain
  10: "0x17F100fB4bE2707675c6439468d38249DD993d58", // Optimism
  137: "0x2F50be30cE144FFFb6e1e78d9b8Fabc4c2F4F1Bb", // Polygon
  5000: "0x2F50be30cE144FFFb6e1e78d9b8Fabc4c2F4F1Bb", // Mantle
};

/**
 * Pendle Oracle addresses by chain ID
 */
export const PENDLE_ORACLE_ADDRESSES: Record<number, string> = {
  1: "0x9a9Fa8338dd5E5B2188006f1Cd2Ef26d921650C2", // Ethereum
  42161: "0x1Fd95db7B7C0067De8D45C0cb35D59796adfD187", // Arbitrum
  56: "0xd0354D4e7bCf345fB117cabe41aCAadf724a4292", // BNB Chain
  10: "0x9a9Fa8338dd5E5B2188006f1Cd2Ef26d921650C2", // Optimism
  137: "0x1Fd95db7B7C0067De8D45C0cb35D59796adfD187", // Polygon
  5000: "0x1Fd95db7B7C0067De8D45C0cb35D59796adfD187", // Mantle
};

/**
 * Maximum slippage allowed (in percentage)
 */
export const MAX_SLIPPAGE = 50;

/**
 * Default slippage (in percentage)
 */
export const DEFAULT_SLIPPAGE = 0.5;

/**
 * Gas limit multiplier for Pendle transactions
 */
export const GAS_LIMIT_MULTIPLIER = 1.2;

/**
 * Common token symbols and their addresses on different chains
 */
export const COMMON_TOKENS: Record<number, Record<string, string>> = {
  1: { // Ethereum
    "WETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "USDC": "0xA0b86a33E6417c0a2CE7f19D3A92b74fD825b3E4",
    "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "stETH": "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    "wstETH": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  },
  42161: { // Arbitrum
    "WETH": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "USDC": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    "USDT": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    "ARB": "0x912CE59144191C1204E64559FE8253a0e49E6548",
  },
};

/**
 * Pendle API endpoints
 */
export const PENDLE_API_ENDPOINTS = {
  BASE_URL: "https://api-v2.pendle.finance",
  MARKETS: "/core/v1/{chainId}/markets",
  MARKET_DATA: "/core/v1/{chainId}/markets/{marketAddress}",
  USER_POSITIONS: "/core/v1/{chainId}/users/{userAddress}/positions",
  BACKEND_BASE: "https://api-v2.pendle.finance/sdk/api/v1",
  SWAP_EXACT_IN: "/swapExactTokenForPt",
  MINT_PT_YT: "/swapExactTokenForPt",
  REDEEM_PT_YT: "/redeemPyToToken",
  SWAP_TOKENS: "/swapExactTokenForToken",
  ADD_LIQUIDITY: "/addLiquiditySingleToken",
  REMOVE_LIQUIDITY: "/removeLiquiditySingleToken",
} as const;

/**
 * Transaction types for unsigned transactions
 */
export const PENDLE_TRANSACTION_TYPES = {
  MINT: "pendle_mint_yield_tokens",
  REDEEM: "pendle_redeem_yield_tokens", 
  SWAP: "pendle_swap_tokens",
  ADD_LIQUIDITY: "pendle_add_liquidity",
  REMOVE_LIQUIDITY: "pendle_remove_liquidity",
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  UNSUPPORTED_NETWORK: "Network not supported by Pendle",
  INVALID_TOKEN: "Invalid token address or symbol",
  INSUFFICIENT_BALANCE: "Insufficient token balance",
  EXPIRED_MARKET: "Market has expired",
  INVALID_SLIPPAGE: "Slippage must be between 0 and 50%",
  API_ERROR: "Pendle API request failed",
  TRANSACTION_BUILD_FAILED: "Failed to build transaction",
} as const; 