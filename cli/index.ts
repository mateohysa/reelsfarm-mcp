#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { Command } from 'commander';
import {
  ReelsFarmAuthError,
  ReelsFarmAuthorizationError,
  ReelsFarmClient,
  ReelsFarmConfirmationError,
  ReelsFarmError,
  ReelsFarmIdempotencyError,
  ReelsFarmOperationInProgressError,
  ReelsFarmPlanLimitError,
  ReelsFarmPolicyError,
  ReelsFarmRateLimitError,
  ReelsFarmTimeoutError,
  ReelsFarmToolError,
  ReelsFarmValidationError,
  type JsonObject,
  type GalleryFeedKind,
  type PlatformTarget,
  type PreparedAction,
  type ReelsFarmClientOptions,
} from '../src/index.js';
import { DEFAULT_MCP_SERVER_URL, DEFAULT_PROFILE, SDK_VERSION } from '../src/constants.js';
import { resolveOptions } from '../src/transport/connection.js';
import { extractStructuredContent } from '../src/utils/result.js';
import { clearProfile, createProfileTokenStore, loadProfile, saveProfile } from '../src/auth/config-store.js';
import { agentCommandRegistry, getAgentCommandGroups } from './agent-registry.js';
import { output, printJson, type OutputStream } from './format.js';

type GlobalOptions = {
  json?: boolean;
  serverUrl?: string;
  apiKey?: string;
  allowInsecureHttp?: boolean;
  profile?: string;
  wait?: boolean;
  timeout?: string;
  dryRun?: boolean;
  agent?: boolean;
  yes?: boolean;
  idempotencyKey?: string;
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
  const clientOptions: ReelsFarmClientOptions = {
    apiKey: opts.apiKey,
    serverUrl: opts.serverUrl,
    allowInsecureHttp: Boolean(opts.allowInsecureHttp),
    profile: opts.profile,
    dryRun: Boolean(opts.dryRun),
    autoConfirm: Boolean(opts.yes),
    idempotencyKeyFactory: opts.idempotencyKey ? () => opts.idempotencyKey! : undefined,
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
  const retryable = error instanceof ReelsFarmError ? error.retryable : false;
  let nextStep: string | undefined;

  if (error instanceof AgentSafetyError) {
    code = 'CONFIRMATION_REQUIRED';
    nextStep = error.nextStep;
  } else if (error instanceof ReelsFarmAuthError || lower.includes('missing token') || lower.includes('unauthorized')) {
    code = error instanceof ReelsFarmError && error.code ? error.code : 'AUTHENTICATION_REQUIRED';
    nextStep = 'Run reelsfarm login --api-key <key>';
  } else if (error instanceof ReelsFarmPolicyError) {
    code = error.code || 'AUTONOMY_MODE_DENIED';
    nextStep = error.dashboardUrl
      ? `Complete this action in the ReelsFarm dashboard: ${error.dashboardUrl}`
      : 'Review the connection mode and allowed capabilities in ReelsFarm settings.';
  } else if (error instanceof ReelsFarmAuthorizationError) {
    code = error.code || 'INSUFFICIENT_SCOPE';
    nextStep = 'Use a connection whose mode and scopes allow this action.';
  } else if (error instanceof ReelsFarmRateLimitError) {
    code = error.code || 'RATE_LIMITED';
    nextStep = 'Retry after the rate limit resets.';
  } else if (error instanceof ReelsFarmIdempotencyError) {
    code = error.code || 'IDEMPOTENCY_KEY_REUSED';
    nextStep = code === 'IDEMPOTENCY_KEY_REUSED'
      ? 'Use the same key only for the same arguments, or choose a new key for a different logical action.'
      : 'Provide one stable --idempotency-key and reuse it for retries of this logical action.';
  } else if (error instanceof ReelsFarmOperationInProgressError) {
    code = error.code || 'OPERATION_IN_PROGRESS';
    nextStep = error.operationId
      ? `Run reelsfarm operations get --id ${error.operationId} --agent.`
      : 'Poll the original operation instead of preparing another action.';
  } else if (error instanceof ReelsFarmPlanLimitError) {
    code = error.code || 'PLAN_LIMIT_REACHED';
    nextStep = 'Review credits and plan limits in ReelsFarm.';
  } else if (error instanceof ReelsFarmValidationError || error instanceof SyntaxError || lower.includes('invalid')) {
    code = 'VALIDATION_ERROR';
    nextStep = 'Run reelsfarm agent commands to inspect required flags and examples.';
  } else if (error instanceof ReelsFarmConfirmationError) {
    code = error.code || 'CONFIRMATION_FAILED';
    nextStep = error.operationId
      ? `Inspect the original operation with reelsfarm operations get --id ${error.operationId} --agent.`
      : 'Retry the same confirmation ID. Do not prepare a replacement action automatically.';
  } else if (error instanceof ReelsFarmTimeoutError) {
    code = 'TIMEOUT';
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
  if (error instanceof ReelsFarmError && error.operationId) body.operationId = error.operationId;
  if (error instanceof ReelsFarmError && error.dashboardUrl) body.dashboardUrl = error.dashboardUrl;
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

function guardDirectAgentAction(opts: GlobalOptions, commandName: string, kind: 'write' | 'destructive'): JsonObject | undefined {
  if (!isAgentMode(opts)) return undefined;
  const cliCommand = commandName.replace(/\./g, ' ');
  const nextStep = 'Run reelsfarm ' + cliCommand + ' --agent --yes after verifying the target resource.';
  if (opts.dryRun) {
    return {
      dryRun: true,
      skipped: true,
      reason: 'Agent mode dry-run does not execute direct ' + kind + ' commands.',
      nextStep,
    };
  }
  if (!opts.yes) {
    throw new AgentSafetyError('Agent mode requires --yes for direct ' + kind + ' command: ' + commandName, nextStep);
  }
  return undefined;
}

function guardDirectDestructive(opts: GlobalOptions, commandName: string): JsonObject | undefined {
  return guardDirectAgentAction(opts, commandName, 'destructive');
}

function parsePlatforms(value: string): PlatformTarget[] {
  return value.split(',').filter(Boolean).map((item) => {
    const [platformRaw, connectionId] = item.split(':');
    if (!platformRaw || !connectionId) throw new Error('Platforms must be platform:connectionId pairs');
    return { platform: platformRaw.toUpperCase() as PlatformTarget['platform'], connectionId };
  });
}

function parseContentType(value: string): string {
  return value.toUpperCase().replace(/-/g, '_');
}

async function maybeWait(value: unknown, opts: GlobalOptions): Promise<unknown> {
  if (opts.wait && value && typeof value === 'object' && 'wait' in value && typeof (value as { wait?: unknown }).wait === 'function') {
    return await (value as { wait: (options?: { timeoutMs?: number }) => Promise<unknown> }).wait({ timeoutMs: opts.timeout ? Number(opts.timeout) : undefined });
  }
  return value;
}

async function waitForOAuthCallback(port: number): Promise<string> {
  return await new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1:' + port);
      if (url.pathname === '/callback' && (url.searchParams.has('code') || url.searchParams.has('error'))) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<h1>ReelsFarm callback received</h1><p>You can close this tab.</p>');
        server.close();
        resolve(url.toString());
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
    .option('--allow-insecure-http', 'allow a trusted non-loopback HTTP MCP endpoint')
    .option('--api-key <key>', 'ReelsFarm MCP API key')
    .option('--profile <name>', 'credential profile', DEFAULT_PROFILE)
    .option('--wait', 'wait for async job completion')
    .option('--timeout <ms>', 'timeout in milliseconds')
    .option('--dry-run', 'prepare actions without confirming them')
    .option('--yes', 'automatically confirm Review-mode prepared actions')
    .option('--idempotency-key <key>', 'stable key to reuse when retrying one logical mutation');

  program.command('login')
    .option('--api-key <key>', 'store an MCP API key')
    .option('--server-url <url>', 'server URL', DEFAULT_MCP_SERVER_URL)
    .option('--oauth', 'use OAuth browser login')
    .action(async (opts, command) => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      const profile = globals.profile || DEFAULT_PROFILE;
      const apiKey = opts.apiKey || globals.apiKey;
      const serverUrl = opts.serverUrl || globals.serverUrl || DEFAULT_MCP_SERVER_URL;
      if (apiKey) {
        saveProfile(profile, { ...loadProfile(profile), apiKey, serverUrl });
        if (isMachineReadable(globals)) {
          writeResult(command, { stored: true, profile, serverUrl }, globals, buildOptions);
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
        serverUrl,
        allowInsecureHttp: Boolean(globals.allowInsecureHttp),
        profile,
        oauth: {
          redirectUri,
          tokenStore: createProfileTokenStore(profile),
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
      const callbackUrl = await callback;
      await client.completeOAuthCallback(callbackUrl);
      await client.close();
      saveProfile(profile, { ...loadProfile(profile), serverUrl });
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
  avatars.command('templates').option('--limit <n>').option('--cursor <cursor>').action((opts, command) => run(command, (client) => client.avatars.listTemplates({ limit: opts.limit ? Number(opts.limit) : undefined, cursor: opts.cursor }), buildOptions));
  avatars.command('generate')
    .requiredOption('--prompt <prompt>')
    .option('--model <model>')
    .option('--reference-url <url>')
    .option('--conversation-id <id>')
    .option('--parent-generation-id <id>')
    .action((opts, command) => run(command, async (client, globals) => maybeWait(await client.avatars.generate({
      prompt: opts.prompt,
      model: opts.model,
      sourceImageUrl: opts.referenceUrl,
      conversationId: opts.conversationId,
      parentGenerationId: opts.parentGenerationId,
    }), globals), buildOptions));

  const productScenes = program.command('product-scenes');
  productScenes.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.productScenes.list({ limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  productScenes.command('generate')
    .requiredOption('--source-image-url <url>')
    .requiredOption('--product-image-url <url>')
    .requiredOption('--prompt <prompt>')
    .option('--conversation-id <id>')
    .option('--parent-generation-id <id>')
    .action((opts, command) => run(command, async (client, globals) => maybeWait(await client.productScenes.generate({
      sourceImageUrl: opts.sourceImageUrl,
      productImageUrl: opts.productImageUrl,
      prompt: opts.prompt,
      conversationId: opts.conversationId,
      parentGenerationId: opts.parentGenerationId,
    }), globals), buildOptions));
  productScenes.command('delete').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.productScenes.delete(opts.id), buildOptions));

  const hooks = program.command('hooks');
  hooks.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.hooks.list({ limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  hooks.command('templates').option('--limit <n>').action((opts, command) => run(command, (client) => client.hooks.listTemplates({ limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  hooks.command('generate')
    .requiredOption('--avatar-url <url>')
    .option('--preset <preset>')
    .option('--model <model>')
    .option('--duration <seconds>')
    .option('--custom-prompt <prompt>')
    .option('--include-audio')
    .option('--script-text <text>')
    .action((opts, command) => run(command, async (client, globals) => maybeWait(await client.hooks.generate({
      avatarUrl: opts.avatarUrl,
      preset: opts.preset,
      model: opts.model,
      durationSeconds: opts.duration ? Number(opts.duration) : undefined,
      customPrompt: opts.customPrompt,
      includeAudio: Boolean(opts.includeAudio),
      scriptText: opts.scriptText,
    }), globals), buildOptions));
  hooks.command('import-capabilities').action((_, command) => run(command, (client) => client.hooks.getImportCapabilities(), buildOptions));
  hooks.command('import-access')
    .requiredOption('--platform <platform>')
    .option('--profile-id <id>')
    .action((opts, command) => run(command, (client) => client.hooks.checkImportAccess(opts.platform, opts.profileId), buildOptions));
  hooks.command('import-clips')
    .requiredOption('--items-json <json>')
    .option('--fallback-profiles-json <json>')
    .action((opts, command) => run(command, async (client, globals) => maybeWait(await client.hooks.importClips({
      items: JSON.parse(opts.itemsJson),
      fallbackProfiles: opts.fallbackProfilesJson ? JSON.parse(opts.fallbackProfilesJson) : undefined,
    }), globals), buildOptions));
  hooks.command('import-status').requiredOption('--job-id <id>').action((opts, command) => run(command, (client) => client.hooks.getImportStatus(opts.jobId), buildOptions));
  hooks.command('import-cancel').requiredOption('--job-id <id>').action((opts, command) => run(command, (client) => client.hooks.cancelImport(opts.jobId), buildOptions));

  const slideshows = program.command('slideshows');
  slideshows.command('list').option('--limit <n>').action((opts, command) => run(command, (client) => client.slideshows.list({ limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  slideshows.command('get').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.slideshows.get(opts.id), buildOptions));
  slideshows.command('create').requiredOption('--slides-json <json>').option('--title <title>').action((opts, command) => run(command, async (client) => {
    return client.slideshows.create({ title: opts.title, slides: JSON.parse(opts.slidesJson) });
  }, buildOptions));
  slideshows.command('generate-text')
    .requiredOption('--prompt <prompt>')
    .option('--type <type>')
    .option('--slide-count <n>')
    .option('--max')
    .option('--visual-context-json <json>')
    .action((opts, command) => run(command, async (client, globals) => maybeWait(await client.slideshows.generateText({
      prompt: opts.prompt,
      slideshowType: opts.type,
      slideCount: opts.slideCount ? Number(opts.slideCount) : undefined,
      maxMode: Boolean(opts.max),
      visualContext: opts.visualContextJson ? JSON.parse(opts.visualContextJson) : undefined,
    }), globals), buildOptions));
  slideshows.command('revise-text')
    .requiredOption('--instruction <text>')
    .requiredOption('--slides-json <json>')
    .option('--type <type>')
    .option('--max')
    .option('--visual-context-json <json>')
    .action((opts, command) => run(command, async (client, globals) => maybeWait(await client.slideshows.reviseText({
      instruction: opts.instruction,
      slideshowType: opts.type,
      slides: JSON.parse(opts.slidesJson),
      maxMode: Boolean(opts.max),
      visualContext: opts.visualContextJson ? JSON.parse(opts.visualContextJson) : undefined,
    }), globals), buildOptions));
  slideshows.command('finalize').requiredOption('--slideshow-id <id>').option('--slides-json <json>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.slideshows.finalize({ slideshowId: opts.slideshowId, slides: opts.slidesJson ? JSON.parse(opts.slidesJson) : undefined }), globals), buildOptions));
  slideshows.command('export-video').requiredOption('--slideshow-id <id>').action((opts, command) => run(command, async (client, globals) => maybeWait(await client.slideshows.exportVideo(opts.slideshowId), globals), buildOptions));

  const imageGenerations = program.command('image-generations');
  imageGenerations.command('active').action((_, command) => run(command, (client) => client.imageGenerations.listActive(), buildOptions));
  imageGenerations.command('job').requiredOption('--job-id <id>').action((opts, command) => run(command, (client) => client.imageGenerations.getJob(opts.jobId), buildOptions));
  imageGenerations.command('conversation').requiredOption('--conversation-id <id>').option('--limit <n>').option('--cursor <cursor>').action((opts, command) => run(command, (client) => client.imageGenerations.getConversation(opts.conversationId, {
    limit: opts.limit ? Number(opts.limit) : undefined,
    cursor: opts.cursor,
  }), buildOptions));

  const aiClones = program.command('ai-clones');
  aiClones.command('list').option('--limit <n>').option('--cursor <cursor>').action((opts, command) => run(command, (client) => client.aiClones.list({
    limit: opts.limit ? Number(opts.limit) : undefined,
    cursor: opts.cursor,
  }), buildOptions));
  aiClones.command('voices')
    .option('--search <text>')
    .option('--category <category>')
    .option('--language <language>')
    .option('--page <n>')
    .option('--page-size <n>')
    .action((opts, command) => run(command, (client) => client.aiClones.listVoices({
      search: opts.search,
      category: opts.category,
      language: opts.language,
      page: opts.page ? Number(opts.page) : undefined,
      pageSize: opts.pageSize ? Number(opts.pageSize) : undefined,
    }), buildOptions));
  aiClones.command('generate')
    .requiredOption('--avatar-url <url>')
    .requiredOption('--motion-video-url <url>')
    .option('--prompt <text>')
    .option('--mode <mode>')
    .option('--character-orientation <orientation>')
    .option('--enable-voice-conversion')
    .option('--voice-audio-url <url>')
    .option('--voice-id <id>')
    .option('--voice-model-id <id>')
    .option('--remove-background-noise')
    .action((opts, command) => run(command, async (client, globals) => maybeWait(await client.aiClones.generate({
      avatarUrl: opts.avatarUrl,
      motionVideoUrl: opts.motionVideoUrl,
      prompt: opts.prompt,
      mode: opts.mode,
      characterOrientation: opts.characterOrientation,
      enableVoiceConversion: Boolean(opts.enableVoiceConversion),
      voiceAudioUrl: opts.voiceAudioUrl,
      voiceId: opts.voiceId,
      voiceModelId: opts.voiceModelId,
      removeBackgroundNoise: Boolean(opts.removeBackgroundNoise),
    }), globals), buildOptions));
  aiClones.command('status').requiredOption('--job-id <id>').action((opts, command) => run(command, (client) => client.aiClones.getJobStatus(opts.jobId), buildOptions));

  const mediaCollections = program.command('media-collections');
  mediaCollections.command('list').option('--mode <mode>').action((opts, command) => run(command, (client) => client.mediaCollections.list(opts.mode), buildOptions));
  mediaCollections.command('gallery').option('--mode <mode>').option('--limit <n>').option('--cursor <cursor>').option('--kinds <items>').action((opts, command) => run(command, (client) => client.mediaCollections.listGallery({
    mode: opts.mode,
    limit: opts.limit ? Number(opts.limit) : undefined,
    cursor: opts.cursor,
    kinds: opts.kinds ? String(opts.kinds).split(',') as GalleryFeedKind[] : undefined,
  }), buildOptions));
  mediaCollections.command('items').requiredOption('--collection-id <id>').option('--mode <mode>').action((opts, command) => run(command, (client) => client.mediaCollections.getItems(opts.collectionId, opts.mode), buildOptions));
  mediaCollections.command('create').requiredOption('--name <name>').option('--items-json <json>').action((opts, command) => run(command, (client) => client.mediaCollections.create({
    name: opts.name,
    initialItems: opts.itemsJson ? JSON.parse(opts.itemsJson) : undefined,
  }), buildOptions));
  mediaCollections.command('rename').requiredOption('--collection-id <id>').requiredOption('--name <name>').action((opts, command) => run(command, (client) => client.mediaCollections.rename(opts.collectionId, opts.name), buildOptions));
  mediaCollections.command('memberships').requiredOption('--items-json <json>').option('--add <ids>').option('--remove <ids>').action((opts, command) => run(command, (client) => client.mediaCollections.updateMemberships({
    items: JSON.parse(opts.itemsJson),
    addCollectionIds: opts.add ? String(opts.add).split(',') : undefined,
    removeCollectionIds: opts.remove ? String(opts.remove).split(',') : undefined,
  }), buildOptions));
  mediaCollections.command('delete-impact').requiredOption('--collection-id <id>').action((opts, command) => run(command, (client) => client.mediaCollections.getDeleteImpact(opts.collectionId), buildOptions));
  mediaCollections.command('delete').requiredOption('--collection-id <id>').action((opts, command) => run(command, (client) => client.mediaCollections.delete(opts.collectionId), buildOptions));

  const community = program.command('community');
  community.command('collections').option('--source <source>').option('--limit <n>').option('--offset <n>').action((opts, command) => run(command, (client) => client.community.listCollections({
    source: opts.source,
    limit: opts.limit ? Number(opts.limit) : undefined,
    offset: opts.offset ? Number(opts.offset) : undefined,
  }), buildOptions));
  community.command('images').requiredOption('--collection-id <id>').option('--limit <n>').option('--random').action((opts, command) => run(command, (client) => client.community.listImages(opts.collectionId, {
    limit: opts.limit ? Number(opts.limit) : undefined,
    random: Boolean(opts.random),
  }), buildOptions));

  const productContexts = program.command('product-contexts');
  productContexts.command('list').action((_, command) => run(command, (client) => client.productContexts.list(), buildOptions));
  productContexts.command('suggest').requiredOption('--url <url>').action((opts, command) => run(command, (client) => client.productContexts.suggestFromUrl(opts.url), buildOptions));
  productContexts.command('create').requiredOption('--name <name>').requiredOption('--description <text>').action((opts, command) => run(command, (client) => client.productContexts.create({ name: opts.name, description: opts.description }), buildOptions));

  const trash = program.command('trash');
  trash.command('list').option('--limit <n>').option('--cursor <cursor>').action((opts, command) => run(command, (client) => client.trash.list({ limit: opts.limit ? Number(opts.limit) : undefined, cursor: opts.cursor }), buildOptions));
  trash.command('restore').requiredOption('--id <id>').requiredOption('--type <type>').action((opts, command) => run(command, (client) => client.trash.restore(opts.id, opts.type), buildOptions));
  trash.command('restore-all').action((_, command) => run(command, (client) => client.trash.restoreAll(), buildOptions));

  const social = program.command('social');
  social.command('accounts').action((_, command) => run(command, (client) => client.social.list(), buildOptions));
  social.command('connected').action((_, command) => run(command, (client) => client.social.listConnected(), buildOptions));

  const posts = program.command('posts');
  posts.command('list').option('--status <status>').option('--limit <n>').action((opts, command) => run(command, (client) => client.posts.list({ status: opts.status, limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  posts.command('status').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.posts.getStatus(opts.id), buildOptions));
  posts.command('optimal-times').option('--platform <platform>').option('--limit <n>').action((opts, command) => run(command, (client) => client.posts.getOptimalTimes({ platform: opts.platform, limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  posts.command('schedule').requiredOption('--content-type <type>').requiredOption('--content-id <id>').requiredOption('--when <date>').requiredOption('--platforms <items>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.schedule({ contentType: parseContentType(opts.contentType), contentId: opts.contentId, scheduledFor: opts.when, platforms: parsePlatforms(opts.platforms), caption: opts.caption }), buildOptions));
  posts.command('publish-now').requiredOption('--content-type <type>').requiredOption('--content-id <id>').requiredOption('--platforms <items>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.publishNow({ contentType: parseContentType(opts.contentType), contentId: opts.contentId, platforms: parsePlatforms(opts.platforms), caption: opts.caption }), buildOptions));
  posts.command('update').requiredOption('--id <id>').option('--when <date>').option('--caption <caption>').action((opts, command) => run(command, (client) => client.posts.update(opts.id, { scheduledFor: opts.when, caption: opts.caption }), buildOptions));
  posts.command('cancel').requiredOption('--id <id>').action((opts, command) => run(command, (client) => {
    return client.posts.cancel(opts.id);
  }, buildOptions));

  const assets = program.command('assets');
  assets.command('list').requiredOption('--category <category>').option('--limit <n>').action((opts, command) => run(command, (client) => client.assets.list(opts.category, { limit: opts.limit ? Number(opts.limit) : undefined }), buildOptions));
  assets.command('search').argument('<query>').option('--category <category>').action((query, opts, command) => run(command, (client) => client.assets.search(query, { category: opts.category }), buildOptions));
  assets.command('import').requiredOption('--category <category>').requiredOption('--url <url>').option('--name <name>').action((opts, command) => run(command, async (client) => {
    return client.assets.import({ category: opts.category, url: opts.url, name: opts.name });
  }, buildOptions));
  assets.command('import-bulk').requiredOption('--category <category>').requiredOption('--items-json <json>').action((opts, command) => run(command, async (client) => {
    return client.assets.importBulk({ category: opts.category, items: JSON.parse(opts.itemsJson) });
  }, buildOptions));

  const automations = program.command('automations');
  automations.command('list').action((_, command) => run(command, (client) => client.automations.list(), buildOptions));
  automations.command('create').requiredOption('--json-definition <json>').action((opts, command) => run(command, (client) => client.automations.create(JSON.parse(opts.jsonDefinition) as JsonObject), buildOptions));
  automations.command('update').requiredOption('--id <id>').requiredOption('--json-definition <json>').action((opts, command) => run(command, (client) => client.automations.update(opts.id, JSON.parse(opts.jsonDefinition) as JsonObject), buildOptions));

  const events = program.command('events');
  events.command('recent').option('--limit <n>').option('--type <type>').action((opts, command) => run(command, (client) => client.events.recent({ limit: opts.limit ? Number(opts.limit) : undefined, type: opts.type }), buildOptions));

  const validate = program.command('validate');
  validate.command('caption').argument('<text>').requiredOption('--platforms <items>').action((text, opts, command) => run(command, (client) => client.validate.caption(text, String(opts.platforms).split(',').map((item) => item.toUpperCase() as PlatformTarget['platform'])), buildOptions));

  program.command('confirm').argument('<confirmationId>').action((confirmationId, _opts, command) => run(command, async (client) => {
    const result = await client.raw.callTool('reelsfarm_confirm_action', { confirmationId });
    return extractStructuredContent(result);
  }, buildOptions));

  const operations = program.command('operations');
  operations.command('get').requiredOption('--id <id>').action((opts, command) => run(command, (client) => client.operations.get(opts.id), buildOptions));
  operations.command('wait').requiredOption('--id <id>').action((opts, command) => run(command, (client, globals) => client.operations.wait(opts.id, {
    timeoutMs: globals.timeout ? Number(globals.timeout) : undefined,
  }), buildOptions));

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
    const commands = 'login logout whoami account avatars product-scenes hooks ai-clones slideshows image-generations media-collections community product-contexts trash social posts assets automations events validate operations confirm agent completion';
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
