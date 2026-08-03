import { useState } from 'react';
import { formatSGD, formatSGDWhole, taxSavingForAdditionalRelief } from '../engine';
import type { Lever, ReliefKey, TaxInputs } from '../engine';
import { downloadIcsReminder } from './exportUtils';

const LEVER_NAMES: Record<Lever['id'], string> = {
  srs: 'SRS',
  cpfTopUp: 'CPF cash top-up',
};

/** Which relief field each lever's contribution lands in. */
export const LEVER_RELIEF_KEY: Record<Lever['id'], ReliefKey> = {
  srs: 'srs',
  cpfTopUp: 'cpfCashTopUp',
};

const DEADLINE = '31 Dec 2026';

/**
 * SRS providers, unranked. Verified Jul 2026 — re-verify each YA; bank URLs are
 * marketing pages and get restructured more often than IRAS's own.
 * Alphabetical, not by any commercial preference.
 */
const SRS_PROVIDERS = [
  { name: 'DBS/POSB', url: 'https://www.dbs.com.sg/personal/investments/srs-and-cpf/supplementary-retirement-scheme' },
  { name: 'OCBC', url: 'https://www.ocbc.com/personal-banking/investments/supplementary-retirement-scheme-account' },
  { name: 'UOB', url: 'https://www.uob.com.sg/personal/invest/srs-account.page' },
];

interface LeverCardProps {
  lever: Lever;
  inputs: TaxInputs;
  appliedAmount: number;
  onApply: (id: Lever['id'], amount: number) => void;
}

function LeverCard({ lever, inputs, appliedAmount, onApply }: LeverCardProps) {
  // null means "not touched yet" — the slider then sits at full headroom, so the
  // readout agrees with the headline until the user explores.
  const [chosen, setChosen] = useState<number | null>(null);

  // Headroom moves as income and reliefs change, so a stored amount is clamped
  // rather than trusted.
  const amount = Math.min(chosen ?? lever.headroom, lever.headroom);
  const saving = taxSavingForAdditionalRelief(
    inputs,
    amount,
    LEVER_RELIEF_KEY[lever.id],
  );
  const step = lever.headroom >= 1000 ? 100 : 10;
  const sliderId = `lever-slider-${lever.id}`;
  const applied = appliedAmount > 0;

  return (
    <article className="lever-card">
      <p className="lever-card-headline">
        You can still put {formatSGD(lever.headroom)} into {LEVER_NAMES[lever.id]}{' '}
        this year. At your income, that saves {formatSGD(lever.taxSaving)} in tax.
        Deadline: {DEADLINE}.
      </p>

      {lever.id === 'srs' ? (
        <p className="lever-explainer">
          SRS is a voluntary retirement savings account — open one at any of these
          banks (unranked), then transfer in before the deadline to claim the
          relief:{' '}
          {SRS_PROVIDERS.map((p, i) => (
            <span key={p.name}>
              {i > 0 ? ', ' : ''}
              <a href={p.url} target="_blank" rel="noreferrer">
                {p.name}
              </a>
            </span>
          ))}
          . You may hold only one SRS account across all three banks.
        </p>
      ) : null}

      <div className="lever-slider">
        <label className="lever-slider-label" htmlFor={sliderId}>
          Try a smaller amount
        </label>
        <input
          className="lever-slider-input"
          id={sliderId}
          type="range"
          min={0}
          max={lever.headroom}
          step={step}
          value={amount}
          aria-valuetext={`${formatSGD(amount)}, saving ${formatSGD(saving)} in tax`}
          onChange={(e) => {
            const next = Number(e.target.value);
            setChosen(next);
            // Keep an applied lever in step with the slider.
            if (applied) onApply(lever.id, next);
          }}
        />
        <div className="lever-slider-scale">
          <span>{formatSGDWhole(0)}</span>
          <span>{formatSGDWhole(lever.headroom)}</span>
        </div>
        <p className="lever-slider-readout" role="status">
          Put in {formatSGD(amount)} and you save <strong>{formatSGD(saving)}</strong>{' '}
          in tax.
        </p>

        <button
          type="button"
          className="button button--preview"
          aria-pressed={applied}
          aria-describedby={`lever-apply-hint-${lever.id}`}
          onClick={() => onApply(lever.id, applied ? 0 : amount)}
        >
          {applied ? 'Remove from breakdown ↑' : 'Preview in breakdown above ↑'}
        </button>
        <p className="field-helper" id={`lever-apply-hint-${lever.id}`}>
          Adds it to your reliefs so you can see the effect on your tax. Nothing is
          contributed — this only changes the figures on this page.
        </p>
      </div>

      <p className="lever-lockup">{lever.lockUpNote}</p>
    </article>
  );
}

export interface MovesSectionProps {
  levers: Lever[];
  inputs: TaxInputs;
  totalIncome: number;
  netTaxPayable: number;
  applied: Record<Lever['id'], number>;
  onApply: (id: Lever['id'], amount: number) => void;
}

export default function MovesSection({
  levers,
  inputs,
  totalIncome,
  netTaxPayable,
  applied,
  onApply,
}: MovesSectionProps) {
  const actionable = levers.filter((l) => l.headroom > 0 && l.taxSaving > 0);

  return (
    <section className="section" aria-labelledby="moves-title">
      <h2 className="section-title" id="moves-title">
        Your moves
      </h2>

      {totalIncome === 0 ? (
        <p className="placeholder-note">Enter your income above to see your moves</p>
      ) : netTaxPayable === 0 ? (
        <p className="mrss-note">
          You pay little or no income tax, so tax relief isn't your lever. If you're
          building retirement savings, the Matched Retirement Savings Scheme matches
          eligible CPF top-ups dollar-for-dollar — check your eligibility on the{' '}
          <a href="https://www.cpf.gov.sg" target="_blank" rel="noreferrer">
            CPF website
          </a>
          .
        </p>
      ) : (
        <>
          {actionable.map((lever) => (
            <LeverCard
              key={lever.id}
              lever={lever}
              inputs={inputs}
              appliedAmount={applied[lever.id]}
              onApply={onApply}
            />
          ))}
          <button
            type="button"
            className="button button--ghost"
            onClick={downloadIcsReminder}
          >
            Add a reminder to your calendar (1 Oct)
          </button>
        </>
      )}

      {/* §6.3 requires this exact wording. Do not edit this paragraph. */}
      <p className="disclaimer">
        This tool is for education. It is not tax advice and not an official IRAS
        assessment. Figures follow IRAS's published YA2026 calculator; verify against
        myTax Portal before acting.
      </p>

      <details className="methodology-details">
        <summary className="methodology-summary">
          <span className="field-group-title">Where these numbers come from</span>
        </summary>
        <div className="methodology-body">
          <p>
            Tax rates and the derivation chain follow IRAS's own published
            YA2026 individual income tax calculator. Relief caps and constants
            that don't appear in that workbook — the SRS contribution caps, the
            CPF cash top-up relief ceiling, the donation deduction multiplier —
            were checked directly against IRAS and CPF's public pages, last
            verified July 2026.
          </p>
          <p>
            <a
              href="https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs"
              target="_blank"
              rel="noreferrer"
            >
              IRAS — tax reliefs
            </a>
            {' · '}
            <a
              href="https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/srs-contributions"
              target="_blank"
              rel="noreferrer"
            >
              IRAS — SRS contributions
            </a>
            {' · '}
            <a href="https://www.cpf.gov.sg" target="_blank" rel="noreferrer">
              CPF Board
            </a>
          </p>
        </div>
      </details>
    </section>
  );
}
