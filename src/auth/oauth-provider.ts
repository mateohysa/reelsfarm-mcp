import { randomUUID } from 'node:crypto';
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthClientProvider, OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js';
import type { ReelsFarmOAuthOptions, TokenStore } from '../types.js';

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
    return {
      client_name: this.options.clientName || 'ReelsFarm MCP Client',
      redirect_uris: [this.options.redirectUri],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: 'mcp:full',
    };
  }

  state(): string {
    return this.stateValue;
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    const saved = await this.store.get(this.key('clientInformation')) as OAuthClientInformationMixed | undefined;
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

  async saveClientInformation(clientInformation: OAuthClientInformationMixed): Promise<void> {
    await this.store.set(this.key('clientInformation'), clientInformation);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    return await this.store.get(this.key('tokens')) as OAuthTokens | undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await this.store.set(this.key('tokens'), tokens);
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
    for (const key of keys) await this.store.delete(this.key(key));
  }

  private key(suffix: string): string {
    return this.keyPrefix + ':' + suffix;
  }
}
