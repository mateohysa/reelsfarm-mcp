import type { AssetCategory, JsonObject, MaybePrepared, MutationOptions, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { DomainBase } from './base.js';

export interface BulkImportItem { url: string; name?: string }

export interface ProductUploadFile {
  clientId: string;
  filename: string;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  size: number;
  displayName?: string;
}

export class AssetsDomain extends DomainBase {
  list(category: AssetCategory, options: PageOptions = {}) {
    return this.call('reelsfarm_list_assets', { category, ...options });
  }

  search(query: string, options: { category?: AssetCategory; limit?: number } = {}) {
    return this.call('reelsfarm_search_assets', { query, ...options });
  }

  import(params: { category: AssetCategory; url: string; name?: string } & MutationOptions) {
    return this.call('reelsfarm_import_media_from_url', params as unknown as JsonObject);
  }

  importBulk(params: { category: AssetCategory; items: BulkImportItem[] } & MutationOptions) {
    return this.call('reelsfarm_bulk_import_media', params as unknown as JsonObject);
  }

  createProductUploadSessions(
    files: ProductUploadFile[],
    options: MutationOptions = {},
  ): Promise<MaybePrepared<JsonObject>> {
    return this.call('reelsfarm_create_product_upload_sessions', { files, ...options } as unknown as JsonObject);
  }

  completeProductUploadSessions(sessionIds: string[]) {
    return this.call('reelsfarm_complete_product_upload_sessions', { sessionIds });
  }

  async startBulkImport(params: { category: AssetCategory; items: BulkImportItem[] } & MutationOptions) {
    const result = await this.call('reelsfarm_start_bulk_import_media', params as unknown as JsonObject);
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'MEDIA_IMPORT', (id) => this.getBulkImportStatus(id)) : result;
  }

  async getBulkImportStatus(jobId: string) {
    const result = await this.call('reelsfarm_get_bulk_import_media_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  getInfo(category: AssetCategory, filename: string) {
    return this.call('reelsfarm_get_asset_info', { category, filename });
  }

  rename(params: { category: AssetCategory; filename: string; name: string }) {
    return this.call('reelsfarm_rename_asset', params as JsonObject);
  }

  move(params: { fromCategory: AssetCategory; toCategory: AssetCategory; filename: string }) {
    return this.call('reelsfarm_move_asset', params as JsonObject);
  }

}
