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

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsDataURL(file);
    });
}

function isPdfFile(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}

export function initPDFLoad({ onPdfBatchLoaded }) {
    const dropzone = document.getElementById('dropzone');
    const pdfInput = document.getElementById('pdfInput');

    if (!dropzone || !pdfInput || typeof onPdfBatchLoaded !== 'function') return;

    async function handleFileList(fileList) {
        const pdfFiles = Array.from(fileList).filter(isPdfFile);
        if (!pdfFiles.length) return;

        if (pdfFiles.length === 1) {
            try {
                const dataUrl = await readFileAsDataURL(pdfFiles[0]);
                localStorage.setItem('dienstplanPDF', dataUrl);
            } catch (e) {
                console.warn('Konnte PDF nicht als DataURL zwischenspeichern:', e);
            }
        } else {
            localStorage.removeItem('dienstplanPDF');
        }

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

    dropzone.addEventListener('click', () => pdfInput.click());
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
