import type { JsonObject } from '../types.js';
import { DomainBase } from './base.js';

export class CommunityDomain extends DomainBase {
  listCollections(options: { limit?: number; offset?: number; source?: 'pinterest' | 'tumblr' } = {}) {
    return this.call('reelsfarm_list_community_collections', options as JsonObject);
  }

  listImages(collectionId: string, options: { limit?: number; random?: boolean } = {}) {
    return this.call('reelsfarm_list_community_images', { collectionId, ...options });
  }
}
