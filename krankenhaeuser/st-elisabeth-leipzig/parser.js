/**
 * Spezifischer Parser für das St. Elisabeth Krankenhaus Leipzig.
 * Implementiert die Regex-Logik für deren PDF-Format.
 */
export function parseStElisabeth(text) {
    const lines = text.split('\n');
    const mainEntries = [];
    const bereitschaftEntries = [];
    let currentYear = '';
    let currentMonth = '';

    // Regex patterns spezifisch für St. Elisabeth
    const monthYearRegex = /Abrechnungsmonat\s+(\d{2})\/(\d{4})/;
    const shiftRegex = /^\s*(\d{2})\s+\w+\s+KO\*\s+(\d{2}:\d{2})\s+GE\*\s+(\d{2}:\d{2})/;
    const vacationRegex = /^\s*(\d{2})\s+\w+\s+(URLTV|URLAUB|U)/i;
    const krankRegex = /^\s*(\d{2})\s+\w+\s+(KRANK|K|KR)/i;
    const holidayRegex = /^\s*(\d{2})\s+\w+\*?\s+FEIER/i;
    const onCallBereitschaftRegex = /^\s*(\d{2}\.\d{2}\.\d{4})\s+.*?(\d{2}:\d{2})\s+(\d{2}:\d{2})/;
    const bereitSectioRegex = /Bereitschaftsdienste/;

    let inBereitschaftSection = false;

    for (const line of lines) {
        // Monat und Jahr finden
        if (!currentYear || !currentMonth) {
            const monthYearMatch = line.match(monthYearRegex);
            if (monthYearMatch) {
                currentMonth = monthYearMatch[1];
                currentYear = monthYearMatch[2];
            }
        }

        // Bereichswechsel zu Bereitschaftsdiensten
        if (bereitSectioRegex.test(line)) {
            inBereitschaftSection = true;
            continue;
        }

        if (inBereitschaftSection) {
            const onCallMatch = line.match(onCallBereitschaftRegex);
            if (onCallMatch) {
                const [_, dateStr, startTime, endTime] = onCallMatch;
                const [day, month, year] = dateStr.split('.');
                const fullDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                bereitschaftEntries.push({ date: fullDate, start: startTime, end: endTime });
            }
        } else {
            const shiftMatch = line.match(shiftRegex);
            const vacationMatch = line.match(vacationRegex);
            const krankMatch = line.match(krankRegex);
            const holidayMatch = line.match(holidayRegex);

            if (shiftMatch && currentYear && currentMonth) {
                const [_, day, startTime, endTime] = shiftMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ 
                    date: date, 
                    start: startTime, 
                    end: endTime,
                    isWork: true 
                });
            } else if (vacationMatch && currentYear && currentMonth) {
                const [_, day] = vacationMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'URLAUB', date: date, allDay: true, isSpecial: true });
            } else if (krankMatch && currentYear && currentMonth) {
                const [_, day] = krankMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'KRANK', date: date, allDay: true, isSpecial: true });
            } else if (holidayMatch && currentYear && currentMonth) {
                const [_, day] = holidayMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'FEIERTAG', date: date, allDay: true, isSpecial: true });
            }
        }
    }

    return {
        year: currentYear,
        month: currentMonth,
        mainEntries,
        bereitschaftEntries
    };
}
