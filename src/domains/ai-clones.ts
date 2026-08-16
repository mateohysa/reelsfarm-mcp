import type { JsonObject, MaybePrepared, MutationOptions, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface AiCloneGenerationParams extends MutationOptions {
  avatarUrl: string;
  motionVideoUrl: string;
  prompt?: string;
  mode?: '720p' | '1080p';
  characterOrientation?: 'image' | 'video';
  enableVoiceConversion?: boolean;
  voiceAudioUrl?: string;
  voiceId?: string;
  voiceModelId?: string;
  removeBackgroundNoise?: boolean;
}

export interface AiCloneVoiceQuery extends JsonObject {
  pageSize?: number;
  page?: number;
  category?: 'professional' | 'famous' | 'high_quality';
  language?: string;
  locale?: string;
  gender?: string;
  age?: string;
  accent?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
  includeCustomRates?: boolean;
  includeLiveModerated?: boolean;
}

export interface AiCloneVoice extends JsonObject {
  voiceId: string;
  name: string;
  accent: string | null;
  gender: string | null;
  age: string | null;
  descriptive: string | null;
  useCase: string | null;
  category: string | null;
  language: string | null;
  description: string | null;
  previewUrl: string | null;
  featured: boolean;
  freeUsersAllowed: boolean;
  liveModerationEnabled: boolean;
  rateMultiplier: number;
  verifiedPreviews: Array<{
    language: string | null;
    locale: string | null;
    accent: string | null;
    modelId: string | null;
    previewUrl: string;
  }>;
}

export interface AiCloneVoicesPage extends JsonObject {
  voices: AiCloneVoice[];
  hasMore: boolean;
  totalCount: number;
  lastSortId: string | null;
}

export class AiClonesDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('reelsfarm_list_ai_clone_assets', options as JsonObject); }
  listVoices(options: AiCloneVoiceQuery = {}) { return this.call<AiCloneVoicesPage>('reelsfarm_list_ai_clone_voices', options); }

  async generate(params: AiCloneGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_ai_clone_job', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'AI_CLONE', (id) => this.getJobStatus(id)) : result;
  }

  async getJobStatus(jobId: string) {
    const result = await this.call('reelsfarm_get_ai_clone_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }
}
