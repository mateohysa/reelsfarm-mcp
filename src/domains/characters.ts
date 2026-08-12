import type { JsonObject, MaybePrepared, MutationOptions, PageOptions } from '../types.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export class CharactersDomain extends DomainBase {
  list(options: PageOptions = {}) { return this.call('list_characters', options as JsonObject); }

  save(params: { name: string; referenceUrl: string } & MutationOptions): Promise<MaybePrepared<JsonObject>> {
    return prepareAndConfirm<JsonObject>(this.context, 'prepare_save_character', params as unknown as JsonObject);
  }

  update(id: string, params: { name?: string; identity?: JsonObject }) { return this.call('update_character', { id, ...params } as JsonObject); }
}
