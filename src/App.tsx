import { Tooltip } from '@base-ui-components/react/tooltip';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RELIEF_KEYS, computeLevers, computeTax } from './engine';
import type { Lever, ReliefInputs, TaxInputs } from './engine';
import { ManualEntrySource } from './profile/source';
import type { ProfileSource } from './profile/source';
import DerivationSection, { Money } from './ui/DerivationSection';
import InputsSection, { FIELD_KEYS } from './ui/InputsSection';
import type { FieldKey } from './ui/InputsSection';
import MovesSection, { LEVER_RELIEF_KEY } from './ui/MovesSection';

type RawFields = Record<FieldKey, string>;

const EMPTY_RAW: RawFields = FIELD_KEYS.reduce((acc, key) => {
  acc[key] = '';
  return acc;
}, {} as RawFields);

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
  const [isForeigner, setIsForeigner] = useState(false);
  const [reachedFullRetirementSum, setReachedFullRetirementSum] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

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

  const inputs = useMemo(() => toTaxInputs(raw), [raw]);

  // Levers are always computed from the form alone, never from applied amounts.
  const levers = useMemo(
    () => computeLevers(inputs, { isForeigner, reachedFullRetirementSum }),
    [inputs, isForeigner, reachedFullRetirementSum],
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

  // "Your moves" branches on the user's ACTUAL position, not the what-if. Using the
  // effective figures would let an applied lever drive net tax to zero, swap in the
  // MRSS message, and take away the toggle needed to switch it back off.
  const baseResult = useMemo(() => computeTax(inputs), [inputs]);

  const onFieldChange = (key: FieldKey, value: string) =>
    setRaw((prev) => ({ ...prev, [key]: value }));

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

      <main className="app">
        {/* Pre-release notice. Remove only when every item on the Execution Plan
            §10 human-verification list has been signed off. */}
        <aside className="draft-banner" role="note" aria-label="Draft notice">
          <strong>Draft — do not rely on these figures.</strong> This tool has not
          completed verification. The SRS contribution caps, the CPF cash top-up
          relief ceiling and the relief amounts shown are pending re-check against
          current IRAS and CPF pages. Spouse Relief amounts are unverified and must be
          entered manually. It has not been confirmed whether a YA2026 one-off tax
          rebate applies. The wording on this page has had no legal or communications
          review. Do not use it for filing or for contribution decisions.
        </aside>

        <h1 className="page-title">
          Your income tax for YA2026, line by line
        </h1>

        <InputsSection
          raw={raw}
          isForeigner={isForeigner}
          reachedFullRetirementSum={reachedFullRetirementSum}
          onFieldChange={onFieldChange}
          onForeignerChange={setIsForeigner}
          onFrsChange={setReachedFullRetirementSum}
        />

        <DerivationSection
          ref={derivationRef}
          result={result}
          plannedTotal={plannedTotal}
        />

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
