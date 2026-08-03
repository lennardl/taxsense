# TaxSense — Myinfo User Journey

**App:** TaxSense — a free, education-only calculator showing a Singapore tax
resident how their YA2026 income tax is derived, line by line, and how much
relief headroom (SRS, CPF cash top-up) remains before 31 December.

**Myinfo's role:** optional, one-tap prefill of the calculator form. No login
wall, no account, no persistence. Manual entry is always available and is the
default.

---

## Step 1 — Landing (no Myinfo involvement)

The user lands on the calculator. The full manual form is immediately usable:
income fields, relief fields, and a live derivation panel that recomputes on
every keystroke. A privacy note above the form states that nothing entered is
stored or sent anywhere. A prominent disclaimer states the tool is educational,
not tax advice, and not an official IRAS assessment.

## Step 2 — User initiates prefill

The user clicks **"Prefill with Singpass"** (rendered per the official Singpass
button guidelines) in the form's toolbar, next to "Try an example" and
"Clear all". Nothing happens without this explicit action.

## Step 3 — Singpass authentication and consent

The user is redirected to Singpass, authenticates, and sees the standard
Myinfo consent screen listing exactly the data requested:

| Scope | What the app does with it |
|---|---|
| Date of birth | Selects the Earned Income Relief age band (below 55 / 55–59 / 60+) |
| Residential status | Applies the correct SRS annual contribution cap (SC/PR vs foreigner) |
| Notice of Assessment (basic) | Prefills income as a clearly-labelled, editable estimate from the prior year's assessment |
| CPF contribution history | Prefills the CPF relief input |
| CPF account balances | Determines whether the Full Retirement Sum is reached (this gates the CPF top-up suggestion) |

**If the user declines consent:** they return to the calculator's manual form
with a single neutral line ("Singpass prefill wasn't completed — you can fill
in the numbers manually"). No error styling, no retry prompts, nothing
prefilled.

## Step 4 — Data retrieval (invisible to the user, < 10 seconds)

A stateless serverless function exchanges the authorisation code, retrieves
the consented person data, maps it to the calculator's input fields, passes it
to the browser once, and discards everything. Design guarantees:

- No person data ever appears in a URL.
- Access tokens never reach the browser.
- Nothing is written to any database, log, or analytics system — the function
  is a pass-through with no storage.
- On any failure (timeout, upstream error), the user lands on the manual form
  with the same neutral notice as a declined consent.

## Step 5 — Prefilled form, fully editable

The form fields arrive filled. Every prefilled value carries a visible tag:

- Status fields (age band, residency, FRS): **"From Myinfo"**.
- Income fields: **"From Myinfo — YA2025 assessment"**, plus a persistent note
  that these are prior-year estimates the user should update to this year's
  figures.

Every field remains editable; editing one changes its tag to "edited by you".
If a field wasn't available (e.g. no finalised Notice of Assessment), it is
simply left blank for manual entry — never filled with zero, and the user is
told income "wasn't available", not shown an error.

## Step 6 — Live result, computed client-side

The derivation panel and headline figure update from the prefilled values
exactly as they do for typed values: all tax computation runs in the browser.
The user sees their estimated tax, how it was derived line by line, and their
remaining SRS / CPF top-up headroom with the tax saving of acting before
31 December. Closing the page discards everything; revisiting starts clean.

---

## Data handling summary

| Property | Behaviour |
|---|---|
| Storage | None — no database, no cookies carrying person data beyond the one-time OAuth state, no localStorage |
| Logging | Outcome-level only ("prefill succeeded"); never field values |
| Retention | Zero — data lives in browser memory for the session only |
| Sharing | None — no third parties, no analytics |
| Fallback | Manual entry is always available and identical in capability |
