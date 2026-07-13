import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, type StreamableHTTPClientTransportOptions } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { ToolName } from '../generated/index.js';
import { toolManifest, toolNames } from '../generated/index.js';
import { DEFAULT_MCP_SERVER_URL, DEFAULT_OPERATION_RECOVERY_TIMEOUT_MS, DEFAULT_PROFILE, DEFAULT_TIMEOUT_MS, SDK_NAME, SDK_VERSION } from '../constants.js';
import { ReelsFarmAuthError, ReelsFarmError, ReelsFarmToolError, normalizeError, normalizeToolError } from '../errors.js';
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

function readOperation(result: RawToolResult): McpOperationSnapshot | undefined {
  const operation = result.structuredContent?.operation;
  if (!operation || typeof operation !== 'object') return undefined;
  const record = operation as Partial<McpOperationSnapshot>;
  return typeof record.operationId === 'string' && typeof record.status === 'string'
    ? operation as McpOperationSnapshot
    : undefined;
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
    const requestArgs = this.prepareArguments(name, args);
    try {
      const result = await this.callToolOnce<T>(name, requestArgs);
      return await this.maybeAutoConfirm(name, result);
    } catch (error) {
      const retrySafe = isMutationTool(name)
        && (name === 'confirm_action' || typeof requestArgs.idempotencyKey === 'string');
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
    const tools = await this.listTools();
    const serverNames = new Set(tools.map((tool) => String(tool.name)));
    const knownNames = new Set<string>(toolNames);
    const extra = [...serverNames].filter((name) => !knownNames.has(name));
    const missingRequired = ['get_account', 'get_operation'].filter((name) => !serverNames.has(name));
    if (missingRequired.length === 0 && extra.length === 0) return;
    const message = 'ReelsFarm MCP tool surface drift detected. Missing required tools: ' + missingRequired.join(', ') + '. Extra: ' + extra.join(', ') + '. Policy-filtered tools may be absent by design.';
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

  private prepareArguments(name: string, args: JsonObject): JsonObject {
    if (!isMutationTool(name)) return args;
    if (name === 'confirm_action') {
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

  private async callToolOnce<T extends JsonObject>(name: ToolName | string, args: JsonObject): Promise<RawToolResult<T>> {
    const client = await this.getClient();
    const result = await client.callTool(
      { name, arguments: args },
      undefined,
      { timeout: this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS },
    );
    const raw = result as RawToolResult<T>;
    if (raw.isError) {
      const message = raw.content.find((item) => typeof item.text === 'string')?.text || 'ReelsFarm MCP tool failed';
      throw normalizeToolError(message, String(name), raw._meta);
    }
    return raw;
  }

  private async maybeAutoConfirm<T extends JsonObject>(name: ToolName | string, result: RawToolResult<T>): Promise<RawToolResult<T>> {
    if (!this.options.autoConfirm || this.options.dryRun || name === 'confirm_action') return result;
    const confirmationId = result.structuredContent?.confirmationId;
    if (typeof confirmationId !== 'string') return result;
    return await this.callTool<T>('confirm_action', { confirmationId });
  }

  private async resolveRecoveredOperation<T extends JsonObject>(initial: RawToolResult<T>): Promise<RawToolResult<T>> {
    let result: RawToolResult = initial;
    let operation = readOperation(result);
    if (!operation) return initial;

    const startedAt = Date.now();
    const timeoutMs = this.options.operationRecoveryTimeoutMs ?? DEFAULT_OPERATION_RECOVERY_TIMEOUT_MS;
    let delay = 250;
    while (operation.status === 'PENDING' || operation.status === 'RUNNING') {
      if (Date.now() - startedAt >= timeoutMs) return result as RawToolResult<T>;
      await sleep(delay);
      delay = Math.min(delay * 2, 2_000);
      result = await this.callToolOnce('get_operation', { operationId: operation.operationId });
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
