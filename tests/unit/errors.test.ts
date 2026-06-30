import { describe, expect, it } from 'vitest';
import { ReelsFarmRateLimitError, ReelsFarmToolError, normalizeError } from '../../src/errors.js';

describe('errors', () => {
  it('classifies tool error rate-limit messages as retryable rate limits', () => {
    const error = normalizeError(new ReelsFarmToolError('Rate limit exceeded. Retry after 12 seconds.', 'get_account'), 'get_account');

    expect(error).toBeInstanceOf(ReelsFarmRateLimitError);
    expect(error.message).toContain('Rate limit exceeded');
  });
});
