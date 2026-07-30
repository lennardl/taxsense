import { taxSavingForAdditionalRelief, computeLevers, computeTax } from '../src/engine';
import type { TaxInputs, ReliefInputs, LeverInputs } from '../src/engine';

const zeroReliefs = (o: Partial<ReliefInputs> = {}): ReliefInputs => ({
  earnedIncome: 0,
  spouse: 0,
  qualifyingChild: 0,
  workingMotherChild: 0,
  parent: 0,
  grandparentCaregiver: 0,
  siblingDisability: 0,
  cpfProvident: 0,
  lifeInsurance: 0,
  cpfCashTopUp: 0,
  srs: 0,
  nsman: 0,
  ...o,
});

const baseInputs = (o: Partial<TaxInputs> = {}): TaxInputs => ({
  employmentIncome: 0,
  employmentExpenses: 0,
  tradeIncome: 0,
  otherIncome: 0,
  donationsGiven: 0,
  reliefs: zeroReliefs(),
  parenthoodTaxRebate: 0,
  ...o,
});

const noFrsLevers: LeverInputs = { isForeigner: false, reachedFullRetirementSum: false };

describe('taxSavingForAdditionalRelief', () => {
  it('G5: bracket crossing at employmentIncome 82000, +8000 additional relief', () => {
    const inputs = baseInputs({ employmentIncome: 82000 });
    expect(taxSavingForAdditionalRelief(inputs, 8000)).toBeCloseTo(650.0, 2);
  });
});

describe('computeLevers', () => {
  it('G5b: employmentIncome 82000, no reliefs, no donations -> cpfTopUp headroom 16000, taxSaving 1210.00', () => {
    const inputs = baseInputs({ employmentIncome: 82000 });
    const levers = computeLevers(inputs, noFrsLevers);
    const cpfTopUp = levers.find((l) => l.id === 'cpfTopUp')!;

    expect(cpfTopUp.headroom).toBeCloseTo(16000, 2);
    expect(cpfTopUp.taxSaving).toBeCloseTo(1210.0, 2);
  });

  it('G6: G1 inputs -> srs lever headroom 15300, taxSaving 1071.00', () => {
    const inputs = baseInputs({
      employmentIncome: 100000,
      donationsGiven: 1000,
      reliefs: zeroReliefs({ earnedIncome: 1000, cpfProvident: 20000 }),
    });
    const levers = computeLevers(inputs, noFrsLevers);
    const srs = levers.find((l) => l.id === 'srs')!;

    expect(srs.headroom).toBeCloseTo(15300, 2);
    expect(srs.taxSaving).toBeCloseTo(1071.0, 2);
  });

  it('G7: employmentIncome 10000, no reliefs -> zero-tax floor, both levers report zero taxSaving', () => {
    const inputs = baseInputs({ employmentIncome: 10000 });
    const result = computeTax(inputs);
    expect(result.netTaxPayable).toBeCloseTo(0, 2);

    const levers = computeLevers(inputs, noFrsLevers);
    const srs = levers.find((l) => l.id === 'srs')!;
    const cpfTopUp = levers.find((l) => l.id === 'cpfTopUp')!;

    expect(srs.taxSaving).toBeCloseTo(0, 2);
    expect(cpfTopUp.taxSaving).toBeCloseTo(0, 2);
  });

  it('G8: FRS gate -> cpfTopUp headroom 0, srs lever unaffected (still full 15300)', () => {
    const inputs = baseInputs({
      employmentIncome: 100000,
      donationsGiven: 1000,
      reliefs: zeroReliefs({ earnedIncome: 1000, cpfProvident: 20000 }),
    });
    const levers = computeLevers(inputs, { isForeigner: false, reachedFullRetirementSum: true });
    const cpfTopUp = levers.find((l) => l.id === 'cpfTopUp')!;
    const srs = levers.find((l) => l.id === 'srs')!;

    expect(cpfTopUp.headroom).toBeCloseTo(0, 2);
    expect(srs.headroom).toBeCloseTo(15300, 2);
  });

  it('G9: raw relief sum 78000, srs field 0, employmentIncome 200000 -> srs effective headroom 2000', () => {
    const inputs = baseInputs({
      employmentIncome: 200000,
      reliefs: zeroReliefs({ cpfProvident: 78000, srs: 0 }),
    });
    const levers = computeLevers(inputs, noFrsLevers);
    const srs = levers.find((l) => l.id === 'srs')!;

    expect(srs.headroom).toBeCloseTo(2000, 2);
  });
});
