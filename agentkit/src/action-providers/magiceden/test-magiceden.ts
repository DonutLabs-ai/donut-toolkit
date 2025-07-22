import { MagicEdenActionProvider } from "./magicEdenActionProvider";

/**
 * Simple test script to verify Magic Eden API integration
 */
async function testMagicEdenIntegration() {
  console.log("🚀 Testing Magic Eden integration...\n");

  // Test 1: Create provider instance
  console.log("📦 Creating Magic Eden provider...");
  const magicEdenProvider = new MagicEdenActionProvider();
  console.log("✅ Magic Eden provider created successfully\n");

  // Test 2: Test network support
  console.log("🌐 Testing network support...");
  const solanaMainnet = {
    protocolFamily: "svm",
    networkId: "solana-mainnet",
    chainId: undefined,
  };

  const isSupported = magicEdenProvider.supportsNetwork(solanaMainnet as any);
  console.log(`Network support: ${isSupported ? "✅ Supported" : "❌ Not supported"}\n`);

  // Test 3: Get actions
  console.log("⚡ Getting available actions...");
  const actions = magicEdenProvider.getActions({} as any);
  console.log(`Available actions: ${actions.length}`);
  actions.forEach((action, index) => {
    console.log(
      `  ${index + 1}. ${action.name}: ${action.description.split("\n")[1]?.trim() || "No description"}`,
    );
  });

  console.log("\n🎉 Magic Eden integration test completed!");
  console.log("\n💡 To use Magic Eden actions:");
  console.log("1. Set MAGIC_EDEN_API_KEY environment variable (optional)");
  console.log("2. Add magicEdenActionProvider() to your AgentKit configuration");
  console.log("3. Use the actions: get_nft_listings, buy_nft_listing, get_nft_info");
}

// Run the test
if (require.main === module) {
  testMagicEdenIntegration().catch(console.error);
}

export { testMagicEdenIntegration };
