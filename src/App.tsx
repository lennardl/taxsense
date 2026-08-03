import { Tooltip } from '@base-ui-components/react/tooltip';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RELIEF_KEYS,
  computeLevers,
  computeTax,
  earnedIncomeRelief,
  formatSGD,
} from './engine';
import type { EarnedIncomeAgeBand, Lever, ReliefInputs, TaxInputs } from './engine';
import { ManualEntrySource } from './profile/source';
import type { ProfileSource } from './profile/source';
import DerivationSection, { Money, ratePercent } from './ui/DerivationSection';
import { buildSummaryText } from './ui/exportUtils';
import InputsSection, { FIELD_KEYS } from './ui/InputsSection';
import type { FieldKey } from './ui/InputsSection';
import MovesSection, { LEVER_RELIEF_KEY } from './ui/MovesSection';

type RawFields = Record<FieldKey, string>;

const EMPTY_RAW: RawFields = FIELD_KEYS.reduce((acc, key) => {
  acc[key] = '';
  return acc;
}, {} as RawFields);

/** A representative, clearly-labelled example — not a real person's figures. */
const EXAMPLE_RAW: Partial<RawFields> = {
  employmentIncome: '60,000',
  donationsGiven: '200',
  cpfProvident: '7,200',
};
const EXAMPLE_AGE_BAND: EarnedIncomeAgeBand = 'below55';

/**
 * Empty field = 0. Negative and unparseable entries clamp to 0.
 * Thousands separators are stripped — the inputs display grouped digits.
 */
function toNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.max(n, 0) : 0;
}

function toTaxInputs(raw: RawFields): TaxInputs {
  const reliefs = RELIEF_KEYS.reduce((acc, key) => {
    acc[key] = toNumber(raw[key]);
    return acc;
  }, {} as ReliefInputs);

  return {
    employmentIncome: toNumber(raw.employmentIncome),
    employmentExpenses: toNumber(raw.employmentExpenses),
    tradeIncome: toNumber(raw.tradeIncome),
    otherIncome: toNumber(raw.otherIncome),
    donationsGiven: toNumber(raw.donationsGiven),
    reliefs,
    parenthoodTaxRebate: toNumber(raw.parenthoodTaxRebate),
  };
}

/** Seed the form from a ProfileSource. Manual entry contributes nothing today. */
function profileToRaw(profile: Partial<TaxInputs>): Partial<RawFields> {
  const seeded: Partial<RawFields> = {};
  for (const key of FIELD_KEYS) {
    if (key === 'employmentIncome' || key === 'employmentExpenses' ||
        key === 'tradeIncome' || key === 'otherIncome' ||
        key === 'donationsGiven' || key === 'parenthoodTaxRebate') {
      const value = profile[key];
      if (typeof value === 'number') seeded[key] = String(value);
    } else {
      const value = profile.reliefs?.[key];
      if (typeof value === 'number') seeded[key] = String(value);
    }
  }
  return seeded;
}

export default function App() {
  const source = useMemo<ProfileSource>(() => new ManualEntrySource(), []);
  const [raw, setRaw] = useState<RawFields>(EMPTY_RAW);
  const [ageBand, setAgeBand] = useState<EarnedIncomeAgeBand | null>(null);
  const [isForeigner, setIsForeigner] = useState(false);
  const [reachedFullRetirementSum, setReachedFullRetirementSum] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );

  const derivationRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void source.getProfile().then((profile) => {
      if (cancelled) return;
      const seeded = profileToRaw(profile);
      if (Object.keys(seeded).length > 0) {
        setRaw((prev) => ({ ...prev, ...seeded }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    const target = derivationRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Contributions the user has switched on in "Your moves". Held separately from
  // the form so that levers keep their headroom: writing straight into the relief
  // field would drive headroom to zero and make the card disappear as you use it.
  const [applied, setApplied] = useState<Record<Lever['id'], number>>({
    srs: 0,
    cpfTopUp: 0,
  });

  const formInputs = useMemo(() => toTaxInputs(raw), [raw]);

  // Earned Income Relief is derived, not typed: a flat amount by age band, capped
  // at earned income. It replaces whatever the (unused) raw field would have held.
  const inputs = useMemo<TaxInputs>(() => {
    const earnedIncomeForRelief =
      formInputs.employmentIncome - formInputs.employmentExpenses + formInputs.tradeIncome;
    return {
      ...formInputs,
      reliefs: {
        ...formInputs.reliefs,
        earnedIncome: earnedIncomeRelief(ageBand, earnedIncomeForRelief),
      },
    };
  }, [formInputs, ageBand]);

  // Levers are always computed from the form alone, never from applied amounts.
  const levers = useMemo(
    () => computeLevers(inputs, { isForeigner, reachedFullRetirementSum }),
    [inputs, isForeigner, reachedFullRetirementSum],
  );

  // The hero's bridge line to Your moves: the largest single saving still on
  // the table, so the CTA doesn't depend on the user scrolling down unprompted
  // to discover it exists.
  const maxSaving = levers.reduce(
    (max, l) => (l.headroom > 0 && l.taxSaving > max ? l.taxSaving : max),
    0,
  );

  // Headroom moves as the form changes, so a stale applied amount is clamped.
  const clampedApplied = useMemo(() => {
    const byId = new Map(levers.map((l) => [l.id, l.headroom]));
    return {
      srs: Math.min(applied.srs, byId.get('srs') ?? 0),
      cpfTopUp: Math.min(applied.cpfTopUp, byId.get('cpfTopUp') ?? 0),
    };
  }, [applied, levers]);

  const plannedTotal = clampedApplied.srs + clampedApplied.cpfTopUp;

  // The ledger shows the what-if: form inputs plus anything switched on.
  const effectiveInputs = useMemo<TaxInputs>(() => {
    if (plannedTotal === 0) return inputs;
    const reliefs = { ...inputs.reliefs };
    for (const [id, amount] of Object.entries(clampedApplied)) {
      if (amount <= 0) continue;
      const key = LEVER_RELIEF_KEY[id as Lever['id']];
      reliefs[key] += amount;
    }
    return { ...inputs, reliefs };
  }, [inputs, clampedApplied, plannedTotal]);

  const result = useMemo(() => computeTax(effectiveInputs), [effectiveInputs]);

  // Delta feedback: "$350 less than a moment ago" next to the hero figure.
  // Tracked with a ref (not state) for the previous value so the comparison
  // runs once per commit rather than looping; the visible delta itself is
  // state so it survives to the next render. No transition on it — this is
  // the keystroke recompute path, which §6.4 already bars from animating, so
  // the number simply appears already correct, like every other figure here.
  const [netTaxDelta, setNetTaxDelta] = useState<number | null>(null);
  const prevNetTaxRef = useRef<number | null>(null);
  const prevTotalIncomeRef = useRef(0);
  useEffect(() => {
    const prevTotal = prevTotalIncomeRef.current;
    const prevNetTax = prevNetTaxRef.current;
    // Skip the very first reveal (0 -> something) — that's arrival, not change.
    if (prevTotal > 0 && prevNetTax !== null && prevNetTax !== result.netTaxPayable) {
      setNetTaxDelta(result.netTaxPayable - prevNetTax);
    } else if (result.totalIncome === 0) {
      setNetTaxDelta(null);
    }
    prevNetTaxRef.current = result.netTaxPayable;
    prevTotalIncomeRef.current = result.totalIncome;
  }, [result.netTaxPayable, result.totalIncome]);

  // "Your moves" branches on the user's ACTUAL position, not the what-if. Using the
  // effective figures would let an applied lever drive net tax to zero, swap in the
  // MRSS message, and take away the toggle needed to switch it back off.
  const baseResult = useMemo(() => computeTax(inputs), [inputs]);

  const onFieldChange = (key: FieldKey, value: string) =>
    setRaw((prev) => ({ ...prev, [key]: value }));

  const onFillExample = () => {
    setRaw((prev) => ({ ...prev, ...EXAMPLE_RAW }));
    setAgeBand(EXAMPLE_AGE_BAND);
  };

  const onClearAll = () => {
    setRaw(EMPTY_RAW);
    setAgeBand(null);
    setIsForeigner(false);
    setReachedFullRetirementSum(false);
    setApplied({ srs: 0, cpfTopUp: 0 });
    setNetTaxDelta(null);
    prevNetTaxRef.current = null;
    prevTotalIncomeRef.current = 0;
  };

  const onCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText(result));
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const effectiveRate =
    result.totalIncome > 0 ? result.netTaxPayable / result.totalIncome : 0;

  return (
    <Tooltip.Provider delay={200} closeDelay={0} timeout={400}>
      {showStickyBar ? (
        <div className="sticky-bar">
          <span className="sticky-bar-label">Net tax payable</span>
          <span className="sticky-bar-figure">
            <Money value={result.netTaxPayable} />
          </span>
        </div>
      ) : null}

      {/* Mobile twin of the sticky bar above. That one only appears once the
          derivation section has scrolled fully out of view — on a phone,
          where the form is much taller than the screen, that means the
          headline figure is invisible for most of the scroll. This one is
          gated on having data at all, not on scroll position, and is CSS-only
          hidden above 1100px so it never doubles up with the sticky bar or
          the (desktop-only) sticky derivation panel. */}
      {result.totalIncome > 0 ? (
        <div className="mobile-answer-bar" aria-live="polite">
          <span className="sticky-bar-label">Net tax payable</span>
          <span className="sticky-bar-figure">
            <Money value={result.netTaxPayable} />
          </span>
        </div>
      ) : null}

      <main className="app">
        <a className="skip-link" href="#derivation-panel">
          Skip to your tax breakdown
        </a>

        {/* Pre-release notice. Remove only when every item on the Execution Plan
            §10 human-verification list has been signed off. Collapsed by default:
            the bold line carries the warning; detail is a click away rather than
            the first 90 words on the page. */}
        <aside className="draft-banner" role="note" aria-label="Draft notice">
          <details className="draft-banner-details">
            <summary className="draft-banner-summary">
              <strong>Draft — figures are unverified. Don't file or act on them yet.</strong>
              <span className="draft-banner-toggle">What's not verified</span>
            </summary>
            <div className="draft-banner-body">
              <ul>
                <li>
                  SRS caps, the CPF cash top-up relief ceiling, and relief amounts
                  shown are pending re-check against current IRAS and CPF pages.
                </li>
                <li>Spouse Relief amounts are unverified — enter them manually.</li>
                <li>
                  It has not been confirmed whether a YA2026 one-off tax rebate
                  applies.
                </li>
                <li>
                  Relief eligibility is not checked: switching a relief on, or
                  entering an amount, does not mean you qualify for it.
                </li>
                <li>
                  Amounts you apply from Your moves are hypothetical, not
                  contributions.
                </li>
                <li>The wording on this page has had no legal or communications review.</li>
              </ul>
            </div>
          </details>
        </aside>

        <p className="brand-mark">TaxSense</p>
        <h1 className="page-title">Your income tax for YA2026, line by line</h1>
        <p className="page-subtitle">
          For income earned in 2025 (Year of Assessment 2026).
        </p>
        <p className="privacy-badge">
          <span aria-hidden="true">🔒</span> Nothing you type is stored, sent
          anywhere, or saved after you close this page.
        </p>

        <section className="hero-answer" aria-live="polite">
          {result.totalIncome > 0 ? (
            <div className="hero-answer-content">
              <p className="hero-answer-label">Your net tax payable</p>
              <p className="hero-answer-figure">
                <Money value={result.netTaxPayable} />
              </p>
              {netTaxDelta !== null && netTaxDelta !== 0 ? (
                <p className="hero-answer-delta">
                  {netTaxDelta < 0 ? '▼' : '▲'} {formatSGD(Math.abs(netTaxDelta))}{' '}
                  {netTaxDelta < 0 ? 'less' : 'more'} than a moment ago
                </p>
              ) : null}
              <p className="hero-answer-sub">
                That's an effective rate of {ratePercent(effectiveRate)} on{' '}
                {result.totalIncome > 0 ? 'your total income' : ''}.
              </p>
              {plannedTotal > 0 ? (
                <p className="hero-answer-note">
                  Includes a hypothetical move from Your moves — see below.
                </p>
              ) : null}
              {maxSaving > 0 ? (
                <p className="hero-answer-cta">
                  You could still save up to {formatSGD(maxSaving)} before 31 Dec —{' '}
                  <a href="#moves-title">see Your moves ↓</a>
                </p>
              ) : null}
              <div className="hero-answer-actions">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={onCopySummary}
                >
                  {/* Keyed so React remounts the label on status change — that
                      mount is what @starting-style hooks into for the
                      crossfade, rather than a hard content swap. */}
                  <span className="hero-answer-copy-label" key={copyStatus}>
                    {copyStatus === 'copied'
                      ? 'Copied ✓'
                      : copyStatus === 'failed'
                        ? "Couldn't copy — try again"
                        : 'Copy summary'}
                  </span>
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => window.print()}
                >
                  Print or save as PDF
                </button>
              </div>
            </div>
          ) : (
            <p className="hero-answer-placeholder">
              Fill in your numbers below to see your tax, worked out line by line.
            </p>
          )}
        </section>

        <div className="workspace">
          <div className="workspace-inputs">
            <InputsSection
              raw={raw}
              ageBand={ageBand}
              earnedIncomeReliefAmount={inputs.reliefs.earnedIncome}
              isForeigner={isForeigner}
              reachedFullRetirementSum={reachedFullRetirementSum}
              onFieldChange={onFieldChange}
              onAgeBandChange={setAgeBand}
              onForeignerChange={setIsForeigner}
              onFrsChange={setReachedFullRetirementSum}
              onFillExample={onFillExample}
              onClearAll={onClearAll}
            />
          </div>
          {/* tabIndex=0 so a keyboard user can Tab straight to this region and
              scroll it with arrow keys, rather than only reaching it via the
              focusable elements inside — on desktop it becomes an
              independently-scrolling sticky panel. */}
          <div className="workspace-derivation" id="derivation-panel" tabIndex={0}>
            <DerivationSection
              ref={derivationRef}
              result={result}
              plannedTotal={plannedTotal}
            />
          </div>
        </div>

        <MovesSection
          levers={levers}
          inputs={inputs}
          totalIncome={baseResult.totalIncome}
          netTaxPayable={baseResult.netTaxPayable}
          applied={clampedApplied}
          onApply={(id, amount) =>
            setApplied((prev) => ({ ...prev, [id]: amount }))
          }
        />
      </main>
    </Tooltip.Provider>
  );
}
