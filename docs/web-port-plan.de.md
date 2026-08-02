# Web-Port-Plan: Mobile → shift.fr4iser.com

Ziel: Die Web-App ([shift.fr4iser.com](https://shift.fr4iser.com)) für iOS-Kollegen auf einen nutzbaren Stand bringen — PDFs lokal verarbeiten → Kalender (ICS/Google). Alles clientseitig. Keine sensiblen Daten im Repo. LOGA-Automation auf Web nur als spätere Option, **nicht** naiv per iframe.

Referenz-Repo (Source of Truth für Features/Mappings): `ShiftPlanConverter-Mobile`.

English version: [web-port-plan.md](./web-port-plan.md).

---

## Zielbild

| Für Kollegen mit iPhone | Nicht im ersten Wurf |
|-------------------------|----------------------|
| Zeitabrechnung-PDF → Preview → ICS/Google | OCR |
| Korrekte Mappings (Pflege OP/ATA, Ärzte Anästhesie) | In-App-LOGA wie Android |
| Später: Dienstplan code-grid + Personenfilter | Encrypted Store / Widgets |
| Optional: Verdienstnachweis + **Abrechnungsprüfung** (Soll/Ist) | Eigenständiger „Verdienstrechner“ |

---

## Kopieren vs. analysieren & portieren

**Nicht blind kopieren.** Die Schemas unterscheiden sich:

| | Mobile | Web |
|--|--------|-----|
| Zeiten→Codes | flaches `dutyCodes` | `presets.<Name>.{zeit: …}` |
| Ärzte | `composeRules`, Aliases, reiche Codes | Stub A/B/C |
| Bereiche | `op-ata`, `op-anaesthesie` | generisches `op-bereich` |
| Parser | Engine-JSON (`pdf-payroll`, `pdf-code-grid`, `pdf-payslip`) | ein `parser.js` |

**Vorgehen:** Mobile ist Source of Truth für **Daten** (Codes, Farben, Aliases, Compose). Web behält UI/Loader und bekommt eine **Adapter-Schicht** bzw. Transform:

```
mobile dutyCodes (+ optional default-preset)  →  web presets
```

So bleibt ein Mapping pflegbar, ohne die ganze Pack-Engine nachzubauen.

### Repo-Arbeitsteilung

```
Mobile (SoT)                         Web
────────────                         ───
packs/.../mappings/*.json   ──►  transform ──► krankenhaeuser/.../mappings/
packs/.../parsers/pdf.json  ──►  port engines as ES modules
payroll/*                   ──►  Phase 3 only
webview/loga3/*             ──►  NICHT portieren (iframe-Falle)
```

Optional später: kleines shared JSON-Package nur für `dutyCodes` / Farben (ohne Credentials, ohne PII-Fixtures) — erst wenn manuelles Transform nervt.

---

## Privacy / Repo-Regeln (hart)

### Ins Repo nur

- Dienstkürzel, Zeiten, Farben, Labels (öffentliche Dienstplan-Semantik)
- Anonymisierte Test-PDFs / Fixtures (keine echten Namen, Personalnummern, IBAN, Brutto)
- Parser-Regexes ohne personenbezogene Beispiele

### Nie ins Repo

- LOGA-Zugangsdaten, Tokens, Session-Cookies
- echte Zeitabrechnungen / Verdienstnachweise / Dienstpläne mit Personen
- Google Client Secrets (öffentliche OAuth Client-ID nur wenn nötig, wie bisher)
- Nutzer-Mappings aus `localStorage` / ungefilterte Feedback-Mails

### Laufzeit

- PDF-Bytes, Parsed Entries, Prefs nur im Browser (`localStorage` / Memory)
- Server = statisches Nginx, **kein** Upload-Backend
- Nichts geht auf den ShiftPlanConverter-Server

---

## LOGA im Browser / iframe?

**iframe ≠ Mobile-WebView.** Automatisierung wie in der App geht im Browser so nicht zuverlässig.

Mobile läuft in einem **nativen WebView** (Top-Level für LOGA): JS/CSS inject, Cookie-Jar, PDF-Capture. Im Browser auf `shift.fr4iser.com`:

1. LOGA setzt typischerweise `X-Frame-Options` / `CSP frame-ancestors` → Einbetten oft blockiert
2. Cross-Origin-iframe → kein DOM-Zugriff, kein CSS-Fix, kein Download-Hook
3. Credentials im Parent speichern und ins iframe tippen = Same-Origin-/Sicherheitsproblem

| Variante | Realistisch? |
|----------|----------------|
| PDF manuell hochladen (Desktop-LOGA / App holt PDF) | **Ja — Phase 1–3** |
| „Öffne LOGA“-Link + User lädt PDF selbst | Ja, UX-Hilfe |
| iframe-Automation wie Mobile | **Nein / sehr fragil** |
| Browser-Extension / Desktop-Playwright | möglich, eigenes Produkt |
| Krankenhaus-Server + Login-API | anderes Architektur-Thema |

Datenfluss bleibt lokal: PDF nur im Browser → ICS/Google vom Client.

---

## Phasen

### Phase 0 — Fundament

- Mapping-Schema dokumentieren: Mobile → Web Transform
- `krankenhaeuser/.../config.json` an Mobile angleichen: Areas `op-ata`, `op-anaesthesie`
- Fixture-Policy: nur anonymisierte PDFs (z. B. unter `tests/fixtures/`) + `.gitignore` für echte Samples
- Checkliste: keine PII im Diff

### Phase 1 — Mapping + Ärzte (Priorität für iOS)

1. Transform `op-ata.json` → Web `mappings/pflege/op-ata.json`
2. Transform `op-anaesthesie.json` → `mappings/aerzte/op-anaesthesie.json` (Codes/Farben/Aliases)
3. Web-Loader erweitern: `dutyCodes` **oder** `presets` akzeptieren (Adapter in `shiftTypesLoader` / `convert.js`)
4. `composeRules` (z. B. Hausdienst = ID1+B5A): erst lesen/warnen; voll anwenden mit code-grid
5. UI: Bereiche wie Mobile labeln; Stub A/B/C ersetzen
6. Smoke: anonymisierte Zeitabrechnung ATA + Anästhesie → Preview + ICS

**Ergebnis:** iPhone-Kollegen können PDFs mit korrekten Kürzeln → Kalender.

### Phase 2 — Dienstplan code-grid

1. Port der Erkennungslogik aus Mobile `pdf-code-grid` (+ relevante Teile aus `parsers/pdf.json`)
2. Personenfilter („Mein Name“) in der UI
3. Compose-Rules dort anwenden, wo mehrere Codes → ein Event
4. Keine echten Team-PDFs committen — nur anonymisierte Raster-Fixtures

**Ergebnis:** Gesamtübersicht-PDF → individuelle ICS.

### Phase 3 — Verdienstnachweis + Abrechnungsprüfung (optional)

1. Payslip-Parser portieren (`pdf-payslip`)
2. Tarif-/Payroll-Profile nur strukturell / öffentlich nutzbare Logik; keine personenbezogenen Lohnarten-Beispiele mit echten Beträgen
3. UI-Label **Abrechnungsprüfung** (Tab kurz: Prüfung): Soll (Dienste + öffentliche Tarife) vs. Ist (Verdienstnachweis) — lokal
4. Code-Bezeichner immer Englisch (`payroll`, `payslip`, `check`) — niemals Deutsch (`pruefung`, `abrechnung`, …)
5. Kein „Verdienstrechner“-Marketing

### Phase 4 — PWA-Politur

- Manifest + Service Worker (offline UI; PDFs mit PII-Risiko nicht cachen)
- „Zum Home-Bildschirm“-Hinweis für iOS
- Klartext in UI: Verarbeitung lokal, kein Server-Upload

### Phase 5 — LOGA (bewusst später, getrennt)

- Web: Link zu Desktop-LOGA / Hinweis „PDF hierher“
- Automation bleibt Android-WebView + Desktop-Playwright
- Falls je Browser-Automation: eher Extension als iframe; Credentials nur browser-lokal (nie Repo)

**OCR:** nach Phase 2–3, nur wenn PDF-Text nicht reicht.

---

## Akzeptanzkriterien Phase 1 („fertig für Kollegen“)

- [ ] ATA- und Anästhesie-Mappings live auf Web
- [ ] Zeitabrechnung-PDF → richtige Codes/Farben → ICS auf iPhone importierbar
- [ ] Google-Sync wie bisher (optional nutzbar)
- [ ] Keine neuen Secrets/PII im Git-Diff
- [ ] Privacy/UI klar: Web = lokal PDF; Mobile-Features getrennt beschrieben

---

## Umsetzungsreihenfolge

1. Adapter `dutyCodes` ↔ `presets` + config areas  
2. `op-ata` + `op-anaesthesie` portieren  
3. Zeitabrechnung-Smoke  
4. code-grid + Name-Filter  
5. Abrechnungsprüfung (`payroll`)  
6. PWA  
7. LOGA nur dokumentieren / Link — nicht iframe-automatisieren  

---

## Namensregel: UI vs. Code

| Schicht | Sprache | Beispiel |
|---------|---------|----------|
| UI (DE) | Deutsch OK | **Abrechnungsprüfung**, Verdienstnachweis, Zeitabrechnung |
| Code: Dateien, Ordner, Symbole, i18n-Keys, Engines | **nur Englisch** | `payroll/`, `payslip`, `check.ts`, `pdf-payslip`, `tabPayroll` |
| Nie im Code | deutsche Bezeichner | ~~`pruefung`~~, ~~`abrechnungspruefung`~~, ~~`verdienst`~~ als Modulnamen |

---

## Terminologie

| Umgangssprache / UI | Im Code / Produkt |
|---------------------|-------------------|
| Mapping | Krankenhaus-JSON / Pack `dutyCodes` bzw. `presets` |
| Ärzte | Pack-Gruppe `arzt` / Web `aerzte` — Anästhesie reich, Chirurgie Stub |
| Verdienstrechner | **Falscher Name** → UI **Abrechnungsprüfung**; Code `payroll` (Dienste + öffentliche Tarife vs. Verdienstnachweis) |
| Abrechnungsprüfung | UI-Titel; Code: `payroll` / `check` (nicht `pruefung`) |
| Zeitabrechnung | LOGA-PDF Einzelperson (primärer Web-Input heute); Engine `pdf-payroll` |
| Verdienstplan | kein Feature-Name → Verdienstnachweis / payslip + Abrechnungsprüfung |
| Dienstplan | code-grid / Zeitprotokoll → Kalender/ICS |

---

## Status

| Phase | Status |
|-------|--------|
| 0 Fundament | **erledigt** (Adapter, Fixture-Policy, gitignore) |
| 1 Mapping + Ärzte | **erledigt** (`op-ata`, `op-anaesthesie`, Config-Areas) |
| 2 code-grid | **erledigt** (Bundle aus Mobile + Personenfilter) |
| 3 Abrechnungsprüfung (`payroll`) | **erledigt** (UI + Bundle; PDF-Smoke noch manuell) |
| 4 PWA | **erledigt** (Manifest + SW Shell-Cache) |
| 5 LOGA (Doku/Link) | **erledigt** (kein-iframe Hinweis auf `loga3.html`) |
| OCR | zurückgestellt |

Bundles neu bauen: `scripts/rebuild-port-bundles.sh` (Sibling `ShiftPlanConverter-Mobile`).
