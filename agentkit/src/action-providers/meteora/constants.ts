import { PublicKey } from "@solana/web3.js";

/**
 * Meteora DLMM (Dynamic Liquidity Market Maker) Program ID
 */
export const METEORA_DLMM_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");

/**
 * Supported networks for Meteora
 */
export const SUPPORTED_NETWORKS = ["solana-mainnet", "solana-devnet"];

/**
 * Meteora API base URL
 * Note: This is a placeholder URL. In production, this should be replaced with the actual Meteora API endpoint
 */
export const METEORA_API_BASE_URL = "https://dlmm-api.meteora.ag";

/**
 * Common token mint addresses on Solana
 */
export const COMMON_TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
};

/**
 * Default slippage tolerance in basis points (1% = 100 bps)
 */
export const DEFAULT_SLIPPAGE_BPS = 100;

/**
 * Maximum slippage tolerance in basis points (10% = 1000 bps)
 */
export const MAX_SLIPPAGE_BPS = 1000;

/**
 * Minimum position size in lamports (to avoid dust)
 */
export const MIN_POSITION_SIZE = 1000;

/**
 * Fee tiers for Meteora DLMM pools (in basis points)
 */
export const FEE_TIERS = [
  1, // 0.01%
  5, // 0.05%
  10, // 0.1%
  25, // 0.25%
  50, // 0.5%
  100, // 1%
  300, // 3%
  1000, // 10%
];

/**
 * Meteora position types
 */
export enum PositionType {
  SPOT = "spot",
  BID = "bid",
  ASK = "ask",
}

/**
 * Meteora pool status
 */
export enum PoolStatus {
  ENABLED = "enabled",
  DISABLED = "disabled",
}
