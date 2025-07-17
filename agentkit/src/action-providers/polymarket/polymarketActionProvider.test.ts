import { PolymarketActionProvider } from './polymarketActionProvider';
import { PolymarketAPI } from './api';
import { Network } from '../../network';

// Mock the PolymarketAPI
jest.mock('./api');

describe('PolymarketActionProvider', () => {
  let provider: PolymarketActionProvider;
  let mockApi: jest.Mocked<PolymarketAPI>;

  beforeEach(() => {
    provider = new PolymarketActionProvider();
    mockApi = jest.mocked(provider['api']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('supportsNetwork', () => {
    test('should support Polygon networks', () => {
      const polygonNetwork: Network = { 
        protocolFamily: 'evm', 
        networkId: 'polygon-mainnet',
        chainId: '137'
      };
      expect(provider.supportsNetwork(polygonNetwork)).toBe(true);
    });

    test('should support networks with polygon networkId', () => {
      const polygonNetwork: Network = { 
        protocolFamily: 'evm', 
        networkId: 'polygon'
      };
      expect(provider.supportsNetwork(polygonNetwork)).toBe(true);
    });

    test('should support networks with chainId 137', () => {
      const polygonNetwork: Network = { 
        protocolFamily: 'evm',
        chainId: '137'
      };
      expect(provider.supportsNetwork(polygonNetwork)).toBe(true);
    });

    test('should not support non-Polygon networks', () => {
      const ethereumNetwork: Network = { 
        protocolFamily: 'evm', 
        networkId: 'ethereum-mainnet',
        chainId: '1'
      };
      expect(provider.supportsNetwork(ethereumNetwork)).toBe(false);
    });
  });

  describe('searchMarkets', () => {
    test('should search markets successfully', async () => {
      const mockMarkets = [
        {
          id: 'market_1',
          question: 'Will Bitcoin reach $100k in 2024?',
          description: 'Bitcoin price prediction market',
          category: 'crypto',
          creator: 'user_123',
          createdAt: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          resolutionDate: null,
          currentOdds: { yes: 0.65, no: 0.35 },
          volume24h: 50000,
          totalVolume: 1000000,
          liquidityPool: 500000,
          outcomes: ['Yes', 'No'],
          tags: ['bitcoin', 'crypto'],
          isActive: true,
          isResolved: false,
          resolutionDetails: null
        }
      ];

      mockApi.searchMarkets.mockResolvedValue(mockMarkets);

      const args = JSON.stringify({
        query: 'bitcoin',
        category: 'crypto',
        limit: 10
      });

      const result = await provider.searchMarkets(args);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.markets).toHaveLength(1);
      expect(parsed.data.markets[0].question).toBe('Will Bitcoin reach $100k in 2024?');
      expect(mockApi.searchMarkets).toHaveBeenCalledWith({
        query: 'bitcoin',
        category: 'crypto',
        limit: 10
      });
    });

    test('should handle search markets error', async () => {
      mockApi.searchMarkets.mockRejectedValue(new Error('API Error'));

      const args = JSON.stringify({ query: 'test' });
      const result = await provider.searchMarkets(args);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('Failed to search markets');
    });

    test('should handle invalid input', async () => {
      const result = await provider.searchMarkets('invalid json');
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('Failed to search markets');
    });
  });

  describe('getMarketDetails', () => {
    test('should get market details successfully', async () => {
      const mockMarket = {
        id: 'market_1',
        question: 'Will Bitcoin reach $100k in 2024?',
        description: 'Detailed Bitcoin price prediction market',
        category: 'crypto',
        creator: 'user_123',
        createdAt: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        resolutionDate: null,
        currentOdds: { yes: 0.65, no: 0.35 },
        volume24h: 50000,
        totalVolume: 1000000,
        liquidityPool: 500000,
        outcomes: ['Yes', 'No'],
        tags: ['bitcoin', 'crypto'],
        isActive: true,
        isResolved: false,
        resolutionDetails: null
      };

      mockApi.getMarketDetails.mockResolvedValue(mockMarket);

      const args = JSON.stringify({ marketId: 'market_1' });
      const result = await provider.getMarketDetails(args);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.market.id).toBe('market_1');
      expect(parsed.data.market.question).toBe('Will Bitcoin reach $100k in 2024?');
    });

    test('should handle market not found', async () => {
      mockApi.getMarketDetails.mockResolvedValue(null);

      const args = JSON.stringify({ marketId: 'nonexistent' });
      const result = await provider.getMarketDetails(args);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('Market not found');
    });
  });

  describe('getMarketPrices', () => {
    test('should get market prices successfully', async () => {
      const mockPriceData = {
        marketId: 'market_1',
        currentPrice: 0.65,
        priceChange24h: 0.05,
        volume24h: 50000,
        high24h: 0.68,
        low24h: 0.60,
        lastUpdated: '2024-01-15T12:00:00Z',
        priceHistory: [
          { timestamp: '2024-01-14T12:00:00Z', price: 0.60 },
          { timestamp: '2024-01-15T12:00:00Z', price: 0.65 }
        ]
      };

      mockApi.getMarketPrices.mockResolvedValue(mockPriceData);

      const args = JSON.stringify({
        marketId: 'market_1',
        timeframe: '24h',
        includeHistory: true
      });

      const result = await provider.getMarketPrices(args);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.currentPrice).toBe(0.65);
      expect(parsed.data.priceHistory).toBeDefined();
    });
  });

  describe('placeBet', () => {
    test('should place bet successfully', async () => {
      const mockBetResult = {
        betId: 'bet_123',
        marketId: 'market_1',
        outcome: 'Yes',
        amount: 100,
        expectedOdds: 0.65,
        actualOdds: 0.64,
        potentialPayout: 156.25,
        fees: 2.5,
        status: 'confirmed',
        timestamp: '2024-01-15T12:00:00Z',
        transactionHash: '0x123...abc'
      };

      mockApi.placeBet.mockResolvedValue(mockBetResult);

      const args = JSON.stringify({
        marketId: 'market_1',
        outcome: 'Yes',
        amount: 100,
        userId: 'user_456'
      });

      const result = await provider.placeBet(args);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.betId).toBe('bet_123');
      expect(parsed.data.amount).toBe(100);
      expect(parsed.data.outcome).toBe('Yes');
    });
  });

  describe('getTrending', () => {
    test('should get trending markets successfully', async () => {
      const mockTrending = [
        {
          id: 'market_1',
          question: 'Trending Market 1',
          category: 'politics',
          currentOdds: { yes: 0.55, no: 0.45 },
          volume24h: 100000,
          volumeChange: 0.25,
          priceChange24h: 0.05,
          rank: 1,
          isActive: true
        }
      ];

      mockApi.getTrendingMarkets.mockResolvedValue(mockTrending);

      const args = JSON.stringify({
        timeframe: '24h',
        limit: 10
      });

      const result = await provider.getTrendingMarkets(args);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.trending).toHaveLength(1);
      expect(parsed.data.trending[0].rank).toBe(1);
    });
  });

  describe('getUserPositions', () => {
    test('should get user positions successfully', async () => {
      const mockPositions = [
        {
          id: 'position_1',
          marketId: 'market_1',
          marketQuestion: 'Test Market',
          outcome: 'Yes',
          shares: 100,
          avgPrice: 0.60,
          currentPrice: 0.65,
          unrealizedPnL: 5,
          realizedPnL: 0,
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T12:00:00Z'
        }
      ];

      mockApi.getUserPositions.mockResolvedValue(mockPositions);

      const args = JSON.stringify({ userId: 'user_123' });
      const result = await provider.getUserPositions(args);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.data.positions).toHaveLength(1);
      expect(parsed.data.summary.totalPositions).toBe(1);
      expect(parsed.data.summary.activePositions).toBe(1);
    });
  });
}); 