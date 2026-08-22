import type {
  AutomationImages,
  PlatformTarget,
  SlideshowSettings,
} from '../../src/index.js';

const connectionId = '22222222-2222-4222-8222-222222222222';

export const canonicalTarget: PlatformTarget = {
  platform: 'TIKTOK',
  connectionId,
  tiktokPublishMode: 'DIRECT',
  tiktokPrivacyLevel: 'PUBLIC_TO_EVERYONE',
};

// @ts-expect-error MCP 3.0 removed socialConnectionId from publishing targets.
export const removedSocialAlias: PlatformTarget = { platform: 'TIKTOK', connectionId, socialConnectionId: connectionId };

// @ts-expect-error MCP 3.0 removed externalSocialAccountId from publishing targets.
export const removedExternalAlias: PlatformTarget = { platform: 'FACEBOOK', connectionId, externalSocialAccountId: connectionId };

// @ts-expect-error MCP 3.0 replaced publishing tiktokPostMode with publish mode and privacy level.
export const removedTikTokAlias: PlatformTarget = { platform: 'TIKTOK', connectionId, tiktokPostMode: 'PUBLIC' };

// @ts-expect-error YouTube settings are not valid for a Facebook destination.
export const crossPlatformField: PlatformTarget = { platform: 'FACEBOOK', connectionId, youtubeTitle: 'Wrong platform' };

// @ts-expect-error Slideshow settings reject fields outside the canonical nested contract.
export const looseSlideshowSettings: SlideshowSettings = { duration: 2000, arbitrarySetting: true };

// @ts-expect-error Automation image objects reject fields outside the canonical nested contract.
export const looseAutomationImages: AutomationImages = { overlayScope: 'all', arbitrarySetting: true };
