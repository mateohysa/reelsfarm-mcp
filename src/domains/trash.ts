import { DomainBase } from './base.js';

export type TrashItemType = 'avatar' | 'product-placement' | 'video' | 'slideshow'
  | 'stored-asset' | 'character' | 'draft' | 'product-context';

export class TrashDomain extends DomainBase {
  list(options: { limit?: number; cursor?: string } = {}) { return this.call('reelsfarm_list_trash', options); }
  restore(id: string, type: TrashItemType) { return this.call('reelsfarm_restore_trash_item', { id, type }); }
  restoreAll() { return this.call('reelsfarm_restore_all_trash_items'); }
}
