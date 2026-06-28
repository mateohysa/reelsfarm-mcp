import type { JsonObject, MaybePrepared } from '../types.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export type AutomationDefinition = JsonObject;

export class AutomationsDomain extends DomainBase {
  list(options: { includeRecentGenerations?: boolean } = {}) { return this.call('list_automations', options); }
  create(params: AutomationDefinition): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_create_automation', params);
  }
  update(id: string, params: AutomationDefinition): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_update_automation', { id, ...params });
  }
  delete(id: string): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_delete_automation', { id });
  }
}
