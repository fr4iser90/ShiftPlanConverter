# TASKS.md

## Ziel
Eine zuverlässige, nachvollziehbare und benutzerfreundliche Konvertierung und Synchronisation von Dienstplan-Einträgen (aus PDF/CSV) in einen Google Kalender – **alles lokal im Browser, keine Daten werden hochgeladen!**

---

## 1. Parsing & Speicherung
- [ ] Nach dem Parsen der PDF/CSV sollen die Einträge **automatisch in `localStorage.parsedEntries` gespeichert** werden.
- [ ] Die Speicherung soll robust und konsistent erfolgen (z.B. nach jedem neuen Upload/Parsing).

## 2. UI/UX Verbesserungen
- [ ] **Vorschau** der zu konvertierenden Einträge im UI (wie bisher).
- [ ] **Vorschau** der zu synchronisierenden Einträge im Kalender-Kontext (z.B. mit Kalenderauswahl und Zeitraum).
- [ ] **Dropdown/Prompt** zur Auswahl des Zielkalenders.
- [ ] **Option, einen neuen Kalender anzulegen** (z.B. "Dienstplan").
- [ ] **Anzeige des gewählten Kalenders** im UI.
- [ ] **Alle UI-Texte und Hinweise so anpassen, dass klar ist: Keine Daten werden hochgeladen, alles passiert lokal im Browser.**

## 3. Google Calendar Integration
- [ ] **Kalenderliste** abrufen und im UI anzeigen.
- [ ] **Neuen Kalender anlegen** können (über die API).
- [ ] **Events im Zielzeitraum löschen** ("Clear & Create"-Strategie), bevor neue Einträge angelegt werden.
- [ ] **Neue Events anlegen** (aus den gespeicherten Einträgen).
- [ ] **Fehlerbehandlung** für alle API-Operationen (Token, Kalender, Events).
- [ ] **Google Client ID**: Anleitung und Default-Client-ID bereitstellen, damit User nicht selbst eine anlegen müssen.
- [ ] **Erklärung im UI, warum eine Client ID gebraucht wird und dass keine Daten an einen Server gehen.**

## 4. Synchronisations-Logik
- [ ] **Zeitraum der Einträge automatisch erkennen** (aus den Daten).
- [ ] **Alle Events im Zielzeitraum im Zielkalender löschen** (vor dem Anlegen neuer Events).
- [ ] **Events eindeutig markieren** (z.B. mit Tag/Description, falls später "Smart Sync" gewünscht ist).
- [ ] **Erfolg/Fehler-Feedback** nach der Synchronisation anzeigen.

## 5. Optionale Verbesserungen
- [ ] **"Trockenlauf"/Preview-Modus**: Zeige, was passieren würde, ohne tatsächlich zu synchronisieren.
- [ ] **"Smart Sync"**: Nur geänderte Events aktualisieren, statt immer alles zu löschen.
- [ ] **Logging**: Aktionen und Fehler für den User nachvollziehbar protokollieren.

## 6. Dokumentation & Hilfe
- [ ] **Help Modal (Popup) im UI** mit:
    - Schritt-für-Schritt-Anleitung (Text + Screenshots)
    - Hinweise zu Datenschutz ("Alles bleibt lokal")
    - Anleitung für Google Client ID (mit Screenshots)
    - FAQ (z.B. "Warum brauche ich eine Client ID?", "Was passiert mit meinen Daten?")
- [ ] **Button "Hilfe" oder "?"-Icon** ins Hauptmenü einbauen, um das Modal zu öffnen.
- [ ] (Optional) **Eigene Hilfeseite** (help.html) mit ausführlicher Anleitung und Screenshots.
- [ ] **Kurze Anleitung** im README/TASKS.md, wie die Konvertierung und Synchronisation funktioniert und was zu beachten ist.

---

**Empfohlene Reihenfolge:**  
Parsing & Speicherung → UI/UX → Kalenderauswahl/Anlage → "Clear & Create"-Sync → Fehlerbehandlung → Optionale Verbesserungen → Dokumentation & Hilfe
