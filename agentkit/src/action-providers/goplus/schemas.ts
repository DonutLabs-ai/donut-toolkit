import { z } from "zod";
import { REQUEST_CONFIG } from "./constants";

/**
 * Solana address validation regex
 * Solana addresses are base58 encoded and typically 32-44 characters long
 */
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Base schema for Solana address validation
 */
const SolanaAddressSchema = z
  .string()
  .regex(SOLANA_ADDRESS_REGEX, "Invalid Solana address format")
  .describe("Valid Solana address in base58 format");

/**
 * Schema for single token security analysis
 */
export const TokenSecuritySchema = z.object({
  tokenAddress: SolanaAddressSchema.describe(
    "Solana token mint address to analyze for security risks and vulnerabilities"
  ),
});

/**
 * Schema for batch token security analysis
 */
export const BatchTokenSecuritySchema = z.object({
  tokenAddresses: z
    .array(SolanaAddressSchema)
    .min(1, "At least one token address is required")
    .max(REQUEST_CONFIG.MAX_BATCH_SIZE, `Maximum ${REQUEST_CONFIG.MAX_BATCH_SIZE} token addresses allowed`)
    .describe(
      "Array of Solana token mint addresses to analyze (max 20 tokens per request)"
    ),
});

/**
 * Schema for wallet security analysis
 */
export const WalletSecuritySchema = z.object({
  walletAddress: SolanaAddressSchema.describe(
    "Solana wallet address to analyze for security risks and suspicious activities"
  ),
});

/**
 * Schema for token comparison analysis
 */
export const TokenComparisonSchema = z.object({
  tokenAddresses: z
    .array(SolanaAddressSchema)
    .min(2, "At least two token addresses are required for comparison")
    .max(10, "Maximum 10 token addresses allowed for comparison")
    .describe(
      "Array of Solana token mint addresses to compare (2-10 tokens)"
    ),
});

/**
 * Schema for checking if an address is malicious
 */
export const MaliciousAddressCheckSchema = z.object({
  address: SolanaAddressSchema.describe(
    "Solana address to check against malicious address database"
  ),
});

/**
 * Schema for getting token reputation data
 */
export const TokenReputationSchema = z.object({
  tokenAddress: SolanaAddressSchema.describe(
    "Solana token mint address to get reputation and community data for"
  ),
});

/**
 * Schema for getting security trends
 */
export const SecurityTrendsSchema = z.object({
  timeframe: z
    .enum(["24h", "7d", "30d"])
    .default("7d")
    .describe("Time period for security trends analysis"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of results to return (1-100)"),
});

/**
 * Schema for detailed token analysis with custom options
 */
export const DetailedTokenAnalysisSchema = z.object({
  tokenAddress: SolanaAddressSchema.describe(
    "Solana token mint address for detailed security analysis"
  ),
  includeHolders: z
    .boolean()
    .default(false)
    .describe("Include holder distribution analysis"),
  includeLiquidity: z
    .boolean()
    .default(true)
    .describe("Include liquidity pool analysis"),
  includeMarketData: z
    .boolean()
    .default(false)
    .describe("Include market and trading data"),
});

/**
 * Type exports for use in action implementations
 */
export type TokenSecurityInput = z.infer<typeof TokenSecuritySchema>;
export type BatchTokenSecurityInput = z.infer<typeof BatchTokenSecuritySchema>;
export type WalletSecurityInput = z.infer<typeof WalletSecuritySchema>;
export type TokenComparisonInput = z.infer<typeof TokenComparisonSchema>;
export type MaliciousAddressCheckInput = z.infer<typeof MaliciousAddressCheckSchema>;
export type TokenReputationInput = z.infer<typeof TokenReputationSchema>;
export type SecurityTrendsInput = z.infer<typeof SecurityTrendsSchema>;
export type DetailedTokenAnalysisInput = z.infer<typeof DetailedTokenAnalysisSchema>; 