import type { JsonObject, MutationOptions } from '../types.js';
import { DomainBase } from './base.js';

export class PromptsDomain extends DomainBase {
  list(kind?: 'avatar' | 'slideshow', options: { category?: string; limit?: number; offset?: number } = {}) {
    return this.call('reelsfarm_list_prompt_templates', { kind, ...options } as JsonObject);
  }
  /** Save a prompt to the user's library, like Save image prompt or Save slideshow prompt in the app. */
  save(kind: 'image' | 'slideshow', prompt: string, options: MutationOptions = {}) {
    return this.call('reelsfarm_save_prompt', { kind, prompt, ...options });
  }
}
