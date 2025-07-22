/**
 * DexScreener API client for fetching token and pair information.
 */
export class DexScreenerAPI {
  private readonly baseUrl = "https://api.dexscreener.com";

  /**
   * Search for tokens by query string.
   *
   * @param query
   */
  async searchToken(query: string): Promise<any> {
    const url = `${this.baseUrl}/latest/dex/search?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        `Failed to search tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get token pairs by address.
   *
   * @param address
   */
  async getTokenPairs(address: string): Promise<any> {
    const url = `${this.baseUrl}/latest/dex/tokens/${encodeURIComponent(address)}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        `Failed to get token pairs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get pair information by pair address.
   *
   * @param pairAddress
   */
  async getPairInfo(pairAddress: string): Promise<any> {
    const url = `${this.baseUrl}/latest/dex/pairs/${encodeURIComponent(pairAddress)}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        `Failed to get pair info: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
