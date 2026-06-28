import type { JsonObject, WaitOptions } from '../types.js';
import { pollUntilComplete } from './poller.js';

export class ReelsFarmJob<TStatus extends JsonObject = JsonObject> {
  constructor(
    readonly jobId: string,
    readonly kind: string,
    private readonly getStatusFn: (jobId: string) => Promise<TStatus>,
  ) {}

  getStatus(): Promise<TStatus> {
    return this.getStatusFn(this.jobId);
  }

  wait(options: WaitOptions = {}): Promise<TStatus> {
    return pollUntilComplete(() => this.getStatus(), options);
  }

  toJSON() {
    return { jobId: this.jobId, kind: this.kind };
  }
}

export function maybeWrapJob<TStatus extends JsonObject>(
  value: JsonObject,
  fallbackKind: string,
  getStatus: (jobId: string) => Promise<TStatus>,
): ReelsFarmJob<TStatus> | JsonObject {
  const jobId = typeof value.jobId === 'string' ? value.jobId : undefined;
  if (!jobId) return value;
  const kind = typeof value.kind === 'string' ? value.kind : fallbackKind;
  return new ReelsFarmJob<TStatus>(jobId, kind, getStatus);
}
