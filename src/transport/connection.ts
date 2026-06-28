import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, type StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { ToolName } from '../generated/index.js';
import { toolNames } from '../generated/index.js';
import { DEFAULT_MCP_SERVER_URL, DEFAULT_PROFILE, DEFAULT_TIMEOUT_MS, SDK_NAME, SDK_VERSION } from '../constants.js';
import { ReelsFarmAuthError, ReelsFarmToolError, normalizeError } from '../errors.js';
import type { JsonObject, RawToolResult, ReelsFarmClientOptions } from '../types.js';
import { loadProfile } from '../auth/config-store.js';
import { ReelsFarmOAuthProvider } from '../auth/oauth-provider.js';

export interface ResolvedClientOptions extends ReelsFarmClientOptions {
  serverUrl: string;
  profile: string;
}

export class ReelsFarmConnection {
  private client?: Client;
  private transport?: StreamableHTTPClientTransport;
  private oauthProvider?: ReelsFarmOAuthProvider;

  constructor(readonly options: ResolvedClientOptions) {}

  async listTools(): Promise<JsonObject[]> {
    const client = await this.getClient();
    const result = await client.listTools();
    return result.tools as unknown as JsonObject[];
  }

  async callTool<T extends JsonObject = JsonObject>(name: ToolName | string, args: JsonObject = {}): Promise<RawToolResult<T>> {
    try {
      const client = await this.getClient();
      const result = await client.callTool({ name, arguments: args });
      const raw = result as RawToolResult<T>;
      if (raw.isError) {
        const message = raw.content.find((item) => typeof item.text === 'string')?.text || 'ReelsFarm MCP tool failed';
        throw new ReelsFarmToolError(message, name);
      }
      return raw;
    } catch (error) {
      throw normalizeError(error, name);
    }
  }

  async validateToolSurface(mode: 'warn' | 'throw' | 'off' = 'warn'): Promise<void> {
    if (mode === 'off') return;
    const tools = await this.listTools();
    const serverNames = new Set(tools.map((tool) => String(tool.name)));
    const knownNames = new Set<string>(toolNames);
    const missing = toolNames.filter((name) => !serverNames.has(name));
    const extra = [...serverNames].filter((name) => !knownNames.has(name));
    if (missing.length === 0 && extra.length === 0) return;
    const message = 'ReelsFarm MCP tool surface drift detected. Missing: ' + missing.join(', ') + '. Extra: ' + extra.join(', ') + '.';
    if (mode === 'throw') throw new ReelsFarmToolError(message);
    console.warn(message);
  }

  async completeOAuth(authorizationCode: string): Promise<void> {
    if (!this.transport) {
      await this.createTransport();
    }
    if (!this.transport) throw new ReelsFarmAuthError('OAuth transport is not initialized');
    await this.transport.finishAuth(authorizationCode);
    await this.reset();
    await this.getClient();
  }

  async close(): Promise<void> {
    await this.reset();
  }

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;
    const client = new Client({ name: SDK_NAME, version: SDK_VERSION }, { capabilities: {} });
    const transport = await this.createTransport();
    try {
      await client.connect(transport, { timeout: this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        this.client = client;
        throw new ReelsFarmAuthError('OAuth authorization is required. Open the authorization URL, then call completeOAuth(code).', { cause: error });
      }
      throw error;
    }
    this.client = client;
    return client;
  }

  private async createTransport(): Promise<StreamableHTTPClientTransport> {
    const headers = new Headers();
    headers.set('user-agent', this.options.userAgent || SDK_NAME + '/' + SDK_VERSION);
    const token = resolveBearerToken(this.options);
    if (token) headers.set('authorization', 'Bearer ' + token);

    const requestInit: RequestInit = { headers };
    const transportOptions: StreamableHTTPClientTransportOptions = {
      requestInit,
      fetch: this.options.fetch,
    };

    if (!token && this.options.oauth) {
      this.oauthProvider = new ReelsFarmOAuthProvider(this.options.oauth, this.options.serverUrl, this.options.profile);
      transportOptions.authProvider = this.oauthProvider;
    }

    this.transport = new StreamableHTTPClientTransport(new URL(this.options.serverUrl), transportOptions);
    return this.transport;
  }

  private async reset(): Promise<void> {
    const client = this.client;
    const transport = this.transport;
    this.client = undefined;
    this.transport = undefined;
    await Promise.allSettled([
      client?.close(),
      transport?.close(),
    ]);
  }
}

export function resolveOptions(options: ReelsFarmClientOptions = {}): ResolvedClientOptions {
  const profile = options.profile || DEFAULT_PROFILE;
  const stored = loadProfile(profile);
  return {
    ...options,
    profile,
    serverUrl: options.serverUrl || process.env.REELSFARM_MCP_URL || stored.serverUrl || DEFAULT_MCP_SERVER_URL,
    apiKey: options.apiKey || process.env.REELSFARM_API_KEY || stored.apiKey,
    accessToken: options.accessToken || process.env.REELSFARM_ACCESS_TOKEN || stored.accessToken,
  };
}

export function resolveBearerToken(options: ReelsFarmClientOptions): string | undefined {
  return options.apiKey || options.accessToken;
}
