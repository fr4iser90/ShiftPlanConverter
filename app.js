console.log("app.js loaded");
/**
 * Schicht-Presets nach Berufsgruppe UND Bereich UND Voreinstellung
 * Beispielstruktur:
 * shiftPresets[profession][bereich][preset]
 */
const shiftTypes = {
    pflege: {
        op: {
            default: {
                "07:35-15:50": "F",
                "08:30-16:45": "F1",
                "09:00-17:15": "F2",
                "09:30-17:45": "F3",
                "10:00-18:15": "M1",
                "11:00-19:15": "M2",
                "11:35-19:50": "M3",
                "07:35-19:35": "B36",
                "19:50-07:35": "B38",
                "11:35-07:35": "MO"
            },
            anasthesie: {
                "07:35-15:50": "F",
                "08:30-16:45": "F1",
                "09:00-17:15": "F2",
                "09:30-17:45": "F3",
                "10:00-18:15": "M1",
                "11:00-19:15": "M2",
                "11:35-19:50": "M3",
                "07:35-19:35": "B36",
                "19:50-07:35": "B38",
                "11:35-07:35": "MO"
            },
            ota: {
                "07:00-15:30": "F",
                "07:30-16:00": "F1",
                "08:00-16:30": "F2",
                "08:30-17:00": "F3",
                "09:00-17:30": "M1",
                "10:00-18:30": "M2",
                "11:00-19:30": "M3",
                "07:00-19:00": "B36",
                "19:00-07:00": "B38",
                "11:00-07:00": "MO",
                "08:00-20:00": "OP",
                "20:00-08:00": "OP-N"
            }
        },
        station1: {
            default: {
                "06:00-14:00": "F",
                "13:30-21:30": "S",
                "21:00-06:30": "N"
            }
        }
        // Weitere Bereiche und Typen für Pflege...
    },
    aerzte: {
        op: {
            default: {
                "07:00-15:00": "A",
                "15:00-23:00": "B",
                "23:00-07:00": "C"
            }
        }
        // Weitere Bereiche und Typen für Ärzte...
    }
    // Weitere Berufsgruppen...
};

// Hilfsfunktion: Bereich zu Preset-Gruppe
function getPresetGroup(bereich) {
    if (bereich && bereich.startsWith("station")) return "station";
    return "op";
}

// DOM-Elemente
const professionSelect = document.getElementById('professionSelect');
const bereichSelect = document.getElementById('bereichSelect');
const presetSelect = document.getElementById('presetSelect');
const shiftTypesList = document.getElementById('shiftTypesList');
const addShiftTypeButton = document.getElementById('addShiftType');
const shiftTypeTemplate = document.getElementById('shiftTypeTemplate');

// Aktuelle Schichttypen
let currentShiftTypes = {};
let currentPresetGroup = getPresetGroup(bereichSelect.value);

/**
 * Initialisiere Presets-Auswahl je nach Berufsgruppe UND Bereich
 */
function updatePresetOptions() {
    const profession = professionSelect.value;
    const bereich = bereichSelect.value;
    console.log("updatePresetOptions: profession=", profession, "bereich=", bereich);
    const typen = (shiftTypes[profession] && shiftTypes[profession][bereich]) ? shiftTypes[profession][bereich] : {};
    console.log("Gefundene Typen:", Object.keys(typen));
    presetSelect.innerHTML = "";

    // Alle Typen aus Daten einfügen (ohne "custom")
    const typenKeys = Object.keys(typen);
    typenKeys.forEach(typ => {
        const opt = document.createElement("option");
        opt.value = typ;
        opt.textContent = typ.charAt(0).toUpperCase() + typ.slice(1);
        presetSelect.appendChild(opt);
    });

    // Fallback: Standard auswählen, sonst ersten Typ
    if (typenKeys.includes("default")) {
        presetSelect.value = "default";
    } else if (typenKeys.length > 0) {
        presetSelect.value = typenKeys[0];
    }
}

function updateCurrentShiftTypes() {
    const profession = professionSelect.value;
    const bereich = bereichSelect.value;
    const typ = presetSelect.value;
    console.log("updateCurrentShiftTypes: profession=", profession, "bereich=", bereich, "typ=", typ);
    if (
        shiftTypes[profession] &&
        shiftTypes[profession][bereich] &&
        shiftTypes[profession][bereich][typ]
    ) {
        currentShiftTypes = { ...shiftTypes[profession][bereich][typ] };
    } else {
        currentShiftTypes = {};
    }
}

// Schichttypen-Liste aktualisieren
/**
 * Schichttypen-Vorschau und ggf. Editierfelder anzeigen
 */
function updateShiftTypesList() {
    shiftTypesList.innerHTML = '';

    // Vorschau-Liste immer sichtbar und jetzt editierbar
    const previewDiv = document.getElementById('shiftTypesPreview');
    if (previewDiv) {
        previewDiv.innerHTML = '';
        if (!currentShiftTypes || Object.keys(currentShiftTypes).length === 0) {
            previewDiv.innerHTML = '<div class="text-gray-400 italic">Keine Schichttypen für diese Auswahl vorhanden.</div>';
        } else {
            // Editierbare Vorschau als Tabelle mit Edit/Löschen
            const table = document.createElement('table');
            table.className = "w-full text-sm mb-2";
            Object.entries(currentShiftTypes).forEach(([timeRange, code]) => {
                const [start, end] = timeRange.split('-');
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="pr-2 font-bold">${code}</td>
                    <td>${start}–${end}</td>
                    <td>
                        <button class="edit-shift bg-yellow-200 text-yellow-900 px-2 py-1 rounded text-xs mr-1">Edit</button>
                        <button class="delete-shift bg-red-200 text-red-900 px-2 py-1 rounded text-xs">Löschen</button>
                    </td>
                `;
                // Edit-Button
                tr.querySelector('.edit-shift').addEventListener('click', () => {
                    const newCode = prompt("Neuer Code für Schicht:", code) || code;
                    const newStart = prompt("Neue Startzeit (HH:MM):", start) || start;
                    const newEnd = prompt("Neue Endzeit (HH:MM):", end) || end;
                    delete currentShiftTypes[timeRange];
                    currentShiftTypes[`${newStart}-${newEnd}`] = newCode;
                    updateShiftTypesList();
                });
                // Löschen-Button
                tr.querySelector('.delete-shift').addEventListener('click', () => {
                    delete currentShiftTypes[timeRange];
                    updateShiftTypesList();
                });
                table.appendChild(tr);
            });
            previewDiv.appendChild(table);

            // "Neue Schicht"-Button
            const addBtn = document.createElement('button');
            addBtn.textContent = "+ Neue Schicht";
            addBtn.className = "bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm mt-2";
            addBtn.addEventListener('click', () => {
                const code = prompt("Code für neue Schicht:");
                const start = prompt("Startzeit (HH:MM):");
                const end = prompt("Endzeit (HH:MM):");
                if (code && start && end) {
                    currentShiftTypes[`${start}-${end}`] = code;
                    updateShiftTypesList();
                }
            });
            previewDiv.appendChild(addBtn);
        }
    }
    // Keine separate Editierliste mehr, alles in der Vorschau
    if (addShiftTypeButton) addShiftTypeButton.style.display = "none";
}

// Schichttyp aktualisieren
function updateShiftType(oldTimeRange, code, start, end) {
    const newTimeRange = `${start}-${end}`;
    delete currentShiftTypes[oldTimeRange];
    currentShiftTypes[newTimeRange] = code;
    updateShiftTypesList();
}

// Schichttyp löschen
function deleteShiftType(timeRange) {
    delete currentShiftTypes[timeRange];
    updateShiftTypesList();
}

// Neue Schicht hinzufügen
function addNewShiftType() {
    const entry = shiftTypeTemplate.content.cloneNode(true);
    const codeInput = entry.querySelector('.shift-code');
    const startInput = entry.querySelector('.shift-start');
    const endInput = entry.querySelector('.shift-end');
    const deleteButton = entry.querySelector('.delete-shift');

    const updateHandler = () => {
        if (codeInput.value && startInput.value && endInput.value) {
            const timeRange = `${startInput.value}-${endInput.value}`;
            currentShiftTypes[timeRange] = codeInput.value;
            updateShiftTypesList();
        }
    };

    codeInput.addEventListener('change', updateHandler);
    startInput.addEventListener('change', updateHandler);
    endInput.addEventListener('change', updateHandler);
    deleteButton.addEventListener('click', () => entry.remove());

    shiftTypesList.appendChild(entry);
}

/**
 * Event Listener für Berufsgruppe, Bereich, Voreinstellung
 */
professionSelect.addEventListener('change', () => {
    updatePresetOptions();
    updateCurrentShiftTypes();
    updateShiftTypesList();
});
bereichSelect.addEventListener('change', () => {
    updatePresetOptions();
    updateCurrentShiftTypes();
    updateShiftTypesList();
});
presetSelect.addEventListener('change', () => {
    updateCurrentShiftTypes();
    updateShiftTypesList();
});

/**
 * Setzt die aktuellen Schichttypen je nach Auswahl
 */
function updateCurrentShiftTypes() {
    const profession = professionSelect.value;
    const bereich = bereichSelect.value;
    const typ = presetSelect.value;
    if (
        shiftTypes[profession] &&
        shiftTypes[profession][bereich] &&
        shiftTypes[profession][bereich][typ]
    ) {
        currentShiftTypes = { ...shiftTypes[profession][bereich][typ] };
    } else {
        currentShiftTypes = {};
    }
}

/**
 * PDF-Upload, Vorschau und Download-Logik
 */
const dropzone = document.getElementById('dropzone');
const pdfInput = document.getElementById('pdfInput');
const previewContent = document.getElementById('previewContent');
const downloadBtn = document.getElementById('downloadBtn');
let fileData = null;
let convertedData = null; // Platzhalter für konvertierte Datei

dropzone.addEventListener('click', () => pdfInput.click());
pdfInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        fileData = e.target.files[0];
        handlePreview();
    }
});
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', e => { e.preventDefault(); dropzone.classList.remove('drag-over'); });
dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) {
        fileData = e.dataTransfer.files[0];
        handlePreview();
    }
});

function handlePreview() {
    if (fileData) {
        console.log("handlePreview: fileData vorhanden", fileData);
        const reader = new FileReader();
        reader.onload = function(evt) {
            localStorage.setItem('dienstplanPDF', evt.target.result);

            // PDF Vorschau mit pdf.js
            const arrayBufferReader = new FileReader();
            arrayBufferReader.onload = function(e) {
                const typedarray = new Uint8Array(e.target.result);
                pdfjsLib.getDocument({ data: typedarray }).promise.then(function(pdf) {
                    pdf.getPage(1).then(function(page) {
                        const scale = 1.2;
                        const viewport = page.getViewport({ scale: scale });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        page.render({ canvasContext: context, viewport: viewport }).promise.then(function() {
                            previewContent.innerHTML = '';
                            previewContent.appendChild(canvas);
                            console.log("PDF Vorschau erfolgreich angezeigt");
                        });
                    });
                }).catch(function(error) {
                    previewContent.innerText = 'Fehler beim Laden der PDF-Vorschau: ' + error;
                    console.error("Fehler bei PDF.js:", error);
                });
            };
            arrayBufferReader.readAsArrayBuffer(fileData);

            // Dummy-Konvertierung (z.B. als CSV)
            convertedData = convertToCSV();
            downloadBtn.style.display = "inline-block";
        };
        reader.readAsDataURL(fileData);
    } else {
        console.warn("handlePreview: fileData ist leer!");
    }
}

downloadBtn.addEventListener('click', () => {
    console.log("Download-Button geklickt, convertedData:", convertedData);
    if (convertedData) {
        const blob = new Blob([convertedData], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "dienstplan.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        console.warn("Download-Button: Keine konvertierten Daten vorhanden!");
    }
});

downloadBtn.addEventListener('click', () => {
    if (convertedData) {
        const blob = new Blob([convertedData], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "dienstplan.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});

/**
 * Konvertiert die aktuelle Schichttypen-Liste in CSV
 */
function convertToCSV() {
    let csv = "Code,Start,Ende\n";
    Object.entries(currentShiftTypes).forEach(([timeRange, code]) => {
        const [start, end] = timeRange.split('-');
        csv += `${code},${start},${end}\n`;
    });
    return csv;
}

// Event Listener für "Neue Schicht" Button
addShiftTypeButton.addEventListener('click', addNewShiftType);

/**
 * Initialisierung beim Laden
 */
window.addEventListener('DOMContentLoaded', () => {
    updatePresetOptions();
    updateCurrentShiftTypes();
    updateShiftTypesList();
});
