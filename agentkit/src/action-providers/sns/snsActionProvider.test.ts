import { SNSActionProvider } from "./snsActionProvider";
import { SNSAPI } from "./api";
import { Network } from "../../network";

// Mock the SNSAPI
jest.mock("./api");

describe("SNSActionProvider", () => {
  let provider: SNSActionProvider;
  let mockApi: jest.Mocked<SNSAPI>;

  beforeEach(() => {
    provider = new SNSActionProvider();
    mockApi = jest.mocked(new SNSAPI());
    (provider as any).api = mockApi;
  });

  describe("supportsNetwork", () => {
    it("should support Solana networks", () => {
      const network: Network = {
        protocolFamily: "svm",
        networkId: "solana-mainnet",
        chainId: "mainnet-beta",
      };

      expect(provider.supportsNetwork(network)).toBe(true);
    });

    it("should support networks with solana protocol family", () => {
      const network: Network = {
        protocolFamily: "solana",
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
  });

  describe("resolveDomain", () => {
    it("should resolve a domain to address", async () => {
      const mockAddress = "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh";
      mockApi.resolveDomain.mockResolvedValue(mockAddress);

      const result = await provider.resolveDomain({ domain: "test.sol" });
      const parsed = JSON.parse(result);

      expect(mockApi.resolveDomain).toHaveBeenCalledWith("test.sol");
      expect(parsed.success).toBe(true);
      expect(parsed.data.domain).toBe("test.sol");
      expect(parsed.data.address).toBe(mockAddress);
      expect(parsed.data.network).toBe("solana");
    });

    it("should add .sol suffix if missing", async () => {
      const mockAddress = "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh";
      mockApi.resolveDomain.mockResolvedValue(mockAddress);

      const result = await provider.resolveDomain({ domain: "test" });
      const parsed = JSON.parse(result);

      expect(mockApi.resolveDomain).toHaveBeenCalledWith("test.sol");
      expect(parsed.success).toBe(true);
      expect(parsed.data.domain).toBe("test.sol");
    });

    it("should handle domain not found", async () => {
      mockApi.resolveDomain.mockResolvedValue(null);

      const result = await provider.resolveDomain({ domain: "nonexistent.sol" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Domain not found");
    });

    it("should validate domain format", async () => {
      const result = await provider.resolveDomain({ domain: "invalid@domain.sol" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Invalid domain format");
    });

    it("should handle API errors", async () => {
      mockApi.resolveDomain.mockRejectedValue(new Error("API Error"));

      const result = await provider.resolveDomain({ domain: "test.sol" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Resolution Error");
    });
  });

  describe("reverseLookup", () => {
    it("should perform reverse lookup", async () => {
      const address = "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh";
      const mockDomain = "test.sol";
      mockApi.reverseLookup.mockResolvedValue(mockDomain);

      const result = await provider.reverseLookup({ address });
      const parsed = JSON.parse(result);

      expect(mockApi.reverseLookup).toHaveBeenCalledWith(address);
      expect(parsed.success).toBe(true);
      expect(parsed.data.address).toBe(address);
      expect(parsed.data.domain).toBe(mockDomain);
    });

    it("should validate address format", async () => {
      const result = await provider.reverseLookup({ address: "invalid-address" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Invalid address format");
    });

    it("should handle no domain found", async () => {
      const address = "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh";
      mockApi.reverseLookup.mockResolvedValue(null);

      const result = await provider.reverseLookup({ address });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("No domain found");
    });
  });

  describe("getDomainInfo", () => {
    it("should get domain information", async () => {
      const mockInfo = {
        registered: true,
        owner: "7gWBbPcQMzJX1s6s2dg1kcFQs5A1L3X4G9e8KjpYZ2Kh",
        registrationDate: "2024-01-01",
        expiryDate: "2025-01-01",
        subdomains: [],
        records: {},
      };

      mockApi.getDomainInfo.mockResolvedValue(mockInfo);

      const result = await provider.getDomainInfo({ domain: "test.sol" });
      const parsed = JSON.parse(result);

      expect(mockApi.getDomainInfo).toHaveBeenCalledWith("test.sol");
      expect(parsed.success).toBe(true);
      expect(parsed.data.domain).toBe("test.sol");
      expect(parsed.data.registered).toBe(true);
      expect(parsed.data.available).toBe(false);
      expect(parsed.data.owner).toBe(mockInfo.owner);
    });

    it("should add .sol suffix if missing", async () => {
      const mockInfo = { registered: false, owner: null };
      mockApi.getDomainInfo.mockResolvedValue(mockInfo);

      const result = await provider.getDomainInfo({ domain: "test" });
      const parsed = JSON.parse(result);

      expect(mockApi.getDomainInfo).toHaveBeenCalledWith("test.sol");
      expect(parsed.data.domain).toBe("test.sol");
    });

    it("should validate domain format", async () => {
      const result = await provider.getDomainInfo({ domain: "invalid@domain" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Invalid domain format");
    });
  });

  describe("searchDomains", () => {
    it("should search for domains", async () => {
      const mockDomains: any[] = [];
      mockApi.searchDomains.mockResolvedValue(mockDomains);

      const result = await provider.searchDomains({ query: "test", limit: 5 });
      const parsed = JSON.parse(result);

      expect(mockApi.searchDomains).toHaveBeenCalledWith("test", 5);
      expect(parsed.success).toBe(true);
      expect(parsed.data.query).toBe("test");
      expect(parsed.data.suggestions).toContain("test.sol");
      expect(parsed.data.suggestions.length).toBeLessThanOrEqual(5);
    });

    it("should use default limit", async () => {
      const mockDomains: any[] = [];
      mockApi.searchDomains.mockResolvedValue(mockDomains);

      const result = await provider.searchDomains({ query: "test", limit: 10 });
      const parsed = JSON.parse(result);

      expect(mockApi.searchDomains).toHaveBeenCalledWith("test", 10);
      expect(parsed.success).toBe(true);
    });

    it("should validate query length", async () => {
      const result = await provider.searchDomains({ query: "a", limit: 10 });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Query too short");
    });

    it("should validate query format", async () => {
      const result = await provider.searchDomains({ query: "invalid@query", limit: 10 });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Invalid query format");
    });

    it("should handle API errors", async () => {
      mockApi.searchDomains.mockRejectedValue(new Error("Search failed"));

      const result = await provider.searchDomains({ query: "test", limit: 10 });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe("Search Error");
    });
  });
});
