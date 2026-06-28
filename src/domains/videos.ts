import type { JsonObject, MaybePrepared } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface UgcVideoGenerationParams {
  parts?: unknown[];
  hookUrl?: string;
  demoUrl?: string;
  caption?: string;
  audioUrl?: string;
  quality?: string;
}

export class VideosDomain extends DomainBase {
  list(options: { limit?: number } = {}) { return this.call('list_videos', options); }

  async generate(params: UgcVideoGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_generate_ugc_video', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'UGC_VIDEO', (id) => this.getJobStatus(id)) : result;
  }

  async getJobStatus(jobId: string) {
    const result = await this.call('get_video_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  delete(id: string) { return this.call('delete_video', { id }); }
  duplicate(id: string) { return this.call('duplicate_video', { id }); }
}
