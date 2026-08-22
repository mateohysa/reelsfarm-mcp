import { z } from 'zod';

export type PublishContentType = 'AVATAR' | 'UGC_VIDEO' | 'SLIDESHOW';
export type PublishFormat = 'VIDEO' | 'PHOTO' | 'CAROUSEL';
export type PublishingPlatform = 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE' | 'FACEBOOK';
export type TikTokPublishMode = 'DIRECT' | 'DRAFT';
export type TikTokPrivacyLevel =
  | 'SELF_ONLY'
  | 'PUBLIC_TO_EVERYONE'
  | 'FOLLOWER_OF_CREATOR'
  | 'MUTUAL_FOLLOW_FRIENDS';

interface PlatformTargetBase {
  /** UUID returned by reelsfarm_list_connected_accounts. */
  connectionId: string;
  /** Caption used only for this destination account. */
  captionOverride?: string;
}

export interface TikTokPlatformTarget extends PlatformTargetBase {
  platform: 'TIKTOK';
  tiktokPublishMode?: TikTokPublishMode;
  tiktokPrivacyLevel?: TikTokPrivacyLevel;
  tiktokTitle?: string;
  tiktokAutoAddMusic?: boolean;
  tiktokIsAigc?: boolean;
  tiktokAllowComment?: boolean;
  tiktokAllowDuet?: boolean;
  tiktokAllowStitch?: boolean;
  tiktokCommercialContentEnabled?: boolean;
  tiktokBrandOrganic?: boolean;
  tiktokBrandedContent?: boolean;
  tiktokPhotoCoverIndex?: number;
  tiktokVideoCoverTimestampMs?: number;
}

export interface YouTubePlatformTarget extends PlatformTargetBase {
  platform: 'YOUTUBE';
  youtubeTitle?: string;
  youtubePrivacyStatus?: 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
  youtubeMadeForKids?: boolean;
  youtubeContainsSyntheticMedia?: boolean;
  youtubeHasPaidProductPlacement?: boolean;
  youtubeNotifySubscribers?: boolean;
}

export interface InstagramPlatformTarget extends PlatformTargetBase {
  platform: 'INSTAGRAM';
  instagramVisibility?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  instagramTestReel?: boolean;
}

export interface FacebookPlatformTarget extends PlatformTargetBase {
  platform: 'FACEBOOK';
  facebookVisibility?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
}

/** Canonical MCP 3.0 destination. Legacy connection and TikTok mode aliases are not accepted. */
export type PlatformTarget =
  | TikTokPlatformTarget
  | YouTubePlatformTarget
  | InstagramPlatformTarget
  | FacebookPlatformTarget;

const platformTargetBaseShape = {
  connectionId: z.string().uuid(),
  captionOverride: z.string().max(4000).optional(),
} as const;

/** Runtime validator for canonical MCP 3.0 platform targets. */
export const canonicalPlatformTargetSchema = z.discriminatedUnion('platform', [
  z.object({
    ...platformTargetBaseShape,
    platform: z.literal('TIKTOK'),
    tiktokPublishMode: z.enum(['DIRECT', 'DRAFT']).optional(),
    tiktokPrivacyLevel: z.enum(['SELF_ONLY', 'PUBLIC_TO_EVERYONE', 'FOLLOWER_OF_CREATOR', 'MUTUAL_FOLLOW_FRIENDS']).optional(),
    tiktokTitle: z.string().max(2200).optional(),
    tiktokAutoAddMusic: z.boolean().optional(),
    tiktokIsAigc: z.boolean().optional(),
    tiktokAllowComment: z.boolean().optional(),
    tiktokAllowDuet: z.boolean().optional(),
    tiktokAllowStitch: z.boolean().optional(),
    tiktokCommercialContentEnabled: z.boolean().optional(),
    tiktokBrandOrganic: z.boolean().optional(),
    tiktokBrandedContent: z.boolean().optional(),
    tiktokPhotoCoverIndex: z.number().int().min(0).max(19).optional(),
    tiktokVideoCoverTimestampMs: z.number().int().min(0).optional(),
  }).strict(),
  z.object({
    ...platformTargetBaseShape,
    platform: z.literal('YOUTUBE'),
    youtubeTitle: z.string().trim().min(1).max(100).optional(),
    youtubePrivacyStatus: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']).optional(),
    youtubeMadeForKids: z.boolean().optional(),
    youtubeContainsSyntheticMedia: z.boolean().optional(),
    youtubeHasPaidProductPlacement: z.boolean().optional(),
    youtubeNotifySubscribers: z.boolean().optional(),
  }).strict(),
  z.object({
    ...platformTargetBaseShape,
    platform: z.literal('INSTAGRAM'),
    instagramVisibility: z.enum(['PUBLIC', 'PRIVATE', 'DRAFT']).optional(),
    instagramTestReel: z.boolean().optional(),
  }).strict(),
  z.object({
    ...platformTargetBaseShape,
    platform: z.literal('FACEBOOK'),
    facebookVisibility: z.enum(['PUBLIC', 'PRIVATE', 'DRAFT']).optional(),
  }).strict(),
]);

export const canonicalPlatformTargetsSchema = z.array(canonicalPlatformTargetSchema).min(1).max(20);

export interface PublishingPreflightParams {
  contentType: PublishContentType;
  contentId: string;
  publishFormat: PublishFormat;
  connectionIds: string[];
}

export interface PublishingPreflightMedia {
  type: 'PHOTO' | 'VIDEO' | 'CAROUSEL';
  itemCount: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
}

export interface TikTokPublishingCapabilities {
  nickname?: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec?: number;
}

export interface PublishingPreflightTarget {
  connectionId: string;
  platform: PublishingPlatform | null;
  accountLabel: string;
  source: 'oauth' | 'integration';
  ready: boolean;
  requiresReconnect: boolean;
  issues: string[];
  supportedSettings: string[];
  tiktok?: TikTokPublishingCapabilities;
}

export interface PublishingPreflightResult {
  media: PublishingPreflightMedia;
  targets: PublishingPreflightTarget[];
}
