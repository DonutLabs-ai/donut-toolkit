import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { SvmWalletProvider } from "../../wallet-providers/svmWalletProvider";
import { z } from "zod";
import { CreateAction } from "../actionDecorator";
import { SwapTokenSchema } from "./schemas";
import { PublicKey } from "@solana/web3.js";
import { createJupiterApiClient, SwapRequest } from "@jup-ag/api";

/**
 * JupiterActionProvider handles token swaps using Jupiter's API.
 */
export class JupiterActionProvider extends ActionProvider<SvmWalletProvider> {
  /**
   * Initializes Jupiter API client.
   */
  constructor() {
    super("jupiter", []);
  }

  /**
   * Swaps tokens using Jupiter's API.
   *
   * @param walletProvider - The wallet provider to use for the swap
   * @param args - Swap parameters including input token, output token, and amount
   * @returns A JSON string containing the unsigned transaction message
   */
  @CreateAction({
    name: "swap",
    description: `
    Creates an unsigned swap transaction using Jupiter's DEX aggregator.
    - Input and output tokens must be valid SPL token mints
    - Amount should be specified in token units (not raw)
    - Returns unsigned transaction data for manual signing
    - If says "SOL" as the input or output, use the mint address So11111111111111111111111111111111111111112
    - User must sign and broadcast the transaction separately
    NOTE: Only available on Solana mainnet.
    `,
    schema: SwapTokenSchema,
  })
  async swap(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof SwapTokenSchema>,
  ): Promise<string> {
    try {
      // Log input parameters for debugging
      const userPublicKey = walletProvider.getPublicKey();
      const network = walletProvider.getConnection().rpcEndpoint;
      
      console.log("Jupiter Swap Debug Info:");
      console.log("  User Public Key:", userPublicKey.toBase58());
      console.log("  Network:", network);
      console.log("  Input Mint:", args.inputMint);
      console.log("  Output Mint:", args.outputMint);
      console.log("  Amount:", args.amount);
      console.log("  Slippage BPS:", args.slippageBps || 50);

      // Validate network first
      if (!network.includes("mainnet")) {
        return JSON.stringify({
          success: false,
          error: "Network not supported",
          message: "Jupiter swaps are only available on Solana mainnet",
          debug: { network, userPublicKey: userPublicKey.toBase58() }
        });
      }

      // Validate addresses
      if (!this.validateSolanaAddress(args.inputMint)) {
        return JSON.stringify({
          success: false,
          error: "Invalid input mint address",
          message: `Input mint address ${args.inputMint} is not a valid Solana address`,
          debug: { inputMint: args.inputMint, length: args.inputMint.length }
        });
      }

      if (!this.validateSolanaAddress(args.outputMint)) {
        return JSON.stringify({
          success: false,
          error: "Invalid output mint address",
          message: `Output mint address ${args.outputMint} is not a valid Solana address`,
          debug: { outputMint: args.outputMint, length: args.outputMint.length }
        });
      }

      const jupiterApi = createJupiterApiClient({
        basePath: "https://quote-api.jup.ag",
      });
      const inputMint = new PublicKey(args.inputMint);
      const outputMint = new PublicKey(args.outputMint);

      console.log("  Parsed PublicKeys successfully");

      const { getMint } = await import("@solana/spl-token");

      let mintInfo: Awaited<ReturnType<typeof getMint>>;
      try {
        console.log("  Fetching mint info for input mint...");
        mintInfo = await getMint(walletProvider.getConnection(), inputMint);
        console.log("  Mint info fetched - decimals:", mintInfo.decimals);
      } catch (error) {
        console.log("  Error fetching mint info:", error);
        return JSON.stringify({
          success: false,
          error: "Failed to fetch mint info",
          message: `Failed to fetch mint info for mint address ${args.inputMint}. Error: ${error}`,
          debug: { inputMint: args.inputMint, errorMessage: String(error) }
        });
      }

      // Calculate amount with proper precision
      const adjustedAmount = Math.floor(args.amount * Math.pow(10, mintInfo.decimals));
      console.log("  Amount calculation:", args.amount, "->", adjustedAmount, "(decimals:", mintInfo.decimals + ")");

      console.log("  Calling Jupiter API for quote...");
      const quoteParams = {
        inputMint: inputMint.toBase58(),
        outputMint: outputMint.toBase58(),
        amount: adjustedAmount,
        slippageBps: args.slippageBps || 50, // 0.5% default slippage
      };
      console.log("  Quote params:", quoteParams);

      const quoteResponse = await jupiterApi.quoteGet(quoteParams);

      if (!quoteResponse) {
        console.log("  No quote response received from Jupiter API");
        return JSON.stringify({
          success: false,
          error: "Failed to get swap quote",
          message:
            "Jupiter API failed to provide a swap quote. This may be due to insufficient liquidity or invalid token pair.",
          debug: { quoteParams }
        });
      }

      console.log("  Quote received:");
      console.log("    Input amount:", quoteResponse.inAmount);
      console.log("    Output amount:", quoteResponse.outAmount);
      console.log("    Price impact:", quoteResponse.priceImpactPct + "%");

      const swapRequest: SwapRequest = {
        userPublicKey: userPublicKey.toBase58(),
        wrapAndUnwrapSol: true,
        useSharedAccounts: true, // Optimize for low transaction costs
        quoteResponse,
      };

      console.log("  Creating swap transaction...");
      console.log("  Swap request user public key:", userPublicKey.toBase58());

      const swapResponse = await jupiterApi.swapPost({ swapRequest });

      if (!swapResponse || !swapResponse.swapTransaction) {
        console.log("  Failed to get swap transaction from Jupiter API");
        console.log("  Swap response:", swapResponse ? "exists but no swapTransaction" : "null");
        return JSON.stringify({
          success: false,
          error: "Failed to generate swap transaction",
          message:
            "Jupiter API failed to generate the swap transaction. Please try again or check if the token pair is supported.",
          debug: { 
            hasSwapResponse: !!swapResponse,
            hasSwapTransaction: !!(swapResponse && swapResponse.swapTransaction),
            swapRequest 
          }
        });
      }

      const unsignedTransaction = swapResponse.swapTransaction;
      console.log("  Swap transaction received, length:", unsignedTransaction.length);

      // Validate that we got a proper base64 transaction
      try {
        const decoded = Buffer.from(unsignedTransaction, "base64");
        console.log("  Base64 validation successful, decoded length:", decoded.length, "bytes");
      } catch (error) {
        console.log("  Base64 validation failed:", error);
        return JSON.stringify({
          success: false,
          error: "Invalid transaction format",
          message: "Received invalid base64 transaction data from Jupiter API",
          debug: { transactionLength: unsignedTransaction.length, error: String(error) }
        });
      }

      console.log("  Jupiter swap transaction created successfully!");

      return JSON.stringify({
        success: true,
        message: "Successfully created unsigned Jupiter swap transaction",
        unsigned_message: unsignedTransaction,
        transactionType: "jupiter_swap",
        inputMint: args.inputMint,
        outputMint: args.outputMint,
        amount: args.amount,
        adjustedAmount: adjustedAmount.toString(),
        slippageBps: args.slippageBps || 50,
        quote: {
          inAmount: quoteResponse.inAmount,
          outAmount: quoteResponse.outAmount,
          priceImpact: quoteResponse.priceImpactPct,
          routePlan: quoteResponse.routePlan,
        },
        note: "Sign and broadcast this transaction to complete the swap",
        debug: {
          userPublicKey: userPublicKey.toBase58(),
          network,
          transactionLength: unsignedTransaction.length
        }
      });
    } catch (error) {
      console.log("  Error in Jupiter swap:", error);
      return JSON.stringify({
        success: false,
        error: "Failed to create swap transaction",
        message: `Error creating Jupiter swap transaction: ${error}`,
        debug: { 
          errorMessage: String(error), 
          errorStack: error instanceof Error ? error.stack : undefined,
          args 
        }
      });
    }
  }

  /**
   * Checks if the action provider supports the given network.
   * Only supports Solana networks.
   *
   * @param network - The network to check support for
   * @returns True if the network is a Solana network
   */
  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "svm" && network.networkId === "solana-mainnet";
  }

  /**
   * Validates if a string is a valid Solana address.
   *
   * @param address - The address string to validate
   * @returns True if the address is valid, false otherwise
   */
  private validateSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create a new JupiterActionProvider instance.
 *
 * @returns A new JupiterActionProvider instance
 */
export const jupiterActionProvider = () => new JupiterActionProvider();
