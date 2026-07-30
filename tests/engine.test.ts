import { bracketBreakdown, grossTax, marginalRate, computeTax } from '../src/engine';
import type { TaxInputs, ReliefInputs } from '../src/engine';

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

describe('grossTax', () => {
  const cases: [number, number][] = [
    [0, 0.0],
    [19999, 0.0],
    [20000, 0.0],
    [20001, 0.02],
    [30000, 200.0],
    [40000, 550.0],
    [80000, 3350.0],
    [82000, 3580.0],
    [120000, 7950.0],
    [160000, 13950.0],
    [200000, 21150.0],
    [240000, 28750.0],
    [280000, 36550.0],
    [320000, 44550.0],
    [500000, 84150.0],
    [1000000, 199150.0],
    [1000001, 199150.24],
  ];

  it.each(cases)('grossTax(%i) === %f', (ci, expected) => {
    expect(grossTax(ci)).toBeCloseTo(expected, 2);
  });
});

describe('marginalRate', () => {
  it('marginalRate(19999) === 0', () => {
    expect(marginalRate(19999)).toBe(0);
  });

  it('marginalRate(20000) === 0.02', () => {
    expect(marginalRate(20000)).toBe(0.02);
  });

  it('marginalRate(76500) === 0.07', () => {
    expect(marginalRate(76500)).toBe(0.07);
  });

  it('marginalRate(80000) === 0.115', () => {
    expect(marginalRate(80000)).toBe(0.115);
  });
});

describe('computeTax', () => {
  it('G1: employmentIncome 100000, donationsGiven 1000, reliefs earnedIncome 1000 + cpfProvident 20000', () => {
    const inputs = baseInputs({
      employmentIncome: 100000,
      donationsGiven: 1000,
      reliefs: zeroReliefs({ earnedIncome: 1000, cpfProvident: 20000 }),
    });
    const result = computeTax(inputs);

    expect(result.assessableIncome).toBeCloseTo(97500, 2);
    expect(result.chargeableIncome).toBeCloseTo(76500, 2);
    expect(result.grossTax).toBeCloseTo(3105.0, 2);
    expect(result.netTaxPayable).toBeCloseTo(3105.0, 2);
    expect(result.marginalRate).toBe(0.07);
    expect(result.reliefsCapped).toBe(false);
  });

  it('G2: employmentIncome 200000, reliefs summing to 90000 (capped to 80000)', () => {
    const inputs = baseInputs({
      employmentIncome: 200000,
      reliefs: zeroReliefs({ cpfProvident: 90000 }),
    });
    const result = computeTax(inputs);

    expect(result.totalReliefs).toBeCloseTo(80000, 2);
    expect(result.reliefsCapped).toBe(true);
    expect(result.chargeableIncome).toBeCloseTo(120000, 2);
    expect(result.grossTax).toBeCloseTo(7950.0, 2);
  });

  it('G3: employmentIncome 30000, reliefs summing 50000 -> zero chargeable income', () => {
    const inputs = baseInputs({
      employmentIncome: 30000,
      reliefs: zeroReliefs({ cpfProvident: 50000 }),
    });
    const result = computeTax(inputs);

    expect(result.chargeableIncome).toBeCloseTo(0, 2);
    expect(result.grossTax).toBeCloseTo(0.0, 2);
    expect(result.netTaxPayable).toBeCloseTo(0.0, 2);
  });

  it('G4: employmentIncome 40000, reliefs summing 10000, parenthoodTaxRebate 5000', () => {
    const inputs = baseInputs({
      employmentIncome: 40000,
      reliefs: zeroReliefs({ cpfProvident: 10000 }),
      parenthoodTaxRebate: 5000,
    });
    const result = computeTax(inputs);

    expect(result.grossTax).toBeCloseTo(200.0, 2);
    expect(result.ptrApplied).toBeCloseTo(200.0, 2);
    expect(result.netTaxPayable).toBeCloseTo(0.0, 2);
  });

  it('lines is a non-empty array with well-formed entries', () => {
    const inputs = baseInputs({
      employmentIncome: 100000,
      donationsGiven: 1000,
      reliefs: zeroReliefs({ earnedIncome: 1000, cpfProvident: 20000 }),
    });
    const result = computeTax(inputs);

    expect(Array.isArray(result.lines)).toBe(true);
    expect(result.lines.length).toBeGreaterThan(0);
    for (const line of result.lines) {
      expect(typeof line.id).toBe('string');
      expect(line.id.length).toBeGreaterThan(0);
      expect(typeof line.label).toBe('string');
      expect(line.label.length).toBeGreaterThan(0);
      expect(typeof line.explanation).toBe('string');
      expect(line.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe('bracketBreakdown (band decomposition for the bracket visual)', () => {
  const CIS = [
    0, 19999, 20000, 20001, 30000, 40000, 76500, 80000, 82000, 120000, 160000,
    200000, 240000, 280000, 320000, 500000, 1000000, 1000001, 2500000,
  ];

  // The invariant that makes the visual trustworthy: the bands are the same
  // arithmetic as grossTax, not a parallel approximation.
  it.each(CIS)('bands sum to grossTax(%i)', (ci) => {
    const summed = bracketBreakdown(ci).reduce((s, b) => s + b.taxFromBand, 0);
    expect(summed).toBeCloseTo(grossTax(ci), 2);
  });

  it.each(CIS)('amounts in band sum to max(ci,0) for %i', (ci) => {
    const summed = bracketBreakdown(ci).reduce((s, b) => s + b.amountInBand, 0);
    expect(summed).toBeCloseTo(Math.max(ci, 0), 2);
  });

  it('clamps negative chargeable income to empty bands', () => {
    const bands = bracketBreakdown(-5000);
    expect(bands.every((b) => b.amountInBand === 0)).toBe(true);
    expect(bands.every((b) => b.taxFromBand === 0)).toBe(true);
  });

  it('fills only the bands at or below the income, and partially fills the last', () => {
    const bands = bracketBreakdown(76500);
    expect(bands[0]).toMatchObject({ lowerBound: 0, amountInBand: 20000 });
    expect(bands[1]).toMatchObject({ lowerBound: 20000, amountInBand: 10000 });
    expect(bands[2]).toMatchObject({ lowerBound: 30000, amountInBand: 10000 });
    expect(bands[3]).toMatchObject({ lowerBound: 40000, amountInBand: 36500 });
    expect(bands[4]?.amountInBand).toBe(0);
    expect(bands[3]?.taxFromBand).toBeCloseTo(2555, 2);
  });

  it('leaves the top band open-ended', () => {
    const bands = bracketBreakdown(2500000);
    const top = bands[bands.length - 1];
    expect(top?.upperBound).toBeNull();
    expect(top?.amountInBand).toBeCloseTo(1500000, 2);
  });
});
