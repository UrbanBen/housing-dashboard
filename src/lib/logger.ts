/**
 * Production-grade logging utility
 *
 * Features:
 * - Environment-aware (verbose in dev, minimal in production)
 * - Structured logging with context
 * - Sentry integration for errors
 * - Request ID tracking
 * - Component/API route prefixes
 * - TypeScript support
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

interface LoggerOptions {
  prefix?: string;
  requestId?: string;
  component?: string;
  userId?: string;
}

class Logger {
  private prefix: string;
  private requestId?: string;
  private component?: string;
  private userId?: string;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.requestId = options.requestId;
    this.component = options.component;
    this.userId = options.userId;
  }

  /**
   * Create a child logger with additional context
   */
  child(options: LoggerOptions): Logger {
    return new Logger({
      prefix: options.prefix || this.prefix,
      requestId: options.requestId || this.requestId,
      component: options.component || this.component,
      userId: options.userId || this.userId,
    });
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const parts: string[] = [];

    // Add timestamp in development
    if (process.env.NODE_ENV === 'development') {
      parts.push(`[${timestamp}]`);
    }

    // Add level
    parts.push(`[${level.toUpperCase()}]`);

    // Add request ID if available
    if (this.requestId) {
      parts.push(`[${this.requestId}]`);
    }

    // Add component if available
    if (this.component) {
      parts.push(`[${this.component}]`);
    }

    // Add prefix if available
    if (this.prefix) {
      parts.push(`[${this.prefix}]`);
    }

    // Add message
    parts.push(message);

    // Add context in development
    if (context && Object.keys(context).length > 0 && process.env.NODE_ENV === 'development') {
      parts.push(JSON.stringify(context, null, 2));
    }

    return parts.join(' ');
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('info', message, context));
    } else {
      // In production, only log to external service (e.g., Vercel logs)
      console.log(JSON.stringify({
        level: 'info',
        message,
        ...context,
        requestId: this.requestId,
        component: this.component,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn(this.formatMessage('warn', message, context));
    } else {
      console.warn(JSON.stringify({
        level: 'warn',
        message,
        ...context,
        requestId: this.requestId,
        component: this.component,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  /**
   * Log error message and send to Sentry
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorMessage = this.formatMessage('error', message, context);

    if (process.env.NODE_ENV === 'development') {
      console.error(errorMessage);
      if (error) {
        console.error(error);
      }
    } else {
      console.error(JSON.stringify({
        level: 'error',
        message,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        ...context,
        requestId: this.requestId,
        component: this.component,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      }));

      // Send to Sentry in production
      if (typeof window !== 'undefined' && error instanceof Error) {
        // Client-side
        import('@sentry/nextjs').then(Sentry => {
          Sentry.captureException(error, {
            tags: {
              component: this.component,
            },
            extra: {
              message,
              ...context,
              requestId: this.requestId,
              userId: this.userId,
            },
          });
        }).catch(() => {
          // Sentry not available, ignore
        });
      } else if (typeof window === 'undefined' && error instanceof Error) {
        // Server-side
        import('@sentry/nextjs').then(Sentry => {
          Sentry.captureException(error, {
            tags: {
              component: this.component,
            },
            extra: {
              message,
              ...context,
              requestId: this.requestId,
              userId: this.userId,
            },
          });
        }).catch(() => {
          // Sentry not available, ignore
        });
      }
    }
  }

  /**
   * Log API request
   */
  request(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, context);
  }

  /**
   * Log API response
   */
  response(method: string, path: string, status: number, duration?: number, context?: LogContext): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    const durationStr = duration ? ` (${duration}ms)` : '';

    if (level === 'error') {
      this.error(`${method} ${path} ${status}${durationStr}`, undefined, context);
    } else if (level === 'warn') {
      this.warn(`${method} ${path} ${status}${durationStr}`, context);
    } else {
      this.info(`${method} ${path} ${status}${durationStr}`, context);
    }
  }

  /**
   * Log database query
   */
  query(query: string, duration?: number, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const durationStr = duration ? ` (${duration}ms)` : '';
      this.debug(`Query${durationStr}: ${query}`, context);
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create API route logger
 */
export function createAPILogger(route: string, requestId?: string): Logger {
  return createLogger({
    prefix: 'API',
    component: route,
    requestId,
  });
}

/**
 * Create component logger
 */
export function createComponentLogger(componentName: string): Logger {
  return createLogger({
    component: componentName,
  });
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 11);
}
