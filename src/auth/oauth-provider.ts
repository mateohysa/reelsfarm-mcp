import { randomUUID } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';
import type {
  OAuthClientInformationContext,
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthDiscoveryState,
  OAuthTokens,
} from '@modelcontextprotocol/client';
import { ReelsFarmAuthError, ReelsFarmValidationError } from '../errors.js';
import type { ReelsFarmOAuthOptions, TokenStore } from '../types.js';

const SUPPORTED_OAUTH_SCOPES = new Set([
  'mcp:full',
  'account:read',
  'assets:read',
  'assets:write',
  'assets:delete_reversible',
  'content:read',
  'content:write',
  'content:generate',
  'content:delete_reversible',
  'posts:read',
  'posts:schedule',
  'posts:publish',
  'posts:cancel',
  'automations:read',
  'automations:manage',
  'events:read',
  'webhooks:manage',
  'credentials:manage',
  'content:delete_permanent',
]);

class MemoryTokenStore implements TokenStore {
  private readonly data = new Map<string, unknown>();

  get(key: string): unknown | undefined {
    return this.data.get(key);
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  delete(key: string): void {
    this.data.delete(key);
  }
}

export class ReelsFarmOAuthProvider implements OAuthClientProvider {
  private readonly store: TokenStore;
  private readonly keyPrefix: string;
  private stateValue = randomUUID();

  constructor(private readonly options: ReelsFarmOAuthOptions, serverUrl: string, profile = 'default') {
    this.store = options.tokenStore || new MemoryTokenStore();
    this.keyPrefix = 'oauth:' + profile + ':' + serverUrl;
  }

  get redirectUrl(): string {
    return this.options.redirectUri;
  }

  get clientMetadata(): OAuthClientMetadata {
    const scope = normalizeOAuthScopes(this.options.scopes).join(' ');
    return {
      client_name: this.options.clientName || 'ReelsFarm MCP Client',
      redirect_uris: [this.options.redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope,
    };
  }

  state(): string {
    return this.stateValue;
  }

  assertState(received: string | null): void {
    const expectedBytes = Buffer.from(this.stateValue);
    const receivedBytes = Buffer.from(received || '');
    if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) {
      throw new ReelsFarmAuthError('OAuth callback state validation failed. Start the authorization flow again.');
    }
  }

  rotateState(): void {
    this.stateValue = randomUUID();
  }

  async clientInformation(context?: OAuthClientInformationContext): Promise<OAuthClientInformationMixed | undefined> {
    const saved = await this.store.get(this.credentialKey('clientInformation', context)) as OAuthClientInformationMixed | undefined;
    if (saved) return saved;
    if (this.options.clientId) {
      return {
        client_id: this.options.clientId,
        redirect_uris: [this.options.redirectUri],
        token_endpoint_auth_method: 'none',
      };
    }
    return undefined;
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed, context?: OAuthClientInformationContext): Promise<void> {
    await this.saveCredential('clientInformation', clientInformation, context);
  }

  async tokens(context?: OAuthClientInformationContext): Promise<OAuthTokens | undefined> {
    return await this.store.get(this.credentialKey('tokens', context)) as OAuthTokens | undefined;
  }

  async saveTokens(tokens: OAuthTokens, context?: OAuthClientInformationContext): Promise<void> {
    await this.saveCredential('tokens', tokens, context);
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    await this.options.onAuthorizationUrl(authorizationUrl.toString());
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.store.set(this.key('codeVerifier'), codeVerifier);
  }

  async codeVerifier(): Promise<string> {
    const verifier = await this.store.get(this.key('codeVerifier'));
    if (typeof verifier !== 'string') throw new Error('Missing OAuth code verifier');
    return verifier;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await this.store.set(this.key('discoveryState'), state);
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return await this.store.get(this.key('discoveryState')) as OAuthDiscoveryState | undefined;
  }

  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'): Promise<void> {
    const keys = scope === 'all'
      ? ['clientInformation', 'tokens', 'codeVerifier', 'discoveryState']
      : [scope === 'client' ? 'clientInformation' : scope === 'verifier' ? 'codeVerifier' : scope === 'discovery' ? 'discoveryState' : 'tokens'];
    const storedIssuers = await this.store.get(this.key('authorizationServerIssuers'));
    const issuers = Array.isArray(storedIssuers)
      ? storedIssuers.filter((issuer): issuer is string => typeof issuer === 'string')
      : [];
    for (const key of keys) {
      await this.store.delete(this.key(key));
      if (key === 'clientInformation' || key === 'tokens') {
        for (const issuer of issuers) await this.store.delete(this.issuerKey(key, issuer));
      }
    }
    if (scope === 'all') await this.store.delete(this.key('authorizationServerIssuers'));
  }

  private credentialKey(suffix: 'clientInformation' | 'tokens', context?: OAuthClientInformationContext): string {
    return context ? this.issuerKey(suffix, context.issuer) : this.key(suffix);
  }

  private async saveCredential(
    suffix: 'clientInformation' | 'tokens',
    value: OAuthClientInformationMixed | OAuthTokens,
    context?: OAuthClientInformationContext,
  ): Promise<void> {
    await this.store.set(this.key(suffix), value);
    if (!context) return;
    await this.store.set(this.issuerKey(suffix, context.issuer), value);
    const storedIssuers = await this.store.get(this.key('authorizationServerIssuers'));
    const issuers = Array.isArray(storedIssuers)
      ? storedIssuers.filter((issuer): issuer is string => typeof issuer === 'string')
      : [];
    if (!issuers.includes(context.issuer)) {
      await this.store.set(this.key('authorizationServerIssuers'), [...issuers, context.issuer]);
    }
  }

  private issuerKey(suffix: string, issuer: string): string {
    return this.key(`issuer:${encodeURIComponent(issuer)}:${suffix}`);
  }

  private key(suffix: string): string {
    return this.keyPrefix + ':' + suffix;
  }
}

export function normalizeOAuthScopes(scopes: ReelsFarmOAuthOptions['scopes']): string[] {
  const requested = scopes?.length ? scopes : ['mcp:full'];
  const normalized = [...new Set(requested.map((scope) => scope.trim()).filter(Boolean))];
  if (normalized.length === 0) {
    throw new ReelsFarmValidationError('OAuth scopes cannot be empty.');
  }
  const unsupported = normalized.find((scope) => !SUPPORTED_OAUTH_SCOPES.has(scope));
  if (unsupported) {
    throw new ReelsFarmValidationError(`Unsupported ReelsFarm OAuth scope: ${unsupported}`);
  }
  return normalized;
}
