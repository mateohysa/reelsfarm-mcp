import type { MutationOptions } from '../types.js';
import { DomainBase } from './base.js';

export interface ProductContextDetails {
  name: string;
  description: string;
  /**
   * An optional product photo, such as an app screenshot: a public HTTPS URL or an owned ReelsFarm URL.
   * Recreate puts it on the slides where the original shows its own product.
   */
  imageUrl?: string;
}

export class ProductContextsDomain extends DomainBase {
  list() { return this.call('reelsfarm_list_product_contexts'); }
  suggestFromUrl(url: string) { return this.call('reelsfarm_suggest_product_context_from_url', { url }); }
  create(params: ProductContextDetails & MutationOptions) { return this.call('reelsfarm_create_product_context', { ...params }); }
  /** Change the name, brief or photo. imageUrl null removes the photo. */
  update(productContextId: string, params: Partial<Omit<ProductContextDetails, 'imageUrl'>> & { imageUrl?: string | null } & MutationOptions) {
    return this.call('reelsfarm_update_product_context', { productContextId, ...params });
  }
}
