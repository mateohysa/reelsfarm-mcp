#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { Command } from 'commander';
import {
  ReelsFarmAuthError,
  ReelsFarmClient,
  ReelsFarmConfirmationError,
  ReelsFarmRateLimitError,
  ReelsFarmTimeoutError,
  ReelsFarmToolError,
  ReelsFarmValidationError,
  type JsonObject,
  type PlatformTarget,
  type PreparedAction,
  type ReelsFarmClientOptions,
} from '../src/index.js';
import { DEFAULT_MCP_SERVER_URL, DEFAULT_PROFILE, SDK_VERSION } from '../src/constants.js';
import { resolveOptions } from '../src/transport/connection.js';
import { extractStructuredContent } from '../src/utils/result.js';
import { clearProfile, loadProfile, saveProfile } from '../src/auth/config-store.js';
import { agentCommandRegistry, getAgentCommandGroups } from './agent-registry.js';
import { output, printJson, type OutputStream } from './format.js';

type GlobalOptions = {
  json?: boolean;
  serverUrl?: string;
  apiKey?: string;
  profile?: string;
  wait?: boolean;
  timeout?: string;
  dryRun?: boolean;
  agent?: boolean;
  yes?: boolean;
};

export interface BuildProgramOptions {
  clientFactory?: (options: ReelsFarmClientOptions) => ReelsFarmClient;
  stdout?: OutputStream;
  stderr?: OutputStream;
}

class AgentSafetyError extends Error {
  readonly nextStep: string;

  constructor(message: string, nextStep: string) {
    super(message);
    this.name = 'ReelsFarmAgentSafetyError';
    this.nextStep = nextStep;
  }
}

function isTruthy(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function isAgentMode(opts: GlobalOptions): boolean {
  return Boolean(opts.agent) || isTruthy(process.env.REELSFARM_AGENT_MODE);
}

function isMachineReadable(opts: GlobalOptions): boolean {
  return isAgentMode(opts) || Boolean(opts.json);
}

function makeClient(command: Command, buildOptions: BuildProgramOptions): ReelsFarmClient {
  const opts = command.optsWithGlobals<GlobalOptions>();
  const agentMode = isAgentMode(opts);
  const clientOptions: ReelsFarmClientOptions = {
    apiKey: opts.apiKey,
    serverUrl: opts.serverUrl,
    profile: opts.profile,
    dryRun: Boolean(opts.dryRun || (agentMode && !opts.yes)),
    timeoutMs: opts.timeout ? Number(opts.timeout) : undefined,
  };
  return buildOptions.clientFactory ? buildOptions.clientFactory(clientOptions) : new ReelsFarmClient(clientOptions);
}

function commandPath(command: Command): string {
  const parts: string[] = [];
  for (let current: Command | undefined = command; current?.parent; current = current.parent) {
    parts.unshift(current.name());
  }
  return parts.join('.');
}

function isPreparedAction(value: unknown): value is PreparedAction {
  return Boolean(value && typeof value === 'object' && typeof (value as PreparedAction).confirmationId === 'string');
}

function agentSuccess(command: string, data: unknown): JsonObject {
  if (isPreparedAction(data)) {
    const id = data.confirmationId;
    return {
      ok: true,
      command,
      requiresConfirmation: true,
      confirmation: {
        id,
        expiresAt: data.expiresAt,
        summary: data.summary,
        creditEstimate: data.creditEstimate ?? null,
      },
      nextStep: 'reelsfarm confirm ' + id + ' --agent',
    };
  }

  return {
    ok: true,
    command,
    data: data ?? null,
  };
}

function errorEnvelope(error: unknown): JsonObject {
  const message = error instanceof Error ? error.message : String(error);
  const type = error instanceof Error ? error.name : 'Error';
  const lower = message.toLowerCase();
  let code = 'UNKNOWN_ERROR';
  let retryable = false;
  let nextStep: string | undefined;

  if (error instanceof AgentSafetyError) {
    code = 'CONFIRMATION_REQUIRED';
    nextStep = error.nextStep;
  } else if (error instanceof ReelsFarmAuthError || lower.includes('missing token') || lower.includes('unauthorized')) {
    code = lower.includes('missing') ? 'AUTH_MISSING' : 'AUTH_REQUIRED';
    nextStep = 'Run reelsfarm login --api-key <key>';
  } else if (error instanceof ReelsFarmRateLimitError) {
    code = 'RATE_LIMITED';
    retryable = true;
    nextStep = 'Retry after the rate limit resets.';
  } else if (error instanceof ReelsFarmValidationError || error instanceof SyntaxError || lower.includes('invalid')) {
    code = 'VALIDATION_ERROR';
    nextStep = 'Run reelsfarm agent commands to inspect required flags and examples.';
  } else if (error instanceof ReelsFarmConfirmationError) {
    code = 'CONFIRMATION_FAILED';
    nextStep = 'Prepare the action again, then run reelsfarm confirm <confirmationId> --agent.';
  } else if (error instanceof ReelsFarmTimeoutError) {
    code = 'TIMEOUT';
    retryable = true;
    nextStep = 'Retry with --timeout <ms> or check the job status command.';
  } else if (error instanceof ReelsFarmToolError) {
    code = 'TOOL_ERROR';
  }

  const body: JsonObject = {
    code,
    type,
    message,
    retryable,
  };
  if (nextStep) body.nextStep = nextStep;
  return { ok: false, error: body };
}

function writeFailure(error: unknown, opts: GlobalOptions, buildOptions: BuildProgramOptions): void {
  if (isMachineReadable(opts)) {
    printJson(errorEnvelope(error), buildOptions.stdout);
  } else {
    const message = error instanceof Error ? error.message : String(error);
    (buildOptions.stderr || process.stderr).write(message + '\n');
  }
  process.exitCode = 1;
}

function writeResult(command: Command, result: unknown, opts: GlobalOptions, buildOptions: BuildProgramOptions, forceJson = false): void {
  if (isAgentMode(opts)) {
    printJson(agentSuccess(commandPath(command), result), buildOptions.stdout);
    return;
  }
  output(result, Boolean(opts.json || forceJson), buildOptions.stdout);
}

async function run(
  command: Command,
  action: (client: ReelsFarmClient, opts: GlobalOptions) => Promise<unknown>,
  buildOptions: BuildProgramOptions,
): Promise<void> {
  const opts = command.optsWithGlobals<GlobalOptions>();
  let client: ReelsFarmClient | undefined;
  try {
    client = makeClient(command, buildOptions);
    const result = await action(client, opts);
    await client.close();
    writeResult(command, result, opts, buildOptions);
  } catch (error) {
    await client?.close().catch(() => undefined);
    writeFailure(error, opts, buildOptions);
  }
}

async function runLocal(
  command: Command,
  action: (opts: GlobalOptions) => Promise<unknown> | unknown,
  buildOptions: BuildProgramOptions,
  options: { forceJson?: boolean } = {},
): Promise<void> {
  const opts = command.optsWithGlobals<GlobalOptions>();
  try {
    const result = await action(opts);
    writeResult(command, result, opts, buildOptions, Boolean(options.forceJson));
  } catch (error) {
    writeFailure(error, opts, buildOptions);
  }
}

function guardDirectDestructive(opts: GlobalOptions, commandName: string): JsonObject | undefined {
  if (!isAgentMode(opts)) return undefined;
  const cliCommand = commandName.replace(/\./g, ' ');
  const nextStep = 'Run reelsfarm ' + cliCommand + ' --agent --yes after verifying the target resource.';
  if (opts.dryRun) {
    return {
      dryRun: true,
      skipped: true,
      reason: 'Agent mode dry-run does not execute direct destructive commands.',
      nextStep,
    };
  }
  if (!opts.yes) {
    throw new AgentSafetyError('Agent mode requires --yes for direct destructive command: ' + commandName, nextStep);
  }
  return undefined;
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

export function buildProgram(buildOptions: BuildProgramOptions = {}): Command {
  const program = new Command();
  program
    .name('reelsfarm')
    .description('CLI for the ReelsFarm MCP SDK')
    .option('--json', 'print JSON output')
    .option('--agent', 'print strict agent-ready JSON envelopes')
    .option('--server-url <url>', 'MCP server URL')
    .option('--api-key <key>', 'ReelsFarm MCP API key')
    .option('--profile <name>', 'credential profile', DEFAULT_PROFILE)
    .option('--wait', 'wait for async job completion')
    .option('--timeout <ms>', 'timeout in milliseconds')
    .option('--dry-run', 'prepare actions without confirming them')
    .option('--yes', 'execute agent-mode write/destructive actions without returning a confirmation first');

  program.command('login')
    .option('--api-key <key>', 'store an MCP API key')
    .option('--server-url <url>', 'server URL', DEFAULT_MCP_SERVER_URL)
    .option('--oauth', 'use OAuth browser login')
    .action(async (opts, command) => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      const profile = globals.profile || DEFAULT_PROFILE;
      if (opts.apiKey) {
        saveProfile(profile, { ...loadProfile(profile), apiKey: opts.apiKey, serverUrl: opts.serverUrl });
        if (isMachineReadable(globals)) {
          writeResult(command, { stored: true, profile, serverUrl: opts.serverUrl }, globals, buildOptions);
        } else {
          (buildOptions.stdout || process.stdout).write('Stored ReelsFarm credentials for profile ' + profile + '\n');
        }
        return;
      }
      if (isMachineReadable(globals)) {
        writeFailure(new ReelsFarmValidationError('Interactive OAuth login is not supported in machine-readable mode. Use --api-key.'), globals, buildOptions);
        return;
      }
      const port = 3456;
      const redirectUri = 'http://127.0.0.1:' + port + '/callback';
      let authUrl = '';
      const clientOptions: ReelsFarmClientOptions = {
        serverUrl: opts.serverUrl,
        profile,
        oauth: {
          redirectUri,
          onAuthorizationUrl: (url) => {
            authUrl = url;
            (buildOptions.stdout || process.stdout).write('Open this URL to authorize ReelsFarm:\n' + url + '\n');
            try { openUrl(url); } catch { /* best effort */ }
          },
        },
      };
      const client = buildOptions.clientFactory ? buildOptions.clientFactory(clientOptions) : new ReelsFarmClient(clientOptions);
      const callback = waitForOAuthCallback(port);
      await client.raw.listTools().catch(() => undefined);
      if (!authUrl) throw new Error('OAuth authorization URL was not produced');
      const code = await callback;
      await client.completeOAuth(code);
      await client.close();
      saveProfile(profile, { ...loadProfile(profile), serverUrl: opts.serverUrl });
      (buildOptions.stdout || process.stdout).write('OAuth login complete for profile ' + profile + '\n');
    });

  program.command('logout').action((_, command) => {
    return runLocal(command, (globals) => {
      const guarded = guardDirectDestructive(globals, 'logout');
      if (guarded) return guarded;
      const profile = globals.profile || DEFAULT_PROFILE;
      clearProfile(profile);
      return isMachineReadable(globals) ? { loggedOut: true, profile } : 'Logged out';
    }, buildOptions);
  });

  program.command('whoami').action((_, command) => run(command, (client) => client.account.get(), buildOptions));

  const account = program.command('account');
  account.command('status').action((_, command) => run(command, (client) => client.account.status(), buildOptions));

  const avatars = program.command('avatars');
  avatars.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.avatars.list({ limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  avatars.command('generate').requiredOption('--prompt <prompt>').option('--model <model>').option('--reference-url <url>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.avatars.generate({ prompt: opts.prompt, model: opts.model, referenceUrl: opts.referenceUrl }), globals), buildOptions));

  const hooks = program.command('hooks');
  hooks.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.hooks.list({ limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  hooks.command('templates').option('--limit <n>').action((opts, command) => run(command, (client) => client.hooks.listTemplates({ limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  hooks.command('generate').requiredOption('--avatar-url <url>').option('--preset <preset>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.hooks.generate({ avatarUrl: opts.avatarUrl, preset: opts.preset }), globals), buildOptions));

  const slideshows = program.command('slideshows');
  slideshows.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.slideshows.list({ limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  slideshows.command('get').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.slideshows.get(opts.id), buildOptions));
  slideshows.command('create').requiredOption('--slides-json <json>').option('--title <title>').action((opts, command) => run(command, (client) => client.slideshows.create({ title: opts.title, slides: JSON.parse(opts.slidesJson) }), buildOptions));
  slideshows.command('generate-text').requiredOption('--prompt <prompt>').option('--type <type>').option('--slide-count <n>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.slideshows.generateText({ prompt: opts.prompt, slideshowType: opts.type, slideCount: opts.slideCount ? Number(opts.slideCount) : undefined }), globals), buildOptions));
  slideshows.command('finalize').requiredOption('--slideshow-id <id>').option('--slides-json <json>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.slideshows.finalize({ slideshowId: opts.slideshowId, slides: opts.slidesJson ? JSON.parse(opts.slidesJson) : undefined }), globals), buildOptions));

  const social = program.command('social');
  social.command('accounts').action((_, command) => run(command, (client) => client.social.list(), buildOptions));
  social.command('connected').action((_, command) => run(command, (client) => client.social.listConnected(), buildOptions));

  const posts = program.command('posts');
  posts.command('list').option('--status <status>').option('--limit <n>').action((opts, command) => run(command, (client) => client.posts.list({ status: opts.status, limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  posts.command('status').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.posts.getStatus(opts.id), buildOptions));
  posts.command('optimal-times').option('--platform <platform>').option('--limit <n>').action((opts, command) => run(command, (client) => client.posts.getOptimalTimes({ platform: opts.platform, limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  posts.command('schedule').requiredOption('--content-type <type>').requiredOption('--content-id <id>').requiredOption('--when <date>').requiredOption('--platforms <items>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.schedule({ contentType: opts.contentType, contentId: opts.contentId, scheduledFor: opts.when, platforms: parsePlatforms(opts.platforms), caption: opts.caption }), buildOptions));
  posts.command('publish-now').requiredOption('--content-type <type>').requiredOption('--content-id <id>').requiredOption('--platforms <items>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.publishNow({ contentType: opts.contentType, contentId: opts.contentId, platforms: parsePlatforms(opts.platforms), caption: opts.caption }), buildOptions));
  posts.command('update').requiredOption('--id <id>').option('--when <date>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.update(opts.id, { scheduledFor: opts.when, caption: opts.caption }), buildOptions));
  posts.command('cancel').requiredOption('--id <id>').action((opts, command) => run(command, (client, globals) => {
    const guarded = guardDirectDestructive(globals, 'posts.cancel');
    if (guarded) return Promise.resolve(guarded);
    return client.posts.cancel(opts.id);
  }, buildOptions));
  posts.command('delete').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.posts.delete(opts.id), buildOptions));

  const assets = program.command('assets');
  assets.command('list').requiredOption('--category <category>').option('--limit <n>').action((opts, command) => run(command, (client) => client.assets.list(opts.category, { limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  assets.command('search').argument('<query>').option('--category <category>').action((query, opts, command) => run(command, (client) => client.assets.search(query, { category: opts.category }), buildOptions));
  assets.command('import').requiredOption('--category <category>').requiredOption('--url <url>').option('--name <name>').action((opts, command) => run(command, (client) => client.assets.import({ category: opts.category, url: opts.url, name: opts.name }), buildOptions));
  assets.command('import-bulk').requiredOption('--category <category>').requiredOption('--items-json <json>').action((opts, command) => run(command, (client) => client.assets.importBulk({ category: opts.category, items: JSON.parse(opts.itemsJson) }), buildOptions));

  const automations = program.command('automations');
  automations.command('list').action((_, command) => run(command, (client) => client.automations.list(), buildOptions));
  automations.command('create').requiredOption('--json-definition <json>').action((opts, command) => run(command, (client) => client.automations.create(JSON.parse(opts.jsonDefinition) as JsonObject), buildOptions));
  automations.command('update').requiredOption('--id <id>').requiredOption('--json-definition <json>').action((opts, command) => run(command, (client) => client.automations.update(opts.id, JSON.parse(opts.jsonDefinition) as JsonObject), buildOptions));
  automations.command('delete').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.automations.delete(opts.id), buildOptions));

  const webhooks = program.command('webhooks');
  webhooks.command('list').action((_, command) => run(command, (client) => client.webhooks.list(), buildOptions));
  webhooks.command('create').requiredOption('--url <url>').option('--events <events>').action((opts, command) => run(command, (client) => client.webhooks.create({ url: opts.url, events: opts.events ? String(opts.events).split(',') : undefined }), buildOptions));
  webhooks.command('delete').requiredOption('--id <id>').action((opts, command) => run(command, (client, globals) => {
    const guarded = guardDirectDestructive(globals, 'webhooks.delete');
    if (guarded) return Promise.resolve(guarded);
    return client.webhooks.delete(opts.id);
  }, buildOptions));

  const events = program.command('events');
  events.command('recent').option('--limit <n>').option('--type <type>').action((opts, command) => run(command, (client) => client.events.recent({ limit: opts.limit ? Number(opts.limit) : undefined, type: opts.type }), buildOptions));

  const validate = program.command('validate');
  validate.command('caption').argument('<text>').requiredOption('--platforms <items>').action((text, opts, command) => run(command, (client) => client.validate.caption(text, String(opts.platforms).split(',').map((item) => item.toUpperCase() as PlatformTarget['platform'])), buildOptions));

  program.command('confirm').argument('<confirmationId>').action((confirmationId, _opts, command) => run(command, async (client) => {
    const result = await client.raw.callTool('confirm_action', { confirmationId });
    return extractStructuredContent(result);
  }, buildOptions));

  const agent = program.command('agent');
  agent.command('commands').action((_, command) => runLocal(command, () => ({
    version: SDK_VERSION,
    commands: agentCommandRegistry,
  }), buildOptions, { forceJson: true }));
  agent.command('status').action((_, command) => runLocal(command, async (globals) => {
    const resolved = resolveOptions({
      apiKey: globals.apiKey,
      serverUrl: globals.serverUrl,
      profile: globals.profile,
      timeoutMs: globals.timeout ? Number(globals.timeout) : undefined,
    });
    const hasCredential = Boolean(resolved.apiKey || resolved.accessToken);
    let accountStatus: JsonObject = { state: hasCredential ? 'unknown' : 'missing_credentials' };

    if (hasCredential) {
      const client = makeClient(command, buildOptions);
      try {
        accountStatus = { state: 'authenticated', account: await client.account.get() };
      } catch (error) {
        accountStatus = { state: 'error', error: errorEnvelope(error).error };
      } finally {
        await client.close().catch(() => undefined);
      }
    }

    return {
      version: SDK_VERSION,
      endpoint: resolved.serverUrl,
      profile: resolved.profile,
      agentMode: isAgentMode(globals),
      hasCredential,
      accountStatus,
      commandGroups: getAgentCommandGroups(),
    };
  }, buildOptions, { forceJson: true }));

  program.command('completion').argument('[shell]').action((shell = 'bash') => {
    const commands = 'login logout whoami account avatars hooks slideshows social posts assets automations webhooks events validate confirm agent completion';
    const script = shell === 'zsh'
      ? '#compdef reelsfarm\n_reelsfarm() { compadd ' + commands + ' }\n_reelsfarm "$@"'
      : 'complete -W "' + commands + '" reelsfarm';
    (buildOptions.stdout || process.stdout).write(script + '\n');
  });

  return program;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  void buildProgram().parseAsync(process.argv);
}
