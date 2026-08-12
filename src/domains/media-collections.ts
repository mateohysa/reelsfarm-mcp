import type { JsonObject, MaybePrepared, MutationOptions, PageOptions } from '../types.js';
import { DomainBase } from './base.js';

export type MediaCollectionAssetKind = 'AVATAR' | 'PRODUCT_PLACEMENT' | 'UGC_VIDEO' | 'SLIDESHOW';
export type GalleryFeedKind = 'COLLECTION' | MediaCollectionAssetKind;

export interface MediaAssetReference extends JsonObject {
  assetKind: MediaCollectionAssetKind;
  assetId: string;
}

export interface MediaCollectionSummary extends JsonObject {
  kind: 'COLLECTION';
  id: string;
  name: string;
  itemCount: number;
  coverThumbnails: string[];
  createdAt: string;
}

export interface MediaCollectionMembershipState extends JsonObject {
  itemCount: number;
  collections: Array<{
    id: string;
    name: string;
    selectedCount: number;
    state: 'unchecked' | 'checked' | 'mixed';
  }>;
}

export class MediaCollectionsDomain extends DomainBase {
  list(mode: 'all' | 'slideshow-picker' = 'all') {
    return this.call<{ collections: MediaCollectionSummary[] }>('list_media_collections', { mode });
  }

  listGallery(options: PageOptions & {
    mode?: 'all' | 'slideshow-picker';
    kinds?: GalleryFeedKind[];
  } = {}) {
    return this.call('list_gallery_feed', options as JsonObject);
  }

  getItems(collectionId: string, mode: 'all' | 'slideshow-picker' = 'all') {
    return this.call('get_media_collection_items', { collectionId, mode });
  }

  getMembershipState(items: MediaAssetReference[]) {
    return this.call<MediaCollectionMembershipState>('get_media_collection_membership_state', { items } as unknown as JsonObject);
  }

  getDeleteImpact(collectionId: string) {
    return this.call('get_media_collection_delete_impact', { collectionId });
  }

  create(params: { name: string; initialItems?: MediaAssetReference[] } & MutationOptions): Promise<MaybePrepared<JsonObject>> {
    return this.call('create_media_collection', params as unknown as JsonObject);
  }

  rename(collectionId: string, name: string, options: MutationOptions = {}): Promise<MaybePrepared<JsonObject>> {
    return this.call('rename_media_collection', { collectionId, name, ...options });
  }

  updateMemberships(params: {
    items: MediaAssetReference[];
    addCollectionIds?: string[];
    removeCollectionIds?: string[];
  } & MutationOptions): Promise<MaybePrepared<JsonObject>> {
    return this.call('update_media_collection_memberships', params as unknown as JsonObject);
  }

  delete(collectionId: string, options: MutationOptions = {}): Promise<MaybePrepared<JsonObject>> {
    return this.call('delete_media_collection', { collectionId, ...options });
  }
}
