import { DomainBase } from './base.js';

export class ProductContextsDomain extends DomainBase {
  list() { return this.call('list_product_contexts'); }
  suggestFromUrl(url: string) { return this.call('suggest_product_context_from_url', { url }); }
  create(params: { name: string; description: string }) { return this.call('create_product_context', params); }
}
