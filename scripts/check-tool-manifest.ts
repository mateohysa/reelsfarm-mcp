import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toolNames } from '../src/generated/tool-manifest.js';

const dashboardOnlyTools = new Set([
  'list_api_keys',
  'revoke_api_key',
  'list_oauth_clients',
  'revoke_oauth_client',
  'delete_product_context',
  'delete_character',
  'delete_asset',
  'delete_draft',
  'create_webhook',
  'list_webhooks',
  'delete_webhook',
  'prepare_delete_automation',
  'prepare_delete_scheduled_post',
]);

const unique = new Set(toolNames);
if (unique.size !== toolNames.length) {
  throw new Error('Tool manifest contains duplicate names');
}
for (const required of [
  'get_operation',
  'get_generated_hook_status',
  'get_image_generation_conversation',
  'get_slideshow_text_job_status',
  'get_slideshow_revision_job_status',
  'get_slideshow_export_job_status',
  'list_gallery_feed',
  'list_media_collections',
  'prepare_import_hook_clips',
  'list_ai_clone_voices',
  'list_community_images',
  'list_avatar_templates',
  'prepare_save_character',
  'delete_gallery_image',
]) {
  if (!unique.has(required as never)) {
    throw new Error('Missing required corrected tool name: ' + required);
  }
}

const appRoot = resolve(process.env.REELSFARM_APP_ROOT || '../ugc-reels');
const serverSourcePath = resolve(appRoot, 'src/mcp-server.ts');
if (existsSync(serverSourcePath)) {
  const source = readFileSync(serverSourcePath, 'utf8');
  const toolsBlock = source.match(/const tools: McpTool\[\] = \[([\s\S]*?)\n\];\n\nconst unclassifiedTools/)?.[1];
  if (!toolsBlock) throw new Error('Could not read the app MCP tool catalog');
  const serverTools = [...toolsBlock.matchAll(/^ {4}name:\s*'([a-z0-9_]+)'/gm)]
    .map((match) => match[1])
    .filter((name): name is string => Boolean(name))
    .filter((name) => !dashboardOnlyTools.has(name));
  const sdkTools = new Set<string>(toolNames);
  const missing = serverTools.filter((name) => !sdkTools.has(name));
  const extra = toolNames.filter((name) => !serverTools.includes(name));
  if (missing.length || extra.length) {
    throw new Error(`MCP/SDK tool drift. Missing in SDK: ${missing.join(', ') || 'none'}. Extra in SDK: ${extra.join(', ') || 'none'}.`);
  }
}
console.log('Tool manifest OK: ' + toolNames.length + ' tools');
