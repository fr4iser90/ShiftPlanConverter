# Dienstplan Konverter

Eine Web-Anwendung zum Konvertieren von Dienstplan-PDFs und Synchronisieren mit Google Kalender.

## Features

- Lokale PDF-Verarbeitung (keine Uploads)
- Automatische Erkennung von Schichten, Urlaub und Feiertagen
- Vorschau der erkannten Einträge
- Direkte Synchronisierung mit Google Kalender
- Unterstützung für verschiedene Schichttypen (F, F1, ...)
- Bereitschaftsdienste werden automatisch erkannt
- Anpassbare Schichttypen für verschiedene Berufsgruppen

## Setup

### Lokale Entwicklung

1. Erstelle ein Projekt in der [Google Cloud Console](https://console.cloud.google.com/)
2. Aktiviere die Google Calendar API
3. Erstelle OAuth 2.0-Anmeldedaten (Client ID und API Key)

### Docker Deployment

1. Stelle sicher, dass Docker und Docker Compose installiert sind
2. Klone das Repository:
   ```bash
   git clone https://github.com/fr4iser90/ShiftPlanConverter
   cd ShiftPlanConverter
   ```
3. Starte die Anwendung mit Docker Compose:
   ```bash
   docker-compose up -d
   ```
4. Die Anwendung ist nun unter `http://localhost:8080` erreichbar

### Produktions-Deployment

1. Konfiguriere die Google Cloud Console:
   - Füge deine Domain zu den autorisierten JavaScript-Ursprüngen hinzu
   - Füge deine Domain zu den autorisierten Weiterleitungs-URIs hinzu

2. Passe die Nginx-Konfiguration an:
   - Bearbeite `nginx.conf` für deine spezifischen Anforderungen
   - Passe die Server-Name und SSL-Konfiguration an

3. Starte die Anwendung:
   ```bash
   docker-compose up -d
   ```

## Verwendung

1. Öffne die Anwendung im Browser
2. Wähle deine Berufsgruppe aus
3. Wähle oder passe die Schichttypen an
4. Wähle deine Dienstplan-PDF aus
5. Überprüfe die Vorschau der erkannten Einträge
6. Klicke auf "Mit Google Kalender verbinden"
7. Nach erfolgreicher Anmeldung, klicke auf "Mit Kalender synchronisieren"

## Technische Details

- Verwendet PDF.js für die PDF-Verarbeitung
- Implementiert die Google Calendar API für die Kalendersynchronisation
- Verarbeitet alle Daten lokal im Browser
- Unterstützt Drag & Drop für PDF-Dateien
- Zeigt detaillierte Statusmeldungen während der Verarbeitung
- Docker-Container mit Nginx für einfaches Deployment

## Sicherheit

- Keine Daten werden auf einem Server gespeichert
- Alle Verarbeitung erfolgt lokal im Browser
- Google OAuth 2.0 für sichere Kalenderauthentifizierung
- Minimale Berechtigungen (nur Kalenderzugriff)
- Sichere Nginx-Konfiguration mit modernen Security-Headers

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

## Berufsgruppen-spezifische Schichttypen

### Anästhesie
- NEF: 08:00-20:00
- NEF-N: 20:00-08:00

### Chirurgie
- OP: 08:00-20:00
- OP-N: 20:00-08:00

### OTA
- OP: 08:00-20:00
- OP-N: 20:00-08:00

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

4. **Docker-Probleme**
   - Überprüfe die Docker-Logs: `docker-compose logs`
   - Stelle sicher, dass Port 8080 nicht belegt ist
   - Überprüfe die Nginx-Konfiguration

## Automatisierung

### Tasker Integration
Die Anwendung unterstützt die Integration mit Tasker für automatische Weckereinstellungen. Hier sind die verfügbaren Automatisierungsoptionen:

#### Wecker-Automatisierung
- Automatische Weckereinstellung basierend auf der nächsten Schicht
- Anpassbare Vorlaufzeit vor Schichtbeginn
- Unterstützung für verschiedene Weckzeiten je nach Schichttyp
- Möglichkeit, Wecker für Bereitschaftsdienste zu konfigurieren

#### Tasker Flows
1. **Standard Wecker-Flow**
   - Weckt 1 Stunde vor Schichtbeginn
   - Automatische Stummschaltung nach Weckzeit
   - Benachrichtigung über nächste Schicht

2. **Bereitschafts-Flow**
   - Spezielle Weckzeiten für Bereitschaftsdienste
   - Automatische Benachrichtigung bei Dienstbeginn
   - Status-Updates während des Dienstes

3. **Urlaubs-Flow**
   - Automatische Deaktivierung von Weckern während des Urlaubs
   - Benachrichtigung vor Urlaubsende

#### Einrichtung
1. Installiere Tasker auf deinem Android-Gerät
2. Importiere die bereitgestellten Tasker-Profile
3. Passe die Weckzeiten und Benachrichtigungen nach Bedarf an
4. Aktiviere die Automatisierung in den Anwendungseinstellungen

## Lizenz

MIT License 