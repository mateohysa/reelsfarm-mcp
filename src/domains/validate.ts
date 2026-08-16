import type { Platform } from '../types.js';
import { DomainBase } from './base.js';

export class ValidateDomain extends DomainBase {
  caption(caption: string, platforms: Platform[]) {
    return this.call('reelsfarm_validate_caption', { caption, platforms });
  }
}
