import { 
  GOPLUS_API_BASE_URL, 
  ENDPOINTS, 
  REQUEST_CONFIG, 
  ERROR_MESSAGES 
} from "./constants";
import { 
  SolanaTokenSecurityResponse,
  GoplusActionProviderConfig 
} from "./types";

/**
 * GoPlus API client for security analysis
 */
export class GoplusAPI {
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly enableLogging: boolean;

  constructor(config: GoplusActionProviderConfig = {}) {
    this.baseURL = config.apiBaseUrl || GOPLUS_API_BASE_URL;
    this.timeout = config.timeout || REQUEST_CONFIG.TIMEOUT;
    this.maxRetries = config.maxRetries || REQUEST_CONFIG.MAX_RETRIES;
    this.enableLogging = config.enableLogging || false;
  }

  /**
   * Get security analysis for Solana tokens
   */
  async solanaTokenSecurity(contractAddresses: string | string[]): Promise<SolanaTokenSecurityResponse> {
    const addresses = Array.isArray(contractAddresses) ? contractAddresses.join(',') : contractAddresses;
    const url = `${this.baseURL}${ENDPOINTS.SOLANA_TOKEN_SECURITY}?contract_addresses=${encodeURIComponent(addresses)}`;
    
    return this.makeRequest<SolanaTokenSecurityResponse>(url);
  }

  /**
   * Check if an address is malicious
   */
  async checkMaliciousAddress(address: string): Promise<any> {
    const url = `${this.baseURL}${ENDPOINTS.MALICIOUS_ADDRESS}?address=${encodeURIComponent(address)}`;
    
    return this.makeRequest(url);
  }

  /**
   * Get address security information
   */
  async getAddressSecurity(address: string): Promise<any> {
    const url = `${this.baseURL}${ENDPOINTS.ADDRESS_SECURITY}?address=${encodeURIComponent(address)}`;
    
    return this.makeRequest(url);
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(url: string, retryCount = 0): Promise<T> {
    try {
      if (this.enableLogging) {
        console.log(`[GoPlus API] Making request to: ${url}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Coinbase-AgentKit-GoPlus/1.0.0',
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
      if (data.code && data.code !== 200) {
        throw new GoplusApiError(data.code, data.message || ERROR_MESSAGES.API_ERROR);
      }

      return data;

    } catch (error: unknown) {
      if (this.enableLogging) {
        console.error(`[GoPlus API] Request failed:`, error);
      }

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
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
      if (error instanceof Error && error.message.includes('fetch') && retryCount < this.maxRetries) {
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
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Custom error class for GoPlus API errors
 */
class GoplusApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'GoplusApiError';
  }
}
