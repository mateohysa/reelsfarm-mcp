import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toolNames } from '../src/generated/tool-manifest.js';
import { MCP_CONTRACT_VERSION, SDK_VERSION } from '../src/constants.js';

const unique = new Set(toolNames);
if (unique.size !== toolNames.length) {
  throw new Error('Tool manifest contains duplicate names');
}
for (const required of [
  'reelsfarm_get_operation',
  'reelsfarm_get_generated_hook_status',
  'reelsfarm_get_image_generation_conversation',
  'reelsfarm_get_slideshow_text_job_status',
  'reelsfarm_get_slideshow_revision_job_status',
  'reelsfarm_get_slideshow_export_job_status',
  'reelsfarm_list_gallery_feed',
  'reelsfarm_list_media_collections',
  'reelsfarm_prepare_import_hook_clips',
  'reelsfarm_list_ai_clone_voices',
  'reelsfarm_list_community_images',
  'reelsfarm_list_avatar_templates',
  'reelsfarm_prepare_save_character',
  'reelsfarm_delete_gallery_image',
  'reelsfarm_preflight_publishing',
]) {
  if (!unique.has(required as never)) {
    throw new Error('Missing required corrected tool name: ' + required);
  }
}

const appRoot = resolve(process.env.REELSFARM_APP_ROOT || '../ugc-reels');
const serverSourcePath = resolve(appRoot, 'src/mcp-server.ts');
// The app's generated public tool reference lists every tool a client sees, including the per-action
// confirmation tools the server registers in code.
const referencePath = resolve(appRoot, 'frontend/src/content/mcp-tool-reference.generated.ts');
if (existsSync(serverSourcePath)) {
  const source = readFileSync(serverSourcePath, 'utf8');
  const serverVersion = source.match(/export const MCP_SERVER_VERSION = '([^']+)'/)?.[1];
  const contractVersion = source.match(/export const MCP_CONTRACT_VERSION = '([^']+)'/)?.[1];
  if (serverVersion !== SDK_VERSION) {
    throw new Error(`MCP/SDK release version drift. Server: ${serverVersion || 'unknown'}. SDK: ${SDK_VERSION}.`);
  }
  if (contractVersion !== MCP_CONTRACT_VERSION) {
    throw new Error(`MCP/SDK contract version drift. Server: ${contractVersion || 'unknown'}. SDK: ${MCP_CONTRACT_VERSION}.`);
  }
  const literal = readFileSync(referencePath, 'utf8').match(/GENERATED_MCP_TOOL_REFERENCE = ("(?:[^"\\]|\\.)*");/)?.[1];
  if (!literal) throw new Error('Could not read the app MCP tool reference');
  const reference = JSON.parse(literal) as string;
  const serverTools = [...reference.matchAll(/^## `(reelsfarm_[a-z0-9_]+)`$/gm)].map((match) => match[1]!);
  if (serverTools.length === 0) throw new Error('The app MCP tool reference lists no tools');
  const sdkTools = new Set<string>(toolNames);
  const missing = serverTools.filter((name) => !sdkTools.has(name));
  const extra = toolNames.filter((name) => !serverTools.includes(name));
  if (missing.length || extra.length) {
    throw new Error(`MCP/SDK tool drift. Missing in SDK: ${missing.join(', ') || 'none'}. Extra in SDK: ${extra.join(', ') || 'none'}.`);
  }
}
console.log('Tool manifest OK: ' + toolNames.length + ' tools');
