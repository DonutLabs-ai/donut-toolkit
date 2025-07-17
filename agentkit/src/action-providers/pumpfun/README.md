# Pumpfun Action Provider

Coinbase Agent Kit action provider for creating and trading tokens on [Pump.fun](https://pump.fun/).

## Overview

The PumpfunActionProvider enables AI agents to interact with Pump.fun for token creation and trading operations. All actions return unsigned transaction messages that need to be manually signed and broadcasted.

## Features

- **Create Token**: Create new tokens on Pump.fun with metadata stored on IPFS
- **Buy Token**: Purchase existing tokens on Pump.fun
- **Create and Buy Token**: Create a new token and optionally purchase it in a single transaction

## Network Support

- **Solana Mainnet**: Full support for all Pump.fun operations
- **Other Networks**: Not supported (Pump.fun is Solana-only)

## Actions

### Create Token

Creates a new token on Pump.fun and returns an unsigned transaction message.

**Parameters:**
- `name` (string): Token name (1-50 characters)
- `symbol` (string): Token symbol (1-10 characters)  
- `description` (string): Token description (1-500 characters)
- `imageUrl` (string): URL of the token image
- `twitter` (string, optional): Twitter/X handle
- `telegram` (string, optional): Telegram handle
- `website` (string, optional): Website URL

**Returns:** JSON string with unsigned transaction data and token details.

### Buy Token

Buys a token on Pump.fun and returns an unsigned transaction message.

**Parameters:**
- `tokenMint` (string): Mint address of the token to buy
- `amountInSol` (number): Amount of SOL to spend
- `slippage` (number, optional): Slippage tolerance in percentage (1-50, default: 5%)
- `priorityFee` (number, optional): Priority fee in SOL (default: 0.0005)

**Returns:** JSON string with unsigned transaction data and purchase details.

### Create and Buy Token

Creates a new token and optionally buys it in a single transaction.

**Parameters:** 
- All parameters from Create Token
- `amountToBuyInSol` (number, optional): Amount of SOL to spend on initial purchase (0 = only create)
- `slippage` (number, optional): Slippage tolerance in percentage (1-50, default: 5%)
- `priorityFee` (number, optional): Priority fee in SOL (default: 0.0005)

**Returns:** JSON string with unsigned transaction data, token details, and purchase information.

## Usage

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { pumpfunActionProvider } from "@coinbase/agentkit";

const agentKit = new AgentKit({
  // ... other configuration
  actionProviders: [
    pumpfunActionProvider(),
    // ... other action providers
  ],
});

// The agent can now use Pumpfun actions
const result = await agentKit.invoke("create_and_buy_token", {
  name: "My Test Token",
  symbol: "MTT", 
  description: "A test token created with AgentKit",
  imageUrl: "https://example.com/token-image.png",
  amountToBuyInSol: 0.1,
  slippage: 5,
  priorityFee: 0.001
});

console.log(JSON.parse(result));
```

## Response Format

All actions return a JSON string with the following structure:

```typescript
{
  success: boolean;
  message: string;
  unsigned_message?: string; // Base64-encoded unsigned transaction
  transactionType: string;
  // Additional fields specific to each action
}
```

## Important Notes

1. **Unsigned Transactions**: All actions return unsigned transaction messages that must be manually signed and broadcasted
2. **Solana Mainnet Only**: Pump.fun only operates on Solana mainnet
3. **IPFS Metadata**: Token metadata is automatically uploaded to IPFS via Pump.fun's API
4. **Mint Keypair**: For token creation, the response includes the generated mint keypair that must be used when signing the transaction

## Error Handling

If an action fails, it returns a JSON response with `success: false` and error details:

```typescript
{
  success: false;
  error: string;
  message: string;
}
```

## Dependencies

- `@solana/web3.js`: Solana blockchain interactions
- `zod`: Schema validation
- Native `fetch`: HTTP requests to Pump.fun APIs

## API Endpoints

- **Token Creation**: `https://pumpportal.fun/api/trade-local`
- **Metadata Upload**: `https://pump.fun/api/ipfs` 