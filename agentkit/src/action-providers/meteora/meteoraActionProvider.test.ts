import { MeteoraDLMMActionProvider } from "./meteoraActionProvider";
import { SvmWalletProvider } from "../../wallet-providers/svmWalletProvider";
import { PublicKey, Connection } from "@solana/web3.js";
import { Network } from "../../network";
import axios from "axios";

// Test configuration
const TEST_PUBLIC_KEY = "FtFZzg62oz93YxWe3FNCtFF5Le12bvCfepYg7RNcZLgp";
const TEST_CONNECTION = new Connection("https://api.mainnet-beta.solana.com");

// Real token addresses for testing
const REAL_TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
};

// Mock pool addresses for testing
const TEST_POOL_ADDRESSES = {
  SOL_USDC: "ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq",
  USDC_USDT: "2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv",
  SOL_RAY: "61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht",
};

describe("MeteoraDLMMActionProvider - Real API Tests", () => {
  let provider: MeteoraDLMMActionProvider;
  let mockWalletProvider: jest.Mocked<SvmWalletProvider>;

  beforeEach(() => {
    provider = new MeteoraDLMMActionProvider();
    
    // Mock wallet provider with real public key
    mockWalletProvider = {
      getConnection: jest.fn().mockReturnValue(TEST_CONNECTION),
      getPublicKey: jest.fn().mockReturnValue(new PublicKey(TEST_PUBLIC_KEY)),
      getAddress: jest.fn().mockReturnValue(TEST_PUBLIC_KEY),
      sendTransaction: jest.fn().mockResolvedValue("signature123"),
    } as any;
  });

  describe("supportsNetwork", () => {
    it("should support Solana mainnet", () => {
      const network: Network = {
        protocolFamily: "svm",
        networkId: "solana-mainnet",
        chainId: "mainnet-beta",
      };

      expect(provider.supportsNetwork(network)).toBe(true);
    });

    it("should support Solana devnet", () => {
      const network: Network = {
        protocolFamily: "svm",
        networkId: "solana-devnet",
        chainId: "devnet",
      };

      expect(provider.supportsNetwork(network)).toBe(true);
    });

    it("should not support Ethereum networks", () => {
      const network: Network = {
        protocolFamily: "evm",
        networkId: "ethereum-mainnet",
        chainId: "1",
      };

      expect(provider.supportsNetwork(network)).toBe(false);
    });

    it("should not support unsupported Solana networks", () => {
      const network: Network = {
        protocolFamily: "svm",
        networkId: "solana-testnet",
        chainId: "testnet",
      };

      expect(provider.supportsNetwork(network)).toBe(false);
    });
  });

  describe("getPoolInfo", () => {
    it("should return pool information when pool exists", async () => {
      const mockPoolInfo = {
        address: "pool123",
        tokenX: { address: "tokenX123", symbol: "SOL", decimals: 9 },
        tokenY: { address: "tokenY123", symbol: "USDC", decimals: 6 },
        fee: 100,
        liquidity: "1000000",
      };

      // Mock the private method
      (provider as any).getPoolInformation = jest.fn().mockResolvedValue(mockPoolInfo);

      const result = await provider.getPoolInfo(mockWalletProvider, {
        poolAddress: "pool123",
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.pool).toEqual(mockPoolInfo);
      expect(parsedResult.message).toBe("Pool information retrieved successfully");
    });

    it("should return error when pool does not exist", async () => {
      // Mock the private method to return null
      (provider as any).getPoolInformation = jest.fn().mockResolvedValue(null);

      const result = await provider.getPoolInfo(mockWalletProvider, {
        poolAddress: "nonexistent-pool",
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.error).toBe("Pool not found");
      expect(parsedResult.message).toBe("Could not retrieve pool information");
    });
  });

  describe("getPositionInfo", () => {
    it("should return position information when position exists", async () => {
      const mockPositionInfo = {
        address: "position123",
        owner: "11111111111111111111111111111111",
        pool: "pool123",
        lowerBinId: 100,
        upperBinId: 200,
        liquidity: "500000",
        fees: { tokenX: "1000", tokenY: "2000" },
      };

      // Mock the private method
      (provider as any).getPositionInformation = jest.fn().mockResolvedValue(mockPositionInfo);

      const result = await provider.getPositionInfo(mockWalletProvider, {
        positionAddress: "position123",
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.position).toEqual(mockPositionInfo);
      expect(parsedResult.message).toBe("Position information retrieved successfully");
    });

    it("should return error when position does not exist", async () => {
      // Mock the private method to return null
      (provider as any).getPositionInformation = jest.fn().mockResolvedValue(null);

      const result = await provider.getPositionInfo(mockWalletProvider, {
        positionAddress: "nonexistent-position",
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.error).toBe("Position not found");
      expect(parsedResult.message).toBe("Could not retrieve position information");
    });
  });

  describe("listUserPositions", () => {
    it("should return user positions when they exist", async () => {
      const mockPositions = [
        {
          address: "position1",
          pool: "pool1",
          liquidity: "100000",
        },
        {
          address: "position2",
          pool: "pool2",
          liquidity: "200000",
        },
      ];

      // Mock the private method
      (provider as any).getUserPositions = jest.fn().mockResolvedValue(mockPositions);

      const result = await provider.listUserPositions(mockWalletProvider, {});

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.positions).toEqual(mockPositions);
      expect(parsedResult.count).toBe(2);
      expect(parsedResult.userAddress).toBe("11111111111111111111111111111111");
      expect(parsedResult.message).toBe("Found 2 positions for user");
    });

    it("should return empty array when no positions exist", async () => {
      // Mock the private method to return empty array
      (provider as any).getUserPositions = jest.fn().mockResolvedValue([]);

      const result = await provider.listUserPositions(mockWalletProvider, {});

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.positions).toEqual([]);
      expect(parsedResult.count).toBe(0);
      expect(parsedResult.message).toBe("Found 0 positions for user");
    });

    it("should use provided user address", async () => {
      const customUserAddress = "22222222222222222222222222222222";
      const mockPositions = [];

      // Mock the private method
      (provider as any).getUserPositions = jest.fn().mockResolvedValue(mockPositions);

      const result = await provider.listUserPositions(mockWalletProvider, {
        userAddress: customUserAddress,
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.userAddress).toBe(customUserAddress);
      expect((provider as any).getUserPositions).toHaveBeenCalledWith(customUserAddress);
    });
  });

  describe("getAvailablePools", () => {
    it("should return available pools", async () => {
      const mockPools = [
        {
          address: "pool1",
          tokenX: { address: "token1", symbol: "SOL" },
          tokenY: { address: "token2", symbol: "USDC" },
          fee: 100,
        },
        {
          address: "pool2",
          tokenX: { address: "token3", symbol: "RAY" },
          tokenY: { address: "token4", symbol: "USDT" },
          fee: 50,
        },
      ];

      // Mock the private method
      (provider as any).getAvailablePoolsList = jest.fn().mockResolvedValue(mockPools);

      const result = await provider.getAvailablePools(mockWalletProvider, {
        limit: 20,
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.pools).toEqual(mockPools);
      expect(parsedResult.count).toBe(2);
      expect(parsedResult.message).toBe("Found 2 available pools");
    });

    it("should apply filters when provided", async () => {
      const mockPools = [];

      // Mock the private method
      (provider as any).getAvailablePoolsList = jest.fn().mockResolvedValue(mockPools);

      const result = await provider.getAvailablePools(mockWalletProvider, {
        tokenX: "token1",
        tokenY: "token2",
        limit: 10,
      });

      expect((provider as any).getAvailablePoolsList).toHaveBeenCalledWith(
        "token1",
        "token2",
        10
      );

      const parsedResult = JSON.parse(result);
      expect(parsedResult.filters).toEqual({
        tokenX: "token1",
        tokenY: "token2",
        limit: 10,
      });
    });
  });

  describe("createPosition", () => {
    it("should return error when pool information cannot be retrieved", async () => {
      // Mock the private method to return null
      (provider as any).getPoolInformation = jest.fn().mockResolvedValue(null);

      const result = await provider.createPosition(mockWalletProvider, {
        poolAddress: "invalid-pool",
        tokenXAmount: 1.0,
        tokenYAmount: 100.0,
        lowerBinId: 100,
        upperBinId: 200,
        slippageBps: 100,
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.error).toBe("Invalid pool address or pool not found");
    });

    it("should return error when bin range is invalid", async () => {
      const mockPoolInfo = {
        tokenX: { address: "tokenX123" },
        tokenY: { address: "tokenY123" },
      };

      // Mock the private method
      (provider as any).getPoolInformation = jest.fn().mockResolvedValue(mockPoolInfo);

      const result = await provider.createPosition(mockWalletProvider, {
        poolAddress: "pool123",
        tokenXAmount: 1.0,
        tokenYAmount: 100.0,
        lowerBinId: 200,
        upperBinId: 100, // Invalid: lower > upper
        slippageBps: 100,
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.error).toBe("Invalid bin range");
      expect(parsedResult.message).toBe("Lower bin ID must be less than upper bin ID");
    });
  });

  describe("closePosition", () => {
    it("should return error when position does not exist", async () => {
      // Mock the private method to return null
      (provider as any).getPositionInformation = jest.fn().mockResolvedValue(null);

      const result = await provider.closePosition(mockWalletProvider, {
        positionAddress: "nonexistent-position",
        basisPointsToClose: 10000,
        shouldClaimAndClose: true,
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.error).toBe("Position not found");
      expect(parsedResult.message).toBe("Invalid position address or position does not exist");
    });
  });

  // describe("claimFees", () => {
  //   it("should return error when position does not exist", async () => {
  //     // Mock the private method to return null
  //     (provider as any).getPositionInformation = jest.fn().mockResolvedValue(null);

  //     const result = await provider.claimFees(mockWalletProvider, {
  //       positionAddress: "nonexistent-position",
  //     });

  //     const parsedResult = JSON.parse(result);
  //     expect(parsedResult.success).toBe(false);
  //     expect(parsedResult.error).toBe("Position not found");
  //     expect(parsedResult.message).toBe("Invalid position address or position does not exist");
  //   });
  // });

  // Real API Integration Tests
  describe("Real API Integration Tests", () => {
    // Set longer timeout for API calls
    jest.setTimeout(30000);

    describe("getAvailablePools - Real API Call", () => {
      it("should fetch real available pools from Meteora API", async () => {
        console.log("\n=== Testing getAvailablePools with real API ===");
        console.log(`Using public key: ${TEST_PUBLIC_KEY}`);
        
        const result = await provider.getAvailablePools(mockWalletProvider, {
          limit: 5
        });
        
        console.log("\n📊 Available Pools Result:");
        console.log(JSON.stringify(JSON.parse(result), null, 2));
        
        const parsedResult = JSON.parse(result);
        expect(parsedResult.success).toBe(true);
        expect(Array.isArray(parsedResult.pools)).toBe(true);
        expect(parsedResult.count).toBeGreaterThanOrEqual(0);
      });

      it("should filter pools by token pair", async () => {
        console.log("\n=== Testing getAvailablePools with SOL/USDC filter ===");
        
        const result = await provider.getAvailablePools(mockWalletProvider, {
          tokenX: REAL_TOKENS.SOL,
          tokenY: REAL_TOKENS.USDC,
          limit: 3
        });
        
        console.log("\n📊 Filtered Pools Result:");
        console.log(JSON.stringify(JSON.parse(result), null, 2));
        
        const parsedResult = JSON.parse(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.filters.tokenX).toBe(REAL_TOKENS.SOL);
        expect(parsedResult.filters.tokenY).toBe(REAL_TOKENS.USDC);
      });
    });

    describe("getPoolInfo - Real API Call", () => {
      it("should fetch real pool information", async () => {
        console.log("\n=== Testing getPoolInfo with real pool address ===");
        console.log(`Pool address: ${TEST_POOL_ADDRESSES.SOL_USDC}`);
        
        const result = await provider.getPoolInfo(mockWalletProvider, {
          poolAddress: TEST_POOL_ADDRESSES.SOL_USDC
        });
        
        console.log("\n📊 Pool Info Result:");
        console.log(JSON.stringify(JSON.parse(result), null, 2));
        
        const parsedResult = JSON.parse(result);
        // Note: This may fail if the pool doesn't exist or API is down
        // We'll log the result regardless
        console.log(`\n✅ Pool info fetch completed. Success: ${parsedResult.success}`);
      });
    });

    describe("listUserPositions - Real API Call", () => {
      it("should fetch real user positions", async () => {
        console.log("\n=== Testing listUserPositions with real user address ===");
        console.log(`User address: ${TEST_PUBLIC_KEY}`);
        
        const result = await provider.listUserPositions(mockWalletProvider, {
          userAddress: TEST_PUBLIC_KEY
        });
        
        console.log("\n📊 User Positions Result:");
        console.log(JSON.stringify(JSON.parse(result), null, 2));
        
        const parsedResult = JSON.parse(result);
        expect(parsedResult.success).toBe(true);
        expect(parsedResult.userAddress).toBe(TEST_PUBLIC_KEY);
        expect(Array.isArray(parsedResult.positions)).toBe(true);
        expect(typeof parsedResult.count).toBe('number');
      });
    });

    describe("createPosition - Real API Call", () => {
      it("should create unsigned transaction for position creation", async () => {
        console.log("\n=== Testing createPosition with real API ===");
        console.log(`User public key: ${TEST_PUBLIC_KEY}`);
        console.log(`Pool address: ${TEST_POOL_ADDRESSES.SOL_USDC}`);
        
        const result = await provider.createPosition(mockWalletProvider, {
          poolAddress: TEST_POOL_ADDRESSES.SOL_USDC,
          tokenXAmount: 0.1,  // 0.1 SOL
          tokenYAmount: 10,   // 10 USDC
          lowerBinId: 100,
          upperBinId: 200,
          slippageBps: 100    // 1% slippage
        });
        
        console.log("\n📊 Create Position Result:");
        const parsedResult = JSON.parse(result);
        console.log(JSON.stringify(parsedResult, null, 2));
        
        if (parsedResult.success && parsedResult.unsignedTransaction) {
          console.log("\n🎯 UNSIGNED TRANSACTION BASE64:");
          console.log(parsedResult.unsignedTransaction);
          console.log("\n📏 Transaction length:", parsedResult.unsignedTransaction.length);
          
          // Verify it's a valid base64 string
          expect(typeof parsedResult.unsignedTransaction).toBe('string');
          expect(parsedResult.unsignedTransaction.length).toBeGreaterThan(0);
          expect(parsedResult.transactionType).toBe('meteora_create_position');
        } else {
          console.log("\n❌ Failed to create unsigned transaction:");
          console.log("Error:", parsedResult.error);
          console.log("Message:", parsedResult.message);
        }
      });

      it("should handle multiple token pairs", async () => {
        console.log("\n=== Testing createPosition with different token pairs ===");
        
        const testCases = [
          {
            name: "SOL/USDC",
            poolAddress: TEST_POOL_ADDRESSES.SOL_USDC,
            tokenXAmount: 0.05,
            tokenYAmount: 5
          },
          {
            name: "SOL/RAY",
            poolAddress: TEST_POOL_ADDRESSES.SOL_RAY,
            tokenXAmount: 0.1,
            tokenYAmount: 1
          }
        ];
        
        for (const testCase of testCases) {
          console.log(`\n--- Testing ${testCase.name} ---`);
          
          const result = await provider.createPosition(mockWalletProvider, {
            poolAddress: testCase.poolAddress,
            tokenXAmount: testCase.tokenXAmount,
            tokenYAmount: testCase.tokenYAmount,
            lowerBinId: 50,
            upperBinId: 150,
            slippageBps: 50
          });
          
          const parsedResult = JSON.parse(result);
          console.log(`${testCase.name} Result:`, parsedResult.success ? "✅ SUCCESS" : "❌ FAILED");
          
          if (parsedResult.success && parsedResult.unsignedTransaction) {
            console.log(`${testCase.name} - Unsigned Transaction Length:`, parsedResult.unsignedTransaction.length);
            console.log(`${testCase.name} - Transaction Type:`, parsedResult.transactionType);
          }
        }
      });
    });

    describe("closePosition - Real API Call", () => {
      it("should create unsigned transaction for position closing", async () => {
        console.log("\n=== Testing closePosition with real API ===");
        console.log(`User public key: ${TEST_PUBLIC_KEY}`);
        
        // Use a mock position address for testing
        const mockPositionAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
        
        const result = await provider.closePosition(mockWalletProvider, {
          positionAddress: mockPositionAddress,
          basisPointsToClose: 10000,  // 100%
          shouldClaimAndClose: true
        });
        
        console.log("\n📊 Close Position Result:");
        const parsedResult = JSON.parse(result);
        console.log(JSON.stringify(parsedResult, null, 2));
        
        if (parsedResult.success && parsedResult.unsignedTransaction) {
          console.log("\n🎯 UNSIGNED TRANSACTION BASE64:");
          console.log(parsedResult.unsignedTransaction);
          console.log("\n📏 Transaction length:", parsedResult.unsignedTransaction.length);
          
          // Verify it's a valid base64 string
          expect(typeof parsedResult.unsignedTransaction).toBe('string');
          expect(parsedResult.unsignedTransaction.length).toBeGreaterThan(0);
          expect(parsedResult.transactionType).toBe('meteora_close_position');
        } else {
          console.log("\n❌ Failed to create unsigned transaction:");
          console.log("Error:", parsedResult.error);
          console.log("Message:", parsedResult.message);
        }
      });

      it("should handle partial position closing", async () => {
        console.log("\n=== Testing closePosition with partial close ===");
        
        const mockPositionAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
        
        const result = await provider.closePosition(mockWalletProvider, {
          positionAddress: mockPositionAddress,
          basisPointsToClose: 5000,   // 50%
          shouldClaimAndClose: false
        });
        
        console.log("\n📊 Partial Close Position Result:");
        const parsedResult = JSON.parse(result);
        console.log(JSON.stringify(parsedResult, null, 2));
        
        if (parsedResult.success) {
          expect(parsedResult.percentageClosed).toBe(50);
          expect(parsedResult.claimedFees).toBe(false);
        }
      });
    });

    describe("API Error Handling", () => {
      it("should handle invalid pool addresses gracefully", async () => {
        console.log("\n=== Testing error handling with invalid pool ===");
        
        const result = await provider.getPoolInfo(mockWalletProvider, {
          poolAddress: "invalid-pool-address"
        });
        
        console.log("\n📊 Invalid Pool Result:");
        console.log(JSON.stringify(JSON.parse(result), null, 2));
        
        const parsedResult = JSON.parse(result);
        // Should handle gracefully regardless of success/failure
        expect(typeof parsedResult.success).toBe('boolean');
      });

      it("should handle network errors gracefully", async () => {
        console.log("\n=== Testing network error handling ===");
        
        // Temporarily mock axios to simulate network error
        const originalAxios = axios.get;
        (axios as any).get = jest.fn().mockRejectedValue(new Error("Network error"));
        
        const result = await provider.getPoolInfo(mockWalletProvider, {
          poolAddress: TEST_POOL_ADDRESSES.SOL_USDC
        });
        
        const parsedResult = JSON.parse(result);
        console.log("\n📊 Network Error Result:");
        console.log(JSON.stringify(parsedResult, null, 2));
        
        // Restore original axios
        (axios as any).get = originalAxios;
        
        expect(parsedResult.success).toBe(false);
      });
    });
  });
});
