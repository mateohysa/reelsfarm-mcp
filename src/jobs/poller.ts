import { DEFAULT_JOB_TIMEOUT_MS } from '../constants.js';
import { ReelsFarmTimeoutError, ReelsFarmToolError } from '../errors.js';
import type { JsonObject, WaitOptions } from '../types.js';
import { sleep } from '../utils/sleep.js';

const SUCCESS = new Set(['completed', 'complete', 'succeeded', 'success', 'done']);
const FAILURE = new Set(['failed', 'failure', 'error', 'errored', 'cancelled', 'canceled']);

export function readStatusValue(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const status = record.status ?? record.state ?? record.phase;
  return typeof status === 'string' ? status.toLowerCase() : undefined;
}

export function isTerminalSuccess(value: unknown): boolean {
  const status = readStatusValue(value);
  return Boolean(status && SUCCESS.has(status));
}

export function isTerminalFailure(value: unknown): boolean {
  const status = readStatusValue(value);
  return Boolean(status && FAILURE.has(status));
}

export async function pollUntilComplete<T extends JsonObject>(
  getStatus: () => Promise<T>,
  options: WaitOptions = {},
): Promise<T> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS;
  let delay = options.pollIntervalMs ?? 2_000;

  while (true) {
    if (options.signal?.aborted) {
      throw options.signal.reason ?? new Error('Aborted');
    }

    const status = await getStatus();
    if (isTerminalSuccess(status)) return status;
    if (isTerminalFailure(status)) {
      throw new ReelsFarmToolError('Job failed with status ' + String(readStatusValue(status)));
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new ReelsFarmTimeoutError('Timed out waiting for ReelsFarm job after ' + timeoutMs + 'ms');
    }

    await sleep(Math.min(delay, 30_000), options.signal);
    delay = Math.min(delay * 2, 30_000);
  }
}
