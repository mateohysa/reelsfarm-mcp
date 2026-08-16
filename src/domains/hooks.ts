import type { HookGenerationModel, HookGenerationPreset, JsonObject, MaybePrepared, MutationOptions, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface HookGenerationParams extends MutationOptions {
  avatarUrl: string;
  preset?: HookGenerationPreset;
  model?: HookGenerationModel;
  durationSeconds?: number;
  includeAudio?: boolean;
  scriptText?: string;
  customPrompt?: string;
}

export interface HookClipImportItem extends JsonObject {
  url: string;
  /** Clip start in seconds or mm:ss, matching the web app input. */
  start: string | number;
  /** Clip length in seconds or mm:ss. The parsed value must be from 1 to 10 seconds. */
  length: string | number;
  name?: string;
}

export interface HookClipImportParams extends MutationOptions {
  items: HookClipImportItem[];
  fallbackProfiles?: Partial<Record<'youtube' | 'tiktok', string>>;
}

export class HooksDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('reelsfarm_list_generated_hooks', options as JsonObject); }
  listTemplates(options: { limit?: number; page?: number } = {}) { return this.call('reelsfarm_list_template_hooks', options); }
  getImportCapabilities() { return this.call('reelsfarm_get_hook_import_capabilities'); }
  checkImportAccess(platform: 'youtube' | 'tiktok', profileId?: string) {
    return this.call('reelsfarm_check_hook_import_access', { platform, profileId });
  }

  async generate(params: HookGenerationParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_generate_hook', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'HOOK', (id) => this.getJobStatus(id)) : result;
  }

  async getJobStatus(jobId: string) {
    const result = await this.call('reelsfarm_get_generated_hook_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  async importClips(params: HookClipImportParams): Promise<MaybePrepared<ReelsFarmJob | JsonObject>> {
    const result = await prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_import_hook_clips', params as unknown as JsonObject);
    if ('confirmationId' in result) return result;
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'HOOK_IMPORT', (id) => this.getImportStatus(id)) : result;
  }

  async getImportStatus(jobId: string) {
    return this.call('reelsfarm_get_hook_clip_import_status', { jobId });
  }

  cancelImport(jobId: string, options: MutationOptions = {}): Promise<MaybePrepared<JsonObject>> {
    return this.call('reelsfarm_cancel_hook_clip_import', { jobId, ...options });
  }
}
