/**
 * main.js
 * Zentrale Steuerung der App, verbindet alle Module.
 */

import { loadHospitalConfig, loadMapping } from './shiftTypesLoader.js';
import { initPDFLoad } from './pdfLoader.js';
import { parseTimeSheet, convertParsedEntriesToCSV } from './convert.js';
import { renderPreview } from './preview.js';
import { initGoogleCalendar } from './calendar/providers/google.js';
import { exportToICS } from './calendar/icsGenerator.js';

let currentHospitalConfig = null;
let currentMapping = null;
let currentKrankenhaus = 'st-elisabeth-leipzig';
const MAINTAINER_EMAIL = 'pa.boe90@gmail.com';
let isEditMode = false;
let lastRawText = "";

/**
 * Hilfsfunktionen für Schichtfarben
 */
function getShiftColors() {
    const stored = localStorage.getItem('shiftColors');
    const storedColors = stored ? JSON.parse(stored) : {};
    
    const mappingColors = currentMapping?.colors || {};
    
    return {
        'N': '#ef4444', 
        'F': '#22c55e', 
        'S': '#eab308', 
        'M': '#3b82f6', 
        ...mappingColors,
        ...storedColors
    };
}

function saveShiftColor(code, color) {
    const stored = localStorage.getItem('shiftColors');
    const colors = stored ? JSON.parse(stored) : {};
    colors[code] = color;
    localStorage.setItem('shiftColors', JSON.stringify(colors));
    renderShiftTypesList(getCurrentShiftTypes());
}

/**
 * User-spezifische Mappings im LocalStorage verwalten
 */
function getUserMappingKey() {
    const professionSelect = document.getElementById('professionSelect');
    const bereichSelect = document.getElementById('bereichSelect');
    if (!professionSelect || !bereichSelect) return null;
    return `mapping_${currentKrankenhaus}_${professionSelect.value}_${bereichSelect.value}`;
}

function saveUserMapping(presets) {
    const key = getUserMappingKey();
    if (key) {
        localStorage.setItem(key, JSON.stringify(presets));
    }
}

function getUserMapping() {
    const key = getUserMappingKey();
    if (key) {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }
    return null;
}

async function reloadHospitalAndUI() {
    try {
        console.log("Initialisiere Krankenhaus:", currentKrankenhaus);
        currentHospitalConfig = await loadHospitalConfig(currentKrankenhaus);
        updateGroupOptions();
        
        // WICHTIG: Event-Listener für Dropdowns sicherstellen
        setupDropdownListeners();
        
        await updateAreaOptions();
        await updatePresetOptions();
        renderShiftTypesList(getCurrentShiftTypes());
    } catch (e) {
        console.error('Fehler beim Initialisieren:', e);
    }
}

function setupDropdownListeners() {
    const professionSelect = document.getElementById('professionSelect');
    const bereichSelect = document.getElementById('bereichSelect');
    const presetSelect = document.getElementById('presetSelect');

    // Entferne alte Listener falls vorhanden (durch Klonen)
    const newProfessionSelect = professionSelect.cloneNode(true);
    professionSelect.parentNode.replaceChild(newProfessionSelect, professionSelect);
    
    const newBereichSelect = bereichSelect.cloneNode(true);
    bereichSelect.parentNode.replaceChild(newBereichSelect, bereichSelect);

    newProfessionSelect.addEventListener('change', async () => {
        console.log("Berufsgruppe geändert:", newProfessionSelect.value);
        await updateAreaOptions();
        await updatePresetOptions();
        renderShiftTypesList(getCurrentShiftTypes());
    });

    newBereichSelect.addEventListener('change', async () => {
        console.log("Bereich geändert:", newBereichSelect.value);
        await loadCurrentMapping();
        await updatePresetOptions();
        renderShiftTypesList(getCurrentShiftTypes());
    });

    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            renderShiftTypesList(getCurrentShiftTypes());
        });
    }
}

function updateGroupOptions() {
    const professionSelect = document.getElementById('professionSelect');
    if (!professionSelect || !currentHospitalConfig) return;

    professionSelect.innerHTML = '';
    currentHospitalConfig.groups.forEach(group => {
        const opt = document.createElement('option');
        opt.value = group.id;
        opt.textContent = group.label;
        professionSelect.appendChild(opt);
    });
}

async function updateAreaOptions() {
    const professionSelect = document.getElementById('professionSelect');
    const bereichSelect = document.getElementById('bereichSelect');
    if (!professionSelect || !bereichSelect || !currentHospitalConfig) return;

    const groupId = professionSelect.value;
    const group = currentHospitalConfig.groups.find(g => g.id === groupId);
    
    bereichSelect.innerHTML = '';
    if (group && group.areas) {
        group.areas.forEach(area => {
            const opt = document.createElement('option');
            opt.value = area.id;
            opt.textContent = area.label;
            bereichSelect.appendChild(opt);
        });
    }

    await loadCurrentMapping();
}

async function loadCurrentMapping() {
    const professionSelect = document.getElementById('professionSelect');
    const bereichSelect = document.getElementById('bereichSelect');
    if (!professionSelect || !bereichSelect || !currentHospitalConfig) return;

    const groupId = professionSelect.value;
    const areaId = bereichSelect.value;
    const group = currentHospitalConfig.groups.find(g => g.id === groupId);
    const area = group?.areas.find(a => a.id === areaId);

    if (area && area.mapping) {
        try {
            const baseMapping = await loadMapping(currentKrankenhaus, area.mapping);
            const userPresets = getUserMapping();
            
            currentMapping = {
                ...baseMapping,
                presets: userPresets || baseMapping.presets
            };
        } catch (e) {
            console.error('Fehler beim Laden des Mappings:', e);
            currentMapping = null;
        }
    } else {
        currentMapping = null;
    }
}

async function updatePresetOptions() {
    const presetSelect = document.getElementById('presetSelect');
    if (!presetSelect) return;

    presetSelect.innerHTML = '';
    if (!currentMapping || !currentMapping.presets) return;

    const presets = Object.keys(currentMapping.presets);
    presets.forEach(preset => {
        const opt = document.createElement('option');
        opt.value = preset;
        opt.textContent = preset.charAt(0).toUpperCase() + preset.slice(1);
        presetSelect.appendChild(opt);
    });

    if (presets.includes('standard')) {
        presetSelect.value = 'standard';
    } else if (presets.length > 0) {
        presetSelect.value = presets[0];
    }
}

function getCurrentShiftTypes() {
    const presetSelect = document.getElementById('presetSelect');
    if (!presetSelect || !currentMapping || !currentMapping.presets) return {};

    const preset = presetSelect.value;
    return currentMapping.presets[preset] || {};
}

function renderShiftTypesList(currentShiftTypes) {
    const previewDiv = document.getElementById('shiftTypesPreview');
    if (!previewDiv) return;

    previewDiv.innerHTML = '';

    const colors = getShiftColors();
    const editBtn = document.getElementById('editShiftTypesBtn');
    
    if (isEditMode) {
        editBtn.textContent = 'Speichern';
        editBtn.classList.replace('bg-gray-200', 'bg-green-500');
        editBtn.classList.replace('text-gray-700', 'text-white');
        
        const container = document.createElement('div');
        container.className = "space-y-2";
        
        Object.entries(currentShiftTypes).forEach(([timeRange, value]) => {
            const code = typeof value === 'object' ? value.code : value;
            const row = document.createElement('div');
            row.className = "flex items-center gap-2 bg-gray-50 p-1 rounded border";
            row.innerHTML = `
                <input type="text" class="edit-time w-24 text-xs border rounded px-1" value="${timeRange}">
                <input type="text" class="edit-code w-12 text-xs border rounded px-1 font-bold" value="${code}">
                <input type="color" class="w-6 h-6 p-0 border-none bg-transparent cursor-pointer" value="${colors[code] || '#3b82f6'}">
                <button class="delete-shift text-red-500 hover:text-red-700 px-1">✕</button>
            `;
            
            const timeInput = row.querySelector('.edit-time');
            const codeInput = row.querySelector('.edit-code');
            const colorPicker = row.querySelector('input[type="color"]');
            const deleteBtn = row.querySelector('.delete-shift');
            
            const updateLocal = () => {
                const newTime = timeInput.value;
                const newCode = codeInput.value;
                if (newTime !== timeRange) {
                    delete currentShiftTypes[timeRange];
                    currentShiftTypes[newTime] = typeof value === 'object' ? { ...value, code: newCode } : newCode;
                } else {
                    if (typeof value === 'object') value.code = newCode;
                    else currentShiftTypes[timeRange] = newCode;
                }
                saveShiftColor(newCode, colorPicker.value);
            };

            timeInput.addEventListener('change', updateLocal);
            codeInput.addEventListener('change', updateLocal);
            colorPicker.addEventListener('change', (e) => saveShiftColor(codeInput.value, e.target.value));
            deleteBtn.addEventListener('click', () => {
                delete currentShiftTypes[timeRange];
                renderShiftTypesList(currentShiftTypes);
            });
            
            container.appendChild(row);
        });
        
        const addBtn = document.createElement('button');
        addBtn.className = "w-full mt-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 border-dashed rounded hover:bg-blue-100";
        addBtn.textContent = "+ Neue Schicht hinzufügen";
        addBtn.onclick = () => {
            currentShiftTypes["00:00-00:00"] = { code: "NEW", isValidated: false };
            renderShiftTypesList(currentShiftTypes);
        };
        
        container.appendChild(addBtn);
        previewDiv.appendChild(container);
    } else {
        editBtn.textContent = 'Bearbeiten';
        editBtn.classList.replace('bg-green-500', 'bg-gray-200');
        editBtn.classList.replace('text-white', 'text-gray-700');

        if (!currentShiftTypes || Object.keys(currentShiftTypes).length === 0) {
            previewDiv.innerHTML = '<div class="text-gray-400 italic">Keine Schichttypen vorhanden.</div>';
            return;
        }

        const table = document.createElement('table');
        table.className = "w-full text-sm mb-2";
        Object.entries(currentShiftTypes).forEach(([timeRange, value]) => {
            const [start, end] = timeRange.split('-');
            const code = typeof value === 'object' ? value.code : value;
            const isValidated = typeof value === 'object' ? !!value.isValidated : false;
            const color = colors[code] || '#3b82f6';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="w-8 py-1">
                    <div class="w-4 h-4 rounded-full" style="background-color: ${color}"></div>
                </td>
                <td class="pr-2 font-bold" style="color: ${color}">
                    ${code}
                    ${isValidated ? '<span title="Validiert" class="ml-1 text-blue-500">✓</span>' : ''}
                </td>
                <td>${start}–${end}</td>
            `;
            table.appendChild(tr);
        });
        previewDiv.appendChild(table);
    }
}

initPDFLoad({
    onPdfLoaded: (arrayBuffer, file) => {
        window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise.then(async function(pdf) {
            let pdfText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                let pageText = '';
                if (typeof page.getText === 'function') {
                    try { pageText = await page.getText(); } catch (e) { pageText = ''; }
                }
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

            // Debug-Daten speichern
            lastRawText = pdfText;
            const rawTextOutput = document.getElementById('rawTextOutput');
            if (rawTextOutput) rawTextOutput.textContent = pdfText;
            const debugArea = document.getElementById('debugArea');
            if (debugArea) debugArea.style.display = 'block';

            const presetSelect = document.getElementById('presetSelect');
            const preset = presetSelect ? presetSelect.value : '';

            const legacyFormatShiftTypes = {}; 
            const profession = document.getElementById('professionSelect')?.value;
            const bereich = document.getElementById('bereichSelect')?.value;
            
            if (profession && bereich && currentMapping) {
                legacyFormatShiftTypes[profession] = { [bereich]: currentMapping.presets };
            }

            const parsed = parseTimeSheet(pdfText, profession, bereich, preset, legacyFormatShiftTypes);
            const csv = convertParsedEntriesToCSV(parsed.entries);

            try {
                localStorage.setItem('parsedEntries', JSON.stringify(parsed.entries));
            } catch (e) {
                console.warn('Konnte parsedEntries nicht in localStorage speichern:', e);
            }

            renderPreview(parsed.entries);

            const downloadBtn = document.getElementById('downloadBtn');
            if (downloadBtn) {
                downloadBtn.style.display = '';
                downloadBtn.disabled = false;
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

            ['icsExportBtn', 'syncBtn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            });
        });
    }
});

window.addEventListener('DOMContentLoaded', () => {
    // Debug-Buttons initialisieren
    const anonymizeBtn = document.getElementById('anonymizeBtn');
    if (anonymizeBtn) {
        anonymizeBtn.addEventListener('click', () => {
            let anonymized = lastRawText
                // 1. Adressblöcke (Herrn/Frau + Name + Straße + PLZ/Ort)
                .replace(/(Herrn|Frau)[\s\S]{1,100}?\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+/g, "[ADRESSE ANONYMISIERT]")
                
                // 2. Spezifische Header-Daten
                .replace(/Personalschlüssel\s+\S+/g, "Personalschlüssel [ANONYMISIERT]")
                .replace(/Kostenstelle\s+\d+/g, "Kostenstelle [ANONYMISIERT]")
                
                // 3. Namen am Zeilenanfang (Vor- und Nachname)
                .replace(/^[A-ZÄÖÜ][a-zäöüß]+(\s+[A-ZÄÖÜ][a-zäöüß]+){1,2}$/gm, "[NAME ANONYMISIERT]")
                
                // 4. Straßennamen (Straße + Hausnummer)
                .replace(/[A-ZÄÖÜ][a-zäöüß]+-?\s*str\.\s*\d+/gi, "[STRASSE ANONYMISIERT]")
                .replace(/[A-ZÄÖÜ][a-zäöüß]+\s*Straße\s*\d+/gi, "[STRASSE ANONYMISIERT]")
                
                // 5. Alle verbleibenden langen Zahlenketten (IDs, Telefonnummern, etc.)
                .replace(/\d{5,}/g, "[ZAHL ANONYMISIERT]");
            
            document.getElementById('rawTextOutput').textContent = anonymized;
            
            // E-Mail Button anzeigen
            const sendBtn = document.getElementById('sendToMaintainerBtn');
            if (sendBtn) {
                sendBtn.style.display = 'inline-flex';
            }
            
            alert("Sicherheits-Filter angewendet! Bitte prüfe den Text trotzdem kurz auf verbliebene private Daten.");
        });
    }

    const sendToMaintainerBtn = document.getElementById('sendToMaintainerBtn');
    if (sendToMaintainerBtn) {
        sendToMaintainerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const content = document.getElementById('rawTextOutput').textContent;
            const subject = encodeURIComponent("Dienstplan-Struktur Spende");
            const body = encodeURIComponent("Hallo,\n\nhier ist die anonymisierte Struktur meines Dienstplans zur Verbesserung des Parsers:\n\n---\n" + content + "\n---");
            window.location.href = `mailto:${MAINTAINER_EMAIL}?subject=${subject}&body=${body}`;
        });
    }

    const clearDebugBtn = document.getElementById('clearDebugBtn');
    if (clearDebugBtn) {
        clearDebugBtn.addEventListener('click', () => {
            lastRawText = "";
            document.getElementById('rawTextOutput').textContent = "";
            document.getElementById('debugArea').style.display = 'none';
            alert("Analyse-Daten wurden aus dem Speicher gelöscht.");
        });
    }

    const downloadDebugBtn = document.getElementById('downloadDebugBtn');
    if (downloadDebugBtn) {
        downloadDebugBtn.addEventListener('click', () => {
            const content = document.getElementById('rawTextOutput').textContent;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'debug_info.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    const editBtn = document.getElementById('editShiftTypesBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (isEditMode) {
                saveUserMapping(currentMapping.presets);
            }
            isEditMode = !isEditMode;
            renderShiftTypesList(getCurrentShiftTypes());
        });
    }

    ['icsExportBtn', 'syncBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btn.addEventListener('click', (e) => {
                const entries = JSON.parse(localStorage.getItem('parsedEntries') || '[]');
                if (!entries || entries.length === 0) {
                    e.preventDefault();
                    alert('Bitte zuerst einen Dienstplan konvertieren!');
                } else if (id === 'icsExportBtn') {
                    exportToICS(entries);
                }
            });
        }
    });

    const krankenhausSelect = document.getElementById('krankenhausSelect');
    if (krankenhausSelect) {
        currentKrankenhaus = krankenhausSelect.value;
        krankenhausSelect.addEventListener('change', async () => {
            currentKrankenhaus = krankenhausSelect.value;
            await reloadHospitalAndUI();
        });
    }

    const professionSelect = document.getElementById('professionSelect');
    const bereichSelect = document.getElementById('bereichSelect');
    const presetSelect = document.getElementById('presetSelect');

    if (professionSelect) {
        professionSelect.addEventListener('change', async () => {
            await updateAreaOptions();
            await updatePresetOptions();
            renderShiftTypesList(getCurrentShiftTypes());
        });
    }
    if (bereichSelect) {
        bereichSelect.addEventListener('change', async () => {
            await loadCurrentMapping();
            await updatePresetOptions();
            renderShiftTypesList(getCurrentShiftTypes());
        });
    }
    reloadHospitalAndUI();
    initGoogleCalendar();

    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');
    if (helpBtn && helpModal && closeHelpModal) {
        helpBtn.addEventListener('click', () => helpModal.style.display = '');
        closeHelpModal.addEventListener('click', () => helpModal.style.display = 'none');
        helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.style.display = 'none'; });
    }

    const body = document.body;
    function setTheme(theme) {
        body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
        if (theme) body.classList.add(theme);
        localStorage.setItem('theme', theme);
    }
    const savedTheme = localStorage.getItem('theme') || 'theme-light';
    setTheme(savedTheme);

    ['themeLightBtn', 'themeDarkBtn', 'themeSepiaBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const theme = id.replace('Btn', '').replace('theme', 'theme-').toLowerCase();
            btn.addEventListener('click', () => setTheme(theme));
        }
    });
});
