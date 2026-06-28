import { describe, expect, it } from 'vitest';
import { toolNames } from '../../src/generated/tool-manifest.js';

describe('tool manifest', () => {
  it('tracks the current ReelsFarm MCP tool catalog', () => {
    expect(toolNames).toHaveLength(87);
    expect(toolNames).toContain('get_generated_hook_status');
    expect(toolNames).toContain('get_slideshow_text_job_status');
    expect(toolNames).toContain('get_slideshow_export_job_status');
    expect(toolNames).not.toContain('create_api_key');
  });
});
