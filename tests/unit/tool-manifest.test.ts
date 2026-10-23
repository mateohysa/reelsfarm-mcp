import { describe, expect, it } from 'vitest';
import { getConfirmationToolName, toolManifest, toolNames } from '../../src/generated/tool-manifest.js';

describe('tool manifest', () => {
  it('tracks the current ReelsFarm MCP tool catalog', () => {
    expect(toolNames).toHaveLength(177);
    expect(toolNames).toContain('reelsfarm_get_operation');
    expect(toolNames).toContain('reelsfarm_get_generated_hook_status');
    expect(toolNames).toContain('reelsfarm_get_image_generation_conversation');
    expect(toolNames).toContain('reelsfarm_get_slideshow_text_job_status');
    expect(toolNames).toContain('reelsfarm_get_slideshow_revision_job_status');
    expect(toolNames).toContain('reelsfarm_get_slideshow_export_job_status');
    expect(toolNames).toContain('reelsfarm_list_gallery_feed');
    expect(toolNames).toContain('reelsfarm_list_media_collections');
    expect(toolNames).toContain('reelsfarm_prepare_import_hook_clips');
    expect(toolNames).toContain('reelsfarm_list_ai_clone_voices');
    expect(toolNames).toContain('reelsfarm_list_community_images');
    expect(toolNames).toContain('reelsfarm_list_avatar_templates');
    expect(toolNames).toContain('reelsfarm_delete_gallery_image');
    expect(toolNames).toContain('reelsfarm_preflight_publishing');
    expect(toolNames).toContain('reelsfarm_prepare_generate_video');
    expect(toolNames).toContain('reelsfarm_get_video_generation_status');
    expect(toolNames).toContain('reelsfarm_list_image_templates');
    expect(toolNames).toContain('reelsfarm_prepare_recreate_slideshow');
    expect(toolNames).toContain('reelsfarm_search_photos');
    expect(toolNames).toContain('reelsfarm_prepare_create_slideshow_batch');
    expect(toolNames).not.toContain('create_webhook');
    expect(toolNames).not.toContain('prepare_delete_scheduled_post');
    expect(toolNames).not.toContain('create_api_key');
  });

  it('lists a confirmation tool per prepared action, destructive like the action it confirms', () => {
    expect(toolNames).not.toContain('reelsfarm_confirm_action');
    expect(toolManifest.find((tool) => tool.name === 'reelsfarm_confirm_generate_slideshow_text')).toMatchObject({ readOnly: false, destructive: false, confirmation: true });
    expect(toolManifest.find((tool) => tool.name === 'reelsfarm_confirm_delete_slideshow')).toMatchObject({ readOnly: false, destructive: true, confirmation: true });
    expect(getConfirmationToolName('reelsfarm_prepare_generate_slideshow_text')).toBe('reelsfarm_confirm_generate_slideshow_text');
    expect(getConfirmationToolName('reelsfarm_delete_slideshow')).toBe('reelsfarm_confirm_delete_slideshow');
    expect(getConfirmationToolName('reelsfarm_list_slideshows')).toBeUndefined();
  });

  it('marks search and validation tools as read-only', () => {
    const byName = new Map(toolManifest.map((tool) => [tool.name, tool]));

    expect(byName.get('reelsfarm_search_assets')?.readOnly).toBe(true);
    expect(byName.get('reelsfarm_validate_caption')?.readOnly).toBe(true);
    expect(byName.get('reelsfarm_preflight_publishing')?.readOnly).toBe(true);
    expect(byName.get('reelsfarm_import_media_from_url')?.readOnly).toBe(false);
  });

  it('classifies the Videos workbench and image template tools', () => {
    const byName = new Map(toolManifest.map((tool) => [tool.name, tool]));

    expect(byName.get('reelsfarm_prepare_generate_video')).toMatchObject({ readOnly: false, destructive: false, prepare: true });
    expect(byName.get('reelsfarm_get_video_generation_status')).toMatchObject({ readOnly: true, destructive: false, prepare: false });
    expect(byName.get('reelsfarm_list_image_templates')).toMatchObject({ readOnly: true, destructive: false, prepare: false });
  });
});
