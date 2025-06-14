/**
 * main.js
 * Zentrale Steuerung der App, verbindet alle Module.
 */

import { loadShiftTypes } from './src/shiftTypesLoader.js';
// import { shiftTypes, getPresetGroup, addShiftType, deleteShiftType, updateShiftType } from './shiftTypes.js';
import { initPDFLoad } from './pdfLoader.js';

import { parseTimeSheet, convertParsedEntriesToCSV } from './convert.js';
import { renderPreview } from './preview.js';
import { initGoogleCalendar } from './googleCalendar.js';


let shiftTypes = {};
let currentKrankenhaus = 'st-elisabeth-leipzig';

async function reloadShiftTypesAndUI() {
    try {
        shiftTypes = await loadShiftTypes(currentKrankenhaus);
        updatePresetOptions();
        renderShiftTypesList(updateCurrentShiftTypes());
    } catch (e) {
        alert('Fehler beim Laden der Schichttypen: ' + e.message);
    }
}

initPDFLoad({
    onPdfLoaded: (arrayBuffer, file) => {
        // PDF-Text extrahieren (mit pdf.js)
        window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise.then(async function(pdf) {
            let pdfText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                let pageText = '';
                // Versuche getText() (pdf.js >=3.0)
                if (typeof page.getText === 'function') {
                    try {
                        pageText = await page.getText();
                    } catch (e) {
                        pageText = '';
                    }
                }
                // Fallback: Zeilen aus getTextContent() rekonstruieren
                if (!pageText) {
                    const textContent = await page.getTextContent();
                    let lastY = null;
                    let line = [];
                    let lines = [];
                    textContent.items.forEach(item => {
                        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
                            lines.push(line.join(' '));
                            line = [];
                        }
                        line.push(item.str);
                        lastY = item.transform[5];
                    });
                    if (line.length) lines.push(line.join(' '));
                    pageText = lines.join('\n');
                }
                pdfText += (pdfText ? '\n' : '') + pageText;
            }
            // Debug: Zeige den extrahierten PDF-Text
            console.log('Extrahierter PDF-Text:\n', pdfText);

            // Get current dropdown values
            const professionSelect = document.getElementById('professionSelect');
            const bereichSelect = document.getElementById('bereichSelect');
            const presetSelect = document.getElementById('presetSelect');
            const profession = professionSelect ? professionSelect.value : '';
            const bereich = bereichSelect ? bereichSelect.value : '';
            const preset = presetSelect ? presetSelect.value : '';

            // Konvertierung
            const parsed = parseTimeSheet(pdfText, profession, bereich, preset, shiftTypes);
            const csv = convertParsedEntriesToCSV(parsed.entries);
            console.log('Konvertierte Einträge:', parsed.entries);
            console.log('CSV:', csv);

            // Einträge nach dem Parsen automatisch in localStorage speichern
            try {
                localStorage.setItem('parsedEntries', JSON.stringify(parsed.entries));
            } catch (e) {
                console.warn('Konnte parsedEntries nicht in localStorage speichern:', e);
            }

            // Vorschau aktualisieren
            renderPreview(parsed.entries);

            // Download-Button anzeigen und aktivieren
            const downloadBtn = document.getElementById('downloadBtn');
            if (downloadBtn) {
                downloadBtn.style.display = '';
                downloadBtn.disabled = false;
                // Remove previous click handlers
                downloadBtn.onclick = null;
                downloadBtn.onclick = function() {
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'dienstplan.csv';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 0);
                };
            }

            // Enable .ics export and Google sync buttons after conversion
            const icsExportBtn = document.getElementById('icsExportBtn');
            if (icsExportBtn) {
                icsExportBtn.disabled = false;
                icsExportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            const syncBtn = document.getElementById('syncBtn');
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    }
});

/**
 * Initialisierung der Schichttypen-Dropdowns und Vorschau
 */
function updatePresetOptions() {
    const professionSelect = document.getElementById('professionSelect');
    const bereichSelect = document.getElementById('bereichSelect');
    const presetSelect = document.getElementById('presetSelect');
    if (!professionSelect || !bereichSelect || !presetSelect) return;

    const profession = professionSelect.value;
    const bereich = bereichSelect.value;
    const typen = (shiftTypes[profession] && shiftTypes[profession][bereich]) ? shiftTypes[profession][bereich] : {};
    presetSelect.innerHTML = "";

    const typenKeys = Object.keys(typen);
    typenKeys.forEach(typ => {
        const opt = document.createElement("option");
        opt.value = typ;
        opt.textContent = typ.charAt(0).toUpperCase() + typ.slice(1);
        presetSelect.appendChild(opt);
    });

    if (typenKeys.includes("default")) {
        presetSelect.value = "default";
    } else if (typenKeys.length > 0) {
        presetSelect.value = typenKeys[0];
    }
}

function updateCurrentShiftTypes() {
    const professionSelect = document.getElementById('professionSelect');
    const bereichSelect = document.getElementById('bereichSelect');
    const presetSelect = document.getElementById('presetSelect');
    if (!professionSelect || !bereichSelect || !presetSelect) return {};

    const profession = professionSelect.value;
    const bereich = bereichSelect.value;
    const typ = presetSelect.value;
    if (
        shiftTypes[profession] &&
        shiftTypes[profession][bereich] &&
        shiftTypes[profession][bereich][typ]
    ) {
        return { ...shiftTypes[profession][bereich][typ] };
    } else {
        return {};
    }
}

function renderShiftTypesList(currentShiftTypes) {
    const shiftTypesList = document.getElementById('shiftTypesList');
    const previewDiv = document.getElementById('shiftTypesPreview');
    if (!shiftTypesList || !previewDiv) return;

    shiftTypesList.innerHTML = '';
    previewDiv.innerHTML = '';

    if (!currentShiftTypes || Object.keys(currentShiftTypes).length === 0) {
        previewDiv.innerHTML = '<div class="text-gray-400 italic">Keine Schichttypen für diese Auswahl vorhanden.</div>';
        return;
    }

    // Vorschau als Tabelle
    const table = document.createElement('table');
    table.className = "w-full text-sm mb-2";
    Object.entries(currentShiftTypes).forEach(([timeRange, code]) => {
        const [start, end] = timeRange.split('-');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="pr-2 font-bold">${code}</td>
            <td>${start}–${end}</td>
        `;
        table.appendChild(tr);
    });
    previewDiv.appendChild(table);
}

// Initialisierung beim Laden
window.addEventListener('DOMContentLoaded', () => {
    // Disable .ics export and Google sync buttons initially
    const icsExportBtn = document.getElementById('icsExportBtn');
    if (icsExportBtn) {
        icsExportBtn.disabled = true;
        icsExportBtn.classList.add('opacity-50', 'cursor-not-allowed');
        icsExportBtn.addEventListener('click', (e) => {
            const entries = JSON.parse(localStorage.getItem('parsedEntries') || '[]');
            if (!entries || entries.length === 0) {
                e.preventDefault();
                alert('Bitte zuerst einen Dienstplan konvertieren!');
            }
        });
    }
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.classList.add('opacity-50', 'cursor-not-allowed');
        syncBtn.addEventListener('click', (e) => {
            const entries = JSON.parse(localStorage.getItem('parsedEntries') || '[]');
            if (!entries || entries.length === 0) {
                e.preventDefault();
                alert('Bitte zuerst einen Dienstplan konvertieren!');
            }
        });
    }

    // Krankenhausauswahl initialisieren
    const krankenhausSelect = document.getElementById('krankenhausSelect');
    if (krankenhausSelect) {
        currentKrankenhaus = krankenhausSelect.value;
        krankenhausSelect.addEventListener('change', async () => {
            currentKrankenhaus = krankenhausSelect.value;
            await reloadShiftTypesAndUI();
        });
    }

    reloadShiftTypesAndUI();
    initGoogleCalendar(); // Initialize Google Calendar integration

    // Event-Listener für Dropdowns
    const professionSelect = document.getElementById('professionSelect');
    const bereichSelect = document.getElementById('bereichSelect');
    const presetSelect = document.getElementById('presetSelect');
    if (professionSelect) {
        professionSelect.addEventListener('change', () => {
            updatePresetOptions();
            renderShiftTypesList(updateCurrentShiftTypes());
        });
    }
    if (bereichSelect) {
        bereichSelect.addEventListener('change', () => {
            updatePresetOptions();
            renderShiftTypesList(updateCurrentShiftTypes());
        });
    }
    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            renderShiftTypesList(updateCurrentShiftTypes());
        });
    }

    // Help Modal öffnen/schließen
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');
    if (helpBtn && helpModal && closeHelpModal) {
        helpBtn.addEventListener('click', () => {
            helpModal.style.display = '';
        });
        closeHelpModal.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });
        // Schließen bei Klick auf Hintergrund
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.display = 'none';
            }
        });
    }

    // === Theme Switcher ===
    const themeBtns = [
        { id: 'themeLightBtn', theme: 'theme-light' },
        { id: 'themeDarkBtn', theme: 'theme-dark' },
        { id: 'themeSepiaBtn', theme: 'theme-sepia' }
    ];
    const body = document.body;

    function setTheme(theme) {
        // Entferne alle Theme-Klassen
        body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
        // Setze neue Theme-Klasse
        if (theme) body.classList.add(theme);
        // Speichere Auswahl
        localStorage.setItem('theme', theme);
    }

    // Theme aus localStorage beim Laden anwenden
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme('theme-light');
    }

    // Event-Listener für Theme-Buttons
    themeBtns.forEach(({ id, theme }) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => setTheme(theme));
        }
    });
});
