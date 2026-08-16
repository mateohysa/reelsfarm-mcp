import { describe, expect, it } from 'vitest';
import { AiClonesDomain } from '../../src/domains/ai-clones.js';
import { CommunityDomain } from '../../src/domains/community.js';
import { HooksDomain } from '../../src/domains/hooks.js';
import { MediaCollectionsDomain } from '../../src/domains/media-collections.js';
import { ProductContextsDomain } from '../../src/domains/product-contexts.js';
import { TrashDomain } from '../../src/domains/trash.js';
import { VideosDomain } from '../../src/domains/videos.js';
import { AssetsDomain } from '../../src/domains/assets.js';
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

describe('web workflow parity', () => {
  it('maps unified gallery and media collection workflows', async () => {
    const { context, calls } = createContext();
    const collections = new MediaCollectionsDomain(context);

    await collections.listGallery({ mode: 'slideshow-picker', kinds: ['COLLECTION', 'AVATAR'] });
    await collections.create({ name: 'Campaign A', initialItems: [{ assetKind: 'AVATAR', assetId: '11111111-1111-4111-8111-111111111111' }] });
    await collections.updateMemberships({
      items: [{ assetKind: 'AVATAR', assetId: '11111111-1111-4111-8111-111111111111' }],
      addCollectionIds: ['22222222-2222-4222-8222-222222222222'],
    });

    expect(calls.map((call) => call.name)).toEqual([
      'reelsfarm_list_gallery_feed',
      'reelsfarm_create_media_collection',
      'reelsfarm_update_media_collection_memberships',
    ]);
  });

  it('exposes both product upload control-plane steps', async () => {
    const { context, calls } = createContext();
    const assets = new AssetsDomain(context);

    await assets.createProductUploadSessions([{
      clientId: 'product-1',
      filename: 'product.webp',
      contentType: 'image/webp',
      size: 1_024,
    }]);
    await assets.completeProductUploadSessions(['11111111-1111-4111-8111-111111111111']);

    expect(calls.map((call) => call.name)).toEqual([
      'reelsfarm_create_product_upload_sessions',
      'reelsfarm_complete_product_upload_sessions',
    ]);
  });

  it('maps web-compatible hook clip imports', async () => {
    const { context, calls } = createContext({ jobId: '11111111-1111-4111-8111-111111111111' });
    const hooks = new HooksDomain(context);

    await hooks.getImportCapabilities();
    await hooks.checkImportAccess('youtube', 'youtube-test');
    await hooks.importClips({
      items: [{ url: 'https://youtube.com/shorts/example', start: '1', length: '5', name: 'Opening' }],
      fallbackProfiles: { youtube: 'youtube-test' },
    });

    expect(calls.map((call) => call.name)).toEqual([
      'reelsfarm_get_hook_import_capabilities',
      'reelsfarm_check_hook_import_access',
      'reelsfarm_prepare_import_hook_clips',
    ]);
  });

  it('passes all AI Clone voice controls and lists shared voices', async () => {
    const { context, calls } = createContext({ jobId: '11111111-1111-4111-8111-111111111111' });
    const aiClones = new AiClonesDomain(context);

    await aiClones.listVoices({ search: 'warm', category: 'professional' });
    await aiClones.generate({
      avatarUrl: '/api/assets/avatars?key=user/avatar.png',
      motionVideoUrl: '/api/assets/user-uploads?key=user/motion.mp4',
      enableVoiceConversion: true,
      voiceId: 'voice-1',
      voiceModelId: 'eleven_multilingual_sts_v2',
      removeBackgroundNoise: true,
    });

    expect(calls[0]).toMatchObject({ name: 'reelsfarm_list_ai_clone_voices', args: { search: 'warm' } });
    expect(calls[1]).toMatchObject({
      name: 'reelsfarm_prepare_ai_clone_job',
      args: { voiceId: 'voice-1', voiceModelId: 'eleven_multilingual_sts_v2', removeBackgroundNoise: true },
    });
  });

  it('maps community, product context, trash, and UGC controls', async () => {
    const { context, calls } = createContext();

    await new CommunityDomain(context).listImages('11111111-1111-4111-8111-111111111111', { random: true });
    await new ProductContextsDomain(context).suggestFromUrl('https://example.com/product');
    await new TrashDomain(context).restore('22222222-2222-4222-8222-222222222222', 'product-placement');
    await new VideosDomain(context).generate({
      hookUrl: '/api/assets/user-generated?key=user/hook.mp4',
      textPosition: 'BOTTOM',
      quality: 'high',
    });

    expect(calls.map((call) => call.name)).toEqual([
      'reelsfarm_list_community_images',
      'reelsfarm_suggest_product_context_from_url',
      'reelsfarm_restore_trash_item',
      'reelsfarm_prepare_generate_ugc_video',
    ]);
    expect(calls[3]!.args).toMatchObject({ textPosition: 'BOTTOM', quality: 'high' });
  });
});
