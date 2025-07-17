# Meteora DLMM Action Provider

This action provider integrates with Meteora's Dynamic Liquidity Market Maker (DLMM) pools on Solana, enabling AI agents to provide liquidity and earn fees from trading activities.

## Overview

Meteora DLMM is a next-generation AMM that uses discretized liquidity bins to provide concentrated liquidity with improved capital efficiency. Unlike traditional AMMs, DLMM allows liquidity providers to specify exact price ranges and earn fees only when trading occurs within those ranges.

## Features

- **Create Positions**: Provide liquidity to specific price ranges (bins) in DLMM pools
- **Manage Positions**: Add/remove liquidity from existing positions
- **Claim Fees**: Harvest trading fees earned from liquidity provision
- **Query Information**: Get detailed information about pools and positions
- **Portfolio Management**: List and monitor all user positions

## Supported Networks

- Solana Mainnet (`solana-mainnet`)
- Solana Devnet (`solana-devnet`)

## Available Actions

### create_position

Creates a new liquidity position on a Meteora DLMM pool.

**Parameters:**
- `poolAddress`: Address of the Meteora DLMM pool
- `tokenXAmount`: Amount of token X to deposit (in whole units)
- `tokenYAmount`: Amount of token Y to deposit (in whole units)
- `lowerBinId`: Lower bin ID for the position range
- `upperBinId`: Upper bin ID for the position range
- `slippageBps`: Slippage tolerance in basis points (default: 100 = 1%)

**Example:**
```javascript
await agent.createPosition({
  poolAddress: "BqmwNfRCUVWY8RCKUvfDGCHpLjVWt2NJXzqZ8t6TmSP",
  tokenXAmount: 1.0,      // 1 SOL
  tokenYAmount: 100.0,    // 100 USDC
  lowerBinId: 100,        // Lower price range
  upperBinId: 200,        // Upper price range
  slippageBps: 100        // 1% slippage
});
```

### close_position

Closes an existing liquidity position on a Meteora DLMM pool.

**Parameters:**
- `positionAddress`: Address of the position to close
- `basisPointsToClose`: Percentage to close in basis points (10000 = 100%)
- `shouldClaimAndClose`: Whether to claim fees before closing (default: true)

**Example:**
```javascript
await agent.closePosition({
  positionAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  basisPointsToClose: 10000,  // Close 100% of position
  shouldClaimAndClose: true   // Claim fees before closing
});
```

### claim_fees

Claims accumulated trading fees from a position.

**Parameters:**
- `positionAddress`: Address of the position to claim fees from

**Example:**
```javascript
await agent.claimFees({
  positionAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
});
```

### get_pool_info

Retrieves detailed information about a Meteora DLMM pool.

**Parameters:**
- `poolAddress`: Address of the pool to query

**Example:**
```javascript
const poolInfo = await agent.getPoolInfo({
  poolAddress: "BqmwNfRCUVWY8RCKUvfDGCHpLjVWt2NJXzqZ8t6TmSP"
});
```

### get_position_info

Retrieves detailed information about a specific position.

**Parameters:**
- `positionAddress`: Address of the position to query

**Example:**
```javascript
const positionInfo = await agent.getPositionInfo({
  positionAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
});
```

### list_user_positions

Lists all positions owned by a user.

**Parameters:**
- `userAddress`: User address to query (optional, defaults to wallet address)

**Example:**
```javascript
const positions = await agent.listUserPositions({
  userAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
});
```

### get_available_pools

Retrieves available DLMM pools with optional filtering.

**Parameters:**
- `tokenX`: Filter by token X mint address (optional)
- `tokenY`: Filter by token Y mint address (optional)
- `limit`: Maximum number of pools to return (default: 20, max: 100)

**Example:**
```javascript
const pools = await agent.getAvailablePools({
  tokenX: "So11111111111111111111111111111111111111112",  // SOL
  tokenY: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
  limit: 10
});
```

## Usage with AgentKit

To use the Meteora action provider with AgentKit:

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { meteoraDLMMActionProvider } from "@coinbase/agentkit";

const agentKit = await AgentKit.from({
  cdpApiKeyId: "YOUR_CDP_API_KEY_ID",
  cdpApiKeySecret: "YOUR_CDP_API_KEY_SECRET",
  actionProviders: [
    meteoraDLMMActionProvider()
  ]
});
```

## Key Concepts

### Bins and Price Ranges

Meteora DLMM uses discretized liquidity bins, where each bin represents a specific price range. When you create a position, you specify:
- **Lower Bin ID**: The minimum price bin for your position
- **Upper Bin ID**: The maximum price bin for your position

### Fee Earning

You earn fees only when trading activity occurs within your position's price range. The more trading volume in your bins, the more fees you earn.

### Capital Efficiency

By concentrating liquidity in specific price ranges, DLMM provides better capital efficiency compared to traditional AMMs that spread liquidity across all price ranges.

## Best Practices

1. **Research Pool Activity**: Use `get_pool_info` to understand trading volume and fee rates
2. **Monitor Positions**: Regularly check position performance with `get_position_info`
3. **Claim Fees Regularly**: Use `claim_fees` to harvest earned fees
4. **Diversify Ranges**: Consider multiple positions across different price ranges
5. **Manage Slippage**: Set appropriate slippage tolerance based on market conditions

## Error Handling

All actions return JSON responses with `success` boolean and detailed error messages:

```typescript
const result = await agent.createPosition({...});
const response = JSON.parse(result);

if (!response.success) {
  console.error("Error:", response.error);
  console.error("Message:", response.message);
}
```

## Requirements

- Solana wallet with sufficient SOL for transaction fees
- Token balances for the tokens you want to provide as liquidity
- Understanding of DLMM concepts and impermanent loss risks

## Limitations

- Only supports Solana mainnet and devnet
- Requires Meteora SDK integration for full functionality (placeholder implementation provided)
- Position management requires understanding of bin pricing mechanics

## Integration Notes

This implementation provides the framework for Meteora DLMM integration. For production use, you'll need to:

1. Install the Meteora SDK: `npm install @meteora-ag/dlmm`
2. Implement the actual transaction building in the helper methods
3. Add proper error handling for network-specific issues
4. Implement position validation and ownership checks

The current implementation includes comprehensive schemas, error handling, and API integration patterns that follow the Coinbase AgentKit architecture.
