import { z } from "zod";

/**
 * Schema for getting NFT listings from Magic Eden
 */
export const GetNftListingsSchema = z.object({
  mintHash: z.string().describe("The NFT mint address"),
  offset: z.number().optional().describe("Pagination offset (default: 0)"),
  limit: z.number().optional().describe("Number of listings to return (default: 20, max: 100)"),
});

/**
 * Schema for buying an NFT listing from Magic Eden
 */
export const BuyNftListingSchema = z.object({
  mintHash: z.string().describe("The NFT mint address"),
  maxPrice: z.number().optional().describe("Maximum price willing to pay in SOL (safety check)"),
  seller: z.string().optional().describe("Specific seller address to buy from"),
});

/**
 * Schema for getting NFT information
 */
export const GetNftInfoSchema = z.object({
  mintHash: z.string().describe("The NFT mint address"),
});
