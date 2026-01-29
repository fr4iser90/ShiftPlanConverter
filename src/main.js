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
    
    const allColors = {
        'N': '#ef4444', 
        'F': '#22c55e', 
        'S': '#eab308', 
        'M': '#3b82f6', 
        ...mappingColors,
        ...storedColors
    };

    // WICHTIG: Synchronisiere allColors zurück in den localStorage, 
    // damit andere Module (wie Google Sync) darauf zugreifen können.
    localStorage.setItem('shiftColors', JSON.stringify(allColors));
    
    return allColors;
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
    // Wir geben immer null zurück, damit die Struktur IMMER frisch aus den JSONs geladen wird.
    // Das verhindert Cache-Probleme bei Änderungen an der Krankenhaus-Struktur.
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

    if (!professionSelect || !bereichSelect) return;

    const handleChange = async (e) => {
        console.log("Dropdown geändert:", e.target.id, e.target.value);
        if (e.target.id === 'professionSelect') {
            await updateAreaOptions();
            await updatePresetOptions();
        } else if (e.target.id === 'bereichSelect') {
            await loadCurrentMapping();
            await updatePresetOptions();
        }
        renderShiftTypesList(getCurrentShiftTypes());
    };

    professionSelect.onchange = handleChange;
    professionSelect.oninput = handleChange;
    
    bereichSelect.onchange = handleChange;
    bereichSelect.oninput = handleChange;

    if (presetSelect) {
        presetSelect.onchange = () => renderShiftTypesList(getCurrentShiftTypes());
    }
}

function updateGroupOptions() {
    const professionSelect = document.getElementById('professionSelect');
    if (!professionSelect || !currentHospitalConfig) return;

    professionSelect.innerHTML = '';
    currentHospitalConfig.groups.forEach(group => {
        const opt = document.createElement('option');
        opt.value = group.id;
        opt.textContent = group.label || group.id;
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
            
            // Google Event Colors Palette
            const googleColors = {
                "1": "#a4bdfc", "2": "#7ae7bf", "3": "#dbadff", "4": "#ff887c",
                "5": "#fbd75b", "6": "#ffb878", "7": "#46d6db", "8": "#e1e1e1",
                "9": "#5484ed", "10": "#51b749", "11": "#dc2127"
            };
            
            const currentColor = colors[code] || '#3b82f6';
            
            row.innerHTML = `
                <input type="text" class="edit-time w-24 text-xs border rounded px-1" value="${timeRange}">
                <input type="text" class="edit-code w-12 text-xs border rounded px-1 font-bold" value="${code}">
                <div class="flex items-center gap-1 flex-1 overflow-x-auto pb-1">
                    ${Object.entries(googleColors).map(([id, hex]) => `
                        <button type="button" 
                                class="color-swatch w-5 h-5 rounded-full border-2 ${currentColor.toLowerCase() === hex.toLowerCase() ? 'border-black' : 'border-transparent'}" 
                                style="background-color: ${hex}" 
                                data-color="${hex}" 
                                title="Google Color ${id}">
                        </button>
                    `).join('')}
                    <input type="color" class="w-5 h-5 p-0 border-none bg-transparent cursor-pointer ml-1" value="${currentColor}" title="Custom Hex">
                </div>
                <button class="delete-shift text-red-500 hover:text-red-700 px-1">✕</button>
            `;
            
            const timeInput = row.querySelector('.edit-time');
            const codeInput = row.querySelector('.edit-code');
            const colorPicker = row.querySelector('input[type="color"]');
            const swatches = row.querySelectorAll('.color-swatch');
            const deleteBtn = row.querySelector('.delete-shift');
            
            const updateLocal = (newColor) => {
                const newTime = timeInput.value;
                const newCode = codeInput.value;
                if (newTime !== timeRange) {
                    delete currentShiftTypes[timeRange];
                    currentShiftTypes[newTime] = typeof value === 'object' ? { ...value, code: newCode } : newCode;
                } else {
                    if (typeof value === 'object') value.code = newCode;
                    else currentShiftTypes[timeRange] = newCode;
                }
                saveShiftColor(newCode, newColor || colorPicker.value);
            };

            timeInput.addEventListener('change', () => updateLocal());
            codeInput.addEventListener('change', () => updateLocal());
            colorPicker.addEventListener('change', (e) => updateLocal(e.target.value));
            
            swatches.forEach(swatch => {
                swatch.addEventListener('click', () => {
                    swatches.forEach(s => s.classList.replace('border-black', 'border-transparent'));
                    swatch.classList.replace('border-transparent', 'border-black');
                    updateLocal(swatch.dataset.color);
                });
            });

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
        const previewContent = document.getElementById('previewContent');
        if (previewContent) {
            previewContent.innerHTML = '<div class="flex items-center gap-2 text-blue-600"><span class="animate-spin">⏳</span> PDF wird analysiert...</div>';
        }

        window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise.then(async function(pdf) {
            let pdfText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                let pageText = '';
                try {
                    const textContent = await page.getTextContent();
                    if (textContent.items.length > 0) {
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
                } catch (e) {
                    console.warn('Fehler bei Extraktion auf Seite ' + pageNum, e);
                }
                pdfText += (pdfText ? '\n' : '') + pageText;
            }

            if (!pdfText.trim()) {
                alert("Fehler: Es konnte kein Text aus dem PDF gelesen werden.");
                if (previewContent) previewContent.innerHTML = '<div class="text-red-500">Fehler: PDF leer oder Bild.</div>';
                return;
            }

            lastRawText = pdfText;
            const rawTextOutput = document.getElementById('rawTextOutput');
            if (rawTextOutput) rawTextOutput.textContent = pdfText;
            const debugArea = document.getElementById('debugArea');
            if (debugArea) debugArea.style.display = 'block';

            const presetSelect = document.getElementById('presetSelect');
            const preset = presetSelect ? presetSelect.value : '';
            const profession = document.getElementById('professionSelect')?.value;
            const bereich = document.getElementById('bereichSelect')?.value;
            
            const legacyFormatShiftTypes = {}; 
            if (profession && bereich && currentMapping) {
                legacyFormatShiftTypes[profession] = { [bereich]: currentMapping.presets };
            }

            const parsed = parseTimeSheet(pdfText, profession, bereich, preset, legacyFormatShiftTypes);
            localStorage.setItem('parsedEntries', JSON.stringify(parsed.entries));
            renderPreview(parsed.entries);

            ['icsExportBtn', 'downloadBtn', 'syncBtn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                    btn.onclick = (e) => {
                        const entries = JSON.parse(localStorage.getItem('parsedEntries') || '[]');
                        if (!entries || entries.length === 0) {
                            e.preventDefault();
                            alert('Bitte zuerst einen Dienstplan konvertieren!');
                        } else if (id === 'icsExportBtn') {
                            exportToICS();
                        } else if (id === 'downloadBtn') {
                            const csv = convertParsedEntriesToCSV(entries);
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
                        }
                    };
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
                .replace(/(Herrn|Frau)[\s\S]{1,100}?\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+/g, "[ADRESSE ANONYMISIERT]")
                .replace(/Personalschlüssel\s+\S+/g, "Personalschlüssel [ANONYMISIERT]")
                .replace(/Kostenstelle\s+\d+/g, "Kostenstelle [ANONYMISIERT]")
                .replace(/^[A-ZÄÖÜ][a-zäöüß]+(\s+[A-ZÄÖÜ][a-zäöüß]+){1,2}$/gm, "[NAME ANONYMISIERT]")
                .replace(/[A-ZÄÖÜ][a-zäöüß]+-?\s*str\.\s*\d+/gi, "[STRASSE ANONYMISIERT]")
                .replace(/[A-ZÄÖÜ][a-zäöüß]+\s*Straße\s*\d+/gi, "[STRASSE ANONYMISIERT]")
                .replace(/\d{5,}/g, "[ZAHL ANONYMISIERT]");
            
            document.getElementById('rawTextOutput').textContent = anonymized;
            const sendBtn = document.getElementById('sendToMaintainerBtn');
            const copyBtn = document.getElementById('copyToClipboardBtn');
            if (sendBtn) sendBtn.style.display = 'inline-flex';
            if (copyBtn) copyBtn.style.display = 'inline-flex';
            alert("Sicherheits-Filter angewendet!");
        });
    }

    const copyToClipboardBtn = document.getElementById('copyToClipboardBtn');
    if (copyToClipboardBtn) {
        copyToClipboardBtn.addEventListener('click', () => {
            const content = document.getElementById('rawTextOutput').textContent;
            navigator.clipboard.writeText(content).then(() => {
                const originalText = copyToClipboardBtn.innerHTML;
                copyToClipboardBtn.innerHTML = '<span>Kopiert!</span>';
                setTimeout(() => { copyToClipboardBtn.innerHTML = originalText; }, 2000);
            });
        });
    }

    const sendToMaintainerBtn = document.getElementById('sendToMaintainerBtn');
    if (sendToMaintainerBtn) {
        sendToMaintainerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const content = document.getElementById('rawTextOutput').textContent;
            const subject = encodeURIComponent("Dienstplan-Struktur [ShiftPlanConverter]");
            const body = encodeURIComponent("Hallo,\n\nhier ist die anonymisierte Struktur meines Dienstplans:\n\n---\n" + content + "\n---");
            window.location.href = `mailto:${MAINTAINER_EMAIL}?subject=${subject}&body=${body}`;
        });
    }

    const editBtn = document.getElementById('editShiftTypesBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (isEditMode) saveUserMapping(currentMapping.presets);
            isEditMode = !isEditMode;
            renderShiftTypesList(getCurrentShiftTypes());
        });
    }

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

    const handleProfessionChange = async () => {
        await updateAreaOptions();
        await updatePresetOptions();
        renderShiftTypesList(getCurrentShiftTypes());
    };

    const handleBereichChange = async () => {
        await loadCurrentMapping();
        await updatePresetOptions();
        renderShiftTypesList(getCurrentShiftTypes());
    };

    if (professionSelect) {
        professionSelect.addEventListener('change', handleProfessionChange);
        professionSelect.addEventListener('input', handleProfessionChange);
    }
    if (bereichSelect) {
        bereichSelect.addEventListener('change', handleBereichChange);
        bereichSelect.addEventListener('input', handleBereichChange);
    }
    if (presetSelect) {
        presetSelect.addEventListener('change', () => renderShiftTypesList(getCurrentShiftTypes()));
    }

    reloadHospitalAndUI();
    initGoogleCalendar();

    // Hilfe-Modal Logik
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');
    if (helpBtn && helpModal && closeHelpModal) {
        helpBtn.addEventListener('click', () => helpModal.style.display = '');
        closeHelpModal.addEventListener('click', () => helpModal.style.display = 'none');
        helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.style.display = 'none'; });
    }

    // Tab-Logic
    const tabs = {
        'Google': { tab: document.getElementById('tabGoogle'), content: document.getElementById('contentGoogle') },
        'Outlook': { tab: document.getElementById('tabOutlook'), content: document.getElementById('contentOutlook') },
        'Apple': { tab: document.getElementById('tabApple'), content: document.getElementById('contentApple') }
    };

    Object.entries(tabs).forEach(([name, elements]) => {
        if (elements.tab) {
            elements.tab.addEventListener('click', () => {
                Object.values(tabs).forEach(e => {
                    if (e.tab && e.content) {
                        e.tab.classList.remove('bg-white', 'text-blue-600', 'font-bold');
                        e.tab.classList.add('bg-gray-50', 'text-gray-500', 'font-medium');
                        e.content.classList.add('hidden');
                    }
                });
                elements.tab.classList.remove('bg-gray-50', 'text-gray-500', 'font-medium');
                elements.tab.classList.add('bg-white', 'text-blue-600', 'font-bold');
                elements.content.classList.remove('hidden');
            });
        }
    });

    const body = document.body;
    function setTheme(theme) {
        body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
        if (theme) body.classList.add(theme);
        localStorage.setItem('theme', theme);
    }
    setTheme(localStorage.getItem('theme') || 'theme-light');

    ['themeLightBtn', 'themeDarkBtn', 'themeSepiaBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => setTheme(id.replace('Btn', '').replace('theme', 'theme-').toLowerCase()));
    });
});
