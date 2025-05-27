# TASKS.md

## Ziel
Eine zuverlässige, nachvollziehbare und benutzerfreundliche Synchronisation von Dienstplan-Einträgen (aus PDF/CSV) in einen Google Kalender, inkl. Kalenderauswahl, Abgleich und Fehlerbehandlung.

---

## 1. Parsing & Speicherung
- [ ] Nach dem Parsen der PDF/CSV sollen die Einträge **automatisch in `localStorage.parsedEntries` gespeichert** werden.
- [ ] Die Speicherung soll robust und konsistent erfolgen (z.B. nach jedem neuen Upload/Parsing).

## 2. UI/UX Verbesserungen
- [ ] **Vorschau** der zu synchronisierenden Einträge im UI (wie bisher).
- [ ] **Vorschau** der zu synchronisierenden Einträge im Kalender-Kontext (z.B. mit Kalenderauswahl und Zeitraum).
- [ ] **Dropdown/Prompt** zur Auswahl des Zielkalenders.
- [ ] **Option, einen neuen Kalender anzulegen** (z.B. "Dienstplan").
- [ ] **Anzeige des gewählten Kalenders** im UI.

## 3. Google Calendar Integration
- [ ] **Kalenderliste** abrufen und im UI anzeigen.
- [ ] **Neuen Kalender anlegen** können (über die API).
- [ ] **Events im Zielzeitraum löschen** ("Clear & Create"-Strategie), bevor neue Einträge angelegt werden.
- [ ] **Neue Events anlegen** (aus den gespeicherten Einträgen).
- [ ] **Fehlerbehandlung** für alle API-Operationen (Token, Kalender, Events).

## 4. Synchronisations-Logik
- [ ] **Zeitraum der Einträge automatisch erkennen** (aus den Daten).
- [ ] **Alle Events im Zielzeitraum im Zielkalender löschen** (vor dem Anlegen neuer Events).
- [ ] **Events eindeutig markieren** (z.B. mit Tag/Description, falls später "Smart Sync" gewünscht ist).
- [ ] **Erfolg/Fehler-Feedback** nach der Synchronisation anzeigen.

## 5. Optionale Verbesserungen
- [ ] **"Trockenlauf"/Preview-Modus**: Zeige, was passieren würde, ohne tatsächlich zu synchronisieren.
- [ ] **"Smart Sync"**: Nur geänderte Events aktualisieren, statt immer alles zu löschen.
- [ ] **Logging**: Aktionen und Fehler für den User nachvollziehbar protokollieren.

## 6. Dokumentation
- [ ] **Kurze Anleitung** im README/TASKS.md, wie die Synchronisation funktioniert und was zu beachten ist.

---

**Empfohlene Reihenfolge:**  
Parsing & Speicherung → UI/UX → Kalenderauswahl/Anlage → "Clear & Create"-Sync → Fehlerbehandlung → Optionale Verbesserungen → Dokumentation
