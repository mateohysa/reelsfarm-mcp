import { ReelsFarmConfirmationError } from '../errors.js';
import type { ToolName } from '../generated/index.js';
import type { JsonObject, PreparedAction } from '../types.js';
import { extractStructuredContent } from './result.js';

export interface PrepareConfirmContext {
  dryRun: boolean;
  callTool(name: ToolName | string, args?: JsonObject): Promise<{ structuredContent?: JsonObject; content: Array<{ type: string; text?: string }>; isError?: boolean }>;
}

function isConfirmationExpired(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('confirmation not found') || message.includes('expired') || message.includes('already used');
}

export async function prepareAndConfirm<T extends JsonObject>(
  context: PrepareConfirmContext,
  prepareTool: ToolName,
  args: JsonObject,
): Promise<T | PreparedAction> {
  const prepared = extractStructuredContent<PreparedAction>(await context.callTool(prepareTool, args));
  if (!prepared.confirmationId) {
    throw new ReelsFarmConfirmationError('Prepare tool did not return a confirmationId');
  }
  if (context.dryRun) return prepared;

  try {
    return extractStructuredContent<T>(await context.callTool('confirm_action', { confirmationId: prepared.confirmationId }));
  } catch (error) {
    if (!isConfirmationExpired(error)) throw error;
  }

  const retryPrepared = extractStructuredContent<PreparedAction>(await context.callTool(prepareTool, args));
  if (!retryPrepared.confirmationId) {
    throw new ReelsFarmConfirmationError('Prepare retry did not return a confirmationId');
  }
  try {
    return extractStructuredContent<T>(await context.callTool('confirm_action', { confirmationId: retryPrepared.confirmationId }));
  } catch (error) {
    throw new ReelsFarmConfirmationError('Confirmation failed after retry', { cause: error });
  }
}
