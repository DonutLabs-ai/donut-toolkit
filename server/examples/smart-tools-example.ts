/**
 * Example usage of Smart MCP Tools
 * 
 * This demonstrates how to use the intelligent tool search and execution
 * capabilities with AgentKit.
 */

import { AgentKit } from "@coinbase/agentkit";
import { 
  initializeSmartMcpTools, 
  getMcpToolsWithSearch,
  QuickStart,
  ConfigHelpers 
} from "../src/search/index.js";

// Example configuration
const vectorConfig = ConfigHelpers.development();

async function basicExample() {
  console.log("🔧 Smart MCP Tools - Basic Example");
  
  // Note: This would need a real AgentKit instance
  // const agentKit = await AgentKit.from({ ... });
  
  // Example 1: Quick start initialization
  // const smartTools = await QuickStart.initialize(agentKit);
  
  // Example 2: Custom configuration
  // const smartTools = await QuickStart.initializeWithConfig(agentKit, vectorConfig);
  
  // Example 3: Manual initialization
  // const smartTools = await getMcpToolsWithSearch({
  //   agentKit,
  //   vectorConfig,
  //   autoInitialize: false,
  // });
  // await smartTools.smartToolManager.initialize(agentKit);
  
  console.log("📋 Available MCP Tools:");
  console.log("1. search_tools - Search for relevant tools based on natural language");
  console.log("2. execute_tool - Execute a specific tool by its ID");
  
  console.log("✅ Example completed!");
}

async function searchExample() {
  console.log("🔍 Search Tools Example");
  
  // Example search request
  const searchRequest = {
    query: "swap tokens on Solana",
    topK: 3,
    filters: {
      networks: ["solana"],
      requiresWallet: true,
    }
  };
  
  console.log("📋 Search Request:", JSON.stringify(searchRequest, null, 2));
  
  // Example search response structure
  const exampleResponse = {
    query: "swap tokens on Solana",
    filters: { networks: ["solana"], requiresWallet: true },
    results: [
      {
        actionId: "uuid-1",
        actionName: "JupiterActionProvider_swap",
        providerName: "jupiter",
        description: "Creates an unsigned swap transaction using Jupiter's DEX aggregator",
        parameters: [
          { name: "inputToken", type: "string", required: true, description: "Input token mint address" },
          { name: "outputToken", type: "string", required: true, description: "Output token mint address" },
          { name: "amount", type: "string", required: true, description: "Amount to swap" }
        ],
        requiresWallet: true,
        score: 0.95
      }
    ],
    totalResults: 1,
    timestamp: new Date().toISOString()
  };
  
  console.log("📊 Example Response:", JSON.stringify(exampleResponse, null, 2));
}

async function executeExample() {
  console.log("⚡ Execute Tool Example");
  
  // Example execution request
  const executeRequest = {
    actionId: "uuid-1",
    parameters: {
      inputToken: "So11111111111111111111111111111111111111112", // SOL
      outputToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      amount: "1.0"
    }
  };
  
  console.log("📋 Execute Request:", JSON.stringify(executeRequest, null, 2));
  
  // Example execution response structure
  const exampleResponse = {
    actionId: "uuid-1",
    parameters: executeRequest.parameters,
    success: true,
    result: "{\\"transaction\\": \\"base64-encoded-transaction\\", \\"message\\": \\"Swap created successfully\\"}",
    timestamp: new Date().toISOString()
  };
  
  console.log("📊 Example Response:", JSON.stringify(exampleResponse, null, 2));
}

async function configurationExample() {
  console.log("⚙️ Configuration Example");
  
  // Environment configuration
  const envConfig = ConfigHelpers.fromEnvironment();
  console.log("🌍 Environment Config:", envConfig);
  
  // Production configuration
  const prodConfig = ConfigHelpers.production();
  console.log("🏭 Production Config:", prodConfig);
  
  // Development configuration
  const devConfig = ConfigHelpers.development();
  console.log("🔧 Development Config:", devConfig);
  
  // Custom configuration
  const customConfig = {
    indexName: "my-custom-index",
    namespace: "production",
    embeddingModel: "multilingual-e5-large",
    embeddingDimension: 1024,
  };
  console.log("🎨 Custom Config:", customConfig);
}

async function runAllExamples() {
  console.log("🚀 Smart MCP Tools Examples\n");
  
  await basicExample();
  console.log("\n" + "=".repeat(50) + "\n");
  
  await searchExample();
  console.log("\n" + "=".repeat(50) + "\n");
  
  await executeExample();
  console.log("\n" + "=".repeat(50) + "\n");
  
  await configurationExample();
  
  console.log("\n✅ All examples completed!");
  console.log("\n📚 Next Steps:");
  console.log("1. Set up Pinecone credentials (PINECONE_API_KEY)");
  console.log("2. Create an AgentKit instance with your wallet providers");
  console.log("3. Initialize smart tools with your configuration");
  console.log("4. Use search_tools and execute_tool in your MCP server");
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  basicExample,
  searchExample,
  executeExample,
  configurationExample,
  runAllExamples,
};