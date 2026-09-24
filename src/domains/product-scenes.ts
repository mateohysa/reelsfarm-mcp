import { unwrapStatusWithProvenance } from '../utils/provenance.js';
import type { JobStatusOptions } from '../types.js';
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
  list(options: PageOptions = {}) { return this.call('reelsfarm_list_gallery', options as JsonObject); }

  async generate(params: ProductSceneGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_generate_product_scene', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'PRODUCT_PLACEMENT', (id, options) => this.getJobStatus(id, options)) : result;
  }

  async getJobStatus(jobId: string, options: JobStatusOptions = {}) {
    const result = await this.call('reelsfarm_get_product_scene_job_status', { jobId, ...options });
    return unwrapStatusWithProvenance(result);
  }

  delete(id: string) { return this.call('reelsfarm_delete_gallery_image', { id }); }
}
