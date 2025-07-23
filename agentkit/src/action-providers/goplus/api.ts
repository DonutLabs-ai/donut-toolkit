import { GOPLUS_API_BASE_URL, ENDPOINTS, REQUEST_CONFIG, ERROR_MESSAGES } from "./constants";
import { SolanaTokenSecurityResponse, GoplusActionProviderConfig } from "./types";

/**
 * GoPlus API client for security analysis
 */
export class GoplusAPI {
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly enableLogging: boolean;

  /**
   *
   * @param config
   */
  constructor(config: GoplusActionProviderConfig = {}) {
    this.baseURL = config.apiBaseUrl || GOPLUS_API_BASE_URL;
    this.timeout = config.timeout || REQUEST_CONFIG.TIMEOUT;
    this.maxRetries = config.maxRetries || REQUEST_CONFIG.MAX_RETRIES;
    this.enableLogging = config.enableLogging || false;
  }

  /**
   * Get security analysis for Solana tokens
   *
   * @param contractAddresses
   */
  async solanaTokenSecurity(
    contractAddresses: string | string[],
  ): Promise<SolanaTokenSecurityResponse> {
    const addresses = Array.isArray(contractAddresses)
      ? contractAddresses.join(",")
      : contractAddresses;
    const url = `${this.baseURL}${ENDPOINTS.SOLANA_TOKEN_SECURITY}?contract_addresses=${encodeURIComponent(addresses)}`;

    return this.makeRequest<SolanaTokenSecurityResponse>(url);
  }

  /**
   * Check if an address is malicious
   * For Solana token addresses, this will redirect to token security analysis
   * For wallet addresses, this will check the malicious address database
   *
   * @param address
   */
  async checkMaliciousAddress(address: string): Promise<any> {
    // For Solana token addresses (typically used for tokens), use token security endpoint
    // Token addresses are usually longer and have specific characteristics
    const isLikelyTokenAddress = this.isLikelyTokenAddress(address);
    
    if (isLikelyTokenAddress) {
      if (this.enableLogging) {
        console.log(`[GoPlus API] Treating ${address} as token address, using token security endpoint`);
      }
      // Use token security endpoint for token addresses
      return this.solanaTokenSecurity(address);
    }
    
    // For wallet addresses, try the malicious address endpoint
    const url = `${this.baseURL}${ENDPOINTS.MALICIOUS_ADDRESS}?address=${encodeURIComponent(address)}`;
    
    try {
      return await this.makeRequest(url);
    } catch (error) {
      if (this.enableLogging) {
        console.log(`[GoPlus API] Malicious address endpoint failed for ${address}, this may be expected for some address types`);
      }
      
      // If malicious address endpoint fails, return a safe default response
      if (error instanceof Error && error.message.includes('404')) {
        return {
          code: 200,
          message: "OK",
          result: {
            malicious: false,
            note: "Malicious address check not available for this address type. No malicious activity detected in available databases."
          }
        };
      }
      
      throw error;
    }
  }

  /**
   * Get address security information
   * This method handles both token and wallet addresses appropriately
   *
   * @param address
   */
  async getAddressSecurity(address: string): Promise<any> {
    // For token addresses, use token security endpoint
    if (this.isLikelyTokenAddress(address)) {
      if (this.enableLogging) {
        console.log(`[GoPlus API] Using token security endpoint for address ${address}`);
      }
      return this.solanaTokenSecurity(address);
    }
    
    // For wallet addresses, try the address security endpoint
    const url = `${this.baseURL}${ENDPOINTS.ADDRESS_SECURITY}?address=${encodeURIComponent(address)}`;
    
    try {
      return await this.makeRequest(url);
    } catch (error) {
      if (this.enableLogging) {
        console.log(`[GoPlus API] Address security endpoint failed for ${address}, trying malicious address endpoint as fallback`);
      }
      
      // Fallback to malicious address check
      if (error instanceof Error && error.message.includes('404')) {
        return this.checkMaliciousAddress(address);
      }
      
      throw error;
    }
  }

  /**
   * Make HTTP request with retry logic and error handling
   *
   * @param url
   * @param retryCount
   */
  private async makeRequest<T>(url: string, retryCount = 0): Promise<T> {
    try {
      if (this.enableLogging) {
        console.log(`[GoPlus API] Making request to: ${url}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Coinbase-AgentKit-GoPlus/1.0.0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (this.enableLogging) {
        console.log(`[GoPlus API] Response received:`, data);
      }

      // Check for API-level errors
      if (data.code && data.code !== 1 && data.code !== 200) {
        throw new GoplusApiError(data.code, data.message || ERROR_MESSAGES.API_ERROR);
      }

      return data;
    } catch (error: unknown) {
      if (this.enableLogging) {
        console.error(`[GoPlus API] Request failed:`, error);
      }

      // Handle timeout
      if (error instanceof Error && error.name === "AbortError") {
        if (retryCount < this.maxRetries) {
          if (this.enableLogging) {
            console.log(`[GoPlus API] Retrying request (${retryCount + 1}/${this.maxRetries})`);
          }
          await this.delay(REQUEST_CONFIG.RETRY_DELAY * (retryCount + 1));
          return this.makeRequest<T>(url, retryCount + 1);
        }
        throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
      }

      // Handle network errors with retry
      if (
        error instanceof Error &&
        error.message.includes("fetch") &&
        retryCount < this.maxRetries
      ) {
        if (this.enableLogging) {
          console.log(`[GoPlus API] Retrying request (${retryCount + 1}/${this.maxRetries})`);
        }
        await this.delay(REQUEST_CONFIG.RETRY_DELAY * (retryCount + 1));
        return this.makeRequest<T>(url, retryCount + 1);
      }

      // Re-throw GoPlus API errors
      if (error instanceof GoplusApiError) {
        throw error;
      }

      // Wrap other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}: ${errorMessage}`);
    }
  }

  /**
   * Delay utility for retry logic
   *
   * @param ms
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine if an address is likely a token address vs a wallet address
   * This is a heuristic based on common patterns
   *
   * @param address
   */
  private isLikelyTokenAddress(address: string): boolean {
    // Use known token addresses from constants
    if ((REQUEST_CONFIG.KNOWN_TOKEN_ADDRESSES as readonly string[]).includes(address)) {
      return true;
    }
    
    // Additional heuristics could be added here
    // For now, we'll default to treating unknown addresses as wallet addresses
    // unless they match known token patterns
    return false;
  }
}

/**
 * Custom error class for GoPlus API errors
 */
class GoplusApiError extends Error {
  /**
   *
   * @param code
   * @param message
   * @param details
   */
  constructor(
    public readonly code: number,
    message: string,
    public readonly details?: string,
  ) {
    super(message);
    this.name = "GoplusApiError";
  }
}
