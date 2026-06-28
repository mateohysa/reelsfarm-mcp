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
  const readOnly = Boolean(tool?.readOnly);
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
  fromTool('whoami', 'reelsfarm whoami', 'Get the authenticated ReelsFarm account.', 'get_account', {
    examples: ['reelsfarm whoami --agent'],
  }),
  fromTool('account.status', 'reelsfarm account status', 'Get account and entitlement status.', 'get_account', {
    examples: ['reelsfarm account status --agent'],
  }),
  fromTool('avatars.list', 'reelsfarm avatars list [--limit <n>]', 'List generated and saved avatars.', 'list_avatars', {
    optionalFlags: ['--limit'],
    examples: ['reelsfarm avatars list --limit 10 --agent'],
  }),
  fromTool('avatars.generate', 'reelsfarm avatars generate --prompt <prompt> [--model <model>] [--reference-url <url>]', 'Prepare or run avatar generation.', 'prepare_generate_avatar', {
    requiredFlags: ['--prompt'],
    optionalFlags: ['--model', '--reference-url', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm avatars generate --prompt "Creator selfie style" --agent'],
  }),
  fromTool('hooks.list', 'reelsfarm hooks list [--limit <n>]', 'List generated hook videos.', 'list_generated_hooks', {
    optionalFlags: ['--limit'],
    examples: ['reelsfarm hooks list --agent'],
  }),
  fromTool('hooks.templates', 'reelsfarm hooks templates [--limit <n>]', 'List hook templates.', 'list_template_hooks', {
    optionalFlags: ['--limit'],
    examples: ['reelsfarm hooks templates --agent'],
  }),
  fromTool('hooks.generate', 'reelsfarm hooks generate --avatar-url <url> [--preset <preset>]', 'Prepare or run hook video generation.', 'prepare_generate_hook', {
    requiredFlags: ['--avatar-url'],
    optionalFlags: ['--preset', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm hooks generate --avatar-url https://example.com/avatar.png --agent'],
  }),
  fromTool('slideshows.list', 'reelsfarm slideshows list [--limit <n>]', 'List slideshows.', 'list_slideshows', {
    optionalFlags: ['--limit'],
    examples: ['reelsfarm slideshows list --agent'],
  }),
  fromTool('slideshows.get', 'reelsfarm slideshows get --id <id>', 'Fetch a slideshow.', 'get_slideshow', {
    requiredFlags: ['--id'],
    examples: ['reelsfarm slideshows get --id sl_123 --agent'],
  }),
  fromTool('slideshows.create', 'reelsfarm slideshows create --slides-json <json> [--title <title>]', 'Create a slideshow draft.', 'create_slideshow', {
    requiredFlags: ['--slides-json'],
    optionalFlags: ['--title'],
    examples: ['reelsfarm slideshows create --title "Launch" --slides-json \'[]\' --agent'],
  }),
  fromTool('slideshows.generate-text', 'reelsfarm slideshows generate-text --prompt <prompt> [--type <type>] [--slide-count <n>]', 'Prepare or run slideshow text generation.', 'prepare_generate_slideshow_text', {
    requiredFlags: ['--prompt'],
    optionalFlags: ['--type', '--slide-count', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm slideshows generate-text --prompt "5 TikTok slides about skincare" --agent'],
  }),
  fromTool('slideshows.finalize', 'reelsfarm slideshows finalize --slideshow-id <id> [--slides-json <json>]', 'Prepare or run slideshow export/finalization.', 'prepare_finalize_slideshow', {
    requiredFlags: ['--slideshow-id'],
    optionalFlags: ['--slides-json', '--wait', '--yes', '--dry-run'],
    examples: ['reelsfarm slideshows finalize --slideshow-id sl_123 --agent'],
  }),
  fromTool('social.accounts', 'reelsfarm social accounts', 'List OAuth social accounts.', 'list_social_accounts', {
    examples: ['reelsfarm social accounts --agent'],
  }),
  fromTool('social.connected', 'reelsfarm social connected', 'List all connected publishing accounts.', 'list_connected_accounts', {
    examples: ['reelsfarm social connected --agent'],
  }),
  fromTool('posts.list', 'reelsfarm posts list [--status <status>] [--limit <n>]', 'List scheduled posts.', 'list_scheduled_posts', {
    optionalFlags: ['--status', '--limit'],
    examples: ['reelsfarm posts list --status SCHEDULED --agent'],
  }),
  fromTool('posts.status', 'reelsfarm posts status --id <id>', 'Get publish status for a scheduled post.', 'get_publish_status', {
    requiredFlags: ['--id'],
    examples: ['reelsfarm posts status --id post_123 --agent'],
  }),
  fromTool('posts.optimal-times', 'reelsfarm posts optimal-times [--platform <platform>] [--limit <n>]', 'Get recommended posting times.', 'get_optimal_posting_times', {
    optionalFlags: ['--platform', '--limit'],
    examples: ['reelsfarm posts optimal-times --platform tiktok --agent'],
  }),
  fromTool('posts.schedule', 'reelsfarm posts schedule --content-type <type> --content-id <id> --when <date> --platforms <items>', 'Prepare or run scheduled publishing.', 'prepare_schedule_post', {
    requiredFlags: ['--content-type', '--content-id', '--when', '--platforms'],
    optionalFlags: ['--caption', '--yes', '--dry-run'],
    examples: ['reelsfarm posts schedule --content-type slideshow --content-id sl_123 --when 2026-07-01T15:00:00Z --platforms tiktok:conn_123 --agent'],
  }),
  fromTool('posts.publish-now', 'reelsfarm posts publish-now --content-type <type> --content-id <id> --platforms <items>', 'Prepare or run immediate publishing.', 'prepare_publish_now', {
    requiredFlags: ['--content-type', '--content-id', '--platforms'],
    optionalFlags: ['--caption', '--yes', '--dry-run'],
    examples: ['reelsfarm posts publish-now --content-type video --content-id vid_123 --platforms tiktok:conn_123 --agent'],
  }),
  fromTool('posts.update', 'reelsfarm posts update --id <id> [--when <date>] [--caption <caption>]', 'Prepare or run scheduled post updates.', 'prepare_update_scheduled_post', {
    requiredFlags: ['--id'],
    optionalFlags: ['--when', '--caption', '--yes', '--dry-run'],
    examples: ['reelsfarm posts update --id post_123 --when 2026-07-01T16:00:00Z --agent'],
  }),
  fromTool('posts.delete', 'reelsfarm posts delete --id <id>', 'Prepare or run scheduled post deletion.', 'prepare_delete_scheduled_post', {
    requiredFlags: ['--id'],
    optionalFlags: ['--yes', '--dry-run'],
    examples: ['reelsfarm posts delete --id post_123 --agent'],
  }),
  fromTool('posts.cancel', 'reelsfarm posts cancel --id <id>', 'Cancel a scheduled post directly.', 'cancel_scheduled_post', {
    requiredFlags: ['--id'],
    optionalFlags: ['--yes', '--dry-run'],
    destructive: true,
    examples: ['reelsfarm posts cancel --id post_123 --agent --yes'],
  }),
  fromTool('assets.list', 'reelsfarm assets list --category <category> [--limit <n>]', 'List user assets by category.', 'list_assets', {
    requiredFlags: ['--category'],
    optionalFlags: ['--limit'],
    examples: ['reelsfarm assets list --category products --agent'],
  }),
  fromTool('assets.search', 'reelsfarm assets search <query> [--category <category>]', 'Search user assets.', 'search_assets', {
    requiredFlags: ['<query>'],
    optionalFlags: ['--category'],
    examples: ['reelsfarm assets search "shoe" --category products --agent'],
  }),
  fromTool('assets.import', 'reelsfarm assets import --category <category> --url <url> [--name <name>]', 'Import media from a URL.', 'import_media_from_url', {
    requiredFlags: ['--category', '--url'],
    optionalFlags: ['--name'],
    examples: ['reelsfarm assets import --category products --url https://example.com/product.png --agent'],
  }),
  fromTool('assets.import-bulk', 'reelsfarm assets import-bulk --category <category> --items-json <json>', 'Import multiple media URLs.', 'bulk_import_media', {
    requiredFlags: ['--category', '--items-json'],
    examples: ['reelsfarm assets import-bulk --category products --items-json \'[{"url":"https://example.com/a.png"}]\' --agent'],
  }),
  fromTool('automations.list', 'reelsfarm automations list', 'List automations.', 'list_automations', {
    examples: ['reelsfarm automations list --agent'],
  }),
  fromTool('automations.create', 'reelsfarm automations create --json-definition <json>', 'Prepare or run automation creation.', 'prepare_create_automation', {
    requiredFlags: ['--json-definition'],
    optionalFlags: ['--yes', '--dry-run'],
    examples: ['reelsfarm automations create --json-definition \'{"name":"Daily TikTok"}\' --agent'],
  }),
  fromTool('automations.update', 'reelsfarm automations update --id <id> --json-definition <json>', 'Prepare or run automation updates.', 'prepare_update_automation', {
    requiredFlags: ['--id', '--json-definition'],
    optionalFlags: ['--yes', '--dry-run'],
    examples: ['reelsfarm automations update --id auto_123 --json-definition \'{"status":"paused"}\' --agent'],
  }),
  fromTool('automations.delete', 'reelsfarm automations delete --id <id>', 'Prepare or run automation deletion.', 'prepare_delete_automation', {
    requiredFlags: ['--id'],
    optionalFlags: ['--yes', '--dry-run'],
    examples: ['reelsfarm automations delete --id auto_123 --agent'],
  }),
  fromTool('webhooks.list', 'reelsfarm webhooks list', 'List webhooks.', 'list_webhooks', {
    examples: ['reelsfarm webhooks list --agent'],
  }),
  fromTool('webhooks.create', 'reelsfarm webhooks create --url <url> [--events <events>]', 'Create a webhook.', 'create_webhook', {
    requiredFlags: ['--url'],
    optionalFlags: ['--events'],
    examples: ['reelsfarm webhooks create --url https://example.com/webhook --events post.published --agent'],
  }),
  fromTool('webhooks.delete', 'reelsfarm webhooks delete --id <id>', 'Delete a webhook directly.', 'delete_webhook', {
    requiredFlags: ['--id'],
    optionalFlags: ['--yes', '--dry-run'],
    destructive: true,
    examples: ['reelsfarm webhooks delete --id wh_123 --agent --yes'],
  }),
  fromTool('events.recent', 'reelsfarm events recent [--limit <n>] [--type <type>]', 'List recent account events.', 'get_recent_events', {
    optionalFlags: ['--limit', '--type'],
    examples: ['reelsfarm events recent --limit 20 --agent'],
  }),
  fromTool('validate.caption', 'reelsfarm validate caption <text> --platforms <items>', 'Validate caption text for target platforms.', 'validate_caption', {
    requiredFlags: ['<text>', '--platforms'],
    examples: ['reelsfarm validate caption "Launch day" --platforms tiktok,instagram --agent'],
  }),
  fromTool('confirm', 'reelsfarm confirm <confirmationId>', 'Execute a prepared action by confirmation ID.', 'confirm_action', {
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
