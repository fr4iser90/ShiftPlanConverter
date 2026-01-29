/**
 * Basisklasse für Krankenhaus-Parser.
 * Jeder neue Parser sollte von dieser Klasse erben oder zumindest diese Struktur implementieren.
 */
export class ParserInterface {
    /**
     * Extrahiert die Rohdaten aus dem PDF-Text.
     * @param {string} text - Der extrahierte Text aus dem PDF
     * @returns {Object} { year, month, mainEntries: [], bereitschaftEntries: [], isLegacy: boolean }
     */
    parse(text) {
        throw new Error("Methode 'parse(text)' muss implementiert werden.");
    }
}
