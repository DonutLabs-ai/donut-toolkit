import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { CreateAction } from "../actionDecorator";
import { SearchTokenSchema, GetTokenAddressSchema, GetTokenPairsSchema } from "./schemas";
import { DexScreenerAPI } from "./api";
import { Network } from "../../network";

/**
 * DexScreenerActionProvider provides actions for querying token information and trading pairs
 * from DexScreener API across multiple blockchain networks.
 */
export class DexScreenerActionProvider extends ActionProvider {
  private readonly api: DexScreenerAPI;

  // Chain alias mapping for better user experience
  private readonly chainAliases: Record<string, string> = {
    sol: "solana",
    eth: "ethereum",
    bnb: "bsc",
    avax: "avalanche",
    matic: "polygon",
  };

  // Predefined popular token addresses for common tokens
  private readonly knownTokens: Record<string, Record<string, { chain: string; address: string }>> =
    {
      sol: {
        solana: { chain: "solana", address: "So11111111111111111111111111111111111111112" },
      },
      eth: {
        ethereum: { chain: "ethereum", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" },
        base: { chain: "base", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" },
      },
      bnb: {
        bsc: { chain: "bsc", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" },
      },
    };

  /**
   *
   */
  constructor() {
    super("dexscreener", []);
    this.api = new DexScreenerAPI();
  }

  /**
   * Search for token information by symbol.
   *
   * @param args
   */
  @CreateAction({
    name: "search_token",
    description:
      "Search for token information by symbol from DexScreener. Returns token details, price, and trading pairs.",
    schema: SearchTokenSchema,
  })
  async searchToken(args: z.infer<typeof SearchTokenSchema>): Promise<string> {
    try {
      let { symbol, chain } = args;
      symbol = symbol.toLowerCase();
      chain = chain?.toLowerCase();

      // Apply chain alias if needed
      if (chain && this.chainAliases[chain]) {
        chain = this.chainAliases[chain];
      }

      // Check if we have predefined data for popular tokens
      if (this.knownTokens[symbol]) {
        if (chain && this.knownTokens[symbol][chain]) {
          return JSON.stringify({
            success: true,
            data: {
              symbol: symbol.toUpperCase(),
              chain: this.knownTokens[symbol][chain].chain,
              address: this.knownTokens[symbol][chain].address,
              source: "predefined",
            },
          });
        } else if (!chain) {
          return JSON.stringify({
            success: true,
            data: {
              symbol: symbol.toUpperCase(),
              chains: this.knownTokens[symbol],
              source: "predefined",
            },
          });
        }
      }

      // Search using DexScreener API
      const query = chain ? `${symbol} ${chain}` : symbol;
      const result = await this.api.searchToken(query);

      if (!result.pairs || result.pairs.length === 0) {
        return JSON.stringify({
          success: false,
          error: "Token not found",
          message: `No trading pairs found for ${symbol}${chain ? ` on ${chain}` : ""}`,
        });
      }

      // Filter and sort results
      let pairs = result.pairs.filter(
        (pair: any) =>
          pair.baseToken.symbol.toLowerCase() === symbol ||
          pair.quoteToken.symbol.toLowerCase() === symbol,
      );

      if (chain) {
        pairs = pairs.filter((pair: any) => pair.chainId?.toLowerCase() === chain);
      }

      // Sort by liquidity (descending)
      pairs = pairs.sort((a: any, b: any) => {
        const liquidityA = a.liquidity?.usd || 0;
        const liquidityB = b.liquidity?.usd || 0;
        return liquidityB - liquidityA;
      });

      if (pairs.length === 0) {
        return JSON.stringify({
          success: false,
          error: "No matching pairs found",
          message: `Token ${symbol} not found${chain ? ` on ${chain}` : ""} or no trading pairs available`,
        });
      }

      // Return formatted results
      const topPairs = pairs.slice(0, 5).map((pair: any) => ({
        pairAddress: pair.pairAddress,
        chainId: pair.chainId,
        baseToken: {
          symbol: pair.baseToken.symbol,
          address: pair.baseToken.address,
        },
        quoteToken: {
          symbol: pair.quoteToken.symbol,
          address: pair.quoteToken.address,
        },
        priceUsd: pair.priceUsd,
        liquidity: pair.liquidity,
        volume: pair.volume,
        priceChange: pair.priceChange,
      }));

      return JSON.stringify({
        success: true,
        data: {
          symbol: symbol.toUpperCase(),
          totalPairs: pairs.length,
          topPairs: topPairs,
          source: "dexscreener_api",
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "API Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get token contract address by symbol.
   *
   * @param args
   */
  @CreateAction({
    name: "get_token_address",
    description:
      "Get token contract address by symbol. Returns the contract address for the specified token.",
    schema: GetTokenAddressSchema,
  })
  async getTokenAddress(args: z.infer<typeof GetTokenAddressSchema>): Promise<string> {
    try {
      const result = await this.searchToken(args);
      const parsed = JSON.parse(result);

      if (!parsed.success) {
        return result; // Return the error as-is
      }

      if (parsed.data.source === "predefined") {
        if (parsed.data.address) {
          return JSON.stringify({
            success: true,
            address: parsed.data.address,
            chain: parsed.data.chain,
            symbol: args.symbol.toUpperCase(),
          });
        } else if (parsed.data.chains) {
          const firstChain = Object.keys(parsed.data.chains)[0];
          return JSON.stringify({
            success: true,
            address: parsed.data.chains[firstChain].address,
            chain: parsed.data.chains[firstChain].chain,
            symbol: args.symbol.toUpperCase(),
            note: "Multiple chains available, returned first one",
          });
        }
      }

      if (parsed.data.topPairs && parsed.data.topPairs.length > 0) {
        const topPair = parsed.data.topPairs[0];
        const targetSymbol = args.symbol.toLowerCase();

        let tokenAddress: string;
        if (topPair.baseToken.symbol.toLowerCase() === targetSymbol) {
          tokenAddress = topPair.baseToken.address;
        } else {
          tokenAddress = topPair.quoteToken.address;
        }

        return JSON.stringify({
          success: true,
          address: tokenAddress,
          chain: topPair.chainId,
          symbol: args.symbol.toUpperCase(),
          pairAddress: topPair.pairAddress,
        });
      }

      return JSON.stringify({
        success: false,
        error: "Address not found",
        message: "Unable to determine token address from search results",
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Processing Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get trading pairs information for a token address.
   *
   * @param args
   */
  @CreateAction({
    name: "get_token_pairs",
    description:
      "Get detailed trading pairs information for a specific token address from DexScreener.",
    schema: GetTokenPairsSchema,
  })
  async getTokenPairs(args: z.infer<typeof GetTokenPairsSchema>): Promise<string> {
    try {
      const result = await this.api.getTokenPairs(args.tokenAddress);

      if (!result.pairs || result.pairs.length === 0) {
        return JSON.stringify({
          success: false,
          error: "No pairs found",
          message: `No trading pairs found for address ${args.tokenAddress}`,
        });
      }

      // Filter by chain if specified
      let pairs = result.pairs;
      if (args.chain) {
        const targetChain = this.chainAliases[args.chain.toLowerCase()] || args.chain.toLowerCase();
        pairs = pairs.filter((pair: any) => pair.chainId?.toLowerCase() === targetChain);
      }

      // Sort by liquidity
      pairs = pairs.sort((a: any, b: any) => {
        const liquidityA = a.liquidity?.usd || 0;
        const liquidityB = b.liquidity?.usd || 0;
        return liquidityB - liquidityA;
      });

      const formattedPairs = pairs.map((pair: any) => ({
        pairAddress: pair.pairAddress,
        chainId: pair.chainId,
        dexId: pair.dexId,
        url: pair.url,
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        priceUsd: pair.priceUsd,
        priceNative: pair.priceNative,
        liquidity: pair.liquidity,
        volume: pair.volume,
        priceChange: pair.priceChange,
        marketCap: pair.marketCap,
        info: pair.info,
      }));

      return JSON.stringify({
        success: true,
        data: {
          tokenAddress: args.tokenAddress,
          totalPairs: formattedPairs.length,
          pairs: formattedPairs,
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "API Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if the action provider supports the given network.
   * DexScreener works with multiple networks, so this always returns true.
   *
   * @param network
   */
  supportsNetwork(network: Network): boolean {
    return true;
  }
}

/**
 * Factory function to create a DexScreenerActionProvider instance
 */
export const dexscreenerActionProvider = () => new DexScreenerActionProvider();
