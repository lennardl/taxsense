# Execution Plan — Singpass/Myinfo Prefill (Option B) for TaxSense

**Audience:** an AI coding agent executing autonomously, with Lennard as the human
gate at the checkpoints marked ⛔. Read this whole document before writing any
code. Where this document is silent, choose the simplest option and record it in
`DECISIONS.md`. Where this document says **VERIFY**, you must confirm the fact
against live official documentation before encoding it — do not proceed on the
model's memory of how Singpass works. This codebase has a proven failure mode and
a proven fix: every constant that was guessed had to be corrected; every constant
that was verified first survived. Verification agents beat recall. Always.

**Goal:** a signed-in citizen taps "Prefill with Singpass", consents on the
Singpass screen, and returns to TaxSense with income figures, age band,
residency status and CPF data pre-filled — every value editable, every value
labelled with where it came from. Manual entry remains a first-class path
forever; Myinfo is strictly additive.

**Why the codebase is ready for this:** `src/profile/source.ts` defines
`ProfileSource` — the seam built on day one for exactly this. A `MyinfoSource`
implements `getProfile(): Promise<Partial<TaxInputs>>` and the UI needs no
structural change. The engine (`src/engine/`) is pure and must stay pure: it
imports nothing outside itself and runs identically in browser or serverless.
`grep` this before and after your work; if the engine gained an import, revert.

---

## 0. The honest pros and cons (read before starting)

**Pros**
- Kills the biggest UX problem measured in testing: the median employee's answer
  is wrong-by-default unless they know their CPF relief and income figures.
  Myinfo turns ~6 typed decisions into ~1 consent tap.
- Income-side fields collapse hard: `dob` → Earned Income Relief age band,
  `residentialstatus`/`nationality` → foreigner toggle (SRS cap),
  `cpfbalances.ra` → FRS toggle (with one new verified constant), NOA →
  income estimates, `cpfcontributions` → possibly CPF relief outright.
- The consent model is Singpass's own screen — the user sees exactly what is
  shared, which is a *stronger* trust posture than a form, not a weaker one.

**Cons — none of these are reasons not to do it, all are reasons to do it carefully**
- **Breaks "no backend."** Token exchange and client authentication cannot
  happen in a browser. A thin, stateless serverless broker is required. The
  static architecture survives; the "fully static" claim does not.
- **Breaks the current privacy promise verbatim.** The page says "Nothing you
  type is stored, sent anywhere." With Myinfo, government-held data transits
  our backend. The promise must be rewritten honestly (see §6), not quietly.
- **Production onboarding is a real-world gate, not a coding task.** Sandbox is
  open to anyone; production requires an approved entity, an approved use case,
  and possibly fees. TaxSense is a personal side project today. ⛔ Lennard must
  resolve what entity applies (or accept sandbox-only) before Phase 3.
- **The prefilled data is last year's.** NOA income is the finalised prior
  assessment. Useful as an editable estimate; dangerous as a silent truth.
  Provenance labels are mandatory, not polish.
- **Coverage gap on the core segment.** No-Filing Service / auto-assessed
  citizens may return no NOA income at all. The flow must degrade to manual
  without shame or dead ends.
- Relief-side fields barely move: SRS, life insurance, cash top-ups, PTR,
  donations are not in Myinfo. Do not oversell the prefill in UI copy.

---

## 1. Hard constraints (violating any of these is a failed execution)

1. **No Myinfo data ever appears in a URL** — not in query params, not in
   fragments, not in redirect state. Server-to-browser transfer is a same-origin
   `POST` response body or an httpOnly session, never a query string.
2. **No persistence of person data anywhere.** No database, no KV store, no
   logs containing payloads, no analytics events carrying values. The broker is
   a stateless pass-through; person data exists in memory for the life of one
   request. Log outcomes ("prefill succeeded, 6 fields") never contents.
3. **Access/refresh tokens never reach the browser.** The broker exchanges the
   code, calls the person API, returns only the mapped `Partial<TaxInputs>` +
   provenance metadata, and discards everything.
4. **Secrets live in environment variables** (Vercel project settings), never in
   the repo, never in `NEXT_PUBLIC_`/`VITE_`-prefixed vars. The signing keypair
   for client assertions is generated once per environment and stored only there.
5. **Manual mode must work with the broker completely down.** Myinfo failure of
   any kind — network, consent declined, empty data — lands the user on the
   normal manual form with a one-line non-blaming notice. Test this by killing
   the broker and walking the flow.
6. **The engine stays pure.** `MyinfoSource` maps API responses → `TaxInputs`
   *outside* `src/engine/`. The DoD grep from the original plan still applies.
7. **Verify-before-encode.** Every protocol detail, scope name, cap, and
   constant marked VERIFY below gets confirmed against
   `docs.developer.singpass.gov.sg` (or the OpenAPI spec downloadable there) at
   execution time. Record each verification (URL + date) in `DECISIONS.md`.
8. **The §6.3 disclaimer stays verbatim.** New copy is added alongside, never
   edited into it.

---

## 2. Architecture (decided — do not redesign)

```
Browser (static Vite app, unchanged hosting)
   │  GET /api/auth/login          → 302 to Singpass authorize (PKCE, state, nonce)
   │  ← Singpass consent screen (user approves scopes)
   │  GET /api/auth/callback?code…&state…
   │       broker: validate state → token exchange (private_key_jwt) →
   │       person API call → map to Partial<TaxInputs> + provenance →
   │       one-time same-origin handoff (see below) → discard everything
   │  Browser: MyinfoSource.getProfile() resolves → seeds form state
   ▼
Thin broker: 2–3 Vercel serverless functions in /api. Stateless. No storage.
```

- **Handoff pattern:** callback responds with a minimal HTML page that posts the
  mapped payload to the opener/same-origin app via `postMessage` or renders it
  into the page for immediate pickup and instructs `no-store`. **VERIFY** current
  Singpass sample apps' recommended pattern and copy it rather than inventing
  one; the constraint that survives whatever pattern is chosen: no data in URLs,
  no tokens in browser, nothing cached.
- **`MyinfoSource implements ProfileSource`** with `kind: 'myinfo'`. `App.tsx`
  already seeds from `getProfile()`; extend the seeding path to carry
  provenance per field (see §5). Manual source stays the default; Myinfo is
  invoked only by explicit user action.
- **Key management:** ES256/RS-style keypair per environment for
  `private_key_jwt` client assertion; public key exposed on our JWKS URL.
  **VERIFY** exact algorithm, JWKS hosting requirements, and whether DPoP is
  now mandatory in the current API version — do not assume v3 semantics; the
  current product is "Singpass Myinfo v5 / Login+Myinfo". Build against the
  current version only.

---

## 3. Phases

### Phase 0 — Verification gate (no code)
Confirm and record in `DECISIONS.md`, each with source URL + date:
- [ ] Current API version, OAuth flow (authorization code + PKCE assumed —
      **VERIFY**), client auth method, DPoP requirement, token endpoint,
      person endpoint, JWKS requirements.
- [ ] Exact scope names for: `dob`, `residentialstatus`, `nationality`,
      `noa-basic` (and whether detailed NOA with the four income components is
      available to non-government relying parties), `cpfcontributions`,
      `cpfbalances`, `marital`. (Field availability was verified against the
      data catalog Jul 2026; scope *names* were not.)
- [ ] Sandbox onboarding steps and whether it is truly self-serve.
- [ ] Production eligibility for a non-entity side project — get the actual
      policy in writing. ⛔ Decision point for Lennard: proceed sandbox-only,
      onboard an entity, or park production.
- [ ] FRS values by cohort year (needed to derive the FRS toggle from
      `cpfbalances.ra`) — CPF page, not memory.

**Acceptance:** every box above has a URL + date in `DECISIONS.md`. Anything
unresolvable is listed as an open blocker, not silently skipped.

### Phase 1 — Sandbox spike (throwaway code allowed, only phase where that's true)
Answer the two questions documentation could not, using Singpass's published
test personas:
- [ ] **CPF contribution semantics:** does `cpfcontributions` "amount" represent
      the employee share only, or employer+employee combined? Decides whether
      CPF relief can be auto-derived (relief = employee's compulsory share) or
      must stay manual. This single answer changes the product more than any
      other line in this plan.
- [ ] **NOA coverage:** what exactly comes back for an auto-assessed / NFS
      persona? Empty object, error, or populated? Decides the empty-state copy
      and how hard we lean on income prefill.
- [ ] Capture a real person-API response shape and check it into the repo as an
      **anonymised fixture** (test-persona data only — sandbox personas are
      fictional; confirm that before committing).

**Acceptance:** both questions answered with captured evidence; fixture committed;
findings recorded. ⛔ Lennard reviews before Phase 2 — the CPF answer may change
scope.

### Phase 2 — Broker (production-quality from here on)
- [ ] `/api/auth/login`: generates PKCE verifier/challenge, `state`, `nonce`;
      stores verifier server-side keyed by `state` **in an encrypted, short-TTL,
      httpOnly cookie** (stateless broker — no server session store), redirects.
- [ ] `/api/auth/callback`: validates `state` against cookie, exchanges code
      (client assertion), validates `nonce` in the returned token, calls person
      API, maps → payload, hands off, discards. 10s total budget; any failure →
      redirect to app with `?prefill=failed` (a status flag is fine in a URL;
      data is not).
- [ ] Mapping module `src/profile/myinfoMapping.ts` (browser-safe, shared types
      with broker): person response → `{ inputs: Partial<TaxInputs>, ageBand,
      isForeigner, reachedFullRetirementSum, provenance: Record<field, 'myinfo'>,
      noaYear?: string }`. Unit-test it against the Phase 1 fixture — this is
      the piece most likely to be silently wrong.
      - `dob` → age as at **31 Dec 2025** → age band (boundary test: born
        1 Jan 1971 vs 31 Dec 1970).
      - `residentialstatus`/`nationality` → `isForeigner` (define the exact
        rule from catalog code tables, record it).
      - NOA components → employment/trade/other income **as estimates**.
      - Missing/partial fields → simply absent from the payload, never zeroed
        explicitly (absent ≠ "$0, confirmed").
- [ ] Security pass: CSP headers on the callback page, `Cache-Control:
      no-store` everywhere person data moves, basic rate limit on both
      endpoints, error responses carry no upstream details.

**Acceptance:** flow works end-to-end against sandbox with a test persona;
mapping unit tests green (add to the existing 78, don't touch them); constraint
checklist in §1 re-audited line by line and initialled in `DECISIONS.md`.

### Phase 3 — Front end
- [ ] "Prefill with Singpass" button in the inputs toolbar (sandbox-labelled
      until production exists). Singpass has **mandatory brand/UX guidelines**
      for the button — **VERIFY** and follow them exactly; this is audited at
      onboarding.
- [ ] `MyinfoSource` implements `ProfileSource`; App seeds from it exactly the
      way `ManualEntrySource` seeds today.
- [ ] **Provenance UI:** every prefilled field gets a visible "From Myinfo —
      YA2025 assessment" (income fields) or "From Myinfo" (status fields) tag
      and remains fully editable; editing a field flips its tag to "edited by
      you". The hero and derivation change nothing — they already recompute
      from state.
- [ ] **The stale-year notice is not optional:** if NOA data seeded income, a
      persistent note reads "Income figures are estimates from your YA2025
      assessment — update them to this year's numbers." Same visual class as
      the existing planned-note.
- [ ] Consent-declined / failure / empty-NOA paths land on manual entry with
      one calm line, no error styling, no retry nagging. Verify by test, not
      by reading the code.
- [ ] "Clear all" also clears provenance and any Myinfo-seeded state.

**Acceptance:** a full walkthrough on sandbox personas including: happy path,
decline at consent, NFS/empty persona, broker killed mid-flow. Existing test
suite untouched and green; new mapping/provenance tests added.

### Phase 4 — Privacy, copy, and the human gate (⛔ all of it)
- [ ] Rewrite the privacy line honestly. Sketch (Lennard to approve, not the
      agent): "If you use Singpass prefill, your data passes through our server
      once to reach your browser and is never stored. Nothing is saved after
      you close this page." The old sentence must not survive anywhere it is
      no longer true.
- [ ] PDPA review, Singpass terms-of-use compliance review, and the §10
      verification list — human tasks, listed here so the agent surfaces them
      as blockers rather than "done".
- [ ] Draft banner stays until Lennard removes it.

---

## 4. Edge cases the executor must handle (test each one)

| # | Case | Required behaviour |
|---|---|---|
| 1 | Consent declined at Singpass | Return to manual form, one-line neutral notice, nothing pre-filled |
| 2 | NFS / auto-assessed: NOA absent or default assessment | Status fields still prefill; income fields untouched; copy says income wasn't available, not "error" |
| 3 | FIN holder | `isForeigner` true → SRS cap 35,700 path; confirm `noa` scopes apply to FIN holders at all (**VERIFY**) |
| 4 | Age-band boundary (55/60 exactly, as at 31 Dec 2025) | Unit tests on the mapping, both sides of each boundary |
| 5 | `cpfbalances.ra` ≥ cohort FRS | FRS toggle pre-checked, still manually uncheckable |
| 6 | Partial payload (any field absent) | Absent fields stay empty-manual; no zeros written |
| 7 | Children all ≥ 21 (records not returned) | No inference — child reliefs stay manual, no "you have no children" claims |
| 8 | Token/callback timeout, Myinfo 5xx | Fail to manual within 10s; no infinite spinner |
| 9 | Replayed/forged `state` | Reject, generic failure, no detail leak |
| 10 | User runs prefill twice / after typing | Explicit confirm before overwriting user-typed values; typed-by-user always wins silently otherwise |
| 11 | Browser back into the callback URL | `no-store` + one-time handoff means it renders nothing sensitive |
| 12 | Broker deployed but env keys missing | Login endpoint 503s with clean message; app hides the button on failed health check |

---

## 5. What prefill actually covers (set expectations in code and copy)

| App input | Source | Mode |
|---|---|---|
| Age band (EIR) | `dob` | auto |
| Foreigner toggle | `residentialstatus`/`nationality` | auto |
| FRS toggle | `cpfbalances.ra` + verified cohort table | auto |
| Employment / trade / other income | NOA (prior YA) | editable estimate, labelled stale |
| CPF relief | `cpfcontributions` | pending Phase 1 answer |
| Spouse/child relief *hints* | `marital`, `childrenbirthrecords` | hint only ("you may qualify — check IRAS"), never an amount |
| SRS, life insurance, cash top-up, PTR, donations, GCR, sibling, NSman | — | manual forever (not in Myinfo) |

---

## 6. Definition of done
- [ ] All §1 constraints re-audited and recorded.
- [ ] All VERIFY items resolved with URL + date in `DECISIONS.md`.
- [ ] Engine purity grep unchanged; all pre-existing tests untouched and green.
- [ ] Manual path byte-identical in behaviour with the broker absent.
- [ ] Provenance + stale-year labelling on every prefilled value.
- [ ] Edge cases 1–12 each demonstrated, not asserted.
- [ ] ⛔ gates: entity/production decision, privacy copy, PDPA review — signed
      off by Lennard, listed as open blockers otherwise.

## 7. Out of scope (do not build)
Account linkage, saving profiles, refresh tokens / long-lived sessions, Myinfo
Business, retrieving more scopes than the table in §5 uses, analytics of any
kind, any change to the tax engine's arithmetic.
