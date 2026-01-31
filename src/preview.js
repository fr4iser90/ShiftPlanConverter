import { loadSpecialShiftTypes } from './shiftTypesLoader.js';

/**
 * preview.js
 * Stellt die konvertierten Dienstplan-Einträge als Vorschau im UI dar.
 * Exportiert renderPreview(entries).
 */

export async function renderPreview(entries, currentMapping = null, currentPreset = 'standard') {
    const previewContent = document.getElementById('previewContent');
    if (!previewContent) return;

    // Check for missing shifts (shifts not in mapping)
    updateMissingShiftsUI(entries, currentMapping, currentPreset);

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
    // Lade Sonder-Schichttypen
    const specialShiftTypes = await loadSpecialShiftTypes();

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
        
        // Mark unknown shifts
        const isUnknown = entry.isWork && !entry.type;
        const typeDisplay = isUnknown ? '<span class="text-red-500 font-bold">?</span>' : (entry.type || '');
        
        // Farbe für den Code ermitteln
        const colors = JSON.parse(localStorage.getItem('shiftColors') || '{}');
        
        // Finde den passenden Code für Spezialtypen (z.B. URLAUB -> U)
        let resolvedCode = entry.type;
        if (currentMapping && currentPreset) {
            const presetData = currentMapping.presets[currentPreset] || {};
            const specialKey = `SPECIAL:${entry.type}`;
            if (presetData[specialKey]) {
                resolvedCode = typeof presetData[specialKey] === 'object' ? presetData[specialKey].code : presetData[specialKey];
            }
        }

        const codeColor = colors[resolvedCode] || colors[entry.type] || '';
        
        // Sonder-Schichttypen Fallback-Farbe (falls nichts im Mapping/LocalStorage)
        const specialType = specialShiftTypes[entry.type];
        const specialColor = specialType ? specialType.color : '';
        
        // Priorität: 1. LocalStorage/Mapping (deine Farbe), 2. Sonderfarbe, 3. Standard
        const finalColor = codeColor || specialColor || '';
        const dotHtml = finalColor ? `<div class="w-2 h-2 rounded-full inline-block mr-2" style="background-color: ${finalColor}"></div>` : '';

        html += `
            <tr>
                <td class="border px-2 py-1">${displayDate}</td>
                <td class="border px-2 py-1 text-center font-bold" style="color: ${finalColor}">
                    ${dotHtml}${typeDisplay}
                </td>
                <td class="border px-2 py-1">${entry.allDay ? '<span class="text-[10px] text-gray-400 uppercase tracking-widest">Ganztägig</span>' : (entry.start || '')}</td>
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

/**
 * Findet Schichten, die im PDF stehen, aber nicht im Mapping sind
 */
function updateMissingShiftsUI(entries, mapping, preset) {
    const container = document.getElementById('missingShiftsContainer');
    const list = document.getElementById('missingShiftsList');
    if (!container || !list) return;

    if (!entries || !mapping) {
        container.style.display = 'none';
        return;
    }

    const presetData = mapping.presets[preset] || {};
    const missingShifts = new Set();

    entries.forEach(entry => {
        if (entry.isWork && entry.start && entry.end) {
            const timeRange = `${entry.start}-${entry.end}`;
            if (!presetData[timeRange]) {
                missingShifts.add(timeRange);
            }
        }
    });

    if (missingShifts.size > 0) {
        list.innerHTML = '';
        missingShifts.forEach(shift => {
            const badge = document.createElement('div');
            badge.className = 'bg-white border border-yellow-400 text-yellow-800 px-2 py-1 rounded text-xs font-mono shadow-sm flex items-center gap-2';
            badge.innerHTML = `<span>${shift}</span> <span class="opacity-50">→ ?</span>`;
            list.appendChild(badge);
        });
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}
