import { z } from "zod";

/**
 * Schema for transferring an NFT to another address.
 */
export const TransferNftSchema = z
  .object({
    recipient: z.string().describe("The recipient's Solana address"),
    assetId: z.string().describe("The asset ID (mint address) of the NFT to transfer"),
  })
  .describe("Transfer an NFT to another Solana address");

/**
 * Schema for getting NFT information.
 */
export const GetSolanaNftInfoSchema = z
  .object({
    assetId: z.string().describe("The asset ID (mint address) of the NFT"),
    address: z
      .string()
      .optional()
      .describe(
        "Optional address to check NFT ownership for. If not provided, uses the wallet's address",
      ),
  })
  .describe("Get NFT information and ownership details"); 