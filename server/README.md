# AgentKit Extension - Model Context Protocol (MCP)

Anthropic Model Context Protocol (MCP) extension of AgentKit. Enables agentic workflows to interact with onchain actions using your own wallet service.

## Setup

### Prerequisites

- Node.js 18 or higher
- Your own wallet service that handles transaction signing

### Installation

```bash
npm install @coinbase/agentkit-model-context-protocol @coinbase/agentkit @modelcontextprotocol/sdk
```

## Usage

### Method 1: Using a Custom Wallet Provider

Create a custom wallet provider that integrates with your wallet service:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { 
  getMcpTools, 
  UnsignedTransactionWalletProvider 
} from "@coinbase/agentkit-model-context-protocol";
import { 
  walletActionProvider, 
  splActionProvider,
  Network 
} from "@coinbase/agentkit";

// Define your network
const network: Network = {
  protocolFamily: "evm",
  chainId: "1",
  networkId: "ethereum-mainnet",
};

// Create a custom wallet provider that returns unsigned transactions
const customWalletProvider = new UnsignedTransactionWalletProvider(
  "0xYourWalletAddress", 
  network
);

// Get MCP tools using your custom wallet provider
const { tools, toolHandler } = await getMcpTools({
  walletProvider: customWalletProvider,
  actionProviders: [
    walletActionProvider(),
    splActionProvider(), // Add other action providers as needed
  ],
});

const server = new Server(
  {
    name: "agentkit",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    return toolHandler(request.params.name, request.params.arguments);
  } catch (error) {
    throw new Error(`Tool ${request.params.name} failed: ${error}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Method 2: Using Action Providers Directly

If you only need read-only actions (like price queries, DeFi data, etc.), you can use action providers directly:

```typescript
import { getMcpToolsFromProviders } from "@coinbase/agentkit-model-context-protocol";
import { 
  defillamaActionProvider,
  dexscreenerActionProvider 
} from "@coinbase/agentkit";

// Use only read-only action providers (no wallet required)
const { tools, toolHandler } = await getMcpToolsFromProviders([
  defillamaActionProvider(),
  dexscreenerActionProvider(),
]);

// Set up MCP server as above...
```

### Method 3: Using with an Existing AgentKit Instance

If you already have an AgentKit instance configured:

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { getMcpTools } from "@coinbase/agentkit-model-context-protocol";

// Your existing AgentKit instance
const agentKit = await AgentKit.from({
  walletProvider: yourExistingWalletProvider,
  actionProviders: yourActionProviders,
});

const { tools, toolHandler } = await getMcpTools(agentKit);

// Set up MCP server as above...
```

## Creating Your Own Wallet Provider

The `UnsignedTransactionWalletProvider` is a basic example. For production use, create your own wallet provider that integrates with your wallet service:

```typescript
import { WalletProvider, Network } from "@coinbase/agentkit";

export class YourCustomWalletProvider extends WalletProvider {
  private address: string;
  private network: Network;
  private walletService: YourWalletService;

  constructor(address: string, network: Network, walletService: YourWalletService) {
    super();
    this.address = address;
    this.network = network;
    this.walletService = walletService;
  }

  getAddress(): string {
    return this.address;
  }

  getNetwork(): Network {
    return this.network;
  }

  getName(): string {
    return "your-custom-wallet";
  }

  async getBalance(): Promise<bigint> {
    // Call your wallet service to get balance
    return this.walletService.getBalance(this.address);
  }

  async nativeTransfer(to: string, value: string): Promise<string> {
    // Create unsigned transaction via your wallet service
    const unsignedTx = await this.walletService.createUnsignedTransaction({
      from: this.address,
      to,
      value,
      chainId: this.network.chainId,
    });
    
    // Return base64 encoded unsigned transaction
    return this.walletService.encodeUnsignedTransaction(unsignedTx);
  }
}
```

## Available Action Providers

The MCP extension supports all AgentKit action providers:

- **Wallet Operations**: Transfer tokens, check balances
- **DeFi Protocols**: Jupiter, Meteora, SPL tokens
- **Price Data**: DexScreener, DefiLlama
- **NFTs**: Magic Eden, Solana NFTs
- **Analytics**: GoPlus security analysis
- **And many more...**

## Benefits

✅ **No CDP Dependency**: Use your own wallet service  
✅ **Flexible Integration**: Choose from multiple integration methods  
✅ **Security**: Transactions remain unsigned until you sign them  
✅ **Scalable**: Support for read-only operations without wallet requirements  

## Contributing

See [CONTRIBUTING.md](../../../CONTRIBUTING.md) for detailed setup instructions and contribution guidelines.
