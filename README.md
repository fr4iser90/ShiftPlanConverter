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

## PDFs aus LOGA3 holen (optional)

Der Converter wandelt nur PDFs um. Zum automatischen Download aus LOGA3 gibt es die separate Desktop-App — Erklärung und Downloads auf der Seite [`loga3.html`](https://shift.fr4iser.com/loga3.html) bzw. im Repo:

[![Latest](https://img.shields.io/github/v/release/fr4iser90/LOGA3-Automation?label=LOGA3)](https://github.com/fr4iser90/LOGA3-Automation/releases/latest)
[![Windows](https://img.shields.io/badge/download-Windows-0078D4?logo=windows&logoColor=white)](https://github.com/fr4iser90/LOGA3-Automation/releases/latest/download/loga3-win-x64.zip)
[![Linux](https://img.shields.io/badge/download-Linux-FCC624?logo=linux&logoColor=black)](https://github.com/fr4iser90/LOGA3-Automation/releases/latest/download/loga3-linux-x64.tar.gz)

Ablauf: LOGA3-App → PDFs speichern → hier per Drag & Drop öffnen. Details: [LOGA3-Automation](https://github.com/fr4iser90/LOGA3-Automation).

## Setup

### Docker (empfohlen)

```bash
git clone https://github.com/fr4iser90/ShiftPlanConverter
cd ShiftPlanConverter
docker-compose up -d
```

Erreichbar unter `http://localhost:8080`.

### Google Kalender (Client ID)

Die OAuth **Client ID** liegt in [`src/config.json`](src/config.json) (`googleClientId`). Das ist **kein Secret** und darf im Repo stehen (üblich bei öffentlichen Web-Apps). Vorlage ohne echte Werte: [`src/config.example.json`](src/config.example.json).

| Nutzung | Was tun? |
|---------|----------|
| [shift.fr4iser.com](https://shift.fr4iser.com) | Nichts — **„Mit Google verbinden“** reicht |
| Self-Hosting (eigene Domain / localhost) | Eigene Client ID in `src/config.json` setzen — siehe [`google-setup.html`](google-setup.html) |

Kein Client-Secret im Frontend. Nginx/SSL bei Bedarf in `nginx.conf` anpassen.

## Verwendung

1. Öffne die Anwendung im Browser
2. Wähle deine Berufsgruppe aus
3. Wähle oder passe die Schichttypen an
4. Wähle deine Dienstplan-PDF aus
5. Überprüfe die Vorschau der erkannten Einträge
6. Optional: „Mit Google verbinden“ → synchronisieren (oder .ics exportieren)

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
   - Auf shift.fr4iser.com: Popup-Blocker prüfen, erneut „Mit Google verbinden“
   - Self-Hosting: eigene Client ID + exakte JavaScript-Origin in der Cloud Console ([google-setup.html](google-setup.html))
   - Browser-Cache / Cookies ggf. leeren

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