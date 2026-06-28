import type { JsonObject } from '../types.js';
import { DomainBase } from './base.js';

export class WebhooksDomain extends DomainBase {
  list() { return this.call('list_webhooks'); }
  create(params: { url: string; events?: string[]; description?: string }) { return this.call('create_webhook', params as JsonObject); }
  delete(id: string) { return this.call('delete_webhook', { id }); }
}
