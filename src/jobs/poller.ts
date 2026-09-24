import { DEFAULT_JOB_TIMEOUT_MS } from '../constants.js';
import { ReelsFarmTimeoutError, ReelsFarmToolError } from '../errors.js';
import type { JsonObject, WaitOptions } from '../types.js';
import { sleep } from '../utils/sleep.js';

const SUCCESS = new Set(['completed', 'complete', 'succeeded', 'success', 'done']);
const FAILURE = new Set(['failed', 'failure', 'error', 'errored', 'cancelled', 'canceled', 'failed_final', 'failed_retryable']);

export function readStatusValue(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const progress = record.jobProgress;
  if (progress && typeof progress === 'object') {
    const step = (progress as Record<string, unknown>).step;
    if (typeof step === 'string' && step !== 'unknown') return step;
  }
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

    const progress = status.jobProgress as Record<string, unknown> | undefined;
    const suggested = progress?.nextPollAfterMs;
    const interval = typeof suggested === 'number' && Number.isFinite(suggested) && suggested > 0
      ? suggested : delay;
    await sleep(Math.min(interval, 30_000, Math.max(0, timeoutMs - (Date.now() - startedAt))), options.signal);
    delay = Math.min(delay * 2, 30_000);
  }
}
