# ShiftPlanConverter Dokumentation

## Architektur
Die App ist modular aufgebaut, um eine einfache Erweiterung zu ermöglichen.

### Ordnerstruktur
- `src/`: Enthält die gesamte JavaScript-Logik.
  - `calendar/`: Kalender-Integrationen (Google, Outlook, ICS).
- `krankenhaeuser/`: Enthält die Krankenhaus-spezifischen Konfigurationen und Schicht-Mappings.
  - Jedes Krankenhaus hat eine `config.json` und einen `mappings/` Ordner.
- `assets/`: Statische Ressourcen wie Bilder und CSS.

## Hinzufügen eines neuen Krankenhauses
1. Erstelle einen Ordner unter `krankenhaeuser/[name]`.
2. Erstelle eine `config.json` basierend auf dem Beispiel von `st-elisabeth-leipzig`.
3. Erstelle die entsprechenden Schicht-Mappings im Unterordner `mappings/`.
4. Füge das Krankenhaus in der `index.html` zum `krankenhausSelect` hinzu.
