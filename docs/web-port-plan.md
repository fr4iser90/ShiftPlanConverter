# Web Port Plan: Mobile → shift.fr4iser.com

Goal: Bring the web app ([shift.fr4iser.com](https://shift.fr4iser.com)) to a usable level for iOS colleagues — process PDFs locally → calendar (ICS/Google). Fully client-side. No sensitive data in the repo. LOGA automation on the web only as a later option, **not** naively via iframe.

Reference repo (source of truth for features/mappings): `ShiftPlanConverter-Mobile`.

German version: [web-port-plan.de.md](./web-port-plan.de.md).

---

## Target picture

| For colleagues with iPhone | Not in the first pass |
|----------------------------|------------------------|
| Time settlement PDF → preview → ICS/Google | OCR |
| Correct mappings (nursing OR/ATA, doctors anaesthesia) | In-app LOGA like Android |
| Later: roster code-grid + person filter | Encrypted store / widgets |
| Optional: payslip + **Abrechnungsprüfung** (expected vs actual) | Standalone “earnings calculator” / Verdienstrechner |

---

## Copy vs analyse & port

**Do not copy blindly.** The schemas differ:

| | Mobile | Web |
|--|--------|-----|
| Times→codes | flat `dutyCodes` | `presets.<Name>.{time: …}` |
| Doctors | `composeRules`, aliases, rich codes | Stub A/B/C |
| Areas | `op-ata`, `op-anaesthesie` | generic `op-bereich` |
| Parser | engine JSON (`pdf-payroll`, `pdf-code-grid`, `pdf-payslip`) | single `parser.js` |

**Approach:** Mobile is the source of truth for **data** (codes, colours, aliases, compose). Web keeps its UI/loader and gets an **adapter layer** / transform:

```
mobile dutyCodes (+ optional default preset)  →  web presets
```

That keeps mappings maintainable without rebuilding the whole pack engine.

### Repo split of work

```
Mobile (SoT)                         Web
────────────                         ───
packs/.../mappings/*.json   ──►  transform ──► krankenhaeuser/.../mappings/
packs/.../parsers/pdf.json  ──►  port engines as ES modules
payroll/*                   ──►  Phase 3 only
webview/loga3/*             ──►  DO NOT port (iframe trap)
```

Optional later: a small shared JSON package for `dutyCodes` / colours only (no credentials, no PII fixtures) — only once manual transform becomes painful.

---

## Privacy / repo rules (hard)

### Allowed in the repo

- Duty codes, times, colours, labels (public roster semantics)
- Anonymised test PDFs / fixtures (no real names, staff IDs, IBANs, gross pay)
- Parser regexes without personally identifiable examples

### Never in the repo

- LOGA credentials, tokens, session cookies
- Real time settlements / payslips / rosters with people
- Google client secrets (public OAuth client ID only if needed, as today)
- User mappings from `localStorage` / unfiltered feedback mails

### At runtime

- PDF bytes, parsed entries, prefs only in the browser (`localStorage` / memory)
- Server = static Nginx, **no** upload backend
- Nothing is sent to the ShiftPlanConverter server

---

## LOGA in the browser / iframe?

**iframe ≠ mobile WebView.** Automation like in the app is not reliable in the browser.

Mobile runs in a **native WebView** (top-level for LOGA): JS/CSS inject, cookie jar, PDF capture. In the browser on `shift.fr4iser.com`:

1. LOGA typically sets `X-Frame-Options` / `CSP frame-ancestors` → embedding often blocked
2. Cross-origin iframe → no DOM access, no CSS fix, no download hook
3. Storing credentials in the parent and typing them into the iframe = same-origin / security problem

| Option | Realistic? |
|--------|------------|
| Manual PDF upload (desktop LOGA / app fetches PDF) | **Yes — phases 1–3** |
| “Open LOGA” link + user downloads PDF themselves | Yes, UX help |
| iframe automation like mobile | **No / very fragile** |
| Browser extension / desktop Playwright | Possible, separate product |
| Hospital server + login API | Different architecture topic |

Data flow stays local: PDF only in the browser → ICS/Google from the client.

---

## Phases

### Phase 0 — Foundation

- Document mapping schema: mobile → web transform
- Align `krankenhaeuser/.../config.json` with mobile: areas `op-ata`, `op-anaesthesie`
- Fixture policy: anonymised PDFs only (e.g. under `tests/fixtures/`) + `.gitignore` for real samples
- Checklist: no PII in the diff

### Phase 1 — Mapping + doctors (iOS priority)

1. Transform `op-ata.json` → web `mappings/pflege/op-ata.json`
2. Transform `op-anaesthesie.json` → `mappings/aerzte/op-anaesthesie.json` (codes/colours/aliases)
3. Extend web loader: accept `dutyCodes` **or** `presets` (adapter in `shiftTypesLoader` / `convert.js`)
4. `composeRules` (e.g. house duty = ID1+B5A): read/warn first; apply fully with code-grid
5. UI: label areas like mobile; replace stub A/B/C
6. Smoke: anonymised ATA + anaesthesia time settlement → preview + ICS

**Outcome:** iPhone colleagues can turn PDFs with correct codes into a calendar.

### Phase 2 — Roster code-grid

1. Port detection logic from mobile `pdf-code-grid` (+ relevant parts of `parsers/pdf.json`)
2. Person filter (“My name”) in the UI
3. Apply compose rules where multiple codes → one event
4. Do not commit real team PDFs — anonymised grid fixtures only

**Outcome:** Department overview PDF → personal ICS (also a base for a later secretary workflow).

### Phase 3 — Payslip + Abrechnungsprüfung (optional)

1. Port payslip parser (`pdf-payslip`)
2. Tarif/payroll profiles only structural / publicly usable logic; no personal pay-type examples with real amounts
3. UI label **Abrechnungsprüfung** (tab short: Prüfung): expected (shifts + public tariffs) vs actual (payslip) — local
4. Code identifiers always English (`payroll`, `payslip`, `check`) — never German (`pruefung`, `abrechnung`, …)
5. No “Verdienstrechner” / “earnings calculator” marketing

### Phase 4 — PWA polish

- Manifest + service worker (offline UI; do not cache PDFs with PII risk)
- “Add to Home Screen” hint for iOS
- Clear UI copy: processing is local, no server upload

### Phase 5 — LOGA (deliberately later, separate)

- Web: link to desktop LOGA / hint “bring PDF here”
- Automation stays Android WebView + desktop Playwright
- If browser automation ever: prefer extension over iframe; credentials browser-local only (never repo)

**OCR:** after phases 2–3, only if PDF text is not enough.

---

## Phase 1 acceptance criteria (“ready for colleagues”)

- [ ] ATA and anaesthesia mappings live on web
- [ ] Time settlement PDF → correct codes/colours → ICS importable on iPhone
- [ ] Google sync as today (optionally usable)
- [ ] No new secrets/PII in the git diff
- [ ] Privacy/UI clear: web = local PDF; mobile features described separately

---

## Implementation order

1. Adapter `dutyCodes` ↔ `presets` + config areas  
2. Port `op-ata` + `op-anaesthesie`  
3. Time settlement smoke  
4. Code-grid + name filter  
5. Abrechnungsprüfung (`payroll`)  
6. PWA  
7. LOGA docs/link only — do not iframe-automate  

---

## Naming rule: UI vs code

| Layer | Language | Example |
|-------|----------|---------|
| User-facing UI (DE) | German OK | **Abrechnungsprüfung**, Verdienstnachweis, Zeitabrechnung |
| Code: files, folders, symbols, i18n keys, engines | **English only** | `payroll/`, `payslip`, `check.ts`, `pdf-payslip`, `tabPayroll` |
| Never in code | German identifiers | ~~`pruefung`~~, ~~`abrechnungspruefung`~~, ~~`verdienst`~~ as module names |

---

## Terminology

| Everyday / UI term | In code / product |
|--------------------|-------------------|
| Mapping | Hospital JSON / pack `dutyCodes` or `presets` |
| Doctors (Ärzte) | Pack group `arzt` / web `aerzte` — anaesthesia rich, surgery stub |
| Verdienstrechner | **Wrong name** → UI **Abrechnungsprüfung**; code `payroll` (shifts + public tariffs vs payslip) |
| Abrechnungsprüfung | UI title; code: `payroll` / `check` (not `pruefung`) |
| Time settlement (Zeitabrechnung) | LOGA single-person PDF (primary web input today); engine `pdf-payroll` |
| Verdienstplan | not a feature name → payslip / Verdienstnachweis + Abrechnungsprüfung |
| Roster (Dienstplan) | code-grid / time protocol → calendar/ICS |

---

## Status

| Phase | Status |
|-------|--------|
| 0 Foundation | **done** (adapter, fixtures policy, gitignore) |
| 1 Mapping + doctors | **done** (`op-ata`, `op-anaesthesie`, config areas) |
| 2 Code-grid | **done** (bundled from mobile + person filter) |
| 3 Abrechnungsprüfung (`payroll`) | **done** (UI + bundled check; needs real PDF smoke) |
| 4 PWA | **done** (manifest + SW shell cache) |
| 5 LOGA (docs/link) | **done** (no-iframe note on `loga3.html`) |
| OCR | deferred |

Bundles: regenerate with `scripts/rebuild-port-bundles.sh` (sibling `ShiftPlanConverter-Mobile`).
