/**
 * Configuration options for the Magic Eden Action Provider
 */
export interface MagicEdenActionProviderConfig {
  /**
   * Magic Eden API Key (optional)
   * If not provided, will use MAGIC_EDEN_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Base URL for Magic Eden API (optional)
   * Defaults to https://api-mainnet.magiceden.dev/v2
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds (optional)
   * Defaults to 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Magic Eden NFT Listing response structure
 */
export interface MagicEdenListing {
  pdaAddress: string;
  auctionHouse?: string;
  tokenAddress: string;
  tokenMint?: string;
  seller: string;
  sellerReferral?: string;
  tokenSize?: number;
  price: number;
  priceInfo?: {
    solPrice: {
      rawAmount: string;
      address: string;
      decimals: number;
    };
  };
  rarity?: any;
  extra?: any;
  expiry?: number;
  token?: any;
  listingSource?: string;
}

/**
 * Magic Eden buy transaction response structure
 */
export interface MagicEdenBuyTransactionResponse {
  v0: {
    tx: {
      type: string;
      data: number[];
    };
    txSigned: {
      type: string;
      data: number[];
    };
  };
}

/**
 * Magic Eden NFT token information
 */
export interface MagicEdenNftInfo {
  mintAddress: string;
  owner: string;
  supply: number;
  collection: string;
  name: string;
  updateAuthority: string;
  primarySaleHappened: boolean;
  sellerFeeBasisPoints: number;
  image: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
}
