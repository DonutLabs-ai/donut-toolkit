#!/usr/bin/env node

/**
 * Simple test script to verify AgentKit Action Providers work
 */

console.log("Testing AgentKit Action Providers...");

const agentkit = require("@coinbase/agentkit");

console.log("Available exports count:", Object.keys(agentkit).length);

// Test DefiLlama
try {
  const { defillamaActionProvider } = agentkit;
  console.log("✓ defillamaActionProvider found:", typeof defillamaActionProvider);
  
  const provider = defillamaActionProvider();
  console.log("✓ DefiLlama provider created:", provider.constructor.name);
  
  const actions = provider.getActions(null);
  console.log("✓ DefiLlama actions count:", actions.length);
  
  if (actions.length > 0) {
    console.log("✓ Sample action:", actions[0].name, "- Description:", actions[0].description.substring(0, 50) + "...");
  }
} catch (error) {
  console.log("✗ DefiLlama test failed:", error.message);
}

// Test DexScreener
try {
  const { DexScreenerActionProvider } = agentkit;
  console.log("✓ DexScreenerActionProvider found:", typeof DexScreenerActionProvider);
  
  const provider = new DexScreenerActionProvider();
  console.log("✓ DexScreener provider created:", provider.constructor.name);
  
  const actions = provider.getActions(null);
  console.log("✓ DexScreener actions count:", actions.length);
  
  if (actions.length > 0) {
    console.log("✓ Sample action:", actions[0].name, "- Description:", actions[0].description.substring(0, 50) + "...");
  }
} catch (error) {
  console.log("✗ DexScreener test failed:", error.message);
}


// Test Messari
try {
  const { MessariActionProvider } = agentkit;
  console.log("✓ MessariActionProvider found:", typeof MessariActionProvider);
  
  const provider = new MessariActionProvider();
  console.log("✓ Messari provider created:", provider.constructor.name);
  
  const actions = provider.getActions(null);
  console.log("✓ Messari actions count:", actions.length);
  
  if (actions.length > 0) {
    console.log("✓ Sample action:", actions[0].name, "- Description:", actions[0].description.substring(0, 50) + "...");
  }
} catch (error) {
  console.log("✗ Messari test failed:", error.message);
}

console.log("\nTest completed!");