import winston from 'winston';

export class Logger {
  private static logger: winston.Logger;

  static init(serviceName: string): void {
    Logger.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          const base = `[${timestamp}] [${serviceName}] ${level.toUpperCase()}: ${message}`;
          return stack ? `${base}\n${stack}` : base;
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize({ all: true })),
        }),
      ],
    });
  }

  static info(message: string): void {
    Logger.logger?.info(message);
  }

  static warn(message: string): void {
    Logger.logger?.warn(message);
  }

  static error(error: unknown, errId?: string, errType?: string): void {
    const msg = error instanceof Error ? error.message : String(error);
    const prefix = errId ? `[${errId}] ` : '';
    const suffix = errType ? ` (${errType})` : '';
    Logger.logger?.error(`${prefix}${msg}${suffix}`, { stack: error instanceof Error ? error.stack : undefined });
  }

  static debug(message: string): void {
    Logger.logger?.debug(message);
  }
}
