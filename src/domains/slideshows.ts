import type { JsonObject, MaybePrepared, MutationOptions, PageOptions, SlideshowType } from '../types.js';
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

export interface SlideshowVisualContextReference {
  order: number;
  imageUrl: string;
}

export interface SlideshowRevisionTextItem {
  text: string;
  fontSize: '10px' | '12px' | '14px' | '16px' | '18px' | '20px' | '24px' | '28px' | '32px';
  textStyle: 'outline' | 'solid' | 'shadow' | 'neon' | 'tiktok' | 'white' | 'black' | 'yellow' | 'pink' | 'whiteBubble' | 'blackBubble';
  textPosition: 'top' | 'middle' | 'bottom';
  textAlign: 'left' | 'center' | 'right';
  textType?: 'title' | 'body';
  fontWeight?: 500 | 700;
  textTransform?: 'uppercase' | 'none';
}

export interface SlideshowRevisionSlide {
  order: number;
  textItems: SlideshowRevisionTextItem[];
}

export class SlideshowsDomain extends DomainBase {
  list(options: PageOptions & { status?: 'DRAFT' | 'EXPORTED' } = {}) {
    return this.call('list_slideshows', options as JsonObject);
  }
  get(id: string) { return this.call('get_slideshow', { id }); }
  create(params: { title?: string; prompt?: string; slideshowType?: SlideshowType; settings?: JsonObject; slides: SlideshowSlideData[] } & MutationOptions) {
    return this.call('create_slideshow', params as unknown as JsonObject);
  }
  update(id: string, params: { title?: string; prompt?: string; slideshowType?: SlideshowType; status?: 'DRAFT' | 'EXPORTED'; settings?: JsonObject; slides?: SlideshowSlideData[] }) {
    return this.call('update_slideshow', { id, ...params } as unknown as JsonObject);
  }
  delete(id: string) { return this.call('delete_slideshow', { id }); }
  duplicate(id: string, title?: string) { return this.call('duplicate_slideshow', { id, title }); }

  async generateText(params: {
    prompt: string;
    slideshowType?: SlideshowType;
    slideCount?: number;
    productContextId?: string;
    maxMode?: boolean;
    visualContext?: SlideshowVisualContextReference[];
  } & MutationOptions): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_generate_slideshow_text', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_TEXT', (id) => this.getTextJobStatus(id)) : result;
  }

  async reviseText(params: {
    instruction: string;
    slideshowType?: SlideshowType;
    productContextId?: string;
    slides: SlideshowRevisionSlide[];
    maxMode?: boolean;
    visualContext?: SlideshowVisualContextReference[];
  } & MutationOptions): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_revise_slideshow_text', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_REVISION', (id) => this.getRevisionJobStatus(id)) : result;
  }

  async finalize(params: { slideshowId: string; slides?: SlideshowSlideData[] } & MutationOptions): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
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

  async getRevisionJobStatus(jobId: string) {
    const result = await this.call('get_slideshow_revision_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  async exportVideo(slideshowId: string, options: MutationOptions = {}): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'prepare_export_slideshow_video', {
      slideshowId,
      ...options,
    });
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_VIDEO', (id) => this.getVideoExportJobStatus(id)) : result;
  }

  getVideoExportJobStatus(jobId: string) {
    return this.call('get_slideshow_video_export_job_status', { jobId });
  }

  getJobStatus(jobId: string, type: 'text' | 'revision' | 'export' | 'video' = 'text') {
    if (type === 'revision') return this.getRevisionJobStatus(jobId);
    if (type === 'export') return this.getExportJobStatus(jobId);
    if (type === 'video') return this.getVideoExportJobStatus(jobId);
    return this.getTextJobStatus(jobId);
  }
}
