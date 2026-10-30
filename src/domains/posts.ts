import type { JsonObject, MaybePrepared, MutationOptions } from '../types.js';
import type {
  PlatformTarget,
  PublishContentType,
  PublishFormat,
  PublishingPreflightParams,
  PublishingPreflightResult,
} from '../contracts/publishing.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface PublishParams extends MutationOptions {
  contentType: PublishContentType;
  contentId: string;
  timezone?: string;
  caption?: string;
  platforms: PlatformTarget[];
  publishFormat?: PublishFormat;
}

export interface UpdateScheduledPostParams extends MutationOptions {
  scheduledFor?: string | Date;
  timezone?: string;
  /** New shared caption. It also clears the captionOverride of destinations that `platforms` does not set. */
  caption?: string;
  /** Settings to change for existing destinations. An empty captionOverride or tiktokTitle clears it. */
  platforms?: PlatformTarget[];
}

export interface SchedulePostParams extends PublishParams {
  scheduledFor: string | Date;
}

function serializeDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export class PostsDomain extends DomainBase {
  /** Scheduled posts, 20 per page unless `limit` says otherwise (up to 100). */
  list(options: { limit?: number; cursor?: string; status?: string; startDate?: string; endDate?: string; platform?: string; accountId?: string } = {}) {
    return this.call('reelsfarm_list_scheduled_posts', options);
  }
  getStatus(id: string) { return this.call('reelsfarm_get_publish_status', { id }); }
  getOptimalTimes(options: { platform?: string; limit?: number } = {}) { return this.call('reelsfarm_get_optimal_posting_times', options); }
  preflight(params: PublishingPreflightParams): Promise<PublishingPreflightResult> {
    return this.call<PublishingPreflightResult>('reelsfarm_preflight_publishing', params as unknown as JsonObject);
  }

  schedule(params: SchedulePostParams): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_schedule_post', { ...params, scheduledFor: serializeDate(params.scheduledFor) } as unknown as JsonObject);
  }

  publishNow(params: PublishParams): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_publish_now', params as unknown as JsonObject);
  }

  batchPublish(params: PublishParams): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_batch_publish', params as unknown as JsonObject);
  }

  /**
   * Edit a SCHEDULED post before it publishes. `platforms` changes the settings of existing
   * destinations, named by platform and connectionId (accountId in list results); omitted fields
   * keep their saved values. Media and destination accounts cannot change.
   */
  update(id: string, params: UpdateScheduledPostParams): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'reelsfarm_prepare_update_scheduled_post', {
      id,
      ...params,
      scheduledFor: params.scheduledFor ? serializeDate(params.scheduledFor) : undefined,
    } as unknown as JsonObject);
  }

  cancel(id: string, options: MutationOptions = {}) { return this.call('reelsfarm_cancel_scheduled_post', { id, ...options }); }
}
