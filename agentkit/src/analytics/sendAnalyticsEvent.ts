import md5 from "md5";

/**
 * The required data for an analytics event
 *
 * Accepts arbitrary additional fields
 */
export type RequiredEventData = {
  /**
   * The event that took place, e.g. initialize_wallet_provider, agent_action_invocation
   */
  action: string;
  /**
   * The component that the event took place in, e.g. wallet_provider, agent_action
   */
  component: string;
  /**
   * The name of the event. This should match the name in AEC
   */
  name: string;
  /**
   * The timestamp of the event. If not provided, the current time will be used.
   */
  timestamp?: number;
} & Record<string, string | undefined>;

/**
 * Configuration for analytics backend
 */
export interface AnalyticsConfig {
  /**
   * Analytics backend type
   */
  backend: 'coinbase' | 'local' | 'custom' | 'disabled';
  /**
   * Custom endpoint URL (for custom backend)
   */
  endpoint?: string;
  /**
   * Local storage path (for local backend)
   */
  localPath?: string;
  /**
   * Additional headers for custom backend
   */
  headers?: Record<string, string>;
  /**
   * Enable console logging
   */
  enableLogging?: boolean;
}

/**
 * Default analytics configuration
 */
let analyticsConfig: AnalyticsConfig = {
  backend: 'disabled', // 默认禁用，不向 Coinbase 发送
  enableLogging: false,
};

/**
 * Configure analytics backend
 */
export function configureAnalytics(config: Partial<AnalyticsConfig>): void {
  analyticsConfig = { ...analyticsConfig, ...config };
}

/**
 * Get current analytics configuration
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  return { ...analyticsConfig };
}

/**
 * Sends an analytics event based on configured backend
 *
 * @param event - The event data containing required action, component and name fields
 * @returns Promise that resolves when the event is sent
 */
export async function sendAnalyticsEvent(event: RequiredEventData): Promise<void> {
  if (analyticsConfig.backend === 'disabled') {
    return;
  }

  const timestamp = event.timestamp || Date.now();

  // Prepare the event with required fields
  const enhancedEvent = {
    event_type: event.name,
    platform: "server",
    event_properties: {
      component_type: event.component,
      platform: "server",
      project_name: "agentkit",
      time_start: timestamp,
      agentkit_language: "typescript",
      ...event,
    },
  };

  try {
    switch (analyticsConfig.backend) {
      case 'coinbase':
        await sendToCoinbase(enhancedEvent, timestamp);
        break;
      case 'local':
        await sendToLocal(enhancedEvent);
        break;
      case 'custom':
        await sendToCustom(enhancedEvent);
        break;
    }

    if (analyticsConfig.enableLogging) {
      console.log('[Analytics]', JSON.stringify(enhancedEvent, null, 2));
    }
  } catch (error) {
    if (analyticsConfig.enableLogging) {
      console.warn('[Analytics] Failed to send event:', error);
    }
  }
}

/**
 * Send to Coinbase backend (original implementation)
 */
async function sendToCoinbase(event: any, timestamp: number): Promise<void> {
  const events = [event];
  const stringifiedEventData = JSON.stringify(events);
  const uploadTime = timestamp.toString();

  const checksum = md5(stringifiedEventData + uploadTime);

  const analyticsServiceData = {
    e: stringifiedEventData,
    checksum,
  };

  const apiEndpoint = "https://cca-lite.coinbase.com";
  const eventPath = "/amp";
  const eventEndPoint = `${apiEndpoint}${eventPath}`;

  const response = await fetch(eventEndPoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(analyticsServiceData),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/**
 * Send to local file storage
 */
async function sendToLocal(event: any): Promise<void> {
  // 在浏览器环境中使用 localStorage，在 Node.js 环境中使用文件系统
  if (typeof window !== 'undefined' && window.localStorage) {
    // Browser environment
    const events = JSON.parse(localStorage.getItem('agentkit_analytics') || '[]');
    events.push(event);
    
    // 保留最近 1000 条记录
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    localStorage.setItem('agentkit_analytics', JSON.stringify(events));
  } else {
    // Node.js environment
    const fs = await import('fs');
    const path = await import('path');
    
    const logPath = analyticsConfig.localPath || './analytics.log';
    const logDir = path.dirname(logPath);
    
    // 确保目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logEntry = JSON.stringify(event) + '\n';
    fs.appendFileSync(logPath, logEntry);
  }
}

/**
 * Send to custom backend
 */
async function sendToCustom(event: any): Promise<void> {
  if (!analyticsConfig.endpoint) {
    throw new Error('Custom backend endpoint not configured');
  }

  const response = await fetch(analyticsConfig.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...analyticsConfig.headers,
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}
