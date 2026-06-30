import { describe, expect, it } from 'vitest';
import { toolManifest, toolNames } from '../../src/generated/tool-manifest.js';

describe('tool manifest', () => {
  it('tracks the current ReelsFarm MCP tool catalog', () => {
    expect(toolNames).toHaveLength(87);
    expect(toolNames).toContain('get_generated_hook_status');
    expect(toolNames).toContain('get_slideshow_text_job_status');
    expect(toolNames).toContain('get_slideshow_export_job_status');
    expect(toolNames).not.toContain('create_api_key');
  });

  it('marks search and validation tools as read-only', () => {
    const byName = new Map(toolManifest.map((tool) => [tool.name, tool]));

    expect(byName.get('search_assets')?.readOnly).toBe(true);
    expect(byName.get('validate_caption')?.readOnly).toBe(true);
    expect(byName.get('import_media_from_url')?.readOnly).toBe(false);
  });
});
