/**
 * Sanctum Action Provider
 *
 * This file contains the implementation of the SanctumActionProvider,
 * which provides actions for sanctum operations.
 *
 * @module sanctum
 */

import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { CreateAction } from "../actionDecorator";
import { SvmWalletProvider } from "../../wallet-providers";
import { ExampleActionSchema } from "./schemas";

/**
 * SanctumActionProvider provides actions for sanctum operations.
 *
 * @description
 * This provider is designed to work with SvmWalletProvider for blockchain interactions.
 * It supports all svm networks.
 */
export class SanctumActionProvider extends ActionProvider<SvmWalletProvider> {
  /**
   * Constructor for the SanctumActionProvider.
   */
  constructor() {
    super("sanctum", []);
  }

  /**
   * Example action implementation.
   * Replace or modify this with your actual action.
   *
   * @description
   * This is a template action that demonstrates the basic structure.
   * Replace it with your actual implementation.
   *
   * @param walletProvider - The wallet provider instance for blockchain interactions
   * @param args - Arguments defined by ExampleActionSchema
   * @returns A promise that resolves to a string describing the action result
   */
  @CreateAction({
    name: "example_action",
    description: `
    Example action for sanctum provider.

    This action demonstrates the basic structure of an action implementation.
    Replace this description with your actual action's purpose and behavior.

    Include:
    - What the action does
    - Required inputs and their format
    - Expected outputs
    - Any important considerations or limitations
  `,
    schema: ExampleActionSchema,
  })
  async exampleAction(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof ExampleActionSchema>,
  ): Promise<string> {
    // TODO: Implement your action logic here
    // Example implementation:
    const network = walletProvider.getNetwork();
    return `Example action called with ${args.fieldName} on network ${network.networkId}`;
  }

  /**
   * Checks if this provider supports the given network.
   *
   * @param network - The network to check support for
   * @returns True if the network is supported
   */
  supportsNetwork(network: Network): boolean {
    // all protocol networks
    return network.protocolFamily === "svm";
  }
}

/**
 * Factory function to create a new SanctumActionProvider instance.
 *
 * @returns A new SanctumActionProvider instance
 */
export const sanctumActionProvider = () => new SanctumActionProvider();
