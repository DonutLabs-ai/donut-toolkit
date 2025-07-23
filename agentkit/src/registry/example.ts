/**
 * Example usage of the Registry System
 * This demonstrates the complete workflow from building registry to Pinecone sync
 */

import "reflect-metadata";

import { 
  RegistryManager, 
  RegistryManagerConfig,
  RegistryBuilder,
  CatalogGenerator,
  RegistryVectorSearchService
} from "./index";

// Example ActionProvider classes (these would be your actual providers)
import { DefiLlamaActionProvider } from "../action-providers/defillama/defillamaActionProvider";
import { JupiterActionProvider } from "../action-providers/jupiter/jupiterActionProvider";

/**
 * Complete registry workflow example
 */
async function registryWorkflowExample() {
  console.log("🚀 Starting Registry System Example");

  // Step 1: Configure Registry Manager
  const config: RegistryManagerConfig = {
    registryConfig: {
      version: "1.0.0",
      // Custom category mappings
      providerCategoryMappings: {
        "defillama": "Data",
        "jupiter": "DEX"
      },
      actionCategoryMappings: {
        "DefiLlamaActionProvider_find_protocol": "Query",
        "JupiterActionProvider_swap": "Swap"
      },
      // Custom provider descriptions
      providerDescriptions: {
        "defillama": "DeFiLlama provides comprehensive DeFi protocol data and analytics",
        "jupiter": "Jupiter is the key liquidity aggregator for Solana"
      },
      // Custom tags
      providerTags: {
        "defillama": ["defi", "analytics", "tvl", "protocols"],
        "jupiter": ["solana", "swap", "dex", "liquidity"]
      }
    },
    vectorSearchConfig: {
      apiKey: process.env.PINECONE_API_KEY,
      indexName: process.env.PINECONE_INDEX_NAME || "agentkit-registry",
      namespace: process.env.PINECONE_NAMESPACE || "actions",
      embeddingModel: "multilingual-e5-large",
      embeddingDimension: 1024,
      batchSize: 50
    },
    syncToPinecone: true,
    clearBeforeSync: false,
    verbose: true
  };

  const registryManager = new RegistryManager(config);

  try {
    // Step 2: Create ActionProvider instances
    console.log("📦 Creating ActionProvider instances...");
    const providers = [
      new DefiLlamaActionProvider(),
      new JupiterActionProvider()
    ];

    // Step 3: Build Registry and Sync to Pinecone
    console.log("🔨 Building registry from providers...");
    const result = await registryManager.buildRegistry(providers);

    console.log("✅ Registry build completed!");
    console.log(`📊 Statistics:`);
    console.log(`   - Providers processed: ${result.stats.providersProcessed}`);
    console.log(`   - Actions extracted: ${result.stats.actionsExtracted}`);
    console.log(`   - Build time: ${result.stats.buildTimeMs}ms`);
    console.log(`   - Synced to Pinecone: ${result.stats.syncedToPinecone}`);
    if (result.stats.syncTimeMs) {
      console.log(`   - Sync time: ${result.stats.syncTimeMs}ms`);
    }

    // Step 4: Test Search Functionality
    console.log("\n🔍 Testing search functionality...");
    
    const searchResults = await registryManager.searchActions({
      query: "get token prices and protocol information",
      topK: 5,
      filters: {
        categories: ["Data", "Query"]
      }
    });

    console.log(`Found ${searchResults.length} relevant actions:`);
    searchResults.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.actionName} (${result.providerName})`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Category: ${result.category}`);
      console.log(`   Score: ${result.score.toFixed(3)}`);
      console.log(`   Requires Wallet: ${result.requiresWallet}`);
      console.log("");
    });

    // Step 5: Test Local Search (for comparison)
    console.log("🏠 Testing local search...");
    const localResults = registryManager.searchToolsLocally("swap tokens", 3);
    console.log(`Local search found ${localResults.length} tools:`);
    localResults.forEach((tool, idx) => {
      console.log(`${idx + 1}. ${tool.name} - ${tool.description}`);
    });

    // Step 6: Get Registry Statistics
    console.log("\n📈 Registry Statistics:");
    const stats = registryManager.getRegistryStats();
    console.log(`   - Total Providers: ${stats.totalProviders}`);
    console.log(`   - Total Actions: ${stats.totalActions}`);
    console.log(`   - Categories: ${stats.categoriesList.join(", ")}`);
    console.log(`   - Wallet Required Actions: ${stats.walletRequiredActions}`);
    console.log(`   - Expensive Actions: ${stats.expensiveActions}`);

    // Step 7: Health Check
    console.log("\n🏥 Health Check:");
    const health = await registryManager.getSearchServiceHealth();
    console.log(`   - Status: ${health.status}`);
    if (health.status === "healthy") {
      console.log(`   - Index: ${health.details.indexName}`);
      console.log(`   - Namespace: ${health.details.namespace}`);
      console.log(`   - Embedding Model: ${health.details.embeddingModel}`);
    }

    // Step 8: Export Catalog
    console.log("\n📄 Exporting catalog...");
    const catalogJson = registryManager.exportCatalogAsJson();
    console.log(`Catalog exported (${catalogJson.length} characters)`);

    console.log("\n🎉 Registry workflow completed successfully!");

  } catch (error) {
    console.error("❌ Registry workflow failed:", error);
    throw error;
  }
}

/**
 * Step-by-step component testing
 */
async function componentTestExample() {
  console.log("🧪 Testing Individual Components");

  try {
    // Test 1: Registry Builder
    console.log("\n1️⃣ Testing RegistryBuilder...");
    const registryBuilder = new RegistryBuilder({
      version: "test-1.0.0",
      providerCategoryMappings: {
        "defillama": "Data"
      }
    });

    const providers = [new DefiLlamaActionProvider()];
    const registry = await registryBuilder.buildFromProviders(providers);
    
    console.log(`✅ Registry built with ${registry.metadata.actionCount} actions`);

    // Test 2: Catalog Generator
    console.log("\n2️⃣ Testing CatalogGenerator...");
    const catalogGenerator = new CatalogGenerator();
    const catalog = catalogGenerator.generateCatalog(registry);
    
    console.log(`✅ Catalog generated with ${catalog.metadata.totalTools} tools`);
    
    // Show sample embedding text
    const firstTool = catalog.tools.values().next().value;
    if (firstTool) {
      console.log(`📝 Sample embedding text: "${firstTool.embeddingText}"`);
    }

    // Test 3: Vector Search Service (if Pinecone configured)
    if (process.env.PINECONE_API_KEY) {
      console.log("\n3️⃣ Testing RegistryVectorSearchService...");
      const vectorService = new RegistryVectorSearchService({
        apiKey: process.env.PINECONE_API_KEY,
        indexName: "agentkit-registry-test",
        namespace: "test-actions"
      });

      await vectorService.initialize();
      console.log("✅ Vector service initialized");

      // Test embedding generation
      const embedding = await vectorService.generateEmbedding("test query");
      console.log(`📊 Generated embedding with ${embedding.length} dimensions`);

      // Test health check
      const health = await vectorService.healthCheck();
      console.log(`🏥 Vector service health: ${health.status}`);
    } else {
      console.log("⚠️ Skipping vector service test (PINECONE_API_KEY not set)");
    }

    console.log("\n🎉 Component testing completed!");

  } catch (error) {
    console.error("❌ Component testing failed:", error);
    throw error;
  }
}

/**
 * Run examples
 */
async function main() {
  try {
    // Run component tests first
    await componentTestExample();
    
    // Run full workflow if Pinecone is configured
    if (process.env.PINECONE_API_KEY) {
      console.log("\n" + "=".repeat(60));
      await registryWorkflowExample();
    } else {
      console.log("\n⚠️ Skipping full workflow (PINECONE_API_KEY not set)");
      console.log("Set PINECONE_API_KEY to test the complete workflow");
    }
  } catch (error) {
    console.error("❌ Example failed:", error);
    process.exit(1);
  }
}

// Export functions for use in other contexts
export {
  registryWorkflowExample,
  componentTestExample
};

// Run if executed directly
if (require.main === module) {
  main();
}