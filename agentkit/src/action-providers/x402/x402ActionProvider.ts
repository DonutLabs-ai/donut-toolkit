import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { CreateAction } from "../actionDecorator";
import { HttpRequestSchema } from "./schemas";
import { EvmWalletProvider } from "../../wallet-providers";
import axios, { AxiosError } from "axios";
import type { PaymentRequirements } from "x402";
// @ts-ignore
import { PaymentRequirementsSchema } from "x402/types";

const SUPPORTED_NETWORKS = ["base-mainnet", "base-sepolia"];

/**
 * X402ActionProvider provides actions for making HTTP requests, with optional x402 payment handling.
 */
export class X402ActionProvider extends ActionProvider<EvmWalletProvider> {
  /**
   * Creates a new instance of X402ActionProvider.
   * Initializes the provider with x402 capabilities.
   */
  constructor() {
    super("x402", []);
  }

  /**
   * Makes a basic HTTP request to an API endpoint.
   *
   * @param walletProvider - The wallet provider to use for potential payments
   * @param args - The request parameters including URL, method, headers, and body
   * @returns A JSON string containing the response or error details
   */
  @CreateAction({
    name: "make_http_request",
    description: `
Makes a basic HTTP request to an API endpoint. If the endpoint requires payment (returns 402),
it will return payment details that can be used with retry_http_request_with_x402.

EXAMPLES:
- Production API: make_http_request("https://api.example.com/weather")
- Local development: make_http_request("http://localhost:3000/api/data")
- Testing x402: make_http_request("http://localhost:3000/protected")

If you receive a 402 Payment Required response, use retry_http_request_with_x402 to handle the payment.`,
    schema: HttpRequestSchema,
  })
  async makeHttpRequest(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HttpRequestSchema>,
  ): Promise<string> {
    try {
      const response = await axios.request({
        url: args.url,
        method: args.method ?? "GET",
        headers: args.headers ?? undefined,
        data: args.body,
        validateStatus: status => status === 402 || (status >= 200 && status < 300),
      });

      if (response.status !== 402) {
        return JSON.stringify(
          {
            success: true,
            url: args.url,
            method: args.method,
            status: response.status,
            data: response.data,
          },
          null,
          2,
        );
      }

      const paymentRequirements = (response.data.accepts as PaymentRequirements[]).map(accept =>
        PaymentRequirementsSchema.parse(accept),
      );

      return JSON.stringify({
        status: "error_402_payment_required",
        acceptablePaymentOptions: paymentRequirements,
        nextSteps: [
          "Inform the user that the requested server replied with a 402 Payment Required response.",
          `The payment options are: ${paymentRequirements.map(option => `${option.asset} ${option.maxAmountRequired} ${option.network}`).join(", ")}`,
          "Ask the user if they want to retry the request with payment.",
          `Use retry_http_request_with_x402 to retry the request with payment.`,
        ],
      });
    } catch (error) {
      return this.handleHttpError(error as AxiosError, args.url);
    }
  }

  /**
   * Checks if the action provider supports the given network.
   *
   * @param network - The network to check support for
   * @returns True if the network is supported, false otherwise
   */
  supportsNetwork = (network: Network) =>
    network.protocolFamily === "evm" && SUPPORTED_NETWORKS.includes(network.networkId!);

  /**
   * Helper method to handle HTTP errors consistently.
   *
   * @param error - The axios error to handle
   * @param url - The URL that was being accessed when the error occurred
   * @returns A JSON string containing formatted error details
   */
  private handleHttpError(error: AxiosError, url: string): string {
    if (error.response) {
      return JSON.stringify(
        {
          error: true,
          message: `HTTP ${error.response.status} error when accessing ${url}`,
          details: (error.response.data as { error?: string })?.error || error.response.statusText,
          suggestion: "Check if the URL is correct and the API is available.",
        },
        null,
        2,
      );
    }

    if (error.request) {
      return JSON.stringify(
        {
          error: true,
          message: `Network error when accessing ${url}`,
          details: error.message,
          suggestion: "Check your internet connection and verify the API endpoint is accessible.",
        },
        null,
        2,
      );
    }

    return JSON.stringify(
      {
        error: true,
        message: `Error making request to ${url}`,
        details: error.message,
        suggestion: "Please check the request parameters and try again.",
      },
      null,
      2,
    );
  }
}

export const x402ActionProvider = () => new X402ActionProvider();
