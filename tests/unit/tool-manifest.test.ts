import { describe, expect, it } from 'vitest';
import { toolManifest, toolNames } from '../../src/generated/tool-manifest.js';

describe('tool manifest', () => {
  it('tracks the current ReelsFarm MCP tool catalog', () => {
    expect(toolNames).toHaveLength(106);
    expect(toolNames).toContain('get_operation');
    expect(toolNames).toContain('get_generated_hook_status');
    expect(toolNames).toContain('get_image_generation_conversation');
    expect(toolNames).toContain('get_slideshow_text_job_status');
    expect(toolNames).toContain('get_slideshow_revision_job_status');
    expect(toolNames).toContain('get_slideshow_export_job_status');
    expect(toolNames).toContain('list_gallery_feed');
    expect(toolNames).toContain('list_media_collections');
    expect(toolNames).toContain('prepare_import_hook_clips');
    expect(toolNames).toContain('list_ai_clone_voices');
    expect(toolNames).toContain('list_community_images');
    expect(toolNames).toContain('list_avatar_templates');
    expect(toolNames).toContain('delete_gallery_image');
    expect(toolNames).not.toContain('create_webhook');
    expect(toolNames).not.toContain('prepare_delete_scheduled_post');
    expect(toolNames).not.toContain('create_api_key');
  });

  it('marks search and validation tools as read-only', () => {
    const byName = new Map(toolManifest.map((tool) => [tool.name, tool]));

    expect(byName.get('search_assets')?.readOnly).toBe(true);
    expect(byName.get('validate_caption')?.readOnly).toBe(true);
    expect(byName.get('import_media_from_url')?.readOnly).toBe(false);
  });
});
