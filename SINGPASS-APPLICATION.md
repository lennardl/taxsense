# Myinfo Application Pack — TaxSense

Everything the Singpass developer-portal application form asks for, drafted and
ready to paste. Items marked ⛔ are Lennard's to decide; items marked VERIFY
must be checked against the portal/catalog at submission time, not trusted from
this document. Apply for **sandbox** first — production has an eligibility gate
(see SINGPASS-PLAN.md §0).

---

## 1. App details

| Form field | Value to enter |
|---|---|
| **App name** | `TaxSense` |
| **App purpose** (shown on the Myinfo consent page — citizen-facing, keep short) | `Prefill your income and status details to show how your income tax is worked out and how much relief headroom you have left this year.` |
| **App use case description** (reviewer-facing) | See §1.1 below |
| **App category** | Closest available to **Finance / Personal finance** — the portal offers a fixed dropdown; pick the nearest. ⛔ if two fit equally |
| **Contact email(s)** | ⛔ Lennard. Recommendation: a personal address, not `@open.gov.sg` — this is a personal side project and the application should not imply OGP is the applying entity |
| **Site URL(s)** | Production: `https://<VERCEL-APP>.vercel.app` ⛔ (fill with the real deployment URL; placeholder until first Vercel deploy). Repo: `https://github.com/lennardl/taxsense` |

### 1.1 Use case description (paste)

> TaxSense is a free, education-only web tool that shows a Singapore tax
> resident exactly how their YA2026 income tax is derived from their own
> numbers — line by line, from income through reliefs to the final figure —
> and how much tax-relief headroom (SRS, CPF cash top-up) remains before
> 31 December. All computation runs in the user's browser; nothing is stored.
>
> Myinfo is used solely to prefill the calculator form: date of birth (to
> derive the Earned Income Relief age band), residential status (to apply the
> correct SRS contribution cap), prior-year Notice of Assessment income
> components (as clearly-labelled, editable estimates), CPF contribution
> history and CPF account balances (to prefill CPF-related relief inputs).
> Data is retrieved once per session with the user's consent, passed through a
> stateless serverless function to the browser, never persisted, never logged,
> and discarded when the page closes. Manual entry remains fully available;
> Myinfo prefill is optional and strictly additive. The tool displays a
> prominent disclaimer that it is not tax advice and not an official IRAS
> assessment.

---

## 2. Technical details

| Form field | Value to enter |
|---|---|
| **Profile type** | Sandbox (upgrade to production is a separate later step). VERIFY the exact option names in the form |
| **Redirect URL(s)** | Local: `http://localhost:3000/api/auth/callback` (Vercel dev serves functions on 3000; the Vite app on 4400 is not the redirect target — the broker is). Production: `https://<VERCEL-APP>.vercel.app/api/auth/callback` ⛔ |
| **JWKS endpoint/object** | `https://<VERCEL-APP>.vercel.app/.well-known/jwks.json` — **already generated and committed**, see §2.1. If the form insists on a reachable URL before any deploy exists, paste the JWKS *object* (the full contents of `public/.well-known/jwks.json`) instead — the form accepts either |
| **Mobile app launch URL(s)** | Not applicable — web only |

### 2.1 Keys (done — do not regenerate casually)

Two EC P-256 keypairs were generated locally on 31 Jul 2026:

- **Signature key** (`use: "sig"`, `alg: "ES256"`) — signs the
  `private_key_jwt` client assertion at the token endpoint.
- **Encryption key** (`use: "enc"`) — Myinfo returns person data as an
  encrypted JWE; this is the key it encrypts to. VERIFY the required `alg`
  value for the enc key against the current API spec before first token call —
  the key material (EC P-256) is standard either way; only the advertised
  `alg` label may need adjusting, which is a one-line edit to the JWKS.

Locations:
- Public JWKS (both public keys): `public/.well-known/jwks.json` — committed,
  ships with every deploy automatically.
- Private keys: `secrets/` — **gitignored, never committed.** For deployment,
  their contents go into Vercel env vars (`SINGPASS_SIG_PRIVATE_JWK`,
  `SINGPASS_ENC_PRIVATE_JWK`) per SINGPASS-PLAN.md §1.4.
- Regeneration (invalidates the registered app — only if keys are lost or
  compromised): `node scripts/generate-jwks.mjs`

---

## 3. Supporting document — user journey

The portal wants an uploaded file. `docs/myinfo-user-journey.md` (committed
alongside this pack) is written to be exported to PDF as-is: it walks the six
steps with the exact screen states, which scopes are read at which step, and
what the user sees when data is missing or consent is declined. ⛔ Export to
PDF (or print-to-PDF from the repo view) and attach.

Journey summary:
1. User lands on TaxSense (manual form fully usable, no login wall).
2. User clicks "Prefill with Singpass" in the form toolbar (Singpass-branded
   per the official button guidelines).
3. Singpass login + standard Myinfo consent screen listing the scopes in §4.
4. Redirect to the app's callback; a stateless function exchanges the code,
   fetches person data, hands it to the browser once, stores nothing.
5. Form fields arrive pre-filled, each tagged "From Myinfo" (income figures
   additionally tagged as prior-YA estimates); every field stays editable.
6. Tax derivation and relief headroom update live, computed entirely
   client-side. Decline/failure at any step lands on the manual form with a
   neutral one-line notice.

---

## 4. Data scopes (minimum set — request nothing else)

Scope *names* below are the Myinfo catalog field IDs verified Jul 2026;
VERIFY the exact scope strings against the catalog link in the application
form at submission time (catalog IDs and scope strings usually match, but the
form's catalog is authoritative).

| Scope | Why (stated in application) | Used for |
|---|---|---|
| `dob` | Derive Earned Income Relief age band (below 55 / 55–59 / 60+) | Auto-fills one select |
| `residentialstatus` | Apply the correct SRS annual cap (SC/PR vs foreigner) | Auto-sets one toggle |
| `noa-basic` | Prior-year assessable income as an editable, clearly-labelled estimate | Income prefill |
| `cpfcontributions` | Prefill CPF-related relief input from contribution history | CPF relief |
| `cpfbalances` | Determine whether the Full Retirement Sum is reached (gates the CPF top-up lever) | Auto-sets one toggle |

Deliberately **not** requested (data minimisation — say so in the application,
reviewers reward it): `uinfin`, `name`, `nationality` (redundant with
`residentialstatus`), `marital`, `childrenbirthrecords`, address, contact
fields. If Phase 1 sandbox testing shows the detailed `noa` (four income
components) is available to non-government apps and materially better than
`noa-basic`, amend the scope list then — start minimal.

---

## 5. Open items before pressing "Start"

1. ⛔ Contact email (personal vs work) — blocks submission.
2. ⛔ Production site URL — deploy to Vercel first, or submit with sandbox/
   localhost only and add the production URL later (portal allows editing;
   VERIFY).
3. ⛔ Export `docs/myinfo-user-journey.md` to PDF for the upload slot.
4. VERIFY at the form: exact scope strings, profile-type options, enc-key
   `alg` requirement.
