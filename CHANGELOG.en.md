# Changelog

English. German: [CHANGELOG.md](./CHANGELOG.md)

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version in [`src/version.json`](./src/version.json) (also shown in the web app footer).

## Unreleased

### Changed
- Shifts / month summary: `sessionStorage` instead of long-lived localStorage; removed legacy full-PDF data-URL cache
- Footer: “Clear local data”; privacy: web vs mobile (no AES in the browser)

## 0.2.0 — 2026-08-02

First versioned release after porting key Mobile features to the web app (`shift.fr4iser.com`).

### Added
- Mapping adapter `dutyCodes` ↔ `presets`; areas **OP · ATA** and **OP · Anaesthesia**
- Department **code-grid** PDF parsing (bundled from Mobile) + **My name** filter
- **Payroll check** UI (Abrechnungsprüfung): payslip ↔ shifts + AVR tariff profiles; tariff as-of / sources / disclaimer
- PWA basics: `manifest.webmanifest`, service worker (shell cache only, no PDFs)
- Bundle rebuild: `scripts/rebuild-port-bundles.sh` (sibling `ShiftPlanConverter-Mobile`)
- Port plan: `docs/web-port-plan.md` / `.de.md`
- Fixture policy: `tests/fixtures/` + gitignore for private PDFs

### Changed
- Nginx CSP: allow `cdnjs.cloudflare.com` for pdf.js (+ worker)
- LOGA3 page: note that browser iframe automation is not supported
- Privacy DE/EN: AVR sources, as-of, no warranty
- Fixed debug HTML structure (broken markup had escaped the max-width container)

### Fixed
- pdf.js blocked by CSP → `pdfjsLib undefined`
- Clearer hints for code-grid PDFs with wrong mapping / name filter
- Payroll check: “missing shifts” diagnostic in German + warning banner

### Notes
- OCR and in-app LOGA stay on Mobile/Desktop; web = local PDFs
- JobRad / social/tax lines: Ist from payslip only (no Thomas-style rebuild)

## 0.1.0 — before 2026-08-02

Unversioned web baseline: time-settlement PDF → preview → ICS / CSV / Google; hospital mappings (St. Elisabeth); LOGA3 as external desktop tool.
