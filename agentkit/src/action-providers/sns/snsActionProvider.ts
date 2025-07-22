import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { CreateAction } from "../actionDecorator";
import {
  ResolveDomainSchema,
  ReverseLookupSchema,
  GetDomainInfoSchema,
  SearchDomainsSchema,
} from "./schemas";
import { SNSAPI } from "./api";
import { Network } from "../../network";

/**
 * SNSActionProvider provides actions for Solana Name Service (SNS) operations.
 * Enables domain resolution, reverse lookup, and domain management on Solana.
 */
export class SNSActionProvider extends ActionProvider {
  private readonly api: SNSAPI;

  /**
   *
   */
  constructor() {
    super("sns", []);
    this.api = new SNSAPI();
  }

  /**
   * Resolve SNS domain to Solana address.
   *
   * @param args
   */
  @CreateAction({
    name: "resolve_domain",
    description:
      "Resolve SNS domain name to Solana address. Returns the wallet address associated with a .sol domain.",
    schema: ResolveDomainSchema,
  })
  async resolveDomain(args: z.infer<typeof ResolveDomainSchema>): Promise<string> {
    try {
      let { domain } = args;

      // Normalize domain - ensure it ends with .sol
      if (!domain.endsWith(".sol")) {
        domain = domain + ".sol";
      }

      // Validate domain format
      if (!/^[a-zA-Z0-9\-_]+\.sol$/.test(domain)) {
        return JSON.stringify({
          success: false,
          error: "Invalid domain format",
          message: "Domain must contain only alphanumeric characters, hyphens, and underscores",
        });
      }

      const address = await this.api.resolveDomain(domain);

      if (!address) {
        return JSON.stringify({
          success: false,
          error: "Domain not found",
          message: `No address found for domain ${domain}. Domain may not be registered or may not have an owner set.`,
        });
      }

      return JSON.stringify({
        success: true,
        data: {
          domain: domain,
          address: address,
          network: "solana",
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Resolution Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Reverse lookup - get domain for Solana address.
   *
   * @param args
   */
  @CreateAction({
    name: "reverse_lookup",
    description:
      "Get SNS domain name for a Solana address (reverse lookup). Returns the .sol domain associated with an address.",
    schema: ReverseLookupSchema,
  })
  async reverseLookup(args: z.infer<typeof ReverseLookupSchema>): Promise<string> {
    try {
      const { address } = args;

      // Validate Solana address format
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        return JSON.stringify({
          success: false,
          error: "Invalid address format",
          message: "Please provide a valid Solana address",
        });
      }

      const domain = await this.api.reverseLookup(address);

      if (!domain) {
        return JSON.stringify({
          success: false,
          error: "No domain found",
          message: `No SNS domain found for address ${address}`,
        });
      }

      return JSON.stringify({
        success: true,
        data: {
          address: address,
          domain: domain,
          network: "solana",
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Lookup Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get detailed information about an SNS domain.
   *
   * @param args
   */
  @CreateAction({
    name: "get_domain_info",
    description:
      "Get detailed information about an SNS domain including owner, registration status, and metadata.",
    schema: GetDomainInfoSchema,
  })
  async getDomainInfo(args: z.infer<typeof GetDomainInfoSchema>): Promise<string> {
    try {
      let { domain } = args;

      // Normalize domain
      if (!domain.endsWith(".sol")) {
        domain = domain + ".sol";
      }

      if (!/^[a-zA-Z0-9\-_]+\.sol$/.test(domain)) {
        return JSON.stringify({
          success: false,
          error: "Invalid domain format",
          message: "Domain must contain only alphanumeric characters, hyphens, and underscores",
        });
      }

      const info = await this.api.getDomainInfo(domain);

      return JSON.stringify({
        success: true,
        data: {
          domain: domain,
          registered: info.registered,
          available: !info.registered,
          owner: info.owner,
          registrationDate: info.registrationDate || null,
          expiryDate: info.expiryDate || null,
          subdomains: info.subdomains || [],
          records: info.records || {},
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Info Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Search for available SNS domains.
   *
   * @param args
   */
  @CreateAction({
    name: "search_domains",
    description:
      "Search for available SNS domains based on a query string. Useful for finding domain names to register.",
    schema: SearchDomainsSchema,
  })
  async searchDomains(args: z.infer<typeof SearchDomainsSchema>): Promise<string> {
    try {
      const { query, limit = 10 } = args;

      if (query.length < 2) {
        return JSON.stringify({
          success: false,
          error: "Query too short",
          message: "Search query must be at least 2 characters long",
        });
      }

      // Validate query contains only allowed characters
      if (!/^[a-zA-Z0-9\-_]+$/.test(query)) {
        return JSON.stringify({
          success: false,
          error: "Invalid query format",
          message: "Query must contain only alphanumeric characters, hyphens, and underscores",
        });
      }

      const domains = await this.api.searchDomains(query, limit);

      // Generate some suggested domains based on the query
      const suggestions = [
        `${query}.sol`,
        `${query}2024.sol`,
        `${query}_official.sol`,
        `my${query}.sol`,
        `${query}crypto.sol`,
      ].slice(0, limit);

      return JSON.stringify({
        success: true,
        data: {
          query: query,
          suggestions: suggestions,
          found: domains,
          totalResults: domains.length,
          note: "This is a basic implementation. For comprehensive domain search, consider using specialized SNS services.",
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Search Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * SNS only works on Solana, so this checks for Solana networks.
   *
   * @param network
   */
  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "svm";
  }
}
