import { DexScreenerActionProvider } from "./dexscreenerActionProvider";
import { DexScreenerAPI } from "./api";
import { Network } from "../../network";

// Mock the DexScreenerAPI
jest.mock("./api");

describe("DexScreenerActionProvider", () => {
  let provider: DexScreenerActionProvider;
  let mockApi: jest.Mocked<DexScreenerAPI>;

  beforeEach(() => {
    provider = new DexScreenerActionProvider();
    mockApi = jest.mocked(new DexScreenerAPI());
    (provider as any).api = mockApi;
  });

  describe("supportsNetwork", () => {
    it("should support any network", () => {
      const network: Network = {
        protocolFamily: "evm",
        networkId: "ethereum-mainnet",
        chainId: "1",
      };

      expect(provider.supportsNetwork(network)).toBe(true);
    });

    it("should support Solana network", () => {
      const network: Network = {
        protocolFamily: "svm",
        networkId: "solana-mainnet",
        chainId: "mainnet-beta",
      };

      expect(provider.supportsNetwork(network)).toBe(true);
    });
  });

  describe("searchToken", () => {
    it("should return predefined data for SOL", async () => {
      const result = await provider.searchToken({ symbol: "SOL" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.symbol).toBe("SOL");
      expect(parsed.data.source).toBe("predefined");
      expect(parsed.data.chains.solana).toBeDefined();
    });

    it("should return predefined data for ETH on specific chain", async () => {
      const result = await provider.searchToken({ symbol: "ETH", chain: "ethereum" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.symbol).toBe("ETH");
      expect(parsed.data.chain).toBe("ethereum");
      expect(parsed.data.source).toBe("predefined");
    });

    it("should search via API when token not predefined", async () => {
      const mockApiResponse = {
        pairs: [
          {
            pairAddress: "0x123",
            chainId: "ethereum",
            baseToken: { symbol: "USDC", address: "0xA0b86a33E6785C" },
            quoteToken: { symbol: "ETH", address: "0xeeeeeeeeeeeeeeeeeeeeee" },
            priceUsd: "1.00",
            liquidity: { usd: 1000000 },
            volume: { h24: 500000 },
            priceChange: { h24: 0.5 },
          }
        ]
      };

      mockApi.searchToken.mockResolvedValue(mockApiResponse);

      const result = await provider.searchToken({ symbol: "USDC" });
      const parsed = JSON.parse(result);

      expect(mockApi.searchToken).toHaveBeenCalledWith("usdc");
      expect(parsed.success).toBe(true);
      expect(parsed.data.symbol).toBe("USDC");
      expect(parsed.data.source).toBe("dexscreener_api");
      expect(parsed.data.topPairs).toHaveLength(1);
    });

    it("should handle API errors gracefully", async () => {
      mockApi.searchToken.mockRejectedValue(new Error("API Error"));

      const result = await provider.searchToken({ symbol: "UNKNOWN" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("API Error");
    });

    it("should filter by chain when specified", async () => {
      const mockApiResponse = {
        pairs: [
          {
            pairAddress: "0x123",
            chainId: "ethereum",
            baseToken: { symbol: "USDC", address: "0xA0b86a33E6785C" },
            quoteToken: { symbol: "ETH", address: "0xeeeeeeeeeeeeeeeeeeeeee" },
            priceUsd: "1.00",
            liquidity: { usd: 1000000 },
          },
          {
            pairAddress: "0x456",
            chainId: "polygon",
            baseToken: { symbol: "USDC", address: "0xA0b86a33E6785C" },
            quoteToken: { symbol: "MATIC", address: "0x0000000000000000000000" },
            priceUsd: "1.00",
            liquidity: { usd: 500000 },
          }
        ]
      };

      mockApi.searchToken.mockResolvedValue(mockApiResponse);

      const result = await provider.searchToken({ symbol: "USDC", chain: "ethereum" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.topPairs).toHaveLength(1);
      expect(parsed.data.topPairs[0].chainId).toBe("ethereum");
    });
  });

  describe("getTokenAddress", () => {
    it("should return address for predefined token", async () => {
      const result = await provider.getTokenAddress({ symbol: "SOL", chain: "solana" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.address).toBe("So11111111111111111111111111111111111111112");
      expect(parsed.chain).toBe("solana");
      expect(parsed.symbol).toBe("SOL");
    });

    it("should extract address from API search results", async () => {
      const mockApiResponse = {
        pairs: [
          {
            pairAddress: "0x123",
            chainId: "ethereum",
            baseToken: { symbol: "USDC", address: "0xA0b86a33E6785C99D25" },
            quoteToken: { symbol: "ETH", address: "0xeeeeeeeeeeeeeeeeeeeeee" },
            priceUsd: "1.00",
            liquidity: { usd: 1000000 },
          }
        ]
      };

      mockApi.searchToken.mockResolvedValue(mockApiResponse);

      const result = await provider.getTokenAddress({ symbol: "USDC" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.address).toBe("0xA0b86a33E6785C99D25");
      expect(parsed.symbol).toBe("USDC");
    });
  });

  describe("getTokenPairs", () => {
    it("should return token pairs from API", async () => {
      const mockApiResponse = {
        pairs: [
          {
            pairAddress: "0x123",
            chainId: "ethereum",
            dexId: "uniswap",
            baseToken: { symbol: "USDC", address: "0xA0b86a33E6785C" },
            quoteToken: { symbol: "ETH", address: "0xeeeeeeeeeeeeeeeeeeeeee" },
            priceUsd: "1.00",
            liquidity: { usd: 1000000 },
            volume: { h24: 500000 },
          }
        ]
      };

      mockApi.getTokenPairs.mockResolvedValue(mockApiResponse);

      const result = await provider.getTokenPairs({ 
        tokenAddress: "0xA0b86a33E6785C" 
      });
      const parsed = JSON.parse(result);

      expect(mockApi.getTokenPairs).toHaveBeenCalledWith("0xA0b86a33E6785C");
      expect(parsed.success).toBe(true);
      expect(parsed.data.pairs).toHaveLength(1);
      expect(parsed.data.pairs[0].dexId).toBe("uniswap");
    });

    it("should handle no pairs found", async () => {
      mockApi.getTokenPairs.mockResolvedValue({ pairs: [] });

      const result = await provider.getTokenPairs({ 
        tokenAddress: "0xInvalidAddress" 
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("No pairs found");
    });

    it("should filter by chain when specified", async () => {
      const mockApiResponse = {
        pairs: [
          {
            pairAddress: "0x123",
            chainId: "ethereum",
            baseToken: { symbol: "USDC", address: "0xA0b86a33E6785C" },
            liquidity: { usd: 1000000 },
          },
          {
            pairAddress: "0x456", 
            chainId: "polygon",
            baseToken: { symbol: "USDC", address: "0xA0b86a33E6785C" },
            liquidity: { usd: 500000 },
          }
        ]
      };

      mockApi.getTokenPairs.mockResolvedValue(mockApiResponse);

      const result = await provider.getTokenPairs({ 
        tokenAddress: "0xA0b86a33E6785C",
        chain: "ethereum"
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.pairs).toHaveLength(1);
      expect(parsed.data.pairs[0].chainId).toBe("ethereum");
    });
  });

  describe("API error handling", () => {
    it("should handle API errors in getTokenPairs", async () => {
      mockApi.getTokenPairs.mockRejectedValue(new Error("Network error"));

      const result = await provider.getTokenPairs({ 
        tokenAddress: "0xA0b86a33E6785C" 
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("API Error");
      expect(parsed.message).toBe("Network error");
    });
  });
}); 