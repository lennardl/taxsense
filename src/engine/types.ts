export interface TaxInputs {
  employmentIncome: number;
  employmentExpenses: number;
  tradeIncome: number; // trade/business/profession/vocation
  otherIncome: number; // sum: dividends, interest, rent, royalty/estate, other gains
  donationsGiven: number; // actual amount donated to approved IPCs (engine applies 250%)
  reliefs: ReliefInputs;
  parenthoodTaxRebate: number; // free entry
}

export interface ReliefInputs {
  earnedIncome: number;
  spouse: number;
  qualifyingChild: number;
  workingMotherChild: number;
  parent: number;
  grandparentCaregiver: number;
  siblingDisability: number;
  cpfProvident: number;
  lifeInsurance: number;
  cpfCashTopUp: number;
  srs: number;
  nsman: number;
}

export interface DerivationLine {
  id: string;
  label: string;
  amount: number;
  explanation: string;
}

export interface TaxResult {
  netEmploymentIncome: number;
  totalIncome: number;
  donationsDeduction: number;
  assessableIncome: number;
  totalReliefs: number;
  reliefsCapped: boolean;
  chargeableIncome: number;
  grossTax: number;
  ptrApplied: number;
  netTaxPayable: number;
  marginalRate: number; // rate applying to the last dollar of CI
  lines: DerivationLine[]; // ordered, for UI rendering
}

export interface LeverInputs {
  isForeigner: boolean; // affects SRS cap only
  reachedFullRetirementSum: boolean; // user self-declares; gates CPF top-up lever
}

export interface Lever {
  id: 'srs' | 'cpfTopUp';
  headroom: number; // additional relief-eligible dollars this YA
  taxSaving: number; // computed by RE-RUNNING computeTax, never rate*amount
  lockUpNote: string;
}

/** Keys of ReliefInputs, in the order the UI renders them. */
export const RELIEF_KEYS = [
  'earnedIncome',
  'spouse',
  'qualifyingChild',
  'workingMotherChild',
  'parent',
  'grandparentCaregiver',
  'siblingDisability',
  'cpfProvident',
  'lifeInsurance',
  'cpfCashTopUp',
  'srs',
  'nsman',
] as const satisfies ReadonlyArray<keyof ReliefInputs>;

export type ReliefKey = (typeof RELIEF_KEYS)[number];
