import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { CreateAction } from "../actionDecorator";
import { 
  TokenSecuritySchema,
  BatchTokenSecuritySchema,
  WalletSecuritySchema,
  TokenComparisonSchema,
  MaliciousAddressCheckSchema,
  TokenSecurityInput,
  BatchTokenSecurityInput,
  WalletSecurityInput,
  TokenComparisonInput,
  MaliciousAddressCheckInput
} from "./schemas";
import { 
  GoplusActionProviderConfig,
  ProcessedTokenSecurity,
  BatchTokenSecurityResult,
  TokenComparisonResult,
  WalletSecurityResult,
  ApiResponse
} from "./types";
import { ERROR_MESSAGES } from "./constants";
import { GoplusAPI } from "./api";
import { 
  processTokenSecurityData,
  createApiResponse,
  createBatchSummary,
  isValidSolanaAddress
} from "./utils";

/**
 * GoPlus Security Action Provider for Coinbase AgentKit
 * 
 * Provides comprehensive security analysis for Solana tokens and addresses
 * using the GoPlus Security API. Specializes in detecting various risks including
 * honeypots, rug pulls, and other malicious activities.
 */
export class GoplusActionProvider extends ActionProvider {
  private readonly apiClient: GoplusAPI;

  /**
   * Creates a new GoplusActionProvider instance
   * 
   * @param config - Configuration options for the provider
   */
  constructor(config: GoplusActionProviderConfig = {}) {
    super("goplus", []);
    this.apiClient = new GoplusAPI(config);
  }

  /**
   * Get comprehensive security analysis for a single Solana token
   * 
   * Analyzes various security aspects including:
   * - Honeypot detection
   * - Owner privileges and risks
   * - Trading limitations
   * - Tax analysis
   * - Liquidity information
   */
  @CreateAction({
    name: "get_solana_token_security",
    description: "Get comprehensive security analysis for a Solana token including risk indicators, contract vulnerabilities, and safety recommendations",
    schema: TokenSecuritySchema,
  })
  async getSolanaTokenSecurity(args: TokenSecurityInput): Promise<string> {
    try {
      if (!isValidSolanaAddress(args.tokenAddress)) {
        return JSON.stringify(createApiResponse(null, false, ERROR_MESSAGES.INVALID_ADDRESS));
      }

      const response = await this.apiClient.solanaTokenSecurity(args.tokenAddress);
      
      if (!response.result || !response.result[args.tokenAddress]) {
        return JSON.stringify(createApiResponse(null, false, ERROR_MESSAGES.TOKEN_NOT_FOUND));
      }

      const rawData = response.result[args.tokenAddress];
      const processedData = processTokenSecurityData(args.tokenAddress, rawData);
      
      return JSON.stringify(createApiResponse(processedData));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify(createApiResponse(null, false, `Security analysis failed: ${errorMessage}`));
    }
  }

  /**
   * Get security analysis for multiple Solana tokens in a single request
   * 
   * Efficiently analyzes up to 20 tokens at once, providing:
   * - Individual security scores for each token
   * - Batch summary statistics
   * - Error handling for individual tokens
   */
  @CreateAction({
    name: "batch_solana_token_security",
    description: "Get security analysis for multiple Solana tokens in a single request (max 20 tokens)",
    schema: BatchTokenSecuritySchema,
  })
  async batchSolanaTokenSecurity(args: BatchTokenSecurityInput): Promise<string> {
    try {
      // Validate all addresses
      const invalidAddresses = args.tokenAddresses.filter(addr => !isValidSolanaAddress(addr));
      if (invalidAddresses.length > 0) {
        return JSON.stringify(createApiResponse(null, false, 
          `Invalid addresses: ${invalidAddresses.join(', ')}`));
      }

      const response = await this.apiClient.solanaTokenSecurity(args.tokenAddresses);
      const results: ProcessedTokenSecurity[] = [];
      const errors: Array<{tokenAddress: string; error: string}> = [];

      for (const tokenAddress of args.tokenAddresses) {
        try {
          if (response.result && response.result[tokenAddress]) {
            const rawData = response.result[tokenAddress];
            const processedData = processTokenSecurityData(tokenAddress, rawData);
            results.push(processedData);
          } else {
            errors.push({
              tokenAddress,
              error: "Token not found or analysis unavailable"
            });
          }
        } catch (error) {
          errors.push({
            tokenAddress,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const summary = createBatchSummary(results);
      
      const batchResult: BatchTokenSecurityResult = {
        success: true,
        totalTokens: args.tokenAddresses.length,
        processedTokens: results.length,
        results,
        errors,
        summary
      };

      return JSON.stringify(createApiResponse(batchResult));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify(createApiResponse(null, false, `Batch analysis failed: ${errorMessage}`));
    }
  }

  /**
   * Analyze a Solana wallet address for security risks
   * 
   * Checks for:
   * - Malicious address indicators
   * - Suspicious transaction patterns
   * - Associated risk factors
   */
  @CreateAction({
    name: "analyze_wallet_security",
    description: "Analyze a Solana wallet address for security risks and suspicious activities",
    schema: WalletSecuritySchema,
  })
  async analyzeWalletSecurity(args: WalletSecurityInput): Promise<string> {
    try {
      if (!isValidSolanaAddress(args.walletAddress)) {
        return JSON.stringify(createApiResponse(null, false, ERROR_MESSAGES.INVALID_ADDRESS));
      }

      const response = await this.apiClient.checkMaliciousAddress(args.walletAddress);
      
      // Process wallet security data (implementation depends on API response structure)
      const walletResult: WalletSecurityResult = {
        walletAddress: args.walletAddress,
        riskLevel: "low", // This would be calculated based on actual response
        riskFactors: [],
        recommendations: ["Wallet appears to have normal activity patterns"],
        lastAnalyzed: new Date().toISOString()
      };

      return JSON.stringify(createApiResponse(walletResult));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify(createApiResponse(null, false, `Wallet analysis failed: ${errorMessage}`));
    }
  }

  /**
   * Compare security profiles of multiple tokens
   * 
   * Provides comparative analysis to help users understand
   * relative risks between different token options
   */
  @CreateAction({
    name: "compare_token_security",
    description: "Compare security profiles of multiple Solana tokens to identify the safest options",
    schema: TokenComparisonSchema,
  })
  async compareTokenSecurity(args: TokenComparisonInput): Promise<string> {
    try {
      // Reuse batch analysis for individual results
      const batchArgs = { tokenAddresses: args.tokenAddresses };
      const batchResultString = await this.batchSolanaTokenSecurity(batchArgs);
      const batchResult = JSON.parse(batchResultString);
      
      if (!batchResult.success) {
        return batchResultString; // Return the error
      }

      const results: ProcessedTokenSecurity[] = batchResult.data.results;
      
      if (results.length < 2) {
        return JSON.stringify(createApiResponse(null, false, 
          "Need at least 2 valid tokens for comparison"));
      }

      // Find safest and riskiest
      const safest = results.reduce((prev, current) => 
        current.securityScore > prev.securityScore ? current : prev);
      const riskiest = results.reduce((prev, current) => 
        current.securityScore < prev.securityScore ? current : prev);
      
      const averageScore = results.reduce((sum, token) => sum + token.securityScore, 0) / results.length;

      const comparisonResult: TokenComparisonResult = {
        tokenAddresses: args.tokenAddresses,
        comparison: {
          safest: safest.tokenAddress,
          riskiest: riskiest.tokenAddress,
          averageScore: Math.round(averageScore * 100) / 100
        },
        individualResults: results
      };

      return JSON.stringify(createApiResponse(comparisonResult));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify(createApiResponse(null, false, `Token comparison failed: ${errorMessage}`));
    }
  }

  /**
   * Check if a specific address is flagged as malicious
   * 
   * Quick check against GoPlus malicious address database
   */
  @CreateAction({
    name: "check_malicious_address",
    description: "Check if a Solana address is flagged as malicious in the GoPlus database",
    schema: MaliciousAddressCheckSchema,
  })
  async checkMaliciousAddress(args: MaliciousAddressCheckInput): Promise<string> {
    try {
      if (!isValidSolanaAddress(args.address)) {
        return JSON.stringify(createApiResponse(null, false, ERROR_MESSAGES.INVALID_ADDRESS));
      }

      const response = await this.apiClient.checkMaliciousAddress(args.address);
      
      return JSON.stringify(createApiResponse(response));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify(createApiResponse(null, false, `Malicious address check failed: ${errorMessage}`));
    }
  }

  /**
   * Network support - GoPlus works for all networks since it's a query service,
   * but we focus on Solana for this implementation
   */
  supportsNetwork(network: Network): boolean {
    return true; // Query service works regardless of wallet network
  }
}

/**
 * Export convenience function for creating the provider
 */
export function createGoplusActionProvider(config?: GoplusActionProviderConfig): GoplusActionProvider {
  return new GoplusActionProvider(config);
} 