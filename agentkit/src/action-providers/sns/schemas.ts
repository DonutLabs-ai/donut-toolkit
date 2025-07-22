import { z } from "zod";

/**
 * Schema for resolving SNS domain to Solana address.
 */
export const ResolveDomainSchema = z
  .object({
    domain: z.string().describe("The SNS domain name to resolve (e.g., 'bonfida.sol')"),
  })
  .describe("Resolve SNS domain name to Solana address");

/**
 * Schema for reverse lookup - getting domain from Solana address.
 */
export const ReverseLookupSchema = z
  .object({
    address: z.string().describe("The Solana address to get domain for"),
  })
  .describe("Get SNS domain name for a Solana address (reverse lookup)");

/**
 * Schema for getting domain information.
 */
export const GetDomainInfoSchema = z
  .object({
    domain: z.string().describe("The SNS domain name"),
  })
  .describe("Get detailed information about an SNS domain");

/**
 * Schema for searching available domains.
 */
export const SearchDomainsSchema = z
  .object({
    query: z.string().describe("Search query for domain names"),
    limit: z.number().optional().default(10).describe("Maximum number of results to return"),
  })
  .describe("Search for available SNS domains");
