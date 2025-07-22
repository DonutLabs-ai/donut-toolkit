import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { SvmWalletProvider } from "../../wallet-providers/svmWalletProvider";
import { z } from "zod";
import { CreateAction } from "../actionDecorator";
import { TransferNftSchema, GetSolanaNftInfoSchema } from "./schemas";
import { SolanaNftActionProviderConfig, NftInfo, NftTransferResult } from "./types";
import {
  PublicKey,
  VersionedTransaction,
  MessageV0,
  TransactionInstruction,
} from "@solana/web3.js";

/**
 * SolanaNftActionProvider serves as a provider for Solana NFT actions.
 * It provides NFT transfer and information retrieval functionality.
 */
export class SolanaNftActionProvider extends ActionProvider<SvmWalletProvider> {
  private readonly rpcUrl?: string;
  private readonly timeout: number;

  /**
   * Creates a new SolanaNftActionProvider instance.
   *
   * @param config - Configuration options for the provider
   */
  constructor(config: SolanaNftActionProviderConfig = {}) {
    super("solana_nft", []);

    this.rpcUrl = config.rpcUrl;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Get NFT information including metadata and ownership details.
   *
   * @param walletProvider - The wallet provider to use
   * @param args - Parameters including asset ID and optional target address
   * @returns A JSON string containing the NFT information
   */
  @CreateAction({
    name: "get_nft_info",
    description: `
    This tool will get information about an NFT on Solana.
    - Asset ID must be a valid NFT mint address
    - If no address is provided, checks ownership for the connected wallet
    - Returns detailed NFT metadata including name, description, image, attributes, and ownership info
    - Also returns collection and creator information if available
    `,
    schema: GetSolanaNftInfoSchema,
  })
  async getNftInfo(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof GetSolanaNftInfoSchema>,
  ): Promise<string> {
    try {
      if (!args.address) {
        args.address = walletProvider.getAddress();
      }

      const connection = walletProvider.getConnection();
      const mintPubkey = new PublicKey(args.assetId);
      const ownerPubkey = new PublicKey(args.address);

      // Get token account information
      const { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError } = await import(
        "@solana/spl-token"
      );

      let isOwned = false;

      try {
        const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey);
        const tokenAccount = await getAccount(connection, ata);
        isOwned = Number(tokenAccount.amount) > 0;
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          isOwned = false;
        } else {
          throw error;
        }
      }

      // Get NFT metadata - simplified approach
      let metadata: any = null;
      let metadataContent: any = null;

      try {
        // Try to get metadata using token metadata program if available
        const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
          "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
        );

        const [metadataPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
          TOKEN_METADATA_PROGRAM_ID,
        );

        try {
          const metadataAccount = await connection.getAccountInfo(metadataPDA);
          if (metadataAccount) {
            // Basic metadata parsing - simplified without full Metaplex dependency
            const metadataBuffer = metadataAccount.data;

            // Extract basic information from metadata account
            // This is a simplified parser - in production, use @metaplex-foundation/mpl-token-metadata
            let offset = 1 + 32 + 32; // Skip key + update authority + mint

            // Read name (first 4 bytes are length, then string)
            const nameLength = metadataBuffer.readUInt32LE(offset);
            offset += 4;
            const name = metadataBuffer
              .slice(offset, offset + nameLength)
              .toString("utf8")
              .replace(/\0/g, "");
            offset += 32; // Fixed size field

            // Read symbol
            const symbolLength = metadataBuffer.readUInt32LE(offset);
            offset += 4;
            const symbol = metadataBuffer
              .slice(offset, offset + symbolLength)
              .toString("utf8")
              .replace(/\0/g, "");
            offset += 10; // Fixed size field

            // Read URI
            const uriLength = metadataBuffer.readUInt32LE(offset);
            offset += 4;
            const uri = metadataBuffer
              .slice(offset, offset + uriLength)
              .toString("utf8")
              .replace(/\0/g, "");

            metadata = {
              data: {
                name,
                symbol,
                uri,
              },
            };

            // Fetch off-chain metadata if URI is available
            if (uri && uri.startsWith("http")) {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(uri, {
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);

                if (response.ok) {
                  metadataContent = await response.json();
                }
              } catch (fetchError) {
                console.warn("Failed to fetch off-chain metadata:", fetchError);
              }
            }
          }
        } catch (metadataError) {
          console.warn("Failed to fetch on-chain metadata:", metadataError);
        }
      } catch (importError) {
        console.warn("Metadata parsing not available:", importError);
      }

      const nftInfo: NftInfo = {
        mintAddress: args.assetId,
        owner: isOwned ? args.address : "Not owned by specified address",
        name: metadata?.data?.name || metadataContent?.name || "Unknown",
        symbol: metadata?.data?.symbol || metadataContent?.symbol || "Unknown",
        description: metadataContent?.description || "No description available",
        image: metadataContent?.image || metadataContent?.image_uri || null,
        externalUrl: metadataContent?.external_url || null,
        attributes: metadataContent?.attributes || [],
        collection: metadataContent?.collection
          ? {
              name: metadataContent?.collection?.name || "Unknown",
              family: metadataContent?.collection?.family || "Unknown",
              verified: false,
            }
          : undefined,
        creators: [],
        sellerFeeBasisPoints: metadataContent?.seller_fee_basis_points || 0,
        primarySaleHappened: false,
        isMutable: true,
      };

      return JSON.stringify({
        success: true,
        message: `Successfully retrieved NFT information for ${args.assetId}`,
        nft: nftInfo,
        isOwnedByAddress: isOwned,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to get NFT information",
        message: `Error getting NFT information: ${error}`,
      });
    }
  }

  /**
   * Transfer an NFT to another address.
   *
   * @param walletProvider - The wallet provider to get the user's public key
   * @param args - Transfer parameters including recipient address and asset ID
   * @returns A JSON string containing the unsigned transaction message
   */
  @CreateAction({
    name: "transfer_nft",
    description: `
    Creates an unsigned NFT transfer transaction.
    - Recipient must be a valid Solana address
    - Asset ID must be a valid NFT mint address
    - Returns unsigned transaction data for manual signing
    - User must sign and broadcast the transaction separately
    - Note: User should update blockhash before signing
    - Supports regular NFTs (compressed NFTs require additional dependencies)
    `,
    schema: TransferNftSchema,
  })
  async transferNft(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof TransferNftSchema>,
  ): Promise<string> {
    try {
      const fromPubkey = walletProvider.getPublicKey();
      const toPubkey = new PublicKey(args.recipient);
      const mintPubkey = new PublicKey(args.assetId);

      const instructions: TransactionInstruction[] = [];

      // Handle regular NFT transfer using SPL Token
      const {
        getAssociatedTokenAddress,
        createAssociatedTokenAccountInstruction,
        createTransferInstruction,
      } = await import("@solana/spl-token");

      // Calculate ATA addresses
      const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
      const destinationAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);

      // Add create ATA instruction for recipient (will be ignored if already exists)
      instructions.push(
        createAssociatedTokenAccountInstruction(fromPubkey, destinationAta, toPubkey, mintPubkey),
      );

      // Add transfer instruction (NFTs have amount = 1, decimals = 0)
      instructions.push(
        createTransferInstruction(
          sourceAta,
          destinationAta,
          fromPubkey,
          1, // NFTs always have amount = 1
        ),
      );

      if (instructions.length === 0) {
        throw new Error("Failed to create transfer instructions");
      }

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

      const result: NftTransferResult = {
        success: true,
        message: "Successfully created unsigned NFT transfer transaction",
        unsignedTransaction,
        transactionType: "nft_transfer",
        assetId: args.assetId,
        recipient: args.recipient,
        requiresBlockhashUpdate: true,
        note: "Update the blockhash before signing this transaction. This implementation supports regular NFTs only.",
      };

      return JSON.stringify(result);
    } catch (error) {
      const result: NftTransferResult = {
        success: false,
        error: "Failed to create transfer transaction",
        message: `Error creating NFT transfer transaction: ${error}`,
      };

      return JSON.stringify(result);
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
}

/**
 * Factory function to create a new SolanaNftActionProvider instance.
 *
 * @param config - Configuration options for the provider
 * @returns A new SolanaNftActionProvider instance
 */
export const solanaNftActionProvider = (config?: SolanaNftActionProviderConfig) =>
  new SolanaNftActionProvider(config);
