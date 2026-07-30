// Source: IRAS/CPF public pages, Jul 2026. Re-verify each YA. Not derived from IRAS workbooks.

/** SRS annual contribution cap — Singapore Citizens and PRs. */
export const SRS_CAP_SC_PR = 15300;

/** SRS annual contribution cap — foreigners. */
export const SRS_CAP_FOREIGNER = 35700;

/** CPF cash top-up relief ceiling per YA (8,000 self + 8,000 family). */
export const CPF_CASH_TOP_UP_RELIEF_CEILING = 16000;

/** Deduction multiplier applied to qualifying donations (250%). */
export const DONATION_MULTIPLIER = 2.5;

/** Total personal relief cap per YA. (This one IS in the IRAS workbook.) */
export const TOTAL_RELIEF_CAP = 80000;

/**
 * Grandparent Caregiver Relief — flat amount, YA2026.
 * Verified Jul 2026: cannot be shared or apportioned; only one claimant per
 * caregiver. That is what makes a plain on/off toggle safe for this relief.
 */
export const GRANDPARENT_CAREGIVER_RELIEF = 3000;

export const GRANDPARENT_CAREGIVER_RELIEF_CONDITIONS =
  'Working mothers only (married, divorced or widowed). The caregiver must have lived in Singapore in 2025 and earned no more than $8,000. Cannot be shared — one claimant per caregiver.';

/**
 * Sibling Relief (Disability) — $5,500 per dependant, YA2026.
 * Deliberately NOT a toggle: IRAS allows this relief to be shared between several
 * people supporting the same dependant, so a fixed on/off claim would overstate
 * it. Shown as helper text on a free-entry field instead.
 */
export const SIBLING_DISABILITY_RELIEF = 5500;

export const SIBLING_DISABILITY_RELIEF_CONDITIONS =
  '$5,500 for each sibling with a disability. If more than one person supports the same dependant, enter only your agreed share.';
