import type { JsonObject, MaybePrepared } from '../types.js';
import type {
  AutomationDefinition,
  AutomationListResult,
  AutomationResult,
  CreateAutomationParams,
} from '../contracts/automations.js';
import { prepareAndConfirm } from '../utils/prepare-confirm.js';
import { DomainBase } from './base.js';

export class AutomationsDomain extends DomainBase {
  list(options: { includeRecentGenerations?: boolean } = {}): Promise<AutomationListResult> {
    return this.call<AutomationListResult>('reelsfarm_list_automations', options);
  }
  create(params: CreateAutomationParams): Promise<MaybePrepared<AutomationResult>> {
    return prepareAndConfirm<AutomationResult>(this.context, 'reelsfarm_prepare_create_automation', params as unknown as JsonObject);
  }
  /**
   * Omitted top-level fields keep their saved values, and images replaces the saved image rules.
   * publishRules merges field by field; a new caption replaces a saved captionOverride.
   */
  update(id: string, params: AutomationDefinition): Promise<MaybePrepared<AutomationResult>> {
    return prepareAndConfirm<AutomationResult>(this.context, 'reelsfarm_prepare_update_automation', { id, ...params } as JsonObject);
  }
}
