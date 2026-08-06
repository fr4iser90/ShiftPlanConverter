# Änderungsprotokoll

Deutsch. Englische Fassung: [CHANGELOG.en.md](./CHANGELOG.en.md)

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).
Version in [`src/version.json`](./src/version.json) (auch Footer der Web-App).

## Unreleased

### Geändert
- Schichten / Monatsübersicht: `sessionStorage` statt dauerhaftem localStorage; Legacy-PDF-DataURL-Cache entfernt
- Footer: „Lokale Daten löschen“; Datenschutz: Web vs. Mobile (kein AES im Browser)
- Pflege/Ärzte: ein Bereich **OP**, Rollen darunter (ATA / OTA / Anästhesie), je Rolle eine Mapping-Datei; leere/unvalidierte Rollen markiert
- Mehrpersonen-Codeplan: erkannte Namen nach dem Parse zur Auswahl anbieten (kein Mischen ohne Namenswahl)
- iOS-Upload: doppelten `pdfInput.click()` entfernt; Dateiname nach Auswahl anzeigen
- Cache: Nginx max. 1 Tag für JS/CSS; HTML/`sw.js` no-cache; Service Worker network-first (`spc-shell-v3`)

## 0.2.0 — 2026-08-02

Erster versionierter Stand nach dem Port wichtiger Mobile-Features auf die Web-App (`shift.fr4iser.com`).

### Hinzugefügt
- Mapping-Adapter `dutyCodes` ↔ `presets`; Bereiche **OP · ATA** und **OP · Anästhesie**
- Abteilungs-**Code-Grid**-PDF (aus Mobile gebündelt) + Feld **Mein Name**
- **Abrechnungsprüfung** (UI): Verdienstnachweis ↔ Dienste + AVR-Tarifprofile; Tarifstand / Quellen / Gewähr-Hinweis
- PWA-Grundlage: `manifest.webmanifest`, Service-Worker (Shell-Cache, keine PDFs)
- Bundle-Rebuild: `scripts/rebuild-port-bundles.sh` (Sibling `ShiftPlanConverter-Mobile`)
- Port-Plan: `docs/web-port-plan.md` / `.de.md`
- Fixture-Policy: `tests/fixtures/` + gitignore für private PDFs

### Geändert
- Nginx-CSP: `cdnjs.cloudflare.com` für pdf.js (+ Worker)
- LOGA3-Seite: Hinweis, dass Browser-iframe-Automation nicht vorgesehen ist
- Datenschutz DE/EN: AVR-Quellen, Stand, keine Gewähr
- Debug-HTML-Struktur (Container-Breite war durch kaputtes Markup gebrochen)

### Behoben
- pdf.js durch CSP blockiert → `pdfjsLib undefined`
- Codeplan-PDFs: klarere Hinweise bei falschem Mapping / fehlendem Namensfilter
- Abrechnungsprüfung: Diagnose „fehlende Schichten“ auf Deutsch und als Warnbox

### Hinweise
- OCR und in-App-LOGA bleiben Mobile/Desktop; Web = lokale PDFs
- JobRad / SV / Steuer: nur Ist aus Verdienstnachweis (kein Thomas-Nachbau)

## 0.1.0 — vor 2026-08-02

Unversionierte Web-Baseline: Zeitabrechnung-PDF → Preview → ICS / CSV / Google; Krankenhaus-Mappings (St. Elisabeth); LOGA3 als externes Desktop-Tool.
