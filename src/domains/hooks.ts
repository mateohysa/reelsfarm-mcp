import type { JsonObject, MaybePrepared, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface HookGenerationParams {
  avatarUrl: string;
  preset?: string;
  model?: string;
  durationSeconds?: number;
  includeAudio?: boolean;
  scriptText?: string;
}

export class HooksDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('list_generated_hooks', options as JsonObject); }
  listTemplates(options: { limit?: number; page?: number } = {}) { return this.call('list_template_hooks', options); }

  async generate(params: HookGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_generate_hook', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'HOOK', (id) => this.getJobStatus(id)) : result;
  }

  async getJobStatus(jobId: string) {
    const result = await this.call('get_generated_hook_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }
}
