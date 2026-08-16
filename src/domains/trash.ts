import { DomainBase } from './base.js';

export class TrashDomain extends DomainBase {
  list(options: { limit?: number; cursor?: string } = {}) { return this.call('reelsfarm_list_trash', options); }
  restore(id: string, type: 'avatar' | 'product-placement' | 'video' | 'slideshow') { return this.call('reelsfarm_restore_trash_item', { id, type }); }
  restoreAll() { return this.call('reelsfarm_restore_all_trash_items'); }
}
