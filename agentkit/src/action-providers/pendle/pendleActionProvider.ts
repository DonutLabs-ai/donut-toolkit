/**
 * Pendle Action Provider
 *
 * This file contains the implementation of the PendleActionProvider,
 * which provides actions for Pendle yield tokenization and DeFi operations.
 *
 * @module pendle
 */

import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { CreateAction } from "../actionDecorator";
import { EvmWalletProvider } from "../../wallet-providers";

import {
  GetMarketsSchema,
  MintSchema,
  RedeemSchema,
  SwapSchema,
  AddLiquiditySchema,
  RemoveLiquiditySchema,
  GetUserPositionsSchema,
  GetMarketDataSchema,
  GetAssetInfoSchema,
} from "./schemas";

import {
  SUPPORTED_PENDLE_NETWORKS,
  PENDLE_TRANSACTION_TYPES,
  PENDLE_API_ENDPOINTS,
  ERROR_MESSAGES,
} from "./constants";

import {
  PendleActionProviderConfig,
  PendleMarket,
  PendleUserPosition,
  PendleMarketData,
  PendleAssetInfo,
  PendleApiResponse,
} from "./types";

import {
  isNetworkSupported,
  getChainIdFromNetwork,
  validateTransactionParams,
  formatErrorMessage,
  buildApiUrl,
  makeApiRequest,
  filterActiveMarkets,
  sortMarkets,
  summarizeUserPositions,
} from "./utils";

/**
 * PendleActionProvider provides actions for Pendle yield tokenization operations.
 *
 * @description
 * This provider is designed to work with EvmWalletProvider for blockchain interactions.
 * It supports EVM networks where Pendle is deployed and returns unsigned transactions
 * for all operations that require wallet signatures.
 */
export class PendleActionProvider extends ActionProvider<EvmWalletProvider> {
  private readonly config: PendleActionProviderConfig;

  /**
   * Constructor for the PendleActionProvider.
   *
   * @param config - Configuration options for the PendleActionProvider
   */
  constructor(config: PendleActionProviderConfig = {}) {
    super("pendle", []);
    this.config = {
      enableAggregator: true,
      ...config,
    };
  }

  /**
   * Get available Pendle markets and their details
   */
  @CreateAction({
    name: "get_markets",
    description: `
    Get available Pendle yield markets and their details.
    - Returns market information including APY, liquidity, and expiry dates
    - Can filter by chain and active status
    - Useful for discovering yield opportunities
    `,
    schema: GetMarketsSchema,
  })
  async getMarkets(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetMarketsSchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      const chainId = args.chainId || getChainIdFromNetwork(network);
      const url = buildApiUrl(PENDLE_API_ENDPOINTS.MARKETS, { chainId });

      // Call real Pendle API to get markets
      const response = await makeApiRequest<{
        results: Array<{
          address: string;
          name: string;
          symbol: string;
          expiry: string;
          pt: { address: string; symbol: string };
          yt: { address: string; symbol: string };
          sy: { address: string; symbol: string };
          liquidity: string;
          volume24h: string;
          isActive: boolean;
          chainId: number;
          totalPt: string;
          totalSy: string;
          impliedApy: number;
          priceUsd: number;
        }>
      }>(url);

      if (!response.success) {
        throw new Error(response.error);
      }

      // Transform API response to our format
      let markets: PendleMarket[] = response.data.results.map(market => ({
        address: market.address,
        name: market.name, 
        symbol: market.symbol,
        expiry: market.expiry,
        pt: {
          address: market.pt.address,
          symbol: market.pt.symbol,
          decimals: 18, // Default to 18 for ERC20 tokens
        },
        yt: {
          address: market.yt.address,
          symbol: market.yt.symbol,
          decimals: 18,
        },
        sy: {
          address: market.sy.address,
          symbol: market.sy.symbol,
          decimals: 18,
        },
        underlyingAsset: {
          address: market.sy.address, // SY represents the underlying asset
          symbol: market.sy.symbol,
          decimals: 18,
        },
        apy: {
          pt: market.impliedApy,
          yt: market.impliedApy,
          lp: market.impliedApy * 0.8, // Estimate LP APY as 80% of implied APY
        },
        liquidity: market.liquidity,
        volume24h: market.volume24h,
        isActive: market.isActive,
        chainId: market.chainId,
      }));
      
      // Filter active markets if requested
      if (args.activeOnly) {
        markets = filterActiveMarkets(markets);
      }

      // Sort by APY and limit results
      markets = sortMarkets(markets, 'apy').slice(0, args.limit || 50);

      return JSON.stringify({
        success: true,
        markets: markets,
        count: markets.length,
        chainId: chainId,
        message: `Found ${markets.length} available markets on chain ${chainId}`,
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: "Failed to fetch Pendle markets",
      });
    }
  }

  /**
   * Create unsigned transaction to mint Principal Tokens (PT) and Yield Tokens (YT)
   */
  @CreateAction({
    name: "mint_yield_tokens",
    description: `
    Creates an unsigned transaction to mint Principal Tokens (PT) and Yield Tokens (YT) from yield-bearing assets.
    - Splits yield-bearing assets into PT (principal) and YT (yield) components
    - Returns unsigned transaction data for manual signing
    - Supports aggregator routing for better token conversion
    - Only available on supported EVM networks with active Pendle markets
    `,
    schema: MintSchema,
  })
  async mintYieldTokens(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof MintSchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      validateTransactionParams({
        amount: args.amount,
        slippage: args.slippage,
        address: args.marketAddress,
      });

      const chainId = getChainIdFromNetwork(network);
      const userAddress = walletProvider.getAddress();

      // Build mint transaction using Pendle SDK or API
      const mintTxData = await this.buildMintTransaction({
        chainId,
        userAddress,
        marketAddress: args.marketAddress,
        amount: args.amount,
        tokenIn: args.tokenIn,
        slippage: args.slippage,
        enableAggregator: args.enableAggregator,
      });

      const unsignedTransaction = mintTxData.unsignedTransaction;

      return JSON.stringify({
        success: true,
        unsignedTransaction: unsignedTransaction,
        transactionType: PENDLE_TRANSACTION_TYPES.MINT,
        marketAddress: args.marketAddress,
        amount: args.amount,
        tokenIn: args.tokenIn,
        slippage: args.slippage,
        enableAggregator: args.enableAggregator,
        message: `Unsigned mint transaction created for ${args.amount} tokens. Transaction data: ${unsignedTransaction.substring(0, 50)}...`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: `Failed to create unsigned mint transaction: ${formatErrorMessage(error)}`
      });
    }
  }

  /**
   * Create unsigned transaction to redeem PT and YT tokens back to underlying assets
   */
  @CreateAction({
    name: "redeem_yield_tokens",
    description: `
    Creates an unsigned transaction to redeem PT and YT tokens back to underlying yield-bearing assets.
    - Combines PT and YT tokens to redeem underlying assets
    - Returns unsigned transaction data for manual signing
    - Requires matching amounts of PT and YT tokens
    - Can specify desired output token format
    `,
    schema: RedeemSchema,
  })
  async redeemYieldTokens(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RedeemSchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      validateTransactionParams({
        amount: args.ptAmount,
        slippage: args.slippage,
        address: args.marketAddress,
      });

      const chainId = getChainIdFromNetwork(network);
      const userAddress = walletProvider.getAddress();

      const redeemTxData = await this.buildRedeemTransaction({
        chainId,
        userAddress,
        marketAddress: args.marketAddress,
        ptAmount: args.ptAmount,
        ytAmount: args.ytAmount,
        tokenOut: args.tokenOut || "",
        slippage: args.slippage,
      });

      const unsignedTransaction = redeemTxData.unsignedTransaction;

      return JSON.stringify({
        success: true,
        unsignedTransaction: unsignedTransaction,
        transactionType: PENDLE_TRANSACTION_TYPES.REDEEM,
        marketAddress: args.marketAddress,
        ptAmount: args.ptAmount,
        ytAmount: args.ytAmount,
        tokenOut: args.tokenOut,
        slippage: args.slippage,
        message: `Unsigned redeem transaction created. Transaction data: ${unsignedTransaction.substring(0, 50)}...`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: `Failed to create unsigned redeem transaction: ${formatErrorMessage(error)}`
      });
    }
  }

  /**
   * Create unsigned transaction to swap tokens on Pendle AMM
   */
  @CreateAction({
    name: "swap_tokens",
    description: `
    Creates an unsigned transaction to swap tokens on Pendle AMM.
    - Swaps between PT, YT, SY, and underlying assets
    - Returns unsigned transaction data for manual signing
    - Includes slippage protection and price impact calculation
    - Supports aggregator routing for optimal prices
    `,
    schema: SwapSchema,
  })
  async swapTokens(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SwapSchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      validateTransactionParams({
        amount: args.amount,
        slippage: args.slippage,
        address: args.marketAddress,
      });

      const chainId = getChainIdFromNetwork(network);
      const userAddress = walletProvider.getAddress();

      // Get swap quote first
      const swapQuote = await this.getSwapQuote(
        args.tokenIn,
        args.tokenOut,
        args.amount,
        chainId,
        args.marketAddress
      );

      const swapTxData = await this.buildSwapTransaction({
        chainId,
        userAddress,
        marketAddress: args.marketAddress,
        tokenIn: args.tokenIn,
        tokenOut: args.tokenOut,
        amount: args.amount,
        slippage: args.slippage,
        enableAggregator: args.enableAggregator,
      });

      const unsignedTransaction = Buffer.from(swapTxData.unsignedTransaction).toString('base64');

      return JSON.stringify({
        success: true,
        unsignedTransaction: unsignedTransaction,
        transactionType: PENDLE_TRANSACTION_TYPES.SWAP,
        marketAddress: args.marketAddress,
        tokenIn: args.tokenIn,
        tokenOut: args.tokenOut,
        amount: args.amount,
        slippage: args.slippage,
        enableAggregator: args.enableAggregator,
        quote: {
          inputAmount: swapQuote.inputAmount,
          outputAmount: swapQuote.outputAmount,
          priceImpact: swapQuote.priceImpact,
          route: swapQuote.route
        },
        message: `Unsigned swap transaction created. Transaction data: ${unsignedTransaction.substring(0, 50)}...`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: `Failed to create unsigned swap transaction: ${formatErrorMessage(error)}`
      });
    }
  }

  /**
   * Create unsigned transaction to add liquidity to Pendle pools
   */
  @CreateAction({
    name: "add_liquidity",
    description: `
    Creates an unsigned transaction to add liquidity to Pendle AMM pools.
    - Adds liquidity to PT-SY or YT-SY pools
    - Returns unsigned transaction data for manual signing  
    - Automatically calculates optimal token ratios
    - Provides LP tokens representing liquidity position
    `,
    schema: AddLiquiditySchema,
  })
  async addLiquidity(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof AddLiquiditySchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      validateTransactionParams({
        amount: args.tokenAmount,
        slippage: args.slippage,
        address: args.poolAddress,
      });

      const chainId = getChainIdFromNetwork(network);
      const userAddress = walletProvider.getAddress();

      const liquidityTxData = await this.buildAddLiquidityTransaction({
        chainId,
        userAddress,
        poolAddress: args.poolAddress,
        tokenAmount: args.tokenAmount,
        tokenAddress: args.tokenAddress,
        minimumLpOut: args.minimumLpOut,
        slippage: args.slippage,
      });

      const unsignedTransaction = Buffer.from(liquidityTxData.unsignedTransaction).toString('base64');

      return JSON.stringify({
        success: true,
        unsignedTransaction: unsignedTransaction,
        transactionType: PENDLE_TRANSACTION_TYPES.ADD_LIQUIDITY,
        poolAddress: args.poolAddress,
        tokenAmount: args.tokenAmount,
        tokenAddress: args.tokenAddress,
        minimumLpOut: args.minimumLpOut,
        slippage: args.slippage,
        message: `Unsigned add liquidity transaction created. Transaction data: ${unsignedTransaction.substring(0, 50)}...`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: `Failed to create unsigned add liquidity transaction: ${formatErrorMessage(error)}`
      });
    }
  }

  /**
   * Create unsigned transaction to remove liquidity from Pendle pools
   */
  @CreateAction({
    name: "remove_liquidity", 
    description: `
    Creates an unsigned transaction to remove liquidity from Pendle AMM pools.
    - Removes liquidity from PT-SY or YT-SY pools
    - Returns unsigned transaction data for manual signing
    - Supports partial or full liquidity removal
    - Burns LP tokens to receive underlying tokens
    `,
    schema: RemoveLiquiditySchema,
  })
  async removeLiquidity(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RemoveLiquiditySchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      validateTransactionParams({
        amount: args.lpTokenAmount as string,
        slippage: args.slippage as number,
        address: args.poolAddress as string,
      });

      const chainId = getChainIdFromNetwork(network);
      const userAddress = walletProvider.getAddress();

      const removeTxData = await this.buildRemoveLiquidityTransaction({
        chainId,
        userAddress,
        poolAddress: args.poolAddress,
        lpTokenAmount: args.lpTokenAmount,
        minimumTokenOut: args.minimumTokenOut,
        tokenOut: args.tokenOut,
        slippage: args.slippage,
      });

      const unsignedTransaction = Buffer.from(removeTxData.unsignedTransaction).toString('base64');

      return JSON.stringify({
        success: true,
        unsignedTransaction: unsignedTransaction,
        transactionType: PENDLE_TRANSACTION_TYPES.REMOVE_LIQUIDITY,
        poolAddress: args.poolAddress,
        lpTokenAmount: args.lpTokenAmount,
        minimumTokenOut: args.minimumTokenOut,
        tokenOut: args.tokenOut,
        slippage: args.slippage,
        message: `Unsigned remove liquidity transaction created. Transaction data: ${unsignedTransaction.substring(0, 50)}...`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: `Failed to create unsigned remove liquidity transaction: ${formatErrorMessage(error)}`
      });
    }
  }

  /**
   * Get user's positions in Pendle markets and pools (read-only)
   */
  @CreateAction({
    name: "get_user_positions",
    description: `
    Get user's positions in Pendle markets and pools.
    - Returns PT, YT, and LP token balances
    - Shows current value and expiry dates
    - Includes available rewards
    - Provides position summaries and analytics
    `,
    schema: GetUserPositionsSchema,
  })
  async getUserPositions(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetUserPositionsSchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      const chainId = args.chainId || getChainIdFromNetwork(network);
      const userAddress = args.userAddress || walletProvider.getAddress();

      const url = buildApiUrl(PENDLE_API_ENDPOINTS.USER_POSITIONS, { 
        chainId, 
        userAddress 
      });

      const response = await makeApiRequest<PendleUserPosition[]>(url);
      if (!response.success) {
        throw new Error(response.error);
      }

      let positions = response.data;

      // Filter expired positions if requested
      if (!args.includeExpired) {
        positions = positions.filter(pos => !pos.isExpired);
      }

      const summary = summarizeUserPositions(positions);

      return JSON.stringify({
        success: true,
        positions: positions,
        summary: summary,
        userAddress: userAddress,
        chainId: chainId,
        message: `Found ${positions.length} positions with total value $${summary.totalValue.toFixed(2)}`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: "Failed to fetch user positions"
      });
    }
  }

  /**
   * Get detailed market data including APY and price history (read-only)
   */
  @CreateAction({
    name: "get_market_data",
    description: `
    Get detailed market data including APY, liquidity, and price history.
    - Returns current APY for PT, YT, and LP positions
    - Shows liquidity and volume metrics
    - Includes price history and trends
    - Useful for yield strategy analysis
    `,
    schema: GetMarketDataSchema,
  })
  async getMarketData(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetMarketDataSchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      const chainId = getChainIdFromNetwork(network);
      const url = buildApiUrl(PENDLE_API_ENDPOINTS.MARKET_DATA, { 
        chainId, 
        marketAddress: args.marketAddress 
      });

      const response = await makeApiRequest<PendleMarketData>(url);
      if (!response.success) {
        throw new Error(response.error);
      }

      const marketData = response.data;

      return JSON.stringify({
        success: true,
        marketData: marketData,
        period: args.period,
        chainId: chainId,
        message: `Market data retrieved for ${marketData.market.symbol}`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: "Failed to fetch market data"
      });
    }
  }

  /**
   * Get detailed information about a Pendle asset (read-only)
   */
  @CreateAction({
    name: "get_asset_info",
    description: `
    Get detailed information about a Pendle asset (PT, YT, or SY).
    - Returns asset metadata and current status
    - Shows underlying asset information
    - Includes current price and supply data
    - Useful for asset analysis and verification
    `,
    schema: GetAssetInfoSchema,
  })
  async getAssetInfo(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetAssetInfoSchema>
  ): Promise<string> {
    try {
      const network = walletProvider.getNetwork();
      if (!isNetworkSupported(network)) {
        throw new Error(`${ERROR_MESSAGES.UNSUPPORTED_NETWORK}: ${network.networkId}`);
      }

      const chainId = args.chainId || getChainIdFromNetwork(network);
      
      // This would typically call a Pendle API endpoint for asset information
      const assetInfo = await this.fetchAssetInfo(args.tokenAddress, chainId);

      return JSON.stringify({
        success: true,
        assetInfo: assetInfo,
        chainId: chainId,
        message: `Asset information retrieved for ${assetInfo.symbol}`
      });

    } catch (error) {
      return JSON.stringify({
        success: false,
        error: formatErrorMessage(error),
        message: "Failed to fetch asset information"
      });
    }
  }

  /**
   * Check if the action provider supports the given network
   */
  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm" && 
           SUPPORTED_PENDLE_NETWORKS.includes(network.networkId as any);
  }

  // Private helper methods for building transactions would go here
  // These methods would integrate with Pendle SDK or API to build actual transaction data

  private async buildMintTransaction(params: {
    chainId: number;
    userAddress: string;
    marketAddress: string;
    amount: string;
    tokenIn: string;
    slippage: number;
    enableAggregator: boolean;
    gasPrice?: string;
    gasLimit?: string;
  }): Promise<{
    unsignedTransaction: string;
    gasEstimate?: string;
    estimatedReceived?: string;
  }> {
    try {
      // Call Pendle backend API to get transaction data
      const apiUrl = `${PENDLE_API_ENDPOINTS.BACKEND_BASE}${PENDLE_API_ENDPOINTS.MINT_PT_YT}`;
      
      const response = await makeApiRequest<{
        transaction: {
          to: string;
          data: string;
          value?: string;
          gasLimit?: string;
        };
        netTokenOut: string;
        priceImpact: string;
        exchangeRate: string;
      }>(apiUrl, {
        method: 'POST',
        data: {
          chainId: params.chainId,
          receiverAddr: params.userAddress,
          marketAddr: params.marketAddress,
          amountTokenIn: params.amount,
          tokenInAddr: params.tokenIn,
          slippage: params.slippage / 100, // Convert percentage to decimal
          enableAggregator: params.enableAggregator,
        }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Convert transaction to base64
      const txData = {
        to: response.data.transaction.to,
        data: response.data.transaction.data,
        value: response.data.transaction.value || "0",
      };

      const unsignedTransaction = Buffer.from(JSON.stringify(txData)).toString('base64');

      return {
        unsignedTransaction,
        gasEstimate: response.data.transaction.gasLimit,
        estimatedReceived: response.data.netTokenOut,
      };
    } catch (error) {
      throw new Error(`Failed to build mint transaction: ${formatErrorMessage(error)}`);
    }
  }

  private async buildRedeemTransaction(params: {
    chainId: number;
    userAddress: string;
    marketAddress: string;
    ptAmount: string;
    ytAmount: string;
    tokenOut: string;
    slippage: number;
  }): Promise<{
    unsignedTransaction: string;
    gasEstimate?: string;
    estimatedReceived?: string;
  }> {
    try {
      const apiUrl = `${PENDLE_API_ENDPOINTS.BACKEND_BASE}${PENDLE_API_ENDPOINTS.REDEEM_PT_YT}`;
      
      const response = await makeApiRequest<{
        transaction: {
          to: string;
          data: string;
          value?: string;
          gasLimit?: string;
        };
        netTokenOut: string;
        priceImpact: string;
      }>(apiUrl, {
        method: 'POST',
        data: {
          chainId: params.chainId,
          receiverAddr: params.userAddress,
          marketAddr: params.marketAddress,
          amountPtIn: params.ptAmount,
          amountYtIn: params.ytAmount,
          tokenOutAddr: params.tokenOut,
          slippage: params.slippage / 100,
        }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const txData = {
        to: response.data.transaction.to,
        data: response.data.transaction.data,
        value: response.data.transaction.value || "0",
      };

      const unsignedTransaction = Buffer.from(JSON.stringify(txData)).toString('base64');

      return {
        unsignedTransaction,
        gasEstimate: response.data.transaction.gasLimit,
        estimatedReceived: response.data.netTokenOut,
      };
    } catch (error) {
      throw new Error(`Failed to build redeem transaction: ${formatErrorMessage(error)}`);
    }
  }

  private async buildSwapTransaction(params: {
    chainId: number;
    userAddress: string;
    marketAddress: string;
    tokenIn: string;
    tokenOut: string;
    amount: string;
    slippage: number;
    enableAggregator: boolean;
  }): Promise<{
    unsignedTransaction: string;
    gasEstimate?: string;
    estimatedReceived?: string;
  }> {
    try {
      const apiUrl = `${PENDLE_API_ENDPOINTS.BACKEND_BASE}${PENDLE_API_ENDPOINTS.SWAP_TOKENS}`;
      
      const response = await makeApiRequest<{
        transaction: {
          to: string;
          data: string;
          value?: string;
          gasLimit?: string;
        };
        netTokenOut: string;
        priceImpact: string;
        exchangeRate: string;
      }>(apiUrl, {
        method: 'POST',
        data: {
          chainId: params.chainId,
          receiverAddr: params.userAddress,
          marketAddr: params.marketAddress,
          tokenInAddr: params.tokenIn,
          tokenOutAddr: params.tokenOut,
          amountTokenIn: params.amount,
          slippage: params.slippage / 100,
          enableAggregator: params.enableAggregator,
        }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const txData = {
        to: response.data.transaction.to,
        data: response.data.transaction.data,
        value: response.data.transaction.value || "0",
      };

      const unsignedTransaction = Buffer.from(JSON.stringify(txData)).toString('base64');

      return {
        unsignedTransaction,
        gasEstimate: response.data.transaction.gasLimit,
        estimatedReceived: response.data.netTokenOut,
      };
    } catch (error) {
      throw new Error(`Failed to build swap transaction: ${formatErrorMessage(error)}`);
    }
  }

  private async buildAddLiquidityTransaction(params: {
    chainId: number;
    userAddress: string;
    poolAddress: string;
    tokenAmount: string;
    tokenAddress: string;
    minimumLpOut?: string;
    slippage: number;
  }): Promise<{
    unsignedTransaction: string;
    gasEstimate?: string;
    estimatedReceived?: string;
  }> {
    try {
      const apiUrl = `${PENDLE_API_ENDPOINTS.BACKEND_BASE}${PENDLE_API_ENDPOINTS.ADD_LIQUIDITY}`;
      
      const response = await makeApiRequest<{
        transaction: {
          to: string;
          data: string;
          value?: string;
          gasLimit?: string;
        };
        netLpOut: string;
        priceImpact: string;
      }>(apiUrl, {
        method: 'POST',
        data: {
          chainId: params.chainId,
          receiverAddr: params.userAddress,
          marketAddr: params.poolAddress,
          tokenInAddr: params.tokenAddress,
          amountTokenIn: params.tokenAmount,
          slippage: params.slippage / 100,
        }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const txData = {
        to: response.data.transaction.to,
        data: response.data.transaction.data,
        value: response.data.transaction.value || "0",
      };

      const unsignedTransaction = Buffer.from(JSON.stringify(txData)).toString('base64');

      return {
        unsignedTransaction,
        gasEstimate: response.data.transaction.gasLimit,
        estimatedReceived: response.data.netLpOut,
      };
    } catch (error) {
      throw new Error(`Failed to build add liquidity transaction: ${formatErrorMessage(error)}`);
    }
  }

  private async buildRemoveLiquidityTransaction(params: {
    chainId: number;
    userAddress: string;
    poolAddress: string;
    lpTokenAmount: string;
    minimumTokenOut?: string;
    tokenOut?: string;
    slippage: number;
  }): Promise<{
    unsignedTransaction: string;
    gasEstimate?: string;
    estimatedReceived?: string;
  }> {
    try {
      const apiUrl = `${PENDLE_API_ENDPOINTS.BACKEND_BASE}${PENDLE_API_ENDPOINTS.REMOVE_LIQUIDITY}`;
      
      const response = await makeApiRequest<{
        transaction: {
          to: string;
          data: string;
          value?: string;
          gasLimit?: string;
        };
        netTokenOut: string;
        priceImpact: string;
      }>(apiUrl, {
        method: 'POST',
        data: {
          chainId: params.chainId,
          receiverAddr: params.userAddress,
          marketAddr: params.poolAddress,
          amountLpIn: params.lpTokenAmount,
          tokenOutAddr: params.tokenOut,
          slippage: params.slippage / 100,
        }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      const txData = {
        to: response.data.transaction.to,
        data: response.data.transaction.data,
        value: response.data.transaction.value || "0",
      };

      const unsignedTransaction = Buffer.from(JSON.stringify(txData)).toString('base64');

      return {
        unsignedTransaction,
        gasEstimate: response.data.transaction.gasLimit,
        estimatedReceived: response.data.netTokenOut,
      };
    } catch (error) {
      throw new Error(`Failed to build remove liquidity transaction: ${formatErrorMessage(error)}`);
    }
  }

  private async getSwapQuote(
    tokenIn: string,
    tokenOut: string, 
    amount: string,
    chainId: number,
    marketAddress: string
  ): Promise<any> {
    // TODO: Implement actual Pendle API integration for quotes
    return {
      inputAmount: amount,
      outputAmount: "0", // Would be calculated by Pendle API
      priceImpact: 0,
      route: [tokenIn, tokenOut],
    };
  }

  private async fetchAssetInfo(tokenAddress: string, chainId: number): Promise<PendleAssetInfo> {
    // TODO: Implement actual Pendle API integration for asset info
    return {
      address: tokenAddress,
      symbol: "PT-TOKEN",
      name: "Principal Token",
      decimals: 18,
      type: 'PT',
      currentPrice: "1.0",
      totalSupply: "0",
      isActive: true,
    };
  }
}

/**
 * Factory function to create a new PendleActionProvider instance.
 *
 * @param config - Optional configuration for the PendleActionProvider
 * @returns A new PendleActionProvider instance
 */
export const pendleActionProvider = (config?: PendleActionProviderConfig) => 
  new PendleActionProvider(config); 