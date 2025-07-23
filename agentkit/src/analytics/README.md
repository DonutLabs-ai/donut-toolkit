# 📊 AgentKit 自定义分析系统

本模块提供了完全可配置的分析事件收集系统，可以替代默认的 Coinbase 分析服务，让您完全控制自己的数据。

## 🎯 主要特性

- ✅ **数据隐私保护** - 数据不会发送到第三方服务
- ✅ **多种后端支持** - 本地文件、本地服务器、自定义API
- ✅ **实时仪表板** - 内置 Web 界面查看分析数据
- ✅ **灵活配置** - 支持完全自定义的分析后端
- ✅ **向前兼容** - 无需修改现有代码

## 🚀 快速开始

### 方案 1: 本地文件存储（最简单）

```typescript
import { configureAnalytics } from './analytics';

// 配置本地文件存储
configureAnalytics({
  backend: 'local',
  localPath: './agentkit-analytics.log',
  enableLogging: true,
});
```

事件会被保存到 JSON Lines 格式的文件中，每行一个事件。

### 方案 2: 本地分析服务器（推荐）

```typescript
import { LocalAnalyticsServer, configureAnalytics } from './analytics';

// 启动本地服务器
const server = new LocalAnalyticsServer({
  port: 3001,
  host: 'localhost',
  dataPath: './analytics-data.json',
});

await server.start();

// 配置客户端发送到本地服务器
configureAnalytics({
  backend: 'custom',
  endpoint: 'http://localhost:3001/events',
  enableLogging: true,
});

// 访问 http://localhost:3001 查看仪表板
```

### 方案 3: 自定义远程服务器

```typescript
import { configureAnalytics } from './analytics';

// 配置自定义API端点
configureAnalytics({
  backend: 'custom',
  endpoint: 'https://your-analytics-api.com/events',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'X-App-Version': '1.0.0',
  },
  enableLogging: true,
});
```

### 方案 4: 完全禁用分析

```typescript
import { configureAnalytics } from './analytics';

configureAnalytics({
  backend: 'disabled',
});
```

## 📱 本地分析仪表板

启动本地服务器后，访问 `http://localhost:3001` 可以看到：

### 统计卡片
- **总事件数** - 累计收集的事件数量
- **钱包初始化** - 钱包提供者初始化次数
- **Action 调用** - Agent Action 执行次数
- **今日事件** - 当天的事件数量

### 实时事件流
- 最新事件的时间线显示
- 事件详细信息展开查看
- 自动每30秒刷新数据

## 🔧 API 接口

本地分析服务器提供以下 API：

### GET /
返回分析仪表板 HTML 页面

### GET /events
查询事件数据
- `?limit=N` - 限制返回数量（默认100）
- `?component=X` - 按组件过滤
- `?action=Y` - 按动作过滤

示例：
```bash
curl "http://localhost:3001/events?limit=10&component=wallet_provider"
```

### POST /events
提交新事件
```bash
curl -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","event_properties":{"component_type":"test"}}'
```

### GET /stats
获取统计信息
```bash
curl http://localhost:3001/stats
```

## 📊 事件数据格式

所有分析事件都遵循统一的数据格式：

```typescript
{
  "event_type": "agent_action_invocation",
  "platform": "server",
  "event_properties": {
    "component_type": "agent_action",
    "platform": "server", 
    "project_name": "agentkit",
    "time_start": 1703123456789,
    "agentkit_language": "typescript",
    // 原始事件数据
    "action": "invoke_action",
    "component": "agent_action",
    "name": "agent_action_invocation",
    "action_name": "JupiterActionProvider_swap",
    "class_name": "JupiterActionProvider",
    "method_name": "swap",
    // 钱包相关信息（如果有）
    "wallet_provider": "SolanaKeypairWallet",
    "wallet_address": "xxx...",
    "network_id": "solana-mainnet",
    "chain_id": "mainnet-beta",
    "protocol_family": "svm"
  }
}
```

## 🔨 自定义分析后端

您可以实现自己的分析后端，只需要接收 POST 请求到 `/events` 端点：

### Node.js + Express 示例

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/events', (req, res) => {
  const event = req.body;
  
  // 处理事件数据
  console.log('Received event:', event);
  
  // 保存到数据库、发送到其他服务等
  // await saveToDatabase(event);
  // await sendToElasticsearch(event);
  
  res.json({ success: true });
});

app.listen(3002, () => {
  console.log('Custom analytics server running on port 3002');
});
```

### Python + Flask 示例

```python
from flask import Flask, request, jsonify
import json
from datetime import datetime

app = Flask(__name__)

@app.route('/events', methods=['POST'])
def handle_event():
    event = request.json
    
    # 处理事件数据
    print(f"Received event: {json.dumps(event, indent=2)}")
    
    # 保存到数据库、文件等
    # save_to_database(event)
    
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3002)
```

## 🧪 运行示例

```bash
# 进入 analytics 目录
cd agentkit/src/analytics

# 运行示例（需要先构建项目）
npx ts-node example.ts
```

这会：
1. 启动本地分析服务器（端口 3001）
2. 发送一些测试事件
3. 提供仪表板访问地址

## ⚙️ 配置选项

### AnalyticsConfig

```typescript
interface AnalyticsConfig {
  backend: 'coinbase' | 'local' | 'custom' | 'disabled';
  endpoint?: string;        // 自定义端点URL
  localPath?: string;       // 本地文件路径
  headers?: Record<string, string>; // 自定义请求头
  enableLogging?: boolean;  // 启用控制台日志
}
```

### LocalAnalyticsServerConfig

```typescript
interface LocalAnalyticsServerConfig {
  port: number;        // 服务器端口
  host: string;        // 服务器主机
  dataPath: string;    // 数据文件路径
  enableCors: boolean; // 启用CORS
}
```

## 🔒 数据安全

- **本地存储** - 数据完全保存在本地，不会发送到外部
- **HTTPS 支持** - 自定义后端可以使用 HTTPS 加密传输
- **访问控制** - 可以为自定义后端添加认证机制
- **数据清理** - 本地服务器自动限制存储数量（10000条）

## 🚀 生产环境部署

### Docker 化本地分析服务

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 3001
CMD ["node", "analytics-server.js"]
```

### 数据持久化

使用 Docker volumes 或云存储持久化分析数据：

```bash
docker run -d \
  -p 3001:3001 \
  -v /host/analytics-data:/app/data \
  your-analytics-server
```

## 🔧 故障排除

### 常见问题

1. **端口占用** - 修改配置中的端口号
2. **权限问题** - 确保对数据文件路径有写权限
3. **CORS 错误** - 在服务器配置中启用 CORS
4. **内存占用** - 调整事件保留数量或使用外部数据库

### 调试模式

```typescript
configureAnalytics({
  backend: 'local',
  enableLogging: true, // 启用详细日志
});
```

这会在控制台输出所有分析事件，帮助调试问题。 