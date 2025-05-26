/**
 * shiftTypes.js
 * Enthält alle Schichttypen, Presets und zugehörige Editierfunktionen.
 */

// Schichttypen-Objekt
export const shiftTypes = {
    pflege: {
        op: {
            default: {
                "07:35-15:50": "F",
                "08:30-16:45": "F1",
                "09:00-17:15": "F2",
                "09:30-17:45": "F3",
                "10:00-18:15": "M1",
                "11:00-19:15": "M2",
                "11:35-19:50": "M3",
                "07:35-19:35": "B36",
                "19:50-07:35": "B38",
                "11:35-07:35": "MO"
            },
            anasthesie: {
                "07:35-15:50": "F",
                "08:30-16:45": "F1",
                "09:00-17:15": "F2",
                "09:30-17:45": "F3",
                "10:00-18:15": "M1",
                "11:00-19:15": "M2",
                "11:35-19:50": "M3",
                "07:35-19:35": "B36",
                "19:50-07:35": "B38",
                "11:35-07:35": "MO"
            },
            ota: {
                "07:00-15:30": "F",
                "07:30-16:00": "F1",
                "08:00-16:30": "F2",
                "08:30-17:00": "F3",
                "09:00-17:30": "M1",
                "10:00-18:30": "M2",
                "11:00-19:30": "M3",
                "07:00-19:00": "B36",
                "19:00-07:00": "B38",
                "11:00-07:00": "MO",
                "08:00-20:00": "OP",
                "20:00-08:00": "OP-N"
            }
        },
        station1: {
            default: {
                "06:00-14:00": "F",
                "13:30-21:30": "S",
                "21:00-06:30": "N"
            }
        }
        // Weitere Bereiche und Typen für Pflege...
    },
    aerzte: {
        op: {
            default: {
                "07:00-15:00": "A",
                "15:00-23:00": "B",
                "23:00-07:00": "C"
            }
        }
        // Weitere Bereiche und Typen für Ärzte...
    }
    // Weitere Berufsgruppen...
};

// Hilfsfunktion: Bereich zu Preset-Gruppe
export function getPresetGroup(bereich) {
    if (bereich && bereich.startsWith("station")) return "station";
    return "op";
}

// Editierfunktionen für Schichttypen (können von main.js/preview.js genutzt werden)
export function addShiftType(shiftTypesObj, group, area, preset, timeRange, code) {
    if (!shiftTypesObj[group]) shiftTypesObj[group] = {};
    if (!shiftTypesObj[group][area]) shiftTypesObj[group][area] = {};
    if (!shiftTypesObj[group][area][preset]) shiftTypesObj[group][area][preset] = {};
    shiftTypesObj[group][area][preset][timeRange] = code;
}

export function deleteShiftType(shiftTypesObj, group, area, preset, timeRange) {
    if (
        shiftTypesObj[group] &&
        shiftTypesObj[group][area] &&
        shiftTypesObj[group][area][preset] &&
        shiftTypesObj[group][area][preset][timeRange]
    ) {
        delete shiftTypesObj[group][area][preset][timeRange];
    }
}

export function updateShiftType(shiftTypesObj, group, area, preset, oldTimeRange, newTimeRange, newCode) {
    if (
        shiftTypesObj[group] &&
        shiftTypesObj[group][area] &&
        shiftTypesObj[group][area][preset] &&
        shiftTypesObj[group][area][preset][oldTimeRange]
    ) {
        delete shiftTypesObj[group][area][preset][oldTimeRange];
        shiftTypesObj[group][area][preset][newTimeRange] = newCode;
    }
}
