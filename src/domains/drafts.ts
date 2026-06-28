import type { JsonObject, PageOptions } from '../types.js';
import { DomainBase } from './base.js';

export class DraftsDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('list_drafts', options as JsonObject); }
  count() { return this.call('get_draft_count'); }
  save(params: JsonObject) { return this.call('save_draft', params); }
  delete(id: string) { return this.call('delete_draft', { id }); }
}
