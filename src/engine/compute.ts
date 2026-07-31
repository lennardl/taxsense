import { BRACKETS_YA2026 } from './brackets';
import { DONATION_MULTIPLIER, TOTAL_RELIEF_CAP } from './externalConstants';
import { RELIEF_KEYS } from './types';
import type { DerivationLine, TaxInputs, TaxResult } from './types';

/** Round to 2 decimal places. */
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

const SGD = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Display helper. Pure; all currency is shown to 2 d.p. */
export function formatSGD(x: number): string {
  return SGD.format(x);
}

const SGD_WHOLE = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Whole-dollar display for fixed, non-computed label amounts (e.g. a flat
 * relief's stated amount). Ledger and computed results keep 2 d.p. per §1.6 —
 * this is only for labels where the trailing ".00" is noise, not precision.
 */
export function formatSGDWhole(x: number): string {
  return SGD_WHOLE.format(x);
}

/** Clamp to >= 0. Applied to every raw input at the engine boundary. */
function clamp0(x: number): number {
  return Number.isFinite(x) && x > 0 ? x : 0;
}

/**
 * The last bracket whose lowerBound <= c: iterate the array from the END and
 * take the first match.
 */
function bracketFor(c: number): readonly [number, number, number] {
  for (let i = BRACKETS_YA2026.length - 1; i >= 0; i -= 1) {
    const bracket = BRACKETS_YA2026[i];
    if (bracket !== undefined && bracket[0] <= c) return bracket;
  }
  return [0, 0, 0];
}

export function grossTax(ci: number): number {
  const c = Math.max(ci, 0);
  const [lb, base, rate] = bracketFor(c);
  return round2(base + (c - lb) * rate);
}

export interface BracketBand {
  lowerBound: number;
  /** null for the open-ended top band. */
  upperBound: number | null;
  rate: number;
  /** How many dollars of this chargeable income fall inside this band. */
  amountInBand: number;
  /** Tax arising from this band alone. */
  taxFromBand: number;
}

/**
 * Decompose chargeable income across the YA2026 bands.
 *
 * Invariant, asserted in the tests: the taxFromBand values sum to grossTax(ci)
 * for every bracket vector. This is what makes the band visual trustworthy —
 * it is the same arithmetic as grossTax, not a parallel approximation.
 */
export function bracketBreakdown(ci: number): BracketBand[] {
  const c = Math.max(ci, 0);
  return BRACKETS_YA2026.map((bracket, i) => {
    const [lowerBound, , rate] = bracket;
    const next = BRACKETS_YA2026[i + 1];
    const upperBound = next === undefined ? null : next[0];
    const bandWidth = upperBound === null ? Infinity : upperBound - lowerBound;
    const amountInBand = Math.min(Math.max(c - lowerBound, 0), bandWidth);
    return {
      lowerBound,
      upperBound,
      rate,
      amountInBand,
      taxFromBand: amountInBand * rate,
    };
  });
}

/**
 * Rate of the last bracket with lowerBound <= max(ci, 0).
 * At an exact boundary this returns the band ABOVE (the next-dollar rate):
 * marginalRate(19999)=0, marginalRate(20000)=0.02,
 * marginalRate(76500)=0.07, marginalRate(80000)=0.115.
 */
export function marginalRate(ci: number): number {
  return bracketFor(Math.max(ci, 0))[2];
}

/** Sum of the 12 relief fields, each clamped to >= 0. */
export function rawReliefSum(inputs: TaxInputs): number {
  return RELIEF_KEYS.reduce((sum, key) => sum + clamp0(inputs.reliefs[key]), 0);
}

export function computeTax(inputs: TaxInputs): TaxResult {
  const employmentIncome = clamp0(inputs.employmentIncome);
  const employmentExpenses = clamp0(inputs.employmentExpenses);
  const tradeIncome = clamp0(inputs.tradeIncome);
  const otherIncome = clamp0(inputs.otherIncome);
  const donationsGiven = clamp0(inputs.donationsGiven);
  const parenthoodTaxRebate = clamp0(inputs.parenthoodTaxRebate);

  const netEmploymentIncome = employmentIncome - employmentExpenses;
  const totalIncome = netEmploymentIncome + tradeIncome + otherIncome;
  const donationsDeduction = donationsGiven * DONATION_MULTIPLIER;
  const assessableIncome = Math.max(totalIncome - donationsDeduction, 0);

  const reliefSum = rawReliefSum(inputs);
  const totalReliefs = Math.min(reliefSum, TOTAL_RELIEF_CAP);
  const reliefsCapped = reliefSum > TOTAL_RELIEF_CAP;

  const chargeableIncome = Math.max(assessableIncome - totalReliefs, 0);
  const tax = grossTax(chargeableIncome);
  const ptrApplied = Math.min(parenthoodTaxRebate, tax);
  const netTaxPayable = tax - ptrApplied;

  const lines: DerivationLine[] = [
    {
      id: 'netEmploymentIncome',
      label: 'Net employment income',
      amount: netEmploymentIncome,
      explanation:
        'Your employment income for the year, less allowable employment expenses.',
    },
    {
      id: 'totalIncome',
      label: 'Total income',
      amount: totalIncome,
      explanation:
        'Net employment income plus trade income and other income such as dividends, interest, rent and royalties.',
    },
    {
      id: 'donationsDeduction',
      label: 'Less: approved donations',
      amount: donationsDeduction,
      explanation:
        'Donations to approved Institutions of a Public Character are deducted at 250% of the amount given.',
    },
    {
      id: 'assessableIncome',
      label: 'Assessable income',
      amount: assessableIncome,
      explanation:
        'Total income after deducting approved donations. This figure cannot fall below zero.',
    },
    {
      id: 'totalReliefs',
      label: 'Less: personal reliefs',
      amount: totalReliefs,
      explanation: `The sum of your personal reliefs, subject to a total cap of $${TOTAL_RELIEF_CAP.toLocaleString('en-SG')} per Year of Assessment.`,
    },
    {
      id: 'chargeableIncome',
      label: 'Chargeable income',
      amount: chargeableIncome,
      explanation:
        'Assessable income after deducting personal reliefs. This is the amount the tax rates are applied to.',
    },
    {
      id: 'grossTax',
      label: 'Gross tax payable',
      amount: tax,
      explanation:
        'Your chargeable income taxed at the YA2026 progressive resident rates: each band of income is taxed at its own rate.',
    },
    {
      id: 'ptrApplied',
      label: 'Less: Parenthood Tax Rebate',
      amount: ptrApplied,
      explanation:
        'Parenthood Tax Rebate is offset against gross tax payable and cannot reduce it below zero. Any unused amount stays in your rebate balance.',
    },
    {
      id: 'netTaxPayable',
      label: 'Net tax payable',
      amount: netTaxPayable,
      explanation:
        'Gross tax payable after the Parenthood Tax Rebate offset. This is the amount assessed for the year.',
    },
  ];

  return {
    netEmploymentIncome,
    totalIncome,
    donationsDeduction,
    assessableIncome,
    totalReliefs,
    reliefsCapped,
    chargeableIncome,
    grossTax: tax,
    ptrApplied,
    netTaxPayable,
    marginalRate: marginalRate(chargeableIncome),
    lines,
  };
}
