import { computeTax, rawReliefSum } from './compute';
import {
  CPF_CASH_TOP_UP_RELIEF_CEILING,
  SRS_CAP_FOREIGNER,
  SRS_CAP_SC_PR,
  TOTAL_RELIEF_CAP,
} from './externalConstants';
import type { Lever, LeverInputs, ReliefKey, TaxInputs } from './types';

export const LOCK_UP_NOTES = {
  srs: 'SRS funds are locked until the statutory retirement age; early withdrawal is taxed with a 5% penalty.',
  cpfTopUp:
    'CPF top-ups cannot be withdrawn before age 55, and only above your retirement sums.',
} as const;

function withAddedRelief(
  inputs: TaxInputs,
  key: ReliefKey,
  amount: number,
): TaxInputs {
  return {
    ...inputs,
    reliefs: {
      ...inputs.reliefs,
      [key]: Math.max(inputs.reliefs[key], 0) + amount,
    },
  };
}

/**
 * Dollar tax saving from adding `amount` of relief-eligible dollars.
 * Computed by RE-RUNNING computeTax — never `marginalRate * amount`, which is
 * wrong across bracket boundaries and at the chargeable-income floor.
 */
export function taxSavingForAdditionalRelief(
  inputs: TaxInputs,
  amount: number,
  key: ReliefKey = 'srs',
): number {
  if (amount <= 0) return 0;
  const before = computeTax(inputs).netTaxPayable;
  const after = computeTax(withAddedRelief(inputs, key, amount)).netTaxPayable;
  return Math.round((before - after) * 100) / 100;
}

export function computeLevers(inputs: TaxInputs, lever: LeverInputs): Lever[] {
  const reliefSum = rawReliefSum(inputs);
  const capRemaining = Math.max(TOTAL_RELIEF_CAP - reliefSum, 0);

  const srsCap = lever.isForeigner ? SRS_CAP_FOREIGNER : SRS_CAP_SC_PR;
  const srsRaw = Math.max(srsCap - Math.max(inputs.reliefs.srs, 0), 0);
  const srsHeadroom = Math.max(Math.min(srsRaw, capRemaining), 0);

  const cpfRaw = lever.reachedFullRetirementSum
    ? 0
    : Math.max(
        CPF_CASH_TOP_UP_RELIEF_CEILING - Math.max(inputs.reliefs.cpfCashTopUp, 0),
        0,
      );
  const cpfHeadroom = Math.max(Math.min(cpfRaw, capRemaining), 0);

  return [
    {
      id: 'srs',
      headroom: srsHeadroom,
      taxSaving: taxSavingForAdditionalRelief(inputs, srsHeadroom, 'srs'),
      lockUpNote: LOCK_UP_NOTES.srs,
    },
    {
      id: 'cpfTopUp',
      headroom: cpfHeadroom,
      taxSaving: taxSavingForAdditionalRelief(inputs, cpfHeadroom, 'cpfCashTopUp'),
      lockUpNote: LOCK_UP_NOTES.cpfTopUp,
    },
  ];
}
