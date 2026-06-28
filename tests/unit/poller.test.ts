import { describe, expect, it } from 'vitest';
import { pollUntilComplete } from '../../src/jobs/poller.js';

describe('poller', () => {
  it('resolves terminal success', async () => {
    let count = 0;
    const result = await pollUntilComplete(async () => {
      count += 1;
      return count === 2 ? { status: 'COMPLETED' } : { status: 'PENDING' };
    }, { pollIntervalMs: 1, timeoutMs: 100 });
    expect(result.status).toBe('COMPLETED');
  });

  it('rejects terminal failure', async () => {
    await expect(pollUntilComplete(async () => ({ status: 'FAILED' }), { pollIntervalMs: 1, timeoutMs: 100 })).rejects.toThrow('Job failed');
  });
});
