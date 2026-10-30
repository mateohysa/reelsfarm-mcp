import type { SlideshowType } from '../types.js';
import type { TikTokPrivacyLevel, TikTokPublishMode } from './publishing.js';
import type { SlideDesignChoice, SlideshowProvenFormatId, SlideshowTextEffect, SlideshowTextFont } from './slideshows.js';

export type AutomationDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface AutomationScheduleSlot {
  days: AutomationDay[];
  /** Local time in 24-hour HH:MM format. */
  timeLocal: string;
}

export interface AutomationSchedule {
  slots: AutomationScheduleSlot[];
}

export interface AutomationProductContext {
  id: string;
  name: string;
  description?: string | null;
}

/** A TikTok text look an automation uses: each post takes one of them for all its text. */
export interface AutomationTextLook {
  textFont: SlideshowTextFont;
  textEffect: SlideshowTextEffect;
  /** Lowercase hex colour, such as #ffffff. */
  textColor: string;
}

export interface AutomationContent {
  topic: string;
  customTopic?: string | null;
  /** Slides per post, or the fewest when slidesCountMax sets a range. */
  slidesCount: number;
  /** Each post gets a random slide count from slidesCount to this. Null keeps one count. */
  slidesCountMax?: number | null;
  /** Up to six looks; each post uses one. Empty or null lets the AI pick a look per post. */
  textLooks?: AutomationTextLook[] | null;
  /** A public TikTok photo slideshow whose format every post copies, with new words and photos. */
  recreateUrl?: string | null;
  slideshowType?: SlideshowType | null;
  /** A proven format every post follows. It sets the slide count. */
  provenFormat?: SlideshowProvenFormatId | null;
  /** The Look of every post. iMessage posts have no photos, so they need no photo source. */
  design?: SlideDesignChoice | null;
  formatInstructions?: string | null;
  narrativeContent?: string | null;
  productContext?: AutomationProductContext | null;
}

export interface AutomationImageAssetReference {
  source: 'community' | 'gallery' | 'templates' | 'url' | 'unknown';
  id?: string | null;
  path: string;
  name: string;
  thumbnailUrl?: string | null;
}

export interface AutomationPinnedSlideImage {
  slideNumber: number;
  image: AutomationImageAssetReference;
}

/** Where each post's photos come from. Null on automations made before photo search. */
export interface AutomationPhotoSources {
  pinterest: boolean;
  tumblr: boolean;
  pexels: boolean;
  /** The image collections in collectionIds. */
  collections: boolean;
}

/** New pictures made with AI for every post, saved to the Library and charged as image generations. */
export interface AutomationGeneratedPhotos {
  /** Pictures per post, 1 to 5. */
  count: number;
  fromSlide: number;
  toSlide: number;
  model?: 'nano-banana-pro' | 'nano-banana-2-1' | 'gpt-image-2' | 'gpt-image-2.5-sunburst' | 'seedream-5-pro' | 'flux-3' | null;
}

export interface AutomationImages {
  collectionIds?: string[];
  photoSources?: AutomationPhotoSources | null;
  generatedPhotos?: AutomationGeneratedPhotos | null;
  imageAspectRatio?: '9:16' | '4:5' | '3:4' | '1:1' | null;
  overlayScope?: 'off' | 'hook' | 'all' | null;
  useFixedHookImage?: boolean;
  fixedHookImage?: AutomationImageAssetReference | null;
  pinnedSlideImages?: AutomationPinnedSlideImage[];
  forceCtaSlide?: boolean;
  ctaType?: 'FOLLOW' | 'SAVE' | 'COMMENT' | 'LEARN_MORE' | 'BUY_NOW' | 'CUSTOM' | null;
  ctaCustomText?: string | null;
  ctaImages?: AutomationImageAssetReference[];
}

export interface AutomationTikTokSettings {
  tiktokPublishMode?: TikTokPublishMode;
  /** Omit it for TikTok draft uploads. */
  tiktokPrivacyLevel?: TikTokPrivacyLevel;
  /** TikTok photo title. An ACTIVE automation requires 1 to 90 characters. */
  tiktokTitle?: string;
  /** Legacy TikTok-only caption that takes priority over caption. Prefer caption. */
  captionOverride?: string;
  /** Legacy alias. tiktokPublishMode and tiktokPrivacyLevel in the same request take priority. */
  tiktokPostMode?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
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

export interface AutomationPublishRules {
  /** To rotate captions across runs, put each one in square brackets: [First caption][Second caption]. */
  caption?: string | null;
  tiktokSettings?: AutomationTikTokSettings | null;
}

export interface AutomationDefinition {
  name?: string;
  mode?: 'SIMPLE' | 'ADVANCED';
  status?: 'ACTIVE' | 'PAUSED';
  targetConnectionId?: string;
  timezone?: string;
  schedule?: AutomationSchedule;
  content?: AutomationContent;
  images?: AutomationImages | null;
  publishRules?: AutomationPublishRules | null;
}

export interface CreateAutomationParams extends AutomationDefinition {
  targetConnectionId: string;
  schedule: AutomationSchedule;
  content: AutomationContent;
}

export interface AutomationGeneration {
  id: string;
  slideshowId: string | null;
  scheduledPostId: string | null;
  status: 'PLANNED' | 'QUEUED' | 'RENDERING' | 'PUBLISH_SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
  priority: 'INTERACTIVE' | 'AUTOMATION_HOT' | 'AUTOMATION_COLD';
  errorMessage: string | null;
  scheduledFor: string | null;
  renderAfter: string | null;
  deadlineAt: string | null;
  resolvedPrompt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  generatedAt: string;
}

export interface AutomationRecord {
  id: string;
  name: string;
  mode: 'SIMPLE' | 'ADVANCED';
  status: 'ACTIVE' | 'PAUSED';
  targetConnectionId: string | null;
  timezone: string;
  schedule: AutomationSchedule;
  content: AutomationContent;
  images: AutomationImages | null;
  publishRules: AutomationPublishRules | null;
  lastGeneratedAt: string | null;
  nextScheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  recentGenerations: AutomationGeneration[];
}

export interface AutomationListResult {
  automations: AutomationRecord[];
}

export interface AutomationResult {
  automation: AutomationRecord;
}
