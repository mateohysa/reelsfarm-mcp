import type { JsonObject } from './types.js';

export interface ReelsFarmErrorOptions {
  cause?: unknown;
  code?: string;
  retryable?: boolean;
  operationId?: string;
  dashboardUrl?: string;
}

export class ReelsFarmError extends Error {
  readonly cause?: unknown;
  readonly code?: string;
  readonly retryable: boolean;
  readonly operationId?: string;
  readonly dashboardUrl?: string;

  constructor(message: string, options: ReelsFarmErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.cause = options.cause;
    this.code = options.code;
    this.retryable = Boolean(options.retryable);
    this.operationId = options.operationId;
    this.dashboardUrl = options.dashboardUrl;
  }
}

export class ReelsFarmAuthError extends ReelsFarmError {}
export class ReelsFarmAuthorizationError extends ReelsFarmError {}
export class ReelsFarmPolicyError extends ReelsFarmAuthorizationError {}
export class ReelsFarmValidationError extends ReelsFarmError {}
export class ReelsFarmRateLimitError extends ReelsFarmError {
  constructor(message: string, options: ReelsFarmErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'RATE_LIMITED', retryable: true });
  }
}
export class ReelsFarmToolError extends ReelsFarmError {
  constructor(message: string, readonly toolName?: string, options: ReelsFarmErrorOptions = {}) {
    super(message, options);
  }
}
export class ReelsFarmConfirmationError extends ReelsFarmError {}
export class ReelsFarmIdempotencyError extends ReelsFarmError {}
export class ReelsFarmOperationInProgressError extends ReelsFarmError {
  constructor(message: string, options: ReelsFarmErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'OPERATION_IN_PROGRESS', retryable: true });
  }
}
export class ReelsFarmPlanLimitError extends ReelsFarmError {}
export class ReelsFarmTimeoutError extends ReelsFarmError {
  constructor(message: string, options: ReelsFarmErrorOptions = {}) {
    super(message, { ...options, retryable: true });
  }
}

function metaString(meta: JsonObject | undefined, key: string): string | undefined {
  const value = meta?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export function normalizeToolError(message: string, toolName: string, meta?: JsonObject): ReelsFarmError {
  const code = metaString(meta, 'mcp/error_code');
  const operationId = metaString(meta, 'mcp/operation_id');
  const dashboardUrl = metaString(meta, 'mcp/dashboard_url');
  const options: ReelsFarmErrorOptions = { code, operationId, dashboardUrl };

  switch (code) {
    case 'AUTHENTICATION_REQUIRED':
    case 'TOKEN_EXPIRED':
    case 'CONNECTION_PAUSED':
      return new ReelsFarmAuthError(message, options);
    case 'INSUFFICIENT_SCOPE':
      return new ReelsFarmAuthorizationError(message, options);
    case 'ACTION_REQUIRES_DASHBOARD':
    case 'AUTONOMY_MODE_DENIED':
      return new ReelsFarmPolicyError(message, options);
    case 'CONFIRMATION_REQUIRED':
      return new ReelsFarmConfirmationError(message, options);
    case 'IDEMPOTENCY_KEY_REQUIRED':
    case 'INVALID_IDEMPOTENCY_KEY':
    case 'IDEMPOTENCY_KEY_REUSED':
      return new ReelsFarmIdempotencyError(message, options);
    case 'OPERATION_IN_PROGRESS':
      return new ReelsFarmOperationInProgressError(message, options);
    case 'PLAN_LIMIT_REACHED':
    case 'INSUFFICIENT_CREDITS':
      return new ReelsFarmPlanLimitError(message, options);
    case 'RATE_LIMITED':
      return new ReelsFarmRateLimitError(message, options);
    case 'UNSAFE_REMOTE_URL':
      return new ReelsFarmValidationError(message, options);
    default:
      return normalizeError(new ReelsFarmToolError(message, toolName, options), toolName);
  }
}

export function normalizeError(error: unknown, toolName?: string): ReelsFarmError {
  if (error instanceof ReelsFarmError) {
    const lower = error.message.toLowerCase();
    if (!(error instanceof ReelsFarmRateLimitError) && (lower.includes('rate limit') || lower.includes('too many requests'))) {
      return new ReelsFarmRateLimitError(error.message, { cause: error, code: error.code, operationId: error.operationId });
    }
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication') || lower.includes('missing token')) {
    return new ReelsFarmAuthError(message, { cause: error, code: 'AUTHENTICATION_REQUIRED' });
  }
  if (lower.includes('403') || lower.includes('forbidden') || lower.includes('insufficient scope')) {
    return new ReelsFarmAuthorizationError(message, { cause: error, code: 'INSUFFICIENT_SCOPE' });
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return new ReelsFarmRateLimitError(message, { cause: error });
  }
  if (lower.includes('validation') || lower.includes('invalid_request')) {
    return new ReelsFarmValidationError(message, { cause: error, code: 'VALIDATION_ERROR' });
  }
  return new ReelsFarmToolError(message, toolName, { cause: error });
}
