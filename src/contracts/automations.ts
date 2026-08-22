import type { SlideshowType } from '../types.js';

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

export interface AutomationContent {
  topic: string;
  customTopic?: string | null;
  slidesCount: number;
  slideshowType?: SlideshowType | null;
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

export interface AutomationImages {
  collectionIds?: string[];
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
  tiktokPostMode?: 'PUBLIC' | 'PRIVATE' | 'DRAFT';
  tiktokAutoAddMusic?: boolean;
  tiktokIsAigc?: boolean;
  tiktokAllowDuet?: boolean;
  tiktokAllowStitch?: boolean;
}

export interface AutomationPublishRules {
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
