import { DomainBase } from './base.js';

export class TrashDomain extends DomainBase {
  list(options: { limit?: number; cursor?: string } = {}) { return this.call('list_trash', options); }
  restore(id: string, type: 'avatar' | 'product-placement' | 'video' | 'slideshow') { return this.call('restore_trash_item', { id, type }); }
  restoreAll() { return this.call('restore_all_trash_items'); }
}
