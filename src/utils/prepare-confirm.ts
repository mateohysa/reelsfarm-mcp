import { ReelsFarmConfirmationError } from '../errors.js';
import type { ToolName } from '../generated/index.js';
import type { JsonObject, PreparedAction } from '../types.js';
import { extractStructuredContent } from './result.js';

export interface PrepareConfirmContext {
  dryRun: boolean;
  autoConfirm: boolean;
  callTool(name: ToolName | string, args?: JsonObject): Promise<{ structuredContent?: JsonObject; content: Array<{ type: string; text?: string }>; isError?: boolean }>;
}

function isPreparedAction(value: unknown): value is PreparedAction {
  return Boolean(value && typeof value === 'object' && typeof (value as PreparedAction).confirmationId === 'string');
}

export async function prepareAndConfirm<T extends JsonObject>(
  context: PrepareConfirmContext,
  prepareTool: ToolName,
  args: JsonObject,
): Promise<T | PreparedAction> {
  const preparedOrExecuted = extractStructuredContent<T | PreparedAction>(await context.callTool(prepareTool, args));
  if (!isPreparedAction(preparedOrExecuted)) return preparedOrExecuted;
  if (context.dryRun || !context.autoConfirm) return preparedOrExecuted;

  try {
    return extractStructuredContent<T>(await context.callTool('reelsfarm_confirm_action', { confirmationId: preparedOrExecuted.confirmationId }));
  } catch (error) {
    throw new ReelsFarmConfirmationError(
      'Confirmation did not complete. The SDK will not prepare or execute a replacement action. Inspect the original operation or retry this confirmation ID.',
      { cause: error, operationId: preparedOrExecuted.operationId },
    );
  }
}
