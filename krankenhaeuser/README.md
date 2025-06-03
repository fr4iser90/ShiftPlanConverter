# Schichttypen für Krankenhäuser/Stationen

Hier können Krankenhäuser oder Stationen ihre eigenen Schichttypen als JSON-Datei hinterlegen.

## Anleitung

1. Lege einen neuen Ordner mit dem Namen deines Krankenhauses/Station an, z.B.:
   ```
   krankenhaeuser/mein-krankenhaus/
   ```
2. Lege darin eine Datei `shiftTypes.json` an.

3. Die Struktur der Datei sollte wie folgt aussehen:

```json
{
  "pflege": {
    "op": {
      "default": {
        "07:35-15:50": "F"
      }
    },
    "station1": {
      "default": {
        "06:00-14:00": "F"
      }
    }
  },
  "aerzte": {
    "op": {
      "default": {
        "07:00-15:00": "A"
      }
    }
  }
}
```

- Berufsgruppen: z.B. `pflege`, `aerzte`, `servicekraefte`
- Bereiche: z.B. `op`, `station1`, `station2`, ...
- Presets: z.B. `default`, `anasthesie`, `ota`, ...
- Zeitbereiche: `"07:35-15:50"` (Start-Ende), Wert = Schichtcode

## Pull Request

- Reiche deine Änderungen als Pull Request ein.
- Prüfe, dass die JSON-Datei gültig ist (z.B. mit https://jsonlint.com/).

## Beispiel

Siehe [st-elisabeth-leipzig/shiftTypes.json](./st-elisabeth-leipzig/shiftTypes.json)
