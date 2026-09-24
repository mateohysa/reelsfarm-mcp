import { unwrapStatusWithProvenance } from '../utils/provenance.js';
import type { JobStatusOptions } from '../types.js';
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
  } = {}) { return this.call('reelsfarm_list_videos', options as JsonObject); }

  async generate(params: UgcVideoGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_generate_ugc_video', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'UGC_VIDEO', (id, options) => this.getJobStatus(id, options)) : result;
  }

  async getJobStatus(jobId: string, options: JobStatusOptions = {}) {
    const result = await this.call('reelsfarm_get_video_job_status', { jobId, ...options });
    return unwrapStatusWithProvenance(result);
  }

  delete(id: string) { return this.call('reelsfarm_delete_video', { id }); }
  duplicate(id: string) { return this.call('reelsfarm_duplicate_video', { id }); }
}
