/**
 * upload.js
 * Kapselt die PDF-Upload-Logik (Drag&Drop, FileInput, FileReader).
 * Mehrere PDFs können gleichzeitig gewählt werden; alle werden an onPdfBatchLoaded übergeben.
 */

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsArrayBuffer(file);
    });
}

function isPdfFile(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}

/** Legacy: full PDF was once cached as data-URL — remove if still present. */
function clearLegacyPdfCache() {
    try {
        localStorage.removeItem('dienstplanPDF');
    } catch {
        /* ignore */
    }
}

function showSelectedFileNames(files) {
    const el = document.getElementById('pdfSelectedFiles');
    if (!el) return;
    const names = Array.from(files || []).map((f) => f.name).filter(Boolean);
    if (!names.length) {
        el.textContent = '';
        el.style.display = 'none';
        return;
    }
    el.style.display = 'block';
    el.textContent = names.length === 1
        ? `Ausgewählt: ${names[0]}`
        : `Ausgewählt (${names.length}): ${names.join(', ')}`;
}

export function initPDFLoad({ onPdfBatchLoaded }) {
    const dropzone = document.getElementById('dropzone');
    const pdfInput = document.getElementById('pdfInput');

    if (!dropzone || !pdfInput || typeof onPdfBatchLoaded !== 'function') return;

    clearLegacyPdfCache();

    async function handleFileList(fileList) {
        const pdfFiles = Array.from(fileList).filter(isPdfFile);
        showSelectedFileNames(pdfFiles);
        if (!pdfFiles.length) return;

        // PDFs stay in memory (ArrayBuffer) only — never persist to localStorage.
        clearLegacyPdfCache();

        const items = [];
        for (const file of pdfFiles) {
            try {
                const arrayBuffer = await readFileAsArrayBuffer(file);
                items.push({ arrayBuffer, file });
            } catch (e) {
                console.error('Fehler beim Lesen von', file.name, e);
            }
        }
        if (items.length) {
            onPdfBatchLoaded(items);
        }
    }

    // Kein dropzone→pdfInput.click(): Input liegt bereits full-bleed über der Zone
    // (doppelter programmatischer click bricht den File-Picker auf iOS).
    pdfInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
            handleFileList(e.target.files);
            e.target.value = '';
        }
    });
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
            handleFileList(e.dataTransfer.files);
        }
    });
}
