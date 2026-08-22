import { randomUUID } from 'node:crypto';
import {
  Client,
  StreamableHTTPClientTransport,
  UnauthorizedError,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/client';
import type { ToolName } from '../generated/index.js';
import { toolManifest, toolNames } from '../generated/index.js';
import { DEFAULT_MCP_SERVER_URL, DEFAULT_OPERATION_RECOVERY_TIMEOUT_MS, DEFAULT_PROFILE, DEFAULT_TIMEOUT_MS, SDK_NAME, SDK_VERSION } from '../constants.js';
import { ReelsFarmAuthError, ReelsFarmError, ReelsFarmToolError, ReelsFarmValidationError, normalizeError, normalizeToolError } from '../errors.js';
import type { JsonObject, McpOperationSnapshot, RawToolResult, ReelsFarmClientOptions } from '../types.js';
import { loadProfile } from '../auth/config-store.js';
import { ReelsFarmOAuthProvider } from '../auth/oauth-provider.js';
import { sleep } from '../utils/sleep.js';

export interface ResolvedClientOptions extends ReelsFarmClientOptions {
  serverUrl: string;
  profile: string;
}

const toolsByName = new Map(toolManifest.map((tool) => [tool.name as string, tool]));

function isMutationTool(name: string): boolean {
  const tool = toolsByName.get(name);
  return Boolean(tool && !tool.readOnly);
}

function isKnownReadOnlyTool(name: string): boolean {
  return toolsByName.get(name)?.readOnly === true;
}

export function isRetrySafeToolCall(name: string, args: JsonObject): boolean {
  return isKnownReadOnlyTool(name)
    || (isMutationTool(name) && (name === 'reelsfarm_confirm_action' || typeof args.idempotencyKey === 'string'));
}

function isAmbiguousTransportError(error: unknown): boolean {
  if (error instanceof ReelsFarmError || error instanceof UnauthorizedError) return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  const record = error && typeof error === 'object' ? error as { code?: unknown; name?: unknown } : undefined;
  const code = typeof record?.code === 'string' ? record.code.toUpperCase() : '';
  if (['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT'].includes(code)) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return error instanceof TypeError
    || message.includes('timed out')
    || message.includes('timeout')
    || message.includes('network')
    || message.includes('socket')
    || message.includes('connection closed')
    || message.includes('fetch failed');
}

function readOperation(result: RawToolResult<object>): McpOperationSnapshot | undefined {
  const operation = (result.structuredContent as { operation?: unknown } | undefined)?.operation;
  if (!operation || typeof operation !== 'object') return undefined;
  const record = operation as Partial<McpOperationSnapshot>;
  return typeof record.operationId === 'string' && typeof record.status === 'string'
    ? operation as McpOperationSnapshot
    : undefined;
}

export class ReelsFarmConnection {
  private client?: Client;
  private clientPromise?: Promise<Client>;
  private transport?: StreamableHTTPClientTransport;
  private oauthProvider?: ReelsFarmOAuthProvider;
  private toolSurfaceValidated = false;

  constructor(readonly options: ResolvedClientOptions) {}

  async listTools(): Promise<JsonObject[]> {
    const client = await this.getClient();
    const result = await client.listTools();
    return result.tools as unknown as JsonObject[];
  }

  async callTool<T extends object = JsonObject>(name: ToolName | string, args: JsonObject = {}): Promise<RawToolResult<T>> {
    const requestArgs = this.prepareArguments(name, args);
    try {
      const result = await this.callToolOnce<T>(name, requestArgs);
      return await this.maybeAutoConfirm(name, result);
    } catch (error) {
      const retrySafe = isRetrySafeToolCall(name, requestArgs);
      if (retrySafe && isAmbiguousTransportError(error)) {
        try {
          await this.reset();
          const replayed = await this.callToolOnce<T>(name, requestArgs);
          const recovered = await this.resolveRecoveredOperation(replayed);
          return await this.maybeAutoConfirm(name, recovered);
        } catch (recoveryError) {
          throw normalizeError(recoveryError, name);
        }
      }
      throw normalizeError(error, name);
    }
  }

  async validateToolSurface(mode: 'warn' | 'throw' | 'off' = 'warn'): Promise<void> {
    if (mode === 'off') return;
    const client = await this.getClient();
    await this.validateConnectedToolSurface(client, mode);
  }

  async ready(): Promise<void> {
    await this.getClient();
  }

  private async validateConnectedToolSurface(client: Client, mode: 'warn' | 'throw' | 'off'): Promise<void> {
    if (mode === 'off' || this.toolSurfaceValidated) return;
    const result = await client.listTools();
    const tools = result.tools as unknown as JsonObject[];
    const serverNames = new Set(tools.map((tool) => String(tool.name)));
    const knownNames = new Set<string>(toolNames);
    const extra = [...serverNames].filter((name) => !knownNames.has(name));
    const missingRequired = [
      'reelsfarm_get_account',
      'reelsfarm_get_mcp_server_info',
      'reelsfarm_get_operation',
      'reelsfarm_preflight_publishing',
    ].filter((name) => !serverNames.has(name));
    if (missingRequired.length === 0 && extra.length === 0) {
      this.toolSurfaceValidated = true;
      return;
    }
    const message = 'ReelsFarm MCP tool surface drift detected. Missing required tools: ' + missingRequired.join(', ') + '. Extra: ' + extra.join(', ') + '. Policy-filtered tools may be absent by design.';
    if (mode === 'throw') throw new ReelsFarmToolError(message);
    console.warn(message);
    this.toolSurfaceValidated = true;
  }

  async completeOAuthCallback(callbackUrl: string | URL): Promise<void> {
    if (!this.transport) {
      await this.createTransport();
    }
    if (!this.transport || !this.oauthProvider || !this.options.oauth) {
      throw new ReelsFarmAuthError('OAuth transport is not initialized');
    }
    let callback: URL;
    try {
      callback = callbackUrl instanceof URL ? callbackUrl : new URL(callbackUrl);
    } catch (error) {
      throw new ReelsFarmAuthError('OAuth callback must be a valid absolute URL.', { cause: error });
    }
    const expected = new URL(this.options.oauth.redirectUri);
    if (callback.origin !== expected.origin || callback.pathname !== expected.pathname) {
      throw new ReelsFarmAuthError('OAuth callback URL does not match the configured redirect URI.');
    }
    this.oauthProvider.assertState(callback.searchParams.get('state'));
    await this.transport.finishAuth(callback.searchParams);
    this.oauthProvider.rotateState();
    await this.reset();
    await this.getClient();
  }

  async close(): Promise<void> {
    const pending = this.clientPromise;
    if (pending) await pending.catch(() => undefined);
    await this.reset();
  }

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;
    if (this.clientPromise) return await this.clientPromise;
    this.clientPromise = this.connectClient();
    try {
      return await this.clientPromise;
    } finally {
      this.clientPromise = undefined;
    }
  }

  private async connectClient(): Promise<Client> {
    const client = new Client(
      { name: SDK_NAME, version: SDK_VERSION },
      {
        capabilities: {},
        versionNegotiation: { mode: 'auto' },
      },
    );
    const transport = await this.createTransport();
    try {
      await client.connect(transport, { timeout: this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw new ReelsFarmAuthError('OAuth authorization is required. Open the authorization URL, then call completeOAuthCallback(callbackUrl).', { cause: error });
      }
      await Promise.allSettled([client.close(), transport.close()]);
      if (this.transport === transport) this.transport = undefined;
      throw error;
    }
    this.client = client;
    try {
      await this.validateConnectedToolSurface(client, this.options.validateToolSurface || 'off');
    } catch (error) {
      await this.reset();
      throw error;
    }
    return client;
  }

  private prepareArguments(name: string, args: JsonObject): JsonObject {
    if (!isMutationTool(name)) return args;
    if (name === 'reelsfarm_confirm_action') {
      return this.options.dryRun ? { ...args, dryRun: true } : args;
    }
    const suppliedKey = typeof args.idempotencyKey === 'string' ? args.idempotencyKey.trim() : '';
    const idempotencyKey = suppliedKey || this.options.idempotencyKeyFactory?.() || randomUUID();
    return {
      ...args,
      idempotencyKey,
      ...(this.options.dryRun ? { dryRun: true } : {}),
    };
  }

  private async callToolOnce<T extends object>(name: ToolName | string, args: JsonObject): Promise<RawToolResult<T>> {
    const client = await this.getClient();
    const result = await client.callTool(
      { name, arguments: args },
      { timeout: this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS },
    );
    const raw = result as RawToolResult<T>;
    if (raw.isError) {
      const message = raw.content.find((item) => typeof item.text === 'string')?.text || 'ReelsFarm MCP tool failed';
      throw normalizeToolError(message, String(name), raw._meta);
    }
    return raw;
  }

  private async maybeAutoConfirm<T extends object>(name: ToolName | string, result: RawToolResult<T>): Promise<RawToolResult<T>> {
    if (!this.options.autoConfirm || this.options.dryRun || name === 'reelsfarm_confirm_action') return result;
    const confirmationId = (result.structuredContent as { confirmationId?: unknown } | undefined)?.confirmationId;
    if (typeof confirmationId !== 'string') return result;
    return await this.callTool<T>('reelsfarm_confirm_action', { confirmationId });
  }

  private async resolveRecoveredOperation<T extends object>(initial: RawToolResult<T>): Promise<RawToolResult<T>> {
    let result: RawToolResult<object> = initial;
    let operation = readOperation(result);
    if (!operation) return initial;

    const startedAt = Date.now();
    const timeoutMs = this.options.operationRecoveryTimeoutMs ?? DEFAULT_OPERATION_RECOVERY_TIMEOUT_MS;
    let delay = 250;
    while (operation.status === 'PENDING' || operation.status === 'RUNNING') {
      if (Date.now() - startedAt >= timeoutMs) return result as RawToolResult<T>;
      await sleep(delay);
      delay = Math.min(delay * 2, 2_000);
      result = await this.callToolOnce('reelsfarm_get_operation', { operationId: operation.operationId });
      operation = readOperation(result);
      if (!operation) return result as RawToolResult<T>;
    }

    if (operation.status === 'SUCCEEDED' && operation.result && typeof operation.result === 'object') {
      return {
        content: [{ type: 'text', text: JSON.stringify(operation.result) }],
        structuredContent: operation.result as T,
      };
    }
    if (operation.status === 'FAILED_RETRYABLE' || operation.status === 'FAILED_FINAL') {
      throw normalizeToolError(
        operation.error?.message || `Operation ${operation.operationId} failed with status ${operation.status}`,
        operation.toolName,
        {
          'mcp/error_code': [operation.error?.code || 'ACTION_FAILED'],
          'mcp/operation_id': [operation.operationId],
        },
      );
    }
    return result as RawToolResult<T>;
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
      this.oauthProvider ??= new ReelsFarmOAuthProvider(this.options.oauth, this.options.serverUrl, this.options.profile);
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
    this.toolSurfaceValidated = false;
    await Promise.allSettled([
      client?.close(),
      transport?.close(),
    ]);
  }
}

export function resolveOptions(options: ReelsFarmClientOptions = {}): ResolvedClientOptions {
  const profile = options.profile || DEFAULT_PROFILE;
  const stored = loadProfile(profile);
  const allowInsecureHttp = options.allowInsecureHttp
    ?? ['1', 'true', 'yes', 'on'].includes((process.env.REELSFARM_ALLOW_INSECURE_HTTP || '').toLowerCase());
  return {
    ...options,
    allowInsecureHttp,
    profile,
    serverUrl: normalizeServerUrl(
      options.serverUrl || process.env.REELSFARM_MCP_URL || stored.serverUrl || DEFAULT_MCP_SERVER_URL,
      allowInsecureHttp,
    ),
    apiKey: options.apiKey || process.env.REELSFARM_API_KEY || stored.apiKey,
    accessToken: options.accessToken || process.env.REELSFARM_ACCESS_TOKEN || stored.accessToken,
  };
}

export function normalizeServerUrl(value: string, allowInsecureHttp = false): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new ReelsFarmValidationError('serverUrl must be a valid absolute HTTP or HTTPS URL.', {
      cause: error,
      code: 'INVALID_SERVER_URL',
    });
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new ReelsFarmValidationError('serverUrl must use HTTP or HTTPS and cannot contain credentials or a URL fragment.', {
      code: 'INVALID_SERVER_URL',
    });
  }
  const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
  if (url.protocol === 'http:' && !loopback && !allowInsecureHttp) {
    throw new ReelsFarmValidationError('Refusing to send ReelsFarm credentials over non-loopback HTTP. Use HTTPS or set allowInsecureHttp explicitly.', {
      code: 'INSECURE_SERVER_URL',
    });
  }
  return url.toString();
}

export function resolveBearerToken(options: ReelsFarmClientOptions): string | undefined {
  return options.apiKey || options.accessToken;
}
