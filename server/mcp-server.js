#!/usr/bin/env node

/**
 * Complete AgentKit MCP Server with ALL available Action Providers
 * HTTP Streaming MCP Server for AgentKit
 */

const express = require("express");
const cors = require("cors");
const { randomUUID } = require("node:crypto");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { isInitializeRequest } = require("@modelcontextprotocol/sdk/types.js");
const path = require("path");
const fs = require("fs");

// Import AgentKit functions - using require since this is a JS file
const { 
  // Wallet providers
  SolanaKeypairWalletProvider,
  
  // Action providers that don't need wallet
  defillamaActionProvider, 
  DexScreenerActionProvider,
  dexscreenerActionProvider,
  messariActionProvider,
  pythActionProvider,
  alloraActionProvider,
  createGoplusActionProvider,
  SNSActionProvider,
  walletActionProvider,
  WormholeActionProvider,
  
  // Action providers that need SvmWalletProvider
  jupiterActionProvider,
  pumpfunActionProvider,
  MeteoraDLMMActionProvider,
  magicEdenActionProvider,
  solanaNftActionProvider,
  splActionProvider,
  
  // Action providers that need EvmWalletProvider
  x402ActionProvider,
  onrampActionProvider
} = require("@coinbase/agentkit");
const { zodToJsonSchema } = require("zod-to-json-schema");

/**
 * Safely stringify objects that might contain circular references
 */
function safeJsonStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, val) => {
    if (val != null && typeof val === "object") {
      if (seen.has(val)) {
        return "[Circular]";
      }
      seen.add(val);
    }
    return val;
  });
}

/**
 * Simple readonly SVM wallet provider for generating unsigned transactions
 */
class ReadonlySvmWalletProvider {
  constructor({ publicKey, rpcUrl, genesisHash }) {
    const { PublicKey, Connection } = require("@solana/web3.js");
    
    this.publicKey = new PublicKey(publicKey);
    this.connection = new Connection(rpcUrl || "https://api.mainnet-beta.solana.com");
    this.genesisHash = genesisHash || "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
  }

  getConnection() {
    return this.connection;
  }

  getPublicKey() {
    return this.publicKey;
  }

  getAddress() {
    return this.publicKey.toBase58();
  }

  getNetwork() {
    return {
      protocolFamily: "svm",
      chainId: this.genesisHash,
      networkId: "solana-mainnet"
    };
  }

  getName() {
    return "readonly_svm_wallet_provider";
  }

  async getBalance() {
    const lamports = await this.connection.getBalance(this.publicKey);
    return BigInt(lamports);
  }

  // All signing/sending methods throw errors
  async signTransaction() {
    throw new Error("ReadonlySvmWalletProvider cannot sign transactions");
  }

  async sendTransaction() {
    throw new Error("ReadonlySvmWalletProvider cannot send transactions");
  }

  async signAndSendTransaction() {
    throw new Error("ReadonlySvmWalletProvider cannot sign nor send transactions");
  }

  async nativeTransfer() {
    throw new Error("ReadonlySvmWalletProvider cannot perform native transfers");
  }

  async getSignatureStatus() {
    throw new Error("ReadonlySvmWalletProvider cannot query signature status");
  }

  async waitForSignatureResult() {
    throw new Error("ReadonlySvmWalletProvider cannot wait for signature result");
  }
}

// Setup logging
const LOG_FILE = "/tmp/agentkit-mcp-http.log";

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
 * Create a minimal wallet provider for unsigned transaction generation
 */
function createDummyWalletProvider() {
  try {
    log(`Environment check: DUMMY_WALLET_PUBLIC_KEY = ${process.env.DUMMY_WALLET_PUBLIC_KEY}`);
    log(`Environment check: DUMMY_WALLET_PRIVATE_KEY = ${process.env.DUMMY_WALLET_PRIVATE_KEY ? 'set' : 'not set'}`);
    
    const rpcUrl = "https://api.mainnet-beta.solana.com";
    const genesisHash = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

    // --- 优先使用只需公钥的只读钱包 ---
    if (process.env.DUMMY_WALLET_PUBLIC_KEY) {
      log(`Creating ReadonlySvmWalletProvider with publicKey: ${process.env.DUMMY_WALLET_PUBLIC_KEY}`);
      const walletProvider = new ReadonlySvmWalletProvider({
        publicKey: process.env.DUMMY_WALLET_PUBLIC_KEY,
        rpcUrl,
        genesisHash,
      });
      log(`ReadonlySvmWalletProvider created successfully: ${walletProvider.getAddress()}`);
      return walletProvider;
    }

    // --- 否则回退到需要私钥的 Keypair 钱包 ---
    const testPrivateKeyBase58 =
      process.env.DUMMY_WALLET_PRIVATE_KEY ||
      "5MaiiCavjCmn9Hs1o3eznqDEhRwxo7pXiAYez7keQUviUkauRiTMD8DrESdrNjN8zd9mTmVhRvBJeg5vhyvgrAhG";

    const walletProvider = new SolanaKeypairWalletProvider({
      keypair: testPrivateKeyBase58,
      rpcUrl,
      genesisHash,
    });
    return walletProvider;
  } catch (error) {
    log(`Failed to create dummy wallet provider: ${error.message}`, true);
    return null;
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
 * Create AgentKit MCP Server instance
 */
function createAgentKitServer() {
  log("Creating AgentKit MCP Server...");
  
  // Create dummy wallet provider
  const dummyWallet = createDummyWalletProvider();
  if (dummyWallet) {
    log(`Created dummy wallet provider: ${dummyWallet.getAddress()}`);
  }
  
  const server = new McpServer(
    {
      name: "agentkit-complete-http",
      version: "0.2.0",
    },
    {
      // Enable notification debouncing for better performance
      debouncedNotificationMethods: [
        'notifications/tools/list_changed',
        'notifications/resources/list_changed',
        'notifications/prompts/list_changed'
      ]
    }
  );

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
  
  log(`Total providers loaded: ${providers.length}`);
  log(`Provider names: ${providers.map(p => p.constructor.name).join(", ")}`);
  
  // Collect actions from all providers
  const svmWalletRequiredProviders = [
    'JupiterActionProvider',
    'PumpfunActionProvider', 
    'MeteoraDLMMActionProvider',
    'MagicEdenActionProvider',
    'SolanaNftActionProvider',
    'SplActionProvider',
    'WalletActionProvider'
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
                const result = await originalInvoke.call(this, args);
                
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
      
      // Register tools with the MCP server
      for (const action of processedActions) {
        try {
          let inputSchema;
          try {
            inputSchema = action.schema ? zodToJsonSchema(action.schema) : {};
          } catch (error) {
            log(`Failed to convert schema for ${action.name}: ${error.message}`, true);
            inputSchema = {};
          }
          
          server.registerTool(
            action.name,
            {
              title: action.name,
              description: action.description,
              inputSchema: inputSchema
            },
            async (args) => {
              try {
                log(`Executing tool: ${action.name}`);
                
                // 特殊处理 GoPlus actions - 添加详细调试
                if (action.name.startsWith('GoplusActionProvider_')) {
                  log(`[GoPlus Debug] Tool: ${action.name}`);
                  log(`[GoPlus Debug] Arguments: ${JSON.stringify(args)}`);
                  
                  // 特别检查代币地址
                  if (args && args.tokenAddress) {
                    const addr = args.tokenAddress;
                    log(`[GoPlus Debug] Token address: ${addr} (length: ${addr.length})`);
                    
                    // 验证 Solana 地址格式
                    const isValidFormat = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
                    log(`[GoPlus Debug] Address format valid: ${isValidFormat}`);
                  }
                }
                
                const result = await action.invoke(args || {});
                
                // 特殊处理 GoPlus 结果
                if (action.name.startsWith('GoplusActionProvider_')) {
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
                
                log(`Tool ${action.name} executed successfully`);

                return {
                  content: [
                    {
                      type: "text",
                      text: typeof result === 'string' ? result : safeJsonStringify(result),
                    },
                  ],
                };
              } catch (error) {
                log(`Tool ${action.name} failed: ${error.message}`, true);
                
                if (action.name.startsWith('GoplusActionProvider_')) {
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
                
                throw new Error(`Tool ${action.name} failed: ${error.message}`);
              }
            }
          );
        } catch (error) {
          log(`Failed to register tool ${action.name}: ${error.message}`, true);
        }
      }
      
      log(`✓ Added ${processedActions.length} tools from ${providerName} ${needsWallet ? '(with dummy wallet)' : '(direct)'}`);
    } catch (error) {
      log(`✗ Failed to get actions from ${provider.constructor.name}: ${error.message}`, true);
    }
  }
  
  return server;
}

/**
 * Create and configure the HTTP streaming MCP server
 */
async function createHttpMcpServer() {
  setupEnvironment();
  
  const app = express();
  
  // Configure CORS for browser clients
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id'],
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));
  
  // Map to store transports by session ID
  const transports = {};
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      server: 'agentkit-complete-http',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      sessions: Object.keys(transports).length
    });
  });
  
  // Handle POST requests for client-to-server communication
  app.post('/mcp', async (req, res) => {
    try {
      log(`Received POST /mcp request`);
      
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'];
      let transport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
        log(`Reusing existing session: ${sessionId}`);
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        log(`Creating new session for initialize request`);
        
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID
            transports[sessionId] = transport;
            log(`Session initialized: ${sessionId}`);
          },
          // Enable DNS rebinding protection for security
          enableDnsRebindingProtection: false, // Set to true in production
          // allowedHosts: ['127.0.0.1', 'localhost'],
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            log(`Session closed: ${transport.sessionId}`);
            delete transports[transport.sessionId];
          }
        };
        
        // Create AgentKit server and connect
        const mcpServer = createAgentKitServer();
        await mcpServer.connect(transport);
        
        log(`Connected MCP server to transport`);
      } else {
        // Invalid request
        log(`Invalid request: No valid session ID provided`, true);
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      // Handle the request via transport
      await transport.handleRequest(req, res, req.body);
      
    } catch (error) {
      log(`Error handling POST /mcp request: ${error.message}`, true);
      
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Reusable handler for GET and DELETE requests
  const handleSessionRequest = async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'];
      
      if (!sessionId || !transports[sessionId]) {
        log(`Invalid session request: sessionId=${sessionId}`, true);
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Invalid or missing session ID',
          },
          id: null,
        });
        return;
      }
      
      const transport = transports[sessionId];
      log(`Handling session request for: ${sessionId}`);
      await transport.handleRequest(req, res);
      
    } catch (error) {
      log(`Error handling session request: ${error.message}`, true);
      
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  };

  // Handle GET requests for server-to-client notifications via SSE
  app.get('/mcp', handleSessionRequest);

  // Handle DELETE requests for session termination
  app.delete('/mcp', handleSessionRequest);
  
  // Graceful shutdown handling
  const gracefulShutdown = () => {
    log("Gracefully shutting down HTTP MCP Server...");
    
    // Close all active transports
    Object.keys(transports).forEach(sessionId => {
      try {
        const transport = transports[sessionId];
        if (transport && typeof transport.close === 'function') {
          transport.close();
        }
        delete transports[sessionId];
      } catch (error) {
        log(`Error closing transport ${sessionId}: ${error.message}`, true);
      }
    });
    
    process.exit(0);
  };
  
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  return app;
}

/**
 * Main function
 */
async function main() {
  try {
    const app = await createHttpMcpServer();
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';
    
    app.listen(PORT, HOST, () => {
      log(`Complete AgentKit HTTP Streaming MCP Server listening on ${HOST}:${PORT}`);
      log(`Health check: http://${HOST}:${PORT}/health`);
      log(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
      log("Server ready to receive requests");
    });
    
  } catch (error) {
    log(`Failed to start HTTP MCP Server: ${error.message}`, true);
    log(`Stack trace: ${error.stack}`, true);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  main();
}

module.exports = { main, createHttpMcpServer };
