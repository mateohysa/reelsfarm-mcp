import type { JsonObject, PageOptions } from '../types.js';
import { DomainBase } from './base.js';

export class DraftsDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('reelsfarm_list_drafts', options as JsonObject); }
  count() { return this.call('reelsfarm_get_draft_count'); }
  save(params: JsonObject) { return this.call('reelsfarm_save_draft', params); }
}
