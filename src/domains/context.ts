import type { ToolName } from '../generated/index.js';
import type { JsonObject } from '../types.js';
import type { PrepareConfirmContext } from '../utils/prepare-confirm.js';

export interface DomainContext extends PrepareConfirmContext {
  callTool(name: ToolName | string, args?: JsonObject): Promise<{ structuredContent?: JsonObject; content: Array<{ type: string; text?: string }>; isError?: boolean }>;
}
