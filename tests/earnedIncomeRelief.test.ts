import { earnedIncomeRelief } from '../src/engine';

describe('earnedIncomeRelief', () => {
  it('returns 0 when no age band is declared', () => {
    expect(earnedIncomeRelief(null, 100000)).toBe(0);
  });

  it('grants the full band amount when earned income exceeds it', () => {
    expect(earnedIncomeRelief('below55', 50000)).toBe(1000);
    expect(earnedIncomeRelief('age55to59', 50000)).toBe(6000);
    expect(earnedIncomeRelief('age60Plus', 50000)).toBe(8000);
  });

  it('caps the relief at earned income when income is lower than the band', () => {
    expect(earnedIncomeRelief('age55to59', 3000)).toBe(3000);
    expect(earnedIncomeRelief('age60Plus', 500)).toBe(500);
  });

  it('is 0 when earned income is 0 or negative', () => {
    expect(earnedIncomeRelief('below55', 0)).toBe(0);
    expect(earnedIncomeRelief('below55', -500)).toBe(0);
  });

  it('never exceeds the band amount even with very high income', () => {
    expect(earnedIncomeRelief('below55', 10000000)).toBe(1000);
  });
});
