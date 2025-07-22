import { WormholeActionProvider } from "./wormholeActionProvider";
import { WormholeAPI } from "./api";
import { Network } from "../../network";

// Mock the WormholeAPI
jest.mock("./api");

describe("WormholeActionProvider", () => {
  let provider: WormholeActionProvider;
  let mockApi: jest.Mocked<WormholeAPI>;

  beforeEach(() => {
    provider = new WormholeActionProvider();
    mockApi = jest.mocked(new WormholeAPI());
    (provider as any).api = mockApi;
  });

  describe("supportsNetwork", () => {
    it("should support Ethereum networks", () => {
      const network: Network = {
        protocolFamily: "evm",
        networkId: "ethereum-mainnet",
        chainId: "1",
      };

      mockApi.isChainSupported.mockReturnValue(true);
      expect(provider.supportsNetwork(network)).toBe(true);
      expect(mockApi.isChainSupported).toHaveBeenCalledWith("ethereum");
    });

    it("should support Solana networks", () => {
      const network: Network = {
        protocolFamily: "svm",
        networkId: "solana-mainnet",
        chainId: "mainnet-beta",
      };

      mockApi.isChainSupported.mockReturnValue(true);
      expect(provider.supportsNetwork(network)).toBe(true);
      expect(mockApi.isChainSupported).toHaveBeenCalledWith("solana");
    });

    it("should not support unsupported networks", () => {
      const network: Network = {
        protocolFamily: "unknown",
        networkId: "unsupported-chain",
        chainId: "1",
      };

      mockApi.isChainSupported.mockReturnValue(false);
      expect(provider.supportsNetwork(network)).toBe(false);
    });
  });

  describe("transferToken", () => {
    it("should initiate a successful transfer", async () => {
      const mockTransferResult = {
        transferId: "wh_1234567890",
        sourceChain: "ethereum",
        destinationChain: "solana",
        tokenAddress: "0x123",
        amount: "100",
        recipientAddress: "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh",
        status: "initiated",
        message: "Transfer initiated successfully",
      };

      mockApi.isChainSupported.mockReturnValue(true);
      mockApi.initiateTransfer.mockResolvedValue(mockTransferResult);

      const result = await provider.transferToken({
        fromChain: "ethereum",
        toChain: "solana",
        tokenAddress: "0x123",
        amount: "100",
        recipientAddress: "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.transferId).toBe(mockTransferResult.transferId);
      expect(parsed.data.sourceChain).toBe("ethereum");
      expect(parsed.data.destinationChain).toBe("solana");
      expect(parsed.data.next_steps).toBeDefined();
    });

    it("should reject transfer to same chain", async () => {
      const result = await provider.transferToken({
        fromChain: "ethereum",
        toChain: "ethereum",
        tokenAddress: "0x123",
        amount: "100",
        recipientAddress: "0x456",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Invalid transfer");
      expect(parsed.message).toContain("same");
    });

    it("should reject unsupported source chain", async () => {
      mockApi.isChainSupported.mockImplementation(chain => chain !== "unsupported");

      const result = await provider.transferToken({
        fromChain: "unsupported",
        toChain: "ethereum",
        tokenAddress: "0x123",
        amount: "100",
        recipientAddress: "0x456",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Unsupported chain");
      expect(parsed.message).toContain("unsupported");
    });

    it("should reject invalid amount", async () => {
      mockApi.isChainSupported.mockReturnValue(true);

      const result = await provider.transferToken({
        fromChain: "ethereum",
        toChain: "solana",
        tokenAddress: "0x123",
        amount: "0",
        recipientAddress: "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Invalid amount");
    });

    it("should handle API errors", async () => {
      mockApi.isChainSupported.mockReturnValue(true);
      mockApi.initiateTransfer.mockRejectedValue(new Error("API Error"));

      const result = await provider.transferToken({
        fromChain: "ethereum",
        toChain: "solana",
        tokenAddress: "0x123",
        amount: "100",
        recipientAddress: "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Transfer Error");
    });
  });

  describe("getTransferStatus", () => {
    it("should get transfer status", async () => {
      const mockStatus = {
        txHash: "0xabcdef",
        fromChain: "ethereum",
        status: "pending",
        vaaId: null,
        destinationTxHash: null,
        estimatedCompletion: "2024-01-01T12:00:00Z",
        message: "Transfer is being processed",
      };

      mockApi.isChainSupported.mockReturnValue(true);
      mockApi.getTransferStatus.mockResolvedValue(mockStatus);

      const result = await provider.getTransferStatus({
        txHash: "0xabcdef",
        fromChain: "ethereum",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.txHash).toBe("0xabcdef");
      expect(parsed.data.status).toBe("pending");
      expect(parsed.data.statusDescription).toContain("processed");
    });

    it("should handle unsupported chain", async () => {
      mockApi.isChainSupported.mockReturnValue(false);

      const result = await provider.getTransferStatus({
        txHash: "0xabcdef",
        fromChain: "unsupported",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Unsupported chain");
    });
  });

  describe("getSupportedChains", () => {
    it("should get supported chains", async () => {
      const mockChains = [
        { name: "ethereum", chainId: 2, supported: true },
        { name: "solana", chainId: 1, supported: true },
        { name: "polygon", chainId: 5, supported: true },
      ];

      mockApi.getSupportedChains.mockReturnValue(mockChains);

      const result = await provider.getSupportedChains({});
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.totalChains).toBe(3);
      expect(parsed.data.chains).toEqual(mockChains);
      expect(parsed.data.popular).toBeDefined();
      expect(parsed.data.popular.length).toBeGreaterThan(0);
    });
  });

  describe("getTokenInfo", () => {
    it("should get token information", async () => {
      const mockTokenInfo = {
        originalToken: {
          address: "0x123",
          chain: "ethereum",
        },
        wrappedTokens: [],
        isWrapped: false,
        originalChain: "ethereum",
        decimals: 18,
        symbol: "TOKEN",
        name: "Test Token",
        note: "Mock token info",
      };

      mockApi.isChainSupported.mockReturnValue(true);
      mockApi.getTokenInfo.mockResolvedValue(mockTokenInfo);

      const result = await provider.getTokenInfo({
        tokenAddress: "0x123",
        chain: "ethereum",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.originalToken.address).toBe("0x123");
      expect(parsed.data.symbol).toBe("TOKEN");
      expect(parsed.data.transferSupported).toBe(true);
    });

    it("should handle unsupported chain", async () => {
      mockApi.isChainSupported.mockReturnValue(false);

      const result = await provider.getTokenInfo({
        tokenAddress: "0x123",
        chain: "unsupported",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Unsupported chain");
    });
  });

  describe("estimateFees", () => {
    it("should estimate transfer fees", async () => {
      const mockFeeEstimate = {
        fromChain: "ethereum",
        toChain: "solana",
        baseFee: { amount: "0.005", currency: "ETH" },
        relayFee: { amount: "0.001", currency: "ETH" },
        totalFee: { amount: "0.006", currency: "ETH" },
        estimatedTime: "5-15 minutes",
        note: "Mock fee estimate",
      };

      mockApi.isChainSupported.mockReturnValue(true);
      mockApi.estimateFees.mockResolvedValue(mockFeeEstimate);

      const result = await provider.estimateFees({
        fromChain: "ethereum",
        toChain: "solana",
        tokenAddress: "0x123",
        amount: "100",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.fromChain).toBe("ethereum");
      expect(parsed.data.toChain).toBe("solana");
      expect(parsed.data.totalFee.amount).toBe("0.006");
      expect(parsed.data.breakdown).toBeDefined();
    });

    it("should reject same chain transfer", async () => {
      const result = await provider.estimateFees({
        fromChain: "ethereum",
        toChain: "ethereum",
        tokenAddress: "0x123",
        amount: "100",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Invalid request");
    });

    it("should handle API errors", async () => {
      mockApi.isChainSupported.mockReturnValue(true);
      mockApi.estimateFees.mockRejectedValue(new Error("Fee estimation failed"));

      const result = await provider.estimateFees({
        fromChain: "ethereum",
        toChain: "solana",
        tokenAddress: "0x123",
        amount: "100",
      });

      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Fee Estimation Error");
    });
  });
});
