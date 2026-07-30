import type { TaxInputs } from '../engine';

/**
 * The Option-B seam. A future `MyinfoSource` implements this same interface and
 * drops in without any UI change.
 */
export interface ProfileSource {
  readonly kind: 'manual' | 'myinfo';
  getProfile(): Promise<Partial<TaxInputs>>;
}

export class ManualEntrySource implements ProfileSource {
  kind = 'manual' as const;
  async getProfile(): Promise<Partial<TaxInputs>> {
    return {}; // manual mode contributes nothing; the form is the source
  }
}
