#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { Command } from 'commander';
import { ReelsFarmClient, type JsonObject, type PlatformTarget } from '../src/index.js';
import { DEFAULT_MCP_SERVER_URL, DEFAULT_PROFILE } from '../src/constants.js';
import { clearProfile, loadProfile, saveProfile } from '../src/auth/config-store.js';
import { output } from './format.js';

type GlobalOptions = {
  json?: boolean;
  serverUrl?: string;
  apiKey?: string;
  profile?: string;
  wait?: boolean;
  timeout?: string;
  dryRun?: boolean;
};

function makeClient(command: Command): ReelsFarmClient {
  const opts = command.optsWithGlobals<GlobalOptions>();
  return new ReelsFarmClient({
    apiKey: opts.apiKey,
    serverUrl: opts.serverUrl,
    profile: opts.profile,
    dryRun: opts.dryRun,
    timeoutMs: opts.timeout ? Number(opts.timeout) : undefined,
  });
}

async function run(command: Command, action: (client: ReelsFarmClient, opts: GlobalOptions) => Promise<unknown>): Promise<void> {
  const opts = command.optsWithGlobals<GlobalOptions>();
  try {
    const client = makeClient(command);
    const result = await action(client, opts);
    await client.close();
    output(result, Boolean(opts.json));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

function parsePlatforms(value: string): PlatformTarget[] {
  return value.split(',').filter(Boolean).map((item) => {
    const [platformRaw, connectionId] = item.split(':');
    if (!platformRaw || !connectionId) throw new Error('Platforms must be platform:connectionId pairs');
    return { platform: platformRaw.toUpperCase() as PlatformTarget['platform'], connectionId };
  });
}

async function maybeWait(value: unknown, opts: GlobalOptions): Promise<unknown> {
  if (opts.wait && value && typeof value === 'object' && 'wait' in value && typeof (value as { wait?: unknown }).wait === 'function') {
    return await (value as { wait: (options?: { timeoutMs?: number }) => Promise<unknown> }).wait({ timeoutMs: opts.timeout ? Number(opts.timeout) : undefined });
  }
  return value;
}

async function waitForOAuthCallback(port: number): Promise<string> {
  return await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1:' + port);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      if (code) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<h1>ReelsFarm login complete</h1><p>You can close this tab.</p>');
        server.close();
        resolve(code);
      } else if (error) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(error);
        server.close();
        reject(new Error(error));
      }
    });
    server.listen(port, '127.0.0.1');
  });
}

function openUrl(url: string): void {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('reelsfarm')
    .description('CLI for the ReelsFarm MCP SDK')
    .option('--json', 'print JSON output')
    .option('--server-url <url>', 'MCP server URL')
    .option('--api-key <key>', 'ReelsFarm MCP API key')
    .option('--profile <name>', 'credential profile', DEFAULT_PROFILE)
    .option('--wait', 'wait for async job completion')
    .option('--timeout <ms>', 'timeout in milliseconds')
    .option('--dry-run', 'prepare actions without confirming them');

  program.command('login')
    .option('--api-key <key>', 'store an MCP API key')
    .option('--server-url <url>', 'server URL', DEFAULT_MCP_SERVER_URL)
    .option('--oauth', 'use OAuth browser login')
    .action(async (opts, command) => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      const profile = globals.profile || DEFAULT_PROFILE;
      if (opts.apiKey) {
        saveProfile(profile, { ...loadProfile(profile), apiKey: opts.apiKey, serverUrl: opts.serverUrl });
        console.log('Stored ReelsFarm credentials for profile ' + profile);
        return;
      }
      const port = 3456;
      const redirectUri = 'http://127.0.0.1:' + port + '/callback';
      let authUrl = '';
      const client = new ReelsFarmClient({
        serverUrl: opts.serverUrl,
        profile,
        oauth: {
          redirectUri,
          onAuthorizationUrl: (url) => {
            authUrl = url;
            console.log('Open this URL to authorize ReelsFarm:');
            console.log(url);
            try { openUrl(url); } catch { /* best effort */ }
          },
        },
      });
      const callback = waitForOAuthCallback(port);
      await client.raw.listTools().catch(() => undefined);
      if (!authUrl) throw new Error('OAuth authorization URL was not produced');
      const code = await callback;
      await client.completeOAuth(code);
      await client.close();
      saveProfile(profile, { ...loadProfile(profile), serverUrl: opts.serverUrl });
      console.log('OAuth login complete for profile ' + profile);
    });

  program.command('logout').action((_, command) => {
    const globals = command.optsWithGlobals() as GlobalOptions;
    clearProfile(globals.profile || DEFAULT_PROFILE);
    console.log('Logged out');
  });

  program.command('whoami').action((_, command) => run(command, (client) => client.account.get()));

  const account = program.command('account');
  account.command('status').action((_, command) => run(command, (client) => client.account.status()));

  const avatars = program.command('avatars');
  avatars.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.avatars.list({ limit: opts.limit ? Number(opts.limit) : undefined })));
  avatars.command('generate').requiredOption('--prompt <prompt>').option('--model <model>').option('--reference-url <url>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.avatars.generate({ prompt: opts.prompt, model: opts.model, referenceUrl: opts.referenceUrl }), globals)));

  const hooks = program.command('hooks');
  hooks.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.hooks.list({ limit: opts.limit ? Number(opts.limit) : undefined })));
  hooks.command('templates').option('--limit <n>').action((opts, command) => run(command, (client) => client.hooks.listTemplates({ limit: opts.limit ? Number(opts.limit) : undefined })));
  hooks.command('generate').requiredOption('--avatar-url <url>').option('--preset <preset>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.hooks.generate({ avatarUrl: opts.avatarUrl, preset: opts.preset }), globals)));

  const slideshows = program.command('slideshows');
  slideshows.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.slideshows.list({ limit: opts.limit ? Number(opts.limit) : undefined })));
  slideshows.command('get').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.slideshows.get(opts.id)));
  slideshows.command('create').requiredOption('--slides-json <json>').option('--title <title>').action((opts, command) => run(command, (client) => client.slideshows.create({ title: opts.title, slides: JSON.parse(opts.slidesJson) })));
  slideshows.command('generate-text').requiredOption('--prompt <prompt>').option('--type <type>').option('--slide-count <n>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.slideshows.generateText({ prompt: opts.prompt, slideshowType: opts.type, slideCount: opts.slideCount ? Number(opts.slideCount) : undefined }), globals)));
  slideshows.command('finalize').requiredOption('--slideshow-id <id>').option('--slides-json <json>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.slideshows.finalize({ slideshowId: opts.slideshowId, slides: opts.slidesJson ? JSON.parse(opts.slidesJson) : undefined }), globals)));

  const posts = program.command('posts');
  posts.command('list').option('--status <status>').option('--limit <n>').action((opts, command) => run(command, (client) => client.posts.list({ status: opts.status, limit: opts.limit ? Number(opts.limit) : undefined })));
  posts.command('schedule').requiredOption('--content-type <type>').requiredOption('--content-id <id>').requiredOption('--when <date>').requiredOption('--platforms <items>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.schedule({ contentType: opts.contentType, contentId: opts.contentId, scheduledFor: opts.when, platforms: parsePlatforms(opts.platforms), caption: opts.caption })));
  posts.command('publish-now').requiredOption('--content-type <type>').requiredOption('--content-id <id>').requiredOption('--platforms <items>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.publishNow({ contentType: opts.contentType, contentId: opts.contentId, platforms: parsePlatforms(opts.platforms), caption: opts.caption })));
  posts.command('update').requiredOption('--id <id>').option('--when <date>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.update(opts.id, { scheduledFor: opts.when, caption: opts.caption })));
  posts.command('cancel').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.posts.cancel(opts.id)));
  posts.command('delete').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.posts.delete(opts.id)));

  const assets = program.command('assets');
  assets.command('list').requiredOption('--category <category>').option('--limit <n>').action((opts, command) => run(command, (client) => client.assets.list(opts.category, { limit: opts.limit ? Number(opts.limit) : undefined })));
  assets.command('search').argument('<query>').option('--category <category>').action((query, opts, command) => run(command, (client) => client.assets.search(query, { category: opts.category })));
  assets.command('import').requiredOption('--category <category>').requiredOption('--url <url>').option('--name <name>').action((opts, command) => run(command, (client) => client.assets.import({ category: opts.category, url: opts.url, name: opts.name })));
  assets.command('import-bulk').requiredOption('--category <category>').requiredOption('--items-json <json>').action((opts, command) => run(command, (client) => client.assets.importBulk({ category: opts.category, items: JSON.parse(opts.itemsJson) })));

  const automations = program.command('automations');
  automations.command('list').action((_, command) => run(command, (client) => client.automations.list()));
  automations.command('create').requiredOption('--json-definition <json>').action((opts, command) => run(command, (client) => client.automations.create(JSON.parse(opts.jsonDefinition) as JsonObject)));
  automations.command('update').requiredOption('--id <id>').requiredOption('--json-definition <json>').action((opts, command) => run(command, (client) => client.automations.update(opts.id, JSON.parse(opts.jsonDefinition) as JsonObject)));
  automations.command('delete').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.automations.delete(opts.id)));

  const webhooks = program.command('webhooks');
  webhooks.command('list').action((_, command) => run(command, (client) => client.webhooks.list()));
  webhooks.command('create').requiredOption('--url <url>').option('--events <events>').action((opts, command) => run(command, (client) => client.webhooks.create({ url: opts.url, events: opts.events ? String(opts.events).split(',') : undefined })));
  webhooks.command('delete').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.webhooks.delete(opts.id)));

  const events = program.command('events');
  events.command('recent').option('--limit <n>').option('--type <type>').action((opts, command) => run(command, (client) => client.events.recent({ limit: opts.limit ? Number(opts.limit) : undefined, type: opts.type })));

  const validate = program.command('validate');
  validate.command('caption').argument('<text>').requiredOption('--platforms <items>').action((text, opts, command) => run(command, (client) => client.validate.caption(text, String(opts.platforms).split(',').map((item) => item.toUpperCase() as any))));

  program.command('completion').argument('[shell]').action((shell = 'bash') => {
    const script = shell === 'zsh'
      ? '#compdef reelsfarm\n_reelsfarm() { compadd login logout whoami account avatars hooks slideshows posts assets automations webhooks events validate completion }\n_reelsfarm "$@"'
      : 'complete -W "login logout whoami account avatars hooks slideshows posts assets automations webhooks events validate completion" reelsfarm';
    console.log(script);
  });

  return program;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  void buildProgram().parseAsync(process.argv);
}
