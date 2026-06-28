import type { JsonObject } from '../types.js';
import { DomainBase } from './base.js';

export class PromptsDomain extends DomainBase {
  list(kind?: 'avatar' | 'slideshow', options: { category?: string; limit?: number; offset?: number } = {}) {
    return this.call('list_prompt_templates', { kind, ...options } as JsonObject);
  }
}
