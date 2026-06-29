/**
 * 日志 API 模拟层
 * 模拟真实的前后端联调场景
 */

/** 日志等级枚举 */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

/** 日志条目接口 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  thread: string;
  logger: string;
  message: string;
}

/** 分页响应接口 */
export interface LogPageResponse {
  data: LogEntry[];
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
}

/** 日志消息模板 */
const LOG_MESSAGES = {
  INFO: [
    'Application started successfully',
    'Database connection pool initialized with 20 connections',
    'HTTP server listening on port 8080',
    'Scheduled task executed: data_sync_job',
    'Cache refreshed: product_catalog (1024 items)',
    'User session created: session_id=abc123',
    'Request processed in 45ms',
    'Background worker thread started',
    'Configuration reloaded from application.yml',
    'Health check passed: all services operational',
  ],
  WARN: [
    'Slow query detected: SELECT * FROM users (2.3s)',
    'Connection pool usage high: 18/20 connections in use',
    'Cache miss rate exceeds threshold: 35%',
    'API rate limit approaching: 950/1000 requests',
    'Disk usage high: 85% on /data partition',
    'Deprecated API endpoint accessed: /v1/legacy/users',
    'Response time degraded: avg 500ms (baseline 200ms)',
    'Memory usage high: 1.8GB / 2GB allocated',
  ],
  ERROR: [
    'Failed to connect to database: connection timeout',
    'Null pointer exception in UserService.findById()',
    'Authentication failed: invalid credentials',
    'File not found: /config/application.properties',
    'External API call failed: HTTP 503 Service Unavailable',
    'Transaction rollback: constraint violation on user_email',
    'Failed to send email notification: SMTP connection refused',
    'JSON parsing error: unexpected token at position 42',
  ],
  DEBUG: [
    'Method entry: UserController.login(username=admin)',
    'SQL executed: SELECT id, name FROM users WHERE id = ?',
    'Cache hit: product_12345',
    'Validation passed: email format valid',
    'Cookie parsed: session_token=xyz789',
    'Request headers: {Accept: application/json, User-Agent: ...}',
    'Response body: {"status":"success","data":{...}}',
    'Thread pool status: active=5, queued=2, completed=1523',
  ],
};

/** 日志记录器名称 */
const LOGGERS = [
  'com.example.controller.UserController',
  'com.example.service.OrderService',
  'com.example.repository.ProductRepository',
  'com.example.security.AuthenticationFilter',
  'com.example.scheduler.DataSyncJob',
  'com.example.util.CacheManager',
  'org.springframework.web.servlet.DispatcherServlet',
  'org.hibernate.engine.jdbc.spi.SqlExceptionHelper',
];

/** 生成的总日志条数 */
const TOTAL_LOGS = 500;

/** 预生成的日志数据（模拟数据库中的历史日志） */
const allLogs: LogEntry[] = [];

/**
 * 初始化日志数据（生成模拟的历史日志）
 */
const initializeMockData = () => {
  if (allLogs.length > 0) return; // 已初始化

  const now = Date.now();
  const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];

  for (let i = 0; i < TOTAL_LOGS; i++) {
    // 越早的日志，时间戳越小
    const timestamp = new Date(now - (TOTAL_LOGS - i) * 10000).toISOString();
    const level = levels[Math.floor(Math.random() * levels.length)];
    const messages = LOG_MESSAGES[level];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const logger = LOGGERS[Math.floor(Math.random() * LOGGERS.length)];
    const threadId = Math.floor(Math.random() * 20) + 1;

    allLogs.push({
      timestamp,
      level,
      thread: `http-nio-8080-exec-${threadId}`,
      logger,
      message,
    });
  }
};

/**
 * 模拟网络延迟
 */
const simulateDelay = (ms: number = 500): Promise<void> => {
  const delay = ms + Math.random() * 300; // 增加随机性
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 格式化日志条目为字符串
 */
export const formatLogEntry = (log: LogEntry): string => {
  return `[${log.timestamp}] [${log.level.padEnd(5)}] [${log.thread}] ${log.logger} - ${log.message}`;
};

/**
 * 初始化接口 - 获取最新的日志
 * @param size 返回的日志条数，默认 50
 */
export const initializeLog = async (size: number = 50): Promise<LogPageResponse> => {
  initializeMockData();
  await simulateDelay(400);

  // 返回最新的 size 条日志
  const latestLogs = allLogs.slice(-size);

  return {
    data: latestLogs,
    page: 1,
    size,
    total: allLogs.length,
    hasMore: allLogs.length > size,
  };
};

/**
 * 分页查询历史日志
 * @param page 页码（从 1 开始）
 * @param size 每页条数
 * @returns 分页日志数据
 */
export const fetchHistoryLogs = async (page: number, size: number): Promise<LogPageResponse> => {
  initializeMockData();
  await simulateDelay(500);

  // 计算起始索引（从最新的日志往前推）
  // page=1 是最新的 size 条
  // page=2 是次新的 size 条
  const endIndex = allLogs.length - (page - 1) * size;
  const startIndex = Math.max(0, endIndex - size);

  const logs = allLogs.slice(startIndex, endIndex);

  return {
    data: logs.reverse(), // 反转，让最新的在下面
    page,
    size,
    total: allLogs.length,
    hasMore: startIndex > 0,
  };
};

/**
 * 生成实时日志（用于模拟新日志产生）
 */
export const generateRealtimeLog = (): LogEntry => {
  const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const level = levels[Math.floor(Math.random() * levels.length)];
  const messages = LOG_MESSAGES[level];
  const message = messages[Math.floor(Math.random() * messages.length)];
  const logger = LOGGERS[Math.floor(Math.random() * LOGGERS.length)];
  const threadId = Math.floor(Math.random() * 20) + 1;

  return {
    timestamp: new Date().toISOString(),
    level,
    thread: `http-nio-8080-exec-${threadId}`,
    logger,
    message,
  };
};
