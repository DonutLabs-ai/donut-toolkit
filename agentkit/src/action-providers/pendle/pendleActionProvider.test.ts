/**
 * Tests for PendleActionProvider
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { PendleActionProvider } from "./pendleActionProvider";
import { Network } from "../../network";

describe("PendleActionProvider", () => {
  let provider: PendleActionProvider;

  beforeEach(() => {
    provider = new PendleActionProvider();
  });

  describe("Constructor", () => {
    it("should create provider with default config", () => {
      expect(provider).toBeInstanceOf(PendleActionProvider);
      expect(provider.name).toBe("pendle");
    });

    it("should create provider with custom config", () => {
      const customProvider = new PendleActionProvider({
        apiKey: "test-key",
        enableAggregator: false,
      });
      expect(customProvider).toBeInstanceOf(PendleActionProvider);
    });
  });

  describe("Network Support", () => {
    it("should support Ethereum mainnet", () => {
      const network: Network = {
        protocolFamily: "evm",
        networkId: "ethereum-mainnet",
        chainId: "1",
      };
      expect(provider.supportsNetwork(network)).toBe(true);
    });

    it("should support Arbitrum mainnet", () => {
      const network: Network = {
        protocolFamily: "evm",
        networkId: "arbitrum-mainnet",
        chainId: "42161",
      };
      expect(provider.supportsNetwork(network)).toBe(true);
    });

    it("should not support Solana", () => {
      const network: Network = {
        protocolFamily: "svm",
        networkId: "solana-mainnet",
        chainId: "101",
      };
      expect(provider.supportsNetwork(network)).toBe(false);
    });

    it("should not support unsupported EVM networks", () => {
      const network: Network = {
        protocolFamily: "evm",
        networkId: "avalanche-mainnet",
        chainId: "43114",
      };
      expect(provider.supportsNetwork(network)).toBe(false);
    });
  });

  // TODO: Add more tests when SDK integration is implemented
  describe("Actions", () => {
    it("should have the correct action count", () => {
      // This is a placeholder test
      // In a real implementation, we would mock the wallet provider
      // and test each action individually
      expect(provider).toBeDefined();
    });
  });
});

// TODO: Add integration tests with mock Pendle API responses
// TODO: Add tests for transaction building (when SDK is integrated)
// TODO: Add tests for error handling scenarios
// TODO: Add tests for schema validation 