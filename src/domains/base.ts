import type { ToolName } from '../generated/index.js';
import type { JsonObject } from '../types.js';
import type { DomainContext } from './context.js';
import { extractStructuredContent } from '../utils/result.js';

export abstract class DomainBase {
  constructor(protected readonly context: DomainContext) {}

  protected async call<T extends JsonObject = JsonObject>(name: ToolName | string, args: JsonObject = {}): Promise<T> {
    return extractStructuredContent<T>(await this.context.callTool(name, args));
  }
}
