/**
 * GoPlus Security API constants
 */

/**
 * Base URL for GoPlus API
 */
export const GOPLUS_API_BASE_URL = "https://api.gopluslabs.io/api/v1";

/**
 * API endpoints
 */
export const ENDPOINTS = {
  SOLANA_TOKEN_SECURITY: "/solana/token_security",
  TOKEN_SECURITY: "/token_security",
  MALICIOUS_ADDRESS: "/malicious_address",
  ADDRESS_SECURITY: "/address_security",
  NFT_SECURITY: "/nft_security",
  // Note: Solana-specific malicious address endpoint may not exist
  SOLANA_ADDRESS_SECURITY: "/solana/address_security",
} as const;

/**
 * Request configuration
 */
export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  MAX_BATCH_SIZE: 20, // Maximum tokens per batch request
  // Known token addresses that should use token security endpoint
  KNOWN_TOKEN_ADDRESSES: [
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
    "So11111111111111111111111111111111111111112", // Wrapped SOL
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // Bonk
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // Jupiter
    "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y", // Shadow
  ],
} as const;

/**
 * Risk levels
 */
export const RISK_LEVELS = {
  VERY_LOW: "very_low",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  VERY_HIGH: "very_high",
} as const;

/**
 * Security score thresholds
 */
export const SECURITY_THRESHOLDS = {
  VERY_SAFE: 90,
  SAFE: 75,
  CAUTION: 50,
  RISKY: 25,
  DANGEROUS: 0,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  INVALID_ADDRESS:
    "Invalid Solana address format. Please provide a valid base58 encoded address (32-44 characters).",
  TOKEN_NOT_FOUND:
    "Token not found or analysis unavailable. The token may be very new or not indexed yet.",
  NETWORK_ERROR: "Network error occurred while fetching security data",
  API_ERROR: "GoPlus API error",
  TIMEOUT_ERROR: "Request timeout - GoPlus API is not responding. Try again in a few moments.",
  BATCH_SIZE_EXCEEDED: `Maximum batch size of ${REQUEST_CONFIG.MAX_BATCH_SIZE} tokens exceeded`,
  EMPTY_ADDRESS_LIST: "At least one token address is required",
  WRONG_ACTION_FOR_TOKEN:
    "This address appears to be a token. Use 'get_solana_token_security' for token analysis.",
  WRONG_ACTION_FOR_WALLET:
    "This address appears to be a wallet. Use 'analyze_wallet_security' for wallet analysis.",
  ENDPOINT_NOT_AVAILABLE: "This type of analysis is not available for the provided address type.",
} as const;

/**
 * Common risk factors for token security analysis
 */
export const RISK_FACTORS = {
  // Contract risks
  HONEYPOT_RISK: "honeypot_risk",
  OWNERSHIP_RENOUNCED: "ownership_renounced",
  CAN_TAKE_BACK_OWNERSHIP: "can_take_back_ownership",
  OWNER_CHANGE_BALANCE: "owner_change_balance",
  HIDDEN_OWNER: "hidden_owner",
  SELFDESTRUCT: "selfdestruct",

  // Trading risks
  CANNOT_BUY: "cannot_buy",
  CANNOT_SELL_ALL: "cannot_sell_all",
  SLIPPAGE_MODIFIABLE: "slippage_modifiable",
  TRADING_COOLDOWN: "trading_cooldown",

  // Economic risks
  HIGH_TAX: "high_tax",
  TRANSFER_PAUSABLE: "transfer_pausable",
  BLACKLISTED: "blacklisted",
  WHITELISTED: "whitelisted",

  // Liquidity risks
  LOW_LIQUIDITY: "low_liquidity",
  FAKE_TOKEN: "fake_token",
} as const;
