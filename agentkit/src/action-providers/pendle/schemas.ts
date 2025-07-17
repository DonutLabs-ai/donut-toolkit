import { z } from "zod";

/**
 * Schema for getting available Pendle markets
 */
export const GetMarketsSchema = z
  .object({
    chainId: z.number().optional().describe("Blockchain chain ID (1 for Ethereum, 42161 for Arbitrum, etc.)"),
    limit: z.number().default(10).describe("Maximum number of markets to return"),
    activeOnly: z.boolean().default(true).describe("Only return active markets that haven't expired"),
  })
  .describe("Get available Pendle yield markets and their details");

/**
 * Schema for minting Principal Tokens (PT) and Yield Tokens (YT)
 */
export const MintSchema = z
  .object({
    marketAddress: z.string().describe("Pendle market contract address"),
    amount: z.string().describe("Amount of input token to mint (in token decimals)"),
    tokenIn: z.string().describe("Input token address or symbol (e.g., 'stETH', '0x...')"),
    slippage: z.number().min(0).max(50).default(0.5).describe("Slippage tolerance in percentage (0.5 = 0.5%)"),
    enableAggregator: z.boolean().default(true).describe("Enable aggregator for better routing"),
  })
  .describe("Mint Principal Tokens (PT) and Yield Tokens (YT) from yield-bearing assets");

/**
 * Schema for redeeming PT and YT back to underlying assets
 */
export const RedeemSchema = z
  .object({
    marketAddress: z.string().describe("Pendle market contract address"),
    ptAmount: z.string().describe("Amount of PT tokens to redeem"),
    ytAmount: z.string().describe("Amount of YT tokens to redeem"),
    tokenOut: z.string().optional().describe("Desired output token address or symbol"),
    slippage: z.number().min(0).max(50).default(0.5).describe("Slippage tolerance in percentage"),
  })
  .describe("Redeem PT and YT tokens back to underlying yield-bearing assets");

/**
 * Schema for token swaps on Pendle AMM
 */
export const SwapSchema = z
  .object({
    marketAddress: z.string().describe("Pendle market contract address"),
    tokenIn: z.string().describe("Input token address or symbol"),
    tokenOut: z.string().describe("Output token address or symbol (PT, YT, or SY)"),
    amount: z.string().describe("Amount of input token to swap"),
    slippage: z.number().min(0).max(50).default(0.5).describe("Slippage tolerance in percentage"),
    enableAggregator: z.boolean().default(true).describe("Enable aggregator for better routing"),
  })
  .describe("Swap tokens on Pendle AMM (between PT, YT, SY, and underlying assets)");

/**
 * Schema for adding liquidity to Pendle pools
 */
export const AddLiquiditySchema = z
  .object({
    poolAddress: z.string().describe("Pendle pool contract address"),
    tokenAmount: z.string().describe("Amount of tokens to add as liquidity"),
    tokenAddress: z.string().describe("Token address to add as liquidity"),
    minimumLpOut: z.string().optional().describe("Minimum LP tokens to receive"),
    slippage: z.number().min(0).max(50).default(0.5).describe("Slippage tolerance in percentage"),
  })
  .describe("Add liquidity to Pendle AMM pools");

/**
 * Schema for removing liquidity from Pendle pools
 */
export const RemoveLiquiditySchema = z
  .object({
    poolAddress: z.string().describe("Pendle pool contract address"),
    lpTokenAmount: z.string().describe("Amount of LP tokens to burn"),
    minimumTokenOut: z.string().optional().describe("Minimum tokens to receive"),
    tokenOut: z.string().optional().describe("Preferred output token address"),
    slippage: z.number().min(0).max(50).default(0.5).describe("Slippage tolerance in percentage"),
  })
  .describe("Remove liquidity from Pendle AMM pools");

/**
 * Schema for getting user positions
 */
export const GetUserPositionsSchema = z
  .object({
    userAddress: z.string().optional().describe("User wallet address (defaults to connected wallet)"),
    chainId: z.number().optional().describe("Blockchain chain ID"),
    includeExpired: z.boolean().default(false).describe("Include expired positions"),
  })
  .describe("Get user's positions in Pendle markets and pools");

/**
 * Schema for getting market data
 */
export const GetMarketDataSchema = z
  .object({
    marketAddress: z.string().describe("Pendle market contract address"),
    period: z.enum(["1d", "7d", "30d"]).default("7d").describe("Time period for market data"),
  })
  .describe("Get detailed market data including APY, liquidity, and price history");

/**
 * Schema for getting asset information
 */
export const GetAssetInfoSchema = z
  .object({
    tokenAddress: z.string().describe("Token contract address"),
    chainId: z.number().optional().describe("Blockchain chain ID"),
  })
  .describe("Get detailed information about a Pendle asset (PT, YT, or SY)"); 