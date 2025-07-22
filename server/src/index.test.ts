import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getMcpTools, getMcpToolsFromProviders, UnsignedTransactionWalletProvider } from "./index";
import { AgentKit, Action, ActionProvider, Network } from "@coinbase/agentkit";

// Mocking the Action class
const mockAction: Action = {
  name: "testAction",
  description: "A test action",
  schema: z.object({ test: z.string() }),
  invoke: jest.fn(async arg => `Invoked with ${arg.test}`),
};

// Mock ActionProvider
const mockActionProvider: ActionProvider = {
  name: "testProvider",
  getActions: jest.fn(() => [mockAction]),
  networkSupported: jest.fn(() => true),
};

// Creating a mock for AgentKit
jest.mock("@coinbase/agentkit", () => {
  const originalModule = jest.requireActual("@coinbase/agentkit");
  return {
    ...originalModule,
    AgentKit: {
      from: jest.fn().mockImplementation(() => ({
        getActions: jest.fn(() => [mockAction]),
      })),
    },
  };
});

describe("getMcpTools", () => {
  it("should work with an AgentKit instance", async () => {
    const mockAgentKit = await AgentKit.from({});
    const { tools, toolHandler } = await getMcpTools(mockAgentKit);

    expect(tools).toHaveLength(1);
    const tool = tools[0];

    expect(tool.name).toBe(mockAction.name);
    expect(tool.description).toBe(mockAction.description);
    expect(tool.inputSchema).toStrictEqual(zodToJsonSchema(mockAction.schema));

    const result = await toolHandler("testAction", { test: "data" });
    expect(result).toStrictEqual({ content: [{ text: '"Invoked with data"', type: "text" }] });
  });

  it("should work with custom wallet provider configuration", async () => {
    const mockNetwork: Network = {
      protocolFamily: "evm",
      chainId: "1",
      networkId: "ethereum-mainnet",
    };

    const customWalletProvider = new UnsignedTransactionWalletProvider(
      "0x123456789",
      mockNetwork
    );

    const { tools, toolHandler } = await getMcpTools({
      walletProvider: customWalletProvider,
      actionProviders: [mockActionProvider],
    });

    expect(tools).toHaveLength(1);
    const result = await toolHandler("testAction", { test: "data" });
    expect(result).toStrictEqual({ content: [{ text: '"Invoked with data"', type: "text" }] });
  });

  it("should throw error when wallet provider is missing in config", async () => {
    await expect(getMcpTools({})).rejects.toThrow(
      "walletProvider is required when not providing an AgentKit instance"
    );
  });
});

describe("getMcpToolsFromProviders", () => {
  it("should work with action providers directly", async () => {
    const { tools, toolHandler } = await getMcpToolsFromProviders([mockActionProvider]);

    expect(tools).toHaveLength(1);
    const tool = tools[0];

    expect(tool.name).toBe(mockAction.name);
    expect(tool.description).toBe(mockAction.description);

    const result = await toolHandler("testAction", { test: "data" });
    expect(result).toStrictEqual({ content: [{ text: '"Invoked with data"', type: "text" }] });
  });
});

describe("UnsignedTransactionWalletProvider", () => {
  it("should return unsigned transaction as base64", async () => {
    const mockNetwork: Network = {
      protocolFamily: "evm",
      chainId: "1",
      networkId: "ethereum-mainnet",
    };

    const walletProvider = new UnsignedTransactionWalletProvider(
      "0x123456789",
      mockNetwork
    );

    expect(walletProvider.getAddress()).toBe("0x123456789");
    expect(walletProvider.getNetwork()).toBe(mockNetwork);
    expect(walletProvider.getName()).toBe("unsigned-transaction-wallet");

    const balance = await walletProvider.getBalance();
    expect(balance).toBe(BigInt(1000000000000000000));

    const result = await walletProvider.nativeTransfer("0xto", "1.0");
    expect(result).toMatch(/^unsigned_tx:/);
  });
});
