import { unwrapStatusWithProvenance } from '../utils/provenance.js';
import type { JobProgress } from '../types.js';
import type { JobStatusOptions } from '../types.js';
import type { AvatarGenerationQuality, AvatarModel, AvatarStyleMode, ImageAspectRatio, JsonObject, PageOptions } from '../types.js';
import { DomainBase } from './base.js';

export type ImageGenerationKind = 'AVATAR' | 'PRODUCT_PLACEMENT';
export type ImageGenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ImageGenerationTurn extends JsonObject {
  jobProgress?: JobProgress;
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

export type ImageTemplateCategory = 'product' | 'infographics';

/** Dashboard Images workbench template. Fill the prompt placeholders and call generationTool. */
export interface ImageTemplate extends JsonObject {
  id: string;
  name: string;
  category: ImageTemplateCategory;
  description: string;
  /** Layout reference image. Pass it as sourceImageUrl. */
  referenceUrl: string;
  /** First prompt line, such as IMAGE CATEGORY: Product. */
  categoryLine: string;
  /** Brief with [PLACEHOLDER] fields. Replace them with the user's details and remove lines you cannot fill. */
  prompt: string;
  /** True when productImageUrl must be set to the user's product photo. */
  requiresProduct: boolean;
  generationTool: 'reelsfarm_prepare_generate_product_scene' | 'reelsfarm_prepare_generate_avatar';
  /** Avatar settings, present only for templates that do not require a product. */
  model?: AvatarModel;
  aspectRatio?: ImageAspectRatio;
  quality?: AvatarGenerationQuality;
}

export interface PeopleImageTemplate extends JsonObject {
  categoryLine: string;
  prompt: string;
  model: AvatarModel;
  aspectRatio: ImageAspectRatio;
  quality: AvatarGenerationQuality;
  /** People reference images come from rf.avatars.listTemplates(). */
  referenceImages: 'reelsfarm_list_avatar_templates';
  generationTool: 'reelsfarm_prepare_generate_avatar';
}

export interface ImageTemplateList extends JsonObject {
  templates: ImageTemplate[];
  peopleTemplate: PeopleImageTemplate;
}

export class ImageGenerationsDomain extends DomainBase {
  /** List the Product and Infographics templates from the dashboard Images workbench. */
  listTemplates(options: { category?: ImageTemplateCategory } = {}): Promise<ImageTemplateList> {
    return this.call<ImageTemplateList>('reelsfarm_list_image_templates', options);
  }

  async listActive(): Promise<ImageGenerationTurn[]> {
    const result = await this.call<{ jobs: ImageGenerationTurn[] }>('reelsfarm_list_active_image_generation_jobs');
    return result.jobs;
  }

  async getJob(jobId: string, options: JobStatusOptions = {}): Promise<ImageGenerationTurn> {
    const result = await this.call<{ job: ImageGenerationTurn }>('reelsfarm_get_image_generation_job_status', { jobId, ...options });
    return unwrapStatusWithProvenance(result) as ImageGenerationTurn;
  }

  getConversation(conversationId: string, options: PageOptions = {}): Promise<ImageGenerationConversation> {
    return this.call<ImageGenerationConversation>('reelsfarm_get_image_generation_conversation', {
      conversationId,
      ...options,
    });
  }
}
