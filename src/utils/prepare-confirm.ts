import { ReelsFarmConfirmationError } from '../errors.js';
import { getConfirmationToolName, type ToolName } from '../generated/index.js';
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

export async function prepareAndConfirm<T extends object>(
  context: PrepareConfirmContext,
  prepareTool: ToolName,
  args: JsonObject,
): Promise<T | PreparedAction> {
  const preparedOrExecuted = extractStructuredContent<T | PreparedAction>(await context.callTool(prepareTool, args));
  if (!isPreparedAction(preparedOrExecuted)) return preparedOrExecuted;
  if (context.dryRun || !context.autoConfirm) return preparedOrExecuted;

  // Each prepared operation has its own confirmation tool, named in the prepared result.
  const confirmationTool = preparedOrExecuted.confirmationTool || getConfirmationToolName(preparedOrExecuted.sourceTool || prepareTool);
  if (!confirmationTool) {
    throw new ReelsFarmConfirmationError('The server prepared this action without naming its confirmation tool, so the SDK did not confirm it.', {
      operationId: preparedOrExecuted.operationId,
    });
  }
  try {
    return extractStructuredContent<T>(await context.callTool(confirmationTool, { confirmationId: preparedOrExecuted.confirmationId }));
  } catch (error) {
    throw new ReelsFarmConfirmationError(
      'Confirmation did not complete. The SDK will not prepare or execute a replacement action. Inspect the original operation or retry this confirmation ID.',
      { cause: error, operationId: preparedOrExecuted.operationId },
    );
  }
}
