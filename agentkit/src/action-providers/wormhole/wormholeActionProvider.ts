import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { CreateAction } from "../actionDecorator";
import {
  GetTransferStatusSchema,
  GetSupportedChainsSchema,
  GetTokenInfoSchema,
  EstimateFeesSchema,
} from "./schemas";
import { WormholeAPI } from "./api";
import { Network } from "../../network";

/**
 * WormholeActionProvider provides actions for cross-chain token transfers
 * using the Wormhole bridge protocol.
 */
export class WormholeActionProvider extends ActionProvider {
  private readonly api: WormholeAPI;

  /**
   *
   */
  constructor() {
    super("wormhole", []);
    this.api = new WormholeAPI();
  }

  /**
   * Get the status of a cross-chain transfer.
   *
   * @param args
   */
  @CreateAction({
    name: "get_transfer_status",
    description: "Check the status of a Wormhole cross-chain transfer using the transaction hash.",
    schema: GetTransferStatusSchema,
  })
  async getTransferStatus(args: z.infer<typeof GetTransferStatusSchema>): Promise<string> {
    try {
      const { txHash, fromChain } = args;

      if (!this.api.isChainSupported(fromChain)) {
        return JSON.stringify({
          success: false,
          error: "Unsupported chain",
          message: `Chain '${fromChain}' is not supported by Wormhole`,
        });
      }

      const status = await this.api.getTransferStatus(txHash, fromChain);

      return JSON.stringify({
        success: true,
        data: {
          txHash: status.txHash,
          fromChain: status.fromChain,
          status: status.status,
          vaaId: status.vaaId,
          destinationTxHash: status.destinationTxHash,
          estimatedCompletion: status.estimatedCompletion,
          message: status.message,
          statusDescription:
            {
              pending: "Transfer is being processed on the bridge",
              completed: "Transfer has been completed successfully",
              failed: "Transfer has failed and needs to be retried",
            }[status.status] || "Unknown status",
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Status Check Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get list of chains supported by Wormhole.
   *
   * @param args
   */
  @CreateAction({
    name: "get_supported_chains",
    description: "Get a list of all blockchain networks supported by the Wormhole bridge.",
    schema: GetSupportedChainsSchema,
  })
  async getSupportedChains(args: z.infer<typeof GetSupportedChainsSchema>): Promise<string> {
    try {
      const chains = this.api.getSupportedChains();

      return JSON.stringify({
        success: true,
        data: {
          totalChains: chains.length,
          chains: chains,
          popular: [
            { name: "ethereum", chainId: 2, description: "Ethereum Mainnet" },
            { name: "solana", chainId: 1, description: "Solana Mainnet" },
            { name: "polygon", chainId: 5, description: "Polygon (Matic)" },
            { name: "bsc", chainId: 4, description: "Binance Smart Chain" },
            { name: "avalanche", chainId: 6, description: "Avalanche C-Chain" },
            { name: "arbitrum", chainId: 23, description: "Arbitrum One" },
            { name: "optimism", chainId: 24, description: "Optimism" },
            { name: "base", chainId: 30, description: "Base" },
          ],
          note: "Wormhole supports many blockchain networks for cross-chain transfers",
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Chains Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get token information across different chains.
   *
   * @param args
   */
  @CreateAction({
    name: "get_token_info",
    description:
      "Get information about a token and its wrapped versions on other chains supported by Wormhole.",
    schema: GetTokenInfoSchema,
  })
  async getTokenInfo(args: z.infer<typeof GetTokenInfoSchema>): Promise<string> {
    try {
      const { tokenAddress, chain } = args;

      if (!this.api.isChainSupported(chain)) {
        return JSON.stringify({
          success: false,
          error: "Unsupported chain",
          message: `Chain '${chain}' is not supported by Wormhole`,
        });
      }

      const tokenInfo = await this.api.getTokenInfo(tokenAddress, chain);

      return JSON.stringify({
        success: true,
        data: {
          originalToken: tokenInfo.originalToken,
          wrappedTokens: tokenInfo.wrappedTokens,
          isWrapped: tokenInfo.isWrapped,
          originalChain: tokenInfo.originalChain,
          decimals: tokenInfo.decimals,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          transferSupported: true,
          note: tokenInfo.note,
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Token Info Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Estimate fees for a cross-chain transfer.
   *
   * @param args
   */
  @CreateAction({
    name: "estimate_fees",
    description: "Estimate the fees required for a cross-chain token transfer via Wormhole bridge.",
    schema: EstimateFeesSchema,
  })
  async estimateFees(args: z.infer<typeof EstimateFeesSchema>): Promise<string> {
    try {
      const { fromChain, toChain, tokenAddress, amount } = args;

      if (fromChain.toLowerCase() === toChain.toLowerCase()) {
        return JSON.stringify({
          success: false,
          error: "Invalid request",
          message: "Source and destination chains cannot be the same",
        });
      }

      if (!this.api.isChainSupported(fromChain)) {
        return JSON.stringify({
          success: false,
          error: "Unsupported chain",
          message: `Source chain '${fromChain}' is not supported by Wormhole`,
        });
      }

      if (!this.api.isChainSupported(toChain)) {
        return JSON.stringify({
          success: false,
          error: "Unsupported chain",
          message: `Destination chain '${toChain}' is not supported by Wormhole`,
        });
      }

      const feeEstimate = await this.api.estimateFees({
        fromChain,
        toChain,
        tokenAddress,
        amount,
      });

      return JSON.stringify({
        success: true,
        data: {
          fromChain: feeEstimate.fromChain,
          toChain: feeEstimate.toChain,
          baseFee: feeEstimate.baseFee,
          relayFee: feeEstimate.relayFee,
          totalFee: feeEstimate.totalFee,
          estimatedTime: feeEstimate.estimatedTime,
          breakdown: {
            "Bridge Fee": "Fee paid to Wormhole bridge protocol",
            "Relay Fee": "Fee for automatic completion on destination chain",
            "Gas Fees": "Network transaction fees on both chains",
          },
          note: feeEstimate.note,
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Fee Estimation Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if the action provider supports the given network.
   * Wormhole supports multiple networks, so this checks against supported chains.
   *
   * @param network
   */
  supportsNetwork(network: Network): boolean {
    // Extract chain name from networkId or use protocol family
    const chainName = network.networkId?.split("-")[0] || network.protocolFamily;
    return this.api.isChainSupported(chainName);
  }
}
