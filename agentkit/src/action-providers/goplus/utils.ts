import {
  SolanaTokenSecurityData,
  ProcessedTokenSecurity,
  RiskLevel,
  ApiResponse,
  BatchTokenSecurityResult,
  TokenComparisonResult,
} from "./types";
import { RISK_LEVELS, SECURITY_THRESHOLDS, RISK_FACTORS } from "./constants";

/**
 * Calculate security score based on GoPlus security data
 *
 * @param data
 */
export function calculateSecurityScore(data: SolanaTokenSecurityData): number {
  let score = 100; // Start with perfect score

  // Major risks that significantly reduce score
  if (data.cannot_buy === "1") score -= 30;
  if (data.cannot_sell_all === "1") score -= 30;
  if (data.is_airdrop_scam === "1") score -= 50;
  if (data.hidden_owner === "1") score -= 20;
  if (data.selfdestruct === "1") score -= 40;
  if (data.can_take_back_ownership === "1") score -= 25;
  if (data.owner_change_balance === "1") score -= 25;

  // Moderate risks
  if (data.slippage_modifiable === "1") score -= 15;
  if (data.trading_cooldown === "1") score -= 10;
  if (data.transfer_pausable === "1") score -= 15;

  // Tax penalties
  const buyTax = parseFloat(data.buy_tax || "0");
  const sellTax = parseFloat(data.sell_tax || "0");

  if (buyTax > 10) score -= 20;
  else if (buyTax > 5) score -= 10;

  if (sellTax > 10) score -= 20;
  else if (sellTax > 5) score -= 10;

  // Bonus for positive indicators
  if (data.is_true_token === "1") score += 5;
  if (data.trust_list === "1") score += 10;
  if (data.is_open_source === "1") score += 5;

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine risk level based on security score
 *
 * @param score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= SECURITY_THRESHOLDS.VERY_SAFE) return RISK_LEVELS.VERY_LOW;
  if (score >= SECURITY_THRESHOLDS.SAFE) return RISK_LEVELS.LOW;
  if (score >= SECURITY_THRESHOLDS.CAUTION) return RISK_LEVELS.MEDIUM;
  if (score >= SECURITY_THRESHOLDS.RISKY) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.VERY_HIGH;
}

/**
 * Extract risk factors from security data
 *
 * @param data
 */
export function extractRiskFactors(data: SolanaTokenSecurityData): string[] {
  const risks: string[] = [];

  if (data.cannot_buy === "1") risks.push("Cannot buy token");
  if (data.cannot_sell_all === "1") risks.push("Cannot sell all tokens");
  if (data.is_airdrop_scam === "1") risks.push("Potential airdrop scam");
  if (data.hidden_owner === "1") risks.push("Hidden owner");
  if (data.selfdestruct === "1") risks.push("Self-destruct capability");
  if (data.can_take_back_ownership === "1") risks.push("Can take back ownership");
  if (data.owner_change_balance === "1") risks.push("Owner can change balance");
  if (data.slippage_modifiable === "1") risks.push("Modifiable slippage");
  if (data.trading_cooldown === "1") risks.push("Trading cooldown");
  if (data.transfer_pausable === "1") risks.push("Transfers can be paused");

  const buyTax = parseFloat(data.buy_tax || "0");
  const sellTax = parseFloat(data.sell_tax || "0");

  if (buyTax > 10) risks.push(`High buy tax: ${buyTax}%`);
  if (sellTax > 10) risks.push(`High sell tax: ${sellTax}%`);

  return risks;
}

/**
 * Extract safety indicators from security data
 *
 * @param data
 */
export function extractSafetyIndicators(data: SolanaTokenSecurityData): string[] {
  const indicators: string[] = [];

  if (data.is_true_token === "1") indicators.push("Verified true token");
  if (data.trust_list === "1") indicators.push("On trust list");
  if (data.is_open_source === "1") indicators.push("Open source");
  if (data.cannot_buy !== "1") indicators.push("Can buy");
  if (data.cannot_sell_all !== "1") indicators.push("Can sell all");

  const buyTax = parseFloat(data.buy_tax || "0");
  const sellTax = parseFloat(data.sell_tax || "0");

  if (buyTax === 0) indicators.push("No buy tax");
  if (sellTax === 0) indicators.push("No sell tax");

  return indicators;
}

/**
 * Generate recommendations based on security analysis
 *
 * @param data
 * @param score
 */
export function generateRecommendations(data: SolanaTokenSecurityData, score: number): string[] {
  const recommendations: string[] = [];

  if (score >= SECURITY_THRESHOLDS.VERY_SAFE) {
    recommendations.push("Token appears very safe for trading");
  } else if (score >= SECURITY_THRESHOLDS.SAFE) {
    recommendations.push("Token appears relatively safe, but exercise normal caution");
  } else if (score >= SECURITY_THRESHOLDS.CAUTION) {
    recommendations.push("Exercise caution when trading this token");
    recommendations.push("Consider starting with small amounts");
  } else if (score >= SECURITY_THRESHOLDS.RISKY) {
    recommendations.push("High risk token - trade with extreme caution");
    recommendations.push("Only trade with money you can afford to lose");
  } else {
    recommendations.push("Extremely risky token - avoid trading");
    recommendations.push("High probability of being a scam or having major issues");
  }

  if (data.cannot_buy === "1") {
    recommendations.push("WARNING: Unable to buy this token");
  }

  if (data.cannot_sell_all === "1") {
    recommendations.push("WARNING: May not be able to sell all tokens");
  }

  const buyTax = parseFloat(data.buy_tax || "0");
  const sellTax = parseFloat(data.sell_tax || "0");

  if (buyTax > 5) {
    recommendations.push(`High buy tax (${buyTax}%) - factor into trading costs`);
  }

  if (sellTax > 5) {
    recommendations.push(`High sell tax (${sellTax}%) - factor into exit strategy`);
  }

  return recommendations;
}

/**
 * Generate warnings based on security analysis
 *
 * @param data
 */
export function generateWarnings(data: SolanaTokenSecurityData): string[] {
  const warnings: string[] = [];

  if (data.is_airdrop_scam === "1") {
    warnings.push("⚠️ CRITICAL: Potential airdrop scam detected");
  }

  if (data.cannot_buy === "1") {
    warnings.push("⚠️ Cannot purchase this token");
  }

  if (data.cannot_sell_all === "1") {
    warnings.push("⚠️ May not be able to sell all tokens");
  }

  if (data.hidden_owner === "1") {
    warnings.push("⚠️ Token has a hidden owner");
  }

  if (data.selfdestruct === "1") {
    warnings.push("⚠️ Token contract can self-destruct");
  }

  return warnings;
}

/**
 * Process raw GoPlus data into a standardized format
 *
 * @param tokenAddress
 * @param data
 */
export function processTokenSecurityData(
  tokenAddress: string,
  data: SolanaTokenSecurityData,
): ProcessedTokenSecurity {
  const score = calculateSecurityScore(data);
  const riskLevel = getRiskLevel(score);
  const riskFactors = extractRiskFactors(data);
  const safetyIndicators = extractSafetyIndicators(data);
  const warnings = generateWarnings(data);
  const recommendations = generateRecommendations(data, score);

  const tokenName = data.token_name || (data as any).metadata?.name;
  const tokenSymbol = data.token_symbol || (data as any).metadata?.symbol;
  const holderCount = data.holder_count;
  const totalSupply = data.total_supply;

  const liquidityInfo = data.dex
    ? {
        totalLiquidity: data.dex.reduce((sum, dex) => sum + parseFloat(dex.liquidity || "0"), 0),
        dexes: data.dex.map(dex => ({
          name: dex.name,
          liquidity: parseFloat(dex.liquidity || "0"),
          pair: dex.pair,
        })),
      }
    : undefined;

  return {
    tokenAddress,
    tokenName,
    tokenSymbol,
    securityScore: score,
    riskLevel,
    riskFactors,
    safetyIndicators,
    warnings,
    recommendations,
    buyTax: data.buy_tax ? parseFloat(data.buy_tax) : undefined,
    sellTax: data.sell_tax ? parseFloat(data.sell_tax) : undefined,
    canBuy: data.cannot_buy !== "1",
    canSellAll: data.cannot_sell_all !== "1",
    liquidityInfo,
    holderCount: holderCount ? parseInt(holderCount) : undefined,
    totalSupply,
    note: data.note,
    lastAnalyzed: new Date().toISOString(),
  };
}

/**
 * Create API response wrapper
 *
 * @param data
 * @param success
 * @param error
 */
export function createApiResponse<T>(data: T, success = true, error?: string): ApiResponse<T> {
  return {
    success,
    data: success ? data : undefined,
    error: error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate Solana address format
 *
 * @param address
 */
export function isValidSolanaAddress(address: string): boolean {
  const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return SOLANA_ADDRESS_REGEX.test(address);
}

/**
 * Format large numbers for display
 *
 * @param num
 */
export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toString();
}

/**
 * Create batch analysis result summary
 *
 * @param results
 */
export function createBatchSummary(
  results: ProcessedTokenSecurity[],
): BatchTokenSecurityResult["summary"] {
  return {
    safeTokens: results.filter(r => r.securityScore >= SECURITY_THRESHOLDS.SAFE).length,
    riskyTokens: results.filter(
      r =>
        r.securityScore >= SECURITY_THRESHOLDS.RISKY && r.securityScore < SECURITY_THRESHOLDS.SAFE,
    ).length,
    dangerousTokens: results.filter(r => r.securityScore < SECURITY_THRESHOLDS.RISKY).length,
  };
}
