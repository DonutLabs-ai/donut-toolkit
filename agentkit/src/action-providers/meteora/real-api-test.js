#!/usr/bin/env node

/**
 * Real API test runner for Meteora DLMM Action Provider
 * This script makes actual API calls to Meteora endpoints
 */

const { Connection, PublicKey } = require("@solana/web3.js");
const axios = require("axios");

// Configuration
const TEST_PUBLIC_KEY = "FtFZzg62oz93YxWe3FNCtFF5Le12bvCfepYg7RNcZLgp";
const TEST_CONNECTION = new Connection("https://api.mainnet-beta.solana.com");

// Real Meteora API endpoints
const METEORA_API_BASE_URL = "https://dlmm-api.meteora.ag";

// Common token addresses
const COMMON_TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"
};

// Real implementation calling Meteora APIs
class RealMeteoraDLMMProvider {
  constructor() {
    this.connection = TEST_CONNECTION;
    this.baseURL = METEORA_API_BASE_URL;
  }

  async getAvailablePools(options = {}) {
    try {
      const { limit = 20, tokenX, tokenY } = options;
      
      console.log(`🔍 Fetching available pools from: ${this.baseURL}/pair/all`);
      
      // Call real Meteora API to get all pairs
      const response = await axios.get(`${this.baseURL}/pair/all`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinbase-AgentKit-Test/1.0'
        }
      });

      let pools = response.data;
      
      // Filter by tokens if specified
      if (tokenX || tokenY) {
        pools = pools.filter(pool => {
          const matchesX = !tokenX || pool.mint_x === tokenX;
          const matchesY = !tokenY || pool.mint_y === tokenY;
          return matchesX && matchesY;
        });
      }

      // Limit results
      pools = pools.slice(0, limit);

      // Transform data to match expected format
      const formattedPools = pools.map(pool => ({
        address: pool.address,
        tokenX: {
          symbol: pool.name?.split('-')[0] || 'Unknown',
          mint: pool.mint_x,
          decimals: pool.decimals_x
        },
        tokenY: {
          symbol: pool.name?.split('-')[1] || 'Unknown',
          mint: pool.mint_y,
          decimals: pool.decimals_y
        },
        feeTier: pool.fee_bps,
        tvl: pool.tvl || 0,
        volume24h: pool.volume_24h || 0,
        activeBins: pool.active_bin_id || 0,
        currentPrice: pool.current_price || 0
      }));

      return {
        success: true,
        pools: formattedPools,
        count: formattedPools.length,
        filters: { tokenX, tokenY, limit },
        message: `Found ${formattedPools.length} available pools`
      };
    } catch (error) {
      console.error('❌ API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: "Failed to get available pools",
        message: `Error: ${error.response?.data?.message || error.message}`
      };
    }
  }

  async getPoolInfo(poolAddress) {
    try {
      console.log(`🔍 Getting pool info for: ${poolAddress}`);
      
      // Call real Meteora API to get specific pool info
      const response = await axios.get(`${this.baseURL}/pair/${poolAddress}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinbase-AgentKit-Test/1.0'
        }
      });

      const pool = response.data;

      const formattedPool = {
        address: pool.address,
        tokenX: {
          symbol: pool.name?.split('-')[0] || 'Unknown',
          mint: pool.mint_x,
          decimals: pool.decimals_x
        },
        tokenY: {
          symbol: pool.name?.split('-')[1] || 'Unknown',
          mint: pool.mint_y,
          decimals: pool.decimals_y
        },
        feeTier: pool.fee_bps,
        tvl: pool.tvl || 0,
        volume24h: pool.volume_24h || 0,
        activeBins: pool.active_bin_id || 0,
        currentPrice: pool.current_price || 0,
        totalBins: pool.total_bins || 0,
        status: pool.status || 'unknown'
      };

      return {
        success: true,
        pool: formattedPool,
        message: "Pool information retrieved successfully"
      };
    } catch (error) {
      console.error('❌ API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: "Failed to get pool information",
        message: `Error: ${error.response?.data?.message || error.message}`
      };
    }
  }

  async listUserPositions(userAddress) {
    try {
      console.log(`🔍 Listing positions for user: ${userAddress}`);
      
      // Call real Meteora API to get user positions
      const response = await axios.get(`${this.baseURL}/user/${userAddress}/positions`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinbase-AgentKit-Test/1.0'
        }
      });

      const positions = response.data;

      const formattedPositions = positions.map(position => ({
        address: position.address,
        pool: position.pool_address,
        tokenX: {
          symbol: position.token_x_symbol || 'Unknown',
          mint: position.token_x_mint,
          amount: position.token_x_amount || 0
        },
        tokenY: {
          symbol: position.token_y_symbol || 'Unknown',
          mint: position.token_y_mint,
          amount: position.token_y_amount || 0
        },
        unclaimedFees: {
          tokenX: position.unclaimed_fee_x || 0,
          tokenY: position.unclaimed_fee_y || 0
        },
        lowerBinId: position.lower_bin_id,
        upperBinId: position.upper_bin_id,
        currentValue: position.current_value || 0,
        pnl: position.pnl || 0,
        status: position.status || 'active'
      }));

      return {
        success: true,
        positions: formattedPositions,
        userAddress,
        count: formattedPositions.length,
        message: `Found ${formattedPositions.length} positions for user`
      };
    } catch (error) {
      console.error('❌ API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: "Failed to list user positions",
        message: `Error: ${error.response?.data?.message || error.message}`
      };
    }
  }

  async getBinsByPool(poolAddress, binIds = []) {
    try {
      console.log(`🔍 Getting bins for pool: ${poolAddress}`);
      
      const response = await axios.get(`${this.baseURL}/pair/${poolAddress}/bins`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinbase-AgentKit-Test/1.0'
        }
      });

      const bins = response.data;

      return {
        success: true,
        bins: bins,
        poolAddress,
        count: bins.length,
        message: `Found ${bins.length} bins for pool`
      };
    } catch (error) {
      console.error('❌ API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: "Failed to get bins",
        message: `Error: ${error.response?.data?.message || error.message}`
      };
    }
  }

  async getSwapQuote(poolAddress, inToken, outToken, amount, swapForY = true) {
    try {
      console.log(`🔍 Getting swap quote for pool: ${poolAddress}`);
      
      const params = new URLSearchParams({
        inToken,
        outToken,
        amount: amount.toString(),
        swapForY: swapForY.toString()
      });

      const response = await axios.get(`${this.baseURL}/swap/quote/${poolAddress}?${params}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinbase-AgentKit-Test/1.0'
        }
      });

      const quote = response.data;

      return {
        success: true,
        quote: quote,
        poolAddress,
        message: "Swap quote retrieved successfully"
      };
    } catch (error) {
      console.error('❌ API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: "Failed to get swap quote",
        message: `Error: ${error.response?.data?.message || error.message}`
      };
    }
  }

  async createPosition(params) {
    try {
      const { poolAddress, tokenXAmount, tokenYAmount, lowerBinId, upperBinId, slippageBps = 100 } = params;
      
      console.log(`🏗️ Creating position on pool: ${poolAddress}`);
      console.log(`   TokenX amount: ${tokenXAmount}, TokenY amount: ${tokenYAmount}`);
      console.log(`   Bin range: ${lowerBinId} - ${upperBinId}, Slippage: ${slippageBps}bps`);
      
      // This would normally call Meteora's transaction builder API
      // For now, we'll show what the request would look like
      const requestBody = {
        user: TEST_PUBLIC_KEY,
        pool: poolAddress,
        tokenXAmount,
        tokenYAmount,
        lowerBinId,
        upperBinId,
        slippageBps
      };

      console.log(`📝 Would make API call to: ${this.baseURL}/position/create`);
      console.log(`📋 Request body:`, JSON.stringify(requestBody, null, 2));

      // Note: This endpoint might not exist in the real API
      // This is just to show the structure
      return {
        success: true,
        message: "Position creation request prepared (API endpoint may not be available)",
        requestBody,
        transactionType: "meteora_create_position",
        poolAddress,
        tokenXAmount,
        tokenYAmount,
        lowerBinId,
        upperBinId,
        slippageBps,
        note: "This would require a real transaction builder API from Meteora"
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to create position",
        message: `Error: ${error.message}`
      };
    }
  }

  async closePosition(params) {
    try {
      const { positionAddress, basisPointsToClose = 10000, shouldClaimAndClose = true } = params;
      
      console.log(`🔒 Closing position: ${positionAddress}`);
      console.log(`   Close amount: ${basisPointsToClose}bps, Claim fees: ${shouldClaimAndClose}`);
      
      const requestBody = {
        user: TEST_PUBLIC_KEY,
        position: positionAddress,
        basisPointsToClose,
        shouldClaimAndClose
      };

      console.log(`📝 Would make API call to: ${this.baseURL}/position/close`);
      console.log(`📋 Request body:`, JSON.stringify(requestBody, null, 2));

      const percentageClosed = basisPointsToClose / 100;

      return {
        success: true,
        message: "Position close request prepared (API endpoint may not be available)",
        requestBody,
        transactionType: "meteora_close_position",
        positionAddress,
        percentageClosed,
        claimedFees: shouldClaimAndClose,
        note: "This would require a real transaction builder API from Meteora"
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to close position",
        message: `Error: ${error.message}`
      };
    }
  }
}

async function runRealApiTests() {
  console.log("🚀 Starting Real Meteora DLMM API Tests");
  console.log("=" .repeat(60));
  console.log(`Public Key: ${TEST_PUBLIC_KEY}`);
  console.log(`Connection: ${TEST_CONNECTION.rpcEndpoint}`);
  console.log(`Meteora API: ${METEORA_API_BASE_URL}`);
  console.log("=" .repeat(60));

  const provider = new RealMeteoraDLMMProvider();

  // Test 1: Get Available Pools
  console.log("\n📊 Test 1: Get Available Pools");
  console.log("-".repeat(40));
  try {
    const result = await provider.getAvailablePools({ limit: 3 });
    console.log("✅ Success:", result.success);
    console.log("📈 Pool count:", result.count);
    console.log("🔍 First pool:", result.pools?.[0] ? JSON.stringify(result.pools[0], null, 2) : "No pools found");
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  // Test 2: Get Pool Info (use a known pool address)
  console.log("\n🏊 Test 2: Get Pool Information");
  console.log("-".repeat(40));
  try {
    // Try to get the first pool from the previous test
    const poolsResult = await provider.getAvailablePools({ limit: 1 });
    if (poolsResult.success && poolsResult.pools.length > 0) {
      const poolAddress = poolsResult.pools[0].address;
      const result = await provider.getPoolInfo(poolAddress);
      console.log("✅ Success:", result.success);
      console.log("🔍 Pool details:", JSON.stringify(result.pool, null, 2));
    } else {
      console.log("⚠️  No pools available to test");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  // Test 3: List User Positions
  console.log("\n👤 Test 3: List User Positions");
  console.log("-".repeat(40));
  try {
    const result = await provider.listUserPositions(TEST_PUBLIC_KEY);
    console.log("✅ Success:", result.success);
    console.log("📊 Position count:", result.count);
    if (result.positions && result.positions.length > 0) {
      console.log("🔍 First position:", JSON.stringify(result.positions[0], null, 2));
    } else {
      console.log("📝 No positions found for this user");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  // Test 4: Get Bins for a Pool
  console.log("\n🗂️ Test 4: Get Bins for Pool");
  console.log("-".repeat(40));
  try {
    const poolsResult = await provider.getAvailablePools({ limit: 1 });
    if (poolsResult.success && poolsResult.pools.length > 0) {
      const poolAddress = poolsResult.pools[0].address;
      const result = await provider.getBinsByPool(poolAddress);
      console.log("✅ Success:", result.success);
      console.log("🗂️ Bins count:", result.count);
      if (result.bins && result.bins.length > 0) {
        console.log("🔍 First bin:", JSON.stringify(result.bins[0], null, 2));
      }
    } else {
      console.log("⚠️  No pools available to test");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  // Test 5: Get Swap Quote
  console.log("\n💱 Test 5: Get Swap Quote");
  console.log("-".repeat(40));
  try {
    const poolsResult = await provider.getAvailablePools({ limit: 1 });
    if (poolsResult.success && poolsResult.pools.length > 0) {
      const pool = poolsResult.pools[0];
      const result = await provider.getSwapQuote(
        pool.address,
        pool.tokenX.mint,
        pool.tokenY.mint,
        1000000, // 1 token (considering decimals)
        true
      );
      console.log("✅ Success:", result.success);
      if (result.quote) {
        console.log("🔍 Quote:", JSON.stringify(result.quote, null, 2));
      }
    } else {
      console.log("⚠️  No pools available to test");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  // Test 6: Create Position (Mock)
  console.log("\n🏗️ Test 6: Create Position (Mock Request)");
  console.log("-".repeat(40));
  try {
    const poolsResult = await provider.getAvailablePools({ limit: 1 });
    if (poolsResult.success && poolsResult.pools.length > 0) {
      const poolAddress = poolsResult.pools[0].address;
      const result = await provider.createPosition({
        poolAddress,
        tokenXAmount: 0.1,
        tokenYAmount: 10,
        lowerBinId: 100,
        upperBinId: 200,
        slippageBps: 100
      });
      console.log("✅ Success:", result.success);
      console.log("🔍 Result:", JSON.stringify(result, null, 2));
    } else {
      console.log("⚠️  No pools available to test");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  // Test 7: Close Position (Mock)
  console.log("\n🔒 Test 7: Close Position (Mock Request)");
  console.log("-".repeat(40));
  try {
    const mockPositionAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const result = await provider.closePosition({
      positionAddress: mockPositionAddress,
      basisPointsToClose: 10000,
      shouldClaimAndClose: true
    });
    console.log("✅ Success:", result.success);
    console.log("🔍 Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.log("❌ Error:", error.message);
  }

  console.log("\n🎉 Real API Test Suite Completed!");
  console.log("=" .repeat(60));
}

// Run the tests
if (require.main === module) {
  runRealApiTests()
    .then(() => {
      console.log("\n✅ All real API tests completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Real API test suite failed:", error);
      process.exit(1);
    });
}

module.exports = { RealMeteoraDLMMProvider, runRealApiTests };
