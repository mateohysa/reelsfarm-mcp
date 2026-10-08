import { unwrapStatusWithProvenance } from '../utils/provenance.js';
import type { JobProgress, JobStatusOptions } from '../types.js';
import type {
  JsonObject,
  MaybePrepared,
  MutationOptions,
  PageOptions,
  VideoAspectRatio,
  VideoCategory,
  VideoGenerationModel,
  VideoResolution,
} from '../types.js';
import type { SlideshowVideoArtifact } from '../contracts/slideshows.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export type VideoArtifact = SlideshowVideoArtifact;

export interface UgcVideoGenerationParams extends MutationOptions {
  parts?: unknown[];
  hookUrl?: string;
  demoUrl?: string;
  caption?: string;
  textPosition?: 'TOP' | 'MIDDLE' | 'BOTTOM';
  audioUrl?: string;
  quality?: 'medium' | 'high';
}

/** Videos workbench request. Check rf.account.getGenerationPricing() for each model's limits. */
export interface VideoGenerationParams extends MutationOptions {
  /** Up to 4000 characters. Describe sound here when the model generates audio. */
  prompt: string;
  /** Defaults to seedance-2.5. */
  model?: VideoGenerationModel;
  /** 4, 6, 8, 10, 12, or 15. Each model supports a subset. Defaults to 4. */
  durationSeconds?: number;
  /** Defaults to 9:16. 1:1 is available only with Seedance models. */
  aspectRatio?: VideoAspectRatio;
  /** Only gemini-omni-1.1-flash offers a choice. Omit it to use the model resolution. */
  resolution?: VideoResolution;
  /** Must be true for gemini-omni-1.1-flash. */
  includeAudio?: boolean;
  /** Library category for the finished video. Defaults to scenes. */
  category?: VideoCategory;
  /** User-owned media collection that receives the finished video. */
  collectionId?: string;
  /** Owned ReelsFarm image URL to animate. Do not combine frames with reference media. */
  firstFrameUrl?: string;
  /** Owned ReelsFarm image URL for the ending frame. Requires firstFrameUrl. */
  lastFrameUrl?: string;
  /** Up to three owned ReelsFarm image URLs that guide the subject, product, scene, or style. */
  referenceImageUrls?: string[];
  /** Up to one owned ReelsFarm video URL. Seedance models only. */
  referenceVideoUrls?: string[];
  /** Up to one owned ReelsFarm audio URL. Seedance models only, with an image or video reference. */
  referenceAudioUrls?: string[];
  /** Groups related videos in the dashboard Videos history. Omit it to start a new conversation. */
  conversationId?: string;
}

export interface VideoGenerationStatus extends JsonObject {
  jobProgress?: JobProgress;
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  prompt: string | null;
  model: VideoGenerationModel | null;
  durationSeconds: number | null;
  aspectRatio: VideoAspectRatio | null;
  resolution: VideoResolution | null;
  includeAudio: boolean;
  category: VideoCategory | null;
  conversationId: string | null;
  collectionId: string | null;
  creditsCost: number;
  createdAt: string;
  completedAt: string | null;
  /** Where the finished video was saved. fallbackToGallery is true when the collection was removed. */
  destination: { collectionId: string | null; collectionName: string | null; fallbackToGallery: boolean } | null;
  /** The finished library video. Publish it with contentType UGC_VIDEO and video.id. */
  video: VideoArtifact | null;
  errorMessage: string | null;
  error?: { category: string; message: string };
}

export interface VideoListResult extends JsonObject {
  videos: VideoArtifact[];
  /** Matching library videos across all pages. Excludes trashed videos and imported hook clips. */
  totalCount: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export class VideosDomain extends DomainBase {
  list(options: PageOptions & {
    sourceType?: 'UGC_COMPOSITION' | 'SLIDESHOW' | 'GENERATED_HOOK' | 'AI_CLONE';
    category?: VideoCategory;
  } = {}): Promise<VideoListResult> { return this.call<VideoListResult>('reelsfarm_list_videos', options as JsonObject); }

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

  /** Generate a video in the Videos workbench from a prompt, start and end frames, or reference media. */
  async generateVideo(params: VideoGenerationParams): Promise<MaybePrepared<ReelsFarmJob<VideoGenerationStatus> | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_generate_video', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId
      ? new ReelsFarmJob<VideoGenerationStatus>(jobId, 'VIDEO_GENERATION', (id, options) => this.getGenerationStatus(id, options))
      : result;
  }

  async getGenerationStatus(jobId: string, options: JobStatusOptions = {}): Promise<VideoGenerationStatus> {
    const result = await this.call('reelsfarm_get_video_generation_status', { jobId, ...options });
    return unwrapStatusWithProvenance(result) as VideoGenerationStatus;
  }

  delete(id: string) { return this.call('reelsfarm_delete_video', { id }); }
  duplicate(id: string) { return this.call('reelsfarm_duplicate_video', { id }); }
}
