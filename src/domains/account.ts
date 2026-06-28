import type { JsonObject, PageOptions } from '../types.js';
import { DomainBase } from './base.js';

export class AccountDomain extends DomainBase {
  get() { return this.call('get_account'); }
  status() { return this.get(); }
  getServerInfo() { return this.call('get_mcp_server_info'); }
  getQueueStatus() { return this.call('get_queue_status'); }
  getCredits(options: PageOptions = {}) { return this.call('get_credit_usage_history', options as JsonObject); }
  getCreditUsageHistory(options: PageOptions = {}) { return this.call('get_credit_usage_history', options as JsonObject); }
  getGenerationStats(options: { days?: number } = {}) { return this.call('get_generation_stats', options as JsonObject); }
  getActivity(options: { limit?: number } = {}) { return this.call('get_account_activity', options as JsonObject); }
  getGenerationPricing() { return this.call('get_generation_pricing'); }
  listApiKeys() { return this.call('list_api_keys'); }
  revokeApiKey(id: string) { return this.call('revoke_api_key', { id }); }
  listOAuthClients() { return this.call('list_oauth_clients'); }
  revokeOAuthClient(clientId: string) { return this.call('revoke_oauth_client', { clientId }); }
}
