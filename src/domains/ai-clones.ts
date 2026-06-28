import type { JsonObject, MaybePrepared, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface AiCloneGenerationParams {
  avatarUrl: string;
  motionVideoUrl: string;
  prompt?: string;
  mode?: string;
  characterOrientation?: string;
  enableVoiceConversion?: boolean;
  voiceAudioUrl?: string;
  voiceId?: string;
}

export class AiClonesDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('list_ai_clone_assets', options as JsonObject); }

  async generate(params: AiCloneGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_ai_clone_job', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'AI_CLONE', (id) => this.getJobStatus(id)) : result;
  }

  async getJobStatus(jobId: string) {
    const result = await this.call('get_ai_clone_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }
}
