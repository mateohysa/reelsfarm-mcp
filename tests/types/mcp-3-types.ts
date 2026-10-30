import type {
  AutomationContent,
  AutomationImages,
  SlideshowSlideInput,
  AutomationTikTokSettings,
  AvatarGenerationParams,
  ImageTemplateCategory,
  PlatformTarget,
  SlideshowEffort,
  SlideshowSettings,
  VideoGenerationParams,
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

export const workbenchVideo: VideoGenerationParams = {
  prompt: 'Slow push-in on a latte',
  model: 'veo-3.1-fast',
  durationSeconds: 8,
  firstFrameUrl: '/api/assets/user-generated?key=user/frame.png',
};

// @ts-expect-error Image models are not Videos workbench models.
export const imageModelForVideo: VideoGenerationParams = { prompt: 'Latte', model: 'gpt-image-2' };

// @ts-expect-error Slideshow effort uses the dashboard presets.
export const unknownEffort: SlideshowEffort = 'max';

// @ts-expect-error People templates come from the avatar template list.
export const peopleTemplateCategory: ImageTemplateCategory = 'people';

export const automationTikTok: AutomationTikTokSettings = {
  tiktokPublishMode: 'DIRECT',
  tiktokPrivacyLevel: 'SELF_ONLY',
  tiktokTitle: 'Daily tip',
};

// MCP 3.9: an iMessage slide draws no photo, so it needs no imageUrl.
export const messageSlide: SlideshowSlideInput = {
  order: 0,
  design: { design: 'imessage', contact: 'mom', messages: [{ from: 'them', text: 'how much was that coffee', reaction: 'question' }] },
};

// @ts-expect-error A tapback is one of the six Messages reactions, never another emoji.
export const emojiTapback: SlideshowSlideInput = { order: 0, design: { design: 'imessage', contact: 'mom', messages: [{ from: 'me', text: 'hi', reaction: 'fire' }] } };

export const styledText: SlideshowSlideInput = {
  order: 0,
  imageUrl: '/api/assets/user-generated?key=user/photo.jpg',
  textItems: [{ id: 't1', text: 'Hi', fontSize: '24px', textSize: { width: 200, height: 40 }, textStyle: 'outline', textPosition: 'middle', textFont: 'typewriter', textEffect: 'background', textColor: '#ffffff', textX: 0.5, textY: 0.3 }],
};

export const automationContent: AutomationContent = {
  topic: 'other',
  slidesCount: 4,
  slidesCountMax: 7,
  design: 'classic',
  provenFormat: 'help-me-choose',
  textLooks: [{ textFont: 'classic', textEffect: 'outline', textColor: '#000000' }],
};

export const automationPhotos: AutomationImages = {
  photoSources: { pinterest: true, tumblr: false, pexels: false, collections: true },
  generatedPhotos: { count: 1, fromSlide: 2, toSlide: 3, model: 'seedream-5-pro' },
};

export const fluxPhotos: AutomationImages = { generatedPhotos: { count: 2, fromSlide: 1, toSlide: 2, model: 'flux-3' } };

export const fluxAvatar: AvatarGenerationParams = { prompt: 'Creator selfie style', model: 'flux-3', quality: 'max', aspectRatio: '9:16' };

// @ts-expect-error FLUX 3 sizes are basic, high, ultra and max.
export const unknownQuality: AvatarGenerationParams = { prompt: 'Creator selfie style', model: 'flux-3', quality: '8k' };

// @ts-expect-error The Look is one of the six choices.
export const unknownLook: AutomationContent = { topic: 'other', slidesCount: 4, design: 'polaroid' };

export const reactionVideo: VideoGenerationParams = { prompt: 'She says "wdym"', firstFrameUrl: '/api/assets/user-generated?key=user/frame.png', motionPreset: 'shocked', naturalSpeech: false };
