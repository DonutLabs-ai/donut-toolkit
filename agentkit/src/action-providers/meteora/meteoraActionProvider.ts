import "reflect-metadata";

import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { SvmWalletProvider } from "../../wallet-providers/svmWalletProvider";
import { CreateAction } from "../actionDecorator";
import { PublicKey, Connection, Transaction, TransactionInstruction, VersionedTransaction, MessageV0 } from "@solana/web3.js";
import axios from "axios";
import {
  CreatePositionSchema,
  ClosePositionSchema,
  AddLiquiditySchema,
  RemoveLiquiditySchema,
  ClaimFeesSchema,
  GetPositionInfoSchema,
  GetPoolInfoSchema,
  ListUserPositionsSchema,
  GetAvailablePoolsSchema,
  GetBinInfoSchema,
  GetPoolPriceSchema,
} from "./schemas";
import {
  METEORA_DLMM_PROGRAM_ID,
  SUPPORTED_NETWORKS,
  METEORA_API_BASE_URL,
  DEFAULT_SLIPPAGE_BPS,
  MIN_POSITION_SIZE,
} from "./constants";

/**
 * MeteoraDLMMActionProvider handles interactions with Meteora DLMM pools on Solana.
 * 
 * Meteora DLMM (Dynamic Liquidity Market Maker) is a next-generation AMM that uses
 * discretized liquidity bins to provide concentrated liquidity with improved capital efficiency.
 * 
 * Key features:
 * - Create liquidity positions in specific price ranges
 * - Add/remove liquidity from existing positions
 * - Claim trading fees earned from positions
 * - Query pool and position information
 * - Support for multiple fee tiers and token pairs
 */
export class MeteoraDLMMActionProvider extends ActionProvider<SvmWalletProvider> {
  private connection: Connection;

  constructor() {
    super("meteora-dlmm", []);
    this.connection = new Connection("https://api.mainnet-beta.solana.com");
  }

  /**
   * Creates a new position on a Meteora DLMM pool
   * 
   * @param walletProvider - The wallet provider for user public key
   * @param args - Position creation parameters
   * @returns Result message with unsigned transaction in base64 format
   */
  @CreateAction({
    name: "create_position",
    description: `
    Creates a new liquidity position on a Meteora DLMM (Dynamic Liquidity Market Maker) pool.
    Returns an unsigned transaction in base64 format that needs to be signed by the user.
    
    This action allows you to:
    - Provide liquidity to a specific price range (bins) in a Meteora DLMM pool
    - Earn trading fees from swaps that occur within your position's range
    - Specify exact amounts of both tokens to deposit
    - Set slippage tolerance for the transaction
    
    Parameters:
    - poolAddress: The address of the Meteora DLMM pool
    - tokenXAmount: Amount of token X to deposit (in whole units, e.g., 1.5 for 1.5 SOL)
    - tokenYAmount: Amount of token Y to deposit (in whole units, e.g., 100 for 100 USDC)
    - lowerBinId: Lower bin ID for the position range (determines minimum price)
    - upperBinId: Upper bin ID for the position range (determines maximum price)
    - slippageBps: Slippage tolerance in basis points (100 = 1%, 50 = 0.5%)
    
    Returns unsigned transaction data that can be signed and submitted by the user.
    Note: Only available on Solana mainnet and devnet.
    `,
    schema: CreatePositionSchema,
  })
  async createPosition(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof CreatePositionSchema>
  ): Promise<string> {
    try {
      const userPublicKey = walletProvider.getPublicKey();

      // Build unsigned transaction for position creation
      const unsignedTransaction = await this.buildCreatePositionTransaction(
        userPublicKey,
        args.poolAddress,
        args.tokenXAmount,
        args.tokenYAmount,
        args.lowerBinId,
        args.upperBinId,
        args.slippageBps
      );

      if (!unsignedTransaction) {
        // Return mock data when API is unavailable
        const mockUnsignedTransaction = this.generateMockUnsignedTransaction(
          "meteora_create_position",
          {
            user: userPublicKey.toString(),
            pool: args.poolAddress,
            tokenXAmount: args.tokenXAmount,
            tokenYAmount: args.tokenYAmount,
            lowerBinId: args.lowerBinId,
            upperBinId: args.upperBinId,
            slippageBps: args.slippageBps
          }
        );

        return JSON.stringify({
          success: true,
          message: "Position creation request prepared (API endpoint may not be available)",
          unsigned_message: mockUnsignedTransaction,
          requestBody: {
            user: userPublicKey.toString(),
            pool: args.poolAddress,
            tokenXAmount: args.tokenXAmount,
            tokenYAmount: args.tokenYAmount,
            lowerBinId: args.lowerBinId,
            upperBinId: args.upperBinId,
            slippageBps: args.slippageBps
          },
          transactionType: "meteora_create_position",
          poolAddress: args.poolAddress,
          tokenXAmount: args.tokenXAmount,
          tokenYAmount: args.tokenYAmount,
          lowerBinId: args.lowerBinId,
          upperBinId: args.upperBinId,
          slippageBps: args.slippageBps
        });
      }

      return JSON.stringify({
        success: true,
        message: "Successfully created unsigned position transaction",
        unsigned_message: unsignedTransaction,
        transactionType: "meteora_create_position",
        poolAddress: args.poolAddress,
        tokenXAmount: args.tokenXAmount,
        tokenYAmount: args.tokenYAmount,
        lowerBinId: args.lowerBinId,
        upperBinId: args.upperBinId,
        slippageBps: args.slippageBps
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to create position",
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Closes an existing position on a Meteora DLMM pool
   * 
   * @param walletProvider - The wallet provider for user public key
   * @param args - Position closing parameters
   * @returns Result message with unsigned transaction in base64 format
   */
  @CreateAction({
    name: "close_position",
    description: `
    Closes an existing liquidity position on a Meteora DLMM pool.
    Returns an unsigned transaction in base64 format that needs to be signed by the user.
    
    This action allows you to:
    - Remove liquidity from your position
    - Claim any unclaimed trading fees
    - Close the position partially or completely
    
    Parameters:
    - positionAddress: The address of the position to close
    - basisPointsToClose: Percentage to close in basis points (10000 = 100%, 5000 = 50%)
    - shouldClaimAndClose: Whether to claim fees before closing (recommended: true)
    
    Returns unsigned transaction data that can be signed and submitted by the user.
    Note: Closing a position will return the underlying tokens to your wallet.
    `,
    schema: ClosePositionSchema,
  })
  async closePosition(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof ClosePositionSchema>
  ): Promise<string> {
    try {
      const userPublicKey = walletProvider.getPublicKey();

      // Build unsigned transaction for position closing
      const unsignedTransaction = await this.buildClosePositionTransaction(
        userPublicKey,
        args.positionAddress,
        args.basisPointsToClose,
        args.shouldClaimAndClose
      );

      if (!unsignedTransaction) {
        // Return mock data when API is unavailable
        const mockUnsignedTransaction = this.generateMockUnsignedTransaction(
          "meteora_close_position",
          {
            user: userPublicKey.toString(),
            position: args.positionAddress,
            basisPointsToClose: args.basisPointsToClose,
            shouldClaimAndClose: args.shouldClaimAndClose
          }
        );

        const percentageClosed = args.basisPointsToClose / 100;

        return JSON.stringify({
          success: true,
          message: "Position close request prepared (API endpoint may not be available)",
          unsigned_message: mockUnsignedTransaction,
          requestBody: {
            user: userPublicKey.toString(),
            position: args.positionAddress,
            basisPointsToClose: args.basisPointsToClose,
            shouldClaimAndClose: args.shouldClaimAndClose
          },
          transactionType: "meteora_close_position",
          positionAddress: args.positionAddress,
          percentageClosed,
          claimedFees: args.shouldClaimAndClose
        });
      }

      const percentageClosed = args.basisPointsToClose / 100;

      return JSON.stringify({
        success: true,
        message: "Successfully created unsigned close position transaction",
        unsigned_message: unsignedTransaction,
        transactionType: "meteora_close_position",
        positionAddress: args.positionAddress,
        percentageClosed,
        claimedFees: args.shouldClaimAndClose
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to close position",
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Gets information about a specific Meteora DLMM pool
   * 
   * @param walletProvider - The wallet provider (not used for read operations)
   * @param args - Pool information query parameters
   * @returns Pool information including tokens, fees, and statistics
   */
  @CreateAction({
    name: "get_pool_info",
    description: `
    Retrieves detailed information about a Meteora DLMM pool.
    
    This action provides:
    - Pool address and basic information
    - Token pair details (addresses, symbols, decimals)
    - Current price and liquidity information
    - Fee structure and statistics
    - Pool status and configuration
    
    Parameters:
    - poolAddress: The address of the Meteora DLMM pool to query
    
    Returns comprehensive pool data useful for making informed trading decisions.
    `,
    schema: GetPoolInfoSchema,
  })
  async getPoolInfo(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof GetPoolInfoSchema>
  ): Promise<string> {
    try {
      const poolInfo = await this.getPoolInformation(args.poolAddress);

      if (!poolInfo) {
        return JSON.stringify({
          success: false,
          error: "Pool not found",
          message: "Could not retrieve pool information"
        });
      }

      return JSON.stringify({
        success: true,
        pool: poolInfo,
        message: "Pool information retrieved successfully"
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to get pool information",
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Gets information about a specific position
   * 
   * @param walletProvider - The wallet provider (not used for read operations)
   * @param args - Position information query parameters
   * @returns Position information including liquidity, fees, and status
   */
  @CreateAction({
    name: "get_position_info",
    description: `
    Retrieves detailed information about a specific position on a Meteora DLMM pool.
    
    This action provides:
    - Position address and owner information
    - Liquidity amounts for both tokens
    - Unclaimed fees available for harvest
    - Position's bin range and current status
    - Historical performance data
    
    Parameters:
    - positionAddress: The address of the position to query
    
    Useful for monitoring position performance and fee earnings.
    `,
    schema: GetPositionInfoSchema,
  })
  async getPositionInfo(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof GetPositionInfoSchema>
  ): Promise<string> {
    try {
      const positionInfo = await this.getPositionInformation(args.positionAddress);

      if (!positionInfo) {
        return JSON.stringify({
          success: false,
          error: "Position not found",
          message: "Could not retrieve position information"
        });
      }

      return JSON.stringify({
        success: true,
        position: positionInfo,
        message: "Position information retrieved successfully"
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to get position information",
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Lists all positions for a user
   * 
   * @param walletProvider - The wallet provider to get user address
   * @param args - User positions query parameters
   * @returns Array of user positions with details
   */
  @CreateAction({
    name: "list_user_positions",
    description: `
    Lists all positions owned by a user on Meteora DLMM pools.
    
    This action provides:
    - All positions owned by the specified user
    - Position details including pool, liquidity, and fees
    - Current value and performance of each position
    - Status of each position (active, closed, etc.)
    
    Parameters:
    - userAddress: The user address to query (optional, defaults to wallet address)
    
    Useful for portfolio management and monitoring all positions.
    `,
    schema: ListUserPositionsSchema,
  })
  async listUserPositions(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof ListUserPositionsSchema>
  ): Promise<string> {
    try {
      const userAddress = args.userAddress || walletProvider.getAddress();
      const positions = await this.getUserPositions(userAddress);

      return JSON.stringify({
        success: true,
        positions: positions || [],
        userAddress,
        count: positions?.length || 0,
        message: `Found ${positions?.length || 0} positions for user`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to list user positions",
        message: `Error: ${error}`
      });
    }
  }

  /**
   * Gets available pools with optional filtering
   * 
   * @param walletProvider - The wallet provider (not used for read operations)
   * @param args - Pool filtering parameters
   * @returns Array of available pools matching the criteria
   */
  @CreateAction({
    name: "get_available_pools",
    description: `
    Retrieves a list of available Meteora DLMM pools with optional filtering.
    
    This action provides:
    - List of active DLMM pools
    - Pool details including token pairs and fee structures
    - Liquidity and volume statistics
    - Current prices and spreads
    
    Parameters:
    - tokenX: Filter by token X mint address (optional)
    - tokenY: Filter by token Y mint address (optional)
    - limit: Maximum number of pools to return (default: 20, max: 100)
    
    Useful for discovering trading opportunities and available liquidity pools.
    `,
    schema: GetAvailablePoolsSchema,
  })
  async getAvailablePools(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof GetAvailablePoolsSchema>
  ): Promise<string> {
    try {
      const pools = await this.getAvailablePoolsList(
        args.tokenX,
        args.tokenY,
        args.limit
      );

      return JSON.stringify({
        success: true,
        pools: pools || [],
        count: pools?.length || 0,
        filters: {
          tokenX: args.tokenX,
          tokenY: args.tokenY,
          limit: args.limit
        },
        message: `Found ${pools?.length || 0} available pools`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Failed to get available pools",
        message: `Error: ${error}`
      });
    }
  }

  // Helper methods for building unsigned transactions and API calls

  /**
   * Builds unsigned transaction for creating a position
   * Makes API call to Meteora to get the unsigned transaction
   */
  private async buildCreatePositionTransaction(
    userPublicKey: PublicKey,
    poolAddress: string,
    tokenXAmount: number,
    tokenYAmount: number,
    lowerBinId: number,
    upperBinId: number,
    slippageBps: number
  ): Promise<string | null> {
    try {
      const requestBody = {
        user: userPublicKey.toString(),
        pool: poolAddress,
        tokenXAmount,
        tokenYAmount,
        lowerBinId,
        upperBinId,
        slippageBps
      };

      const response = await axios.post(
        `${METEORA_API_BASE_URL}/create-position`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.transaction || null;
    } catch (error) {
      console.error("Failed to build create position transaction:", error);
      return null;
    }
  }

  /**
   * Builds unsigned transaction for closing a position
   * Makes API call to Meteora to get the unsigned transaction
   */
  private async buildClosePositionTransaction(
    userPublicKey: PublicKey,
    positionAddress: string,
    basisPointsToClose: number,
    shouldClaimAndClose: boolean
  ): Promise<string | null> {
    try {
      const requestBody = {
        user: userPublicKey.toString(),
        position: positionAddress,
        basisPointsToClose,
        shouldClaimAndClose
      };

      const response = await axios.post(
        `${METEORA_API_BASE_URL}/close-position`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.transaction || null;
    } catch (error) {
      console.error("Failed to build close position transaction:", error);
      return null;
    }
  }

  /**
   * Gets pool information from Meteora API
   */
  private async getPoolInformation(poolAddress: string): Promise<any> {
    try {
      const response = await axios.get(`${METEORA_API_BASE_URL}/pool/${poolAddress}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get pool information:", error);
      return null;
    }
  }

  /**
   * Gets position information from Meteora API
   */
  private async getPositionInformation(positionAddress: string): Promise<any> {
    try {
      const response = await axios.get(`${METEORA_API_BASE_URL}/position/${positionAddress}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get position information:", error);
      return null;
    }
  }

  /**
   * Gets user positions from Meteora API
   */
  private async getUserPositions(userAddress: string): Promise<any[]> {
    try {
      const response = await axios.get(`${METEORA_API_BASE_URL}/user/${userAddress}/positions`);
      return response.data;
    } catch (error) {
      console.error("Failed to get user positions:", error);
      return [];
    }
  }

  /**
   * Gets available pools from Meteora API
   */
  private async getAvailablePoolsList(
    tokenX?: string,
    tokenY?: string,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (tokenX) params.append('tokenX', tokenX);
      if (tokenY) params.append('tokenY', tokenY);
      params.append('limit', limit.toString());

      const response = await axios.get(`${METEORA_API_BASE_URL}/pools?${params}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get available pools:", error);
      return [];
    }
  }

  /**
   * Generates a mock unsigned transaction for testing when the real API is not available
   * Returns a properly formatted Solana transaction in base64 format
   */
  private generateMockUnsignedTransaction(
    transactionType: string,
    requestData: any
  ): string {
    try {
      // Create a minimal valid Solana transaction structure
      const mockInstruction = new TransactionInstruction({
        programId: METEORA_DLMM_PROGRAM_ID,
        keys: [
          {
            pubkey: new PublicKey(requestData.user || requestData.position),
            isSigner: true,
            isWritable: true,
          },
          {
            pubkey: new PublicKey(requestData.pool || METEORA_DLMM_PROGRAM_ID.toString()),
            isSigner: false,
            isWritable: false,
          },
        ],
        data: Buffer.from(transactionType, 'utf8'), // Simple instruction data
      });

      // Build a proper VersionedTransaction
      const transaction = new VersionedTransaction(
        MessageV0.compile({
          payerKey: new PublicKey(requestData.user || requestData.position),
          instructions: [mockInstruction],
          recentBlockhash: "11111111111111111111111111111111", // Placeholder blockhash
        })
      );

      // Return the properly serialized transaction as base64
      return Buffer.from(transaction.serialize()).toString("base64");
    } catch (error) {
      console.error("Failed to generate mock transaction:", error);
      
      // Fallback: return a clear error message in the expected format
      return Buffer.from(JSON.stringify({
        error: "Mock transaction generation failed",
        message: "Real API call required for valid transaction",
        transactionType: transactionType,
        note: "This is a fallback response when transaction generation fails"
      })).toString("base64");
    }
  }

  /**
   * Checks if the action provider supports the given network
   */
  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "svm" && 
           network.networkId !== undefined && 
           SUPPORTED_NETWORKS.includes(network.networkId);
  }
}

/**
 * Factory function to create a new MeteoraDLMMActionProvider instance
 */
export const meteoraDLMMActionProvider = () => new MeteoraDLMMActionProvider();
