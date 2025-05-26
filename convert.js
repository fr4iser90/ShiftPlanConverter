/**
 * convert.js
 * Enthält die Parsing- und Konvertierungslogik für den Dienstplan.
 * Exportiert parseTimeSheet und convertParsedEntriesToCSV.
 */

// --- 1:1 Übernahme der robusten Logik aus deinem alten Script ---

import { shiftTypes } from './shiftTypes.js';

export function parseTimeSheet(pdfData, profession, bereich, preset) {
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
                    shiftTypes[profession] &&
                    shiftTypes[profession][bereich] &&
                    shiftTypes[profession][bereich][preset]
                ) {
                    mapping = shiftTypes[profession][bereich][preset];
                }
                const shiftType = mapping[timeKey] || `⚠️ ${timeKey}`;
                mainEntries.push({ type: shiftType, date: date, start: startTime, end: endTime });
            } else if (vacationMatch && currentYear && currentMonth) {
                const [_, day] = vacationMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'URLAUB', date: date, allDay: true });
            } else if (holidayMatch && currentYear && currentMonth) {
                const [_, day] = holidayMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'FEIERTAG', date: date, allDay: true });
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

    // Prioritize finding B38 pairs and merging with M3
    for (let i = 0; i < bereitschaftEntries.length; i++) {
        if (handledBereitschaftIndices.has(i)) continue;

        const item1 = bereitschaftEntries[i];

        // Look for B38 start (19:50 - 00:00)
        if (item1.start === '19:50' && item1.end === '00:00') {
            // Search for the corresponding end part (00:00 - 07:35 on the next day)
            for (let j = 0; j < bereitschaftEntries.length; j++) {
                if (i === j || handledBereitschaftIndices.has(j)) continue;

                const item2 = bereitschaftEntries[j];
                if (item2.start === '00:00' && item2.end === '07:35') {
                    // Check if dates are consecutive
                    const startDateObj = new Date(item1.date);
                    startDateObj.setDate(startDateObj.getDate() + 1);
                    const endDateCheckObj = new Date(item2.date);

                    if (startDateObj.toISOString().split('T')[0] === endDateCheckObj.toISOString().split('T')[0]) {
                        // B38 pair found. Check for preceding M3.
                        let merged = false;
                        for (let m = 0; m < mainEntries.length; m++) {
                            if (handledMainIndices.has(m)) continue;
                            const mainEntry = mainEntries[m];
                            if (mainEntry.type === 'M3' && mainEntry.date === item1.date) {
                                // Merge found! Create MO entry.
                                finalEntries.push({
                                    type: 'MO',
                                    date: item1.date,
                                    start: '11:35',
                                    end: '07:35'
                                });
                                handledMainIndices.add(m);
                                handledBereitschaftIndices.add(i);
                                handledBereitschaftIndices.add(j);
                                merged = true;
                                break;
                            }
                        }

                        if (!merged) {
                            // No M3 found, create separate B38 entry
                            finalEntries.push({
                                type: 'B38',
                                date: item1.date,
                                start: '19:50',
                                end: '07:35'
                            });
                            handledBereitschaftIndices.add(i);
                            handledBereitschaftIndices.add(j);
                        }
                        break;
                    }
                }
            }
        }
    }

    // Add any unhandled main entries
    for (let i = 0; i < mainEntries.length; i++) {
        if (!handledMainIndices.has(i)) {
            finalEntries.push(mainEntries[i]);
        }
    }

    // Add any unhandled Bereitschaft entries (e.g., B36 or orphaned parts)
    for (let i = 0; i < bereitschaftEntries.length; i++) {
        if (!handledBereitschaftIndices.has(i)) {
            const item = bereitschaftEntries[i];
            if (item.start === '07:35' && item.end === '19:35') {
                finalEntries.push({
                    type: 'B36',
                    date: item.date,
                    start: item.start,
                    end: item.end
                });
            } else {
                finalEntries.push({
                    type: `BEREIT_${item.start}-${item.end}`,
                    date: item.date,
                    start: item.start,
                    end: item.end
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
