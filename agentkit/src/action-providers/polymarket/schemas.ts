import { z } from "zod";

/**
 * Schema for searching prediction markets.
 */
export const SearchMarketsSchema = z
  .object({
    query: z.string().describe("Search query for markets (e.g., 'election', 'crypto', 'sports')"),
    limit: z.number().optional().default(10).describe("Maximum number of results to return"),
    closed: z.boolean().optional().describe("Include closed markets in results"),
  })
  .describe("Search for prediction markets on Polymarket");

/**
 * Schema for getting market details.
 */
export const GetMarketDetailsSchema = z
  .object({
    marketId: z.string().describe("The unique identifier of the market"),
  })
  .describe("Get detailed information about a specific prediction market");

/**
 * Schema for getting market prices.
 */
export const GetMarketPricesSchema = z
  .object({
    marketId: z.string().describe("The unique identifier of the market"),
  })
  .describe("Get current prices and odds for a prediction market");

/**
 * Schema for placing a bet on a market.
 */
export const PlaceBetSchema = z
  .object({
    marketId: z.string().describe("The unique identifier of the market"),
    outcome: z.enum(["yes", "no"]).describe("The outcome to bet on (yes or no)"),
    amount: z.string().describe("Amount to bet in USDC"),
    price: z.string().describe("Price per share (between 0.01 and 0.99)"),
  })
  .describe("Place a bet on a prediction market outcome");

/**
 * Schema for getting trending markets.
 */
export const GetTrendingMarketsSchema = z
  .object({
    category: z.string().optional().describe("Category filter (e.g., 'politics', 'crypto', 'sports')"),
    limit: z.number().optional().default(10).describe("Maximum number of results to return"),
  })
  .describe("Get trending prediction markets");

/**
 * Schema for getting user positions.
 */
export const GetUserPositionsSchema = z
  .object({
    userAddress: z.string().describe("Ethereum address of the user"),
    active: z.boolean().optional().default(true).describe("Only show active positions"),
  })
  .describe("Get user's current positions in prediction markets"); 