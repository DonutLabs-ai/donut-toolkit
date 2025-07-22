/**
 * Usage examples for AgentKit MCP Extension without CDP API Keys
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { 
  getMcpTools, 
  getMcpToolsFromProviders,
  UnsignedTransactionWalletProvider 
} from "./index";
import { 
  walletActionProvider,
  splActionProvider,
  defillamaActionProvider,
  dexscreenerActionProvider,
  Network,
  WalletProvider
} from "@coinbase/agentkit";

/**
 * Example 1: Using custom wallet provider for Solana
 */
export async function createSolanaMcpServer() {
  const network: Network = {
    protocolFamily: "svm",
    chainId: "solana",
    networkId: "solana-mainnet",
  };

  const customWalletProvider = new UnsignedTransactionWalletProvider(
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    network
  );

  const { tools, toolHandler } = await getMcpTools({
    walletProvider: customWalletProvider,
    actionProviders: [
      walletActionProvider(),
      splActionProvider(),
      dexscreenerActionProvider(),
    ],
  });

  return createMcpServer(tools, toolHandler);
}

/**
 * Example 2: Read-only mode using action providers without wallet
 */
export async function createReadOnlyMcpServer() {
  const { tools, toolHandler } = await getMcpToolsFromProviders([
    defillamaActionProvider(),
    dexscreenerActionProvider(),
  ]);

  return createMcpServer(tools, toolHandler);
}

/**
 * Example 3: Advanced custom wallet provider with external service integration for Solana
 */
export class ExternalSolanaWalletServiceProvider extends WalletProvider {
  private address: string;
  private network: Network;
  private apiKey: string;
  private baseUrl: string;

  constructor(address: string, network: Network, apiKey: string, baseUrl: string) {
    super();
    this.address = address;
    this.network = network;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  getAddress(): string {
    return this.address;
  }

  getNetwork(): Network {
    return this.network;
  }

  getName(): string {
    return "external-solana-wallet-service";
  }

  async getBalance(): Promise<bigint> {
    // Call your external Solana wallet service API
    const response = await fetch(`${this.baseUrl}/solana/balance/${this.address}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    const data = await response.json();
    return BigInt(data.balance);
  }

  async nativeTransfer(to: string, value: string): Promise<string> {
    // Create unsigned Solana transaction via your external service
    const response = await fetch(`${this.baseUrl}/solana/create-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.address,
        to,
        value,
        network: this.network.networkId,
      }),
    });

    const data = await response.json();
    
    // Return the unsigned Solana transaction in base64 format
    return data.unsignedTransaction; // This would be base64 encoded
  }
}

/**
 * Example 4: Using the advanced external Solana wallet service
 */
export async function createExternalSolanaServiceMcpServer(apiKey: string, serviceUrl: string) {
  const network: Network = {
    protocolFamily: "svm",
    chainId: "solana",
    networkId: "solana-mainnet",
  };

  const externalWalletProvider = new ExternalSolanaWalletServiceProvider(
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    network,
    apiKey,
    serviceUrl
  );

  const { tools, toolHandler } = await getMcpTools({
    walletProvider: externalWalletProvider,
    actionProviders: [
      walletActionProvider(),
      splActionProvider(),
      dexscreenerActionProvider(),
    ],
  });

  return createMcpServer(tools, toolHandler);
}

/**
 * Helper function to create MCP server
 */
function createMcpServer(tools: Tool[], toolHandler: (name: string, args: unknown) => Promise<CallToolResult>) {
  const server = new Server(
    {
      name: "agentkit",
      version: "0.2.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return toolHandler(request.params.name, request.params.arguments);
    } catch (error) {
      throw new Error(`Tool ${request.params.name} failed: ${error}`);
    }
  });

  return server;
}

/**
 * Main function to start the MCP server
 */
export async function startMcpServer(mode: 'solana' | 'readonly' | 'external' = 'readonly') {
  let server: any;

  switch (mode) {
    case 'solana':
      server = await createSolanaMcpServer();
      break;
    case 'external': {
      const apiKey = process.env.WALLET_SERVICE_API_KEY;
      const serviceUrl = process.env.WALLET_SERVICE_URL;
      if (!apiKey || !serviceUrl) {
        throw new Error("WALLET_SERVICE_API_KEY and WALLET_SERVICE_URL environment variables are required");
      }
      server = await createExternalSolanaServiceMcpServer(apiKey, serviceUrl);
      break;
    }
    default:
      server = await createReadOnlyMcpServer();
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log(`AgentKit MCP Server started in ${mode} mode`);
} 