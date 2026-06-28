import { DomainBase } from './base.js';

export class MusicDomain extends DomainBase {
  list(options: { limit?: number; page?: number; query?: string; genre?: string; mood?: string; bpmMin?: number; bpmMax?: number } = {}) {
    return this.call('list_music_tracks', options);
  }
}
