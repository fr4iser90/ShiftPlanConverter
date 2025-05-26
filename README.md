# Dienstplan Konverter

Eine Web-Anwendung zum Konvertieren von Dienstplan-PDFs und Synchronisieren mit Google Kalender.

## Features

- Lokale PDF-Verarbeitung (keine Uploads)
- Automatische Erkennung von Schichten, Urlaub und Feiertagen
- Vorschau der erkannten Einträge
- Direkte Synchronisierung mit Google Kalender
- Unterstützung für verschiedene Schichttypen (F, F1, F2, F3, M1, M2, M3, B36, B38, MO)
- Bereitschaftsdienste werden automatisch erkannt

## Setup

1. Erstelle ein Projekt in der [Google Cloud Console](https://console.cloud.google.com/)
2. Aktiviere die Google Calendar API
3. Erstelle OAuth 2.0-Anmeldedaten (Client ID und API Key)
4. Ersetze in der `app.js` die Platzhalter:
   ```javascript
   const CLIENT_ID = 'YOUR_CLIENT_ID'; // Deine Client ID
   const API_KEY = 'YOUR_API_KEY'; // Dein API Key
   ```

## Verwendung

1. Öffne die `index.html` in einem modernen Webbrowser
2. Wähle deine Dienstplan-PDF aus
3. Überprüfe die Vorschau der erkannten Einträge
4. Klicke auf "Mit Google Kalender verbinden"
5. Nach erfolgreicher Anmeldung, klicke auf "Mit Kalender synchronisieren"

## Technische Details

- Verwendet PDF.js für die PDF-Verarbeitung
- Implementiert die Google Calendar API für die Kalendersynchronisation
- Verarbeitet alle Daten lokal im Browser
- Unterstützt Drag & Drop für PDF-Dateien
- Zeigt detaillierte Statusmeldungen während der Verarbeitung

## Sicherheit

- Keine Daten werden auf einem Server gespeichert
- Alle Verarbeitung erfolgt lokal im Browser
- Google OAuth 2.0 für sichere Kalenderauthentifizierung
- Minimale Berechtigungen (nur Kalenderzugriff)

## Unterstützte Schichttypen

- F: 07:35-15:50
- F1: 08:30-16:45
- F2: 09:00-17:15
- F3: 09:30-17:45
- M1: 10:00-18:15
- M2: 11:00-19:15
- M3: 11:35-19:50
- B36: 07:35-19:35
- B38: 19:50-07:35
- MO: 11:35-07:35 (Kombination aus M3 und B38)
- URLAUB: Ganztägig
- FEIERTAG: Ganztägig

## Fehlerbehebung

1. **PDF wird nicht erkannt**
   - Stelle sicher, dass die PDF im korrekten Format ist
   - Überprüfe, ob der Text in der PDF auswählbar ist

2. **Google Kalender Verbindung fehlgeschlagen**
   - Überprüfe die Client ID und API Key
   - Stelle sicher, dass die Google Calendar API aktiviert ist
   - Lösche Browser-Cache und Cookies

3. **Synchronisierung fehlgeschlagen**
   - Überprüfe die Internetverbindung
   - Stelle sicher, dass du die notwendigen Berechtigungen erteilt hast
   - Versuche es erneut nach einigen Minuten

## Lizenz

MIT License 