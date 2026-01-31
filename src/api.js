/**
 * api.js
 * Kapselt die Kommunikation nach außen (E-Mail-Feedback, Mapping-Vorschläge).
 */

/**
 * Hilfsfunktion zum Öffnen des Mail-Clients
 */
function openMailClient(email, subject, body) {
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Sendet anonymisiertes Struktur-Feedback an den Maintainer
 */
export function sendStructureFeedback(maintainerEmail, hospital, profession, bereich, missingShiftsText, content) {
    const infoText = `Krankenhaus: ${hospital}\nBerufsgruppe: ${profession}\nBereich: ${bereich}\n\n`;
    const subject = "Dienstplan-Feedback [ShiftPlanConverter]";
    const body = "Hallo,\n\n" + 
                 infoText + 
                 missingShiftsText +
                 "hier ist die anonymisierte Struktur meines Dienstplans:\n\n" + 
                 "---\n" + content + "\n---";
    
    openMailClient(maintainerEmail, subject, body);
}

/**
 * Sendet einen Vorschlag für ein neues Schicht-Mapping an den Maintainer
 */
export function sendMappingProposal(maintainerEmail, hospital, profession, bereich, shiftTypes) {
    let mappingText = `Krankenhaus: ${hospital}\nBerufsgruppe: ${profession}\nBereich: ${bereich}\n\nVORGESCHLAGENE SCHICHTEN:\n`;
    
    Object.entries(shiftTypes).forEach(([timeRange, value]) => {
        const code = typeof value === 'object' ? value.code : value;
        mappingText += `- ${code}: ${timeRange}\n`;
    });

    const subject = "Neuer Schicht-Mapping Vorschlag [ShiftPlanConverter]";
    const body = "Hallo,\n\nich möchte folgendes Schicht-Mapping für die Datenbank vorschlagen:\n\n" + 
                 mappingText + 
                 "\nViele Grüße";
    
    openMailClient(maintainerEmail, subject, body);
}
