/**
 * main.js
 * Zentrale Steuerung der App, verbindet alle Module.
 */

import { loadHospitalConfig, loadMapping, loadHospitalParser, loadSpecialShiftTypes } from './shiftTypesLoader.js';
import { initPDFLoad } from './pdfLoader.js';
import { parseTimeSheet, convertParsedEntriesToCSV } from './convert.js';
import { renderPreview } from './preview.js';
import { initGoogleCalendar, syncToCalendar } from './google.js';
import { exportToICS } from './icsGenerator.js';
import { sendStructureFeedback, sendMappingProposal } from './api.js';

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

let currentHospitalConfig = null;
let currentMapping = null;
let currentParser = null;
let currentKrankenhaus = 'st-elisabeth-leipzig';
let isEditMode = false;
let lastRawText = "";

let appConfig = {
    maintainerEmail: '',
    githubRepo: ''
};

/**
 * Lädt die globale Konfiguration
 */
async function loadAppConfig() {
    try {
        const response = await fetch('src/config.json');
        const config = await response.json();
        appConfig = { ...appConfig, ...config };
        
        // UI-Elemente mit Config-Werten aktualisieren
        const maintainerLinks = document.querySelectorAll('.maintainer-email');
        maintainerLinks.forEach(link => {
            link.textContent = appConfig.maintainerEmail;
            if (link.tagName === 'A') link.href = `mailto:${appConfig.maintainerEmail}`;
        });

        const githubLinks = document.querySelectorAll('.github-repo');
        githubLinks.forEach(link => {
            link.href = appConfig.githubRepo;
        });

        // Spezielle Buttons aktualisieren
        const sendBtn = document.getElementById('sendToMaintainerBtn');
        if (sendBtn) {
            sendBtn.textContent = `📧 An Maintainer senden (${appConfig.maintainerEmail})`;
        }
    } catch (e) {
        console.warn('Konnte config.json nicht laden, verwende Defaults:', e);
    }
}

/**
 * Hilfsfunktionen für Schichtfarben
 */
async function getShiftColors() {
    const stored = localStorage.getItem('shiftColors');
    const storedColors = stored ? JSON.parse(stored) : {};
    
    const mappingColors = currentMapping?.colors || {};
    
    // Lade Sonder-Schichttypen
    let specialTypes = {};
    try {
        specialTypes = await loadSpecialShiftTypes();
    } catch (e) {
        console.warn('Sonderfarben konnten nicht geladen werden', e);
    }

    const specialColors = {};
    if (currentMapping && currentMapping.presets) {
        // Suche in allen Presets nach SPECIAL: Kürzeln und weise ihnen die Sonderfarben zu
        Object.values(currentMapping.presets).forEach(preset => {
            Object.entries(preset).forEach(([key, value]) => {
                if (key.startsWith('SPECIAL:')) {
                    const type = key.split(':')[1];
                    const code = typeof value === 'object' ? value.code : value;
                    if (specialTypes[type]) {
                        specialColors[code] = specialTypes[type].color;
                    }
                }
            });
        });
    }

    const allColors = {
        'N': '#ef4444', 
        'F': '#22c55e', 
        'S': '#eab308', 
        'M': '#3b82f6', 
        ...specialColors,
        ...mappingColors,
        ...storedColors
    };

    // WICHTIG: Synchronisiere allColors zurück in den localStorage, 
    // damit andere Module (wie Google Sync) darauf zugreifen können.
    localStorage.setItem('shiftColors', JSON.stringify(allColors));
    
    return allColors;
}

async function saveShiftColor(code, color) {
    const stored = localStorage.getItem('shiftColors');
    const colors = stored ? JSON.parse(stored) : {};
    colors[code] = color;
    localStorage.setItem('shiftColors', JSON.stringify(colors));
    renderShiftTypesList(getCurrentShiftTypes());
    
    // Preview sofort aktualisieren für direktes Feedback
    refreshPreview();
}

/**
 * Aktualisiert die Vorschau basierend auf dem aktuellen Mapping und dem letzten geladenen PDF-Text.
 */
async function refreshPreview() {
    if (!lastRawText || !currentParser) return;

    const presetSelect = document.getElementById('presetSelect');
    const preset = presetSelect ? presetSelect.value : '';
    const profession = document.getElementById('professionSelect')?.value;
    const bereich = document.getElementById('bereichSelect')?.value;

    const parsed = parseTimeSheet(lastRawText, profession, bereich, preset, currentMapping, currentParser);
    localStorage.setItem('parsedEntries', JSON.stringify(parsed.entries));
    await renderPreview(parsed.entries, currentMapping, preset);
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
        currentParser = await loadHospitalParser(currentKrankenhaus);
        updateGroupOptions();
        
        // WICHTIG: Event-Listener für Dropdowns sicherstellen
        setupDropdownListeners();
        
        await updateAreaOptions();
        await updatePresetOptions();
        await renderShiftTypesList(getCurrentShiftTypes());
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
        refreshPreview();
    };

    professionSelect.onchange = handleChange;
    
    bereichSelect.onchange = handleChange;

    if (presetSelect) {
        presetSelect.onchange = () => {
            renderShiftTypesList(getCurrentShiftTypes());
            refreshPreview();
        };
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
    const types = currentMapping.presets[preset] || {};
    
    // Standard-Sonderkürzel hinzufügen, falls nicht vorhanden
    if (!Object.keys(types).some(k => k.startsWith('SPECIAL:'))) {
        types["SPECIAL:URLAUB"] = { code: "U", isValidated: true };
        types["SPECIAL:KRANK"] = { code: "K", isValidated: true };
    }
    
    return types;
}

async function renderShiftTypesList(currentShiftTypes) {
    const previewDiv = document.getElementById('shiftTypesPreview');
    const submitMappingBtn = document.getElementById('submitMappingBtn');
    if (!previewDiv) return;

    previewDiv.innerHTML = '';

    const colors = await getShiftColors();
    const editBtn = document.getElementById('editShiftTypesBtn');
    
    if (isEditMode) {
        editBtn.textContent = 'Speichern';
        editBtn.classList.replace('bg-gray-200', 'bg-green-500');
        editBtn.classList.replace('text-gray-700', 'text-white');
        if (submitMappingBtn) submitMappingBtn.style.display = 'flex';
        
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
            const isSpecial = timeRange.startsWith('SPECIAL:');
            const displayTime = isSpecial ? 'Sonderkürzel' : timeRange;
            const timeParts = isSpecial ? ['', ''] : timeRange.split('-');
            const startTime = timeParts[0] || '';
            const endTime = timeParts[1] || '';

            // Kontrastfarbe berechnen (Schwarz oder Weiß für Text auf farbigem Hintergrund)
            const getContrastColor = (hex) => {
                if (!hex || hex.length < 7) return '#000000';
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                return (yiq >= 128) ? '#000000' : '#ffffff';
            };

            const contrastColor = getContrastColor(currentColor);
            
            // Create row structure using DOM methods instead of innerHTML
            const timeContainer = document.createElement('div');
            timeContainer.className = `flex items-center gap-1 bg-white border rounded px-1 ${isSpecial ? 'opacity-50 grayscale' : ''}`;
            
            const startInput = document.createElement('input');
            startInput.type = 'text';
            startInput.className = 'edit-start w-12 text-xs border-none p-0 focus:ring-0 text-center';
            startInput.value = startTime;
            startInput.placeholder = isSpecial ? '---' : '00:00';
            startInput.maxLength = 5;
            if (isSpecial) startInput.disabled = true;
            
            const dash = document.createElement('span');
            dash.className = 'text-gray-400';
            dash.textContent = '-';
            
            const endInput = document.createElement('input');
            endInput.type = 'text';
            endInput.className = 'edit-end w-12 text-xs border-none p-0 focus:ring-0 text-center';
            endInput.value = endTime;
            endInput.placeholder = isSpecial ? '---' : '00:00';
            endInput.maxLength = 5;
            if (isSpecial) endInput.disabled = true;
            
            timeContainer.appendChild(startInput);
            timeContainer.appendChild(dash);
            timeContainer.appendChild(endInput);
            
            const codeContainer = document.createElement('div');
            codeContainer.className = 'relative group';
            
            const codeInput = document.createElement('input');
            codeInput.type = 'text';
            codeInput.className = 'edit-code w-12 text-xs border rounded px-1 font-bold text-center transition-colors';
            codeInput.value = code;
            codeInput.placeholder = 'Code';
            codeInput.style.backgroundColor = currentColor;
            codeInput.style.color = contrastColor;
            codeInput.style.borderColor = currentColor;
            
            codeContainer.appendChild(codeInput);
            
            // Palette container
            const paletteWrapper = document.createElement('div');
            paletteWrapper.className = 'flex items-center gap-2 flex-1 min-w-[100px]';
            
            const paletteContainerDiv = document.createElement('div');
            paletteContainerDiv.className = 'relative flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200';
            
            const paletteContainer = document.createElement('div');
            paletteContainer.className = 'palette-container hidden absolute bottom-full left-0 mb-2 p-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex-wrap gap-1.5 w-40';
            
            // Create color swatches
            Object.entries(googleColors).forEach(([id, hex]) => {
                const swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.className = `color-swatch w-6 h-6 rounded shadow-sm transition-all hover:scale-110 ${currentColor.toLowerCase() === hex.toLowerCase() ? 'ring-2 ring-gray-800 ring-offset-1' : ''}`;
                swatch.style.backgroundColor = hex;
                swatch.dataset.color = hex;
                swatch.title = `Google Farbe ${id}`;
                paletteContainer.appendChild(swatch);
            });
            
            const divider = document.createElement('div');
            divider.className = 'w-full h-px bg-gray-100 my-1';
            paletteContainer.appendChild(divider);
            
            const colorPickerContainer = document.createElement('div');
            colorPickerContainer.className = 'relative w-full h-8 overflow-hidden rounded border border-gray-300';
            
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.className = 'absolute -inset-1 w-full h-12 p-0 border-none bg-transparent cursor-pointer';
            colorPicker.value = currentColor;
            
            const colorPickerLabel = document.createElement('div');
            colorPickerLabel.className = 'absolute inset-0 flex items-center justify-center pointer-events-none text-[10px] font-bold mix-blend-difference text-white';
            colorPickerLabel.textContent = 'Eigene Farbe';
            
            colorPickerContainer.appendChild(colorPicker);
            colorPickerContainer.appendChild(colorPickerLabel);
            paletteContainer.appendChild(colorPickerContainer);
            
            const paletteToggle = document.createElement('button');
            paletteToggle.type = 'button';
            paletteToggle.className = 'palette-toggle w-8 h-8 rounded-md border-2 border-white shadow-sm transition-transform hover:scale-105';
            paletteToggle.style.backgroundColor = currentColor;
            
            paletteContainerDiv.appendChild(paletteContainer);
            paletteContainerDiv.appendChild(paletteToggle);
            paletteWrapper.appendChild(paletteContainerDiv);
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-shift text-red-400 hover:text-red-600 p-1 transition-colors';
            deleteBtn.title = 'Löschen';
            const deleteSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            deleteSvg.setAttribute('class', 'w-5 h-5');
            deleteSvg.setAttribute('fill', 'none');
            deleteSvg.setAttribute('stroke', 'currentColor');
            deleteSvg.setAttribute('viewBox', '0 0 24 24');
            const deletePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            deletePath.setAttribute('stroke-linecap', 'round');
            deletePath.setAttribute('stroke-linejoin', 'round');
            deletePath.setAttribute('stroke-width', '2');
            deletePath.setAttribute('d', 'M6 18L18 6M6 6l12 12');
            deleteSvg.appendChild(deletePath);
            deleteBtn.appendChild(deleteSvg);
            
            // Assemble row
            row.appendChild(timeContainer);
            row.appendChild(codeContainer);
            row.appendChild(paletteWrapper);
            row.appendChild(deleteBtn);
            
            const swatches = paletteContainer.querySelectorAll('.color-swatch');

            // Palette öffnen/schließen
            paletteToggle.onclick = (e) => {
                e.stopPropagation();
                const isHidden = paletteContainer.classList.contains('hidden');
                document.querySelectorAll('.palette-container').forEach(p => p.classList.add('hidden')); // Alle anderen schließen
                if (isHidden) paletteContainer.classList.remove('hidden');
            };

            // Schließen wenn man außerhalb klickt
            document.addEventListener('click', () => paletteContainer.classList.add('hidden'));
            paletteContainer.onclick = (e) => e.stopPropagation();

            let internalTimeRange = timeRange;

            const updateLocal = async (newColor) => {
                const finalColor = newColor || colorPicker.value;
                const newCode = codeInput.value;
                
                // UI Update
                codeInput.style.backgroundColor = finalColor;
                codeInput.style.color = getContrastColor(finalColor);
                codeInput.style.borderColor = finalColor;
                paletteToggle.style.backgroundColor = finalColor;

                if (!isSpecial) {
                    const newTime = `${startInput.value}-${endInput.value}`;
                    if (newTime !== internalTimeRange) {
                        delete currentShiftTypes[internalTimeRange];
                        currentShiftTypes[newTime] = typeof value === 'object' ? { ...value, code: newCode } : newCode;
                        internalTimeRange = newTime;
                    } else {
                        if (typeof value === 'object') value.code = newCode;
                        else currentShiftTypes[internalTimeRange] = newCode;
                    }
                } else {
                    // Bei Special Codes nur den Code aktualisieren (Key bleibt SPECIAL:...)
                    if (typeof value === 'object') value.code = newCode;
                    else currentShiftTypes[internalTimeRange] = newCode;
                }
                await saveShiftColor(newCode, finalColor);
            };

            const formatTimeInput = (input) => {
                input.addEventListener('input', (e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 2) val = val.slice(0, 2) + ':' + val.slice(2, 4);
                    e.target.value = val;
                });
                input.addEventListener('blur', () => {
                    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
                    if (!timeRegex.test(input.value) && input.value !== "") {
                        input.classList.add('border-red-500', 'text-red-500');
                    } else {
                        input.classList.remove('border-red-500', 'text-red-500');
                        updateLocal();
                    }
                });
            };

            formatTimeInput(startInput);
            formatTimeInput(endInput);
            codeInput.addEventListener('change', () => updateLocal());
            colorPicker.addEventListener('change', (e) => {
                updateLocal(e.target.value);
                paletteContainer.classList.add('hidden');
            });
            
            swatches.forEach(swatch => {
                swatch.addEventListener('click', () => {
                    updateLocal(swatch.dataset.color);
                    paletteContainer.classList.add('hidden');
                });
            });

            deleteBtn.addEventListener('click', () => {
                delete currentShiftTypes[internalTimeRange];
                renderShiftTypesList(currentShiftTypes);
                refreshPreview();
            });
            
            container.appendChild(row);
        });
        
        const addBtn = document.createElement('button');
        addBtn.className = "w-full mt-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 border-dashed rounded hover:bg-blue-100";
        addBtn.textContent = "+ Neue Schicht hinzufügen";
        addBtn.onclick = () => {
            currentShiftTypes["00:00-00:00"] = { code: "NEW", isValidated: false };
            renderShiftTypesList(currentShiftTypes);
            refreshPreview();
        };

        const addSpecialBtn = document.createElement('button');
        addSpecialBtn.className = "w-full mt-1 py-1 text-xs bg-purple-50 text-purple-600 border border-purple-200 border-dashed rounded hover:bg-purple-100";
        addSpecialBtn.textContent = "+ Sonderkürzel hinzufügen (Urlaub etc.)";
        addSpecialBtn.onclick = () => {
            const id = Math.random().toString(36).substr(2, 5).toUpperCase();
            currentShiftTypes[`SPECIAL:${id}`] = { code: "U", isValidated: true };
            renderShiftTypesList(currentShiftTypes);
            refreshPreview();
        };
        
        container.appendChild(addBtn);
        container.appendChild(addSpecialBtn);
        previewDiv.appendChild(container);
    } else {
        editBtn.textContent = 'Bearbeiten';
        editBtn.classList.replace('bg-green-500', 'bg-gray-200');
        editBtn.classList.replace('text-white', 'text-gray-700');
        if (submitMappingBtn) submitMappingBtn.style.display = 'none';

        if (!currentShiftTypes || Object.keys(currentShiftTypes).length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-gray-400 italic';
            emptyDiv.textContent = 'Keine Schichttypen vorhanden.';
            previewDiv.innerHTML = '';
            previewDiv.appendChild(emptyDiv);
            return;
        }

        const table = document.createElement('table');
        table.className = "w-full text-sm mb-2";
        Object.entries(currentShiftTypes).forEach(([timeRange, value]) => {
            const isSpecial = timeRange.startsWith('SPECIAL:');
            const [start, end] = isSpecial ? ['', ''] : timeRange.split('-');
            const code = typeof value === 'object' ? value.code : value;
            const isValidated = typeof value === 'object' ? !!value.isValidated : false;
            const color = colors[code] || '#3b82f6';
            
            let label = isSpecial ? '<span class="text-[10px] text-purple-500 font-medium uppercase tracking-tighter bg-purple-50 px-1 rounded">Sonderkürzel</span>' : `${start}–${end}`;
            
            // Beschreibung für Standard-Sonderkürzel hinzufügen
            if (timeRange === 'SPECIAL:URLAUB') label += ' <span class="text-[10px] text-gray-400 ml-1">(Urlaub)</span>';
            if (timeRange === 'SPECIAL:KRANK') label += ' <span class="text-[10px] text-gray-400 ml-1">(Krank)</span>';

            const tr = document.createElement('tr');
            const codeCell = document.createElement('td');
            codeCell.className = 'pr-2 font-bold';
            codeCell.style.color = color;
            codeCell.textContent = code;
            if (isValidated) {
                const checkmark = document.createElement('span');
                checkmark.title = 'Validiert';
                checkmark.className = 'ml-1 text-blue-500';
                checkmark.textContent = '✓';
                codeCell.appendChild(checkmark);
            }
            
            const colorCell = document.createElement('td');
            colorCell.className = 'w-8 py-1';
            const colorDot = document.createElement('div');
            colorDot.className = 'w-4 h-4 rounded-full';
            colorDot.style.backgroundColor = color;
            colorCell.appendChild(colorDot);
            tr.appendChild(colorCell);
            tr.appendChild(codeCell);
            const labelCell = document.createElement('td');
            // Create label safely using DOM methods instead of innerHTML
            if (isSpecial) {
                const specialBadge = document.createElement('span');
                specialBadge.className = 'text-[10px] text-purple-500 font-medium uppercase tracking-tighter bg-purple-50 px-1 rounded';
                specialBadge.textContent = 'Sonderkürzel';
                labelCell.appendChild(specialBadge);
                
                if (timeRange === 'SPECIAL:URLAUB') {
                    const urlaubSpan = document.createElement('span');
                    urlaubSpan.className = 'text-[10px] text-gray-400 ml-1';
                    urlaubSpan.textContent = '(Urlaub)';
                    labelCell.appendChild(urlaubSpan);
                } else if (timeRange === 'SPECIAL:KRANK') {
                    const krankSpan = document.createElement('span');
                    krankSpan.className = 'text-[10px] text-gray-400 ml-1';
                    krankSpan.textContent = '(Krank)';
                    labelCell.appendChild(krankSpan);
                }
            } else {
                // Escape time range for safety
                labelCell.textContent = `${escapeHtml(start)}–${escapeHtml(end)}`;
            }
            tr.appendChild(labelCell);
            table.appendChild(tr);
        });
        previewDiv.appendChild(table);
    }
}

function entryMergeKey(e) {
    const ad = e.allDay ? '1' : '0';
    return `${e.date}|${e.type}|${ad}|${e.start || ''}|${e.end || ''}`;
}

/** Mehrere Parser-Ergebnisse zusammenführen; bei gleichem Schlüssel gewinnt die spätere Datei (Reihenfolge der Auswahl). */
function mergeParsedEntryArrays(entryArrays) {
    const map = new Map();
    for (const entries of entryArrays) {
        for (const e of entries) {
            map.set(entryMergeKey(e), e);
        }
    }
    return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function extractTextFromPdfBuffer(arrayBuffer) {
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let pdfText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        let pageText = '';
        try {
            const textContent = await page.getTextContent();
            if (textContent.items.length > 0) {
                let lastY = null;
                const line = [];
                const lines = [];
                textContent.items.forEach(item => {
                    if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
                        lines.push(line.join(' '));
                        line.length = 0;
                    }
                    line.push(item.str);
                    lastY = item.transform[5];
                });
                if (line.length) lines.push(line.join(' '));
                pageText = lines.join('\n');
            }
        } catch (e) {
            console.warn('Fehler bei Extraktion auf Seite', pageNum, e);
        }
        pdfText += (pdfText ? '\n' : '') + pageText;
    }
    return pdfText;
}

function wireExportButtons() {
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
                } else if (id === 'syncBtn') {
                    const calendarSelect = document.getElementById('calendarSelect');
                    if (!calendarSelect || !calendarSelect.value) {
                        alert('Bitte zuerst mit Google verbinden und einen Kalender wählen.');
                        return;
                    }
                    syncToCalendar(calendarSelect.value);
                }
            };
        }
    });
}

initPDFLoad({
    onPdfBatchLoaded: async (items) => {
        const previewContent = document.getElementById('previewContent');
        const total = items.length;

        function setLoadingLabel(i, name) {
            if (!previewContent) return;
            previewContent.innerHTML = '';
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'flex flex-col gap-1 text-blue-600';
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2';
            const spinSpan = document.createElement('span');
            spinSpan.className = 'animate-spin';
            spinSpan.textContent = '⏳';
            row.appendChild(spinSpan);
            row.appendChild(document.createTextNode(` PDF ${i}/${total} wird analysiert…`));
            loadingDiv.appendChild(row);
            if (name) {
                const fn = document.createElement('div');
                fn.className = 'text-xs text-gray-600 truncate';
                fn.textContent = name;
                loadingDiv.appendChild(fn);
            }
            previewContent.appendChild(loadingDiv);
        }

        setLoadingLabel(1, items[0]?.file?.name);

        const presetSelect = document.getElementById('presetSelect');
        const preset = presetSelect ? presetSelect.value : '';
        const profession = document.getElementById('professionSelect')?.value;
        const bereich = document.getElementById('bereichSelect')?.value;

        if (!currentParser) {
            alert('Fehler: Kein Parser für dieses Krankenhaus gefunden.');
            if (previewContent) {
                previewContent.innerHTML = '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-red-500';
                errorDiv.textContent = 'Fehler: Parser fehlt.';
                previewContent.appendChild(errorDiv);
            }
            return;
        }

        const entryArrays = [];
        const failed = [];
        const rawParts = [];

        for (let idx = 0; idx < items.length; idx++) {
            const { arrayBuffer, file } = items[idx];
            setLoadingLabel(idx + 1, file.name);
            try {
                const pdfText = await extractTextFromPdfBuffer(arrayBuffer);
                if (!pdfText.trim()) {
                    failed.push(`${file.name}: kein lesbarer Text`);
                    continue;
                }
                rawParts.push(`\n\n--- ${file.name} ---\n\n${pdfText}`);
                const parsed = parseTimeSheet(pdfText, profession, bereich, preset, currentMapping, currentParser);
                if (!parsed.entries || parsed.entries.length === 0) {
                    failed.push(`${file.name}: keine Schichten erkannt`);
                } else {
                    entryArrays.push(parsed.entries);
                }
            } catch (err) {
                console.error(file.name, err);
                failed.push(`${file.name}: ${err.message || err}`);
            }
        }

        if (entryArrays.length === 0) {
            const msg = failed.length
                ? `Keine verwertbaren PDFs.\n${failed.join('\n')}`
                : 'Keine Einträge gefunden.';
            alert(msg);
            if (previewContent) {
                previewContent.innerHTML = '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-red-500';
                errorDiv.textContent = 'Keine Einträge – siehe Meldung.';
                previewContent.appendChild(errorDiv);
            }
            return;
        }

        const merged = mergeParsedEntryArrays(entryArrays);
        lastRawText = rawParts.join('');
        const rawTextOutput = document.getElementById('rawTextOutput');
        if (rawTextOutput) rawTextOutput.textContent = lastRawText;
        const debugArea = document.getElementById('debugArea');
        if (debugArea) debugArea.style.display = 'block';

        localStorage.setItem('parsedEntries', JSON.stringify(merged));
        await renderPreview(merged, currentMapping, preset);

        if (failed.length) {
            alert(
                `${merged.length} Einträge aus ${entryArrays.length} PDF(s).\n\nHinweise:\n${failed.join('\n')}`
            );
        }

        const exportSection = document.getElementById('exportSection');
        if (exportSection) {
            exportSection.scrollIntoView({ behavior: 'smooth' });
        }

        wireExportButtons();
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
                const originalText = copyToClipboardBtn.textContent;
                copyToClipboardBtn.textContent = 'Kopiert!';
                setTimeout(() => { copyToClipboardBtn.textContent = originalText; }, 2000);
            });
        });
    }

    const sendToMaintainerBtn = document.getElementById('sendToMaintainerBtn');
    if (sendToMaintainerBtn) {
        sendToMaintainerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const content = document.getElementById('rawTextOutput').textContent;
            
            // Fehlende Schichten sammeln
            const missingShiftsList = document.getElementById('missingShiftsList');
            let missingShiftsText = "";
            if (missingShiftsList && missingShiftsList.children.length > 0) {
                missingShiftsText = "FEHLENDE SCHICHTEN:\n";
                Array.from(missingShiftsList.children).forEach(child => {
                    missingShiftsText += "- " + child.querySelector('span').textContent + "\n";
                });
                missingShiftsText += "\n";
            }

            const profession = document.getElementById('professionSelect')?.value;
            const bereich = document.getElementById('bereichSelect')?.value;
            const hospital = document.getElementById('krankenhausSelect')?.value;
            
            sendStructureFeedback(
                appConfig.maintainerEmail, 
                hospital, 
                profession, 
                bereich, 
                missingShiftsText, 
                content
            );
        });
    }

    const submitMappingBtn = document.getElementById('submitMappingBtn');
    if (submitMappingBtn) {
        submitMappingBtn.addEventListener('click', () => {
            const shiftTypes = getCurrentShiftTypes();
            const hospital = document.getElementById('krankenhausSelect')?.value;
            const profession = document.getElementById('professionSelect')?.value;
            const bereich = document.getElementById('bereichSelect')?.value;
            
            sendMappingProposal(
                appConfig.maintainerEmail,
                hospital,
                profession,
                bereich,
                shiftTypes
            );
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

    // Dropdown listeners are initialized via reloadHospitalAndUI -> setupDropdownListeners

    reloadHospitalAndUI();
    initGoogleCalendar();
    loadAppConfig();

    // Hilfe-Modal Logik
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
    setTheme(localStorage.getItem('theme') || 'theme-light');

    ['themeLightBtn', 'themeDarkBtn', 'themeSepiaBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => setTheme(id.replace('Btn', '').replace('theme', 'theme-').toLowerCase()));
    });
});
