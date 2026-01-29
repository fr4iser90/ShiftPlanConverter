/**
 * convert.js
 * Enthält die Parsing- und Konvertierungslogik für den Dienstplan.
 * Exportiert parseTimeSheet und convertParsedEntriesToCSV.
 */

// --- 1:1 Übernahme der robusten Logik aus deinem alten Script ---

export function parseTimeSheet(pdfData, profession, bereich, preset, shiftTypes) {
    // pdfData kann {text: ...} oder ein String sein
    const text = typeof pdfData === 'string' ? pdfData : (pdfData && pdfData.text ? pdfData.text : '');
    const lines = text.split('\n');
    const mainEntries = [];
    const bereitschaftEntries = [];
    let currentYear = '';
    let currentMonth = '';

    // Regex patterns (tolerant, wie im alten Script)
    const monthYearRegex = /Abrechnungsmonat\s+(\d{2})\/(\d{4})/;
    const shiftRegex = /^\s*(\d{2})\s+\w+\s+KO\*\s+(\d{2}:\d{2})\s+GE\*\s+(\d{2}:\d{2})/;
    const vacationRegex = /^\s*(\d{2})\s+\w+\s+URLTV/;
    const holidayRegex = /^\s*(\d{2})\s+\w+\*?\s+FEIER/;
    const onCallBereitschaftRegex = /^\s*(\d{2}\.\d{2}\.\d{4})\s+.*?(\d{2}:\d{2})\s+(\d{2}:\d{2})/;
    const bereitSectioRegex = /Bereitschaftsdienste/;

    let inBereitschaftSection = false;

    // --- Pass 1: Extract month/year and populate initial lists ---
    for (const line of lines) {
        // Find month and year first
        if (!currentYear || !currentMonth) {
            const monthYearMatch = line.match(monthYearRegex);
            if (monthYearMatch) {
                currentMonth = monthYearMatch[1];
                currentYear = monthYearMatch[2];
            }
        }

        // Check for section change
        if (bereitSectioRegex.test(line)) {
            inBereitschaftSection = true;
            continue;
        }

        if (inBereitschaftSection) {
            const onCallMatch = line.match(onCallBereitschaftRegex);
            if (onCallMatch) {
                const [_, dateStr, startTime, endTime] = onCallMatch;
                const [day, month, year] = dateStr.split('.');
                const entryYear = year;
                const fullDate = `${entryYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                bereitschaftEntries.push({ date: fullDate, start: startTime, end: endTime });
            }
        } else {
            // Process main time log section (before Bereitschaftsdienste)
            const shiftMatch = line.match(shiftRegex);
            const vacationMatch = line.match(vacationRegex);
            const holidayMatch = line.match(holidayRegex);

            if (shiftMatch && currentYear && currentMonth) {
                const [_, day, startTime, endTime] = shiftMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                const timeKey = `${startTime}-${endTime}`;
                let mapping = {};
                if (
                    shiftTypes &&
                    shiftTypes[profession] &&
                    shiftTypes[profession][bereich] &&
                    shiftTypes[profession][bereich][preset]
                ) {
                    mapping = shiftTypes[profession][bereich][preset];
                }
                
                // Unterstützung für String- oder Objekt-Mappings
                const mappingValue = mapping[timeKey];
                let shiftType = `⚠️ ${timeKey}`;
                let isValidated = false;

                if (typeof mappingValue === 'object' && mappingValue !== null) {
                    shiftType = mappingValue.code || shiftType;
                    isValidated = !!mappingValue.isValidated;
                } else if (typeof mappingValue === 'string') {
                    shiftType = mappingValue;
                }

                mainEntries.push({ 
                    type: shiftType, 
                    date: date, 
                    start: startTime, 
                    end: endTime,
                    isValidated: isValidated
                });
            } else if (vacationMatch && currentYear && currentMonth) {
                const [_, day] = vacationMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'URLAUB', date: date, allDay: true, isValidated: true });
            } else if (holidayMatch && currentYear && currentMonth) {
                const [_, day] = holidayMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'FEIERTAG', date: date, allDay: true, isValidated: true });
            }
        }
    }

    if (!currentYear || !currentMonth) {
        return { entries: [], year: null, month: null };
    }

    // --- Pass 2: Process entries, handle merges, and build final list ---
    const finalEntries = [];
    const handledMainIndices = new Set();
    const handledBereitschaftIndices = new Set();

    // Dynamische Spezialdienst-Erkennung: Tagdienst + beliebig viele Bereitschaftsdienste kombinieren
    for (let m = 0; m < mainEntries.length; m++) {
        if (handledMainIndices.has(m)) continue;
        const mainEntry = mainEntries[m];

        // Suche Bereitschaftsdienste, die direkt an den Tagdienst anschließen (am selben Tag)
        let chain = [mainEntry];
        let currentEnd = mainEntry.end;
        let currentDate = mainEntry.date;

        // Suche alle Bereitschaftsdienste, die direkt anschließen (auch über Mitternacht)
        for (let loop = 0; loop < 10; loop++) { // max 10er-Kette, Schutz vor Endlosschleife
            let found = false;
            for (let b = 0; b < bereitschaftEntries.length; b++) {
                if (handledBereitschaftIndices.has(b)) continue;
                const bEntry = bereitschaftEntries[b];
                if (bEntry.date === currentDate && bEntry.start === currentEnd) {
                    chain.push(bEntry);
                    currentEnd = bEntry.end;
                    handledBereitschaftIndices.add(b);
                    found = true;
                    break;
                }
                // Über Mitternacht: Bereitschaft endet 00:00, nächster Block am Folgetag mit 00:00
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
            // Kombinierter Spezialdienst (MO, Langdienst, etc.)
            finalEntries.push({
                type: 'MO',
                date: mainEntry.date,
                start: mainEntry.start,
                end: chain[chain.length - 1].end,
                isValidated: true // Spezialdienste wie MO sind meist validiert
            });
            handledMainIndices.add(m);
        }
    }

    // Hilfsfunktion für Datum +1
    function addDays(dateStr, days) {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    // Add any unhandled main entries
    for (let i = 0; i < mainEntries.length; i++) {
        if (!handledMainIndices.has(i)) {
            finalEntries.push(mainEntries[i]);
        }
    }

    // Add any unhandled Bereitschaft entries
    for (let i = 0; i < bereitschaftEntries.length; i++) {
        if (!handledBereitschaftIndices.has(i)) {
            const item = bereitschaftEntries[i];
            if (item.start === '07:35' && item.end === '19:35') {
                finalEntries.push({
                    type: 'B36',
                    date: item.date,
                    start: item.start,
                    end: item.end,
                    isValidated: true
                });
            } else {
                finalEntries.push({
                    type: `BEREIT_${item.start}-${item.end}`,
                    date: item.date,
                    start: item.start,
                    end: item.end,
                    isValidated: false
                });
            }
            handledBereitschaftIndices.add(i);
        }
    }

    // Sort final entries by date
    finalEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    return { entries: finalEntries, year: currentYear, month: currentMonth };
}

// Konvertiert Einträge in CSV
export function convertParsedEntriesToCSV(entries) {
    let csv = "Code,Start,Ende\n";
    entries.forEach(entry => {
        if (entry.allDay) {
            csv += `${entry.type},,\n`;
        } else {
            csv += `${entry.type},${entry.start},${entry.end}\n`;
        }
    });
    return csv;
}
