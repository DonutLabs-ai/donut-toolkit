const { PublicKey, VersionedTransaction, MessageV0 } = require("@solana/web3.js");

/**
 * 演示 Solana NFT 转移功能
 * 这个演示模拟了我们新建的 SolanaNftActionProvider 的 transferNft 方法
 */
async function demonstrateNftTransfer() {
  console.log("🚀 演示 Solana NFT Transfer 未签名交易生成");
  
  // 真实的 Solana 地址示例
  const fromAddress = "11111111111111111111111111111112"; // 系统程序地址 (示例发送者)
  const recipientAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // 真实的接收者地址
  const nftMintAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"; // 示例 NFT mint 地址
  
  console.log("📝 转移参数:");
  console.log("  发送者:", fromAddress);
  console.log("  接收者:", recipientAddress);
  console.log("  NFT Mint:", nftMintAddress);
  
  try {
    // 模拟创建转移指令
    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(recipientAddress);
    const mintPubkey = new PublicKey(nftMintAddress);
    
    // 动态导入 SPL Token 模块
    const {
      getAssociatedTokenAddress,
      createAssociatedTokenAccountInstruction,
      createTransferInstruction,
    } = await import("@solana/spl-token");

    // 计算关联代币账户地址
    const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
    const destinationAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);
    
    console.log("\n🔗 关联代币账户:");
    console.log("  源 ATA:", sourceAta.toString());
    console.log("  目标 ATA:", destinationAta.toString());

    // 创建交易指令
    const instructions = [];

    // 添加创建关联代币账户指令（如果已存在会被忽略）
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        destinationAta,
        toPubkey,
        mintPubkey
      )
    );

    // 添加 NFT 转移指令（NFT 数量总是 1）
    instructions.push(
      createTransferInstruction(
        sourceAta,
        destinationAta,
        fromPubkey,
        1, // NFT 数量总是 1
      )
    );

    console.log("\n📦 创建了", instructions.length, "个交易指令");

    // 构建未签名交易（使用占位符 blockhash）
    const tx = new VersionedTransaction(
      MessageV0.compile({
        payerKey: fromPubkey,
        instructions: instructions,
        recentBlockhash: "11111111111111111111111111111111", // 占位符 blockhash
      })
    );

    // 序列化为 base64
    const unsignedTransaction = Buffer.from(tx.serialize()).toString("base64");

    console.log("\n✅ 成功创建未签名 NFT 转移交易!");
    console.log("\n📋 交易结果:");
    
    const result = {
      success: true,
      message: "Successfully created unsigned NFT transfer transaction",
      unsignedTransaction: unsignedTransaction,
      transactionType: "nft_transfer",
      assetId: nftMintAddress,
      recipient: recipientAddress,
      requiresBlockhashUpdate: true,
      note: "Update the blockhash before signing this transaction",
    };

    console.log(JSON.stringify(result, null, 2));
    
    console.log("\n🔐 接下来的步骤:");
    console.log("1. 更新交易的 blockhash 为最新值");
    console.log("2. 使用您的私钥签名交易"); 
    console.log("3. 广播已签名的交易到 Solana 网络");
    
    console.log("\n📦 Base64 未签名交易:");
    console.log(unsignedTransaction);
    
    return unsignedTransaction;
    
  } catch (error) {
    console.error("❌ 创建 NFT 转移交易时出错:", error.message);
    
    const errorResult = {
      success: false,
      error: "Failed to create transfer transaction",
      message: `Error creating NFT transfer transaction: ${error.message}`,
    };
    
    console.log(JSON.stringify(errorResult, null, 2));
    return null;
  }
}

// 运行演示
if (require.main === module) {
  demonstrateNftTransfer()
    .then((result) => {
      if (result) {
        console.log("\n🎉 演示完成! 未签名交易已生成。");
      } else {
        console.log("\n💥 演示失败。");
      }
    })
    .catch(console.error);
}

module.exports = { demonstrateNftTransfer }; 