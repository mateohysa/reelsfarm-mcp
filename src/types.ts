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
  onAuthorizationUrl: (url: string) => void | Promise<void>;
  tokenStore?: TokenStore;
}

export interface ReelsFarmClientOptions {
  apiKey?: string;
  accessToken?: string;
  oauth?: ReelsFarmOAuthOptions;
  serverUrl?: string;
  fetch?: typeof fetch;
  dryRun?: boolean;
  timeoutMs?: number;
  validateToolSurface?: ToolSurfaceValidationMode;
  userAgent?: string;
  profile?: string;
}

export interface PreparedAction {
  confirmationId: string;
  expiresAt: string;
  summary: string;
  creditEstimate: number | null;
  nextStep?: string;
}

export type MaybePrepared<T> = T | PreparedAction;

export interface RawToolResult<T extends JsonObject = JsonObject> {
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
export type AvatarModel = 'nano-banana-pro' | 'nano-banana-2-pro' | 'gpt-image-2';
export type AvatarStyleMode = 'default' | 'pinterest' | 'linkedin';

export interface PlatformTarget {
  platform: Platform;
  connectionId?: string;
  socialConnectionId?: string;
  externalSocialAccountId?: string;
  tiktokPostMode?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  tiktokAutoAddMusic?: boolean;
  tiktokIsAigc?: boolean;
  tiktokAllowDuet?: boolean;
  tiktokAllowStitch?: boolean;
  youtubePrivacyStatus?: 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
  instagramVisibility?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  instagramTestReel?: boolean;
  facebookVisibility?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
}

export interface WaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}
