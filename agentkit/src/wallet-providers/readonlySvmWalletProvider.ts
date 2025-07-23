import { SvmWalletProvider } from "./svmWalletProvider";
import { Network } from "../network";
import { Connection, PublicKey, VersionedTransaction, RpcResponseAndContext, SignatureStatus, SignatureStatusConfig, SignatureResult } from "@solana/web3.js";
import { SOLANA_NETWORKS, SOLANA_CLUSTER, SOLANA_MAINNET_GENESIS_BLOCK_HASH } from "../network/svm";

/**
 * Read-only SVM wallet provider: 仅保存 publicKey 和 connection，用于生成 unsigned transactions。
 * 所有签名相关方法都会抛出异常。
 */
export class ReadonlySvmWalletProvider extends SvmWalletProvider {
  #publicKey: PublicKey;
  #connection: Connection;
  #genesisHash: SOLANA_CLUSTER;

  constructor({ publicKey, rpcUrl, genesisHash }: { publicKey: string; rpcUrl?: string; genesisHash?: string }) {
    super();

    if (!publicKey) {
      throw new Error("ReadonlySvmWalletProvider requires a publicKey");
    }

    this.#publicKey = new PublicKey(publicKey);
    this.#connection = new Connection(rpcUrl || "https://api.mainnet-beta.solana.com");
    this.#genesisHash = (genesisHash || SOLANA_MAINNET_GENESIS_BLOCK_HASH) as SOLANA_CLUSTER;
  }

  // ---------------------------------------------------------------------------
  // Required abstract implementations
  // ---------------------------------------------------------------------------

  getConnection(): Connection {
    return this.#connection;
  }

  getPublicKey(): PublicKey {
    return this.#publicKey;
  }

  getAddress(): string {
    return this.#publicKey.toBase58();
  }

  getNetwork(): Network {
    return SOLANA_NETWORKS[this.#genesisHash];
  }

  getName(): string {
    return "readonly_svm_wallet_provider";
  }

  async getBalance(): Promise<bigint> {
    const lamports = await this.#connection.getBalance(this.#publicKey);
    return BigInt(lamports);
  }

  // ---------------------------------------------------------------------------
  // Signing / sending not supported in read-only mode
  // ---------------------------------------------------------------------------

  async signTransaction(_transaction: VersionedTransaction): Promise<VersionedTransaction> {
    throw new Error("ReadonlySvmWalletProvider cannot sign transactions");
  }

  async sendTransaction(_transaction: VersionedTransaction): Promise<string> {
    throw new Error("ReadonlySvmWalletProvider cannot send transactions");
  }

  async signAndSendTransaction(_transaction: VersionedTransaction): Promise<string> {
    throw new Error("ReadonlySvmWalletProvider cannot sign nor send transactions");
  }

  async getSignatureStatus(_signature: string, _options?: SignatureStatusConfig): Promise<RpcResponseAndContext<SignatureStatus | null>> {
    throw new Error("ReadonlySvmWalletProvider cannot query signature status");
  }

  async waitForSignatureResult(_signature: string): Promise<RpcResponseAndContext<SignatureResult>> {
    throw new Error("ReadonlySvmWalletProvider cannot wait for signature result");
  }

  async nativeTransfer(_to: string, _value: string): Promise<string> {
    throw new Error("ReadonlySvmWalletProvider cannot perform native transfers");
  }
} 