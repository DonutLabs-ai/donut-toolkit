import { z } from "zod";

import { CreateAction } from "../actionDecorator";
import { ActionProvider } from "../actionProvider";
import { WalletProvider } from "../../wallet-providers";
import { Network } from "../../network";

import { NativeTransferSchema, GetWalletDetailsSchema } from "./schemas";

const PROTOCOL_FAMILY_TO_TERMINOLOGY: Record<
  string,
  { unit: string; displayUnit: string; type: string; verb: string }
> = {
  evm: { unit: "WEI", displayUnit: "ETH", type: "Transaction hash", verb: "transaction" },
  svm: { unit: "LAMPORTS", displayUnit: "SOL", type: "Signature", verb: "transfer" },
};

const DEFAULT_TERMINOLOGY = { unit: "", displayUnit: "", type: "Hash", verb: "transfer" };

/**
 * WalletActionProvider provides actions for getting basic wallet information.
 */
export class WalletActionProvider extends ActionProvider {
  /**
   * Constructor for the WalletActionProvider.
   */
  constructor() {
    super("wallet", []);
  }

  /**
   * Gets the details of the connected wallet including address, network, and balance.
   *
   * @param walletProvider - The wallet provider to get the details from.
   * @param _ - Empty args object (not used).
   * @returns A formatted string containing the wallet details.
   */
  @CreateAction({
    name: "get_wallet_details",
    description: `
    This tool will return the details of the connected wallet including:
    - Wallet address
    - Network information (protocol family, network ID, chain ID)
    - Native token balance (ETH for EVM networks, SOL for Solana networks)
    - Wallet provider name
    `,
    schema: GetWalletDetailsSchema,
  })
  async getWalletDetails(
    walletProvider: WalletProvider,
    _: z.infer<typeof GetWalletDetailsSchema>,
  ): Promise<string> {
    try {
      const address = walletProvider.getAddress();
      const network = walletProvider.getNetwork();
      const balance = await walletProvider.getBalance();
      const name = walletProvider.getName();
      const terminology =
        PROTOCOL_FAMILY_TO_TERMINOLOGY[network.protocolFamily] || DEFAULT_TERMINOLOGY;

      return [
        "Wallet Details:",
        `- Provider: ${name}`,
        `- Address: ${address}`,
        "- Network:",
        `  * Protocol Family: ${network.protocolFamily}`,
        `  * Network ID: ${network.networkId || "N/A"}`,
        `  * Chain ID: ${network.chainId || "N/A"}`,
        `- Native Balance: ${balance.toString()} ${terminology.unit}`,
      ].join("\n");
    } catch (error) {
      return `Error getting wallet details: ${error}`;
    }
  }

  /**
   * Creates an unsigned transaction for transferring native currency to a destination address.
   *
   * @param walletProvider - The wallet provider to transfer from.
   * @param args - The input arguments for the action.
   * @returns A JSON string containing the unsigned transaction message.
   */
  @CreateAction({
    name: "native_transfer",
    description: `
This tool creates an unsigned transaction to transfer native tokens from the wallet to another onchain address.

It takes the following inputs:
- amount: The amount to transfer in whole units (e.g. 1 ETH, 0.1 SOL)
- destination: The address to receive the funds

Important notes:
- Returns unsigned transaction data for manual signing
- Ensure sufficient balance of the input asset before transferring
- Ensure there is sufficient native token balance for gas fees
- User must sign and broadcast the transaction separately
`,
    schema: NativeTransferSchema,
  })
  async nativeTransfer(
    walletProvider: WalletProvider,
    args: z.infer<typeof NativeTransferSchema>,
  ): Promise<string> {
    try {
      const { protocolFamily } = walletProvider.getNetwork();
      const terminology = PROTOCOL_FAMILY_TO_TERMINOLOGY[protocolFamily] || DEFAULT_TERMINOLOGY;

      // Validate and normalize the destination address
      let toAddress = args.to;
      if (protocolFamily === "evm" && !args.to.startsWith("0x")) {
        toAddress = `0x${args.to}`;
      }

      // Build unsigned transaction based on protocol family
      if (protocolFamily === "svm") {
        return await this.buildSolanaTransfer(walletProvider, toAddress, args.value, terminology);
      } else if (protocolFamily === "evm") {
        return await this.buildEvmTransfer(walletProvider, toAddress, args.value, terminology);
      } else {
        throw new Error(`Unsupported protocol family: ${protocolFamily}`);
      }
    } catch (error) {
      const { protocolFamily } = walletProvider.getNetwork();
      const terminology = PROTOCOL_FAMILY_TO_TERMINOLOGY[protocolFamily] || DEFAULT_TERMINOLOGY;
      return JSON.stringify({
        success: false,
        error: `Failed to create ${terminology.verb} transaction`,
        message: `Error creating unsigned ${terminology.verb} transaction: ${error}`,
      });
    }
  }

  /**
   * Builds an unsigned Solana transfer transaction.
   *
   * @param walletProvider
   * @param toAddress
   * @param value
   * @param terminology
   */
  private async buildSolanaTransfer(
    walletProvider: WalletProvider,
    toAddress: string,
    value: string,
    terminology: any,
  ): Promise<string> {
    // Import Solana dependencies dynamically
    const {
      PublicKey,
      SystemProgram,
      ComputeBudgetProgram,
      VersionedTransaction,
      MessageV0,
      LAMPORTS_PER_SOL,
    } = await import("@solana/web3.js");

    const fromPubkey = new PublicKey(walletProvider.getAddress());
    const toPubkey = new PublicKey(toAddress);
    const solAmount = parseFloat(value);
    const lamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));

    // Check balance
    const balance = await walletProvider.getBalance();
    if (balance < lamports + BigInt(5000)) {
      throw new Error(
        `Insufficient balance. Have ${Number(balance) / LAMPORTS_PER_SOL} SOL, need ${
          solAmount + 0.000005
        } SOL (including fees)`,
      );
    }

    const instructions = [
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10000,
      }),
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 2000,
      }),
      SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: toPubkey,
        lamports: lamports,
      }),
    ];

    const tx = new VersionedTransaction(
      MessageV0.compile({
        payerKey: fromPubkey,
        instructions: instructions,
        recentBlockhash: "11111111111111111111111111111111", // Placeholder blockhash
      }),
    );

    const unsignedTransaction = Buffer.from(tx.serialize()).toString("base64");

    return JSON.stringify({
      success: true,
      message: `Successfully created unsigned ${terminology.verb} transaction`,
      unsigned_message: unsignedTransaction,
      transactionType: "native_transfer",
      from: walletProvider.getAddress(),
      to: toAddress,
      amount: value,
      amountLamports: lamports.toString(),
      requiresBlockhashUpdate: true,
      note: "Update the blockhash before signing this transaction",
    });
  }

  /**
   * Builds an unsigned EVM transfer transaction.
   *
   * @param walletProvider
   * @param toAddress
   * @param value
   * @param terminology
   */
  private async buildEvmTransfer(
    walletProvider: WalletProvider,
    toAddress: string,
    value: string,
    terminology: any,
  ): Promise<string> {
    // For EVM, we need to build a proper transaction object
    // This is a simplified implementation - real implementation would need proper gas estimation

    const fromAddress = walletProvider.getAddress();
    const weiValue = BigInt(Math.floor(parseFloat(value) * 1e18)); // Convert ETH to Wei

    // Check balance (simplified)
    const balance = await walletProvider.getBalance();
    if (balance < weiValue + BigInt(21000 * 20000000000)) {
      // rough gas estimate
      throw new Error(
        `Insufficient balance. Have ${Number(balance) / 1e18} ETH, need ${
          parseFloat(value) + 0.0004
        } ETH (including fees)`,
      );
    }

    // Build transaction object (this would need to be serialized properly for the specific EVM implementation)
    const transactionData = {
      from: fromAddress,
      to: toAddress,
      value: `0x${weiValue.toString(16)}`,
      gas: "0x5208", // 21000 in hex
      gasPrice: "0x4a817c800", // 20 gwei in hex
      nonce: "0x0", // This should be fetched from the network
      data: "0x",
    };

    // Note: This is a simplified representation. Real implementation would need proper RLP encoding
    const unsignedTransaction = Buffer.from(JSON.stringify(transactionData)).toString("base64");

    return JSON.stringify({
      success: true,
      message: `Successfully created unsigned ${terminology.verb} transaction`,
      unsigned_message: unsignedTransaction,
      transactionType: "native_transfer",
      from: fromAddress,
      to: toAddress,
      amount: value,
      amountWei: weiValue.toString(),
      requiresNonceUpdate: true,
      note: "This is a simplified EVM transaction representation. Real implementation needs proper RLP encoding and nonce management.",
    });
  }

  /**
   * Checks if the wallet action provider supports the given network.
   * Since wallet actions are network-agnostic, this always returns true.
   *
   * @param _ - The network to check.
   * @returns True, as wallet actions are supported on all networks.
   */
  supportsNetwork = (_: Network): boolean => true;
}

/**
 * Factory function to create a new WalletActionProvider instance.
 *
 * @returns A new WalletActionProvider instance.
 */
export const walletActionProvider = () => new WalletActionProvider();
