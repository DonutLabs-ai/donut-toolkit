// run: npx tsx test-jupiter-swap.ts

import { createJupiterApiClient } from "@jup-ag/api";
import { PublicKey } from "@solana/web3.js";

/**
 * 测试脚本：调用真实的 Jupiter API 获取 swap transaction 并查看 base64 格式
 */
async function testJupiterSwap() {
  try {
    console.log("🚀 开始测试 Jupiter Swap API (免费版本)...\n");

    // 创建 Jupiter API 客户端 - 使用免费的 quote-api.jup.ag 端点
    const jupiterApi = createJupiterApiClient({
      basePath: "https://quote-api.jup.ag",
    });

    console.log("🔧 使用免费 API 端点: quote-api.jup.ag");

    // 如果需要付费版本，可以使用：
    // const jupiterApi = createJupiterApiClient({
    //   basePath: "https://api.jup.ag",
    //   apiKey: process.env.JUPITER_API_KEY
    // });

    // 测试参数：SOL 到 USDC 的 swap
    const inputMint = "So11111111111111111111111111111111111111112"; // SOL
    const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC
    const amount = 0.001 * 1e9; // 0.001 SOL (以 lamports 为单位)
    const slippageBps = 50; // 0.5% 滑点
    const userPublicKey = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"; // 测试用的公钥

    console.log("📋 Swap 参数:");
    console.log(`  输入代币: ${inputMint} (SOL)`);
    console.log(`  输出代币: ${outputMint} (USDC)`);
    console.log(`  数量: ${amount / 1e9} SOL`);
    console.log(`  滑点: ${slippageBps / 100}%`);
    console.log(`  用户公钥: ${userPublicKey}\n`);

    // 1. 获取报价
    console.log("📊 正在获取报价...");
    let quoteResponse: any;
    try {
      quoteResponse = await jupiterApi.quoteGet({
        inputMint: inputMint,
        outputMint: outputMint,
        amount: amount, // 直接传 number，不用 toString()
        slippageBps: slippageBps,
      });
    } catch (error: unknown) {
      console.error("❌ Jupiter API 调用失败:", error);
      if (error && typeof error === "object" && "response" in error) {
        const errorWithResponse = error as { response: { text: () => Promise<string> } };
        const text = await errorWithResponse.response.text();
        console.error("Jupiter API response:", text);
      }
      throw error;
    }

    if (!quoteResponse) {
      throw new Error("无法获取报价");
    }

    console.log("✅ 报价获取成功:");
    console.log(`  输入数量: ${quoteResponse.inAmount}`);
    console.log(`  输出数量: ${quoteResponse.outAmount}`);
    console.log(`  价格影响: ${quoteResponse.priceImpactPct}%`);
    console.log(`  路由计划: ${JSON.stringify(quoteResponse.routePlan, null, 2)}\n`);

    // 2. 生成 swap transaction
    console.log("🔧 正在生成 swap transaction...");
    const swapResponse = await jupiterApi.swapPost({
      swapRequest: {
        userPublicKey: userPublicKey,
        wrapAndUnwrapSol: true,
        useSharedAccounts: true,
        quoteResponse: quoteResponse,
      },
    });

    if (!swapResponse || !swapResponse.swapTransaction) {
      throw new Error("无法生成 swap transaction");
    }

    const unsignedTransaction = swapResponse.swapTransaction;

    console.log("✅ Swap transaction 生成成功!");
    console.log("\n" + "=".repeat(80));
    console.log("🔍 BASE64 格式的 unsigned transaction:");
    console.log("=".repeat(80));
    console.log(unsignedTransaction);
    console.log("=".repeat(80));

    // 3. 分析 base64 数据
    console.log("\n📊 BASE64 数据分析:");
    console.log(`  长度: ${unsignedTransaction.length} 字符`);
    console.log(`  前50个字符: ${unsignedTransaction.substring(0, 50)}...`);
    console.log(
      `  后50个字符: ...${unsignedTransaction.substring(unsignedTransaction.length - 50)}`,
    );

    // 4. 验证 base64 格式
    try {
      const decodedBuffer = Buffer.from(unsignedTransaction, "base64");
      console.log(`  解码后字节数: ${decodedBuffer.length} bytes`);
      console.log(`  解码后前20字节: ${decodedBuffer.slice(0, 20).toString("hex")}`);
    } catch (error) {
      console.log(`  ❌ Base64 解码失败: ${error}`);
    }

    // 5. 模拟完整的交易流程
    console.log("\n🔄 模拟交易流程:");
    console.log("1. ✅ 获取报价");
    console.log("2. ✅ 生成 unsigned transaction (base64)");
    console.log("3. 🔄 反序列化为 VersionedTransaction");
    console.log("4. 🔄 使用钱包签名");
    console.log("5. 🔄 发送交易到网络");

    console.log("\n💡 使用说明:");
    console.log("- 这个 base64 字符串可以直接传递给 Solana 钱包进行签名");
    console.log("- 使用 VersionedTransaction.deserialize(Buffer.from(base64, 'base64')) 反序列化");
    console.log("- 签名后可以发送到 Solana 网络");
    console.log("- 使用免费 API: lite-api.jup.ag (无需 API 密钥)");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 运行测试
testJupiterSwap()
  .then(() => {
    console.log("\n🏁 测试完成");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 测试异常:", error);
    process.exit(1);
  });
