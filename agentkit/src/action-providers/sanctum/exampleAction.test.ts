/**
 * ExampleAction Tests
 */

import { SanctumActionProvider } from "./sanctumActionProvider";
import { SanctumExampleActionSchema } from "./schemas";
import { SvmWalletProvider } from "../../wallet-providers";

describe("Example Action", () => {
  // default setup: instantiate the provider
  const provider = new SanctumActionProvider();

  // mock wallet provider setup
  let mockWalletProvider: jest.Mocked<SvmWalletProvider>;

  beforeEach(() => {
    mockWalletProvider = {
      getAddress: jest.fn(),
      getBalance: jest.fn(),
      getName: jest.fn(),
      getNetwork: jest.fn().mockReturnValue({
        protocolFamily: "svm",
        networkId: "test-network",
      }),
      nativeTransfer: jest.fn(),
    } as unknown as jest.Mocked<SvmWalletProvider>;
  });

  describe("schema validation", () => {
    it("should validate example action schema", () => {
      const validInput = {
        fieldName: "test",
        amount: "1.0",
      };
      const parseResult = SanctumExampleActionSchema.safeParse(validInput);
      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data.fieldName).toBe("test");
        expect(parseResult.data.amount).toBe("1.0");
      }
    });

    it("should reject invalid example action input", () => {
      const invalidInput = {
        fieldName: "",
        amount: "invalid",
      };
      const parseResult = SanctumExampleActionSchema.safeParse(invalidInput);
      expect(parseResult.success).toBe(false);
    });
  });

  describe("example action execution", () => {
    it("should execute example action with wallet provider", async () => {
      const args = {
        fieldName: "test",
        amount: "1.0",
      };
      const result = await provider.exampleAction(mockWalletProvider, args);
      expect(result).toContain(args.fieldName);
      expect(mockWalletProvider.getNetwork).toHaveBeenCalled();
    });
  });
});
