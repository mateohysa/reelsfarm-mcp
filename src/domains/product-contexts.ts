import { DomainBase } from './base.js';

export class ProductContextsDomain extends DomainBase {
  list() { return this.call('reelsfarm_list_product_contexts'); }
  suggestFromUrl(url: string) { return this.call('reelsfarm_suggest_product_context_from_url', { url }); }
  create(params: { name: string; description: string }) { return this.call('reelsfarm_create_product_context', params); }
}
