import type { JsonObject, MaybePrepared, PlatformTarget } from '../types.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export interface PublishParams {
  contentType: string;
  contentId: string;
  timezone?: string;
  caption?: string;
  platforms: PlatformTarget[];
  publishFormat?: string;
}

export interface SchedulePostParams extends PublishParams {
  scheduledFor: string | Date;
}

function serializeDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export class PostsDomain extends DomainBase {
  list(options: { limit?: number; cursor?: string; status?: string; startDate?: string; endDate?: string; platform?: string; accountId?: string } = {}) {
    return this.call('list_scheduled_posts', options);
  }
  getStatus(id: string) { return this.call('get_publish_status', { id }); }
  getOptimalTimes(options: { platform?: string; limit?: number } = {}) { return this.call('get_optimal_posting_times', options); }

  schedule(params: SchedulePostParams): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_schedule_post', { ...params, scheduledFor: serializeDate(params.scheduledFor) } as unknown as JsonObject);
  }

  publishNow(params: PublishParams): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_publish_now', params as unknown as JsonObject);
  }

  batchPublish(params: PublishParams): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_batch_publish', params as unknown as JsonObject);
  }

  update(id: string, params: { scheduledFor?: string | Date; timezone?: string; caption?: string }): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_update_scheduled_post', {
      id,
      ...params,
      scheduledFor: params.scheduledFor ? serializeDate(params.scheduledFor) : undefined,
    } as unknown as JsonObject);
  }

  delete(id: string): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_delete_scheduled_post', { id });
  }

  cancel(id: string) { return this.call('cancel_scheduled_post', { id }); }
}
