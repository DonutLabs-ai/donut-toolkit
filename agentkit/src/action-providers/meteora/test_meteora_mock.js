const { MeteoraDLMMActionProvider } = require('./dist/action-providers/meteora/meteoraActionProvider');
const { PublicKey } = require('@solana/web3.js');

// Mock wallet provider
class MockWalletProvider {
  getPublicKey() {
    return new PublicKey('FtFZzg62oz93YxWe3FNCtFF5Le12bvCfepYg7RNcZLgp');
  }
}

async function testMockResponses() {
  console.log('🧪 Testing Meteora DLMM Action Provider Mock Responses...\n');

  const provider = new MeteoraDLMMActionProvider();
  const mockWallet = new MockWalletProvider();

  // Test createPosition
  console.log('📋 Testing createPosition...');
  try {
    const createResult = await provider.createPosition(mockWallet, {
      poolAddress: '4Xq5CmMk7uh6N624VtMnXJUMm33jmfU5EGrZ5UTFEUV6',
      tokenXAmount: 0.1,
      tokenYAmount: 10,
      lowerBinId: 100,
      upperBinId: 200,
      slippageBps: 100
    });

    const parsedResult = JSON.parse(createResult);
    console.log('✅ createPosition Result:');
    console.log(JSON.stringify(parsedResult, null, 2));

    if (parsedResult.success && parsedResult.unsigned_message) {
      console.log('🎯 SUCCESS: createPosition returned unsigned_message!');
      console.log('📏 unsigned_message length:', parsedResult.unsigned_message.length);
    } else {
      console.log('❌ FAILED: createPosition did not return unsigned_message');
    }
  } catch (error) {
    console.error('❌ Error testing createPosition:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test closePosition
  console.log('📋 Testing closePosition...');
  try {
    const closeResult = await provider.closePosition(mockWallet, {
      positionAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      basisPointsToClose: 10000,
      shouldClaimAndClose: true
    });

    const parsedResult = JSON.parse(closeResult);
    console.log('✅ closePosition Result:');
    console.log(JSON.stringify(parsedResult, null, 2));

    if (parsedResult.success && parsedResult.unsigned_message) {
      console.log('🎯 SUCCESS: closePosition returned unsigned_message!');
      console.log('📏 unsigned_message length:', parsedResult.unsigned_message.length);
    } else {
      console.log('❌ FAILED: closePosition did not return unsigned_message');
    }
  } catch (error) {
    console.error('❌ Error testing closePosition:', error);
  }

  console.log('\n🏁 Test completed!');
}

testMockResponses().catch(console.error);
