# DECISIONS

Choices the Execution Plan v1 did not make. One entry per choice, with the reason.

## Repository and tooling

1. **Repo location.** The plan named the root `tax-clarity/`; it lives at
   `/Users/lennardlim/taxsense/tax-clarity`.

2. **Dependency versions.** The plan named the four permitted runtime packages but
   not versions. Pinned: React/ReactDOM `^18.3.1`, `@base-ui-components/react`
   `1.0.0-rc.0`, `@number-flow/react` `^0.6.2`, `clsx` `^2.1.1`. Dev: Vite `^7.3.6`,
   `@vitejs/plugin-react` `^5.2.0`, TypeScript `^5.9.3`, Vitest `^4.1.10`.

3. **`@base-ui-components/react` is only published up to `1.0.0-rc.0` under that
   name**, and npm emits a deprecation notice saying the package was renamed to
   `@base-ui/react`. The plan names `@base-ui-components/react` and forbids
   substituting libraries, so the plan's package was kept. Both permitted libs
   declare React 18 peer support, so React 18 was kept as specified.
   **Flagged for Lennard:** a future YA pass should decide whether to follow the
   rename.

4. **`vite.config.ts` imports `defineConfig` from `vitest/config`,** not `vite`, so
   the `test` block type-checks. The alternative was a separate `vitest.config.ts`,
   which would have added a file to the exact structure in §2.

5. **tsconfig strictness beyond bare `strict`:** `noUnusedLocals`,
   `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
   `noFallthroughCasesInSwitch`. The plan asked for strict mode; these tighten it.

6. **`.claude/launch.json`** added so the built `dist/` can be served and driven in
   a browser for the §7 smoke checks. Not part of the app or its build.

## Keeping the §2 file list exact

7. **`formatSGD` lives in `src/engine/compute.ts`.** A currency formatter was needed
   by three UI files. It is a pure function with no React, DOM, or side effects, so
   it satisfies §3.3, and putting it there avoided adding a helper file to §2.

8. **The `Money` component is exported from `src/ui/DerivationSection.tsx`** and
   reused by the sticky answer bar in `App.tsx`, for the same reason. Import graph
   stays acyclic (`App → DerivationSection`).

## Engine

9. **`taxSavingForAdditionalRelief(inputs, amount, key = 'srs')`** takes an optional
   third argument naming the relief field the amount is added to; each lever passes
   its own field. The result is numerically identical whichever field is used —
   the engine only ever sums the 12 reliefs — but this keeps the re-run honest.
   The two-argument call in the plan's §5 G5 vector works unchanged.

10. **`computeLevers` returns `[srs, cpfTopUp]`** in that order. The plan does not
    specify an order; tests look levers up by `id`.

11. **`Lever.headroom` reports the EFFECTIVE headroom** — after the
    `min(headroom, 80000 - rawReliefSum)` interaction — because vector G9 describes
    2,000 (not 15,300) as "SRS effective headroom".

12. **Derivation line ids, labels, and explanation sentences** were authored here per
    §3.3 step 10. Factual, no advice language. Nine lines, matching steps 1–9.

13. **Negative and unparseable inputs clamp to 0** at both the form boundary and the
    engine boundary, so the engine is safe when called directly.

## UI and design

14. **`.sticky-bar` uses `position: fixed`, not `sticky`.** The bar is mounted only
    once the derivation section scrolls out of view (IntersectionObserver); a sticky
    element would either occupy flow space from page load or jump in mid-document.
    Its content is held to the 45rem column with
    `padding-inline: max(var(--space-4), calc((100vw - 45rem) / 2))` rather than an
    extra wrapper element, since §6.4 fixes the class list.

15. **Accessibility fix, NumberFlow.** NumberFlow renders its digits inside a shadow
    root and exposes no accessible text or `aria-label`, which left every ledger
    figure — Layer 1, the point of the product — silent to screen readers and absent
    from the accessibility tree. `Money` now also emits the formatted value in a
    visually-hidden `.sr-only` span and marks the NumberFlow element `aria-hidden`.
    A `.sr-only` utility class was added to `styles.css`. NumberFlow's own
    reduced-motion behaviour is left untouched, as §6.4 requires.

16. **`Tooltip.Provider delay={200} closeDelay={0} timeout={400}`** — `timeout` is
    base-ui's grouping window, which produces the "once one tooltip is open,
    adjacent tooltips open instantly" behaviour §6.4 asks for.

17. **Rate percentages are rounded through float noise** (`Math.round(rate * 1000) / 10`)
    so 0.07 reads `7%` rather than `7.0%` while 0.035 still reads `3.5%`. Without
    this, IEEE-754 artifacts made sibling rows format inconsistently.

18. **Relief field labels and the 12 IRAS tooltip URLs.** Every URL was verified live
    against iras.gov.sg (Jul 2026) rather than pattern-guessed. Note that SRS relief
    has no page under `/tax-reliefs/`; it is documented at
    `/special-tax-schemes/srs-contributions`, which is what the tooltip links to.
    Re-verify each YA alongside the §10 human-verification list.

19. **Copy authored here** (the plan fixes only the lock-up, MRSS, capped-reliefs and
    disclaimer strings): page title "Your income tax for YA2026, line by line";
    section headings "Your numbers", "How your tax is worked out", "Your moves";
    the negative-input note "Negative amounts are treated as $0.00."; and the
    bracket-table column headers.

## §6.4 compliance pass (second review)

A design review found the first pass had under-delivered §6.2/§6.4 in four ways.
These are corrections to spec compliance, not additions to the spec — no new
animation was introduced, and §6.4's allowed-animation list is still exhaustive.

21. **`--accent` was reachable only through focus outlines** (5 usages, all
    `outline`), so the page rendered monochrome until you tabbed into it. The
    specified accent now also carries the expand chevron, the marginal-rate rule,
    the current bracket row, the lever-card left edge, inline links, and
    `accent-color` on inputs and checkboxes. 18 usages.

22. **Two derived colour tokens added:** `--accent-ink: #256599` and
    `--accent-wash: rgba(45, 123, 185, 0.08)`. `--accent` measures 4.52:1 on white
    — technically AA for body text but with no margin — so text uses the darker
    `--accent-ink` (6.18:1) and `--accent` is reserved for icons, rules, and large
    figures. `--accent-wash` also de-hardcodes a literal that was already in the
    stylesheet.

23. **The net-tax figure now renders at `--text-display`.** §6.4 reserves that token
    for "page title + net-tax figure", but the ledger's total row was only
    bold-weight, so the answer had no visual climax anywhere except the sticky bar.
    Size, leading and tracking move together, per "hierarchy comes from weight +
    size + leading as a set". 38.4px against 15px for the other rows.

24. **`.marginal-rate` was 0.9375rem — smaller than body text**, while §6.2 asks for
    it "prominently". Now 1.125rem/600 with an accent rule and wash.

25. **The derivation rows had no expand affordance.** The default `<details>` marker
    was removed with nothing in its place, leaving nine expandable rows that read as
    static text. Since the PRD's comprehension metric is literally "% of users who
    expand at least one derivation line", this was a product defect, not a cosmetic
    one. Added an accent chevron (`.ledger-label::before`) that flips
    `rotate(-45deg)` → `rotate(45deg)` on `[open]`, plus a gated hover wash and
    `cursor: pointer`. **The chevron flip and the hover wash carry no transition** —
    §6.4's animation list is exhaustive and does not include them, so they change
    state instantly.

26. **`.field-input:focus` takes an accent border,** instantly and with no
    transition, because focus sits on the recompute path that §6.4 bars from
    animating.

## Plan amendments (authorised by Lennard, 30 Jul 2026)

Three features were added that Execution Plan v1 excluded. Lennard chose them
explicitly after a design review; they are amendments to the plan, not silent scope
creep. The plan's §9 ban on "charts", and §6.4's "nothing in this app is
gesture-driven", no longer hold as written, and the DoD line "No feature exists that
this document didn't specify" needs updating to point here.

**A fourth candidate — a first-run state with stepped/collapsed inputs — was offered
and declined.** The 18-field form on arrival is therefore a known, accepted rough
edge, not an oversight.

27. **§6.4's motion discipline was deliberately NOT amended.** All three additions
    sit on the keystroke/drag recompute path, which §6.4's frequency test bars from
    transitioning, so every bar width changes instantly. The only transition added
    anywhere is the slider thumb's `:active` press, matching the existing house rule
    for pressable elements. Verified: the stylesheet's nine transitions are all
    `transform`/`opacity` at token durations, and none touches a width.

28. **`bracketBreakdown(ci)` added to the engine** (pure, no new imports) returning
    per-band `{lowerBound, upperBound, rate, amountInBand, taxFromBand}`. The top
    band carries `upperBound: null`.

    Its tests assert an invariant rather than transcribed constants: for every §5.1
    bracket vector plus 2,500,000, the `taxFromBand` values sum to `grossTax(ci)`
    and the `amountInBand` values sum to `max(ci, 0)`. This is what makes the band
    visual trustworthy — it is the same arithmetic as `grossTax`, not a parallel
    approximation that could drift from it. Suite went 32 → 73 tests.

29. **Proportion bar — "Where your income goes."** Stacked bar above the ledger
    splitting total income into taxed-at-your-rates / removed-by-reliefs /
    removed-by-donations, plus an effective-rate sentence. The three parts are
    derived so they sum to total income *exactly* even when deductions exceed income
    and the chain floors at zero: donations are clamped to total income, then
    reliefs to what remains. Colour is never the only signal — the legend carries
    text labels and amounts, and the bar has an `aria-label` naming every part.

30. **Bracket band column replaces the "Tax at that point" column.** §6.2 required "a
    mini table of the YA2026 brackets with their row highlighted", so the `<table>`
    semantics were kept rather than swapped for divs — screen readers still get a
    table, and the current row still carries `aria-current`. Each row now shows how
    much of that band the user actually filled and the tax arising from it, or "not
    reached". This targets the most common misunderstanding of progressive tax:
    that the top rate applies to all income.

31. **Draggable headroom slider on each lever card.** A native `<input type="range">`
    was used rather than a custom gesture control, so drag, keyboard arrows, and
    assistive tech all work for free and no gesture library is needed (§1's
    dependency list is untouched). Step is $100, or $10 when headroom is under
    $1,000.

32. **The slider recomputes through the engine, never `rate × amount`.** It calls
    `taxSavingForAdditionalRelief`, so it inherits the G5 guarantee. Verified live:
    at CI 82,000 an $8,000 CPF top-up reads **$650.00**, not the $920.00 a
    marginal-rate shortcut would produce.

33. **Slider state is clamped, not trusted.** Headroom moves as income and reliefs
    change, so the stored amount is read as `min(chosen ?? headroom, headroom)`.
    Untouched sliders sit at full headroom so the readout agrees with the card
    headline. Verified live: with a stale $10,000 selection, dropping SRS headroom
    to $2,000 via the $80k cap clamps both the slider max and its value.

34. **The slider readout uses plain text, not NumberFlow.** §6.4 scopes NumberFlow to
    ledger amounts and the net-tax figure; a figure updating continuously under drag
    is also exactly the case where instant is calmer than animated.

## Relief input controls (amendment, authorised 30 Jul 2026)

Lennard's observation: several reliefs are fixed amounts, so asking the user to type
a dollar figure is wrong — it should be a claim you switch on. Correct, and it
amends §1.5 ("every relief is a free-entry dollar field").

The §1.5 rationale was avoiding invented eligibility logic, and PRD §8.2's advice
liability. A toggle does not cross that line: the **user** still self-declares the
claim; the tool only removes an arithmetic lookup. Deciding whether someone
*qualifies* remains out of scope.

Authorised scope was "toggles for flat reliefs only" — Spouse, Grandparent Caregiver,
Sibling (Disability). **Verification cut that from three to one.**

35. **Grandparent Caregiver Relief is now a toggle at $3,000.** Verified against IRAS
    (Jul 2026), including the decisive property: it **cannot be shared or
    apportioned** — one claimant per caregiver. That is what makes a fixed on/off
    claim safe. Conditions (working mothers only; caregiver resident in Singapore
    with income ≤ $8,000 in 2025) render as helper text so the user can self-assess.

36. **Sibling Relief (Disability) stays a dollar field.** The $5,500 figure is
    verified, but IRAS allows the relief to be **shared between several people
    supporting the same dependant on an agreed apportionment**. A toggle cannot
    express a share, and would overstate the claim for anyone splitting it with
    siblings. The verified figure is surfaced as helper text instead — the user no
    longer has to look it up, but can still enter their actual share.

37. **Spouse Relief stays a dollar field: its amounts could NOT be verified.** IRAS
    pages are JS-rendered, so WebFetch returns only navigation chrome, and
    `iras.gov.sg` is blocked in the browser pane. Search results surfaced the YA2026
    *rule changes* and the $8,000 spouse income threshold but not the relief amounts
    themselves. Encoding figures from model memory into a government tax tool is not
    acceptable, so nothing was encoded. **Added to the §10 human-verification list.**

38. **The toggle writes into the existing string field state.** Switching it on sets
    the field to `String(amount)`; off sets `''`. So `TaxInputs`, the engine, the
    $80,000 cap, the derivation chain and all 73 tests are untouched — this is
    purely an input-control change. Verified live: toggling moves the "Less: personal
    reliefs" line between $0.00 and $3,000.00.

39. **A general rule for future flat-relief toggles:** a relief may become a toggle
    only if it is a single fixed amount AND cannot be apportioned between claimants.
    Fixed-but-shareable reliefs get the figure as helper text on a free-entry field.
    Most remaining reliefs (Qualifying Child, Parent, NSman, Earned Income) are fixed
    but vary by count, age band, or category, and were deliberately left alone —
    Lennard declined the fuller structured-input option.

## Input formatting and "apply a move" (amendment, authorised 30 Jul 2026)

40. **Money fields show live thousands separators.** `type="number"` cannot hold a
    comma — the browser discards the entire value — so money inputs are now
    `type="text"` with `inputMode="decimal"` (mobile keypad preserved) and
    `autoComplete="off"`. Grouping is done with a regex, not `toLocaleString`, so a
    long entry cannot lose precision. Decimals are capped at 2 and leading zeros
    stripped. A leading minus survives formatting so the existing negative-clamp
    note still fires.

41. **Caret position is preserved across reformatting.** The anchor is the number of
    digits left of the caret, which is stable when commas are inserted or removed.
    Verified: editing "1,234" into "19,234" mid-string leaves the caret after the
    inserted 9 rather than jumping to the end.

    The handler also writes the formatted value straight to the DOM node before
    calling `onChange`. Without that, typing a character that formats to the same
    state (e.g. a manual comma) produces no React re-render, so the raw keystroke
    would stay visible on screen.

42. **`toNumber` strips separators at the state boundary.** This is the load-bearing
    companion to the change above — `Number("100,000")` is `NaN`, so without it every
    grouped figure would silently read as $0. Verified: G1 typed with separators
    still yields chargeable income $76,500.00 and net tax $3,105.00.

43. **Lever cards can be applied to the derivation.** Each card gains "Apply this to
    the breakdown above", which folds the slider amount into the reliefs so the whole
    ledger, bracket bands and proportion bar recompute.

    **Planned contributions are held in separate state, not written into the relief
    field.** Writing into the field would feed back into `computeLevers`, driving
    headroom to zero and making the card vanish at the moment the user engaged with
    it. So: levers are always computed from the form alone, while the ledger is
    computed from form + applied. Applied amounts are clamped to current headroom, so
    editing income cannot leave a stale over-claim.

44. **"Your moves" branches on the user's ACTUAL position, not the what-if.** It
    receives a separately computed `baseResult`. Without this, an applied lever that
    drove net tax to zero would swap the cards for the MRSS message and remove the
    toggle needed to switch it back off — a dead end. Verified: at $35,000 income an
    applied SRS lever shows net tax $0.00 while the cards and the undo toggle remain,
    and the MRSS message stays hidden.

45. **The derivation carries an honesty notice whenever anything is applied:** "These
    figures include $X you switched on in Your moves. This is not your current
    position." A tax tool must not let a hypothetical be mistaken for an assessment.
    Accent-led rather than warning-red, since it is a state the user chose.

## Responsive layout (amendment, authorised 30 Jul 2026)

Measured first: the page was **4,500px / 6.3 screens** on a 1280 viewport, and the
inputs section alone was **2,145px — 48% of it** — because 18 short money fields
stacked one per row while ~560px of viewport width sat empty.

46. **Field groups are an auto-fit grid**, `repeat(auto-fit, minmax(15rem, 1fr))`.
    No breakpoints: 1 column on a phone, 2 around 720px, 4 on a wide desktop. Chosen
    over media queries so the layout responds to the actual space available.

47. **§6.4's fixed 720px column is amended for the input grid only.** `.app` widens
    to 68rem above 1100px, but everything that is *read* rather than scanned —
    banner, titles, ledger, proportion bar, lever cards, prose, disclaimers — is
    held to a 45rem measure. Line length is therefore unchanged; only the fields
    gain columns. Verified: app 1088px wide, ledger still 720px.

48. **Fields use CSS subgrid so inputs align across a row.** Without it a label that
    wrapped to two lines ("Trade, business, profession or vocation income") pushed
    its own input below its neighbours', which looked broken. `grid-row: span 2`
    was chosen over `span 3`: spanning three rows also aligned helper text but
    reserved a third row in every column, costing ~260px of height for no real
    gain. Verified: all four income inputs and all four first-row relief inputs
    share a top edge. Degrades to normal flow where subgrid is unsupported.

49. **Section spacing scales:** `clamp(2.25rem, 6vw, 4rem)`. A flat 4rem gap is a
    large share of a phone viewport and a reasonable one on a desktop.

50. **The Reliefs group collapses, because layout alone cannot fix mobile.** At 375px
    a single column is forced, so the 12 relief fields stay ~1,100px however they
    are styled. The group is now a `<details>` that starts closed below 48rem and
    open at tablet width and up, read once on mount via `matchMedia` — deliberately
    not a live binding, since re-opening it on every resize would fight the user.

    **Its summary carries a running tally** ("$20,000.00 claimed") so a collapsed
    group never hides a figure that affects the result. This is a narrower version
    of the stepped-inputs option Lennard declined earlier: it shortens the page
    without adding onboarding or changing the first-run experience.

51. **Bug fixed in the subgrid work above: hint text painted on top of the inputs.**
    `.field` spanned 2 subgrid rows but could hold 4 children (label, input, helper,
    negative-clamp note), so the extras were placed into the input's row track and
    overlapped it — visible as "amount donated to approved IPCs…" sitting across the
    donations input.

    Fix: helper and note are wrapped in a single always-rendered `.field-hints`
    element pinned to `grid-row: 3`, and the span is 3. Pinning explicitly rather
    than relying on auto-placement matters because a flat-relief toggle has no input
    row — its conditions text would otherwise land in the input row and inflate that
    row for every column on the line.

    Verified by geometry, not by eye: every `.field` on the page is checked for
    vertical intersection between its input and its hints, collapsed and expanded, at
    both viewports — 0 overlaps.

Result — desktop **4,500 → 2,778px** (6.3 → **3.5** screens), inputs −49%; mobile
**4,965 → 2,833px** (6.1 → **3.5** screens). Both ended up better than the
first attempt, because the overlapping hints had been inflating every row track. No
horizontal overflow at 375px. CSS hygiene re-checked: transitions are all
`transform`/`opacity`, none on a width; no ungated `:hover`; no duplicate selectors;
three accessibility blocks intact.

## 11-star review pass (amendment, authorised 31 Jul 2026)

Lennard asked for a review from three lenses — citizen, UX writer, UX designer —
then said "fix them one by one" against the resulting prioritised list. Every item
below traces to a specific finding from that review. This is the largest single
amendment to the plan; §1.5, §1.7, and §9 are all touched.

### P0 — the default answer was wrong for the median employee

52. **Earned Income Relief is now derived, not typed.** Verified against IRAS
    (Jul 2026): a flat amount by age band as at 31 Dec 2025 — below 55 → $1,000;
    55–59 → $6,000; 60 and above → $8,000 — capped at the person's earned income
    for the year (employment + trade/business income; not dividends, interest,
    rent, or other passive income). `earnedIncomeRelief(ageBand, earnedIncome)`
    in `src/engine/earnedIncomeRelief.ts` implements exactly this, is pure, has
    no new imports beyond `externalConstants`, and is tested for: no band
    selected → 0; income exceeding the band → full band amount; income below the
    band → capped at income; negative/zero income → 0. The free-entry field for
    this relief is removed — a person cannot both select an age band and
    override the number, since that would create two sources of truth.

    This is narrower than the "full structured inputs" option Lennard declined
    earlier in the project: it needed exactly one new input (age band), not a
    stepper or count, because the relief has no per-dependant variation.

53. **CPF / provident fund relief was deliberately NOT auto-calculated.** Unlike
    Earned Income Relief, CPF relief depends on contribution-rate tables that
    vary by age band and two separate wage ceilings (Ordinary Wage and Additional
    Wage), values that are re-set periodically and were not verified in this
    pass. Estimating it risks the exact failure PRD §8.4 warns about — a
    computed number quietly wrong. The field stays free-entry; its helper text
    now reads "Most employees have this automatically — check your CPF
    contribution history or Notice of Assessment for the exact figure. It is
    rarely $0," which fixes the *visibility* half of the problem (nothing
    signalled this shouldn't be left blank) without inventing a calculation.

### Content and trust

54. **Draft banner compressed to one bold line + an expandable detail,** using
    the same `<details>` chevron language as the ledger and field groups (in
    surface colour, since this sits on `--ink`). It was previously ~90 words —
    the first thing on the page, before any value — and is now a single sentence
    with the full list a tap away. The second `disclaimer` paragraph in
    `MovesSection` (relief eligibility, hypothetical amounts, data handling) is
    folded into this same expandable list rather than duplicated as a second
    block; **the mandatory §6.3 wording is untouched** and still verified
    byte-identical.

55. **A standalone privacy line** ("Nothing you type is stored, sent anywhere, or
    saved after you close this page") now sits near the top of the page,
    ahead of the first input. The same fact previously existed only in the
    disclaimer at the very bottom — reassurance that matters before typing
    shouldn't arrive after.

56. **Product name added.** The page previously named itself nowhere ("we apply
    the 250% deduction for you" — who is "we"?), and the tab title
    ("Tax Clarity") didn't match the PRD's product name ("TaxSense"). Both are
    now "TaxSense" — a small eyebrow above the page title, and the `<title>` /
    `og:title` / `og:description` meta tags in `index.html`. A data-URI-free
    `public/favicon.svg` (a plain accent-coloured "$" mark) was added so a
    shared link isn't bare.

57. **Plain-language pass, scoped to genuine jargon, not a rewrite:**
    - A one-line subtitle translates "YA2026" to "for income earned in 2025"
      (uncontroversial public fact, not a computed figure).
    - "IPC" is expanded on first use ("Institution of a Public Character") in the
      donations helper text, rather than left as a bare acronym.
    - Employment income gained a source hint: "from your IR8A or final payslip,
      before CPF is deducted."
    - The Full Retirement Sum toggle gained a hint pointing to "my CPF
      Retirement" in the CPF app — the question a citizen has no way to answer
      otherwise.

58. **Whole-dollar labels for fixed amounts.** `formatSGDWhole` (engine,
    `minimumFractionDigits: 0`) is used only for label-level fixed amounts — the
    Grandparent Caregiver Relief toggle ("$3,000" not "$3,000.00") and the lever
    slider's min/max scale labels. Every *computed* result — the ledger, the
    lever headline, the slider readout — is untouched and still shown to 2 d.p.
    per §1.6; this does not relax that rule, it only recognises that a fixed
    label isn't a computed result.

### Getting to a first answer faster

59. **"Try an example" / "Clear all"** fill or reset the form in one action. The
    example (`$60,000` employment, `$200` donations, `$7,200` CPF relief, age
    band "below 55") is clearly a representative figure, not tied to any golden
    vector, and is never silently left in place — "Clear all" also resets the age
    band, both toggles, and any applied lever.

60. **Employment expenses, trade income, and the Parenthood Tax Rebate fold into
    a "Less common" collapsible,** closed on every viewport (unlike the Reliefs
    group, which is viewport-driven — this one is relevance-driven: most
    employees have none of these three). Employment income and Other income stay
    visible, since passive income like bank interest is common enough in
    Singapore to keep in view. The median first-time user now sees roughly 3
    money fields plus two toggles before anything is folded, down from 18 equal
    fields.

61. **The Reliefs group's collapsed-state tally does more than count.** If
    nothing is claimed yet AND income has been entered, it reads "Add Earned
    Income & CPF relief →" instead of a flat "12 reliefs" — a nudge toward the
    two reliefs nearly every employee actually has, visible without opening the
    group. Once anything is claimed, it reverts to showing the dollar total, as
    before. (The derived Earned Income Relief amount is now included in this
    total via the `earnedIncomeReliefAmount` prop, since the underlying field is
    no longer part of the raw form state to sum from directly.)

### Answer-first and comprehension

62. **A hero block above the form** shows the net tax figure and effective rate
    once income is entered, or a calm placeholder before that. This is the
    single biggest structural response to "the answer is at the bottom of a
    ledger": the number a citizen actually wants is now visible before they
    finish filling in the form, not only after scrolling past the derivation (or
    further, past it, via the existing sticky bar). It shares the exact
    `Money` component and `ratePercent` formatting with the derivation section,
    so the two figures can never read as disagreeing with each other. When a
    lever is previewed, it carries the same "this is hypothetical" note as the
    derivation section, rather than silently showing a what-if as if it were the
    real answer.

63. **A compact bracket strip** sits beside the marginal-rate line: 13 equal-width
    segments (not dollar-proportional — the top band is open-ended, so a
    dollar scale would squash every band a typical citizen actually occupies
    into a sliver), filled up to the current band, current band outlined. This
    surfaces the shape of the bracket system without requiring the ledger row to
    be opened first; the full detailed table with per-band dollar amounts still
    lives inside the existing expandable row, unchanged.

64. **The SRS lever card explains what SRS is** and links to all three account
    providers, unranked (alphabetical: DBS/POSB, OCBC, UOB) — verified live
    against each bank's own domain in this pass, not IRAS's. A note states only
    one SRS account may be held across all three banks, since the review
    surfaced that this is the kind of thing a first-time SRS opener would not
    know and could get wrong. The CPF top-up lever gained no equivalent link:
    its process (CPF's own e-Cashier) was not verified in this pass, and adding
    an unverified URL was judged worse than adding none.

65. **The Apply toggle became a real button.** A checkbox that changes page
    content elsewhere is a mismatched control — checkboxes read as "this is a
    fact about this form," not "click to change what's shown above." It is now
    `<button aria-pressed>`, labelled "Preview in breakdown above ↑" /
    "Remove from breakdown ↑", so the state and the action are both explicit.

### Touch and layout

66. **Touch targets widened toward the ~44px guideline** without inflating what's
    drawn. The relief tooltip `?` stays a 20px dot but gains an invisible
    `::after` hitbox (`inset: -12px`, → 44px) — pseudo-elements aren't separate
    click targets, so a tap anywhere in the padding still lands on the trigger.
    The lever slider's input box grows to `2.75rem` tall while the visible track
    stays a thin `0.375rem`, and the thumb grows modestly (1.125rem → 1.375rem) —
    a slider thumb drawn at full 44px would dominate the card. New toolbar and
    preview buttons are `min-height: 2.75rem` outright.

67. **Two-column desktop workspace above 1100px:** Inputs and the derivation sit
    side by side (`.workspace` becomes a 2-column grid) instead of two full
    screens apart, so cause (what you type) and effect (the derivation) are both
    visible while filling the form. This is the amendment to §1.7's "three
    vertical sections" description. Deliberately simple: the derivation column
    is not `position: sticky` — that would duplicate and complicate the existing
    scroll-triggered sticky answer bar, for a benefit judged not worth the added
    interaction risk. Below 1100px, nothing changes; Moves stays full-width at
    every size, since it was never part of the "cause and effect" pairing.

### Declined this pass

68. **A "copy summary" button and an `.ics` October reminder file** were on the
    prioritised list but not built in this pass — both are storage-free and fit
    §9, but neither was load-bearing for the P0/P1 findings this pass focused
    on. Left for a follow-up pass.

69. **Full structured inputs for Qualifying Child Relief, Parent Relief, and
    NSman Relief** (counts, living-arrangement variants, category selects)
    remain out of scope, consistent with Lennard's earlier decision. Earned
    Income Relief was the one exception in this pass because it required only
    one new input (age band) and has no per-dependant variation to model.

Verified: `tsc --noEmit` clean; 78/78 tests (73 → 78, the 5 new
`earnedIncomeRelief` cases); `engine/` still imports only itself; runtime
dependencies still exactly the five named in §1; example-fill reproduces the
derived-relief chain exactly (`$60,000` income, age band "below 55" → Earned
Income Relief `$1,000`, capped correctly at income when tested below the band);
CSS hygiene re-swept (no `transition: all`, no `scale(0)`, no `ease-in`, no
`@keyframes`, no ungated `:hover`, no duplicate selectors, three accessibility
blocks intact); no horizontal overflow at 375px; zero console errors at either
viewport.

## Not built

20. No feature outside the plan was added, **other than the three amendments in the
    section above, which Lennard authorised explicitly.** Still absent, per §9:
    Myinfo code, persistence of any kind, analytics, PDF export, dark mode,
    per-relief caps, non-resident computation, PTR eligibility logic, and any fifth
    runtime dependency.
