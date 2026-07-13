import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProgram } from '../../cli/index.js';
import { ReelsFarmAuthError, ReelsFarmRateLimitError, type ReelsFarmClient, type ReelsFarmClientOptions } from '../../src/index.js';

class MemoryStream {
  value = '';

  write(chunk: string): boolean {
    this.value += chunk;
    return true;
  }
}

function createClient(overrides: Record<string, unknown> = {}): ReelsFarmClient {
  return {
    account: {
      get: async () => ({ id: 'user_1' }),
      status: async () => ({ id: 'user_1' }),
    },
    posts: {
      schedule: async () => ({ scheduled: true }),
      cancel: async () => ({ cancelled: true }),
    },
    slideshows: {
      create: async () => ({ created: true }),
    },
    assets: {
      import: async () => ({ imported: true }),
      importBulk: async () => ({ imported: 1 }),
    },
    operations: {
      get: async (operationId: string) => ({ operationId, status: 'SUCCEEDED' }),
      wait: async (operationId: string) => ({ operationId, status: 'SUCCEEDED' }),
    },
    raw: {
      callTool: async () => ({ content: [], structuredContent: { confirmed: true } }),
      listTools: async () => [],
    },
    close: async () => undefined,
    ...overrides,
  } as unknown as ReelsFarmClient;
}

async function runCli(
  args: string[],
  clientFactory: (options: ReelsFarmClientOptions) => ReelsFarmClient = () => createClient(),
) {
  process.exitCode = undefined;
  const stdout = new MemoryStream();
  const stderr = new MemoryStream();
  const program = buildProgram({ clientFactory, stdout, stderr });
  program.exitOverride();
  await program.parseAsync(['node', 'reelsfarm', ...args], { from: 'node' });
  const result = {
    stdout: stdout.value,
    stderr: stderr.value,
    exitCode: process.exitCode,
    json: stdout.value ? JSON.parse(stdout.value) as unknown : undefined,
  };
  process.exitCode = undefined;
  return result;
}

afterEach(() => {
  process.exitCode = undefined;
  delete process.env.REELSFARM_AGENT_MODE;
  delete process.env.REELSFARM_CONFIG_DIR;
});

describe('cli', () => {
  it('builds the top-level program', () => {
    const program = buildProgram();
    expect(program.name()).toBe('reelsfarm');
    expect(program.commands.map((command) => command.name())).toContain('avatars');
    expect(program.commands.map((command) => command.name())).toContain('agent');
    expect(program.commands.map((command) => command.name())).toContain('social');
  });

  it('wraps read command output in an agent success envelope', async () => {
    const result = await runCli(['--agent', 'whoami']);

    expect(result.json).toEqual({
      ok: true,
      command: 'whoami',
      data: { id: 'user_1' },
    });
  });

  it('treats REELSFARM_AGENT_MODE=1 as agent mode', async () => {
    process.env.REELSFARM_AGENT_MODE = '1';

    const result = await runCli(['whoami']);

    expect(result.json).toMatchObject({
      ok: true,
      command: 'whoami',
      data: { id: 'user_1' },
    });
  });

  it('prints structured JSON errors in agent mode', async () => {
    const result = await runCli(['--agent', 'whoami'], () => createClient({
      account: {
        get: async () => { throw new ReelsFarmAuthError('Missing token'); },
      },
    }));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.json).toMatchObject({
      ok: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        type: 'ReelsFarmAuthError',
        retryable: false,
      },
    });
  });

  it('marks rate limit errors retryable in agent mode', async () => {
    const result = await runCli(['--agent', 'whoami'], () => createClient({
      account: {
        get: async () => { throw new ReelsFarmRateLimitError('Rate limit exceeded. Retry after 12 seconds.'); },
      },
    }));

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.json).toMatchObject({
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        type: 'ReelsFarmRateLimitError',
        retryable: true,
      },
    });
  });

  it('stores an API key during machine-readable login', async () => {
    const configDir = mkdtempSync(join(tmpdir(), 'reelsfarm-cli-test-'));
    process.env.REELSFARM_CONFIG_DIR = configDir;
    try {
      const result = await runCli(['--agent', '--profile', 'smoke', 'login', '--api-key', 'rfmcp_test']);
      const stored = JSON.parse(readFileSync(join(configDir, 'config.json'), 'utf8')) as {
        currentProfile?: string;
        profiles?: Record<string, { apiKey?: string; serverUrl?: string }>;
      };

      expect(result.json).toMatchObject({
        ok: true,
        command: 'login',
        data: {
          stored: true,
          profile: 'smoke',
        },
      });
      expect(stored.currentProfile).toBe('smoke');
      expect(stored.profiles?.smoke?.apiKey).toBe('rfmcp_test');
      expect(stored.profiles?.smoke?.serverUrl).toBe('https://mcp.reelsfarm.com/mcp');
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });

  it('returns confirmations for prepare-backed commands in agent mode unless --yes is passed', async () => {
    let seenOptions: ReelsFarmClientOptions | undefined;
    const factory = (options: ReelsFarmClientOptions) => {
      seenOptions = options;
      return createClient({
        posts: {
          schedule: async () => options.autoConfirm
            ? { scheduled: true }
            : options.dryRun
              ? { dryRun: true, executed: false }
              : { confirmationId: 'conf_1', expiresAt: '2026-07-01T15:00:00.000Z', summary: 'Schedule post', creditEstimate: null },
        },
      });
    };

    const prepared = await runCli([
      '--agent',
      'posts',
      'schedule',
      '--content-type',
      'slideshow',
      '--content-id',
      'sl_123',
      '--when',
      '2026-07-01T15:00:00Z',
      '--platforms',
      'tiktok:conn_123',
    ], factory);

    expect(seenOptions?.dryRun).toBe(false);
    expect(seenOptions?.autoConfirm).toBe(false);
    expect(prepared.json).toMatchObject({
      ok: true,
      command: 'posts.schedule',
      requiresConfirmation: true,
      confirmation: { id: 'conf_1' },
      nextStep: 'reelsfarm confirm conf_1 --agent',
    });

    const executed = await runCli([
      '--agent',
      '--yes',
      'posts',
      'schedule',
      '--content-type',
      'slideshow',
      '--content-id',
      'sl_123',
      '--when',
      '2026-07-01T15:00:00Z',
      '--platforms',
      'tiktok:conn_123',
    ], factory);

    expect(seenOptions?.dryRun).toBe(false);
    expect(seenOptions?.autoConfirm).toBe(true);
    expect(executed.json).toMatchObject({
      ok: true,
      command: 'posts.schedule',
      data: { scheduled: true },
    });

    await runCli([
      '--agent',
      '--yes',
      '--dry-run',
      'posts',
      'schedule',
      '--content-type',
      'slideshow',
      '--content-id',
      'sl_123',
      '--when',
      '2026-07-01T15:00:00Z',
      '--platforms',
      'tiktok:conn_123',
    ], factory);

    expect(seenOptions?.dryRun).toBe(true);
    expect(seenOptions?.autoConfirm).toBe(true);
  });

  it('lets the server connection policy decide direct mutations and preserves dry-run', async () => {
    let cancelCalls = 0;
    const factory = (options: ReelsFarmClientOptions) => createClient({
      posts: {
        cancel: async () => {
          if (options.dryRun) return { dryRun: true, executed: false };
          cancelCalls += 1;
          return { cancelled: true };
        },
      },
    });

    const executed = await runCli(['--agent', 'posts', 'cancel', '--id', 'post_123'], factory);
    expect(cancelCalls).toBe(1);
    expect(executed.json).toMatchObject({
      ok: true,
      data: { cancelled: true },
    });

    const dryRun = await runCli(['--agent', '--yes', '--dry-run', 'posts', 'cancel', '--id', 'post_123'], factory);

    expect(cancelCalls).toBe(1);
    expect(dryRun.json).toMatchObject({
      ok: true,
      command: 'posts.cancel',
      data: {
        dryRun: true,
        executed: false,
      },
    });
  });

  it('passes automatic idempotency-key factories to SDK clients', async () => {
    let createCalls = 0;
    let seenOptions: ReelsFarmClientOptions | undefined;
    const factory = (options: ReelsFarmClientOptions) => {
      seenOptions = options;
      return createClient({
        slideshows: {
          create: async () => {
            createCalls += 1;
            return { id: 'sl_1' };
          },
        },
      });
    };

    const result = await runCli([
      '--agent',
      '--idempotency-key',
      'logical-action-1',
      'slideshows',
      'create',
      '--slides-json',
      '[]',
    ], factory);

    expect(createCalls).toBe(1);
    expect(seenOptions?.idempotencyKeyFactory?.()).toBe('logical-action-1');
    expect(result.json).toMatchObject({
      ok: true,
      data: { id: 'sl_1' },
    });
  });

  it('gets durable operation status', async () => {
    const result = await runCli(['--agent', 'operations', 'get', '--id', 'op_123'], () => createClient({
      operations: {
        get: async (operationId: string) => ({ operationId, status: 'RUNNING' }),
        wait: async () => ({ operationId: 'op_123', status: 'SUCCEEDED' }),
      },
    }));
    expect(result.json).toMatchObject({
      ok: true,
      command: 'operations.get',
      data: { operationId: 'op_123', status: 'RUNNING' },
    });
  });

  it('confirms prepared actions with confirm_action', async () => {
    let calledWith: unknown;
    const result = await runCli(['--agent', 'confirm', 'conf_123'], () => createClient({
      raw: {
        callTool: async (name: string, args: unknown) => {
          calledWith = { name, args };
          return { content: [], structuredContent: { confirmed: true, id: 'job_123' } };
        },
        listTools: async () => [],
      },
    }));

    expect(calledWith).toEqual({ name: 'confirm_action', args: { confirmationId: 'conf_123' } });
    expect(result.json).toMatchObject({
      ok: true,
      command: 'confirm',
      data: { confirmed: true, id: 'job_123' },
    });
  });

  it('emits an agent command registry with discovery and safety metadata', async () => {
    const result = await runCli(['agent', 'commands']);
    const body = result.json as { commands: Array<{ name: string; safety: string; readOnly: boolean; destructive: boolean; prepareBacked: boolean }> };

    const byName = new Map(body.commands.map((command) => [command.name, command]));
    expect(byName.get('social.connected')?.readOnly).toBe(true);
    expect(byName.get('posts.status')?.readOnly).toBe(true);
    expect(byName.get('assets.search')?.readOnly).toBe(true);
    expect(byName.get('validate.caption')?.readOnly).toBe(true);
    expect(byName.get('agent.status')?.readOnly).toBe(true);
    expect(byName.get('agent.commands')?.readOnly).toBe(true);
    expect(byName.get('posts.schedule')?.prepareBacked).toBe(true);
    expect(byName.get('operations.get')?.readOnly).toBe(true);
    expect(byName.has('webhooks.create')).toBe(false);
    expect(byName.has('posts.delete')).toBe(false);
  });
});
