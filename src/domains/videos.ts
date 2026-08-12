import type { JsonObject, MaybePrepared, MutationOptions, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface UgcVideoGenerationParams extends MutationOptions {
  parts?: unknown[];
  hookUrl?: string;
  demoUrl?: string;
  caption?: string;
  textPosition?: 'TOP' | 'MIDDLE' | 'BOTTOM';
  audioUrl?: string;
  quality?: 'medium' | 'high';
}

export class VideosDomain extends DomainBase {
  list(options: PageOptions & {
    sourceType?: 'UGC_COMPOSITION' | 'SLIDESHOW' | 'GENERATED_HOOK' | 'AI_CLONE';
  } = {}) { return this.call('list_videos', options as JsonObject); }

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
