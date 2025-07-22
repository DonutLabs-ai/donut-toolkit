import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { SvmWalletProvider } from "../../wallet-providers/svmWalletProvider";
import { z } from "zod";
import { CreateAction } from "../actionDecorator";
import { GetNftListingsSchema, BuyNftListingSchema, GetNftInfoSchema } from "./schemas";
import {
  MagicEdenActionProviderConfig,
  MagicEdenListing,
  MagicEdenBuyTransactionResponse,
  MagicEdenNftInfo,
} from "./types";
import { PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * Magic Eden Action Provider handles NFT marketplace interactions using Magic Eden's API.
 * Supports getting NFT listings, buying NFTs, and retrieving NFT information.
 */
export class MagicEdenActionProvider extends ActionProvider<SvmWalletProvider> {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  /**
   * Creates a new Magic Eden Action Provider instance.
   *
   * @param config - Configuration options for the provider
   */
  constructor(config: MagicEdenActionProviderConfig = {}) {
    super("magiceden", []);

    // API Key management following coinbase_agentkit pattern
    this.apiKey = config.apiKey || process.env.MAGIC_EDEN_API_KEY;
    this.baseUrl = config.baseUrl || "https://api-mainnet.magiceden.dev/v2";
    this.timeout = config.timeout || 30000;
  }

  /**
   * Get NFT listings from Magic Eden marketplace.
   *
   * @param walletProvider - The wallet provider (not used for this read-only operation)
   * @param args - Parameters including mint hash and optional pagination
   * @returns A JSON string containing the NFT listings or error message
   */
  @CreateAction({
    name: "get_nft_listings",
    description: `
    Get NFT listings from Magic Eden marketplace.
    
    This tool retrieves current market listings for an NFT by its mint address.
    - Returns active listings with prices, sellers, and other details
    - Supports pagination with offset and limit parameters
    - No wallet interaction required (read-only operation)
    
    Returns a JSON array of listings with:
    - price: Listing price in SOL
    - seller: Seller wallet address
    - tokenAddress: Associated token account address
    - auctionHouse: Auction house address (if applicable)
    - expiry: Listing expiration timestamp
    `,
    schema: GetNftListingsSchema,
  })
  async getNftListings(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof GetNftListingsSchema>,
  ): Promise<string> {
    try {
      const url = `${this.baseUrl}/tokens/${args.mintHash}/listings`;
      const params = new URLSearchParams();

      if (args.offset !== undefined) {
        params.append("offset", args.offset.toString());
      }

      if (args.limit !== undefined) {
        params.append("limit", Math.min(args.limit, 100).toString());
      }

      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Magic Eden API error: ${response.status} ${response.statusText}`);
      }

      const listings: MagicEdenListing[] = await response.json();

      if (!listings || listings.length === 0) {
        return JSON.stringify({
          success: true,
          listings: [],
          message: `No active listings found for NFT ${args.mintHash}`,
        });
      }

      // Format listings for better readability
      const formattedListings = listings.map(listing => ({
        seller: listing.seller,
        price: listing.price,
        priceSOL: listing.price / LAMPORTS_PER_SOL,
        tokenAddress: listing.tokenAddress,
        auctionHouse: listing.auctionHouse,
        expiry: listing.expiry,
        listingSource: listing.listingSource,
      }));

      return JSON.stringify({
        success: true,
        listings: formattedListings,
        totalListings: listings.length,
        mintHash: args.mintHash,
        message: `Found ${listings.length} active listings for NFT ${args.mintHash}`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to get NFT listings: ${error}`,
        message: `Error retrieving listings for NFT ${args.mintHash}: ${error}`,
      });
    }
  }

  /**
   * Buy an NFT listing from Magic Eden marketplace.
   *
   * @param walletProvider - The wallet provider to use for the purchase
   * @param args - Parameters including mint hash, max price, and optional seller
   * @returns A JSON string containing the unsigned transaction or error message
   */
  @CreateAction({
    name: "buy_nft_listing",
    description: `
    Buy an NFT listing from Magic Eden marketplace.
    
    This tool creates an unsigned transaction to purchase an NFT from Magic Eden:
    - Finds the best available listing (lowest price)
    - Validates the purchase against maxPrice if specified
    - Checks wallet SOL balance before creating transaction
    - Returns unsigned transaction data for manual signing
    - Supports buying from specific seller if seller address provided
    
    IMPORTANT: This only creates an unsigned transaction. The transaction must be signed and sent separately.
    
    Parameters:
    - mintHash: NFT mint address to purchase
    - maxPrice: Maximum price willing to pay in SOL (optional safety check)
    - seller: Specific seller address to buy from (optional)
    `,
    schema: BuyNftListingSchema,
  })
  async buyNftListing(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof BuyNftListingSchema>,
  ): Promise<string> {
    try {
      // Step 1: Get NFT listings
      const listingsResponse = await this.getNftListings(walletProvider, {
        mintHash: args.mintHash,
      });
      const listingsData = JSON.parse(listingsResponse);

      if (!listingsData.success || listingsData.listings.length === 0) {
        return JSON.stringify({
          success: false,
          error: "No active listings found",
          message: `No active listings found for NFT ${args.mintHash}`,
        });
      }

      // Step 2: Find the best listing
      let selectedListing = listingsData.listings[0];

      // Filter by seller if specified
      if (args.seller) {
        const sellerListings = listingsData.listings.filter(
          (listing: any) => listing.seller === args.seller,
        );

        if (sellerListings.length === 0) {
          return JSON.stringify({
            success: false,
            error: "No listings from specified seller",
            message: `No listings found from seller ${args.seller} for NFT ${args.mintHash}`,
          });
        }

        selectedListing = sellerListings[0];
      }

      // Step 3: Validate max price
      if (args.maxPrice && selectedListing.priceSOL > args.maxPrice) {
        return JSON.stringify({
          success: false,
          error: "Price exceeds maximum",
          message: `Listing price ${selectedListing.priceSOL} SOL exceeds maximum price ${args.maxPrice} SOL`,
        });
      }

      // Step 4: Check wallet balance
      const connection = walletProvider.getConnection();
      const walletPublicKey = walletProvider.getPublicKey();
      const balance = await connection.getBalance(walletPublicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;

      if (balanceSOL < selectedListing.priceSOL + 0.01) {
        // 0.01 SOL buffer for fees
        return JSON.stringify({
          success: false,
          error: "Insufficient SOL balance",
          message: `Insufficient balance. Need ${selectedListing.priceSOL + 0.01} SOL, have ${balanceSOL} SOL`,
        });
      }

      // Step 5: Get buy transaction from Magic Eden
      const buyTransactionResponse = await this.getBuyTransaction(
        walletProvider,
        args.mintHash,
        selectedListing,
      );

      if (!buyTransactionResponse.success) {
        return JSON.stringify(buyTransactionResponse);
      }

      return JSON.stringify({
        success: true,
        unsignedTransaction: buyTransactionResponse.unsignedTransaction,
        transactionType: "magic_eden_buy",
        nftMint: args.mintHash,
        price: selectedListing.price,
        priceSOL: selectedListing.priceSOL,
        seller: selectedListing.seller,
        tokenAddress: selectedListing.tokenAddress,
        auctionHouse: selectedListing.auctionHouse,
        message: `Unsigned buy transaction created for NFT ${args.mintHash} at ${selectedListing.priceSOL} SOL`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to create buy transaction: ${error}`,
        message: `Error creating buy transaction for NFT ${args.mintHash}: ${error}`,
      });
    }
  }

  /**
   * Get NFT information from Magic Eden.
   *
   * @param walletProvider - The wallet provider (not used for this read-only operation)
   * @param args - Parameters including mint hash
   * @returns A JSON string containing the NFT information or error message
   */
  @CreateAction({
    name: "get_nft_info",
    description: `
    Get detailed NFT information from Magic Eden.
    
    This tool retrieves comprehensive information about an NFT:
    - Basic token information (name, symbol, supply)
    - Metadata (image, attributes, description)
    - Collection information
    - Creator details and royalties
    - Current owner information
    
    No wallet interaction required (read-only operation).
    `,
    schema: GetNftInfoSchema,
  })
  async getNftInfo(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof GetNftInfoSchema>,
  ): Promise<string> {
    try {
      const url = `${this.baseUrl}/tokens/${args.mintHash}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Magic Eden API error: ${response.status} ${response.statusText}`);
      }

      const nftInfo: MagicEdenNftInfo = await response.json();

      return JSON.stringify({
        success: true,
        nftInfo: {
          mintAddress: nftInfo.mintAddress,
          name: nftInfo.name,
          collection: nftInfo.collection,
          owner: nftInfo.owner,
          image: nftInfo.image,
          animationUrl: nftInfo.animationUrl,
          externalUrl: nftInfo.externalUrl,
          attributes: nftInfo.attributes,
          creators: nftInfo.properties?.creators || [],
          sellerFeeBasisPoints: nftInfo.sellerFeeBasisPoints,
          primarySaleHappened: nftInfo.primarySaleHappened,
        },
        message: `Successfully retrieved information for NFT ${args.mintHash}`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to get NFT information: ${error}`,
        message: `Error retrieving information for NFT ${args.mintHash}: ${error}`,
      });
    }
  }

  /**
   * Helper method to get buy transaction from Magic Eden API
   *
   * @param walletProvider
   * @param mintHash
   * @param listing
   */
  private async getBuyTransaction(
    walletProvider: SvmWalletProvider,
    mintHash: string,
    listing: any,
  ): Promise<{ success: boolean; unsignedTransaction?: string; error?: string; message?: string }> {
    try {
      const buyer = walletProvider.getAddress();

      const queryParams = new URLSearchParams({
        buyer: buyer,
        seller: listing.seller,
        tokenMint: mintHash,
        tokenATA: listing.tokenAddress,
        price: listing.price.toString(),
        ...(listing.auctionHouse ? { auctionHouseAddress: listing.auctionHouse } : {}),
      });

      const url = `${this.baseUrl}/instructions/buy_now?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Magic Eden buy API error: ${response.status} ${response.statusText}`);
      }

      const data: MagicEdenBuyTransactionResponse = await response.json();

      // Convert the transaction data to base64
      const transactionBuffer = Buffer.from(data.v0.tx.data);
      const unsignedTransaction = transactionBuffer.toString("base64");

      return {
        success: true,
        unsignedTransaction: unsignedTransaction,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get buy transaction: ${error}`,
        message: `Error getting buy transaction from Magic Eden: ${error}`,
      };
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
    return network.protocolFamily === "svm" && network.networkId === "solana-mainnet";
  }
}

/**
 * Factory function to create a new Magic Eden Action Provider instance.
 *
 * @param config - Configuration options for the provider
 * @returns A new Magic Eden Action Provider instance
 */
export const magicEdenActionProvider = (config?: MagicEdenActionProviderConfig) =>
  new MagicEdenActionProvider(config);
