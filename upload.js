/**
 * upload.js
 * Kapselt die PDF-Upload-Logik (Drag&Drop, FileInput, FileReader).
 * Exportiert eine Initialisierungsfunktion und ein Callback für den PDF-Inhalt.
 */

export function initUpload({ onPdfLoaded }) {
    const dropzone = document.getElementById('dropzone');
    const pdfInput = document.getElementById('pdfInput');

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            localStorage.setItem('dienstplanPDF', evt.target.result);

            // ArrayBuffer für weitere Verarbeitung bereitstellen
            const arrayBufferReader = new FileReader();
            arrayBufferReader.onload = function(e) {
                const buffer = e.target.result;
                if (typeof onPdfLoaded === 'function') {
                    onPdfLoaded(buffer, file);
                }
            };
            arrayBufferReader.readAsArrayBuffer(file);
        };
        reader.readAsDataURL(file);
    }

    dropzone.addEventListener('click', () => pdfInput.click());
    pdfInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', e => { e.preventDefault(); dropzone.classList.remove('drag-over'); });
    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
}
