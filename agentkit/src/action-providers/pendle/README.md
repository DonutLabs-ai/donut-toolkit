# Pendle Action Provider

This directory contains the **PendleActionProvider** implementation, which provides actions for **Pendle** yield tokenization and DeFi operations.

## Overview

The PendleActionProvider is designed to work with EvmWalletProvider for blockchain interactions. It provides a comprehensive set of actions that enable yield decomposition, forward yield trading, and liquidity management on Pendle protocol across multiple EVM networks.

**Key Features:**
- ✅ Yield tokenization (PT/YT minting and redemption)
- ✅ Token swapping on Pendle AMM
- ✅ Liquidity pool management
- ✅ User position tracking
- ✅ Market data analytics
- ✅ Returns unsigned transactions for all write operations
- ✅ Multi-network support (Ethereum, Arbitrum, BNB Chain, etc.)

## Directory Structure

```
pendle/
├── pendleActionProvider.ts       # Main provider implementation
├── pendleActionProvider.test.ts  # Provider test suite (TODO)
├── schemas.ts                    # Action schemas and types
├── constants.ts                  # Network addresses and constants
├── types.ts                      # TypeScript type definitions
├── utils.ts                      # Utility functions
├── index.ts                      # Package exports
└── README.md                     # Documentation (this file)
```

## Supported Networks

This provider supports the following EVM networks where Pendle is deployed:

- **Ethereum Mainnet** (Chain ID: 1)
- **Arbitrum Mainnet** (Chain ID: 42161)
- **BNB Chain** (Chain ID: 56)
- **Optimism** (Chain ID: 10)
- **Polygon** (Chain ID: 137)
- **Mantle** (Chain ID: 5000)

**Testnets:**
- Ethereum Sepolia (Chain ID: 11155111)
- Arbitrum Sepolia (Chain ID: 421614)

## Actions

### Write Operations (Return Unsigned Transactions)

#### **mint_yield_tokens**
- **Purpose**: Creates unsigned transaction to mint Principal Tokens (PT) and Yield Tokens (YT) from yield-bearing assets
- **Input**:
  - `marketAddress` (string): Pendle market contract address
  - `amount` (string): Amount of input token to mint
  - `tokenIn` (string): Input token address or symbol
  - `slippage` (number, optional): Slippage tolerance (default: 0.5%)
  - `enableAggregator` (boolean, optional): Enable aggregator routing (default: true)
- **Output**: JSON with unsigned transaction in base64 format
- **Example**:
  ```typescript
  const result = await provider.mintYieldTokens(walletProvider, {
    marketAddress: "0x...",
    amount: "1.0",
    tokenIn: "stETH",
    slippage: 0.5
  });
  ```

#### **redeem_yield_tokens**
- **Purpose**: Creates unsigned transaction to redeem PT and YT tokens back to underlying assets
- **Input**:
  - `marketAddress` (string): Pendle market contract address
  - `ptAmount` (string): Amount of PT tokens to redeem
  - `ytAmount` (string): Amount of YT tokens to redeem
  - `tokenOut` (string, optional): Desired output token format
  - `slippage` (number, optional): Slippage tolerance

#### **swap_tokens**
- **Purpose**: Creates unsigned transaction to swap tokens on Pendle AMM
- **Input**:
  - `marketAddress` (string): Pendle market contract address
  - `tokenIn` (string): Input token address or symbol
  - `tokenOut` (string): Output token address or symbol (PT, YT, or SY)
  - `amount` (string): Amount of input token to swap
  - `slippage` (number, optional): Slippage tolerance
  - `enableAggregator` (boolean, optional): Enable aggregator routing

#### **add_liquidity**
- **Purpose**: Creates unsigned transaction to add liquidity to Pendle pools
- **Input**:
  - `poolAddress` (string): Pendle pool contract address
  - `tokenAmount` (string): Amount of tokens to add as liquidity
  - `tokenAddress` (string): Token address to add as liquidity
  - `minimumLpOut` (string, optional): Minimum LP tokens to receive
  - `slippage` (number, optional): Slippage tolerance

#### **remove_liquidity**
- **Purpose**: Creates unsigned transaction to remove liquidity from Pendle pools
- **Input**:
  - `poolAddress` (string): Pendle pool contract address
  - `lpTokenAmount` (string): Amount of LP tokens to burn
  - `minimumTokenOut` (string, optional): Minimum tokens to receive
  - `tokenOut` (string, optional): Preferred output token address
  - `slippage` (number, optional): Slippage tolerance

### Read Operations (Direct Data Returns)

#### **get_markets**
- **Purpose**: Get available Pendle yield markets and their details
- **Input**:
  - `chainId` (number, optional): Blockchain chain ID
  - `limit` (number, optional): Maximum markets to return (default: 10)
  - `activeOnly` (boolean, optional): Only active markets (default: true)
- **Output**: List of markets with APY, liquidity, and expiry data

#### **get_user_positions**
- **Purpose**: Get user's positions in Pendle markets and pools
- **Input**:
  - `userAddress` (string, optional): User wallet address (defaults to connected wallet)
  - `chainId` (number, optional): Blockchain chain ID
  - `includeExpired` (boolean, optional): Include expired positions (default: false)
- **Output**: User positions with balances, values, and rewards

#### **get_market_data**
- **Purpose**: Get detailed market data including APY and price history
- **Input**:
  - `marketAddress` (string): Pendle market contract address
  - `period` (string, optional): Time period ("1d", "7d", "30d", default: "7d")
- **Output**: Market data with historical prices and analytics

#### **get_asset_info**
- **Purpose**: Get detailed information about a Pendle asset
- **Input**:
  - `tokenAddress` (string): Token contract address
  - `chainId` (number, optional): Blockchain chain ID
- **Output**: Asset metadata, price, and supply information

## Usage Examples

### Basic Yield Tokenization

```typescript
import { pendleActionProvider } from "@coinbase/agentkit";

// Initialize provider
const pendle = pendleActionProvider();

// Get available markets
const markets = await pendle.getMarkets(walletProvider, {
  limit: 5,
  activeOnly: true
});

// Mint PT and YT tokens from stETH
const mintResult = await pendle.mintYieldTokens(walletProvider, {
  marketAddress: "0x...",
  amount: "1.0",
  tokenIn: "stETH",
  slippage: 0.5
});

// The result contains base64 unsigned transaction
console.log(mintResult.unsignedTransaction);
```

### Liquidity Management

```typescript
// Add liquidity to a Pendle pool
const addLiquidityResult = await pendle.addLiquidity(walletProvider, {
  poolAddress: "0x...",
  tokenAmount: "100",
  tokenAddress: "0x...",
  slippage: 1.0
});

// Remove liquidity from a pool
const removeLiquidityResult = await pendle.removeLiquidity(walletProvider, {
  poolAddress: "0x...",
  lpTokenAmount: "50",
  slippage: 1.0
});
```

### Portfolio Tracking

```typescript
// Get user positions
const positions = await pendle.getUserPositions(walletProvider, {
  includeExpired: false
});

// Get market analytics
const marketData = await pendle.getMarketData(walletProvider, {
  marketAddress: "0x...",
  period: "7d"
});
```

## Implementation Details

### Network Support
This provider supports all EVM networks where Pendle is deployed. Network validation is performed automatically.

### Wallet Provider Integration
This provider is specifically designed to work with EvmWalletProvider. Key integration points:
- Network compatibility checks
- Transaction building and unsigned transaction generation
- Address resolution and balance queries

### Transaction Format
All write operations return unsigned transactions in the following format:
```typescript
{
  success: boolean;
  unsignedTransaction?: string;  // base64 encoded transaction
  transactionType: string;       // pendle_mint_yield_tokens, etc.
  message: string;
  // Additional operation-specific data...
}
```

### Error Handling
The provider includes comprehensive error handling with user-friendly error messages for common scenarios:
- Unsupported networks
- Invalid token addresses
- Expired markets
- Insufficient balances
- API failures

## Configuration

```typescript
import { pendleActionProvider } from "@coinbase/agentkit";

const pendle = pendleActionProvider({
  apiKey: "optional-pendle-api-key",
  rpcEndpoint: "optional-custom-rpc",
  enableAggregator: true
});
```

## Adding New Actions

To add new Pendle actions:

1. Define the schema in `schemas.ts`:
   ```typescript
   export const NewActionSchema = z.object({
     // Define parameters
   });
   ```

2. Implement the action in `pendleActionProvider.ts`:
   ```typescript
   @CreateAction({
     name: "new_action",
     description: "Description of the action",
     schema: NewActionSchema,
   })
   async newAction(
     walletProvider: EvmWalletProvider,
     args: z.infer<typeof NewActionSchema>
   ): Promise<string> {
     // Implementation
   }
   ```

3. Add any required constants to `constants.ts`
4. Update type definitions in `types.ts` if needed
5. Add tests in `pendleActionProvider.test.ts`

## Notes

- **SDK Integration**: The current implementation includes placeholders for Pendle SDK integration. Actual transaction building requires integration with the official Pendle SDK.
- **API Access**: Some features may require Pendle API access for optimal performance.
- **Gas Optimization**: All transactions include gas estimation and optimization.
- **Slippage Protection**: Built-in slippage protection for all trading operations.
- **Multi-chain**: Designed to work seamlessly across all supported Pendle networks.

For more information on **Pendle Protocol**, visit [Pendle Documentation](https://docs.pendle.finance/). 