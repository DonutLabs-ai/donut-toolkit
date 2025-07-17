# GoPlus Security Action Provider

The **GoplusActionProvider** provides comprehensive security analysis for Solana tokens and addresses using the [GoPlus Security API](https://gopluslabs.io/). This provider specializes in detecting various risks including honeypots, rug pulls, and other malicious activities in the Solana ecosystem.

## Overview

GoPlus Security is a leading blockchain security infrastructure that provides real-time security analysis for tokens, contracts, and addresses across multiple blockchain networks. This action provider focuses specifically on Solana tokens and integrates seamlessly with Coinbase AgentKit's query-based architecture.

## Features

- 🔍 **Token Security Analysis** - Comprehensive risk assessment for Solana tokens
- 📊 **Batch Processing** - Analyze up to 20 tokens simultaneously
- 👤 **Wallet Security** - Check wallet addresses for malicious activity
- ⚖️ **Token Comparison** - Compare security profiles across multiple tokens
- 🚨 **Malicious Address Detection** - Quick checks against known bad actors
- 🔄 **Automatic Retry Logic** - Robust error handling and retry mechanisms
- 📈 **Risk Scoring** - Standardized security scores (0-100)

## Directory Structure

```
goplus/
├── goplusActionProvider.ts      # Main provider implementation
├── api.ts                       # GoPlus API client
├── schemas.ts                   # Zod validation schemas
├── types.ts                     # TypeScript type definitions
├── constants.ts                 # Configuration constants
├── utils.ts                     # Utility functions
├── index.ts                     # Module exports
├── README.md                    # This documentation
└── goplusActionProvider.test.ts # Test suite
```

## Available Actions

### 1. `get_solana_token_security`

Get comprehensive security analysis for a single Solana token.

**Parameters:**
- `tokenAddress` (string): Solana token mint address to analyze

**Returns:** JSON with detailed security analysis including:
- Security score (0-100)
- Risk level (very_low, low, medium, high, very_high)
- Risk factors and safety indicators
- Trading information (taxes, restrictions)
- Liquidity data
- Recommendations

**Example:**
```typescript
const result = await agentKit.run("get_solana_token_security", {
  tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
});
```

### 2. `batch_solana_token_security`

Analyze multiple Solana tokens simultaneously (max 20 per request).

**Parameters:**
- `tokenAddresses` (string[]): Array of Solana token mint addresses

**Returns:** Batch analysis results with individual token results, error handling, and summary statistics.

**Example:**
```typescript
const result = await agentKit.run("batch_solana_token_security", {
  tokenAddresses: [
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
  ]
});
```

### 3. `analyze_wallet_security`

Analyze a Solana wallet address for security risks and suspicious activities.

**Parameters:**
- `walletAddress` (string): Solana wallet address to analyze

**Returns:** Wallet security assessment with risk indicators and recommendations.

**Example:**
```typescript
const result = await agentKit.run("analyze_wallet_security", {
  walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
});
```

### 4. `compare_token_security`

Compare security profiles of multiple Solana tokens to identify the safest options.

**Parameters:**
- `tokenAddresses` (string[]): Array of 2-10 token addresses to compare

**Returns:** Comparative analysis with safest/riskiest tokens and individual scores.

**Example:**
```typescript
const result = await agentKit.run("compare_token_security", {
  tokenAddresses: [
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"
  ]
});
```

### 5. `check_malicious_address`

Quick check if a Solana address is flagged as malicious in the GoPlus database.

**Parameters:**
- `address` (string): Solana address to check

**Returns:** Malicious address status and related information.

**Example:**
```typescript
const result = await agentKit.run("check_malicious_address", {
  address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
});
```

## Installation and Setup

### Basic Usage

```typescript
import { AgentKit, GoplusActionProvider } from "@coinbase/agentkit";

const agentKit = await AgentKit.from({
  cdpApiKeyId: process.env.CDP_API_KEY_ID,
  cdpApiKeySecret: process.env.CDP_API_KEY_SECRET,
  cdpWalletSecret: process.env.CDP_WALLET_SECRET,
  actionProviders: [
    new GoplusActionProvider(), // Use default configuration
  ]
});
```

### Advanced Configuration

```typescript
import { GoplusActionProvider } from "@coinbase/agentkit";

const goplusProvider = new GoplusActionProvider({
  apiBaseUrl: "https://api.gopluslabs.io/api/v1", // Custom API endpoint
  timeout: 30000,           // Request timeout (30 seconds)
  maxRetries: 3,           // Maximum retry attempts
  enableLogging: true,     // Enable debug logging
});
```

### Using the Convenience Function

```typescript
import { createGoplusActionProvider } from "@coinbase/agentkit";

const provider = createGoplusActionProvider({
  enableLogging: true,
  timeout: 45000,
});
```

## Security Scoring

The provider calculates security scores (0-100) based on various risk factors:

### Score Ranges
- **90-100**: Very Safe - Minimal risk, suitable for trading
- **75-89**: Safe - Low risk, exercise normal caution
- **50-74**: Caution - Medium risk, be careful
- **25-49**: Risky - High risk, extreme caution required
- **0-24**: Dangerous - Very high risk, avoid trading

### Risk Factors Analyzed
- **Contract Risks**: Honeypot detection, hidden owners, self-destruct capabilities
- **Trading Risks**: Buy/sell restrictions, slippage manipulation
- **Economic Risks**: High taxes, transfer restrictions
- **Liquidity Risks**: Low liquidity, fake tokens

## Response Format

All actions return JSON responses with a standardized format:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
```

### Example Token Security Response

```json
{
  "success": true,
  "data": {
    "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "tokenName": "USD Coin",
    "tokenSymbol": "USDC",
    "securityScore": 95,
    "riskLevel": "very_low",
    "riskFactors": [],
    "safetyIndicators": [
      "Verified true token",
      "On trust list",
      "Can buy",
      "Can sell all",
      "No buy tax",
      "No sell tax"
    ],
    "warnings": [],
    "recommendations": [
      "Token appears very safe for trading"
    ],
    "buyTax": 0,
    "sellTax": 0,
    "canBuy": true,
    "canSellAll": true,
    "liquidityInfo": {
      "totalLiquidity": 50000000,
      "dexes": [
        {
          "name": "Raydium",
          "liquidity": 30000000,
          "pair": "USDC/SOL"
        }
      ]
    },
    "lastAnalyzed": "2024-01-20T10:30:00Z"
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
```

## Network Support

The GoPlus Action Provider supports **all networks** as it's a query-only service that doesn't require wallet interactions. However, the analysis focuses specifically on **Solana tokens and addresses**.

## Error Handling

The provider includes comprehensive error handling:

- **Automatic Retries**: Network failures are automatically retried up to 3 times
- **Timeout Management**: Requests timeout after 30 seconds by default
- **Validation**: All addresses are validated before API calls
- **Graceful Degradation**: Individual token failures in batch requests don't affect others

## Integration Examples

### With PumpFun (Token Creation Safety)

```typescript
// Check token security before buying on PumpFun
const securityCheck = await agentKit.run("get_solana_token_security", {
  tokenAddress: tokenMint
});

const analysis = JSON.parse(securityCheck);
if (analysis.success && analysis.data.securityScore > 75) {
  // Proceed with PumpFun purchase
  const buyResult = await agentKit.run("buy_token", {
    tokenMint,
    amountInSol: 0.1
  });
}
```

### With Jupiter (Trading Safety)

```typescript
// Compare tokens before trading on Jupiter
const comparison = await agentKit.run("compare_token_security", {
  tokenAddresses: [tokenA, tokenB, tokenC]
});

const result = JSON.parse(comparison);
if (result.success) {
  const safestToken = result.data.comparison.safest;
  // Use safest token for Jupiter swap
}
```

### Portfolio Security Analysis

```typescript
// Analyze an entire portfolio
const portfolio = ["token1", "token2", "token3", "token4"];
const batchAnalysis = await agentKit.run("batch_solana_token_security", {
  tokenAddresses: portfolio
});

const analysis = JSON.parse(batchAnalysis);
if (analysis.success) {
  const { safeTokens, riskyTokens, dangerousTokens } = analysis.data.summary;
  console.log(`Portfolio: ${safeTokens} safe, ${riskyTokens} risky, ${dangerousTokens} dangerous`);
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiBaseUrl` | string | `https://api.gopluslabs.io/api/v1` | GoPlus API endpoint |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `maxRetries` | number | `3` | Maximum retry attempts for failed requests |
| `enableLogging` | boolean | `false` | Enable debug logging |

## Best Practices

1. **Always check security before trading** - Use `get_solana_token_security` before any token purchase
2. **Use batch analysis for portfolios** - More efficient than individual calls
3. **Set appropriate timeouts** - Increase timeout for batch requests
4. **Handle errors gracefully** - Check `success` field in responses
5. **Cache results when appropriate** - Security data doesn't change frequently
6. **Monitor risk levels** - Set up alerts for high-risk tokens in portfolios

## Rate Limits

The GoPlus API has rate limits. The provider automatically handles:
- Retry logic with exponential backoff
- Request queuing to prevent rate limit violations
- Error reporting for persistent failures

## Notes

- This provider requires an internet connection to access the GoPlus API
- No API key is required for basic usage
- All data comes directly from GoPlus Security's database
- Analysis is real-time and reflects current token status

For more information about GoPlus Security, visit [gopluslabs.io](https://gopluslabs.io/). 