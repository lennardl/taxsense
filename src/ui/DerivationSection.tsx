import NumberFlow from '@number-flow/react';
import clsx from 'clsx';
import { forwardRef } from 'react';
import { BRACKETS_YA2026, bracketBreakdown, formatSGD } from '../engine';
import type { TaxResult } from '../engine';

const CURRENCY_FORMAT = {
  style: 'currency',
  currency: 'SGD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

/**
 * Ledger figures and the net-tax figure animate their digits; nothing else does.
 * NumberFlow renders its digits in a shadow root with no accessible text, so the
 * value is also emitted as visually-hidden text for assistive technology.
 */
export function Money({ value }: { value: number }) {
  return (
    <>
      <span className="sr-only">{formatSGD(value)}</span>
      <NumberFlow
        aria-hidden="true"
        value={value}
        locales="en-SG"
        format={CURRENCY_FORMAT}
      />
    </>
  );
}

/** Round through the float noise so 0.07 reads "7%", not "7.0%". */
function ratePercent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(Math.max((part / whole) * 100, 0), 100);
}

/**
 * Where the income went. The three parts are derived so that they always sum to
 * total income exactly, including when deductions exceed income and the chain
 * floors at zero.
 */
function ProportionBar({ result }: { result: TaxResult }) {
  const { totalIncome, donationsDeduction, totalReliefs, chargeableIncome } = result;
  if (totalIncome <= 0) return null;

  const usedDonations = Math.min(donationsDeduction, totalIncome);
  const usedReliefs = Math.min(totalReliefs, totalIncome - usedDonations);

  const parts = [
    {
      key: 'chargeable',
      label: 'Taxed at your rates',
      amount: chargeableIncome,
    },
    { key: 'reliefs', label: 'Removed by reliefs', amount: usedReliefs },
    { key: 'donations', label: 'Removed by donations', amount: usedDonations },
  ].filter((p) => p.amount > 0);

  const effectiveRate = result.netTaxPayable / totalIncome;

  return (
    <div className="proportion">
      <h3 className="proportion-title">Where your income goes</h3>

      <div
        className="proportion-bar"
        role="img"
        aria-label={parts
          .map((p) => `${p.label}: ${formatSGD(p.amount)}`)
          .join('. ')}
      >
        {parts.map((p) => (
          <div
            className={clsx('proportion-seg', `proportion-seg--${p.key}`)}
            key={p.key}
            style={{ width: `${pct(p.amount, totalIncome)}%` }}
          />
        ))}
      </div>

      <ul className="proportion-legend">
        {parts.map((p) => (
          <li className="proportion-legend-item" key={p.key}>
            <span
              className={clsx('proportion-swatch', `proportion-swatch--${p.key}`)}
              aria-hidden="true"
            />
            {p.label} — {formatSGD(p.amount)}
          </li>
        ))}
      </ul>

      <p className="effective-rate">
        Of {formatSGD(totalIncome)} total income you pay{' '}
        {formatSGD(result.netTaxPayable)} — an effective rate of{' '}
        <strong>{ratePercent(effectiveRate)}</strong>.
      </p>
    </div>
  );
}

function BracketTable({ chargeableIncome }: { chargeableIncome: number }) {
  const bands = bracketBreakdown(chargeableIncome);
  const currentIndex = BRACKETS_YA2026.reduce(
    (acc, bracket, i) => (bracket[0] <= Math.max(chargeableIncome, 0) ? i : acc),
    0,
  );

  return (
    <table className="bracket-table">
      <caption>YA2026 resident tax rates</caption>
      <thead>
        <tr>
          <th scope="col">Chargeable income from</th>
          <th scope="col">Rate on the next dollar</th>
          <th scope="col">How much of this band you filled</th>
        </tr>
      </thead>
      <tbody>
        {bands.map((band, i) => {
          const width =
            band.upperBound === null
              ? band.amountInBand > 0
                ? 100
                : 0
              : pct(band.amountInBand, band.upperBound - band.lowerBound);

          return (
            <tr
              key={band.lowerBound}
              className={clsx(i === currentIndex && 'bracket-row--current')}
              aria-current={i === currentIndex ? 'true' : undefined}
            >
              <td>{formatSGD(band.lowerBound)}</td>
              <td>{ratePercent(band.rate)}</td>
              <td className="bracket-fill">
                <div className="bracket-fill-track">
                  <div
                    className="bracket-fill-bar"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="bracket-band-tax">
                  {band.amountInBand > 0
                    ? `${formatSGD(band.amountInBand)} taxed here → ${formatSGD(band.taxFromBand)}`
                    : 'not reached'}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export interface DerivationSectionProps {
  result: TaxResult;
  /** Contributions switched on in "Your moves" and folded into these figures. */
  plannedTotal: number;
}

const DerivationSection = forwardRef<HTMLElement, DerivationSectionProps>(
  function DerivationSection({ result, plannedTotal }, ref) {
    return (
      <section className="section" aria-labelledby="derivation-title" ref={ref}>
        <h2 className="section-title" id="derivation-title">
          How your tax is worked out
        </h2>

        {plannedTotal > 0 ? (
          <p className="planned-note" role="status">
            These figures include {formatSGD(plannedTotal)} you switched on in Your
            moves. This is not your current position — turn it off below to see where
            you actually stand.
          </p>
        ) : null}

        <p className="marginal-rate">
          Your next dollar of income is taxed at {ratePercent(result.marginalRate)}
        </p>

        <ProportionBar result={result} />

        {result.reliefsCapped ? (
          <p className="capped-note">
            Your reliefs exceed the $80,000 annual cap; only $80,000 is deducted.
          </p>
        ) : null}

        <div className="ledger">
          {result.lines.map((line) => (
            <details
              className={clsx(
                'ledger-line',
                line.id === 'netTaxPayable' && 'ledger-line--total',
              )}
              key={line.id}
            >
              <summary className="ledger-line-summary">
                <span className="ledger-label">{line.label}</span>
                <span className="ledger-amount">
                  <Money value={line.amount} />
                </span>
              </summary>
              <div className="ledger-detail">
                <p>{line.explanation}</p>
                {line.id === 'grossTax' ? (
                  <BracketTable chargeableIncome={result.chargeableIncome} />
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </section>
    );
  },
);

export default DerivationSection;
