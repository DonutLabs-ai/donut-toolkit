import { z } from "zod";

/**
 * Schema for creating positions on Meteora DLMM pools
 */
export const CreatePositionSchema = z
  .object({
    poolAddress: z.string().describe("The address of the Meteora DLMM pool to create position in"),
    tokenXAmount: z.number().positive().describe("Amount of token X to deposit (in whole units)"),
    tokenYAmount: z.number().positive().describe("Amount of token Y to deposit (in whole units)"),
    lowerBinId: z.number().int().describe("Lower bin ID for the position range"),
    upperBinId: z.number().int().describe("Upper bin ID for the position range"),
    slippageBps: z
      .number()
      .int()
      .positive()
      .max(1000)
      .default(100)
      .describe("Slippage tolerance in basis points (e.g., 100 = 1%)"),
  })
  .describe("Create a position on a Meteora DLMM pool");

/**
 * Schema for closing positions on Meteora DLMM pools
 */
export const ClosePositionSchema = z
  .object({
    positionAddress: z.string().describe("The address of the position to close"),
    basisPointsToClose: z
      .number()
      .int()
      .positive()
      .max(10000)
      .default(10000)
      .describe("Basis points of the position to close (10000 = 100%, 5000 = 50%)"),
    shouldClaimAndClose: z
      .boolean()
      .default(true)
      .describe("Whether to claim fees and close the position"),
  })
  .describe("Close a position on a Meteora DLMM pool");

/**
 * Schema for adding liquidity to existing positions
 */
export const AddLiquiditySchema = z
  .object({
    positionAddress: z
      .string()
      .describe("The address of the existing position to add liquidity to"),
    tokenXAmount: z.number().positive().describe("Amount of token X to add (in whole units)"),
    tokenYAmount: z.number().positive().describe("Amount of token Y to add (in whole units)"),
    slippageBps: z
      .number()
      .int()
      .positive()
      .max(1000)
      .default(100)
      .describe("Slippage tolerance in basis points (e.g., 100 = 1%)"),
  })
  .describe("Add liquidity to an existing position on a Meteora DLMM pool");

/**
 * Schema for removing liquidity from existing positions
 */
export const RemoveLiquiditySchema = z
  .object({
    positionAddress: z.string().describe("The address of the position to remove liquidity from"),
    basisPointsToRemove: z
      .number()
      .int()
      .positive()
      .max(10000)
      .describe("Basis points of liquidity to remove (10000 = 100%, 5000 = 50%)"),
    shouldClaimAndClose: z
      .boolean()
      .default(false)
      .describe("Whether to claim fees when removing liquidity"),
  })
  .describe("Remove liquidity from an existing position on a Meteora DLMM pool");

/**
 * Schema for claiming fees from positions
 */
export const ClaimFeesSchema = z
  .object({
    positionAddress: z.string().describe("The address of the position to claim fees from"),
  })
  .describe("Claim fees from a position on a Meteora DLMM pool");

/**
 * Schema for getting position information
 */
export const GetPositionInfoSchema = z
  .object({
    positionAddress: z.string().describe("The address of the position to get information for"),
  })
  .describe("Get information about a position on a Meteora DLMM pool");

/**
 * Schema for getting pool information
 */
export const GetPoolInfoSchema = z
  .object({
    poolAddress: z.string().describe("The address of the Meteora DLMM pool to get information for"),
  })
  .describe("Get information about a Meteora DLMM pool");

/**
 * Schema for listing user positions
 */
export const ListUserPositionsSchema = z
  .object({
    userAddress: z
      .string()
      .optional()
      .describe("The user address to list positions for (optional, defaults to wallet address)"),
  })
  .describe("List all positions for a user on Meteora DLMM pools");

/**
 * Schema for getting available pools
 */
export const GetAvailablePoolsSchema = z
  .object({
    tokenX: z.string().optional().describe("Filter pools by token X mint address (optional)"),
    tokenY: z.string().optional().describe("Filter pools by token Y mint address (optional)"),
    limit: z
      .number()
      .int()
      .positive()
      .max(100)
      .default(20)
      .describe("Maximum number of pools to return (default: 20, max: 100)"),
  })
  .describe("Get available Meteora DLMM pools with optional filtering");

/**
 * Schema for getting bin information
 */
export const GetBinInfoSchema = z
  .object({
    poolAddress: z.string().describe("The address of the Meteora DLMM pool"),
    binId: z.number().int().describe("The bin ID to get information for"),
  })
  .describe("Get information about a specific bin in a Meteora DLMM pool");

/**
 * Schema for getting pool price information
 */
export const GetPoolPriceSchema = z
  .object({
    poolAddress: z.string().describe("The address of the Meteora DLMM pool to get price for"),
  })
  .describe("Get current price information for a Meteora DLMM pool");
