import { toolNames } from '../src/generated/tool-manifest.js';

const unique = new Set(toolNames);
if (unique.size !== toolNames.length) {
  throw new Error('Tool manifest contains duplicate names');
}
for (const required of ['get_operation', 'get_generated_hook_status', 'get_slideshow_text_job_status', 'get_slideshow_export_job_status']) {
  if (!unique.has(required as never)) {
    throw new Error('Missing required corrected tool name: ' + required);
  }
}
console.log('Tool manifest OK: ' + toolNames.length + ' tools');
