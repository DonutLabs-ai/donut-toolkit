import { configureAnalytics, sendAnalyticsEvent } from './sendAnalyticsEvent';
import { LocalAnalyticsServer } from './localAnalyticsServer';

/**
 * 示例：如何配置和使用自定义分析系统
 */

// 方案 1: 本地文件存储
export function setupLocalFileAnalytics() {
  configureAnalytics({
    backend: 'local',
    localPath: './agentkit-analytics.log',
    enableLogging: true,
  });
  
  console.log('✅ 配置本地文件分析系统');
}

// 方案 2: 本地分析服务器
export async function setupLocalServerAnalytics() {
  // 启动本地分析服务器
  const server = new LocalAnalyticsServer({
    port: 3001,
    host: 'localhost',
    dataPath: './analytics-data.json',
    enableCors: true,
  });
  
  await server.start();
  
  // 配置客户端发送到本地服务器
  configureAnalytics({
    backend: 'custom',
    endpoint: 'http://localhost:3001/events',
    enableLogging: true,
  });
  
  console.log('✅ 本地分析服务器已启动: http://localhost:3001');
  console.log('📊 访问仪表板查看实时数据');
  
  return server;
}

// 方案 3: 自定义远程服务器
export function setupCustomServerAnalytics(endpoint: string, apiKey?: string) {
  configureAnalytics({
    backend: 'custom',
    endpoint: endpoint,
    headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    enableLogging: true,
  });
  
  console.log(`✅ 配置自定义分析服务器: ${endpoint}`);
}

// 方案 4: 禁用分析
export function disableAnalytics() {
  configureAnalytics({
    backend: 'disabled',
  });
  
  console.log('✅ 分析系统已禁用');
}

// 测试函数：发送示例事件
export async function testAnalytics() {
  // 发送钱包初始化事件
  await sendAnalyticsEvent({
    name: 'agent_initialization',
    action: 'initialize_wallet_provider',
    component: 'wallet_provider',
    wallet_provider: 'SolanaKeypairWallet',
    wallet_address: '5JmMb7kxZ4XzKqB8m9vJoA2Gq3k7W8L9n4r5s6t7u8v9w0x1y2z3',
    network_id: 'solana-mainnet',
    chain_id: 'mainnet-beta',
    protocol_family: 'svm',
  });

  // 发送 Action 调用事件  
  await sendAnalyticsEvent({
    name: 'agent_action_invocation',
    action: 'invoke_action',
    component: 'agent_action',
    action_name: 'JupiterActionProvider_swap',
    class_name: 'JupiterActionProvider',
    method_name: 'swap',
    wallet_provider: 'SolanaKeypairWallet',
    wallet_address: '5JmMb7kxZ4XzKqB8m9vJoA2Gq3k7W8L9n4r5s6t7u8v9w0x1y2z3',
    network_id: 'solana-mainnet',
    chain_id: 'mainnet-beta',
    protocol_family: 'svm',
  });

  console.log('✅ 测试事件已发送');
}

// 运行示例
export async function runExample() {
  console.log('🚀 AgentKit 自定义分析系统示例\n');

  // 启动本地分析服务器
  const server = await setupLocalServerAnalytics();

  // 等待一秒让服务器完全启动
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 发送测试事件
  await testAnalytics();

  console.log('\n📋 可用的 API 端点:');
  console.log('  GET  /         - 分析仪表板');
  console.log('  GET  /events   - 查询事件 (支持 ?limit=N&component=X&action=Y)');
  console.log('  POST /events   - 提交新事件');
  console.log('  GET  /stats    - 统计信息');

  console.log('\n🔗 打开浏览器访问: http://localhost:3001');
  
  return server;
}

// 如果直接运行此文件
if (require.main === module) {
  runExample().catch(console.error);
} 