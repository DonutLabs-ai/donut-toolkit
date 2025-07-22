/**
 * GoPlus Security Action Provider for Coinbase AgentKit
 *
 * This module provides comprehensive security analysis for Solana tokens and addresses
 * using the GoPlus Security API. It helps detect various risks including honeypots,
 * rug pulls, and other malicious activities in the Solana ecosystem.
 */

// Export the main ActionProvider class
// Default export - convenience function for creating the provider
import { GoplusActionProvider } from "./goplusActionProvider";
import type { GoplusActionProviderConfig } from "./types";

export { GoplusActionProvider } from "./goplusActionProvider";

// Export convenience function for creating the provider
export { createGoplusActionProvider } from "./goplusActionProvider";

// Export types for external usage
export type {
  GoplusActionProviderConfig,
  ProcessedTokenSecurity,
  BatchTokenSecurityResult,
  TokenComparisonResult,
  WalletSecurityResult,
  SolanaTokenSecurityData,
  SolanaTokenSecurityResponse,
  ApiResponse,
  RiskLevel,
} from "./types";

// Export schemas for external validation
export {
  TokenSecuritySchema,
  BatchTokenSecuritySchema,
  WalletSecuritySchema,
  TokenComparisonSchema,
  MaliciousAddressCheckSchema,
} from "./schemas";

// Export input types
export type {
  TokenSecurityInput,
  BatchTokenSecurityInput,
  WalletSecurityInput,
  TokenComparisonInput,
  MaliciousAddressCheckInput,
} from "./schemas";

// Export constants for external reference
export {
  GOPLUS_API_BASE_URL,
  REQUEST_CONFIG,
  RISK_LEVELS,
  SECURITY_THRESHOLDS,
  ERROR_MESSAGES,
} from "./constants";

// Export utility functions
export { isValidSolanaAddress, formatNumber, calculateSecurityScore, getRiskLevel } from "./utils";

/**
 *
 * @param config
 */
export default function createGoplusActionProvider(
  config?: GoplusActionProviderConfig,
): GoplusActionProvider {
  return new GoplusActionProvider(config);
}
