import { DomainBase } from './base.js';

export class TrashDomain extends DomainBase {
  list() { return this.call('list_trash'); }
  restore(id: string, type: 'avatar' | 'video' | 'slideshow') { return this.call('restore_trash_item', { id, type }); }
}
