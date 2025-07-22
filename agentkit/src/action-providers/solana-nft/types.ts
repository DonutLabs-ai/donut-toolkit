/**
 * Configuration options for Solana NFT Action Provider
 */
export interface SolanaNftActionProviderConfig {
  /** RPC endpoint URL (optional, uses wallet provider connection if not specified) */
  rpcUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * NFT information structure
 */
export interface NftInfo {
  /** Mint address of the NFT */
  mintAddress: string;
  /** Current owner address */
  owner: string;
  /** NFT name */
  name?: string;
  /** NFT symbol */
  symbol?: string;
  /** NFT description */
  description?: string;
  /** Image URL */
  image?: string;
  /** External URL */
  externalUrl?: string;
  /** NFT attributes */
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  /** Collection information */
  collection?: {
    name?: string;
    family?: string;
    verified?: boolean;
  };
  /** Creator information */
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
  /** Seller fee basis points (royalty) */
  sellerFeeBasisPoints?: number;
  /** Whether primary sale has happened */
  primarySaleHappened?: boolean;
  /** Whether the NFT is mutable */
  isMutable?: boolean;
}

/**
 * NFT transfer result structure
 */
export interface NftTransferResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Status message */
  message: string;
  /** Base64 encoded unsigned transaction */
  unsignedTransaction?: string;
  /** Transaction type identifier */
  transactionType?: string;
  /** Asset ID that was transferred */
  assetId?: string;
  /** Recipient address */
  recipient?: string;
  /** Whether blockhash update is required */
  requiresBlockhashUpdate?: boolean;
  /** Additional notes */
  note?: string;
  /** Error message if operation failed */
  error?: string;
}
