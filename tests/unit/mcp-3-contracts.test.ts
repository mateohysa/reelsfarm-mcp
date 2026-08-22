import { describe, expect, it } from 'vitest';
import { AutomationsDomain } from '../../src/domains/automations.js';
import { PostsDomain } from '../../src/domains/posts.js';
import { SlideshowsDomain } from '../../src/domains/slideshows.js';
import { canonicalPlatformTargetsSchema } from '../../src/contracts/publishing.js';
import type { DomainContext } from '../../src/domains/context.js';
import type { JsonObject } from '../../src/types.js';

function createContext(result: JsonObject = {}) {
  const calls: Array<{ name: string; args: JsonObject }> = [];
  const context: DomainContext = {
    dryRun: false,
    autoConfirm: false,
    callTool: async (name, args = {}) => {
      calls.push({ name, args });
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
    },
  };
  return { context, calls };
}

describe('MCP 3.0 client contracts', () => {
  it('maps publishing preflight to the real read-only tool', async () => {
    const { context, calls } = createContext({ media: {}, targets: [] });
    await new PostsDomain(context).preflight({
      contentType: 'SLIDESHOW',
      contentId: '11111111-1111-4111-8111-111111111111',
      publishFormat: 'VIDEO',
      connectionIds: ['22222222-2222-4222-8222-222222222222'],
    });

    expect(calls).toEqual([{
      name: 'reelsfarm_preflight_publishing',
      args: {
        contentType: 'SLIDESHOW',
        contentId: '11111111-1111-4111-8111-111111111111',
        publishFormat: 'VIDEO',
        connectionIds: ['22222222-2222-4222-8222-222222222222'],
      },
    }]);
  });

  it('passes every canonical platform setting to scheduled publishing', async () => {
    const { context, calls } = createContext();
    await new PostsDomain(context).schedule({
      contentType: 'SLIDESHOW',
      contentId: '11111111-1111-4111-8111-111111111111',
      scheduledFor: '2026-09-01T15:00:00.000Z',
      publishFormat: 'VIDEO',
      platforms: [{
        platform: 'TIKTOK',
        connectionId: '22222222-2222-4222-8222-222222222222',
        captionOverride: 'TikTok caption',
        tiktokPublishMode: 'DIRECT',
        tiktokPrivacyLevel: 'PUBLIC_TO_EVERYONE',
        tiktokTitle: 'Launch title',
        tiktokAutoAddMusic: false,
        tiktokIsAigc: true,
        tiktokAllowComment: true,
        tiktokAllowDuet: false,
        tiktokAllowStitch: false,
        tiktokCommercialContentEnabled: true,
        tiktokBrandOrganic: true,
        tiktokBrandedContent: false,
        tiktokVideoCoverTimestampMs: 500,
      }, {
        platform: 'YOUTUBE',
        connectionId: '33333333-3333-4333-8333-333333333333',
        youtubeTitle: 'YouTube title',
        youtubePrivacyStatus: 'UNLISTED',
        youtubeMadeForKids: false,
        youtubeContainsSyntheticMedia: true,
        youtubeHasPaidProductPlacement: true,
        youtubeNotifySubscribers: false,
      }],
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_prepare_schedule_post',
      args: {
        publishFormat: 'VIDEO',
        platforms: [
          { tiktokAllowComment: true, tiktokCommercialContentEnabled: true },
          { youtubeContainsSyntheticMedia: true, youtubeHasPaidProductPlacement: true },
        ],
      },
    });
  });

  it('rejects removed publishing aliases and cross-platform settings', () => {
    expect(() => canonicalPlatformTargetsSchema.parse([{
      platform: 'TIKTOK',
      connectionId: '22222222-2222-4222-8222-222222222222',
      socialConnectionId: '33333333-3333-4333-8333-333333333333',
    }])).toThrow();
    expect(() => canonicalPlatformTargetsSchema.parse([{
      platform: 'FACEBOOK',
      connectionId: '22222222-2222-4222-8222-222222222222',
      youtubeTitle: 'Wrong platform',
    }])).toThrow();
  });

  it('passes canonical slideshow visuals and settings without loss', async () => {
    const { context, calls } = createContext({ slideshow: {} });
    await new SlideshowsDomain(context).create({
      title: 'Launch',
      settings: {
        duration: 2500,
        transitionStyle: 'fade',
        music: {
          source: 'upload',
          audioUrl: '/api/assets/user-uploads?key=user/music.mp3',
          name: 'Launch music',
        },
      },
      slides: [{
        imageUrl: '/api/assets/user-generated?key=user/slide.webp',
        compositedImageUrl: '/api/assets/user-generated?key=user/composited.webp',
        order: 0,
        imageOpacity: 65,
      }],
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_create_slideshow',
      args: {
        settings: { duration: 2500, transitionStyle: 'fade', music: { source: 'upload' } },
        slides: [{ compositedImageUrl: expect.any(String), imageOpacity: 65 }],
      },
    });
  });

  it('passes complete nested automation definitions without loose maps', async () => {
    const { context, calls } = createContext();
    await new AutomationsDomain(context).create({
      name: 'Daily launch',
      targetConnectionId: '22222222-2222-4222-8222-222222222222',
      schedule: { slots: [{ days: ['mon', 'wed'], timeLocal: '09:30' }] },
      content: {
        topic: 'skincare',
        slidesCount: 5,
        productContext: {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Serum',
          description: 'Vitamin C serum',
        },
      },
      images: {
        collectionIds: ['44444444-4444-4444-8444-444444444444'],
        overlayScope: 'all',
        pinnedSlideImages: [{
          slideNumber: 2,
          image: { source: 'gallery', path: '/api/assets/user-generated?key=user/pin.webp', name: 'Pinned' },
        }],
      },
      publishRules: {
        caption: 'Daily tip',
        tiktokSettings: { tiktokPostMode: 'DRAFT', tiktokAutoAddMusic: true },
      },
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_prepare_create_automation',
      args: {
        schedule: { slots: [{ days: ['mon', 'wed'], timeLocal: '09:30' }] },
        images: { overlayScope: 'all', pinnedSlideImages: [{ slideNumber: 2 }] },
        publishRules: { tiktokSettings: { tiktokPostMode: 'DRAFT' } },
      },
    });
  });
});
