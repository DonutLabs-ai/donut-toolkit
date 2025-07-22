/**
 * Main exports for the AgentKit Model Context Protocol (MCP) Extension package
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types";
import { AgentKit, Action, ActionProvider, WalletProvider, Network } from "@coinbase/agentkit";

/**
 * The AgentKit MCP tools and tool handler
 */
interface AgentKitMcpTools {
  tools: Tool[];
  toolHandler: (name: string, args: unknown) => Promise<CallToolResult>;
}

/**
 * Configuration options for MCP tools
 */
interface McpToolsConfig {
  /**
   * Custom wallet provider instance
   */
  walletProvider?: WalletProvider;
  
  /**
   * Array of action providers to use
   */
  actionProviders?: ActionProvider[];
}

/**
 * Example custom wallet provider that returns unsigned transaction messages
 * This is a mock implementation - replace with your own wallet service integration
 */
export class UnsignedTransactionWalletProvider extends WalletProvider {
  private address: string;
  private network: Network;

  constructor(address: string, network: Network) {
    super();
    this.address = address;
    this.network = network;
  }

  getAddress(): string {
    return this.address;
  }

  getNetwork(): Network {
    return this.network;
  }

  getName(): string {
    return "unsigned-transaction-wallet";
  }

  async getBalance(): Promise<bigint> {
    // Return mock balance or call your wallet service
    return BigInt(1000000000000000000); // 1 ETH in wei
  }

  async nativeTransfer(to: string, value: string): Promise<string> {
    // Create unsigned transaction and return as base64
    // This is where you'd integrate with your wallet service
    const unsignedTx = {
      to,
      value,
      from: this.address,
      chainId: this.network.chainId,
    };
    
    // Convert to base64 unsigned message
    const base64Message = Buffer.from(JSON.stringify(unsignedTx)).toString('base64');
    
    // Return the base64 encoded unsigned transaction
    // In a real implementation, this would be properly formatted for your wallet service
    return `unsigned_tx:${base64Message}`;
  }
}

/**
 * Get Model Context Protocol (MCP) tools from an AgentKit instance or custom configuration
 *
 * @param configOrAgentKit - Either an AgentKit instance or configuration options
 * @returns An array of tools and a tool handler
 */
export async function getMcpTools(
  configOrAgentKit: AgentKit | McpToolsConfig
): Promise<AgentKitMcpTools> {
  let actions: Action[];

  if ('getActions' in configOrAgentKit) {
    // It's an AgentKit instance
    actions = configOrAgentKit.getActions();
  } else {
    // It's a configuration object - create AgentKit with custom wallet provider
    const { walletProvider, actionProviders } = configOrAgentKit;
    
    if (!walletProvider) {
      throw new Error("walletProvider is required when not providing an AgentKit instance");
    }

    const agentKit = await AgentKit.from({
      walletProvider,
      actionProviders,
    });
    
    actions = agentKit.getActions();
  }

  return {
    tools: actions.map(action => {
      return {
        name: action.name,
        description: action.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: zodToJsonSchema(action.schema as any),
      } as Tool;
    }),
    toolHandler: async (name: string, args: unknown) => {
      const action = actions.find(action => action.name === name);
      if (!action) {
        throw new Error(`Tool ${name} not found`);
      }

      const parsedArgs = action.schema.parse(args);

      const result = await action.invoke(parsedArgs);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    },
  };
}

/**
 * Get MCP tools from action providers directly (without wallet provider dependency)
 *
 * @param actionProviders - Array of action providers
 * @returns An array of tools and a tool handler
 */
export async function getMcpToolsFromProviders(
  actionProviders: ActionProvider[]
): Promise<AgentKitMcpTools> {
  const actions: Action[] = [];
  
  // Collect all actions from all providers
  for (const provider of actionProviders) {
    // For read-only providers that don't need wallet, we pass null
    // The provider should handle cases where no wallet is needed
    try {
      const providerActions = provider.getActions(null as any);
      actions.push(...providerActions);
    } catch (error) {
      // Some providers might need wallet, skip them for read-only mode
      console.warn(`Skipping provider ${provider.constructor.name}: ${error}`);
    }
  }

  return {
    tools: actions.map(action => {
      return {
        name: action.name,
        description: action.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputSchema: zodToJsonSchema(action.schema as any),
      } as Tool;
    }),
    toolHandler: async (name: string, args: unknown) => {
      const action = actions.find(action => action.name === name);
      if (!action) {
        throw new Error(`Tool ${name} not found`);
      }

      const parsedArgs = action.schema.parse(args);

      const result = await action.invoke(parsedArgs);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    },
  };
}
