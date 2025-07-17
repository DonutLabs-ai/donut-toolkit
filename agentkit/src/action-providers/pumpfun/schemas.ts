import { z } from "zod";

/**
 * Schema for creating a new token on Pump.fun
 */
export const CreateTokenSchema = z
  .object({
    name: z.string().min(1).max(50).describe("The name of the token (1-50 characters)"),
    symbol: z.string().min(1).max(10).describe("The symbol of the token (1-10 characters)"),
    description: z.string().min(1).max(500).describe("The description of the token (1-500 characters)"),
    imageUrl: z.string().url().describe("URL of the image file for the token"),
    twitter: z.string().optional().describe("The Twitter/X handle of the token (optional)"),
    telegram: z.string().optional().describe("The Telegram handle of the token (optional)"),
    website: z.string().url().optional().describe("The website URL of the token (optional)"),
  })
  .describe("Create a new token on Pump.fun");

/**
 * Schema for buying a token on Pump.fun
 */
export const BuyTokenSchema = z
  .object({
    tokenMint: z.string().describe("The mint address of the token to buy"),
    amountInSol: z.number().positive().describe("The amount of SOL to spend on buying the token"),
    slippage: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(5)
      .describe("The slippage tolerance in percentage (1-50, default: 5%)"),
    priorityFee: z
      .number()
      .min(0)
      .default(0.0005)
      .describe("The priority fee in SOL (default: 0.0005)"),
  })
  .describe("Buy a token on Pump.fun");

/**
 * Schema for creating and buying a token in one transaction
 */
export const CreateAndBuyTokenSchema = z
  .object({
    name: z.string().min(1).max(50).describe("The name of the token (1-50 characters)"),
    symbol: z.string().min(1).max(10).describe("The symbol of the token (1-10 characters)"),
    description: z.string().min(1).max(500).describe("The description of the token (1-500 characters)"),
    imageUrl: z.string().url().describe("URL of the image file for the token"),
    twitter: z.string().optional().describe("The Twitter/X handle of the token (optional)"),
    telegram: z.string().optional().describe("The Telegram handle of the token (optional)"),
    website: z.string().url().optional().describe("The website URL of the token (optional)"),
    amountToBuyInSol: z
      .number()
      .min(0)
      .default(0)
      .describe("The amount of SOL to spend on buying the token (0 = only create, don't buy)"),
    slippage: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(5)
      .describe("The slippage tolerance in percentage (1-50, default: 5%)"),
    priorityFee: z
      .number()
      .min(0)
      .default(0.0005)
      .describe("The priority fee in SOL (default: 0.0005)"),
  })
  .describe("Create a new token and optionally buy it on Pump.fun"); 