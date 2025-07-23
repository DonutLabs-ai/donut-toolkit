import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for local analytics server
 */
export interface LocalAnalyticsServerConfig {
  port: number;
  host: string;
  dataPath: string;
  enableCors: boolean;
}

/**
 * Simple local analytics server for collecting and viewing events
 */
export class LocalAnalyticsServer {
  private server: http.Server | null = null;
  private events: any[] = [];
  private config: LocalAnalyticsServerConfig;

  constructor(config: Partial<LocalAnalyticsServerConfig> = {}) {
    this.config = {
      port: 3001,
      host: 'localhost',
      dataPath: './analytics-data.json',
      enableCors: true,
      ...config,
    };

    this.loadEvents();
  }

  /**
   * Start the analytics server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`📊 Analytics server running at http://${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop the analytics server
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('📊 Analytics server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Enable CORS
    if (this.config.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    switch (url.pathname) {
      case '/':
        this.serveDashboard(res);
        break;
      case '/events':
        if (req.method === 'POST') {
          this.handleEventSubmission(req, res);
        } else {
          this.handleEventQuery(url, res);
        }
        break;
      case '/stats':
        this.serveStats(res);
        break;
      default:
        res.writeHead(404);
        res.end('Not Found');
    }
  }

  /**
   * Serve the analytics dashboard
   */
  private serveDashboard(res: http.ServerResponse): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AgentKit Analytics Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-card { background: #e8f4fd; padding: 15px; border-radius: 8px; flex: 1; }
        .events { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .event { background: white; margin: 10px 0; padding: 10px; border-radius: 4px; border-left: 4px solid #007cba; }
        .event-time { color: #666; font-size: 0.9em; }
        .event-data { margin-top: 5px; font-family: monospace; background: #f0f0f0; padding: 5px; border-radius: 3px; }
        button { background: #007cba; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a8b; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 AgentKit Analytics Dashboard</h1>
        <p>实时监控您的 AgentKit 使用情况</p>
    </div>
    
    <div class="stats" id="stats">
        <div class="stat-card">
            <h3>总事件数</h3>
            <div id="total-events">-</div>
        </div>
        <div class="stat-card">
            <h3>钱包初始化</h3>
            <div id="wallet-inits">-</div>
        </div>
        <div class="stat-card">
            <h3>Action 调用</h3>
            <div id="action-calls">-</div>
        </div>
        <div class="stat-card">
            <h3>今日事件</h3>
            <div id="today-events">-</div>
        </div>
    </div>
    
    <div class="events">
        <h2>最近事件 <button onclick="refreshEvents()">🔄 刷新</button></h2>
        <div id="events-list">加载中...</div>
    </div>

    <script>
        async function loadStats() {
            try {
                const response = await fetch('/stats');
                const stats = await response.json();
                document.getElementById('total-events').textContent = stats.totalEvents;
                document.getElementById('wallet-inits').textContent = stats.walletInits;
                document.getElementById('action-calls').textContent = stats.actionCalls;
                document.getElementById('today-events').textContent = stats.todayEvents;
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        async function loadEvents() {
            try {
                const response = await fetch('/events?limit=20');
                const events = await response.json();
                const eventsHtml = events.map(event => \`
                    <div class="event">
                        <div class="event-time">\${new Date(event.event_properties.time_start).toLocaleString()}</div>
                        <div><strong>\${event.event_type}</strong> - \${event.event_properties.component_type}</div>
                        <div class="event-data">\${JSON.stringify(event.event_properties, null, 2)}</div>
                    </div>
                \`).join('');
                document.getElementById('events-list').innerHTML = eventsHtml || '<p>暂无事件</p>';
            } catch (error) {
                document.getElementById('events-list').innerHTML = '<p>加载失败</p>';
                console.error('Failed to load events:', error);
            }
        }

        function refreshEvents() {
            loadStats();
            loadEvents();
        }

        // 初始加载
        loadStats();
        loadEvents();
        
        // 每30秒自动刷新
        setInterval(refreshEvents, 30000);
    </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Handle event submission
   */
  private handleEventSubmission(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        this.events.push(event);
        this.saveEvents();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  /**
   * Handle event queries
   */
  private handleEventQuery(url: URL, res: http.ServerResponse): void {
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const component = url.searchParams.get('component');
    const action = url.searchParams.get('action');

    let filteredEvents = [...this.events];

    if (component) {
      filteredEvents = filteredEvents.filter(e => 
        e.event_properties?.component_type === component
      );
    }

    if (action) {
      filteredEvents = filteredEvents.filter(e => 
        e.event_properties?.action === action
      );
    }

    // 按时间倒序排列，返回最新的
    filteredEvents.sort((a, b) => 
      (b.event_properties?.time_start || 0) - (a.event_properties?.time_start || 0)
    );

    const result = filteredEvents.slice(0, limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  }

  /**
   * Serve statistics
   */
  private serveStats(res: http.ServerResponse): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const stats = {
      totalEvents: this.events.length,
      walletInits: this.events.filter(e => 
        e.event_properties?.action === 'initialize_wallet_provider'
      ).length,
      actionCalls: this.events.filter(e => 
        e.event_properties?.action === 'invoke_action'
      ).length,
      todayEvents: this.events.filter(e => 
        (e.event_properties?.time_start || 0) >= todayStart
      ).length,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
  }

  /**
   * Load events from file
   */
  private loadEvents(): void {
    try {
      if (fs.existsSync(this.config.dataPath)) {
        const data = fs.readFileSync(this.config.dataPath, 'utf8');
        this.events = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load events:', error);
      this.events = [];
    }
  }

  /**
   * Save events to file
   */
  private saveEvents(): void {
    try {
      // 只保留最近 10000 条记录
      if (this.events.length > 10000) {
        this.events = this.events.slice(-10000);
      }
      
      fs.writeFileSync(this.config.dataPath, JSON.stringify(this.events, null, 2));
    } catch (error) {
      console.warn('Failed to save events:', error);
    }
  }
} 