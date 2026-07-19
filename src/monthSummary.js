/**
 * Monatsübersicht (AZK / Saldo) aus Zeitabrechnung.
 * Extrahiert unabhängig vom Schicht-Parser direkt aus dem PDF-Rohtext.
 */

const PREF_SHOW = 'prefShowMonthSummary';
const PREF_RICH = 'prefRichEventDetails';
const STORAGE_SUMMARIES = 'monthSummaries';

const MONTH_RE = /Abrechnungsmonat\s+(\d{2})\/(\d{4})/gi;
const UEBERTRAG_VON_RE = /U[\u0308\u00a8]?bertrag\s+aus\s+Vormonat\s+([+-]?[\d,]+)|Übertrag\s+aus\s+Vormonat\s+([+-]?[\d,]+)|Uebertrag\s+aus\s+Vormonat\s+([+-]?[\d,]+)/gi;
const UEBERTRAG_NACH_RE = /U[\u0308\u00a8]?bertrag\s+in\s+Folgemonat\s+([+-]?[\d,]+)|Übertrag\s+in\s+Folgemonat\s+([+-]?[\d,]+)|Uebertrag\s+in\s+Folgemonat\s+([+-]?[\d,]+)/gi;
const PERIODE_RE = /Periode\s*\([^)]+\)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([+-]?[\d,]+)/gi;
const AUSZAHLUNG_RE = /Bereitschaft\s+zur\s+Auszahlung\s+([+-]?[\d,]+)/gi;
const BEREIT_AZK_RE = /Bereitschaft\s+in\s+das\s+AZK\s+([+-]?[\d,]+)/gi;

export function isRichEventDetailsEnabled() {
    return localStorage.getItem(PREF_RICH) === '1';
}

export function isMonthSummaryEnabled() {
    return localStorage.getItem(PREF_SHOW) !== '0'; // default: an
}

export function initOptionalDataPrefs() {
    const showChk = document.getElementById('showMonthSummaryChk');
    const richChk = document.getElementById('richEventDetailsChk');

    if (showChk) {
        showChk.checked = isMonthSummaryEnabled();
        showChk.addEventListener('change', () => {
            localStorage.setItem(PREF_SHOW, showChk.checked ? '1' : '0');
            renderMonthSummariesFromStorage();
        });
    }

    if (richChk) {
        richChk.checked = isRichEventDetailsEnabled();
        richChk.addEventListener('change', () => {
            localStorage.setItem(PREF_RICH, richChk.checked ? '1' : '0');
        });
        if (localStorage.getItem(PREF_RICH) === null) {
            richChk.checked = false;
        }
    }
}

/**
 * Liest Monatsübersichten direkt aus dem PDF-Rohtext (auch bei mehreren PDFs).
 * @param {string} rawText
 * @returns {object[]}
 */
export function extractMonthSummariesFromText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const text = rawText.normalize('NFC');

    // Abschnitte grob nach Datei-Trenner oder Abrechnungsmonat splitten
    const chunks = [];
    const fileSplit = text.split(/\n---\s+[^\n]+---\s*\n/);
    for (const part of fileSplit) {
        if (!part.trim()) continue;
        // Ein PDF kann mehrere Seiten mit gleichem Monat haben → ein Chunk pro Monat
        const monthHits = [...part.matchAll(new RegExp(MONTH_RE.source, 'gi'))];
        if (monthHits.length <= 1) {
            chunks.push(part);
            continue;
        }
        // Nur beim ersten Vorkommen eines neuen Monats splitten
        let lastIdx = 0;
        let lastKey = null;
        for (const hit of monthHits) {
            const key = `${hit[1]}/${hit[2]}`;
            if (lastKey && key !== lastKey) {
                chunks.push(part.slice(lastIdx, hit.index));
                lastIdx = hit.index;
            }
            if (!lastKey) lastIdx = hit.index;
            lastKey = key;
        }
        chunks.push(part.slice(lastIdx));
    }

    const summaries = [];
    for (const chunk of chunks) {
        const s = parseSummaryChunk(chunk);
        if (s && hasUsefulSummary(s)) summaries.push(s);
    }

    // Fallback: gesamter Text als ein Block, falls Chunking nichts fand
    if (summaries.length === 0) {
        const s = parseSummaryChunk(text);
        if (s && hasUsefulSummary(s)) summaries.push(s);
    }

    summaries.sort((a, b) => {
        const ya = Number(a.year) || 0;
        const yb = Number(b.year) || 0;
        if (ya !== yb) return ya - yb;
        return (Number(a.month) || 0) - (Number(b.month) || 0);
    });

    return summaries;
}

function parseSummaryChunk(chunk) {
    const text = chunk.normalize('NFC');
    const monthMatch = text.match(/Abrechnungsmonat\s+(\d{2})\/(\d{4})/i);

    const pick = (re) => {
        re.lastIndex = 0;
        const m = re.exec(text);
        if (!m) return null;
        return m[1] || m[2] || m[3] || null;
    };

    const periodeRe = /Periode\s*\([^)]+\)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([+-]?[\d,]+)/i;
    const periode = text.match(periodeRe);

    const summary = {
        month: monthMatch ? monthMatch[1] : null,
        year: monthMatch ? monthMatch[2] : null,
        uebertragVormonat: pick(UEBERTRAG_VON_RE),
        uebertragFolgemonat: pick(UEBERTRAG_NACH_RE),
        periodePepSoll: periode ? periode[1] : null,
        periodeVertrSoll: periode ? periode[2] : null,
        periodeIst: periode ? periode[3] : null,
        periodeSaldo: periode ? periode[4] : null,
        bereitschaftAuszahlung: pick(AUSZAHLUNG_RE),
        bereitschaftAzk: pick(BEREIT_AZK_RE),
    };

    return summary;
}

export function saveMonthSummaries(summaries) {
    const list = (summaries || []).filter(Boolean);
    localStorage.setItem(STORAGE_SUMMARIES, JSON.stringify(list));
    renderMonthSummariesFromStorage();
}

export function renderMonthSummariesFromStorage() {
    let summaries = [];
    try {
        summaries = JSON.parse(localStorage.getItem(STORAGE_SUMMARIES) || '[]');
    } catch (e) {
        summaries = [];
    }
    renderMonthSummaries(summaries);
}

/**
 * @param {Array<object|null>} summaries
 */
export function renderMonthSummaries(summaries) {
    const card = document.getElementById('monthSummaryCard');
    if (!card) return;

    const enabled = isMonthSummaryEnabled();
    const list = (summaries || []).filter(s => s && hasUsefulSummary(s));

    if (!enabled) {
        card.style.display = 'none';
        card.innerHTML = '';
        return;
    }

    card.style.display = '';
    card.innerHTML = '';

    if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500';
        empty.textContent = 'Keine Monatsdaten (Übertrag / AZK / Saldo) in den geladenen PDFs gefunden. Checkbox an lassen und PDF erneut laden – oder PDF enthält diese Zeilen nicht.';
        card.appendChild(empty);
        return;
    }

    list.forEach((summary) => {
        card.appendChild(buildSummaryBlock(summary));
    });
}

function hasUsefulSummary(s) {
    return !!(
        s.uebertragVormonat ||
        s.uebertragFolgemonat ||
        s.periodeIst ||
        s.periodeSaldo ||
        s.bereitschaftAuszahlung ||
        s.bereitschaftAzk
    );
}

function buildSummaryBlock(summary) {
    const wrap = document.createElement('div');
    wrap.className = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm';

    const title = document.createElement('h3');
    title.className = 'text-sm font-semibold text-gray-800 mb-3';
    const label = summary.month && summary.year
        ? `Monatsübersicht ${summary.month}/${summary.year}`
        : 'Monatsübersicht';
    title.textContent = label;
    wrap.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm';

    const rows = [
        ['Übertrag Vormonat', summary.uebertragVormonat],
        ['Übertrag Folgemonat', summary.uebertragFolgemonat],
        ['Ist (Periode)', summary.periodeIst],
        ['Saldo Periode', summary.periodeSaldo, true],
        ['Bereitschaft Auszahlung', summary.bereitschaftAuszahlung],
        ['Bereitschaft → AZK', summary.bereitschaftAzk],
    ];

    rows.forEach(([name, value, emphasize]) => {
        if (value == null || value === '') return;
        const cell = document.createElement('div');
        cell.className = 'flex flex-col';
        const k = document.createElement('span');
        k.className = 'text-[10px] uppercase tracking-wide text-gray-400';
        k.textContent = name;
        const v = document.createElement('span');
        v.className = emphasize
            ? `font-semibold ${String(value).trim().startsWith('-') ? 'text-red-600' : 'text-green-700'}`
            : 'font-medium text-gray-800';
        v.textContent = value;
        cell.appendChild(k);
        cell.appendChild(v);
        grid.appendChild(cell);
    });

    wrap.appendChild(grid);

    const hint = document.createElement('p');
    hint.className = 'mt-3 text-[11px] text-gray-400';
    hint.textContent = 'Nur Anzeige – wird nicht in den Kalender geschrieben.';
    wrap.appendChild(hint);

    return wrap;
}
