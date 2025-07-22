#!/usr/bin/env node

/**
 * Integrated MCP Server starter for AgentKit
 * This file combines the functionality of start-server.js and mcp-start.sh
 * Provides a single entry point for running the AgentKit MCP Server
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const path = require("path");
const fs = require("fs");

// Import AgentKit functions - using require since this is a JS file
const { 
  defillamaActionProvider, 
  DexScreenerActionProvider,
  jupiterActionProvider,
  pumpfunActionProvider,
  SolanaKeypairWalletProvider
} = require("@coinbase/agentkit");
const { zodToJsonSchema } = require("zod-to-json-schema");

// Setup logging
const LOG_FILE = "/tmp/agentkit-mcp.log";

/**
 * Create a minimal wallet provider for unsigned transaction generation
 * This uses a dummy keypair just to satisfy the interface requirements
 */
function createDummyWalletProvider() {
  try {
    // Use a known valid test private key (base58 encoded)
    // This is a safe test key - never use for real funds!
    const testPrivateKeyBase58 = "5MaiiCavjCmn9Hs1o3eznqDEhRwxo7pXiAYez7keQUviUkauRiTMD8DrESdrNjN8zd9mTmVhRvBJeg5vhyvgrAhG";
    
    const walletProvider = new SolanaKeypairWalletProvider({
      keypair: testPrivateKeyBase58,
      rpcUrl: "https://api.mainnet-beta.solana.com",
      genesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" // Mainnet genesis hash
    });
    
    return walletProvider;
  } catch (error) {
    // If the dummy approach fails, return null and fall back to error messages
    log(`Failed to create dummy wallet provider: ${error.message}`, true);
    return null;
  }
}

/**
 * Enhanced logging function that writes to both stderr and log file
 */
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  // Always log to stderr for MCP protocol compatibility
  if (isError) {
    console.error(logMessage);
  } else {
    console.error(logMessage);
  }
  
  // Also log to file for debugging
  try {
    fs.appendFileSync(LOG_FILE, logMessage + "\n");
  } catch (err) {
    // Ignore file logging errors to not break the main functionality
  }
}

/**
 * Setup the working directory and environment
 */
function setupEnvironment() {
  // Change to the server directory (equivalent to what mcp-start.sh did)
  const serverDir = path.dirname(__filename);
  process.chdir(serverDir);
  
  // Set NODE_ENV if not already set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }
  
  log(`Working directory: ${process.cwd()}`);
  log(`NODE_ENV: ${process.env.NODE_ENV}`);
}

/**
 * Create and configure the MCP server with AgentKit actions
 */
async function createAgentKitMcpServer() {
  log("Starting AgentKit MCP Server...");
  
  // Create a dummy wallet provider for unsigned transaction generation
  const dummyWallet = createDummyWalletProvider();
  if (dummyWallet) {
    log(`Created dummy wallet provider for unsigned transaction generation: ${dummyWallet.getAddress()}`);
  }
  
  // Create action providers
  const providers = [
    defillamaActionProvider(),
    new DexScreenerActionProvider(),
    jupiterActionProvider(),
    pumpfunActionProvider(),
  ];
  
  log(`Created action providers: ${providers.map(p => p.constructor.name).join(", ")}`);
  
  // Collect actions from providers
  const actions = [];
  const walletRequiredProviders = [
    'JupiterActionProvider',
    'PumpfunActionProvider'
  ];
  
  for (const provider of providers) {
    try {
      // Pass dummy wallet to providers that need it
      const providerActions = provider.getActions(
        walletRequiredProviders.includes(provider.constructor.name) ? dummyWallet : null
      );
      const providerName = provider.constructor.name;
      
      // Process actions based on wallet requirements
      const processedActions = providerActions.map(action => {
        if (walletRequiredProviders.includes(providerName)) {
          if (!dummyWallet) {
            // Fallback to error message if dummy wallet creation failed
            const originalInvoke = action.invoke;
            action.invoke = async function(args) {
              return JSON.stringify({
                success: false,
                error: "Unable to create wallet provider for unsigned transaction generation",
                message: `Failed to initialize the required wallet provider to generate unsigned transactions for ${action.name}. This may be due to missing dependencies or configuration issues.`,
                actionType: "wallet_provider_initialization_failed",
                provider: providerName
              });
            };
          } else {
            // Wrap the action to automatically provide the dummy wallet
            const originalInvoke = action.invoke;
            action.invoke = async function(args) {
              try {
                const result = await originalInvoke.call(this, dummyWallet, args);
                
                // Add a note to the result that this is an unsigned transaction
                if (typeof result === 'string') {
                  try {
                    const parsedResult = JSON.parse(result);
                    if (parsedResult.success && parsedResult.unsignedTransaction) {
                      parsedResult.note = "This is an UNSIGNED transaction. You need to sign it with your actual wallet before broadcasting to the network.";
                      parsedResult.generatedByDummyWallet = true;
                      parsedResult.dummyWalletAddress = dummyWallet.getAddress();
                    }
                    return JSON.stringify(parsedResult);
                  } catch (e) {
                    // If not JSON, return as is
                    return result;
                  }
                }
                return result;
              } catch (error) {
                return JSON.stringify({
                  success: false,
                  error: error.message,
                  message: `Failed to generate unsigned transaction: ${error.message}`,
                  actionType: "unsigned_transaction_generation_failed",
                  provider: providerName
                });
              }
            };
          }
        }
        return action;
      });
      
      actions.push(...processedActions);
      log(`Added ${processedActions.length} actions from ${providerName} (${walletRequiredProviders.includes(providerName) ? (dummyWallet ? 'unsigned-tx-generation' : 'wallet-creation-failed') : 'direct'})`);
    } catch (error) {
      log(`Skipping provider ${provider.constructor.name}: ${error.message}`, true);
    }
  }
  
  log(`Total actions available: ${actions.length}`);
  
  // Create MCP tools from actions
  const tools = actions.map(action => {
    let inputSchema;
    try {
      // Convert Zod schema to JSON Schema
      inputSchema = action.schema ? zodToJsonSchema(action.schema) : {
        type: "object",
        properties: {},
        required: []
      };
    } catch (error) {
      log(`Failed to convert schema for ${action.name}: ${error.message}`, true);
      inputSchema = {
        type: "object",
        properties: {},
        required: []
      };
    }
    
    return {
      name: action.name,
      description: action.description,
      inputSchema
    };
  });
  
  log(`Available tools: ${tools.map(t => t.name).join(", ")}`);
  
  // Create MCP server
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

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log("Received ListTools request");
    return { tools };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      log(`Executing tool: ${request.params.name}`);
      const action = actions.find(action => action.name === request.params.name);
      
      if (!action) {
        throw new Error(`Tool ${request.params.name} not found`);
      }

      const result = await action.invoke(request.params.arguments || {});
      log(`Tool ${request.params.name} executed successfully`);

      return {
        content: [
          {
            type: "text",
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      log(`Tool ${request.params.name} failed: ${error.message}`, true);
      throw new Error(`Tool ${request.params.name} failed: ${error.message}`);
    }
  });

  return server;
}

/**
 * Main function to start the MCP server
 */
async function main() {
  try {
    // Setup environment (equivalent to mcp-start.sh functionality)
    setupEnvironment();
    
    // Create and start the server
    const server = await createAgentKitMcpServer();
    const transport = new StdioServerTransport();
    
    log("Connecting to transport...");
    await server.connect(transport);
    log("AgentKit MCP Server started successfully and ready to receive requests");
    
  } catch (error) {
    log(`Failed to start MCP Server: ${error.message}`, true);
    log(`Stack trace: ${error.stack}`, true);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  log("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  main();
}

module.exports = { main, createAgentKitMcpServer };