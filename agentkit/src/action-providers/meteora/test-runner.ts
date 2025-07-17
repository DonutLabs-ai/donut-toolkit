#!/usr/bin/env ts-node

/**
 * Test runner for Meteora DLMM Action Provider
 * This script can be used to test the integration with real API calls
 */

import "reflect-metadata";

import { MeteoraDLMMActionProvider } from "./meteoraActionProvider";
import { PublicKey, Connection } from "@solana/web3.js";

// Configuration
const TEST_PUBLIC_KEY = "FtFZzg62oz93YxWe3FNCtFF5Le12bvCfepYg7RNcZLgp";
const TEST_CONNECTION = new Connection("https://api.mainnet-beta.solana.com");

// Real token addresses
const REAL_TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
};

// Mock pool addresses
const TEST_POOL_ADDRESSES = {
  SOL_USDC: "ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq",
  USDC_USDT: "2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv",
  SOL_RAY: "61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht",
};

// Mock wallet provider
const mockWalletProvider = {
  getConnection: () => TEST_CONNECTION,
  getPublicKey: () => new PublicKey(TEST_PUBLIC_KEY),
  getAddress: () => TEST_PUBLIC_KEY,
  sendTransaction: () => Promise.resolve("signature123"),
} as any;

async function testMeteoraDLMMActions() {
  console.log("🚀 Starting Meteora DLMM Action Provider Tests");
  console.log("=" .repeat(60));
  console.log(`Public Key: ${TEST_PUBLIC_KEY}`);
  console.log(`Connection: ${TEST_CONNECTION.rpcEndpoint}`);
  console.log("=" .repeat(60));

  const provider = new MeteoraDLMMActionProvider();

  // Test 1: Get Available Pools
  console.log("\n📊 Test 1: Get Available Pools");
  console.log("-".repeat(40));
  try {
    const result = await provider.getAvailablePools(mockWalletProvider, {
      limit: 5
    });
    
    const parsedResult = JSON.parse(result);
    console.log("✅ Success:", parsedResult.success);
    console.log("📈 Pool count:", parsedResult.count);
    console.log("🔍 Result:", JSON.stringify(parsedResult, null, 2));
  } catch (error) {
    console.log("❌ Error:", error);
  }

  // Test 2: Get Pool Info
  console.log("\n🏊 Test 2: Get Pool Information");
  console.log("-".repeat(40));
  try {
    const result = await provider.getPoolInfo(mockWalletProvider, {
      poolAddress: TEST_POOL_ADDRESSES.SOL_USDC
    });
    
    const parsedResult = JSON.parse(result);
    console.log("✅ Success:", parsedResult.success);
    console.log("🔍 Result:", JSON.stringify(parsedResult, null, 2));
  } catch (error) {
    console.log("❌ Error:", error);
  }

  // Test 3: List User Positions
  console.log("\n👤 Test 3: List User Positions");
  console.log("-".repeat(40));
  try {
    const result = await provider.listUserPositions(mockWalletProvider, {
      userAddress: TEST_PUBLIC_KEY
    });
    
    const parsedResult = JSON.parse(result);
    console.log("✅ Success:", parsedResult.success);
    console.log("📊 Position count:", parsedResult.count);
    console.log("🔍 Result:", JSON.stringify(parsedResult, null, 2));
  } catch (error) {
    console.log("❌ Error:", error);
  }

  // Test 4: Create Position (Unsigned Transaction)
  console.log("\n🏗️ Test 4: Create Position (Unsigned Transaction)");
  console.log("-".repeat(40));
  try {
    const result = await provider.createPosition(mockWalletProvider, {
      poolAddress: TEST_POOL_ADDRESSES.SOL_USDC,
      tokenXAmount: 0.1,  // 0.1 SOL
      tokenYAmount: 10,   // 10 USDC
      lowerBinId: 100,
      upperBinId: 200,
      slippageBps: 100    // 1% slippage
    });
    
    const parsedResult = JSON.parse(result);
    console.log("✅ Success:", parsedResult.success);
    console.log("🎯 Transaction Type:", parsedResult.transactionType);
    
    if (parsedResult.success && parsedResult.unsignedTransaction) {
      console.log("📏 Transaction Length:", parsedResult.unsignedTransaction.length);
      console.log("🔐 Unsigned Transaction Base64:");
      console.log(parsedResult.unsignedTransaction);
    }
    
    console.log("🔍 Full Result:", JSON.stringify(parsedResult, null, 2));
  } catch (error) {
    console.log("❌ Error:", error);
  }

  // Test 5: Close Position (Unsigned Transaction)
  console.log("\n🔒 Test 5: Close Position (Unsigned Transaction)");
  console.log("-".repeat(40));
  try {
    const mockPositionAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    
    const result = await provider.closePosition(mockWalletProvider, {
      positionAddress: mockPositionAddress,
      basisPointsToClose: 10000,  // 100%
      shouldClaimAndClose: true
    });
    
    const parsedResult = JSON.parse(result);
    console.log("✅ Success:", parsedResult.success);
    console.log("🎯 Transaction Type:", parsedResult.transactionType);
    
    if (parsedResult.success && parsedResult.unsignedTransaction) {
      console.log("📏 Transaction Length:", parsedResult.unsignedTransaction.length);
      console.log("🔐 Unsigned Transaction Base64:");
      console.log(parsedResult.unsignedTransaction);
    }
    
    console.log("🔍 Full Result:", JSON.stringify(parsedResult, null, 2));
  } catch (error) {
    console.log("❌ Error:", error);
  }

  console.log("\n🎉 Test Suite Completed!");
  console.log("=" .repeat(60));
}

// Run the tests
if (require.main === module) {
  testMeteoraDLMMActions()
    .then(() => {
      console.log("\n✅ All tests completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test suite failed:", error);
      process.exit(1);
    });
}

export { testMeteoraDLMMActions };
