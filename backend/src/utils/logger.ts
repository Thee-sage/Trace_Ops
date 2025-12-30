
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment?: string;
  [key: string]: unknown;
}

class Logger {
  private serviceName: string;
  private environment?: string;

  constructor(serviceName: string = 'traceops-backend', environment?: string) {
    this.serviceName = serviceName;
    this.environment = environment;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
    };

    if (this.environment) {
      entry.environment = this.environment;
    }

    if (metadata) {
      Object.assign(entry, metadata);
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    const logLine = JSON.stringify(entry);
    
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
      console.error(logLine);
    } else {
      console.log(logLine);
    }
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.writeLog(this.createLogEntry(LogLevel.INFO, message, metadata));
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.writeLog(this.createLogEntry(LogLevel.DEBUG, message, metadata));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.writeLog(this.createLogEntry(LogLevel.WARN, message, metadata));
  }

  error(message: string, error?: Error | unknown, metadata?: Record<string, unknown>): void {
    const errorMetadata: Record<string, unknown> = { ...metadata };
    
    if (error instanceof Error) {
      errorMetadata.errorName = error.name;
      errorMetadata.errorMessage = error.message;
      errorMetadata.errorStack = error.stack;
    } else if (error !== undefined) {
      errorMetadata.error = String(error);
    }

    this.writeLog(this.createLogEntry(LogLevel.ERROR, message, errorMetadata));
  }
}

export const logger = new Logger(
  'traceops-backend',
  process.env.NODE_ENV || 'development'
);

