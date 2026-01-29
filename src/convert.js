/**
 * convert.js
 * Enthält die Logik zur Veredelung der geparsten Daten.
 * Verknüpft Rohdaten mit Mappings und führt Dienste zusammen.
 */

export function parseTimeSheet(pdfText, profession, bereich, preset, hospitalMapping, parserFn) {
    if (!parserFn) {
        throw new Error("Kein Parser-Funktion übergeben!");
    }

    // 1. Roh-Daten mit dem spezifischen Parser extrahieren
    const { year, month, mainEntries: rawMain, bereitschaftEntries: rawBereitschaft } = parserFn(pdfText);

    if (!year || !month) {
        return { entries: [], year: null, month: null };
    }

    const mapping = (hospitalMapping && hospitalMapping.presets && hospitalMapping.presets[preset]) || {};
    const finalEntries = [];
    
    // Hilfsfunktion für Datum +1
    function addDays(dateStr, days) {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    // --- Pass 2: Logik zur Schichterkennung und Zusammenführung ---
    const handledMainIndices = new Set();
    const handledBereitschaftIndices = new Set();

    // 2.1 Spezialdienste: Tagdienst + Bereitschaft (z.B. MO / Langdienst)
    for (let m = 0; m < rawMain.length; m++) {
        const mainEntry = rawMain[m];
        if (mainEntry.allDay) continue; // Urlaub/Feiertag ignorieren

        let chain = [mainEntry];
        let currentEnd = mainEntry.end;
        let currentDate = mainEntry.date;

        // Suche anschließende Bereitschaftsdienste
        for (let loop = 0; loop < 10; loop++) {
            let found = false;
            for (let b = 0; b < rawBereitschaft.length; b++) {
                if (handledBereitschaftIndices.has(b)) continue;
                const bEntry = rawBereitschaft[b];
                
                // Direkt am gleichen Tag anschließend
                if (bEntry.date === currentDate && bEntry.start === currentEnd) {
                    chain.push(bEntry);
                    currentEnd = bEntry.end;
                    handledBereitschaftIndices.add(b);
                    found = true;
                    break;
                }
                // Über Mitternacht (00:00)
                if (bEntry.start === '00:00' && bEntry.date === addDays(currentDate, 1) && currentEnd === '00:00') {
                    chain.push(bEntry);
                    currentEnd = bEntry.end;
                    currentDate = bEntry.date;
                    handledBereitschaftIndices.add(b);
                    found = true;
                    break;
                }
            }
            if (!found) break;
        }

        if (chain.length > 1) {
            // Kombinierter Dienst (z.B. MO)
            const timeKey = `${mainEntry.start}-${chain[chain.length - 1].end}`;
            const mappingValue = mapping[timeKey];
            
            let shiftType = mappingValue?.code || "MO"; // Fallback MO
            let isValidated = mappingValue?.isValidated || true;

            finalEntries.push({
                type: shiftType,
                date: mainEntry.date,
                start: mainEntry.start,
                end: chain[chain.length - 1].end,
                isValidated: isValidated
            });
            handledMainIndices.add(m);
        }
    }

    // 2.2 Normale Schichten verarbeiten
    for (let i = 0; i < rawMain.length; i++) {
        if (handledMainIndices.has(i)) continue;
        const entry = rawMain[i];

        if (entry.allDay) {
            finalEntries.push({ ...entry, isValidated: true });
            continue;
        }

        const timeKey = `${entry.start}-${entry.end}`;
        const mappingValue = mapping[timeKey];
        
        let shiftType = `⚠️ ${timeKey}`;
        let isValidated = false;

        if (typeof mappingValue === 'object') {
            shiftType = mappingValue.code;
            isValidated = !!mappingValue.isValidated;
        } else if (typeof mappingValue === 'string') {
            shiftType = mappingValue;
        }

        finalEntries.push({
            type: shiftType,
            date: entry.date,
            start: entry.start,
            end: entry.end,
            isValidated: isValidated
        });
    }

    // 2.3 Übrig gebliebene Bereitschaften
    for (let i = 0; i < rawBereitschaft.length; i++) {
        if (handledBereitschaftIndices.has(i)) continue;
        const item = rawBereitschaft[i];
        const timeKey = `${item.start}-${item.end}`;
        const mappingValue = mapping[timeKey];

        finalEntries.push({
            type: mappingValue?.code || `BEREIT_${timeKey}`,
            date: item.date,
            start: item.start,
            end: item.end,
            isValidated: !!mappingValue?.isValidated
        });
    }

    finalEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    return { entries: finalEntries, year, month };
}

export function convertParsedEntriesToCSV(entries) {
    let csv = "Datum,Code,Start,Ende\n";
    entries.forEach(entry => {
        let displayDate = entry.date || '';
        if (displayDate) {
            try {
                const dateObj = new Date(displayDate);
                displayDate = dateObj.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            } catch (e) {
                // Fallback auf Original
            }
        }
        if (entry.allDay) {
            csv += `${displayDate},${entry.type},,\n`;
        } else {
            csv += `${displayDate},${entry.type},${entry.start},${entry.end}\n`;
        }
    });
    return csv;
}
