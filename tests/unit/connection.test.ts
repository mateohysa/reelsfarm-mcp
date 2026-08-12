import { describe, expect, it } from 'vitest';
import { ReelsFarmValidationError } from '../../src/errors.js';
import { isRetrySafeToolCall, normalizeServerUrl, ReelsFarmConnection } from '../../src/transport/connection.js';
import { normalizeOAuthScopes, ReelsFarmOAuthProvider } from '../../src/auth/oauth-provider.js';
import type { TokenStore } from '../../src/types.js';

describe('connection safety', () => {
  it('accepts HTTPS and loopback HTTP endpoints', () => {
    expect(normalizeServerUrl('https://mcp.reelsfarm.com/mcp')).toBe('https://mcp.reelsfarm.com/mcp');
    expect(normalizeServerUrl('http://127.0.0.1:3002/mcp')).toBe('http://127.0.0.1:3002/mcp');
    expect(normalizeServerUrl('http://[::1]:3002/mcp')).toBe('http://[::1]:3002/mcp');
  });

  it('requires explicit opt-in for remote plaintext HTTP', () => {
    expect(() => normalizeServerUrl('http://10.0.0.5:3002/mcp')).toThrow(ReelsFarmValidationError);
    expect(normalizeServerUrl('http://10.0.0.5:3002/mcp', true)).toBe('http://10.0.0.5:3002/mcp');
  });

  it('rejects non-HTTP endpoints and embedded credentials', () => {
    expect(() => normalizeServerUrl('file:///tmp/mcp')).toThrow(ReelsFarmValidationError);
    expect(() => normalizeServerUrl('https://user:secret@example.com/mcp')).toThrow(ReelsFarmValidationError);
  });

  it('retries known reads and idempotent mutations, but not unknown raw tools', () => {
    expect(isRetrySafeToolCall('get_account', {})).toBe(true);
    expect(isRetrySafeToolCall('prepare_generate_avatar', { idempotencyKey: 'logical-1' })).toBe(true);
    expect(isRetrySafeToolCall('prepare_generate_avatar', {})).toBe(false);
    expect(isRetrySafeToolCall('unknown_raw_tool', {})).toBe(false);
  });

  it('requests narrow OAuth scopes and rejects unknown scopes', () => {
    expect(normalizeOAuthScopes(['content:read', 'content:generate', 'content:read'])).toEqual([
      'content:read',
      'content:generate',
    ]);
    expect(() => normalizeOAuthScopes(['unknown:scope'] as never)).toThrow(ReelsFarmValidationError);
  });

  it('validates the exact OAuth callback state', () => {
    const provider = new ReelsFarmOAuthProvider({
      redirectUri: 'http://127.0.0.1:3456/callback',
      scopes: ['content:read'],
      onAuthorizationUrl: () => undefined,
    }, 'https://mcp.reelsfarm.com/mcp');
    const state = provider.state();
    expect(() => provider.assertState(state)).not.toThrow();
    expect(() => provider.assertState('wrong-state')).toThrow('OAuth callback state validation failed');
    expect(provider.clientMetadata.scope).toBe('content:read');
  });

  it('rotates OAuth state only after a completed callback', () => {
    const provider = new ReelsFarmOAuthProvider({
      redirectUri: 'http://127.0.0.1:3456/callback',
      onAuthorizationUrl: () => undefined,
    }, 'https://mcp.reelsfarm.com/mcp');
    const first = provider.state();
    provider.rotateState();
    expect(provider.state()).not.toBe(first);
  });

  it('isolates OAuth credentials by validated authorization-server issuer', async () => {
    const data = new Map<string, unknown>();
    const store: TokenStore = {
      get: (key) => data.get(key),
      set: (key, value) => { data.set(key, value); },
      delete: (key) => { data.delete(key); },
    };
    const provider = new ReelsFarmOAuthProvider({
      redirectUri: 'http://127.0.0.1:3456/callback',
      onAuthorizationUrl: () => undefined,
      tokenStore: store,
    }, 'https://mcp.reelsfarm.com/mcp');
    const tokens = { access_token: 'issuer-a-token', token_type: 'Bearer' };
    await provider.saveTokens(tokens, { issuer: 'https://auth-a.example' });

    expect(await provider.tokens()).toEqual(tokens);
    expect(await provider.tokens({ issuer: 'https://auth-a.example' })).toEqual(tokens);
    expect(await provider.tokens({ issuer: 'https://auth-b.example' })).toBeUndefined();
    await provider.invalidateCredentials('all');
    expect(await provider.tokens()).toBeUndefined();
    expect(await provider.tokens({ issuer: 'https://auth-a.example' })).toBeUndefined();
  });

  it('keeps the OAuth provider and its in-memory tokens across reconnects', async () => {
    const connection = new ReelsFarmConnection({
      serverUrl: 'https://mcp.reelsfarm.com/mcp',
      profile: 'test',
      oauth: {
        redirectUri: 'http://127.0.0.1:3456/callback',
        onAuthorizationUrl: () => undefined,
      },
    });
    const provider = new ReelsFarmOAuthProvider(connection.options.oauth!, connection.options.serverUrl);
    const internals = connection as unknown as {
      oauthProvider?: ReelsFarmOAuthProvider;
      reset: () => Promise<void>;
    };
    internals.oauthProvider = provider;
    await provider.saveTokens({ access_token: 'memory-token', token_type: 'Bearer' });

    await internals.reset();

    expect(internals.oauthProvider).toBe(provider);
    expect(await internals.oauthProvider?.tokens()).toMatchObject({ access_token: 'memory-token' });
  });
});
