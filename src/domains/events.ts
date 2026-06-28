import { DomainBase } from './base.js';

export class EventsDomain extends DomainBase {
  recent(options: { limit?: number; type?: string } = {}) { return this.call('get_recent_events', options); }
}
