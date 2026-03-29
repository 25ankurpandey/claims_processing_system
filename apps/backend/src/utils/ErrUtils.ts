export class AppError extends Error {
  public status: number;
  public code: string;
  public type: string;
  public details?: unknown;

  constructor(message: string, status: number, code: string, type: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.type = type;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', 'VALIDATION_ERROR', details);
  }

  static notFound(message: string): AppError {
    return new AppError(message, 404, 'NOT_FOUND', 'RESOURCE_NOT_FOUND');
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, 'CONFLICT', 'RESOURCE_CONFLICT');
  }

  static unauthorized(message: string): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED', 'AUTH_ERROR');
  }

  static forbidden(message: string): AppError {
    return new AppError(message, 403, 'FORBIDDEN', 'AUTH_ERROR');
  }

  static internal(message: string): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR', 'UNEXPECTED_ERROR');
  }

  static unprocessable(message: string, details?: unknown): AppError {
    return new AppError(message, 422, 'UNPROCESSABLE_ENTITY', 'BUSINESS_RULE_VIOLATION', details);
  }
}
