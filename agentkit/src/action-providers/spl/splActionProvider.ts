import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { SvmWalletProvider } from "../../wallet-providers/svmWalletProvider";
import { z } from "zod";
import { CreateAction } from "../actionDecorator";
import { TransferTokenSchema, GetBalanceSchema } from "./schemas";
import {
  PublicKey,
  VersionedTransaction,
  MessageV0,
  TransactionInstruction,
  Connection,
} from "@solana/web3.js";

/**
 * SplActionProvider serves as a provider for SPL token actions.
 * It provides SPL token transfer functionality.
 */
export class SplActionProvider extends ActionProvider<SvmWalletProvider> {
  /**
   * Creates a new SplActionProvider instance.
   */
  constructor() {
    super("spl", []);
  }

  /**
   * Get the balance of SPL tokens for an address.
   *
   * @param walletProvider - The wallet provider to use
   * @param args - Parameters including mint address and optional target address
   * @returns A message indicating the token balance
   */
  @CreateAction({
    name: "get_balance",
    description: `
    This tool will get the balance of SPL tokens for an address.
    - Mint address must be a valid SPL token mint
    - If no address is provided, uses the connected wallet's address
    - Returns the token balance in token units (not raw)
    `,
    schema: GetBalanceSchema,
  })
  async getBalance(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof GetBalanceSchema>,
  ): Promise<string> {
    try {
      if (!args.address) {
        args.address = walletProvider.getAddress();
      }

      const connection = walletProvider.getConnection();
      const mintPubkey = new PublicKey(args.mintAddress);
      const ownerPubkey = new PublicKey(args.address);

      const { getMint, getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } =
        await import("@solana/spl-token");

      let mintInfo: Awaited<ReturnType<typeof getMint>>;
      try {
        mintInfo = await getMint(connection, mintPubkey);
      } catch (error) {
        return `Failed to fetch mint info for mint address ${args.mintAddress}. Error: ${error}`;
      }

      try {
        const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey);
        const account = await getAccount(connection, ata);
        const balance = Number(account.amount) / Math.pow(10, mintInfo.decimals);

        return `Balance for ${args.address} is ${balance} tokens`;
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          return `Balance for ${args.address} is 0 tokens`;
        }
        throw error;
      }
    } catch (error) {
      return `Error getting SPL token balance: ${error}`;
    }
  }

  /**
   * Transfer SPL tokens to another address.
   *
   * @param walletProvider - The wallet provider to get the user's public key
   * @param args - Transfer parameters including recipient address, mint address, amount, and decimals
   * @returns A JSON string containing the unsigned transaction message
   */
  @CreateAction({
    name: "transfer",
    description: `
    Creates an unsigned SPL token transfer transaction.
    - Amount should be specified in token units (not raw)
    - Recipient must be a valid Solana address
    - Mint address must be a valid SPL token mint
    - Decimals must be provided (e.g., 6 for USDC, 9 for SOL)
    - Returns unsigned transaction data for manual signing
    - User must sign and broadcast the transaction separately
    - Note: User should update blockhash before signing
    `,
    schema: TransferTokenSchema,
  })
  async transfer(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof TransferTokenSchema>,
  ): Promise<string> {
    try {
      // Validate addresses first
      if (!this.validateSolanaAddress(args.recipient)) {
        return JSON.stringify({
          success: false,
          error: "Invalid recipient address",
          message: `Recipient address ${args.recipient} is not a valid Solana address`,
        });
      }

      if (!this.validateSolanaAddress(args.mintAddress)) {
        return JSON.stringify({
          success: false,
          error: "Invalid mint address",
          message: `Mint address ${args.mintAddress} is not a valid Solana address`,
        });
      }

      const fromPubkey = walletProvider.getPublicKey();
      const toPubkey = new PublicKey(args.recipient);
      const mintPubkey = new PublicKey(args.mintAddress);

      const {
        getAssociatedTokenAddress,
        createAssociatedTokenAccountInstruction,
        createTransferCheckedInstruction,
      } = await import("@solana/spl-token");

      // Calculate the raw amount using user-provided decimals
      const adjustedAmount = args.amount * Math.pow(10, args.decimals);

      // Calculate ATA addresses (no chain queries needed)
      const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
      const destinationAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);

      const instructions: TransactionInstruction[] = [];

      // Always add create ATA instruction (chain will handle if it already exists)
      instructions.push(
        createAssociatedTokenAccountInstruction(fromPubkey, destinationAta, toPubkey, mintPubkey),
      );

      // Add transfer instruction
      instructions.push(
        createTransferCheckedInstruction(
          sourceAta,
          mintPubkey,
          destinationAta,
          fromPubkey,
          adjustedAmount,
          args.decimals,
        ),
      );

      // Build unsigned transaction with placeholder blockhash
      const tx = new VersionedTransaction(
        MessageV0.compile({
          payerKey: fromPubkey,
          instructions: instructions,
          recentBlockhash: "11111111111111111111111111111111", // Placeholder blockhash
        }),
      );

      // Serialize to base64
      const unsignedTransaction = Buffer.from(tx.serialize()).toString("base64");

      return JSON.stringify({
        success: true,
        message: "Successfully created unsigned SPL token transfer transaction",
        unsigned_message: unsignedTransaction,
        transactionType: "spl_transfer",
        mintAddress: args.mintAddress,
        recipient: args.recipient,
        amount: args.amount,
        decimals: args.decimals,
        adjustedAmount: adjustedAmount.toString(),
        requiresBlockhashUpdate: true,
        note: "Update the blockhash before signing this transaction",
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to create transfer transaction",
        message: `Error creating SPL token transfer transaction: ${error}`,
      });
    }
  }

  /**
   * Checks if the action provider supports the given network.
   * Only supports Solana networks.
   *
   * @param network - The network to check support for
   * @returns True if the network is a Solana network
   */
  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "svm";
  }

  /**
   * Validates if a string is a valid Solana address.
   *
   * @param address - The address string to validate
   * @returns True if the address is valid, false otherwise
   */
  private validateSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create a new SplActionProvider instance.
 *
 * @returns A new SplActionProvider instance
 */
export const splActionProvider = () => new SplActionProvider();
