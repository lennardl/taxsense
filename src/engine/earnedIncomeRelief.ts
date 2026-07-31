import { EARNED_INCOME_RELIEF_BANDS } from './externalConstants';

export type EarnedIncomeAgeBand = keyof typeof EARNED_INCOME_RELIEF_BANDS;

export const EARNED_INCOME_AGE_BAND_LABELS: Record<EarnedIncomeAgeBand, string> = {
  below55: 'Below 55',
  age55to59: '55 to 59',
  age60Plus: '60 and above',
};

/**
 * Earned Income Relief: a flat amount by age band, capped at the person's earned
 * income for the year (employment + trade/business income — not dividends,
 * interest, rent, or other passive income). `null` band = not yet declared, so
 * the relief is 0 rather than assuming the lowest band.
 */
export function earnedIncomeRelief(
  ageBand: EarnedIncomeAgeBand | null,
  earnedIncome: number,
): number {
  if (ageBand === null) return 0;
  const bandAmount = EARNED_INCOME_RELIEF_BANDS[ageBand];
  return Math.min(bandAmount, Math.max(earnedIncome, 0));
}
