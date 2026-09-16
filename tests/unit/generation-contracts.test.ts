import { describe, expect, it } from 'vitest';
import { AvatarsDomain } from '../../src/domains/avatars.js';
import { HooksDomain } from '../../src/domains/hooks.js';
import { ImageGenerationsDomain } from '../../src/domains/image-generations.js';
import { SlideshowsDomain } from '../../src/domains/slideshows.js';
import type { DomainContext } from '../../src/domains/context.js';
import type { JsonObject } from '../../src/types.js';

function createContext(result: JsonObject = { jobId: 'job_1' }) {
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

describe('generation conversation contracts', () => {
  it('passes image conversation lineage through avatar generation', async () => {
    const { context, calls } = createContext();
    await new AvatarsDomain(context).generate({
      prompt: 'Make the framing tighter',
      sourceImageUrl: '/api/assets/user-generated?key=user-1/image.png',
      conversationId: '11111111-1111-4111-8111-111111111111',
      parentGenerationId: '22222222-2222-4222-8222-222222222222',
      model: 'seedream-5-pro',
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_prepare_generate_avatar',
      args: {
        sourceImageUrl: '/api/assets/user-generated?key=user-1/image.png',
        conversationId: '11111111-1111-4111-8111-111111111111',
        parentGenerationId: '22222222-2222-4222-8222-222222222222',
        model: 'seedream-5-pro',
      },
    });
  });

  it('passes GPT Image 2.5 quality controls through avatar generation', async () => {
    const { context, calls } = createContext();
    await new AvatarsDomain(context).generate({
      prompt: 'Creator portrait with room for a headline',
      model: 'gpt-image-2.5-sunburst',
      aspectRatio: '4:5',
      quality: 'medium',
      styleMode: 'linkedin',
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_prepare_generate_avatar',
      args: {
        model: 'gpt-image-2.5-sunburst',
        aspectRatio: '4:5',
        quality: 'medium',
        styleMode: 'linkedin',
      },
    });
  });

  it('passes conversational hook instructions and Seedance 2.5', async () => {
    const { context, calls } = createContext();
    await new HooksDomain(context).generate({
      avatarUrl: '/api/assets/avatars?key=user-1/avatar.png',
      model: 'seedance-2.5',
      durationSeconds: 6,
      customPrompt: 'Walk toward the camera, then point at the product.',
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_prepare_generate_hook',
      args: { model: 'seedance-2.5', durationSeconds: 6, customPrompt: expect.any(String) },
    });
  });

  it('preserves ReelsFarm completion provenance when avatar status is unwrapped', async () => {
    const result = {
      status: {
        status: 'COMPLETED',
        avatar: { id: 'avatar_1', imageUrl: '/api/assets/user-generated?key=user/avatar.webp' },
      },
      provider: 'reelsfarm',
      sourceTool: 'reelsfarm_get_avatar_job_status',
      executionState: 'COMPLETED',
      assetCreated: true,
      resultMessage: 'ReelsFarm completed the action and returned the created asset in this response.',
    };
    const { context } = createContext(result);
    const status = await new AvatarsDomain(context).getJobStatus('job_1');

    expect(status).toMatchObject({
      status: 'COMPLETED',
      provider: 'reelsfarm',
      executionState: 'COMPLETED',
      assetCreated: true,
      avatar: { id: 'avatar_1' },
    });
  });

  it('passes complete slideshow revision state and visual context', async () => {
    const { context, calls } = createContext();
    await new SlideshowsDomain(context).reviseText({
      instruction: 'Move the title away from the face.',
      maxMode: true,
      visualContext: [{ order: 0, imageUrl: '/api/assets/user-generated?key=user-1/slide.webp' }],
      slides: [{
        order: 0,
        textItems: [{
          text: 'Current title',
          fontSize: '24px',
          textStyle: 'outline',
          textPosition: 'middle',
          textAlign: 'center',
        }],
      }],
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_prepare_revise_slideshow_text',
      args: { maxMode: true, visualContext: [{ order: 0 }], slides: [{ order: 0 }] },
    });
  });

  it('unwraps image conversation results', async () => {
    const conversation = {
      conversationId: '11111111-1111-4111-8111-111111111111',
      turns: [],
      nextCursor: null,
      hasMore: false,
    };
    const { context, calls } = createContext(conversation);
    const result = await new ImageGenerationsDomain(context).getConversation(conversation.conversationId, { limit: 20 });

    expect(result).toEqual(conversation);
    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_get_image_generation_conversation',
      args: { conversationId: conversation.conversationId, limit: 20 },
    });
  });
});
