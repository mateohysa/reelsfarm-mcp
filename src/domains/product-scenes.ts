import type { JsonObject, MaybePrepared, MutationOptions, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface ProductSceneGenerationParams extends MutationOptions {
  sourceImageUrl?: string;
  selectedAvatar?: string;
  avatarUrl?: string;
  productImageUrl: string;
  userPrompt?: string;
  prompt?: string;
  conversationId?: string;
  parentGenerationId?: string;
}

export class ProductScenesDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('list_gallery', options as JsonObject); }

  async generate(params: ProductSceneGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_generate_product_scene', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'PRODUCT_PLACEMENT', (id) => this.getJobStatus(id)) : result;
  }

  async getJobStatus(jobId: string) {
    const result = await this.call('get_product_scene_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  delete(id: string) { return this.call('delete_gallery_image', { id }); }
}
