import type { AvatarModel, AvatarStyleMode, ImageAspectRatio, JsonObject, MaybePrepared, MutationOptions, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface AvatarGenerationParams extends MutationOptions {
  prompt: string;
  mode?: 'text' | 'reference';
  sourceImageUrl?: string;
  referenceUrl?: string;
  model?: AvatarModel;
  aspectRatio?: ImageAspectRatio;
  styleMode?: AvatarStyleMode;
  conversationId?: string;
  parentGenerationId?: string;
}

export class AvatarsDomain extends DomainBase {
  list(options: PageOptions = {}) {
    return this.call('list_avatars', options as JsonObject);
  }

  listTemplates(options: { limit?: number; cursor?: string } = {}) {
    return this.call('list_avatar_templates', options);
  }

  async generate(params: AvatarGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_generate_avatar', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'AVATAR', (id) => this.getJobStatus(id)) : result;
  }

  async generateBatch(items: AvatarGenerationParams[], options: MutationOptions = {}): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_batch_generate_avatars', { items, ...options } as unknown as JsonObject);
  }

  async getJobStatus(jobId: string) {
    const result = await this.call('get_avatar_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  delete(id: string) { return this.call('delete_avatar', { id }); }
  duplicate(id: string, name?: string) { return this.call('duplicate_avatar', { id, name }); }
}
