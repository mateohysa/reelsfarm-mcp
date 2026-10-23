import { unwrapStatusWithProvenance } from '../utils/provenance.js';
import type { JobStatusOptions } from '../types.js';
import type { JsonObject, MaybePrepared, MutationOptions, PageOptions, SlideshowType } from '../types.js';
import type {
  SlideDesign,
  SlideDesignChoice,
  SlideshowAspectRatio,
  SlideshowEffort,
  SlideshowListResult,
  SlideshowProvenFormatId,
  SlideshowResult,
  SlideshowSettings,
  SlideshowSlideInput,
  SlideshowTextAppearance,
  SlideshowTextPlacement,
} from '../contracts/slideshows.js';
import type { AutomationContent, AutomationImages, AutomationPublishRules } from '../contracts/automations.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export type SlideshowSlideData = SlideshowSlideInput;

export interface FinalizeSlideshowSlide {
  id: string;
  order: number;
  aspectRatio: SlideshowAspectRatio;
  textItems: import('../contracts/slideshows.js').SlideshowTextItem[];
  imageOpacity?: number;
  /** Omit it to export the slide's saved design; null exports it as a classic slide. */
  design?: SlideDesign | null;
}

export interface SlideshowVisualContextReference {
  order: number;
  imageUrl: string;
  /** Text layout checks assume 1:1 when this is omitted. */
  aspectRatio?: SlideshowAspectRatio;
}

export interface SlideshowRevisionTextItem extends SlideshowTextAppearance, SlideshowTextPlacement {
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
  /** A designed slide: the revision rewrites its words and keeps its look. */
  design?: SlideDesign | null;
}

export interface RecreateSlideshowParams extends MutationOptions {
  /** Link to a public TikTok photo slideshow. */
  tiktokUrl: string;
  /** The product the new slideshow is about. Its photo goes on slides where the original shows its own product. */
  productContextId?: string;
  /** What should change, such as "use a wedding cake instead". */
  instructions?: string;
  effort?: SlideshowEffort;
}

/** A reusable slideshow format for batches, with the same fields as an automation. */
export interface SlideshowFormatParams extends MutationOptions {
  /** Updates this saved format. Omit it to save a new one. */
  formatId?: string;
  name: string;
  mode?: 'SIMPLE' | 'ADVANCED';
  content: AutomationContent;
  images?: AutomationImages | null;
  publishRules?: AutomationPublishRules | null;
}

export class SlideshowsDomain extends DomainBase {
  list(options: PageOptions & { status?: 'DRAFT' | 'EXPORTED' } = {}): Promise<SlideshowListResult> {
    return this.call<SlideshowListResult>('reelsfarm_list_slideshows', options as JsonObject);
  }
  get(id: string): Promise<SlideshowResult> { return this.call<SlideshowResult>('reelsfarm_get_slideshow', { id }); }
  create(params: { title?: string; prompt?: string; slideshowType?: SlideshowType; settings?: SlideshowSettings; slides: SlideshowSlideData[] } & MutationOptions): Promise<MaybePrepared<SlideshowResult>> {
    return this.call('reelsfarm_create_slideshow', params as unknown as JsonObject) as Promise<MaybePrepared<SlideshowResult>>;
  }
  /** status accepts only DRAFT; finalize() makes the exported slides. */
  update(id: string, params: { title?: string; prompt?: string; slideshowType?: SlideshowType; status?: 'DRAFT'; settings?: SlideshowSettings; slides?: SlideshowSlideData[] } & MutationOptions): Promise<MaybePrepared<SlideshowResult>> {
    return this.call('reelsfarm_update_slideshow', { id, ...params } as unknown as JsonObject) as Promise<MaybePrepared<SlideshowResult>>;
  }
  delete(id: string) { return this.call('reelsfarm_delete_slideshow', { id }); }
  duplicate(id: string, title?: string) { return this.call('reelsfarm_duplicate_slideshow', { id, title }); }

  async generateText(params: {
    prompt: string;
    slideshowType?: SlideshowType;
    slideCount?: number;
    productContextId?: string;
    maxMode?: boolean;
    /** Without effort, visualContext accepts up to five references. With effort, up to 20. */
    effort?: SlideshowEffort;
    visualContext?: SlideshowVisualContextReference[];
    /** A proven format the copy follows. It sets the slideshow type. */
    format?: SlideshowProvenFormatId;
    /** The Look. Designed slides come back with a design and no text items. iMessage needs no visualContext. */
    design?: SlideDesignChoice;
  } & MutationOptions): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_generate_slideshow_text', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_TEXT', (id, options) => this.getTextJobStatus(id, options)) : result;
  }

  async reviseText(params: {
    instruction: string;
    slideshowType?: SlideshowType;
    productContextId?: string;
    slides: SlideshowRevisionSlide[];
    maxMode?: boolean;
    /** Without effort, visualContext accepts up to five references. With effort, up to 20. */
    effort?: SlideshowEffort;
    visualContext?: SlideshowVisualContextReference[];
  } & MutationOptions): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_revise_slideshow_text', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_REVISION', (id, options) => this.getRevisionJobStatus(id, options)) : result;
  }

  async finalize(params: { slideshowId: string; slides?: FinalizeSlideshowSlide[] } & MutationOptions): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_finalize_slideshow', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_EXPORT', (id, options) => this.getExportJobStatus(id, options)) : result;
  }

  async getTextJobStatus(jobId: string, options: JobStatusOptions = {}) {
    const result = await this.call('reelsfarm_get_slideshow_text_job_status', { jobId, ...options });
    return unwrapStatusWithProvenance(result);
  }

  async getExportJobStatus(jobId: string, options: JobStatusOptions = {}) {
    const result = await this.call('reelsfarm_get_slideshow_export_job_status', { jobId, ...options });
    return unwrapStatusWithProvenance(result);
  }

  async getRevisionJobStatus(jobId: string, options: JobStatusOptions = {}) {
    const result = await this.call('reelsfarm_get_slideshow_revision_job_status', { jobId, ...options });
    return unwrapStatusWithProvenance(result);
  }

  async exportVideo(slideshowId: string, options: MutationOptions = {}): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_export_slideshow_video', {
      slideshowId,
      ...options,
    });
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_VIDEO', (id, options) => this.getVideoExportJobStatus(id, options)) : result;
  }

  getVideoExportJobStatus(jobId: string, options: JobStatusOptions = {}) {
    return this.call('reelsfarm_get_slideshow_video_export_job_status', { jobId, ...options });
  }

  getJobStatus(jobId: string, type: 'text' | 'revision' | 'export' | 'video' | 'recreate' = 'text', options: JobStatusOptions = {}) {
    if (type === 'revision') return this.getRevisionJobStatus(jobId, options);
    if (type === 'export') return this.getExportJobStatus(jobId, options);
    if (type === 'video') return this.getVideoExportJobStatus(jobId, options);
    if (type === 'recreate') return this.getRecreateJobStatus(jobId, options);
    return this.getTextJobStatus(jobId, options);
  }

  /**
   * Recreate a public TikTok photo slideshow as a draft: the same format and text looks, new words, and a
   * photo found for every slide. Takes about two minutes; the finished status has the slideshowId.
   */
  async recreate(params: RecreateSlideshowParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_recreate_slideshow', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'SLIDESHOW_RECREATE', (id, options) => this.getRecreateJobStatus(id, options)) : result;
  }

  async getRecreateJobStatus(jobId: string, options: JobStatusOptions = {}) {
    const result = await this.call('reelsfarm_get_recreate_slideshow_job_status', { jobId, ...options });
    return unwrapStatusWithProvenance(result);
  }

  /** Search Pinterest (the default), Tumblr or Pexels for slide photos. Save picks with savePhotos() before using them. */
  searchPhotos(query: string, options: { source?: 'pinterest' | 'tumblr' | 'pexels'; cursor?: string } = {}) {
    return this.call('reelsfarm_search_photos', { query, ...options } as JsonObject);
  }

  /** Save found photos as slide photos and get their ReelsFarm URLs. They don't count toward the upload limit. */
  savePhotos(photos: Array<{ url: string; name?: string }>, options: MutationOptions = {}) {
    return this.call('reelsfarm_save_slide_photos', { photos, ...options } as unknown as JsonObject);
  }

  listFormats(options: { cursor?: string } = {}) {
    return this.call('reelsfarm_list_slideshow_formats', options as JsonObject);
  }

  saveFormat(params: SlideshowFormatParams) {
    return this.call('reelsfarm_save_slideshow_format', params as unknown as JsonObject);
  }

  /** Archive a saved format. Its batches and their slideshows stay. */
  archiveFormat(formatId: string, options: MutationOptions = {}) {
    return this.call('reelsfarm_archive_slideshow_format', { formatId, ...options });
  }

  /** Make `count` slideshows from a saved format, each with a different angle. Nothing is posted. */
  createBatch(formatId: string, count: number, options: MutationOptions = {}) {
    return prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_create_slideshow_batch', { formatId, count, ...options });
  }

  listBatches(options: { cursor?: string } = {}) {
    return this.call('reelsfarm_list_slideshow_batches', options as JsonObject);
  }

  getBatch(batchId: string) {
    return this.call('reelsfarm_get_slideshow_batch', { batchId });
  }

  /** Make a failed batch slideshow again. Its credits were refunded when it failed. */
  retryBatchItem(batchId: string, itemId: string, options: MutationOptions = {}) {
    return prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_retry_slideshow_batch_item', { batchId, itemId, ...options });
  }

  /** Leave one slideshow out of a batch. */
  excludeBatchItem(batchId: string, itemId: string, options: MutationOptions = {}) {
    return this.call('reelsfarm_exclude_slideshow_batch_item', { batchId, itemId, ...options });
  }
}
