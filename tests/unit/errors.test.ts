import { describe, expect, it } from 'vitest';
import {
  ReelsFarmIdempotencyError,
  ReelsFarmPolicyError,
  ReelsFarmRateLimitError,
  ReelsFarmToolError,
  ReelsFarmValidationError,
  normalizeError,
  normalizeToolError,
} from '../../src/errors.js';

describe('errors', () => {
  it('classifies tool error rate-limit messages as retryable rate limits', () => {
    const error = normalizeError(new ReelsFarmToolError('Rate limit exceeded. Retry after 12 seconds.', 'reelsfarm_get_account'), 'reelsfarm_get_account');

    expect(error).toBeInstanceOf(ReelsFarmRateLimitError);
    expect(error.message).toContain('Rate limit exceeded');
  });

  it('preserves structured policy guidance from tool metadata', () => {
    const error = normalizeToolError('Use the dashboard', 'create_webhook', {
      'mcp/error_code': ['ACTION_REQUIRES_DASHBOARD'],
      'mcp/dashboard_url': ['/account?tab=mcp'],
    });
    expect(error).toBeInstanceOf(ReelsFarmPolicyError);
    expect(error.code).toBe('ACTION_REQUIRES_DASHBOARD');
    expect(error.dashboardUrl).toBe('/account?tab=mcp');
  });

  it('preserves idempotency conflicts and operation IDs', () => {
    const error = normalizeToolError('Key reused', 'reelsfarm_prepare_generate_avatar', {
      'mcp/error_code': ['IDEMPOTENCY_KEY_REUSED'],
      'mcp/operation_id': ['op_1'],
    });
    expect(error).toBeInstanceOf(ReelsFarmIdempotencyError);
    expect(error.operationId).toBe('op_1');
  });

  it('classifies rejected automation requests as validation errors', () => {
    const error = normalizeToolError('An ACTIVE automation needs a TikTok photo title.', 'reelsfarm_prepare_create_automation', {
      'mcp/error_code': ['INVALID_AUTOMATION'],
    });
    expect(error).toBeInstanceOf(ReelsFarmValidationError);
    expect(error.code).toBe('INVALID_AUTOMATION');
  });

  it('marks an active video job conflict as retryable', () => {
    const error = normalizeToolError('A video generation is in progress. Wait for it to finish. Active job: job_1.', 'reelsfarm_prepare_generate_video', {
      'mcp/error_code': ['VIDEO_JOB_IN_PROGRESS'],
    });
    expect(error).toBeInstanceOf(ReelsFarmToolError);
    expect(error).toMatchObject({ code: 'VIDEO_JOB_IN_PROGRESS', retryable: true, toolName: 'reelsfarm_prepare_generate_video' });
  });
});
