/**
 * icsExport.js
 * Generates and downloads an .ics (iCalendar) file from parsed shift entries in localStorage.
 * Compatible with Nextcloud, Outlook, Apple Calendar, Thunderbird, etc.
 */

export function exportToICS(filename = "dienstplan.ics") {
    const entries = JSON.parse(localStorage.getItem('parsedEntries') || '[]');
    if (!entries || entries.length === 0) {
        alert('Keine Einträge zum Exportieren gefunden.');
        return;
    }

    function pad(n) { return n < 10 ? '0' + n : n; }

    function formatDateTime(date, time) {
        // date: YYYY-MM-DD, time: HH:MM
        if (!time) return date.replace(/-/g, '') + 'T000000';
        return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
    }

    function escapeICalText(text) {
        return (text || '').replace(/\\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    }

    let ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ShiftPlanConverter//DE',
        'CALSCALE:GREGORIAN'
    ];

    for (const entry of entries) {
        let start = entry.allDay
            ? formatDateTime(entry.date)
            : formatDateTime(entry.date, entry.start);
        let endDate = entry.date;
        if (!entry.allDay && entry.start && entry.end && entry.end < entry.start) {
            // Endzeit < Startzeit: Event geht über Mitternacht
            const d = new Date(entry.date);
            d.setDate(d.getDate() + 1);
            endDate = d.toISOString().split('T')[0];
        }
        let end = entry.allDay
            ? formatDateTime(entry.date) // All-day: same day, but mark as all-day
            : formatDateTime(endDate, entry.end);

        let uid = [
            entry.date,
            entry.type,
            entry.start || '',
            entry.end || '',
            Math.random().toString(36).slice(2, 10)
        ].join('-').replace(/\s/g, '');

        ics.push('BEGIN:VEVENT');
        ics.push('UID:' + uid + '@shiftplan');
        ics.push('SUMMARY:' + escapeICalText(entry.type));
        ics.push('DESCRIPTION:' + escapeICalText('Automatisch importiert aus Dienstplan – keine Gewähr.'));
        if (entry.allDay) {
            ics.push('DTSTART;VALUE=DATE:' + entry.date.replace(/-/g, ''));
            ics.push('DTEND;VALUE=DATE:' + entry.date.replace(/-/g, ''));
        } else {
            ics.push('DTSTART;TZID=Europe/Berlin:' + start);
            ics.push('DTEND;TZID=Europe/Berlin:' + end);
        }
        ics.push('END:VEVENT');
    }

    ics.push('END:VCALENDAR');

    const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}
