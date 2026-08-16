import type { JsonObject, PageOptions } from '../types.js';
import { DomainBase } from './base.js';

export class AccountDomain extends DomainBase {
  get() { return this.call('reelsfarm_get_account'); }
  status() { return this.get(); }
  getServerInfo() { return this.call('reelsfarm_get_mcp_server_info'); }
  getQueueStatus() { return this.call('reelsfarm_get_queue_status'); }
  getCredits(options: PageOptions = {}) { return this.call('reelsfarm_get_credit_usage_history', options as JsonObject); }
  getCreditUsageHistory(options: PageOptions = {}) { return this.call('reelsfarm_get_credit_usage_history', options as JsonObject); }
  getGenerationStats(options: { days?: number } = {}) { return this.call('reelsfarm_get_generation_stats', options as JsonObject); }
  getActivity(options: { limit?: number } = {}) { return this.call('reelsfarm_get_account_activity', options as JsonObject); }
  getGenerationPricing() { return this.call('reelsfarm_get_generation_pricing'); }
}
