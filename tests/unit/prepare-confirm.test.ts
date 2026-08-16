import { describe, expect, it } from 'vitest';
import { ReelsFarmConfirmationError } from '../../src/errors.js';
import { prepareAndConfirm } from '../../src/utils/prepare-confirm.js';
import type { JsonObject } from '../../src/types.js';

const prepared = {
  confirmationId: 'c1',
  operationId: 'op1',
  expiresAt: new Date().toISOString(),
  summary: 'test',
  creditEstimate: null,
};

describe('prepareAndConfirm', () => {
  it('returns a Review prepared action by default', async () => {
    const result = await prepareAndConfirm<JsonObject>({
      dryRun: false,
      autoConfirm: false,
      async callTool() {
        return { content: [], structuredContent: prepared };
      },
    }, 'reelsfarm_prepare_generate_avatar', { prompt: 'x' });
    expect(result).toMatchObject({ confirmationId: 'c1', operationId: 'op1' });
  });

  it('confirms a Review action once when autoConfirm is explicit', async () => {
    let confirmCalls = 0;
    const result = await prepareAndConfirm<JsonObject>({
      dryRun: false,
      autoConfirm: true,
      async callTool(name) {
        if (name === 'reelsfarm_confirm_action') {
          confirmCalls += 1;
          return { content: [], structuredContent: { jobId: 'job_1', status: 'PENDING' } };
        }
        return { content: [], structuredContent: prepared };
      },
    }, 'reelsfarm_prepare_generate_avatar', { prompt: 'x' });
    expect(result).toMatchObject({ jobId: 'job_1' });
    expect(confirmCalls).toBe(1);
  });

  it('accepts an immediate Creator or Autopilot result without confirming again', async () => {
    let calls = 0;
    const result = await prepareAndConfirm<JsonObject>({
      dryRun: false,
      autoConfirm: true,
      async callTool() {
        calls += 1;
        return { content: [], structuredContent: { jobId: 'job_1', status: 'PENDING' } };
      },
    }, 'reelsfarm_prepare_generate_avatar', { prompt: 'x' });
    expect(result).toMatchObject({ jobId: 'job_1' });
    expect(calls).toBe(1);
  });

  it('never re-prepares after an ambiguous or already-used confirmation', async () => {
    let prepareCalls = 0;
    await expect(prepareAndConfirm<JsonObject>({
      dryRun: false,
      autoConfirm: true,
      async callTool(name) {
        if (name === 'reelsfarm_confirm_action') throw new Error('Confirmation already used');
        prepareCalls += 1;
        return { content: [], structuredContent: prepared };
      },
    }, 'reelsfarm_prepare_generate_avatar', { prompt: 'x' })).rejects.toBeInstanceOf(ReelsFarmConfirmationError);
    expect(prepareCalls).toBe(1);
  });
});
