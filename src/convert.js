/**
 * convert.js
 * Enrich parsed PDF data with mappings; route Zeitabrechnung vs code-grid.
 */

import { normalizeMapping, resolvePresetTable } from './mappingNormalize.js';
import { looksLikeCodeGrid, parsePdfCodeGrid } from './parsers/codeGrid.bundle.js';

/**
 * Structural code-grid signals (independent of whether the active mapping
 * recognizes the printed duty codes).
 */
export function isCodeGridShell(pdfText, pdfConfig) {
    const t = String(pdfText || '');
    if (!t.trim()) return false;
    const cg = pdfConfig?.codeGrid;
    if (!cg) return false;
    if (cg.rejectPatterns?.some((p) => {
        try { return new RegExp(p, 'i').test(t); } catch { return false; }
    })) return false;
    if (cg.requirePatterns?.length && !cg.requirePatterns.every((p) => {
        try { return new RegExp(p, 'i').test(t); } catch { return false; }
    })) return false;
    if (!/[A-Za-zÄÖÜäöüß]{2,},\s*[A-Za-zÄÖÜäöüß]/.test(t)) return false;
    return true;
}

function codeGridDepartmentHint(pdfText) {
    const t = String(pdfText || '');
    if (/Anästhesie|Anaesthesie/i.test(t) && /Ärzte|Aerzte/i.test(t)) {
        return 'Ärzte → OP · Anästhesie';
    }
    if (/ATA|OTA|OP-Pflege|Pflege/i.test(t) && /Mandant/i.test(t)) {
        return 'Pflege → passenden OP-Bereich';
    }
    return 'passende Berufsgruppe / Bereich';
}

/**
 * @param {string} pdfText
 * @param {string} profession
 * @param {string} bereich
 * @param {string} preset
 * @param {object|null} hospitalMapping
 * @param {Function|null} parserFn - Zeitabrechnung parser
 * @param {{ pdfConfig?: object|null, personFilter?: string|null }} [opts]
 */
export function parseTimeSheet(pdfText, profession, bereich, preset, hospitalMapping, parserFn, opts = {}) {
    const mapping = normalizeMapping(hospitalMapping);
    const pdfConfig = opts.pdfConfig || null;
    const personFilter = opts.personFilter || null;
    const shell = isCodeGridShell(pdfText, pdfConfig);
    const deptHint = codeGridDepartmentHint(pdfText);

    if (mapping && looksLikeCodeGrid(pdfText, pdfConfig, mapping, preset || undefined)) {
        let grid = parsePdfCodeGrid(pdfText, pdfConfig, {
            mapping,
            preset: preset || 'default',
            personFilter,
        });
        let entries = [...(grid.mainEntries || [])].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );
        const people = Array.isArray(grid.people) ? grid.people : [];
        let hint = null;

        if (grid.personPickRequired && people.length > 1) {
                hint =
                    `Codeplan mit ${people.length} Personen erkannt — bitte deinen Namen in der Liste wählen.`;
        } else if (!entries.length && personFilter) {
            grid = parsePdfCodeGrid(pdfText, pdfConfig, {
                mapping,
                preset: preset || 'default',
                personFilter: null,
            });
            const allPeople = Array.isArray(grid.people) ? grid.people : [];
            const all = [...(grid.mainEntries || [])];
            if (allPeople.length > 1 || all.length) {
                hint =
                    `Codeplan: für „${personFilter}“ keine Treffer. ` +
                    `Namen aus der Liste wählen oder Schreibweise prüfen — oder ${deptHint}.`;
            } else {
                hint =
                    `Codeplan erkannt, aber mit aktuellem Mapping keine auswertbaren Kürzel. Bitte ${deptHint} wählen.`;
            }
            entries = [];
            return {
                entries,
                year: grid.year || null,
                month: grid.month || null,
                summary: null,
                summaries: [],
                source: 'code-grid',
                hint,
                people: allPeople.length ? allPeople : people,
                personPickRequired: allPeople.length > 1,
            };
        } else if (!entries.length) {
            hint =
                `Codeplan erkannt, aber mit aktuellem Mapping keine Schichten. Bitte ${deptHint} wählen.`;
        }
        return {
            entries,
            year: grid.year || null,
            month: grid.month || null,
            summary: null,
            summaries: [],
            source: 'code-grid',
            hint,
            people,
            personPickRequired: !!grid.personPickRequired,
        };
    }

    if (shell) {
        return {
            entries: [],
            year: null,
            month: null,
            summary: null,
            summaries: [],
            source: 'code-grid',
            hint:
                `Abteilungs-Codeplan erkannt (Mandant / Namenszeilen), aber das aktuelle Mapping passt nicht ` +
                `(Dienstkürzel werden nicht erkannt). Bitte ${deptHint} wählen` +
                (personFilter ? ` und „Mein Name“ prüfen („${personFilter}“).` : '.'),
            people: [],
            personPickRequired: false,
        };
    }

    if (!parserFn) {
        throw new Error('Kein Parser-Funktion übergeben!');
    }

    const {
        year,
        month,
        mainEntries: rawMain,
        bereitschaftEntries: rawBereitschaft,
        summary = null,
        summaries = null,
    } = parserFn(pdfText);

    if (!year || !month) {
        return { entries: [], year: null, month: null, summary: null, summaries: [], source: 'zeitabrechnung' };
    }

    const table = resolvePresetTable(mapping, preset);

    const specialCodes = {};
    Object.entries(table).forEach(([key, value]) => {
        if (key.startsWith('SPECIAL:')) {
            const code = typeof value === 'object' ? value.code : value;
            specialCodes[code] = true;
        }
    });

    const finalEntries = [];

    function addDays(dateStr, days) {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    const handledMainIndices = new Set();
    const handledBereitschaftIndices = new Set();

    for (let m = 0; m < rawMain.length; m++) {
        const mainEntry = rawMain[m];
        if (mainEntry.allDay) continue;

        let chain = [mainEntry];
        let currentEnd = mainEntry.end;
        let currentDate = mainEntry.date;

        for (let loop = 0; loop < 10; loop++) {
            let found = false;
            for (let b = 0; b < rawBereitschaft.length; b++) {
                if (handledBereitschaftIndices.has(b)) continue;
                const bEntry = rawBereitschaft[b];

                if (bEntry.date === currentDate && bEntry.start === currentEnd) {
                    chain.push(bEntry);
                    currentEnd = bEntry.end;
                    handledBereitschaftIndices.add(b);
                    found = true;
                    break;
                }
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
            const timeKey = `${mainEntry.start}-${chain[chain.length - 1].end}`;
            const mappingValue = table[timeKey];

            let shiftType = mappingValue?.code || 'MO';
            let isValidated = mappingValue?.isValidated || true;

            finalEntries.push({
                type: shiftType,
                date: mainEntry.date,
                start: mainEntry.start,
                end: chain[chain.length - 1].end,
                isValidated: isValidated,
                ...pickDayDetails(mainEntry),
                ...pickBereitschaftDetails(chain.slice(1)),
            });
            handledMainIndices.add(m);
        }
    }

    for (let i = 0; i < rawMain.length; i++) {
        if (handledMainIndices.has(i)) continue;
        const entry = rawMain[i];

        if (entry.allDay) {
            finalEntries.push({ ...entry, isValidated: true });
            continue;
        }

        const timeKey = `${entry.start}-${entry.end}`;
        const mappingValue = table[timeKey];

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
            isValidated: isValidated,
            ...pickDayDetails(entry),
        });
    }

    for (let i = 0; i < rawBereitschaft.length; i++) {
        if (handledBereitschaftIndices.has(i)) continue;
        const item = rawBereitschaft[i];
        const timeKey = `${item.start}-${item.end}`;
        const mappingValue = table[timeKey];

        finalEntries.push({
            type: mappingValue?.code || `BEREIT_${timeKey}`,
            date: item.date,
            start: item.start,
            end: item.end,
            isValidated: !!mappingValue?.isValidated,
            ...pickDayDetails(item),
            ...(item.bereitPercent != null ? { bereitPercent: item.bereitPercent } : {}),
            ...(item.bewertet != null ? { bewertet: item.bewertet } : {}),
        });
    }

    finalEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    const allSummaries = Array.isArray(summaries) && summaries.length
        ? summaries
        : (summary ? [summary] : []);
    return {
        entries: finalEntries,
        year,
        month,
        summary: allSummaries[allSummaries.length - 1] || null,
        summaries: allSummaries,
        source: 'zeitabrechnung',
    };
}

function pickDayDetails(entry) {
    const details = {};
    if (entry.pause != null) details.pause = entry.pause;
    if (entry.ist != null) details.ist = entry.ist;
    if (entry.azkDaily != null) details.azkDaily = entry.azkDaily;
    if (entry.pepSoll != null) details.pepSoll = entry.pepSoll;
    if (entry.vertrSoll != null) details.vertrSoll = entry.vertrSoll;
    return details;
}

function pickBereitschaftDetails(chainParts) {
    const withMeta = chainParts.find(p => p.bereitPercent != null || p.bewertet != null);
    if (!withMeta) return {};
    const details = {};
    if (withMeta.bereitPercent != null) details.bereitPercent = withMeta.bereitPercent;
    if (withMeta.bewertet != null) details.bewertet = withMeta.bewertet;
    return details;
}

export function convertParsedEntriesToCSV(entries) {
    let csv = 'Datum,Code,Start,Ende\n';
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
                // Fallback
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
