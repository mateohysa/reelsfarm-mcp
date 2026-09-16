import type { JsonObject } from '../types.js';

const provenanceFields = ['provider', 'sourceTool', 'executionState', 'assetCreated', 'resultMessage'] as const;

export function unwrapStatusWithProvenance(result: JsonObject): JsonObject {
  const nested = result.status && typeof result.status === 'object' && !Array.isArray(result.status)
    ? result.status as JsonObject
    : result;
  const merged = { ...nested };
  for (const field of provenanceFields) {
    if (field in result) merged[field] = result[field];
  }
  return merged;
}
