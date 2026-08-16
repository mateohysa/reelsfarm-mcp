import { DEFAULT_OPERATION_RECOVERY_TIMEOUT_MS } from '../constants.js';
import { ReelsFarmTimeoutError, ReelsFarmToolError } from '../errors.js';
import type { McpOperationSnapshot, WaitOptions } from '../types.js';
import { sleep } from '../utils/sleep.js';
import { DomainBase } from './base.js';

const TERMINAL = new Set<McpOperationSnapshot['status']>(['SUCCEEDED', 'FAILED_RETRYABLE', 'FAILED_FINAL']);

export class OperationsDomain extends DomainBase {
  async get(operationId: string): Promise<McpOperationSnapshot> {
    const result = await this.call<{ operation: McpOperationSnapshot }>('reelsfarm_get_operation', { operationId });
    return result.operation;
  }

  async wait(operationId: string, options: WaitOptions = {}): Promise<McpOperationSnapshot> {
    const startedAt = Date.now();
    const timeoutMs = options.timeoutMs ?? DEFAULT_OPERATION_RECOVERY_TIMEOUT_MS;
    let delay = options.pollIntervalMs ?? 500;

    while (true) {
      if (options.signal?.aborted) throw options.signal.reason ?? new Error('Aborted');
      const operation = await this.get(operationId);
      if (operation.status === 'SUCCEEDED') return operation;
      if (TERMINAL.has(operation.status)) {
        throw new ReelsFarmToolError(
          operation.error?.message || `Operation ${operationId} failed with status ${operation.status}`,
          operation.toolName,
          {
            code: operation.error?.code,
            retryable: operation.status === 'FAILED_RETRYABLE',
            operationId,
          },
        );
      }
      if (Date.now() - startedAt >= timeoutMs) {
        throw new ReelsFarmTimeoutError(`Timed out waiting for MCP operation ${operationId} after ${timeoutMs}ms`, {
          code: 'OPERATION_IN_PROGRESS',
          operationId,
        });
      }
      await sleep(Math.min(delay, 5_000), options.signal);
      delay = Math.min(delay * 2, 5_000);
    }
  }
}
