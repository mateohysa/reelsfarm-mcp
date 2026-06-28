import type { Platform } from '../types.js';
import { DomainBase } from './base.js';

export class ValidateDomain extends DomainBase {
  caption(caption: string, platforms: Platform[]) {
    return this.call('validate_caption', { caption, platforms });
  }
}
