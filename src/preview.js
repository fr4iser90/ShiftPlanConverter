/**
 * preview.js
 * Stellt die konvertierten Dienstplan-Einträge als Vorschau im UI dar.
 * Exportiert renderPreview(entries).
 */

export function renderPreview(entries) {
    const previewContent = document.getElementById('previewContent');
    if (!previewContent) return;

    if (!entries || entries.length === 0) {
        previewContent.innerHTML = '<div class="text-gray-400 italic">Keine Einträge vorhanden.</div>';
        return;
    }

    // Tabelle mit Datum, Code, Start, Ende
    let html = `
        <table class="w-full text-sm border border-gray-300 bg-white">
            <thead>
                <tr>
                    <th class="border px-2 py-1">Datum</th>
                    <th class="border px-2 py-1">Code</th>
                    <th class="border px-2 py-1">Start</th>
                    <th class="border px-2 py-1">Ende</th>
                </tr>
            </thead>
            <tbody>
    `;
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
                console.error("Fehler beim Formatieren des Datums:", e);
            }
        }
        html += `
            <tr>
                <td class="border px-2 py-1">${displayDate}</td>
                <td class="border px-2 py-1">${entry.type || ''}</td>
                <td class="border px-2 py-1">${entry.allDay ? '' : (entry.start || '')}</td>
                <td class="border px-2 py-1">${entry.allDay ? '' : (entry.end || '')}</td>
            </tr>
        `;
    });
    html += `
            </tbody>
        </table>
    `;
    previewContent.innerHTML = html;
}
