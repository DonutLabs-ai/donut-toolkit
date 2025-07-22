import { z } from "zod";

/**
 * Schema for getting transfer status.
 */
export const GetTransferStatusSchema = z
  .object({
    txHash: z.string().describe("Transaction hash of the initial transfer"),
    fromChain: z.string().describe("Source chain of the transfer"),
  })
  .describe("Get the status of a Wormhole cross-chain transfer");

/**
 * Schema for getting supported chains.
 */
export const GetSupportedChainsSchema = z
  .object({})
  .describe("Get list of chains supported by Wormhole bridge");

/**
 * Schema for getting token information across chains.
 */
export const GetTokenInfoSchema = z
  .object({
    tokenAddress: z.string().describe("Token contract address"),
    chain: z.string().describe("Chain where the token exists"),
  })
  .describe("Get token information including wrapped versions on other chains");

/**
 * Schema for estimating transfer fees.
 */
export const EstimateFeesSchema = z
  .object({
    fromChain: z.string().describe("Source chain"),
    toChain: z.string().describe("Destination chain"),
    tokenAddress: z.string().describe("Token contract address"),
    amount: z.string().describe("Amount to transfer"),
  })
  .describe("Estimate fees for a cross-chain transfer via Wormhole");
