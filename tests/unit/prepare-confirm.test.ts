import { describe, expect, it } from 'vitest';
import { prepareAndConfirm } from '../../src/utils/prepare-confirm.js';
import type { JsonObject } from '../../src/types.js';

describe('prepareAndConfirm', () => {
  it('returns prepared action in dry-run mode', async () => {
    const result = await prepareAndConfirm<JsonObject>({
      dryRun: true,
      async callTool() {
        return { content: [], structuredContent: { confirmationId: 'c1', expiresAt: new Date().toISOString(), summary: 'test', creditEstimate: null } };
      },
    }, 'prepare_generate_avatar', { prompt: 'x' });
    expect('confirmationId' in result).toBe(true);
  });

  it('retries expired confirmations once', async () => {
    let confirmCalls = 0;
    const result = await prepareAndConfirm<JsonObject>({
      dryRun: false,
      async callTool(name) {
        if (name === 'confirm_action') {
          confirmCalls += 1;
          if (confirmCalls === 1) throw new Error('Confirmation not found, expired, or already used');
          return { content: [], structuredContent: { jobId: 'job_1', status: 'PENDING' } };
        }
        return { content: [], structuredContent: { confirmationId: 'c' + confirmCalls, expiresAt: new Date().toISOString(), summary: 'test', creditEstimate: null } };
      },
    }, 'prepare_generate_avatar', { prompt: 'x' });
    expect('jobId' in result ? result.jobId : undefined).toBe('job_1');
  });
});
