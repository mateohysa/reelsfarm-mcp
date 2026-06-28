export class ReelsFarmError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message);
    this.name = new.target.name;
    this.cause = options.cause;
  }
}

export class ReelsFarmAuthError extends ReelsFarmError {}
export class ReelsFarmValidationError extends ReelsFarmError {}
export class ReelsFarmRateLimitError extends ReelsFarmError {}
export class ReelsFarmToolError extends ReelsFarmError {
  constructor(message: string, readonly toolName?: string, options: { cause?: unknown } = {}) {
    super(message, options);
  }
}
export class ReelsFarmConfirmationError extends ReelsFarmError {}
export class ReelsFarmTimeoutError extends ReelsFarmError {}

export function normalizeError(error: unknown, toolName?: string): ReelsFarmError {
  if (error instanceof ReelsFarmError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('unauthorized') || lower.includes('authentication') || lower.includes('missing token')) {
    return new ReelsFarmAuthError(message, { cause: error });
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return new ReelsFarmRateLimitError(message, { cause: error });
  }
  if (lower.includes('validation') || lower.includes('invalid_request')) {
    return new ReelsFarmValidationError(message, { cause: error });
  }
  return new ReelsFarmToolError(message, toolName, { cause: error });
}
