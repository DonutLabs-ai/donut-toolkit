import { z } from "zod";

/**
 * Schema for swapping tokens using Jupiter.
 */
export const SwapTokenSchema = z
  .object({
    inputMint: z
      .string()
      .min(32)
      .max(44)
      .describe("The mint address of the token to swap from (valid Solana address)"),
    outputMint: z
      .string()
      .min(32)
      .max(44)
      .describe("The mint address of the token to swap to (valid Solana address)"),
    amount: z
      .number()
      .positive()
      .describe("Amount of tokens to swap in token units (not raw/lamports)"),
    slippageBps: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .default(50)
      .describe("Slippage tolerance in basis points (e.g., 50 = 0.5%, max 100%)"),
  })
  .describe("Swap tokens using Jupiter DEX aggregator");
