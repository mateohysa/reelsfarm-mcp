import type { JsonObject, RawToolResult } from '../types.js';

export function extractStructuredContent<T = JsonObject>(result: RawToolResult<JsonObject>): T {
  if (result.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent as T;
  }
  const text = result.content.find((item) => item.type === 'text' && typeof item.text === 'string')?.text;
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') return parsed as T;
    } catch {
      return { text } as unknown as T;
    }
  }
  return {} as T;
}
