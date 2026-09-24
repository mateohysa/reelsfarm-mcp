import { describe, expect, it } from 'vitest';
import { AvatarsDomain, AiClonesDomain, AssetsDomain, HooksDomain, ImageGenerationsDomain, ProductScenesDomain, SlideshowsDomain, VideosDomain, TrashDomain } from '../../src/domains/index.js';
import { ReelsFarmJob } from '../../src/jobs/job.js';
import { pollUntilComplete } from '../../src/jobs/poller.js';
import type { DomainContext } from '../../src/domains/context.js';
import type { JsonObject } from '../../src/types.js';

const progress = { step: 'completed', terminal: true, nextPollAfterMs: 0, processed: 2, total: 2, succeeded: 1, failed: 1 };

describe('MCP 3.3 job status', () => {
  it.each(['stored-asset', 'character', 'draft', 'product-context'] as const)('restores the new %s trash type', async (type) => {
    let actual: unknown;
    const context: DomainContext = { dryRun: false, autoConfirm: false, callTool: async (_, args) => {
      actual = args; return { content: [], structuredContent: { restored: true } };
    } };
    await new TrashDomain(context).restore('trash_1', type);
    expect(actual).toEqual({ id: 'trash_1', type });
  });

  it('passes bounded waits to all 12 status tools and preserves progress', async () => {
    const calls: Array<{ name: string; args: JsonObject }> = [];
    const context: DomainContext = {
      dryRun: false, autoConfirm: false,
      callTool: async (name, args = {}) => {
        calls.push({ name, args });
        const job = { status: 'COMPLETED', results: [{ error: 'one item failed' }] };
        const structuredContent = {
          ...(name.includes('image_generation_job') ? { job } : { status: job }),
          jobProgress: progress, provider: 'reelsfarm', executionState: 'COMPLETED',
        };
        return { content: [], structuredContent };
      },
    };
    const slides = new SlideshowsDomain(context);
    const readers = [
      (id: string) => new AvatarsDomain(context).getJobStatus(id, { waitMs: 25000 }),
      (id: string) => new AiClonesDomain(context).getJobStatus(id, { waitMs: 25000 }),
      (id: string) => new AssetsDomain(context).getBulkImportStatus(id, { waitMs: 25000 }),
      (id: string) => new HooksDomain(context).getJobStatus(id, { waitMs: 25000 }),
      (id: string) => new HooksDomain(context).getImportStatus(id, { waitMs: 25000 }),
      (id: string) => new ImageGenerationsDomain(context).getJob(id, { waitMs: 25000 }),
      (id: string) => new ProductScenesDomain(context).getJobStatus(id, { waitMs: 25000 }),
      (id: string) => slides.getJobStatus(id, 'text', { waitMs: 25000 }),
      (id: string) => slides.getJobStatus(id, 'revision', { waitMs: 25000 }),
      (id: string) => slides.getJobStatus(id, 'export', { waitMs: 25000 }),
      (id: string) => slides.getJobStatus(id, 'video', { waitMs: 25000 }),
      (id: string) => new VideosDomain(context).getJobStatus(id, { waitMs: 25000 }),
    ];
    for (const read of readers) expect(await read('job_1')).toMatchObject({ jobProgress: progress, provider: 'reelsfarm' });
    expect(new Set(calls.map(({ name }) => name)).size).toBe(12);
    expect(calls.every(({ args }) => args.jobId === 'job_1' && args.waitMs === 25000)).toBe(true);
  });

  it('lets job handles request bounded waits without changing snapshot defaults', async () => {
    const options: unknown[] = [];
    const job = new ReelsFarmJob('job_1', 'AVATAR', async (_, value) => {
      options.push(value); return { status: 'COMPLETED' };
    });
    await job.getStatus();
    await job.getStatus({ waitMs: 25000 });
    expect(options).toEqual([{}, { waitMs: 25000 }]);
  });

  it('stops on normalized completion and retains partial batch results', async () => {
    const result = { status: { status: 'COMPLETED' }, jobProgress: progress, results: [{ error: 'failed item' }] };
    expect(await pollUntilComplete(async () => result)).toEqual(result);
  });

  it.each(['FAILED_FINAL', 'FAILED_RETRYABLE', 'CANCELLED'])('rejects terminal %s instead of timing out', async (status) => {
    await expect(pollUntilComplete(async () => ({ status }))).rejects.toThrow('Job failed');
  });
});
