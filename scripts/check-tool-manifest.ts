import { toolNames } from '../src/generated/tool-manifest.js';

const unique = new Set(toolNames);
if (unique.size !== toolNames.length) {
  throw new Error('Tool manifest contains duplicate names');
}
if (toolNames.length !== 87) {
  throw new Error('Expected 87 ReelsFarm MCP tools, found ' + toolNames.length);
}
for (const required of ['get_generated_hook_status', 'get_slideshow_text_job_status', 'get_slideshow_export_job_status']) {
  if (!unique.has(required as never)) {
    throw new Error('Missing required corrected tool name: ' + required);
  }
}
console.log('Tool manifest OK: ' + toolNames.length + ' tools');
