import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { SvmWalletProvider } from "../../wallet-providers/svmWalletProvider";
import { z } from "zod";
import { CreateAction } from "../actionDecorator";
import { CreateTokenSchema, BuyTokenSchema, CreateAndBuyTokenSchema } from "./schemas";
import { Keypair } from "@solana/web3.js";

/**
 * Token metadata interface for Pump.fun
 */
interface CreateTokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

/**
 * PumpfunActionProvider handles token creation and trading on Pump.fun.
 * All actions return unsigned transaction messages for manual signing.
 */
export class PumpfunActionProvider extends ActionProvider<SvmWalletProvider> {
  constructor() {
    super("pumpfun", []);
  }

  /**
   * Creates a new token on Pump.fun.
   *
   * @param walletProvider - The wallet provider for the transaction
   * @param args - Token creation parameters
   * @returns A JSON string containing the unsigned transaction message
   */
  @CreateAction({
    name: "create_token",
    description: `
    Creates a new token on Pump.fun and returns an unsigned transaction message.
    - Creates token metadata on IPFS
    - Generates mint keypair for the new token
    - Returns unsigned transaction data for manual signing
    - User must sign and broadcast the transaction separately
    NOTE: Only available on Solana mainnet.
    `,
    schema: CreateTokenSchema,
  })
  async createToken(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof CreateTokenSchema>,
  ): Promise<string> {
    try {
      // Create token metadata first
      const metadata = await this.createTokenMetadata({
        name: args.name,
        symbol: args.symbol,
        description: args.description,
        imageUrl: args.imageUrl,
        twitter: args.twitter,
        telegram: args.telegram,
        website: args.website,
      });

      const mint = Keypair.generate();
      const userPublicKey = walletProvider.getPublicKey();

      // Build unsigned transaction for token creation
      const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: userPublicKey.toString(),
          action: "create",
          tokenMetadata: {
            name: metadata.metadata.name,
            symbol: metadata.metadata.symbol,
            uri: metadata.metadataUri,
          },
          mint: mint.publicKey.toBase58(),
          denominatedInSol: "true",
          amount: 0, // Only create, don't buy
          slippage: 5,
          priorityFee: 0.0005,
          pool: "pump",
        }),
      });

      if (response.status !== 200) {
        throw new Error(`Failed to create token: ${response.statusText}`);
      }

      const transactionData = await response.arrayBuffer();
      const unsignedTransaction = Buffer.from(transactionData).toString("base64");

      return JSON.stringify({
        success: true,
        message: "Successfully created unsigned token creation transaction",
        unsigned_message: unsignedTransaction,
        transactionType: "pumpfun_create_token",
        tokenMint: mint.publicKey.toBase58(),
        tokenMetadata: {
          name: args.name,
          symbol: args.symbol,
          description: args.description,
          imageUrl: args.imageUrl,
          twitter: args.twitter,
          telegram: args.telegram,
          website: args.website,
        },
        mintKeypair: {
          publicKey: mint.publicKey.toBase58(),
          secretKey: Array.from(mint.secretKey), // Return as array for easy conversion
        },
        pumpfunUrl: `https://pump.fun/coin/${mint.publicKey.toBase58()}`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to create token",
        message: `Error: ${error}`,
      });
    }
  }

  /**
   * Buys a token on Pump.fun.
   *
   * @param walletProvider - The wallet provider for the transaction
   * @param args - Token purchase parameters
   * @returns A JSON string containing the unsigned transaction message
   */
  @CreateAction({
    name: "buy_token",
    description: `
    Buys a token on Pump.fun and returns an unsigned transaction message.
    - Creates unsigned buy transaction for the specified token
    - Returns unsigned transaction data for manual signing
    - User must sign and broadcast the transaction separately
    NOTE: Only available on Solana mainnet.
    `,
    schema: BuyTokenSchema,
  })
  async buyToken(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof BuyTokenSchema>,
  ): Promise<string> {
    try {
      const userPublicKey = walletProvider.getPublicKey();

      // Build unsigned transaction for token purchase
      const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: userPublicKey.toString(),
          action: "buy",
          mint: args.tokenMint,
          denominatedInSol: "true",
          amount: args.amountInSol,
          slippage: args.slippage,
          priorityFee: args.priorityFee,
          pool: "pump",
        }),
      });

      if (response.status !== 200) {
        throw new Error(`Failed to buy token: ${response.statusText}`);
      }

      const transactionData = await response.arrayBuffer();
      const unsignedTransaction = Buffer.from(transactionData).toString("base64");

      return JSON.stringify({
        success: true,
        message: "Successfully created unsigned token purchase transaction",
        unsigned_message: unsignedTransaction,
        transactionType: "pumpfun_buy_token",
        tokenMint: args.tokenMint,
        amountInSol: args.amountInSol,
        slippage: args.slippage,
        priorityFee: args.priorityFee,
        pumpfunUrl: `https://pump.fun/coin/${args.tokenMint}`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to buy token",
        message: `Error: ${error}`,
      });
    }
  }

  /**
   * Creates a new token and optionally buys it on Pump.fun in a single transaction.
   *
   * @param walletProvider - The wallet provider for the transaction
   * @param args - Token creation and purchase parameters
   * @returns A JSON string containing the unsigned transaction message
   */
  @CreateAction({
    name: "create_and_buy_token",
    description: `
    Creates a new token and optionally buys it on Pump.fun in a single transaction.
    Returns an unsigned transaction message for manual signing.
    - Creates token metadata on IPFS
    - Generates mint keypair for the new token
    - Optionally includes initial token purchase
    - Returns unsigned transaction data for manual signing
    - User must sign and broadcast the transaction separately
    NOTE: Only available on Solana mainnet.
    `,
    schema: CreateAndBuyTokenSchema,
  })
  async createAndBuyToken(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof CreateAndBuyTokenSchema>,
  ): Promise<string> {
    try {
      // Create token metadata first
      const metadata = await this.createTokenMetadata({
        name: args.name,
        symbol: args.symbol,
        description: args.description,
        imageUrl: args.imageUrl,
        twitter: args.twitter,
        telegram: args.telegram,
        website: args.website,
      });

      const mint = Keypair.generate();
      const userPublicKey = walletProvider.getPublicKey();

      // Build unsigned transaction for token creation and optional purchase
      const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: userPublicKey.toString(),
          action: "create",
          tokenMetadata: {
            name: metadata.metadata.name,
            symbol: metadata.metadata.symbol,
            uri: metadata.metadataUri,
          },
          mint: mint.publicKey.toBase58(),
          denominatedInSol: "true",
          amount: args.amountToBuyInSol,
          slippage: args.slippage,
          priorityFee: args.priorityFee,
          pool: "pump",
        }),
      });

      if (response.status !== 200) {
        throw new Error(`Failed to create and buy token: ${response.statusText}`);
      }

      const transactionData = await response.arrayBuffer();
      const unsignedTransaction = Buffer.from(transactionData).toString("base64");

      return JSON.stringify({
        success: true,
        message: args.amountToBuyInSol > 0 
          ? "Successfully created unsigned token creation and purchase transaction"
          : "Successfully created unsigned token creation transaction",
        unsigned_message: unsignedTransaction,
        transactionType: "pumpfun_create_and_buy_token",
        tokenMint: mint.publicKey.toBase58(),
        tokenMetadata: {
          name: args.name,
          symbol: args.symbol,
          description: args.description,
          imageUrl: args.imageUrl,
          twitter: args.twitter,
          telegram: args.telegram,
          website: args.website,
        },
        amountToBuyInSol: args.amountToBuyInSol,
        slippage: args.slippage,
        priorityFee: args.priorityFee,
        mintKeypair: {
          publicKey: mint.publicKey.toBase58(),
          secretKey: Array.from(mint.secretKey), // Return as array for easy conversion
        },
        pumpfunUrl: `https://pump.fun/coin/${mint.publicKey.toBase58()}`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to create and buy token",
        message: `Error: ${error}`,
      });
    }
  }

  /**
   * Creates token metadata on IPFS via Pump.fun API.
   * 
   * @param metadata - Token metadata to upload
   * @returns The uploaded metadata response with URI
   */
  private async createTokenMetadata(metadata: CreateTokenMetadata) {
    try {
      // Download imageUrl and create file
      const imageResponse = await fetch(metadata.imageUrl);
      const imageBlob = await imageResponse.blob();
      const file = new File([imageBlob], "image.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", metadata.name);
      formData.append("symbol", metadata.symbol);
      formData.append("description", metadata.description);
      formData.append("showName", "true");

      if (metadata.twitter) {
        formData.append("twitter", metadata.twitter);
      }
      if (metadata.telegram) {
        formData.append("telegram", metadata.telegram);
      }
      if (metadata.website) {
        formData.append("website", metadata.website);
      }

      const response = await fetch("https://pump.fun/api/ipfs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload metadata: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to create token metadata: ${error}`);
    }
  }

  /**
   * Checks if the action provider supports the given network.
   * Pumpfun only works on Solana mainnet.
   *
   * @param network - The network to check
   * @returns True if the network is supported, false otherwise
   */
  supportsNetwork = (network: Network) => {
    return network.protocolFamily === "solana" && network.networkId === "solana-mainnet";
  };
}

export const pumpfunActionProvider = () => new PumpfunActionProvider(); 