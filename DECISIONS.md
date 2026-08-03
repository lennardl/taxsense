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
    vertical sections" description. Below 1100px, nothing changes; Moves stays
    full-width at every size, since it was never part of the "cause and effect"
    pairing.

    **Superseded below (entry 70):** this entry originally kept the derivation
    column in normal flow, not `position: sticky`, to avoid complicating the
    scroll-triggered sticky answer bar. Lennard asked directly for the panel to
    stay on screen, which is a stronger requirement than that concern
    justified skipping — reversed.

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

## Sticky derivation panel (amendment, authorised 31 Jul 2026)

Lennard asked for the right panel to "stay on screen" so the top-line figures
stay readable while filling in the form — a direct request to reverse entry
67's explicit choice not to do this.

70. **The derivation column is `position: sticky` on desktop, with its own
    bounded height and internal scroll**, not a bare sticky column. A bare
    `position: sticky` (no `max-height`) pins the element's top edge but does
    nothing about its bottom: once the panel's content is taller than the
    viewport — easy here, since every ledger row can expand and the bracket
    table nests inside one of them — the lower rows become genuinely
    unreachable until the user finishes scrolling the entire inputs column
    past. `max-height: calc(100vh - 2 * var(--space-4))` plus `overflow-y: auto`
    turns it into an independently-scrollable pane instead, so every row stays
    reachable regardless of how tall the content gets. `scrollbar-gutter:
    stable` stops a scrollbar from appearing and shifting the ledger's content
    width.

    The panel is `tabIndex={0}` so a keyboard user can Tab straight to it and
    scroll with arrow keys, with its own `:focus-visible` outline set
    `outline-offset: -2px` (inward) rather than the usual outward offset —
    `overflow-y: auto` alone implicitly makes `overflow-x` compute to `auto`
    too per the CSS spec, so an outward offset would get clipped.

    Verified by scrolling the real page, not just reading the CSS: the panel's
    `top` holds at the sticky offset across roughly 1,800px of scroll through
    the (taller) inputs column, then releases and continues in normal flow once
    the inputs column ends — confirmed by watching `getBoundingClientRect().top`
    at seven scroll positions. The existing fixed sticky answer bar still
    fires correctly, just later: since the derivation panel itself now serves
    as the persistent reminder while it's pinned, the fixed bar's own
    IntersectionObserver naturally doesn't flip on until the whole workspace —
    not just the panel — has scrolled out of view. The two mechanisms hand off
    rather than compete: confirmed live that the fixed bar stays hidden through
    the entire pinned range and appears once the workspace section is behind
    you, deep into Your moves. Below 1100px this is fully inert — `position:
    static`, `overflow: visible`, `max-height: none` — confirmed on the actual
    mobile viewport, not inferred from the media query alone.

Verified: `tsc --noEmit` clean; 78/78 tests unaffected (CSS/layout-only change);
zero console errors at 1280px and 375px; ledger rows still expand correctly
while the panel is stuck; keyboard focus reaches the panel directly.

## 11-star review, round 2 (amendment, authorised 31 Jul 2026)

Lennard asked to complete the full prioritised list from the second review pass,
not just the recommended subset. Three items were deliberately not built, each
for a reason established earlier in this project rather than a new one:

- **Removing the draft banner** — blocked on the real §10 verification
  (SRS caps, CPF ceiling, Spouse Relief amounts, YA2026 rebate) and a legal read
  of the disclaimer. Both are human tasks; no code change can complete them.
- **CMIO translations (zh/ms/ta)** — declined outright. Machine-translating tax
  terminology into three languages without native-speaker and subject-matter
  review is a worse failure mode than staying English-only on a government-
  adjacent tool. Infrastructure for this (a strings layer, a language switcher)
  was not scaffolded either — building the plumbing while explicitly declining
  to fill it would misrepresent how close this is to shippable.
- **Structured inputs for QCR/Parent/NSman, and any Singpass build-out** — both
  already have their own explicit prior decisions (declined twice; gated behind
  SINGPASS-PLAN.md's ⛔ checkpoints) and neither was reopened without a direct
  ask.

### CPF relief — resolved, but as guidance, not automation

71. **The CPF relief helper text now carries a verified ballpark percentage,
    scoped explicitly rather than stated as one number for everyone.** Verified
    against cpf.gov.sg (the CPFB "how much CPF contributions to pay" page and
    the official 1 Jan 2026 contribution rate table): the employee's own share
    is confirmed at **20% of wages** for Singapore Citizens/PRs in their 3rd
    year or beyond, aged 55 or under, up to the CPF wage ceiling — and
    confirmed **lower** (18% for 55–60, lower again above that, and materially
    lower for 1st/2nd-year PRs on graduated rates). The helper text states the
    20% figure but names its scope explicitly and says outright that it's
    lower for other cohorts, rather than implying one number fits everyone.

    **Still deliberately not auto-calculated.** The verification also confirmed
    exactly why: the 20%/18%/etc. rates apply to *monthly* wages up to a
    monthly OW ceiling (S$8,000/month from 1 Jan 2026) plus a separate Additional
    Wage ceiling — this app collects only *annual* employment income, so an
    auto-calculation would have to assume an even monthly spread, which is its
    own invented assumption with its own failure mode (bonuses, mid-year raises,
    job changes all break it). The field stays free-entry; the fix here is that
    the guidance is now a real, sourced number instead of a shrug.

### Answer-first and take-it-with-you

72. **A persistent bottom bar on mobile**, showing net tax whenever
    `totalIncome > 0` — not gated on scroll position at all, unlike the
    existing fixed top bar (which only appears once the derivation section has
    scrolled fully out of view). On a phone, where the form runs several
    screens taller than the viewport, that gate meant the headline figure was
    invisible for most of the scroll — exactly the problem the sticky
    derivation panel solved on desktop in the prior amendment, now solved for
    mobile too. CSS-only gated to below 1100px; the old top bar is explicitly
    hidden in that range so the two never double up. Verified live: present at
    scroll position 400 mid-form, correct figure, no horizontal overflow.

73. **The hero gained a bridge line to Your moves**: "You could still save up
    to $X before 31 Dec — see Your moves ↓", shown whenever any lever has
    positive headroom and a positive saving. Without it, the PRD's own
    call-to-action metric depended on someone scrolling past the entire
    derivation unprompted to discover Your moves exists. Verified live against
    the example fill: computed as the largest single lever saving, matched the
    actual lever card's figure exactly.

74. **Delta feedback next to the hero figure**: "▲ $1,400.00 more than a moment
    ago" / "▼ ... less", appearing after any change to net tax. Deliberately
    **not animated** — this sits on the keystroke recompute path, which §6.4
    already bars from transitioning, so no amendment to the motion rules was
    needed; the number simply appears, like every other figure on this page.
    Implemented with a ref for the previous value (compared once per commit)
    and state for the visible delta, explicitly skipped on the very first
    reveal (0 → something is arrival, not a change) and cleared by "Clear all"
    so a stale delta can't flash on the next fill. Verified live in both
    directions: +$1,400 on an increase, −$1,400 reverting it, and confirmed
    absent immediately after "Try an example" (first reveal) and after
    "Clear all".

75. **"Copy summary"** writes a plain-text breakdown (every ledger line, the
    marginal rate, the same non-tax-advice line as the mandatory disclaimer)
    to the clipboard, with the button label itself flipping to "Copied ✓" or a
    failure message — no toast, nothing new to the motion system. Verified
    live by intercepting `navigator.clipboard.writeText`: the captured text
    matched the on-screen ledger figures exactly.

76. **"Add a reminder to your calendar (1 Oct)"** downloads a minimal `.ics`
    file client-side (`Blob` + object URL + a discarded temporary anchor) —
    no server, no storage, fits §9. Only shown alongside actionable lever
    cards. Verified live: correct filename and MIME type. Known simplification,
    stated rather than hidden: the file has no RFC 5545 line-folding, since
    every field is short enough that mainstream calendar clients import it
    unfolded — acceptable for a single-event file, not assumed safe for
    anything larger.

77. **A "Where these numbers come from" methodology panel** in Your moves,
    reusing the same collapsible chevron pattern as the ledger and field
    groups. States plainly that rates and the derivation chain follow IRAS's
    own YA2026 calculator, that the constants absent from that workbook were
    checked against IRAS/CPF's public pages, and links three of the actual
    sources already used elsewhere in the app. This is citizen-facing
    trust-building, not a repackaging of `DECISIONS.md` — the internal
    architecture reasoning in this file stays internal.

### Reach and print

78. **A print stylesheet** (`@media print`). Framed deliberately as distinct
    from §9's "no PDF export": nothing was built that generates or exports a
    file — this makes the browser's own native Ctrl/Cmd+P output usable, which
    exists regardless of anything in this app. All `<details>` (draft banner,
    ledger rows, field-group collapsibles, the new methodology panel) are
    forced visible in print via `:not([open]) > *:not(summary) { display:
    block !important }`, which leaves the on-screen open/closed state
    completely untouched — the override only takes effect inside the print
    media query. Interactive-only chrome (sliders, toggles, the fixed bars,
    the skip link, both toolbars) is hidden, since none of it means anything
    on paper. A "Print or save as PDF" button triggers `window.print()` — the
    browser's own dialog, not a custom export path.

79. **An SVG Open Graph image** (`public/og-image.svg`, 1200×630, on-brand:
    accent rule, "TAXSENSE" wordmark, headline, one-line description).
    Rendered and screenshotted to confirm the actual output, not just read
    from source. Stated honestly rather than oversold: SVG `og:image` is not
    reliably rendered by every social platform — several require PNG/JPG for
    link-preview cards. A PNG export is a follow-up if broader preview
    coverage is needed; it was not built here, since it would mean a new
    build-time image-conversion devDependency for a "polish" pass, which is
    outside this pass's scope.

80. **A skip link**, "Skip to your tax breakdown", targeting the derivation
    panel (`#derivation-panel`, already focusable from the sticky-panel
    amendment). Standard visually-hidden-until-focused pattern, distinct from
    the permanent `.sr-only` utility. Addresses a real gap: the derivation
    panel sits *after* all 18 form fields in DOM/tab order, so a keyboard user
    previously had to tab through the entire form to reach it.

    **Honestly flagged, not silently claimed as verified:** the `:focus`
    reveal could not be exercised live in this session's browser tooling —
    `document.hasFocus()` reports `false` in the automated pane, so CSS
    `:focus` cannot match regardless of whether the rule is correct.
    Confirmed instead: the link exists, is real (has a working `href`), is
    the first element inside `<main>`, and the CSS rule is the standard,
    widely-used skip-link pattern (`top: -3rem` → `top: var(--space-3)` on
    `:focus`) — not a novel mechanism this project invented. Recommend a
    manual Tab-key check before relying on it.

Verified across this whole batch: `tsc --noEmit` clean; 78/78 tests unaffected
(no engine or logic changes — everything here is UI, copy, or a verified
guidance string); CSS hygiene re-swept (no `transition: all`, no `scale(0)`, no
`ease-in`, no `@keyframes`, no ungated `:hover`, no duplicate selectors, four
accessibility blocks now present); zero console errors at 1280px and 375px; no
horizontal overflow at 375px.

## Above-the-fold spacing fix (bug fix, 31 Jul 2026)

Lennard reported the desktop empty state as "broken" — excessive white space
above the fold, taking a full page scroll to reach the first input. Measured
before touching anything: the `<label>` for Employment income sat at **675px**
from the top at 1440×900, well past a typical laptop's usable viewport height.

Three redundant margin stacks accounted for it, all introduced across earlier
amendments that each made sense in isolation but compounded:

81. **`.brand-mark` and `.page-title` each carried their own `var(--space-5)`
    (40px) top margin** — two 40px gaps for two small, adjacent text lines
    (the "TAXSENSE" eyebrow and the H1) with nothing between them. Consolidated
    to one gap: `.brand-mark` keeps the separation from the banner above
    (reduced to `var(--space-4)`, 24px), `.page-title` now sits tightly under
    its own eyebrow (`var(--space-2)`, 8px) rather than repeating the same gap.

82. **The privacy badge, the hero, and the workspace's first `.section` each
    added their own bottom/top margin in sequence** — badge→hero 40px,
    hero→workspace up to 64px more (`.section`'s `clamp(2.25rem, 6vw, 4rem)`),
    for **104px of pure gap** between the end of the hero card and "Your
    numbers". That clamp was sized for three big vertically-stacked full-page
    blocks (Inputs, Derivation, Moves) — appropriate when this app was a
    single column, no longer appropriate now that Inputs and Derivation sit
    side by side in a compact workspace directly under the hero (added in the
    two-column amendment, entry 67). `.workspace .section` now has
    `margin-top: 0`; `.workspace` itself carries one controlled `var(--space-4)`
    top margin instead. Each section's own *bottom* margin is untouched — that
    still separates the workspace from Your moves below it.

83. **`.hero-answer`'s bottom margin trimmed** from `var(--space-5)` to
    `var(--space-4)` (40px → 24px), consistent with the above.

Verified by measuring the same elements again, not by re-reading the CSS: the
Employment income label moved from **675px → 547px**, and the input box itself
now sits at **590px** — comfortably inside any normal desktop viewport height,
where before it required scrolling on anything shorter than ~700px. Screenshot
confirms the whole empty-state page now fits within a single 900px-tall
viewport. Re-verified on the actual mobile viewport (375×812): no regression,
no horizontal overflow, page height unaffected in any adverse way. `tsc`
clean, 78/78 tests (CSS-only change), zero console errors, no duplicate
selectors, no hygiene regressions.

## Design-engineering review pass (amendment, 31 Jul 2026)

Lennard asked for a review through `/emil-design-eng` (Emil Kowalski's design
engineering philosophy), then to implement the findings. Six issues surfaced
from actually reading the stylesheet, not from general animation advice —
each is a real inconsistency found in this codebase's own code.

84. **Disclosure-reveal consistency.** The same `<details>` + rotating-chevron
    affordance exists four times in this file — the ledger rows, the draft
    banner, the collapsible field groups, and the methodology panel — and only
    one of the four (`.ledger-detail`) animated its open/close. The other
    three snapped open instantly. Not a deliberate difference; the pattern
    simply wasn't carried forward when the later three were added. All three
    (`.draft-banner-body`, `.field-group-collapsible > .field-group`,
    `.methodology-body`) now get the identical treatment: `opacity`/
    `transform: translateY(4px→0)` at `var(--dur-expand) var(--ease-out)`,
    via `@starting-style` scoped to `[open] > child` so the on-screen
    collapsed/expanded state is never touched, only its reveal.

85. **The two fixed answer bars** (`.sticky-bar`, `.mobile-answer-bar`)
    mounted and unmounted via React's conditional render with zero transition
    — they simply appeared. Both now animate in with `@starting-style`, using
    percentage-based `translateY` (`-100%` for the top bar, `100%` for the
    bottom one) exactly as the skill doc names the Sonner/Vaul toast
    technique: works regardless of the bar's actual rendered height, no fixed
    pixel value to keep in sync.

86. **First-reveal entrance, applied for consistency, not invented.**
    `.hero-answer-content` (new wrapper around the filled-state hero, since
    the placeholder→filled swap is a full child-element replacement, not a
    style change), `.proportion`, and `.bracket-strip` all mount once per
    session (income goes from 0 to something) with no entrance transition,
    while `.lever-card` — mounting in the exact same "data just appeared"
    circumstance — already got this treatment when it was built. Extended the
    same `@starting-style` opacity/translateY(4px) pattern to all three. The
    per-keystroke recompute path inside each of these (segment widths, the
    live NumberFlow figure) is untouched — that correctly stays unanimated
    per §6.4, and nothing here changes it.

87. **Copy-summary button label swap.** "Copy summary" → "Copied ✓" → a
    failure message are meaningfully different lengths; swapping the text
    node directly caused a hard, un-eased jump next to a page where
    everything else fades or scales. The label is now wrapped in its own
    element, `key`-ed by status in JSX so each status change mounts a fresh
    node, with a quick (`var(--dur-tooltip)`, 125ms) opacity crossfade via
    `@starting-style` — CSS can't meaningfully "transition between" two
    strings, so remounting is what makes a fade possible at all. Verified
    live: clicking still swaps the label correctly and the clipboard write
    still fires.

88. **Duplicated `:active { scale(0.97) }` declarations left as-is, documented
    instead of removed.** The value is independently declared in six places
    (`.tooltip-trigger`, `.ledger-line-summary`, `.field-group-summary`,
    `.button`, the lever-slider thumb, and the generic `button/summary/
    a.button` fallback). Consolidating onto the generic selector alone was
    considered and rejected: several of the specific classes sit on elements
    from `@base-ui-components/react` or other primitives whose rendered tag
    isn't guaranteed to literally be `<button>`/`<summary>` — collapsing the
    rules on an unverified assumption about what tag renders risks silently
    losing press feedback somewhere. Added a comment explaining the
    duplication is deliberate defensive redundancy, not drift, which was the
    actual finding (undocumented duplication reads as an oversight).

89. **`prefers-reduced-motion` refined**, extending `.lever-card`'s existing
    exemption rather than introducing a new mechanism. The blanket
    `* { transition-duration: 1ms !important }` flattens opacity fades to
    instant too, stricter than the principle it's implementing ("fewer and
    gentler, not zero — keep opacity/color, remove movement"). `.lever-card`
    already carved out `transform: none !important` to keep its own fade
    while dropping movement; that same pair (`transform: none`, a restored
    ~120ms duration) is now applied to every entrance transition added in
    entries 84–86, so the exemption is consistent across all of them rather
    than existing for one component alone.

**A note on what I could and couldn't verify live**, for the same reason
flagged earlier for the skip link's `:focus` state: this session's browser
tooling reports `document.hidden: true` / `document.hasFocus(): false` for
the automated pane, which throttles or fully suppresses `IntersectionObserver`
callbacks (confirmed directly — an instrumented observer logged zero
callbacks across a full-page scroll sweep, including the mandatory initial
callback every `IntersectionObserver` fires on `.observe()`). This means the
existing scroll-triggered `.sticky-bar` mechanism could not be exercised live
in this session. **Verified this is a pre-existing tooling limitation, not a
regression from today's changes:** `git stash` was used to test the prior
commit under the identical scroll sequence, and it reproduced the same
non-firing behaviour byte-for-byte (identical page height, same result) —
confirming the cause is the pane's visibility state, not anything changed in
this pass. The `.mobile-answer-bar` entrance, which is driven by plain React
state rather than an observer, was verified live successfully.

Verified: `tsc --noEmit` clean; 78/78 tests (no engine or logic changes —
CSS entrance transitions and one JSX wrapper/key); CSS hygiene re-swept (no
`transition: all`, no `scale(0)`, no `ease-in`, no `@keyframes`, no ungated
`:hover`, no duplicate selectors, four accessibility blocks intact,
`@starting-style` count 3 → 13); zero real console errors (all network
requests 200 OK; the console panel showed two stale HMR entries left over
from the `git stash`/`pop` diagnostic step, traced to that and not the
shipped code); mobile bar entrance, copy-summary crossfade, and all five new
`@starting-style` transitions confirmed resolved via computed styles.

## Not built

20. No feature outside the plan was added, **other than the amendments in the
    sections above, which Lennard authorised explicitly.** Still absent, per §9:
    Myinfo code (gated behind SINGPASS-PLAN.md's own checkpoints instead),
    persistence of any kind, analytics, an in-app PDF-export feature (the native
    browser print stylesheet above is deliberately distinct from this), dark
    mode, per-relief caps, non-resident computation, PTR eligibility logic, and
    any fifth runtime dependency.
