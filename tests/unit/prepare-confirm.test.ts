import { describe, expect, it } from 'vitest';
import { ReelsFarmConfirmationError } from '../../src/errors.js';
import { prepareAndConfirm } from '../../src/utils/prepare-confirm.js';
import type { JsonObject } from '../../src/types.js';

const prepared = {
  provider: 'reelsfarm' as const,
  sourceTool: 'reelsfarm_prepare_generate_avatar',
  executionState: 'PREPARED' as const,
  assetCreated: false as const,
  resultMessage: 'The ReelsFarm action is prepared only. No asset has been created.',
  confirmationId: 'c1',
  confirmationTool: 'reelsfarm_confirm_generate_avatar',
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

  it('confirms a Review action once, with the confirmation tool it names, when autoConfirm is explicit', async () => {
    let confirmCalls = 0;
    const result = await prepareAndConfirm<JsonObject>({
      dryRun: false,
      autoConfirm: true,
      async callTool(name) {
        if (name === 'reelsfarm_confirm_generate_avatar') {
          confirmCalls += 1;
          return { content: [], structuredContent: { jobId: 'job_1', status: 'PENDING' } };
        }
        return { content: [], structuredContent: prepared };
      },
    }, 'reelsfarm_prepare_generate_avatar', { prompt: 'x' });
    expect(result).toMatchObject({ jobId: 'job_1' });
    expect(confirmCalls).toBe(1);
  });

  it('finds the confirmation tool from the prepared tool when the result does not name it', async () => {
    const called: string[] = [];
    const unnamed: Partial<typeof prepared> = { ...prepared };
    delete unnamed.confirmationTool;
    await prepareAndConfirm<JsonObject>({
      dryRun: false,
      autoConfirm: true,
      async callTool(name) {
        called.push(String(name));
        return { content: [], structuredContent: name === 'reelsfarm_prepare_generate_avatar' ? unnamed : { jobId: 'job_1' } };
      },
    }, 'reelsfarm_prepare_generate_avatar', { prompt: 'x' });
    expect(called).toEqual(['reelsfarm_prepare_generate_avatar', 'reelsfarm_confirm_generate_avatar']);
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
        if (name === 'reelsfarm_confirm_generate_avatar') throw new Error('Confirmation already used');
        prepareCalls += 1;
        return { content: [], structuredContent: prepared };
      },
    }, 'reelsfarm_prepare_generate_avatar', { prompt: 'x' })).rejects.toBeInstanceOf(ReelsFarmConfirmationError);
    expect(prepareCalls).toBe(1);
  });
});
