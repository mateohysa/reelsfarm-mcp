import { DomainBase } from './base.js';

export class SocialDomain extends DomainBase {
  list() { return this.call('reelsfarm_list_social_accounts'); }
  listConnected() { return this.call('reelsfarm_list_connected_accounts'); }
}
