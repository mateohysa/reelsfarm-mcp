import type { AvatarGenerationQuality, AvatarModel, AvatarStyleMode, ImageAspectRatio, JsonObject, PageOptions } from '../types.js';
import { DomainBase } from './base.js';

export type ImageGenerationKind = 'AVATAR' | 'PRODUCT_PLACEMENT';
export type ImageGenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ImageGenerationTurn extends JsonObject {
  jobId: string;
  conversationId: string;
  parentGenerationId: string | null;
  kind: ImageGenerationKind;
  status: ImageGenerationStatus;
  prompt: string;
  creditsCost: number;
  createdAt: string;
  input: {
    sourceImageUrl?: string;
    productImageUrl?: string;
    model?: AvatarModel;
    aspectRatio?: ImageAspectRatio;
    quality?: AvatarGenerationQuality;
    styleMode?: AvatarStyleMode;
  };
  output?: {
    id: string;
    imageUrl: string;
    thumbnailUrl?: string;
    createdAt: string;
  };
  error?: {
    category: string;
    message: string;
    refunded: boolean;
  };
}

export interface ImageGenerationConversation extends JsonObject {
  conversationId: string;
  turns: ImageGenerationTurn[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class ImageGenerationsDomain extends DomainBase {
  async listActive(): Promise<ImageGenerationTurn[]> {
    const result = await this.call<{ jobs: ImageGenerationTurn[] }>('reelsfarm_list_active_image_generation_jobs');
    return result.jobs;
  }

  async getJob(jobId: string): Promise<ImageGenerationTurn> {
    const result = await this.call<{ job: ImageGenerationTurn }>('reelsfarm_get_image_generation_job_status', { jobId });
    return result.job;
  }

  getConversation(conversationId: string, options: PageOptions = {}): Promise<ImageGenerationConversation> {
    return this.call<ImageGenerationConversation>('reelsfarm_get_image_generation_conversation', {
      conversationId,
      ...options,
    });
  }
}
