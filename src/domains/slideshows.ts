import type { JsonObject, MaybePrepared, SlideshowType } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface SlideshowSlideData {
  id?: string;
  imageUrl: string;
  avatarId?: string;
  compositedImageUrl?: string;
  order?: number;
  aspectRatio?: string;
  timeLengthMs?: number;
  textItems?: unknown[];
}

export class SlideshowsDomain extends DomainBase {
  list(options: { limit?: number; status?: string } = {}) { return this.call('list_slideshows', options); }
  get(id: string) { return this.call('get_slideshow', { id }); }
  create(params: { title?: string; prompt?: string; slideshowType?: SlideshowType; settings?: JsonObject; slides: SlideshowSlideData[] }) {
    return this.call('create_slideshow', params as unknown as JsonObject);
  }
  update(id: string, params: { title?: string; prompt?: string; slideshowType?: SlideshowType; status?: 'DRAFT' | 'EXPORTED'; settings?: JsonObject; slides?: SlideshowSlideData[] }) {
    return this.call('update_slideshow', { id, ...params } as unknown as JsonObject);
  }
  delete(id: string) { return this.call('delete_slideshow', { id }); }
  duplicate(id: string, title?: string) { return this.call('duplicate_slideshow', { id, title }); }

  async generateText(params: { prompt: string; slideshowType?: SlideshowType; slideCount?: number; productContextId?: string }): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_generate_slideshow_text', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_TEXT', (id) => this.getTextJobStatus(id)) : result;
  }

  async finalize(params: { slideshowId: string; slides?: SlideshowSlideData[] }): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_finalize_slideshow', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_EXPORT', (id) => this.getExportJobStatus(id)) : result;
  }

  async getTextJobStatus(jobId: string) {
    const result = await this.call('get_slideshow_text_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  async getExportJobStatus(jobId: string) {
    const result = await this.call('get_slideshow_export_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  getJobStatus(jobId: string, type: 'text' | 'export' = 'text') {
    return type === 'export' ? this.getExportJobStatus(jobId) : this.getTextJobStatus(jobId);
  }
}
