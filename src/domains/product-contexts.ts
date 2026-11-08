import type { MutationOptions } from '../types.js';
import { DomainBase } from './base.js';

/** A product: a name, an optional description and up to 6 photos. */
export interface ProductContextDetails {
  name: string;
  description?: string;
  /**
   * Up to 6 owned ReelsFarm image URLs (PNG, JPEG or WebP), in order. The first is the main photo; Recreate
   * puts it on the slides where the original shows its own product.
   */
  photoUrls?: string[];
  /** The older one-photo field. Prefer photoUrls. */
  imageUrl?: string;
}

export class ProductContextsDomain extends DomainBase {
  /**
   * Each product with photos (in order; imageUrl is the first) and describing (true while the AI still writes
   * the name and description of a product made from an uploaded photo file).
   */
  list() { return this.call('reelsfarm_list_product_contexts'); }
  /** Name and description from a product page, plus photos: photo links found on it. */
  suggestFromUrl(url: string) { return this.call('reelsfarm_suggest_product_context_from_url', { url }); }
  create(params: ProductContextDetails & MutationOptions) { return this.call('reelsfarm_create_product_context', { ...params }); }
  /**
   * Change the name, description or photos. photoUrls replaces all photos in order; an empty list or
   * imageUrl null removes them. A photo no product uses any more goes to Trash.
   */
  update(productContextId: string, params: Partial<Omit<ProductContextDetails, 'imageUrl'>> & { imageUrl?: string | null } & MutationOptions) {
    return this.call('reelsfarm_update_product_context', { productContextId, ...params });
  }
}
