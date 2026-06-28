import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getConfigPath, loadProfile, saveProfile } from '../../src/auth/config-store.js';

const original = process.env.REELSFARM_CONFIG_DIR;

afterEach(() => {
  if (original === undefined) delete process.env.REELSFARM_CONFIG_DIR;
  else process.env.REELSFARM_CONFIG_DIR = original;
});

describe('config store', () => {
  it('saves config with 0600 permissions', () => {
    process.env.REELSFARM_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'reelsfarm-config-'));
    saveProfile('default', { apiKey: 'rfmcp_test' });
    expect(loadProfile('default').apiKey).toBe('rfmcp_test');
    expect((statSync(getConfigPath()).mode & 0o777).toString(8)).toBe('600');
  });
});
