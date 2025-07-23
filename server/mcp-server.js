#!/usr/bin/env node

/**
 * Complete AgentKit MCP Server with ALL available Action Providers
 * Integrated MCP Server starter for AgentKit
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const path = require("path");
const fs = require("fs");

// Import AgentKit functions - using require since this is a JS file
const { 
  // Wallet providers
  SolanaKeypairWalletProvider,
  
  // Action providers that don't need wallet
  DefiLlamaActionProvider,
  defillamaActionProvider, 
  DexScreenerActionProvider,
  dexscreenerActionProvider,
  MessariActionProvider,
  messariActionProvider,
  PythActionProvider,
  pythActionProvider,
  AlloraActionProvider,
  alloraActionProvider,
  GoplusActionProvider,
  createGoplusActionProvider,
  SNSActionProvider,
  WalletActionProvider,
  walletActionProvider,
  WormholeActionProvider,
  
  // Action providers that need SvmWalletProvider
  JupiterActionProvider,
  jupiterActionProvider,
  PumpfunActionProvider,
  pumpfunActionProvider,
  MeteoraDLMMActionProvider,
  MagicEdenActionProvider,
  magicEdenActionProvider,
  SolanaNftActionProvider,
  solanaNftActionProvider,
  SplActionProvider,
  splActionProvider,
  
  // Action providers that need EvmWalletProvider
  X402ActionProvider,
  x402ActionProvider,
  OnrampActionProvider,
  onrampActionProvider
} = require("@coinbase/agentkit");
const { zodToJsonSchema } = require("zod-to-json-schema");

// Setup logging
const LOG_FILE = "/tmp/agentkit-mcp.log";

/**
 * Create a minimal wallet provider for unsigned transaction generation
 */
function createDummyWalletProvider() {
  try {
    const testPrivateKeyBase58 = "5MaiiCavjCmn9Hs1o3eznqDEhRwxo7pXiAYez7keQUviUkauRiTMD8DrESdrNjN8zd9mTmVhRvBJeg5vhyvgrAhG";
    
    const walletProvider = new SolanaKeypairWalletProvider({
      keypair: testPrivateKeyBase58,
      rpcUrl: "https://api.mainnet-beta.solana.com",
      genesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
    });
    
    return walletProvider;
  } catch (error) {
    log(`Failed to create dummy wallet provider: ${error.message}`, true);
    return null;
  }
}

/**
 * Enhanced logging function
 */
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  if (isError) {
    console.error(logMessage);
  } else {
    console.error(logMessage);
  }
  
  try {
    fs.appendFileSync(LOG_FILE, logMessage + "\n");
  } catch (err) {
    // Ignore file logging errors
  }
}

/**
 * Setup environment
 */
function setupEnvironment() {
  const serverDir = path.dirname(__filename);
  process.chdir(serverDir);
  
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
  }
  
  // Load .env file if it exists
  try {
    const envPath = path.join(serverDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      });
      log('Loaded environment variables from .env file');
    }
  } catch (error) {
    log(`Error loading .env file: ${error.message}`, true);
  }
  
  log(`Working directory: ${process.cwd()}`);
  log(`NODE_ENV: ${process.env.NODE_ENV}`);
}

/**
 * Create and configure the MCP server with ALL AgentKit actions
 */
async function createAgentKitMcpServer() {
  log("Starting Complete AgentKit MCP Server...");
  
  // Create dummy wallet provider
  const dummyWallet = createDummyWalletProvider();
  if (dummyWallet) {
    log(`Created dummy wallet provider: ${dummyWallet.getAddress()}`);
  }
  
  const providers = [];
  
  // Action providers that don't need wallet
  log("Loading wallet-independent action providers...");
  
  // DeFiLlama - market data
  try {
    providers.push(defillamaActionProvider());
    log("✓ Added DefiLlamaActionProvider");
  } catch (error) {
    log(`✗ Failed to add DefiLlamaActionProvider: ${error.message}`, true);
  }
  
  // DexScreener - DEX data
  try {
    providers.push(new DexScreenerActionProvider());
    log("✓ Added DexScreenerActionProvider");
  } catch (error) {
    log(`✗ Failed to add DexScreenerActionProvider: ${error.message}`, true);
  }
  
  // Messari - research data
  try {
    providers.push(messariActionProvider());
    log("✓ Added MessariActionProvider");
  } catch (error) {
    log(`✗ Failed to add MessariActionProvider: ${error.message}`, true);
  }
  
  // Pyth - price oracle
  try {
    providers.push(pythActionProvider());
    log("✓ Added PythActionProvider");
  } catch (error) {
    log(`✗ Failed to add PythActionProvider: ${error.message}`, true);
  }
  
  // Allora - AI inference network
  try {
    providers.push(alloraActionProvider());
    log("✓ Added AlloraActionProvider");
  } catch (error) {
    log(`✗ Failed to add AlloraActionProvider: ${error.message}`, true);
  }
  
  // GoPlus - security analysis
  try {
    providers.push(createGoplusActionProvider({
      enableLogging: true,
      timeout: 60000,
      maxRetries: 5,
      apiBaseUrl: "https://api.gopluslabs.io/api/v1"
    }));
    log("✓ Added GoplusActionProvider");
  } catch (error) {
    log(`✗ Failed to add GoplusActionProvider: ${error.message}`, true);
  }
  
  // SNS - Solana Name Service
  try {
    providers.push(new SNSActionProvider());
    log("✓ Added SNSActionProvider");
  } catch (error) {
    log(`✗ Failed to add SNSActionProvider: ${error.message}`, true);
  }
  
  // Wallet - wallet operations
  try {
    providers.push(walletActionProvider());
    log("✓ Added WalletActionProvider");
  } catch (error) {
    log(`✗ Failed to add WalletActionProvider: ${error.message}`, true);
  }
  
  // Wormhole - cross-chain bridge
  try {
    providers.push(new WormholeActionProvider());
    log("✓ Added WormholeActionProvider");
  } catch (error) {
    log(`✗ Failed to add WormholeActionProvider: ${error.message}`, true);
  }
  
  // SVM wallet-dependent providers
  log("Loading SVM wallet-dependent action providers...");
  
  // Jupiter - DEX aggregator
  try {
    providers.push(jupiterActionProvider());
    log("✓ Added JupiterActionProvider");
  } catch (error) {
    log(`✗ Failed to add JupiterActionProvider: ${error.message}`, true);
  }
  
  // Pumpfun - meme coin platform
  try {
    providers.push(pumpfunActionProvider());
    log("✓ Added PumpfunActionProvider");
  } catch (error) {
    log(`✗ Failed to add PumpfunActionProvider: ${error.message}`, true);
  }
  
  // Meteora - DLMM liquidity
  try {
    providers.push(new MeteoraDLMMActionProvider());
    log("✓ Added MeteoraDLMMActionProvider");
  } catch (error) {
    log(`✗ Failed to add MeteoraDLMMActionProvider: ${error.message}`, true);
  }
  
  // Magic Eden - NFT marketplace
  try {
    providers.push(magicEdenActionProvider());
    log("✓ Added MagicEdenActionProvider");
  } catch (error) {
    log(`✗ Failed to add MagicEdenActionProvider: ${error.message}`, true);
  }
  
  // Solana NFT operations
  try {
    providers.push(solanaNftActionProvider());
    log("✓ Added SolanaNftActionProvider");
  } catch (error) {
    log(`✗ Failed to add SolanaNftActionProvider: ${error.message}`, true);
  }
  
  // SPL Token operations
  try {
    providers.push(splActionProvider());
    log("✓ Added SplActionProvider");
  } catch (error) {
    log(`✗ Failed to add SplActionProvider: ${error.message}`, true);
  }
  
  // EVM wallet-dependent providers (optional)
  log("Loading EVM wallet-dependent action providers (limited functionality)...");
  
  // X402 - EVM actions
  try {
    providers.push(x402ActionProvider());
    log("✓ Added X402ActionProvider (limited without EVM wallet)");
  } catch (error) {
    log(`✗ Failed to add X402ActionProvider: ${error.message}`, true);
  }
  
  // Onramp - fiat on/off ramp
  try {
    // Skip onramp as it requires specific props
    log("⚠ Skipped OnrampActionProvider (requires specific configuration)");
  } catch (error) {
    log(`✗ Failed to add OnrampActionProvider: ${error.message}`, true);
  }
  
  log(`Total providers loaded: ${providers.length}`);
  log(`Provider names: ${providers.map(p => p.constructor.name).join(", ")}`);
  
  // Collect actions from all providers
  const actions = [];
  const svmWalletRequiredProviders = [
    'JupiterActionProvider',
    'PumpfunActionProvider', 
    'MeteoraDLMMActionProvider',
    'MagicEdenActionProvider',
    'SolanaNftActionProvider',
    'SplActionProvider'
  ];
  
  for (const provider of providers) {
    try {
      const providerName = provider.constructor.name;
      const needsWallet = svmWalletRequiredProviders.includes(providerName);
      
      const providerActions = provider.getActions(needsWallet ? dummyWallet : null);
      
      // Process actions based on wallet requirements
      const processedActions = providerActions.map(action => {
        if (needsWallet) {
          if (!dummyWallet) {
            const originalInvoke = action.invoke;
            action.invoke = async function(args) {
              return JSON.stringify({
                success: false,
                error: "Wallet provider not available",
                message: `Failed to initialize wallet provider for ${action.name}`,
                actionType: "wallet_provider_unavailable",
                provider: providerName
              });
            };
          } else {
            const originalInvoke = action.invoke;
            action.invoke = async function(args) {
              try {
                const result = await originalInvoke.call(this, dummyWallet, args);
                
                if (typeof result === 'string') {
                  try {
                    const parsedResult = JSON.parse(result);
                    if (parsedResult.success && parsedResult.unsignedTransaction) {
                      parsedResult.note = "UNSIGNED transaction - sign with your wallet before broadcasting";
                      parsedResult.generatedByDummyWallet = true;
                      parsedResult.dummyWalletAddress = dummyWallet.getAddress();
                    }
                    return JSON.stringify(parsedResult);
                  } catch (e) {
                    return result;
                  }
                }
                return result;
              } catch (error) {
                return JSON.stringify({
                  success: false,
                  error: error.message,
                  message: `Transaction generation failed: ${error.message}`,
                  actionType: "transaction_generation_failed",
                  provider: providerName
                });
              }
            };
          }
        }
        return action;
      });
      
      actions.push(...processedActions);
      log(`✓ Added ${processedActions.length} actions from ${providerName} ${needsWallet ? '(with dummy wallet)' : '(direct)'}`);
    } catch (error) {
      log(`✗ Failed to get actions from ${provider.constructor.name}: ${error.message}`, true);
    }
  }
  
  log(`Total actions available: ${actions.length}`);
  
  // Create MCP tools from actions
  const tools = actions.map(action => {
    let inputSchema;
    try {
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
      name: "agentkit-complete",
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
      
      // 特殊处理 GoPlus actions - 添加详细调试
      if (request.params.name.startsWith('GoplusActionProvider_')) {
        log(`[GoPlus Debug] Tool: ${request.params.name}`);
        log(`[GoPlus Debug] Arguments: ${JSON.stringify(request.params.arguments)}`);
        
        // 特别检查代币地址
        if (request.params.arguments && request.params.arguments.tokenAddress) {
          const addr = request.params.arguments.tokenAddress;
          log(`[GoPlus Debug] Token address: ${addr} (length: ${addr.length})`);
          
          // 验证 Solana 地址格式
          const isValidFormat = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
          log(`[GoPlus Debug] Address format valid: ${isValidFormat}`);
        }
      }
      
      const action = actions.find(action => action.name === request.params.name);
      
      if (!action) {
        throw new Error(`Tool ${request.params.name} not found`);
      }

      const result = await action.invoke(request.params.arguments || {});
      
      // 特殊处理 GoPlus 结果
      if (request.params.name.startsWith('GoplusActionProvider_')) {
        const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
        log(`[GoPlus Debug] Raw result length: ${resultStr.length}`);
        log(`[GoPlus Debug] Raw result preview: ${resultStr.substring(0, 200)}...`);
        
        // 尝试解析结果检查是否有错误
        try {
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          if (parsed.success === false) {
            log(`[GoPlus Debug] API returned failure: ${parsed.error}`, true);
          } else if (parsed.success === true) {
            log(`[GoPlus Debug] API returned success with data`);
          }
        } catch (parseError) {
          log(`[GoPlus Debug] Failed to parse result: ${parseError.message}`, true);
        }
      }
      
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
      
      // 特殊处理 GoPlus 错误
      if (request.params.name.startsWith('GoplusActionProvider_')) {
        log(`[GoPlus Debug] Error type: ${error.constructor.name}`, true);
        log(`[GoPlus Debug] Error stack: ${error.stack}`, true);
        
        // 检查常见错误类型
        if (error.message.includes('fetch')) {
          log(`[GoPlus Debug] Network error detected`, true);
        } else if (error.message.includes('timeout')) {
          log(`[GoPlus Debug] Timeout error detected`, true);
        } else if (error.message.includes('JSON')) {
          log(`[GoPlus Debug] JSON parsing error detected`, true);
        }
      }
      
      throw new Error(`Tool ${request.params.name} failed: ${error.message}`);
    }
  });

  return server;
}

/**
 * Main function
 */
async function main() {
  try {
    setupEnvironment();
    
    const server = await createAgentKitMcpServer();
    const transport = new StdioServerTransport();
    
    log("Connecting to transport...");
    await server.connect(transport);
    log("Complete AgentKit MCP Server started successfully and ready to receive requests");
    
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

// Start the server
if (require.main === module) {
  main();
}

module.exports = { main, createAgentKitMcpServer };
