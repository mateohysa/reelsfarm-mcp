import { DomainBase } from './base.js';

export class SocialDomain extends DomainBase {
  list() { return this.call('list_social_accounts'); }
  listConnected() { return this.call('list_connected_accounts'); }
}
