import { Tooltip } from '@base-ui-components/react/tooltip';
import { useState } from 'react';
import {
  GRANDPARENT_CAREGIVER_RELIEF,
  GRANDPARENT_CAREGIVER_RELIEF_CONDITIONS,
  RELIEF_KEYS,
  SIBLING_DISABILITY_RELIEF_CONDITIONS,
  formatSGD,
} from '../engine';
import type { ReliefKey } from '../engine';

/**
 * Reliefs rendered as a flat on/off claim rather than a dollar field.
 *
 * Only reliefs that are a single fixed amount AND cannot be shared between
 * claimants belong here — a toggle cannot express an apportioned share. Sibling
 * Relief (Disability) is a fixed $5,500 but IS shareable, so it stays a dollar
 * field with the figure surfaced as helper text.
 */
const FLAT_RELIEFS: Partial<
  Record<ReliefKey, { amount: number; conditions: string }>
> = {
  grandparentCaregiver: {
    amount: GRANDPARENT_CAREGIVER_RELIEF,
    conditions: GRANDPARENT_CAREGIVER_RELIEF_CONDITIONS,
  },
};

/** Verified figures surfaced as helper text where a toggle would be unsafe. */
const RELIEF_HELPERS: Partial<Record<ReliefKey, string>> = {
  siblingDisability: SIBLING_DISABILITY_RELIEF_CONDITIONS,
};

/**
 * Live thousands separators while typing.
 *
 * `type="number"` cannot hold a comma — the browser discards the whole value — so
 * money fields are `type="text"` with `inputMode="decimal"`. A leading minus is
 * preserved so the existing negative-clamp note still fires.
 */
export function formatMoneyInput(raw: string): string {
  const negative = raw.trimStart().startsWith('-');

  let s = raw.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = `${s.slice(0, firstDot + 1)}${s.slice(firstDot + 1).replace(/\./g, '')}`;
  }

  const [intRaw = '', dec] = s.split('.');
  // Strip leading zeros but keep a lone "0".
  const int = intRaw.replace(/^0+(?=\d)/, '');
  // Grouped by regex, not toLocaleString, so long inputs can't lose precision.
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let out = grouped;
  if (dec !== undefined) {
    out = `${grouped === '' ? '0' : grouped}.${dec.slice(0, 2)}`;
  }
  return `${negative && out !== '' ? '-' : ''}${out}`;
}

/** How many digits sit left of the caret — the anchor that survives reformatting. */
function digitsBeforeCaret(value: string, caret: number): number {
  return value.slice(0, caret).replace(/\D/g, '').length;
}

/** Inverse of the above: the caret offset that sits after `n` digits. */
function caretAfterDigits(value: string, n: number): number {
  if (n === 0) return value.startsWith('-') ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (/\d/.test(value[i] ?? '')) {
      seen += 1;
      if (seen === n) return i + 1;
    }
  }
  return value.length;
}

export type FieldKey =
  | 'employmentIncome'
  | 'employmentExpenses'
  | 'tradeIncome'
  | 'otherIncome'
  | 'donationsGiven'
  | 'parenthoodTaxRebate'
  | ReliefKey;

export const FIELD_KEYS: readonly FieldKey[] = [
  'employmentIncome',
  'employmentExpenses',
  'tradeIncome',
  'otherIncome',
  'donationsGiven',
  'parenthoodTaxRebate',
  ...RELIEF_KEYS,
];

const RELIEF_LABELS: Record<ReliefKey, string> = {
  earnedIncome: 'Earned Income Relief',
  spouse: 'Spouse Relief',
  qualifyingChild: 'Qualifying Child Relief',
  workingMotherChild: "Working Mother's Child Relief",
  parent: 'Parent Relief',
  grandparentCaregiver: 'Grandparent Caregiver Relief',
  siblingDisability: 'Sibling Relief (Disability)',
  cpfProvident: 'CPF / provident fund relief',
  lifeInsurance: 'Life Insurance Relief',
  cpfCashTopUp: 'CPF cash top-up relief',
  srs: 'SRS relief',
  nsman: 'NSman Relief',
};

/** Source: iras.gov.sg, Jul 2026. Re-verify each YA. */
const RELIEF_LINKS: Record<ReliefKey, string> = {
  earnedIncome:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/earned-income-relief',
  spouse:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/spouse-relief-spouse-relief-(disability)',
  qualifyingChild:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/qualifying-child-relief-(qcr)-child-relief-(disability)',
  workingMotherChild:
    "https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/working-mother's-child-relief-(wmcr)",
  parent:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/parent-relief-parent-relief-(disability)',
  grandparentCaregiver:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/grandparent-caregiver-relief',
  siblingDisability:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/sibling-relief-(disability)',
  cpfProvident:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/central-provident-fund(cpf)-relief-for-employees',
  lifeInsurance:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/life-insurance-relief',
  cpfCashTopUp:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/central-provident-fund-(cpf)-cash-top-up-relief',
  srs: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/special-tax-schemes/srs-contributions',
  nsman:
    'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/nsman-relief-(self-wife-and-parent)',
};

function ReliefTooltip({ reliefKey }: { reliefKey: ReliefKey }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        className="tooltip-trigger"
        aria-label={`About ${RELIEF_LABELS[reliefKey]}`}
      >
        ?
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">
            Eligibility conditions and the cap for this relief are set by IRAS.{' '}
            <a href={RELIEF_LINKS[reliefKey]} target="_blank" rel="noreferrer">
              Read the IRAS page
            </a>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

interface MoneyFieldProps {
  fieldKey: FieldKey;
  label: string;
  value: string;
  helper?: string;
  clamped: boolean;
  reliefKey?: ReliefKey;
  onChange: (key: FieldKey, raw: string) => void;
}

function MoneyField({
  fieldKey,
  label,
  value,
  helper,
  clamped,
  reliefKey,
  onChange,
}: MoneyFieldProps) {
  const helperId = helper ? `${fieldKey}-helper` : undefined;
  const noteId = clamped ? `${fieldKey}-note` : undefined;
  const describedBy = [helperId, noteId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldKey}>
        {label}
        {reliefKey ? <ReliefTooltip reliefKey={reliefKey} /> : null}
      </label>
      <input
        className="field-input"
        id={fieldKey}
        name={fieldKey}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={value}
        aria-describedby={describedBy}
        onChange={(e) => {
          const el = e.currentTarget;
          const typed = el.value;
          const anchor = digitsBeforeCaret(typed, el.selectionStart ?? typed.length);
          const formatted = formatMoneyInput(typed);
          const caret = caretAfterDigits(formatted, anchor);
          // Write straight to the DOM as well: if the formatted result equals the
          // current state, React skips the re-render and the raw keystroke (e.g. a
          // manually typed comma) would otherwise stay on screen.
          el.value = formatted;
          el.setSelectionRange(caret, caret);
          onChange(fieldKey, formatted);
        }}
      />
      {helper ? (
        <p className="field-helper" id={helperId}>
          {helper}
        </p>
      ) : null}
      {clamped ? (
        <p className="field-note" id={noteId} role="status">
          Negative amounts are treated as $0.00.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Reliefs that are a single flat dollar amount. The user still self-declares by
 * toggling — the tool does not decide eligibility. Toggling writes the amount into
 * the same string field the dollar inputs use, so the engine, the $80,000 cap and
 * the whole derivation chain are untouched.
 */
interface FlatReliefControlProps {
  fieldKey: ReliefKey;
  label: string;
  amount: number;
  conditions: string;
  value: string;
  onChange: (key: FieldKey, raw: string) => void;
}

function FlatReliefToggle({
  fieldKey,
  label,
  amount,
  conditions,
  value,
  onChange,
}: FlatReliefControlProps) {
  const checked = Number(value) > 0;
  const noteId = `${fieldKey}-conditions`;

  return (
    <div className="field">
      <div className="toggle-field">
        <input
          id={fieldKey}
          type="checkbox"
          checked={checked}
          aria-describedby={noteId}
          onChange={(e) => onChange(fieldKey, e.target.checked ? String(amount) : '')}
        />
        <label htmlFor={fieldKey}>
          {label} — {formatSGD(amount)}
        </label>
        <ReliefTooltip reliefKey={fieldKey} />
      </div>
      <p className="field-helper" id={noteId}>
        {conditions}
      </p>
    </div>
  );
}

export interface InputsSectionProps {
  raw: Record<FieldKey, string>;
  isForeigner: boolean;
  reachedFullRetirementSum: boolean;
  onFieldChange: (key: FieldKey, raw: string) => void;
  onForeignerChange: (next: boolean) => void;
  onFrsChange: (next: boolean) => void;
}

export default function InputsSection({
  raw,
  isForeigner,
  reachedFullRetirementSum,
  onFieldChange,
  onForeignerChange,
  onFrsChange,
}: InputsSectionProps) {
  const isClamped = (key: FieldKey) => Number(raw[key].replace(/,/g, '')) < 0;

  const reliefTotal = RELIEF_KEYS.reduce((sum, key) => {
    const n = Number(raw[key].replace(/,/g, ''));
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  // Read once on mount: this is the initial state of a user-controllable
  // <details>, not a live binding — reopening it on every resize would fight the
  // user. Phones start collapsed, tablet and wider start open.
  const [reliefsOpenByDefault] = useState(
    () =>
      typeof window === 'undefined' ||
      window.matchMedia('(min-width: 48rem)').matches,
  );

  return (
    <section className="section" aria-labelledby="inputs-title">
      <h2 className="section-title" id="inputs-title">
        Your numbers
      </h2>

      <div className="field-group">
        <h3 className="field-group-title">Income</h3>
        <MoneyField
          fieldKey="employmentIncome"
          label="Employment income"
          value={raw.employmentIncome}
          clamped={isClamped('employmentIncome')}
          onChange={onFieldChange}
        />
        <MoneyField
          fieldKey="employmentExpenses"
          label="Employment expenses"
          value={raw.employmentExpenses}
          clamped={isClamped('employmentExpenses')}
          onChange={onFieldChange}
        />
        <MoneyField
          fieldKey="tradeIncome"
          label="Trade, business, profession or vocation income"
          value={raw.tradeIncome}
          clamped={isClamped('tradeIncome')}
          onChange={onFieldChange}
        />
        <MoneyField
          fieldKey="otherIncome"
          label="Other income"
          helper="dividends, interest, rent, royalties, other gains"
          value={raw.otherIncome}
          clamped={isClamped('otherIncome')}
          onChange={onFieldChange}
        />
      </div>

      <div className="field-group">
        <h3 className="field-group-title">Donations</h3>
        <MoneyField
          fieldKey="donationsGiven"
          label="Donations to approved IPCs"
          helper="amount donated to approved IPCs — we apply the 250% deduction for you"
          value={raw.donationsGiven}
          clamped={isClamped('donationsGiven')}
          onChange={onFieldChange}
        />
      </div>

      {/* Reliefs are 12 of the 18 inputs. On a phone that is most of the page, and
          columns cannot help at 375px, so the group collapses. It starts open on
          anything tablet-width or wider. The tally keeps the claimed total visible
          while collapsed, so nothing is hidden without a summary. */}
      <details className="field-group-collapsible" open={reliefsOpenByDefault}>
        <summary className="field-group-summary">
          <span className="field-group-title">Reliefs</span>
          <span className="field-group-tally">
            {reliefTotal > 0 ? `${formatSGD(reliefTotal)} claimed` : '12 reliefs'}
          </span>
        </summary>
        <div className="field-group">
          {RELIEF_KEYS.map((key) => {
          const flat = FLAT_RELIEFS[key];
          if (flat) {
            return (
              <FlatReliefToggle
                key={key}
                fieldKey={key}
                label={RELIEF_LABELS[key]}
                amount={flat.amount}
                conditions={flat.conditions}
                value={raw[key]}
                onChange={onFieldChange}
              />
            );
          }

          const helper = RELIEF_HELPERS[key];
          return (
            <MoneyField
              key={key}
              fieldKey={key}
              label={RELIEF_LABELS[key]}
              value={raw[key]}
              clamped={isClamped(key)}
              reliefKey={key}
              {...(helper ? { helper } : {})}
              onChange={onFieldChange}
            />
            );
          })}
        </div>
      </details>

      <div className="field-group">
        <h3 className="field-group-title">Parenthood Tax Rebate</h3>
        <MoneyField
          fieldKey="parenthoodTaxRebate"
          label="Parenthood Tax Rebate claimed"
          value={raw.parenthoodTaxRebate}
          clamped={isClamped('parenthoodTaxRebate')}
          onChange={onFieldChange}
        />
      </div>

      <div className="field-group">
        <h3 className="field-group-title">About you</h3>
        <div className="toggle-field">
          <input
            id="isForeigner"
            type="checkbox"
            checked={isForeigner}
            onChange={(e) => onForeignerChange(e.target.checked)}
          />
          <label htmlFor="isForeigner">I am a foreigner (for SRS cap)</label>
        </div>
        <div className="toggle-field">
          <input
            id="reachedFrs"
            type="checkbox"
            checked={reachedFullRetirementSum}
            onChange={(e) => onFrsChange(e.target.checked)}
          />
          <label htmlFor="reachedFrs">
            My CPF savings have reached the Full Retirement Sum
          </label>
        </div>
      </div>
    </section>
  );
}
