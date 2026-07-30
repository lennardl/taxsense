// [lowerBound, cumulativeTaxAtBound, marginalRateAboveBound]
// YA2026 table, verified against IRAS's own YA2026 workbook.
// Do not re-derive, reorder, or "correct" this table.
export const BRACKETS_YA2026: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [20000, 0, 0.02],
  [30000, 200, 0.035],
  [40000, 550, 0.07],
  [80000, 3350, 0.115],
  [120000, 7950, 0.15],
  [160000, 13950, 0.18],
  [200000, 21150, 0.19],
  [240000, 28750, 0.195],
  [280000, 36550, 0.2],
  [320000, 44550, 0.22],
  [500000, 84150, 0.23],
  [1000000, 199150, 0.24],
];
