import { useState } from 'react';
import { formatSGD, taxSavingForAdditionalRelief } from '../engine';
import type { Lever, ReliefKey, TaxInputs } from '../engine';

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
  const applyId = `lever-apply-${lever.id}`;
  const applied = appliedAmount > 0;

  return (
    <article className="lever-card">
      <p className="lever-card-headline">
        You can still put {formatSGD(lever.headroom)} into {LEVER_NAMES[lever.id]}{' '}
        this year. At your income, that saves {formatSGD(lever.taxSaving)} in tax.
        Deadline: {DEADLINE}.
      </p>

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
          <span>{formatSGD(0)}</span>
          <span>{formatSGD(lever.headroom)}</span>
        </div>
        <p className="lever-slider-readout" role="status">
          Put in {formatSGD(amount)} and you save <strong>{formatSGD(saving)}</strong>{' '}
          in tax.
        </p>

        <div className="toggle-field">
          <input
            id={applyId}
            type="checkbox"
            checked={applied}
            aria-describedby={`${applyId}-hint`}
            onChange={(e) => onApply(lever.id, e.target.checked ? amount : 0)}
          />
          <label htmlFor={applyId}>Apply this to the breakdown above</label>
        </div>
        <p className="field-helper" id={`${applyId}-hint`}>
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
        actionable.map((lever) => (
          <LeverCard
            key={lever.id}
            lever={lever}
            inputs={inputs}
            appliedAmount={applied[lever.id]}
            onApply={onApply}
          />
        ))
      )}

      {/* §6.3 requires this exact wording. Do not edit this paragraph. */}
      <p className="disclaimer">
        This tool is for education. It is not tax advice and not an official IRAS
        assessment. Figures follow IRAS's published YA2026 calculator; verify against
        myTax Portal before acting.
      </p>

      {/* Additional pre-release warnings, separate so the wording above stays
          verbatim. Remove alongside the draft banner once §10 is signed off. */}
      <p className="disclaimer">
        Verification status: the YA2026 tax rates and the derivation chain are taken
        from IRAS's own calculator. The contribution caps and relief amounts are not
        drawn from that workbook and are pending re-verification — treat every dollar
        figure here as indicative only. Relief eligibility is not checked: switching a
        relief on or entering an amount does not mean you qualify for it. Amounts you
        apply from Your moves are hypothetical and are not contributions. No personal
        data is stored, sent anywhere, or retained after you close this page.
      </p>
    </section>
  );
}
