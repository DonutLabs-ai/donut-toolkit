import { z } from "zod";

/**
 * Schema for transferring tokens across chains via Wormhole.
 */
export const TransferTokenSchema = z
  .object({
    fromChain: z.string().describe("Source chain (e.g., 'ethereum', 'solana', 'polygon')"),
    toChain: z.string().describe("Destination chain (e.g., 'ethereum', 'solana', 'polygon')"),
    tokenAddress: z.string().describe("Token contract address on source chain"),
    amount: z.string().describe("Amount to transfer (in token's base units)"),
    recipientAddress: z.string().describe("Recipient address on destination chain"),
  })
  .describe("Transfer tokens from one chain to another using Wormhole bridge");

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