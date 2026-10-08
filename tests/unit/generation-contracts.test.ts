import { describe, expect, it } from 'vitest';
import { AvatarsDomain } from '../../src/domains/avatars.js';
import { HooksDomain } from '../../src/domains/hooks.js';
import { ImageGenerationsDomain } from '../../src/domains/image-generations.js';
import { SlideshowsDomain } from '../../src/domains/slideshows.js';
import { VideosDomain } from '../../src/domains/videos.js';
import { ReelsFarmJob } from '../../src/jobs/job.js';
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

  it('passes Nano Banana 2.1 and image category prompts through avatar generation', async () => {
    const { context, calls } = createContext();
    await new AvatarsDomain(context).generate({
      prompt: 'IMAGE CATEGORY: Infographics\nTITLE: Morning routine',
      mode: 'reference',
      sourceImageUrl: 'https://reelsfarm.com/image-templates/espresso-drink-guide.jpg',
      model: 'nano-banana-2-1',
      aspectRatio: '4:5',
      quality: 'high',
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_prepare_generate_avatar',
      args: { model: 'nano-banana-2-1', mode: 'reference', prompt: expect.stringMatching(/^IMAGE CATEGORY: Infographics/) },
    });
  });

  it('lists Product and Infographics image templates', async () => {
    const { context, calls } = createContext({ templates: [], peopleTemplate: {} });
    await new ImageGenerationsDomain(context).listTemplates({ category: 'product' });
    await new ImageGenerationsDomain(context).listTemplates();

    expect(calls).toEqual([
      { name: 'reelsfarm_list_image_templates', args: { category: 'product' } },
      { name: 'reelsfarm_list_image_templates', args: {} },
    ]);
  });

  it('passes every Videos workbench control and returns a pollable job', async () => {
    const { context, calls } = createContext({ jobId: '11111111-1111-4111-8111-111111111111', status: 'PENDING', kind: 'VIDEO_GENERATION' });
    const job = await new VideosDomain(context).generateVideo({
      prompt: 'Slow push-in on a latte, soft cafe ambience.',
      model: 'gemini-omni-1.1-flash',
      durationSeconds: 8,
      aspectRatio: '16:9',
      resolution: '1080p',
      includeAudio: true,
      category: 'product',
      collectionId: '22222222-2222-4222-8222-222222222222',
      referenceImageUrls: ['/api/assets/user-uploads?key=user-1/latte.png'],
      conversationId: '33333333-3333-4333-8333-333333333333',
      idempotencyKey: 'video-request-1',
    });

    expect(calls[0]).toEqual({
      name: 'reelsfarm_prepare_generate_video',
      args: {
        prompt: 'Slow push-in on a latte, soft cafe ambience.',
        model: 'gemini-omni-1.1-flash',
        durationSeconds: 8,
        aspectRatio: '16:9',
        resolution: '1080p',
        includeAudio: true,
        category: 'product',
        collectionId: '22222222-2222-4222-8222-222222222222',
        referenceImageUrls: ['/api/assets/user-uploads?key=user-1/latte.png'],
        conversationId: '33333333-3333-4333-8333-333333333333',
        idempotencyKey: 'video-request-1',
      },
    });
    expect(job).toBeInstanceOf(ReelsFarmJob);
    expect((job as ReelsFarmJob).kind).toBe('VIDEO_GENERATION');

    await (job as ReelsFarmJob).getStatus({ waitMs: 25000 });
    expect(calls[1]).toEqual({
      name: 'reelsfarm_get_video_generation_status',
      args: { jobId: '11111111-1111-4111-8111-111111111111', waitMs: 25000 },
    });
  });

  it('unwraps Videos workbench status with the finished library video', async () => {
    const video = {
      id: '44444444-4444-4444-8444-444444444444',
      title: null,
      videoUrl: '/api/assets/user-generated?key=user-1/video.mp4',
      thumbnailUrl: null,
      duration: 8,
      sourceType: 'GENERATED_HOOK',
      sourceSlideshowId: null,
      createdAt: '2026-10-07T12:00:00.000Z',
    };
    const { context } = createContext({
      status: { jobId: '11111111-1111-4111-8111-111111111111', status: 'COMPLETED', video },
      provider: 'reelsfarm',
      sourceTool: 'reelsfarm_get_video_generation_status',
      executionState: 'COMPLETED',
      assetCreated: true,
      resultMessage: 'ReelsFarm completed the action and returned the created asset in this response.',
      jobProgress: { step: 'completed', terminal: true, nextPollAfterMs: 0 },
    });
    const status = await new VideosDomain(context).getGenerationStatus('11111111-1111-4111-8111-111111111111');

    expect(status).toMatchObject({
      status: 'COMPLETED',
      executionState: 'COMPLETED',
      assetCreated: true,
      video: { id: video.id, sourceType: 'GENERATED_HOOK' },
      jobProgress: { terminal: true },
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

  it('passes slideshow effort presets and visual reference aspect ratios', async () => {
    const { context, calls } = createContext();
    const visualContext = Array.from({ length: 10 }, (_, order) => ({
      order,
      imageUrl: `/api/assets/user-generated?key=user-1/slide-${order}.webp`,
      aspectRatio: '9:16' as const,
    }));
    const slideshows = new SlideshowsDomain(context);
    await slideshows.generateText({ prompt: '10 slides about cold brew', slideCount: 10, maxMode: true, effort: 'high', visualContext });
    await slideshows.reviseText({
      instruction: 'Keep titles clear of faces.',
      maxMode: true,
      effort: 'extra_high',
      visualContext: visualContext.slice(0, 1),
      slides: [{ order: 0, textItems: [] }],
    });

    expect(calls[0]).toMatchObject({
      name: 'reelsfarm_prepare_generate_slideshow_text',
      args: { effort: 'high', visualContext: expect.arrayContaining([{ order: 9, imageUrl: expect.any(String), aspectRatio: '9:16' }]) },
    });
    expect(calls[1]).toMatchObject({
      name: 'reelsfarm_prepare_revise_slideshow_text',
      args: { effort: 'extra_high', visualContext: [{ order: 0, aspectRatio: '9:16' }] },
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
