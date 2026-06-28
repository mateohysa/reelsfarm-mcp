import type { JsonObject, PageOptions } from '../types.js';
import { DomainBase } from './base.js';

export class CharactersDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('list_characters', options as JsonObject); }
  update(id: string, params: { name?: string; identity?: JsonObject }) { return this.call('update_character', { id, ...params } as JsonObject); }
  delete(id: string) { return this.call('delete_character', { id }); }
}
