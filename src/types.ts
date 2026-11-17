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
  provider: 'reelsfarm';
  sourceTool: string;
  executionState: 'PREPARED';
  assetCreated: false;
  resultMessage: string;
  confirmationId: string;
  /** The tool that confirms only this operation, such as reelsfarm_confirm_generate_slideshow_text. */
  confirmationTool?: string;
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
  provider: 'reelsfarm';
  sourceTool: string;
  executionState: 'NOT_STARTED';
  assetCreated: false;
  resultMessage: string;
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

export type ReelsFarmExecutionState = 'NOT_STARTED' | 'PREPARED' | 'ENQUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ReelsFarmExecutionProvenance {
  provider: 'reelsfarm';
  sourceTool: string;
  executionState: ReelsFarmExecutionState;
  assetCreated: boolean;
  resultMessage: string;
}

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
export type AvatarModel =
  | 'nano-banana-pro'
  | 'nano-banana-2-pro'
  | 'nano-banana-2-1'
  /** Retired: runs on GPT Image 2.6. */
  | 'gpt-image-2'
  | 'gpt-image-2.5-sunburst'
  /** GPT Image 2.6, the dashboard default. */
  | 'gpt-image-2.6'
  | 'seedream-5-pro'
  | 'flux-3';
/**
 * Image models have no quality choice. `quality` picks a size only for Nano Banana Pro (`high` 2K, `max` 4K)
 * and FLUX 3 (`high` 1.5K, `ultra` 2K, `max` 4K); other models accept and ignore it.
 */
export type AvatarGenerationQuality = 'low' | 'medium' | 'high' | 'basic' | 'ultra' | 'max';
export type AvatarStyleMode = 'default' | 'pinterest' | 'linkedin';
export type ImageAspectRatio = '9:16' | '4:5' | '3:4' | '1:1' | '16:9';
export type HookGenerationModel = 'veo-3.1-fast' | 'veo-3.1' | 'seedance-2-fast' | 'seedance-2' | 'seedance-2.5';
/**
 * Hook reactions. They open proven app-promo hooks: shocked ("wdym you don't have to..."), grateful
 * ("i'll never forget the girl who..."), looks_up ("girl to girl:", "POV:"), fed_up (pain call-outs),
 * confident (hot takes); also nod_smile and subtle_pan. surprised_reaction is the older, milder surprise.
 */
export type HookGenerationPreset =
  | 'subtle_pan'
  | 'shocked'
  | 'grateful'
  | 'looks_up'
  | 'fed_up'
  | 'confident'
  | 'nod_smile'
  | 'surprised_reaction';
/**
 * Videos workbench models. The retired keys still run: seedance-2 as seedance-2.5 high 1080p, seedance-2-fast
 * as seedance-2.5 eco 720p, and gemini-omni-1.1-flash as gemini-omni-1.2-flash.
 */
export type VideoGenerationModel =
  | 'seedance-2.5'
  | 'veo-3.1-fast'
  | 'veo-3.1'
  | 'gemini-omni-1.2-flash'
  | 'seedance-2'
  | 'seedance-2-fast'
  | 'gemini-omni-1.1-flash';
/**
 * Seedance 2.5 quality at 720p or 1080p: eco makes the clip at 480p and upscales it, for a lower price; high
 * makes it at the chosen resolution. 480p has no quality.
 */
export type SeedanceQuality = 'eco' | 'high';
/** Seedance models make all six; Veo and Omni make 9:16 and 16:9. */
export type VideoAspectRatio = '9:16' | '16:9' | '1:1' | '3:4' | '4:3' | '21:9';
/** Camera move for a whole video clip, on every model. */
export type VideoCameraMove = 'static' | 'handheld' | 'push_in' | 'pull_back' | 'pan' | 'orbit' | 'follow' | 'drone_rise';
/** Look and light of a video clip, on every model. */
export type VideoLook = 'phone_ugc' | 'studio_product' | 'golden_hour' | 'cinematic' | 'flash_night' | 'vintage_film';
/** One continuous shot, or two or three shots joined by hard cuts (Seedance, 8 seconds or more). */
export type VideoShots = 'one' | 'cuts';
/** 480p is Seedance 2.5 only. Veo models use their own resolution. */
export type VideoResolution = '480p' | '720p' | '1080p';
/** Videos library category. People also includes avatar hooks. */
export type VideoCategory = 'people' | 'product' | 'scenes';
/** Images workbench category of a generated image. */
export type ImageCategory = 'people' | 'product' | 'infographics';

export interface WaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type { PlatformTarget } from './contracts/publishing.js';

/** Optional bounded server wait. Omit or use zero for an immediate snapshot. */
export interface JobStatusOptions {
  /** Integer from 0 through 25000 milliseconds. */
  waitMs?: number;
}

export interface JobProgress {
  step: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'unknown';
  terminal: boolean;
  nextPollAfterMs: number;
  processed?: number;
  total?: number;
  succeeded?: number;
  failed?: number;
}
