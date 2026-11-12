import { Diagnostic, PlanViewErrorCode } from '../types/plan-view.types';

export class PlanViewError extends Error {
  constructor(readonly code: PlanViewErrorCode, message: string, readonly diagnostics: readonly Diagnostic[] = []) {
    super(message);
    this.name = 'PlanViewError';
  }
}
