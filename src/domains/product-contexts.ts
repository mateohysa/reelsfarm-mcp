import { DomainBase } from './base.js';

export class ProductContextsDomain extends DomainBase {
  list() { return this.call('list_product_contexts'); }
  create(params: { name: string; description: string }) { return this.call('create_product_context', params); }
  delete(id: string) { return this.call('delete_product_context', { id }); }
}
