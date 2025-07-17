import { z } from "zod";

/**
 * Schema for searching tokens by symbol.
 */
export const SearchTokenSchema = z
  .object({
    symbol: z.string().describe("The token symbol to search for (e.g., 'ETH', 'BTC', 'SOL')"),
    chain: z.string().optional().describe("Optional chain filter (e.g., 'ethereum', 'solana', 'bsc')"),
  })
  .describe("Search for token information by symbol from DexScreener");

/**
 * Schema for getting token address by symbol.
 */
export const GetTokenAddressSchema = z
  .object({
    symbol: z.string().describe("The token symbol (e.g., 'ETH', 'BTC', 'SOL')"),
    chain: z.string().optional().describe("Optional chain filter (e.g., 'ethereum', 'solana', 'bsc')"),
  })
  .describe("Get token address by symbol from DexScreener");

/**
 * Schema for getting token pairs information.
 */
export const GetTokenPairsSchema = z
  .object({
    tokenAddress: z.string().describe("The token contract address"),
    chain: z.string().optional().describe("Optional chain filter"),
  })
  .describe("Get trading pairs information for a token from DexScreener"); 