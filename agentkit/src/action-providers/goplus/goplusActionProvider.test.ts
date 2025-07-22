import { GoplusActionProvider } from "./goplusActionProvider";
import { Network } from "../../network";
import { GoplusAPI } from "./api";
import { isValidSolanaAddress, calculateSecurityScore } from "./utils";
import { SolanaTokenSecurityData } from "./types";

// Mock the API
jest.mock("./api");
const MockedGoplusAPI = GoplusAPI as jest.MockedClass<typeof GoplusAPI>;

describe("GoplusActionProvider", () => {
  let provider: GoplusActionProvider;
  let mockApiClient: jest.Mocked<GoplusAPI>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient = new MockedGoplusAPI() as jest.Mocked<GoplusAPI>;
    provider = new GoplusActionProvider();
    (provider as any).apiClient = mockApiClient;
  });

  describe("constructor", () => {
    it("should create provider with default config", () => {
      const provider = new GoplusActionProvider();
      expect(provider).toBeInstanceOf(GoplusActionProvider);
      expect(provider.name).toBe("goplus");
    });

    it("should create provider with custom config", () => {
      const provider = new GoplusActionProvider({
        timeout: 60000,
        enableLogging: true,
      });
      expect(provider).toBeInstanceOf(GoplusActionProvider);
    });
  });

  describe("supportsNetwork", () => {
    it("should support all networks as it's a query service", () => {
      const network: Network = {
        protocolFamily: "svm",
        networkId: "solana-mainnet",
        chainId: "mainnet-beta",
      };

      expect(provider.supportsNetwork(network)).toBe(true);

      // Should also support EVM networks
      const evmNetwork: Network = {
        protocolFamily: "evm",
        networkId: "base-mainnet",
        chainId: "8453",
      };

      expect(provider.supportsNetwork(evmNetwork)).toBe(true);
    });
  });

  describe("getSolanaTokenSecurity", () => {
    const validTokenAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const mockTokenData: SolanaTokenSecurityData = {
      token_name: "USD Coin",
      token_symbol: "USDC",
      holder_count: "100000",
      total_supply: "1000000000",
      is_true_token: "1",
      is_airdrop_scam: "0",
      trust_list: "1",
      is_open_source: "1",
      cannot_buy: "0",
      cannot_sell_all: "0",
      slippage_modifiable: "0",
      trading_cooldown: "0",
      transfer_pausable: "0",
      can_take_back_ownership: "0",
      owner_change_balance: "0",
      hidden_owner: "0",
      selfdestruct: "0",
      buy_tax: "0",
      sell_tax: "0",
      dex: [
        {
          name: "Raydium",
          liquidity: "50000000",
          pair: "USDC/SOL",
        },
      ],
    };

    it("should return security analysis for valid token", async () => {
      mockApiClient.solanaTokenSecurity.mockResolvedValue({
        code: 200,
        message: "OK",
        result: {
          [validTokenAddress]: mockTokenData,
        },
      });

      const result = await provider.getSolanaTokenSecurity({ tokenAddress: validTokenAddress });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeDefined();
      expect(parsed.data.tokenAddress).toBe(validTokenAddress);
      expect(parsed.data.tokenName).toBe("USD Coin");
      expect(parsed.data.securityScore).toBeGreaterThan(90);
      expect(parsed.data.riskLevel).toBe("very_low");
      expect(mockApiClient.solanaTokenSecurity).toHaveBeenCalledWith(validTokenAddress);
    });

    it("should return error for invalid address", async () => {
      const invalidAddress = "invalid_address";

      const result = await provider.getSolanaTokenSecurity({ tokenAddress: invalidAddress });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Invalid");
      expect(mockApiClient.solanaTokenSecurity).not.toHaveBeenCalled();
    });

    it("should handle token not found", async () => {
      mockApiClient.solanaTokenSecurity.mockResolvedValue({
        code: 200,
        message: "OK",
        result: {},
      });

      const result = await provider.getSolanaTokenSecurity({ tokenAddress: validTokenAddress });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Token not found");
    });

    it("should handle API errors", async () => {
      mockApiClient.solanaTokenSecurity.mockRejectedValue(new Error("API Error"));

      const result = await provider.getSolanaTokenSecurity({ tokenAddress: validTokenAddress });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Security analysis failed");
    });
  });

  describe("batchSolanaTokenSecurity", () => {
    const validTokens = [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    ];

    it("should analyze multiple tokens successfully", async () => {
      const mockResponse = {
        code: 200,
        message: "OK",
        result: {
          [validTokens[0]]: {
            token_name: "USD Coin",
            token_symbol: "USDC",
            is_true_token: "1",
            cannot_buy: "0",
            cannot_sell_all: "0",
            buy_tax: "0",
            sell_tax: "0",
          },
          [validTokens[1]]: {
            token_name: "USDT",
            token_symbol: "USDT",
            is_true_token: "1",
            cannot_buy: "0",
            cannot_sell_all: "0",
            buy_tax: "0",
            sell_tax: "0",
          },
        },
      };

      mockApiClient.solanaTokenSecurity.mockResolvedValue(mockResponse);

      const result = await provider.batchSolanaTokenSecurity({ tokenAddresses: validTokens });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.totalTokens).toBe(2);
      expect(parsed.data.processedTokens).toBe(2);
      expect(parsed.data.results).toHaveLength(2);
      expect(parsed.data.summary).toBeDefined();
      expect(parsed.data.summary.safeTokens).toBeGreaterThan(0);
    });

    it("should handle invalid addresses in batch", async () => {
      const invalidTokens = ["invalid1", "invalid2"];

      const result = await provider.batchSolanaTokenSecurity({ tokenAddresses: invalidTokens });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Invalid addresses");
      expect(mockApiClient.solanaTokenSecurity).not.toHaveBeenCalled();
    });

    it("should handle partial failures gracefully", async () => {
      const mockResponse = {
        code: 200,
        message: "OK",
        result: {
          [validTokens[0]]: {
            token_name: "USD Coin",
            token_symbol: "USDC",
            is_true_token: "1",
            cannot_buy: "0",
            cannot_sell_all: "0",
          },
          // Missing validTokens[1] to simulate partial failure
        },
      };

      mockApiClient.solanaTokenSecurity.mockResolvedValue(mockResponse);

      const result = await provider.batchSolanaTokenSecurity({ tokenAddresses: validTokens });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.processedTokens).toBe(1);
      expect(parsed.data.errors).toHaveLength(1);
      expect(parsed.data.errors[0].tokenAddress).toBe(validTokens[1]);
    });
  });

  describe("compareTokenSecurity", () => {
    const tokensToCompare = [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Safe token
      "SomeRiskyToken123456789012345678901234567890", // Risky token (mock)
    ];

    it("should compare tokens and identify safest/riskiest", async () => {
      const mockResponse = {
        code: 200,
        message: "OK",
        result: {
          [tokensToCompare[0]]: {
            token_name: "Safe Token",
            is_true_token: "1",
            cannot_buy: "0",
            cannot_sell_all: "0",
            buy_tax: "0",
            sell_tax: "0",
          },
          [tokensToCompare[1]]: {
            token_name: "Risky Token",
            is_true_token: "0",
            cannot_buy: "1",
            cannot_sell_all: "1",
            buy_tax: "20",
            sell_tax: "20",
          },
        },
      };

      mockApiClient.solanaTokenSecurity.mockResolvedValue(mockResponse);

      const result = await provider.compareTokenSecurity({ tokenAddresses: tokensToCompare });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.comparison.safest).toBe(tokensToCompare[0]);
      expect(parsed.data.comparison.riskiest).toBe(tokensToCompare[1]);
      expect(parsed.data.individualResults).toHaveLength(2);
    });
  });

  describe("checkMaliciousAddress", () => {
    const validAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

    it("should check malicious address", async () => {
      const mockResponse = {
        code: 200,
        message: "OK",
        result: {
          malicious: false,
          details: "Address appears clean",
        },
      };

      mockApiClient.checkMaliciousAddress.mockResolvedValue(mockResponse);

      const result = await provider.checkMaliciousAddress({ address: validAddress });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data).toBeDefined();
      expect(mockApiClient.checkMaliciousAddress).toHaveBeenCalledWith(validAddress);
    });

    it("should handle invalid address", async () => {
      const result = await provider.checkMaliciousAddress({ address: "invalid" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Invalid");
    });
  });
});

describe("Utility Functions", () => {
  describe("isValidSolanaAddress", () => {
    it("should validate correct Solana addresses", () => {
      const validAddresses = [
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      ];

      validAddresses.forEach(address => {
        expect(isValidSolanaAddress(address)).toBe(true);
      });
    });

    it("should reject invalid Solana addresses", () => {
      const invalidAddresses = [
        "invalid_address",
        "0x742C4b48f51C6ad6B8EDfF8C8CA12136a0D6CC5E", // Ethereum address
        "too_short",
        "way_too_long_address_that_exceeds_maximum_length_allowed_for_solana_addresses_which_should_fail_validation",
        "",
        "contains@invalid#characters",
      ];

      invalidAddresses.forEach(address => {
        expect(isValidSolanaAddress(address)).toBe(false);
      });
    });
  });

  describe("calculateSecurityScore", () => {
    it("should calculate high score for safe token", () => {
      const safeTokenData: SolanaTokenSecurityData = {
        is_true_token: "1",
        trust_list: "1",
        is_open_source: "1",
        cannot_buy: "0",
        cannot_sell_all: "0",
        is_airdrop_scam: "0",
        hidden_owner: "0",
        selfdestruct: "0",
        can_take_back_ownership: "0",
        owner_change_balance: "0",
        slippage_modifiable: "0",
        trading_cooldown: "0",
        transfer_pausable: "0",
        buy_tax: "0",
        sell_tax: "0",
      };

      const score = calculateSecurityScore(safeTokenData);
      expect(score).toBeGreaterThan(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should calculate low score for risky token", () => {
      const riskyTokenData: SolanaTokenSecurityData = {
        is_true_token: "0",
        trust_list: "0",
        is_open_source: "0",
        cannot_buy: "1",
        cannot_sell_all: "1",
        is_airdrop_scam: "1",
        hidden_owner: "1",
        selfdestruct: "1",
        can_take_back_ownership: "1",
        owner_change_balance: "1",
        slippage_modifiable: "1",
        trading_cooldown: "1",
        transfer_pausable: "1",
        buy_tax: "15",
        sell_tax: "15",
      };

      const score = calculateSecurityScore(riskyTokenData);
      expect(score).toBeLessThan(30);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing data gracefully", () => {
      const incompleteData: SolanaTokenSecurityData = {
        token_name: "Test Token",
      };

      const score = calculateSecurityScore(incompleteData);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
