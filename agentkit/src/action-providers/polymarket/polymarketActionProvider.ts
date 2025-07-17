import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { CreateAction } from "../actionDecorator";
import { Network } from "../../network";
import { 
  SearchMarketsSchema, 
  GetMarketDetailsSchema, 
  GetMarketPricesSchema, 
  PlaceBetSchema, 
  GetTrendingMarketsSchema, 
  GetUserPositionsSchema 
} from "./schemas";
import { PolymarketAPI } from "./api";

/**
 * Polymarket Action Provider
 * Provides prediction market trading and information actions
 */
export class PolymarketActionProvider extends ActionProvider {
  private api: PolymarketAPI;

  constructor() {
    super("polymarket", []);
    this.api = new PolymarketAPI();
  }

  supportsNetwork(network: Network): boolean {
    // Polymarket operates on Polygon blockchain
    return network.networkId === 'polygon-mainnet' || 
           network.networkId === 'polygon' ||
           network.chainId === '137';
  }

  @CreateAction({
    name: 'search_markets',
    description: 'Search for prediction markets on Polymarket with optional filters',
    schema: SearchMarketsSchema
  })
  async searchMarkets(args: string): Promise<string> {
    try {
      const params = SearchMarketsSchema.parse(JSON.parse(args));
      const markets = await this.api.searchMarkets(params.query, params.limit, params.closed);
      
      return JSON.stringify({
        success: true,
        data: {
          markets: markets.map(market => ({
            id: market.id,
            question: market.question,
            category: market.category,
            currentOdds: market.currentOdds,
            volume24h: market.volume24h,
            endDate: market.endDate,
            isActive: market.isActive
          })),
          count: markets.length
        }
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to search markets: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  @CreateAction({
    name: 'get_market_details',
    description: 'Get detailed information about a specific prediction market',
    schema: GetMarketDetailsSchema
  })
  async getMarketDetails(args: string): Promise<string> {
    try {
      const params = GetMarketDetailsSchema.parse(JSON.parse(args));
      const market = await this.api.getMarketDetails(params.marketId);
      
      if (!market) {
        return JSON.stringify({
          success: false,
          error: 'Market not found'
        });
      }

      return JSON.stringify({
        success: true,
        data: {
          market: {
            id: market.id,
            question: market.question,
            description: market.description,
            category: market.category,
            creator: market.creator,
            createdAt: market.createdAt,
            endDate: market.endDate,
            resolutionDate: market.resolutionDate,
            currentOdds: market.currentOdds,
            volume24h: market.volume24h,
            totalVolume: market.totalVolume,
            liquidityPool: market.liquidityPool,
            outcomes: market.outcomes,
            tags: market.tags,
            isActive: market.isActive,
            isResolved: market.isResolved,
            resolutionDetails: market.resolutionDetails
          }
        }
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to get market details: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  @CreateAction({
    name: 'get_market_prices',
    description: 'Get current and historical price data for a prediction market',
    schema: GetMarketPricesSchema
  })
  async getMarketPrices(args: string): Promise<string> {
    try {
      const params = GetMarketPricesSchema.parse(JSON.parse(args));
      const priceData = await this.api.getMarketPrices(params.marketId);
      
      return JSON.stringify({
        success: true,
        data: {
          marketId: priceData.marketId,
          currentPrice: priceData.currentPrice,
          priceChange24h: priceData.priceChange24h,
          volume24h: priceData.volume24h,
          high24h: priceData.high24h,
          low24h: priceData.low24h,
          lastUpdated: priceData.lastUpdated,
          ...(priceData.priceHistory && { priceHistory: priceData.priceHistory })
        }
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to get market prices: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  @CreateAction({
    name: 'place_bet',
    description: 'Place a bet on a prediction market outcome (simulation)',
    schema: PlaceBetSchema
  })
  async placeBet(args: string): Promise<string> {
    try {
      const params = PlaceBetSchema.parse(JSON.parse(args));
      const result = await this.api.placeBet(params);
      
      return JSON.stringify({
        success: true,
        data: {
          betId: result.betId,
          marketId: result.marketId,
          outcome: result.outcome,
          amount: result.amount,
          expectedOdds: result.expectedOdds,
          actualOdds: result.actualOdds,
          potentialPayout: result.potentialPayout,
          fees: result.fees,
          status: result.status,
          timestamp: result.timestamp,
          transactionHash: result.transactionHash
        }
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to place bet: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  @CreateAction({
    name: 'get_trending_markets',
    description: 'Get trending prediction markets based on volume, activity, or other metrics',
    schema: GetTrendingMarketsSchema
  })
  async getTrendingMarkets(args: string): Promise<string> {
    try {
      const params = GetTrendingMarketsSchema.parse(JSON.parse(args));
      const trending = await this.api.getTrendingMarkets(params.category, params.limit);
      
      return JSON.stringify({
        success: true,
        data: {
          trending: trending.map(market => ({
            id: market.id,
            question: market.question,
            category: market.category,
            currentOdds: market.currentOdds,
            volume24h: market.volume24h,
            volumeChange: market.volumeChange,
            priceChange24h: market.priceChange24h,
            rank: market.rank,
            isActive: market.isActive
          })),
          count: trending.length
        }
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to get trending markets: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  @CreateAction({
    name: 'get_user_positions',
    description: 'Get all active and historical positions for a user',
    schema: GetUserPositionsSchema
  })
  async getUserPositions(args: string): Promise<string> {
    try {
      const params = GetUserPositionsSchema.parse(JSON.parse(args));
      const positions = await this.api.getUserPositions(params.userAddress, params.active);
      
      return JSON.stringify({
        success: true,
        data: {
          positions: positions.map(position => ({
            id: position.id,
            marketId: position.marketId,
            marketQuestion: position.marketQuestion,
            outcome: position.outcome,
            shares: position.shares,
            avgPrice: position.avgPrice,
            currentPrice: position.currentPrice,
            unrealizedPnL: position.unrealizedPnL,
            realizedPnL: position.realizedPnL,
            status: position.status,
            createdAt: position.createdAt,
            updatedAt: position.updatedAt
          })),
          summary: {
            totalPositions: positions.length,
            activePositions: positions.filter(p => p.status === 'active').length,
            totalUnrealizedPnL: positions.reduce((sum, p) => sum + p.unrealizedPnL, 0),
            totalRealizedPnL: positions.reduce((sum, p) => sum + p.realizedPnL, 0)
          }
        }
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to get user positions: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
} 