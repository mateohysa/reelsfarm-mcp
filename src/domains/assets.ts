import type { AssetCategory, JsonObject, PageOptions } from '../types.js';
import { ReelsFarmJob } from '../jobs/job.js';
import { DomainBase } from './base.js';

export interface BulkImportItem { url: string; name?: string }

export class AssetsDomain extends DomainBase {
  list(category: AssetCategory, options: PageOptions = {}) {
    return this.call('list_assets', { category, ...options });
  }

  search(query: string, options: { category?: AssetCategory; limit?: number } = {}) {
    return this.call('search_assets', { query, ...options });
  }

  import(params: { category: AssetCategory; url: string; name?: string }) {
    return this.call('import_media_from_url', params as JsonObject);
  }

  importBulk(params: { category: AssetCategory; items: BulkImportItem[] }) {
    return this.call('bulk_import_media', params as unknown as JsonObject);
  }

  async startBulkImport(params: { category: AssetCategory; items: BulkImportItem[] }) {
    const result = await this.call('start_bulk_import_media', params as unknown as JsonObject);
    const jobId = typeof result.jobId === 'string' ? result.jobId : undefined;
    return jobId ? new ReelsFarmJob(jobId, 'MEDIA_IMPORT', (id) => this.getBulkImportStatus(id)) : result;
  }

  async getBulkImportStatus(jobId: string) {
    const result = await this.call('get_bulk_import_media_job_status', { jobId });
    return (result.status && typeof result.status === 'object' ? result.status : result) as JsonObject;
  }

  getInfo(category: AssetCategory, filename: string) {
    return this.call('get_asset_info', { category, filename });
  }

  rename(params: { category: AssetCategory; filename: string; name: string }) {
    return this.call('rename_asset', params as JsonObject);
  }

  move(params: { fromCategory: AssetCategory; toCategory: AssetCategory; filename: string }) {
    return this.call('move_asset', params as JsonObject);
  }

  delete(category: AssetCategory, filename: string) {
    return this.call('delete_asset', { category, filename });
  }
}
