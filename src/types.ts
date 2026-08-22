export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | unknown };

export type ToolSurfaceValidationMode = 'warn' | 'throw' | 'off';

export interface TokenStore {
  get(key: string): Promise<unknown | undefined> | unknown | undefined;
  set(key: string, value: unknown): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}

export interface ReelsFarmOAuthOptions {
  clientId?: string;
  clientName?: string;
  redirectUri: string;
  /** Request only the capabilities this client needs. Defaults to mcp:full for compatibility. */
  scopes?: ReelsFarmOAuthScope[];
  onAuthorizationUrl: (url: string) => void | Promise<void>;
  tokenStore?: TokenStore;
}

export type ReelsFarmOAuthScope =
  | 'mcp:full'
  | 'account:read'
  | 'assets:read'
  | 'assets:write'
  | 'assets:delete_reversible'
  | 'content:read'
  | 'content:write'
  | 'content:generate'
  | 'content:delete_reversible'
  | 'posts:read'
  | 'posts:schedule'
  | 'posts:publish'
  | 'posts:cancel'
  | 'automations:read'
  | 'automations:manage'
  | 'events:read'
  | 'webhooks:manage'
  | 'credentials:manage'
  | 'content:delete_permanent';

export interface ReelsFarmClientOptions {
  apiKey?: string;
  accessToken?: string;
  oauth?: ReelsFarmOAuthOptions;
  serverUrl?: string;
  /** Allow bearer credentials over non-loopback HTTP. Keep false for production. */
  allowInsecureHttp?: boolean;
  fetch?: typeof fetch;
  dryRun?: boolean;
  /** Confirm Review-mode prepared actions automatically. Defaults to false. */
  autoConfirm?: boolean;
  /** Override UUID generation for one logical mutation, primarily for CLIs and tests. */
  idempotencyKeyFactory?: () => string;
  timeoutMs?: number;
  operationRecoveryTimeoutMs?: number;
  validateToolSurface?: ToolSurfaceValidationMode;
  userAgent?: string;
  profile?: string;
}

export interface PreparedAction {
  confirmationId: string;
  operationId?: string;
  expiresAt: string;
  summary: string;
  creditEstimate: number | null;
  nextStep?: string;
}

export interface MutationOptions {
  /** Reuse this value when retrying the same logical mutation. */
  idempotencyKey?: string;
}

export interface DryRunResult {
  dryRun: true;
  executed: false;
  toolName?: string;
  actionType?: string;
  summary?: string;
  creditEstimate?: number | null;
  connectionMode?: 'REVIEW' | 'CREATOR' | 'AUTOPILOT';
  policyDecision?: string;
  policyCode?: string;
  confirmationId?: string;
  nextStep?: string;
}

export type McpOperationStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL';

export interface McpOperationSnapshot extends JsonObject {
  operationId: string;
  toolName: string;
  actionType: string;
  status: McpOperationStatus;
  result: JsonObject | null;
  error: { code: string; message: string | null } | null;
  sourceType: string | null;
  sourceId: string | null;
  jobId: string | null;
  creditReserved: number;
  creditDeducted: number;
  creditRefunded: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface McpOperationEnvelope extends JsonObject {
  operation: McpOperationSnapshot;
}

export type MaybePrepared<T> = T | PreparedAction | DryRunResult | McpOperationEnvelope;

export interface RawToolResult<T extends object = JsonObject> {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: T;
  isError?: boolean;
  _meta?: JsonObject;
}

export interface PageOptions {
  limit?: number;
  cursor?: string;
}

export type AssetCategory = 'characters' | 'products' | 'hooks' | 'demos' | 'sounds';
export type Platform = 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'FACEBOOK';
export type PlatformSlug = 'tiktok' | 'instagram' | 'youtube' | 'facebook';
export type SlideshowType = 'EDUCATIONAL' | 'PROMOTIONAL' | 'STORYTELLING' | 'LIFESTYLE' | 'REVIEW';
export type AvatarModel = 'nano-banana-pro' | 'nano-banana-2-pro' | 'gpt-image-2' | 'seedream-5-pro';
export type AvatarStyleMode = 'default' | 'pinterest' | 'linkedin';
export type ImageAspectRatio = '9:16' | '4:5' | '3:4' | '1:1' | '16:9';
export type HookGenerationModel = 'veo-3.1-fast' | 'veo-3.1' | 'seedance-2-fast' | 'seedance-2' | 'seedance-2.5';
export type HookGenerationPreset = 'subtle_pan' | 'surprised_reaction' | 'nod_smile';

export interface WaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type { PlatformTarget } from './contracts/publishing.js';
