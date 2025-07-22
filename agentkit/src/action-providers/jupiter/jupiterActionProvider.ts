import { ActionProvider } from "../actionProvider";
import { Network } from "../../network";
import { SvmWalletProvider } from "../../wallet-providers/svmWalletProvider";
import { z } from "zod";
import { CreateAction } from "../actionDecorator";
import { SwapTokenSchema } from "./schemas";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
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
   * @returns A message indicating success or failure with transaction details
   */
  @CreateAction({
    name: "swap",
    description: `
    Creates an unsigned swap transaction using Jupiter's DEX aggregator.
    - Input and output tokens must be valid SPL token mints.
    - Returns unsigned transaction data for manual signing.
    - If says "SOL" as the input or output, use the mint address So11111111111111111111111111111111111111112
    NOTE: Only available on Solana mainnet.
    `,
    schema: SwapTokenSchema,
  })
  async swap(
    walletProvider: SvmWalletProvider,
    args: z.infer<typeof SwapTokenSchema>,
  ): Promise<string> {
    try {
      const jupiterApi = createJupiterApiClient({
        basePath: "https://quote-api.jup.ag",
      });
      const userPublicKey = walletProvider.getPublicKey();
      const inputMint = new PublicKey(args.inputMint);
      const outputMint = new PublicKey(args.outputMint);

      const { getMint } = await import("@solana/spl-token");

      let mintInfo: Awaited<ReturnType<typeof getMint>>;
      try {
        mintInfo = await getMint(walletProvider.getConnection(), inputMint);
      } catch (error) {
        return `Failed to fetch mint info for mint address ${args.inputMint}. Error: ${error}`;
      }
      const amount = args.amount * 10 ** mintInfo.decimals;

      const quoteResponse = await jupiterApi.quoteGet({
        inputMint: inputMint.toBase58(),
        outputMint: outputMint.toBase58(),
        amount: amount,
        slippageBps: args.slippageBps || 50, // 0.5% default slippage
      });

      if (!quoteResponse) {
        throw new Error("Failed to get a swap quote.");
      }

      const swapRequest: SwapRequest = {
        userPublicKey: userPublicKey.toBase58(),
        wrapAndUnwrapSol: true,
        useSharedAccounts: true, // Optimize for low transaction costs
        quoteResponse,
      };

      const swapResponse = await jupiterApi.swapPost({ swapRequest });

      if (!swapResponse || !swapResponse.swapTransaction) {
        throw new Error("Failed to generate swap transaction.");
      }

      const unsignedTransaction = swapResponse.swapTransaction;

      return JSON.stringify({
        success: true,
        unsignedTransaction: unsignedTransaction,
        transactionType: "jupiter_swap",
        inputMint: args.inputMint,
        outputMint: args.outputMint,
        amount: args.amount,
        slippageBps: args.slippageBps || 50,
        quote: {
          inAmount: quoteResponse.inAmount,
          outAmount: quoteResponse.outAmount,
          priceImpact: quoteResponse.priceImpactPct,
          routePlan: quoteResponse.routePlan,
        },
        message: `Unsigned swap transaction created. Transaction data: ${unsignedTransaction.substring(0, 50)}...`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Error creating swap transaction: ${error}`,
        message: `Failed to create unsigned swap transaction: ${error}`,
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
    return network.protocolFamily == "svm" && network.networkId === "solana-mainnet";
  }
}

/**
 * Factory function to create a new JupiterActionProvider instance.
 *
 * @returns A new JupiterActionProvider instance
 */
export const jupiterActionProvider = () => new JupiterActionProvider();
