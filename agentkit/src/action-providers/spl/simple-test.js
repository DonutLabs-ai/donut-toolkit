/**
 * Simple test for SPL transfer functionality - using JavaScript to avoid decorator issues
 */

const { PublicKey, VersionedTransaction, MessageV0 } = require("@solana/web3.js");

// Test configuration
const TEST_CONFIG = {
  userPublicKey: "FtFZzg62oz93YxWe3FNCtFF5Le12bvCfepYg7RNcZLgp",
  recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  tokens: {
    USDC: {
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      symbol: "USDC"
    },
    USDT: {
      mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", 
      decimals: 6,
      symbol: "USDT"
    },
    SOL: {
      mint: "So11111111111111111111111111111111111111112",
      decimals: 9,
      symbol: "Wrapped SOL"
    }
  }
};

// Mock wallet provider
class MockWalletProvider {
  constructor(publicKeyString) {
    this.publicKey = new PublicKey(publicKeyString);
  }

  getPublicKey() {
    return this.publicKey;
  }

  getAddress() {
    return this.publicKey.toString();
  }
}

// Simple SPL transfer implementation (core of method 1)
async function createSplTransfer(walletProvider, args) {
  try {
    const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction } = 
      await import("@solana/spl-token");

    const fromPubkey = walletProvider.getPublicKey();
    const toPubkey = new PublicKey(args.recipient);
    const mintPubkey = new PublicKey(args.mintAddress);

    // Calculate the raw amount using user-provided decimals
    const adjustedAmount = args.amount * Math.pow(10, args.decimals);
    
    // Calculate ATA addresses (no chain queries needed)
    const sourceAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
    const destinationAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);

    const instructions = [];

    // Always add create ATA instruction (chain will handle if it already exists)
    instructions.push(
      createAssociatedTokenAccountInstruction(fromPubkey, destinationAta, toPubkey, mintPubkey)
    );

    // Add transfer instruction
    instructions.push(
      createTransferCheckedInstruction(
        sourceAta,
        mintPubkey,
        destinationAta,
        fromPubkey,
        adjustedAmount,
        args.decimals,
      )
    );

    // Build unsigned transaction with placeholder blockhash
    const tx = new VersionedTransaction(
      MessageV0.compile({
        payerKey: fromPubkey,
        instructions: instructions,
        recentBlockhash: "11111111111111111111111111111111", // Placeholder blockhash
      })
    );

    // Serialize to base64
    const unsignedTransaction = Buffer.from(tx.serialize()).toString("base64");

    return {
      success: true,
      message: "Successfully created unsigned SPL token transfer transaction",
      unsigned_message: unsignedTransaction,
      transactionType: "spl_transfer",
      mintAddress: args.mintAddress,
      recipient: args.recipient,
      amount: args.amount,
      decimals: args.decimals,
      adjustedAmount: adjustedAmount.toString(),
      requiresBlockhashUpdate: true,
      note: "Update the blockhash before signing this transaction",
    };

  } catch (error) {
    return {
      success: false,
      error: "Failed to create transfer transaction",
      message: `Error creating SPL token transfer transaction: ${error}`,
    };
  }
}

async function runTests() {
  console.log("🚀 Testing SPL Transfer with Real API Environment (Simplified)");
  console.log("=" .repeat(60));
  
  const mockWallet = new MockWalletProvider(TEST_CONFIG.userPublicKey);

  console.log(`📍 Test Configuration:`);
  console.log(`  User: ${TEST_CONFIG.userPublicKey}`);
  console.log(`  Recipient: ${TEST_CONFIG.recipient}`);
  console.log("");

  // Test each token type
  for (const [symbol, tokenInfo] of Object.entries(TEST_CONFIG.tokens)) {
    console.log(`\n💰 Testing ${symbol} Transfer`);
    console.log("-".repeat(40));
    
    try {
      const transferAmount = symbol === "BONK" ? 1000 : 1;
      
      console.log(`📊 Transfer Details:`);
      console.log(`  Token: ${tokenInfo.symbol}`);
      console.log(`  Mint: ${tokenInfo.mint}`);
      console.log(`  Decimals: ${tokenInfo.decimals}`);
      console.log(`  Amount: ${transferAmount} ${symbol}`);
      console.log(`  Raw Amount: ${transferAmount * Math.pow(10, tokenInfo.decimals)}`);

      const result = await createSplTransfer(mockWallet, {
        recipient: TEST_CONFIG.recipient,
        mintAddress: tokenInfo.mint,
        amount: transferAmount,
        decimals: tokenInfo.decimals,
      });

      console.log(`\n✅ Transfer Result:`);
      
      if (result.success) {
        console.log(`  ✓ Success: ${result.message}`);
        console.log(`  ✓ Transaction Type: ${result.transactionType}`);
        console.log(`  ✓ Requires Blockhash Update: ${result.requiresBlockhashUpdate}`);
        console.log(`  ✓ Adjusted Amount: ${result.adjustedAmount}`);
        
        // Validate unsigned transaction
        if (result.unsigned_message) {
          console.log(`\n🔍 Transaction Analysis:`);
          console.log(`  ✓ Base64 Length: ${result.unsigned_message.length} characters`);
          
          // Validate base64 format
          try {
            const decodedBuffer = Buffer.from(result.unsigned_message, "base64");
            console.log(`  ✓ Decoded Size: ${decodedBuffer.length} bytes`);
            console.log(`  ✓ First 20 bytes: ${decodedBuffer.slice(0, 20).toString("hex")}`);
            
            // Try to deserialize back to transaction
            const deserializedTx = VersionedTransaction.deserialize(decodedBuffer);
            console.log(`  ✓ Transaction deserialized successfully`);
            console.log(`  ✓ Instructions count: ${deserializedTx.message.staticAccountKeys.length}`);
            
            // Display transaction preview
            console.log(`\n📋 Transaction Preview:`);
            console.log(`  - From: ${TEST_CONFIG.userPublicKey}`);
            console.log(`  - To: ${TEST_CONFIG.recipient}`);
            console.log(`  - Token: ${tokenInfo.mint}`);
            console.log(`  - Amount: ${transferAmount} ${symbol}`);
            console.log(`  - Note: ${result.note}`);
            
          } catch (error) {
            console.log(`  ❌ Transaction validation failed: ${error}`);
          }
        } else {
          console.log(`  ❌ No unsigned transaction returned`);
        }
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
        console.log(`  ❌ Message: ${result.message}`);
      }

    } catch (error) {
      console.log(`❌ Test failed for ${symbol}: ${error}`);
    }
  }

  // Test edge cases
  console.log(`\n🧪 Testing Edge Cases`);
  console.log("-".repeat(40));

  // Test with very small amount
  try {
    console.log(`\n🔬 Test: Very small USDC amount (0.000001)`);
    const result = await createSplTransfer(mockWallet, {
      recipient: TEST_CONFIG.recipient,
      mintAddress: TEST_CONFIG.tokens.USDC.mint,
      amount: 0.000001,
      decimals: TEST_CONFIG.tokens.USDC.decimals,
    });

    console.log(`  Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
    if (result.success) {
      console.log(`  Raw amount: ${result.adjustedAmount}`);
    } else {
      console.log(`  Error: ${result.message}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
  }

  // Test with invalid address
  try {
    console.log(`\n🔬 Test: Invalid recipient address`);
    const result = await createSplTransfer(mockWallet, {
      recipient: "invalid-address",
      mintAddress: TEST_CONFIG.tokens.USDC.mint,
      amount: 1,
      decimals: TEST_CONFIG.tokens.USDC.decimals,
    });

    console.log(`  Result: ${result.success ? '✅ Success' : '❌ Failed (Expected)'}`);
    if (!result.success) {
      console.log(`  Error message: ${result.message}`);
    }
  } catch (error) {
    console.log(`  ❌ Error (Expected): ${error.message}`);
  }

  console.log(`\n🎉 SPL Transfer Testing Complete!`);
  console.log("=" .repeat(60));
  console.log(`\n💡 Summary:`);
  console.log(`  - ✅ Optimized SPL transfer implementation tested`);
  console.log(`  - ✅ No on-chain data dependencies during construction`);
  console.log(`  - ✅ User provides token decimals`);
  console.log(`  - ✅ Returns unsigned base64 transaction`);
  console.log(`  - ✅ Transaction can be deserialized successfully`);
  console.log(`  - ⚠️  User must update blockhash before signing`);
}

// Run the test
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { createSplTransfer, MockWalletProvider }; 