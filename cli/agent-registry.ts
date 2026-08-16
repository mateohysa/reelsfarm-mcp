import { toolManifest, type ToolName } from '../src/generated/index.js';

export type AgentSafetyLevel = 'read' | 'write' | 'prepare' | 'destructive';

export interface AgentCommandInfo {
  name: string;
  usage: string;
  description: string;
  requiredFlags: string[];
  optionalFlags: string[];
  safety: AgentSafetyLevel;
  readOnly: boolean;
  destructive: boolean;
  prepareBacked: boolean;
  examples: string[];
}

const toolsByName = new Map<string, { readOnly: boolean; destructive: boolean; prepare: boolean }>(
  toolManifest.map((tool) => [tool.name, tool]),
);

function fromTool(
  name: string,
  usage: string,
  description: string,
  toolName: ToolName | undefined,
  details: {
    requiredFlags?: string[];
    optionalFlags?: string[];
    examples: string[];
    destructive?: boolean;
    safety?: AgentSafetyLevel;
  },
): AgentCommandInfo {
  const tool = toolName ? toolsByName.get(toolName) : undefined;
  const prepareBacked = Boolean(tool?.prepare);
  const destructive = Boolean(details.destructive ?? tool?.destructive);
  const readOnly = details.safety === 'read' || Boolean(tool?.readOnly);
  const safety = details.safety ?? (destructive ? 'destructive' : prepareBacked ? 'prepare' : readOnly ? 'read' : 'write');
  return {
    name,
    usage,
    description,
    requiredFlags: details.requiredFlags ?? [],
    optionalFlags: details.optionalFlags ?? [],
    safety,
    readOnly,
    destructive,
    prepareBacked,
    examples: details.examples,
  };
}

export const agentCommandRegistry: AgentCommandInfo[] = [
  fromTool('whoami', 'reelsfarm whoami', 'Get the authenticated ReelsFarm account.', 'reelsfarm_get_account', {
    examples: ['reelsfarm whoami --agent'],
  }),
  fromTool('account.status', 'reelsfarm account status', 'Get account and entitlement status.', 'reelsfarm_get_account', {
    examples: ['reelsfarm account status --agent'],
  }),
  fromTool('avatars.list', 'reelsfarm avatars list [--limit <n>]', 'List generated and saved avatars.', 'reelsfarm_list_avatars', {
    optionalFlags: ['--limit'],
    examples: ['reelsfarm avatars list --limit 10 --agent'],
  }),
  fromTool('avatars.templates', 'reelsfarm avatars templates [--limit <n>] [--cursor <cursor>]', 'List avatar picker templates.', 'reelsfarm_list_avatar_templates', {
    optionalFlags: ['--limit', '--cursor'], examples: ['reelsfarm avatars templates --agent'],
  }),
  fromTool('avatars.generate', 'reelsfarm avatars generate --prompt <prompt> [--model <model>] [--reference-url <url>] [--conversation-id <id>] [--parent-generation-id <id>]', 'Prepare or run an avatar generation conversation turn.', 'reelsfarm_prepare_generate_avatar', {
    requiredFlags: ['--prompt'],
    optionalFlags: ['--model', '--reference-url', '--conversation-id', '--parent-generation-id', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm avatars generate --prompt "Creator selfie style" --agent'],
  }),
  fromTool('product-scenes.list', 'reelsfarm product-scenes list [--limit <n>]', 'List Product Studio images.', 'reelsfarm_list_gallery', {
    optionalFlags: ['--limit'], examples: ['reelsfarm product-scenes list --agent'],
  }),
  fromTool('product-scenes.generate', 'reelsfarm product-scenes generate --source-image-url <url> --product-image-url <url> --prompt <prompt>', 'Prepare or run a Product Studio conversation turn.', 'reelsfarm_prepare_generate_product_scene', {
    requiredFlags: ['--source-image-url', '--product-image-url', '--prompt'], optionalFlags: ['--conversation-id', '--parent-generation-id', '--wait', '--yes', '--dry-run'], examples: ['reelsfarm product-scenes generate --source-image-url https://example.com/avatar.png --product-image-url https://example.com/product.png --prompt "Hold the product" --agent'],
  }),
  fromTool('product-scenes.delete', 'reelsfarm product-scenes delete --id <id>', 'Move a Product Studio image to trash.', 'reelsfarm_delete_gallery_image', {
    requiredFlags: ['--id'], optionalFlags: ['--yes', '--dry-run'], destructive: true, examples: ['reelsfarm product-scenes delete --id image_123 --agent'],
  }),
  fromTool('hooks.list', 'reelsfarm hooks list [--limit <n>]', 'List generated hook videos.', 'reelsfarm_list_generated_hooks', {
    optionalFlags: ['--limit'],
    examples: ['reelsfarm hooks list --agent'],
  }),
  fromTool('hooks.templates', 'reelsfarm hooks templates [--limit <n>]', 'List hook templates.', 'reelsfarm_list_template_hooks', {
    optionalFlags: ['--limit'],
    examples: ['reelsfarm hooks templates --agent'],
  }),
  fromTool('hooks.generate', 'reelsfarm hooks generate --avatar-url <url> [--preset <preset>] [--model <model>] [--duration <seconds>] [--custom-prompt <prompt>]', 'Prepare or run conversational hook video generation.', 'reelsfarm_prepare_generate_hook', {
    requiredFlags: ['--avatar-url'],
    optionalFlags: ['--preset', '--model', '--duration', '--custom-prompt', '--include-audio', '--script-text', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm hooks generate --avatar-url https://example.com/avatar.png --agent'],
  }),
  fromTool('hooks.import-capabilities', 'reelsfarm hooks import-capabilities', 'Get hook import profiles and health.', 'reelsfarm_get_hook_import_capabilities', {
    examples: ['reelsfarm hooks import-capabilities --agent'],
  }),
  fromTool('hooks.import-access', 'reelsfarm hooks import-access --platform <platform> [--profile-id <id>]', 'Retest one YouTube or TikTok import path.', 'reelsfarm_check_hook_import_access', {
    requiredFlags: ['--platform'], optionalFlags: ['--profile-id'], examples: ['reelsfarm hooks import-access --platform youtube --agent'],
  }),
  fromTool('hooks.import-clips', 'reelsfarm hooks import-clips --items-json <json>', 'Prepare or run trimmed hook clip imports.', 'reelsfarm_prepare_import_hook_clips', {
    requiredFlags: ['--items-json'], optionalFlags: ['--fallback-profiles-json', '--wait', '--yes', '--dry-run'], examples: ['reelsfarm hooks import-clips --items-json \'[{"url":"https://youtube.com/shorts/example","start":"0","length":"5"}]\' --agent'],
  }),
  fromTool('hooks.import-status', 'reelsfarm hooks import-status --job-id <id>', 'Get hook clip import progress.', 'reelsfarm_get_hook_clip_import_status', {
    requiredFlags: ['--job-id'], examples: ['reelsfarm hooks import-status --job-id job_123 --agent'],
  }),
  fromTool('hooks.import-cancel', 'reelsfarm hooks import-cancel --job-id <id>', 'Cancel a hook clip import.', 'reelsfarm_cancel_hook_clip_import', {
    requiredFlags: ['--job-id'], optionalFlags: ['--yes', '--dry-run'], destructive: true, examples: ['reelsfarm hooks import-cancel --job-id job_123 --agent'],
  }),
  fromTool('slideshows.list', 'reelsfarm slideshows list [--limit <n>]', 'List slideshows.', 'reelsfarm_list_slideshows', {
    optionalFlags: ['--limit'],
    examples: ['reelsfarm slideshows list --agent'],
  }),
  fromTool('slideshows.get', 'reelsfarm slideshows get --id <id>', 'Fetch a slideshow.', 'reelsfarm_get_slideshow', {
    requiredFlags: ['--id'],
    examples: ['reelsfarm slideshows get --id sl_123 --agent'],
  }),
  fromTool('slideshows.create', 'reelsfarm slideshows create --slides-json <json> [--title <title>]', 'Create a slideshow draft.', 'reelsfarm_create_slideshow', {
    requiredFlags: ['--slides-json'],
    optionalFlags: ['--title'],
    examples: ['reelsfarm slideshows create --title "Launch" --slides-json \'[]\' --agent'],
  }),
  fromTool('slideshows.generate-text', 'reelsfarm slideshows generate-text --prompt <prompt> [--type <type>] [--slide-count <n>] [--max] [--visual-context-json <json>]', 'Prepare or run slideshow text generation.', 'reelsfarm_prepare_generate_slideshow_text', {
    requiredFlags: ['--prompt'],
    optionalFlags: ['--type', '--slide-count', '--max', '--visual-context-json', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm slideshows generate-text --prompt "5 TikTok slides about skincare" --agent'],
  }),
  fromTool('slideshows.revise-text', 'reelsfarm slideshows revise-text --instruction <text> --slides-json <json> [--max] [--visual-context-json <json>]', 'Prepare or run a conversational slideshow text revision.', 'reelsfarm_prepare_revise_slideshow_text', {
    requiredFlags: ['--instruction', '--slides-json'],
    optionalFlags: ['--type', '--max', '--visual-context-json', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm slideshows revise-text --instruction "Move the title away from the face" --slides-json \'[...]\' --agent'],
  }),
  fromTool('slideshows.finalize', 'reelsfarm slideshows finalize --slideshow-id <id> [--slides-json <json>]', 'Prepare or run slideshow export/finalization.', 'reelsfarm_prepare_finalize_slideshow', {
    requiredFlags: ['--slideshow-id'],
    optionalFlags: ['--slides-json', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm slideshows finalize --slideshow-id sl_123 --agent'],
  }),
  fromTool('slideshows.export-video', 'reelsfarm slideshows export-video --slideshow-id <id>', 'Prepare or run slideshow MP4 export.', 'reelsfarm_prepare_export_slideshow_video', {
    requiredFlags: ['--slideshow-id'],
    optionalFlags: ['--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm slideshows export-video --slideshow-id sl_123 --agent'],
  }),
  fromTool('image-generations.active', 'reelsfarm image-generations active', 'List active avatar and product-scene conversation turns.', 'reelsfarm_list_active_image_generation_jobs', {
    examples: ['reelsfarm image-generations active --agent'],
  }),
  fromTool('image-generations.job', 'reelsfarm image-generations job --job-id <id>', 'Get one image generation conversation turn.', 'reelsfarm_get_image_generation_job_status', {
    requiredFlags: ['--job-id'],
    examples: ['reelsfarm image-generations job --job-id job_123 --agent'],
  }),
  fromTool('image-generations.conversation', 'reelsfarm image-generations conversation --conversation-id <id> [--limit <n>] [--cursor <cursor>]', 'Get ordered turns from one image generation conversation.', 'reelsfarm_get_image_generation_conversation', {
    requiredFlags: ['--conversation-id'],
    optionalFlags: ['--limit', '--cursor'],
    examples: ['reelsfarm image-generations conversation --conversation-id conv_123 --agent'],
  }),
  fromTool('ai-clones.list', 'reelsfarm ai-clones list [--limit <n>] [--cursor <cursor>]', 'List AI Clone assets.', 'reelsfarm_list_ai_clone_assets', {
    optionalFlags: ['--limit', '--cursor'], examples: ['reelsfarm ai-clones list --agent'],
  }),
  fromTool('ai-clones.voices', 'reelsfarm ai-clones voices [--search <text>] [--category <category>]', 'Search AI Clone voices.', 'reelsfarm_list_ai_clone_voices', {
    optionalFlags: ['--search', '--category', '--language', '--page', '--page-size'], examples: ['reelsfarm ai-clones voices --search warm --agent'],
  }),
  fromTool('ai-clones.generate', 'reelsfarm ai-clones generate --avatar-url <url> --motion-video-url <url>', 'Prepare or run AI Clone generation.', 'reelsfarm_prepare_ai_clone_job', {
    requiredFlags: ['--avatar-url', '--motion-video-url'], optionalFlags: ['--prompt', '--mode', '--character-orientation', '--enable-voice-conversion', '--voice-audio-url', '--voice-id', '--voice-model-id', '--remove-background-noise', '--wait', '--yes', '--dry-run'], examples: ['reelsfarm ai-clones generate --avatar-url https://example.com/avatar.png --motion-video-url https://example.com/motion.mp4 --agent'],
  }),
  fromTool('ai-clones.status', 'reelsfarm ai-clones status --job-id <id>', 'Get AI Clone job status.', 'reelsfarm_get_ai_clone_job_status', {
    requiredFlags: ['--job-id'], examples: ['reelsfarm ai-clones status --job-id job_123 --agent'],
  }),
  fromTool('media-collections.list', 'reelsfarm media-collections list [--mode <mode>]', 'List personal media collections.', 'reelsfarm_list_media_collections', {
    optionalFlags: ['--mode'], examples: ['reelsfarm media-collections list --agent'],
  }),
  fromTool('media-collections.gallery', 'reelsfarm media-collections gallery [--mode <mode>] [--kinds <items>]', 'List the unified web gallery feed.', 'reelsfarm_list_gallery_feed', {
    optionalFlags: ['--mode', '--limit', '--cursor', '--kinds'], examples: ['reelsfarm media-collections gallery --kinds COLLECTION,AVATAR --agent'],
  }),
  fromTool('media-collections.items', 'reelsfarm media-collections items --collection-id <id>', 'List items in a personal media collection.', 'reelsfarm_get_media_collection_items', {
    requiredFlags: ['--collection-id'], optionalFlags: ['--mode'], examples: ['reelsfarm media-collections items --collection-id col_123 --agent'],
  }),
  fromTool('media-collections.create', 'reelsfarm media-collections create --name <name> [--items-json <json>]', 'Create a personal media collection.', 'reelsfarm_create_media_collection', {
    requiredFlags: ['--name'], optionalFlags: ['--items-json', '--yes', '--dry-run'], examples: ['reelsfarm media-collections create --name Launch --agent'],
  }),
  fromTool('media-collections.rename', 'reelsfarm media-collections rename --collection-id <id> --name <name>', 'Rename a personal media collection.', 'reelsfarm_rename_media_collection', {
    requiredFlags: ['--collection-id', '--name'], optionalFlags: ['--yes', '--dry-run'], examples: ['reelsfarm media-collections rename --collection-id col_123 --name Launch --agent'],
  }),
  fromTool('media-collections.memberships', 'reelsfarm media-collections memberships --items-json <json>', 'Update collection memberships.', 'reelsfarm_update_media_collection_memberships', {
    requiredFlags: ['--items-json'], optionalFlags: ['--add', '--remove', '--yes', '--dry-run'], examples: ['reelsfarm media-collections memberships --items-json \'[{"assetKind":"AVATAR","assetId":"id"}]\' --add col_123 --agent'],
  }),
  fromTool('media-collections.delete-impact', 'reelsfarm media-collections delete-impact --collection-id <id>', 'Preview collection deletion impact.', 'reelsfarm_get_media_collection_delete_impact', {
    requiredFlags: ['--collection-id'], examples: ['reelsfarm media-collections delete-impact --collection-id col_123 --agent'],
  }),
  fromTool('media-collections.delete', 'reelsfarm media-collections delete --collection-id <id>', 'Delete a personal media collection.', 'reelsfarm_delete_media_collection', {
    requiredFlags: ['--collection-id'], optionalFlags: ['--yes', '--dry-run'], destructive: true, examples: ['reelsfarm media-collections delete --collection-id col_123 --agent'],
  }),
  fromTool('community.collections', 'reelsfarm community collections [--source <source>]', 'List community image collections.', 'reelsfarm_list_community_collections', {
    optionalFlags: ['--source', '--limit', '--offset'], examples: ['reelsfarm community collections --source pinterest --agent'],
  }),
  fromTool('community.images', 'reelsfarm community images --collection-id <id>', 'List community images.', 'reelsfarm_list_community_images', {
    requiredFlags: ['--collection-id'], optionalFlags: ['--limit', '--random'], examples: ['reelsfarm community images --collection-id col_123 --random --agent'],
  }),
  fromTool('product-contexts.list', 'reelsfarm product-contexts list', 'List product contexts.', 'reelsfarm_list_product_contexts', {
    examples: ['reelsfarm product-contexts list --agent'],
  }),
  fromTool('product-contexts.suggest', 'reelsfarm product-contexts suggest --url <url>', 'Suggest product context from a page URL.', 'reelsfarm_suggest_product_context_from_url', {
    requiredFlags: ['--url'], examples: ['reelsfarm product-contexts suggest --url https://example.com/product --agent'],
  }),
  fromTool('product-contexts.create', 'reelsfarm product-contexts create --name <name> --description <text>', 'Create a product context.', 'reelsfarm_create_product_context', {
    requiredFlags: ['--name', '--description'], optionalFlags: ['--yes', '--dry-run'], examples: ['reelsfarm product-contexts create --name Serum --description "Vitamin C serum" --agent'],
  }),
  fromTool('trash.list', 'reelsfarm trash list [--limit <n>] [--cursor <cursor>]', 'List unified web trash.', 'reelsfarm_list_trash', {
    optionalFlags: ['--limit', '--cursor'], examples: ['reelsfarm trash list --agent'],
  }),
  fromTool('trash.restore', 'reelsfarm trash restore --id <id> --type <type>', 'Restore one trashed item.', 'reelsfarm_restore_trash_item', {
    requiredFlags: ['--id', '--type'], optionalFlags: ['--yes', '--dry-run'], examples: ['reelsfarm trash restore --id item_123 --type product-placement --agent'],
  }),
  fromTool('trash.restore-all', 'reelsfarm trash restore-all', 'Restore all trashed media.', 'reelsfarm_restore_all_trash_items', {
    optionalFlags: ['--yes', '--dry-run'], examples: ['reelsfarm trash restore-all --agent'],
  }),
  fromTool('social.accounts', 'reelsfarm social accounts', 'List OAuth social accounts.', 'reelsfarm_list_social_accounts', {
    examples: ['reelsfarm social accounts --agent'],
  }),
  fromTool('social.connected', 'reelsfarm social connected', 'List all connected publishing accounts.', 'reelsfarm_list_connected_accounts', {
    examples: ['reelsfarm social connected --agent'],
  }),
  fromTool('posts.list', 'reelsfarm posts list [--status <status>] [--limit <n>]', 'List scheduled posts.', 'reelsfarm_list_scheduled_posts', {
    optionalFlags: ['--status', '--limit'],
    examples: ['reelsfarm posts list --status SCHEDULED --agent'],
  }),
  fromTool('posts.status', 'reelsfarm posts status --id <id>', 'Get publish status for a scheduled post.', 'reelsfarm_get_publish_status', {
    requiredFlags: ['--id'],
    examples: ['reelsfarm posts status --id post_123 --agent'],
  }),
  fromTool('posts.optimal-times', 'reelsfarm posts optimal-times [--platform <platform>] [--limit <n>]', 'Get recommended posting times.', 'reelsfarm_get_optimal_posting_times', {
    optionalFlags: ['--platform', '--limit'],
    examples: ['reelsfarm posts optimal-times --platform tiktok --agent'],
  }),
  fromTool('posts.schedule', 'reelsfarm posts schedule --content-type <type> --content-id <id> --when <date> --platforms <items>', 'Prepare or run scheduled publishing.', 'reelsfarm_prepare_schedule_post', {
    requiredFlags: ['--content-type', '--content-id', '--when', '--platforms'],
    optionalFlags: ['--caption', '--yes', '--dry-run'],
    examples: ['reelsfarm posts schedule --content-type SLIDESHOW --content-id sl_123 --when 2026-07-01T15:00:00Z --platforms tiktok:conn_123 --agent'],
  }),
  fromTool('posts.publish-now', 'reelsfarm posts publish-now --content-type <type> --content-id <id> --platforms <items>', 'Prepare or run immediate publishing.', 'reelsfarm_prepare_publish_now', {
    requiredFlags: ['--content-type', '--content-id', '--platforms'],
    optionalFlags: ['--caption', '--yes', '--dry-run'],
    examples: ['reelsfarm posts publish-now --content-type UGC_VIDEO --content-id vid_123 --platforms tiktok:conn_123 --agent'],
  }),
  fromTool('posts.update', 'reelsfarm posts update --id <id> [--when <date>] [--caption <caption>]', 'Prepare or run scheduled post updates.', 'reelsfarm_prepare_update_scheduled_post', {
    requiredFlags: ['--id'],
    optionalFlags: ['--when', '--caption', '--yes', '--dry-run'],
    examples: ['reelsfarm posts update --id post_123 --when 2026-07-01T16:00:00Z --agent'],
  }),
  fromTool('posts.cancel', 'reelsfarm posts cancel --id <id>', 'Cancel a scheduled post directly.', 'reelsfarm_cancel_scheduled_post', {
    requiredFlags: ['--id'],
    optionalFlags: ['--yes', '--dry-run'],
    destructive: true,
    examples: ['reelsfarm posts cancel --id post_123 --agent'],
  }),
  fromTool('assets.list', 'reelsfarm assets list --category <category> [--limit <n>]', 'List user assets by category.', 'reelsfarm_list_assets', {
    requiredFlags: ['--category'],
    optionalFlags: ['--limit'],
    examples: ['reelsfarm assets list --category products --agent'],
  }),
  fromTool('assets.search', 'reelsfarm assets search <query> [--category <category>]', 'Search user assets.', 'reelsfarm_search_assets', {
    requiredFlags: ['<query>'],
    optionalFlags: ['--category'],
    examples: ['reelsfarm assets search "shoe" --category products --agent'],
  }),
  fromTool('assets.import', 'reelsfarm assets import --category <category> --url <url> [--name <name>]', 'Import media from a URL.', 'reelsfarm_import_media_from_url', {
    requiredFlags: ['--category', '--url'],
    optionalFlags: ['--name'],
    examples: ['reelsfarm assets import --category products --url https://example.com/product.png --agent'],
  }),
  fromTool('assets.import-bulk', 'reelsfarm assets import-bulk --category <category> --items-json <json>', 'Import multiple media URLs.', 'reelsfarm_bulk_import_media', {
    requiredFlags: ['--category', '--items-json'],
    examples: ['reelsfarm assets import-bulk --category products --items-json \'[{"url":"https://example.com/a.png"}]\' --agent'],
  }),
  fromTool('automations.list', 'reelsfarm automations list', 'List automations.', 'reelsfarm_list_automations', {
    examples: ['reelsfarm automations list --agent'],
  }),
  fromTool('automations.create', 'reelsfarm automations create --json-definition <json>', 'Prepare or run automation creation.', 'reelsfarm_prepare_create_automation', {
    requiredFlags: ['--json-definition'],
    optionalFlags: ['--yes', '--dry-run'],
    examples: ['reelsfarm automations create --json-definition \'{"name":"Daily TikTok","status":"PAUSED","targetConnectionId":"conn_123","schedule":{"slots":[{"days":["mon"],"timeLocal":"09:00"}]},"content":{"topic":"mindset","slidesCount":5}}\' --agent'],
  }),
  fromTool('automations.update', 'reelsfarm automations update --id <id> --json-definition <json>', 'Prepare or run automation updates.', 'reelsfarm_prepare_update_automation', {
    requiredFlags: ['--id', '--json-definition'],
    optionalFlags: ['--yes', '--dry-run'],
    examples: ['reelsfarm automations update --id auto_123 --json-definition \'{"status":"PAUSED"}\' --agent'],
  }),
  fromTool('operations.get', 'reelsfarm operations get --id <id>', 'Get durable status for an MCP mutation.', 'reelsfarm_get_operation', {
    requiredFlags: ['--id'],
    examples: ['reelsfarm operations get --id op_123 --agent'],
  }),
  fromTool('operations.wait', 'reelsfarm operations wait --id <id> [--timeout <ms>]', 'Wait for a durable MCP mutation to finish.', 'reelsfarm_get_operation', {
    requiredFlags: ['--id'],
    optionalFlags: ['--timeout'],
    examples: ['reelsfarm operations wait --id op_123 --timeout 30000 --agent'],
  }),
  fromTool('events.recent', 'reelsfarm events recent [--limit <n>] [--type <type>]', 'List recent account events.', 'reelsfarm_get_recent_events', {
    optionalFlags: ['--limit', '--type'],
    examples: ['reelsfarm events recent --limit 20 --agent'],
  }),
  fromTool('validate.caption', 'reelsfarm validate caption <text> --platforms <items>', 'Validate caption text for target platforms.', 'reelsfarm_validate_caption', {
    requiredFlags: ['<text>', '--platforms'],
    examples: ['reelsfarm validate caption "Launch day" --platforms tiktok,instagram --agent'],
  }),
  fromTool('confirm', 'reelsfarm confirm <confirmationId>', 'Execute a prepared action by confirmation ID.', 'reelsfarm_confirm_action', {
    requiredFlags: ['<confirmationId>'],
    safety: 'write',
    examples: ['reelsfarm confirm conf_123 --agent'],
  }),
  fromTool('agent.status', 'reelsfarm agent status', 'Inspect CLI, endpoint, auth, and account readiness.', undefined, {
    safety: 'read',
    examples: ['reelsfarm agent status'],
  }),
  fromTool('agent.commands', 'reelsfarm agent commands', 'Emit this machine-readable command registry.', undefined, {
    safety: 'read',
    examples: ['reelsfarm agent commands'],
  }),
  fromTool('login', 'reelsfarm login --api-key <key>', 'Store an API key for future CLI calls.', undefined, {
    requiredFlags: ['--api-key'],
    safety: 'write',
    examples: ['reelsfarm login --api-key rfmcp_xxx'],
  }),
  fromTool('logout', 'reelsfarm logout', 'Remove stored credentials for the selected profile.', undefined, {
    optionalFlags: ['--yes', '--dry-run'],
    safety: 'destructive',
    destructive: true,
    examples: ['reelsfarm logout --agent --yes'],
  }),
];

export function getAgentCommandGroups(): string[] {
  return [...new Set(agentCommandRegistry.map((command) => command.name.split('.')[0] || command.name))].sort();
}
