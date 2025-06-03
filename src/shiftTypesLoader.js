/**
 * shiftTypesLoader.js
 * Lädt die Schichttypen-Definitionen (shiftTypes) für das gewählte Krankenhaus.
 */

/**
 * Lädt die shiftTypes.json für das angegebene Krankenhaus.
 * @param {string} krankenhaus - z.B. "st-elisabeth-leipzig"
 * @returns {Promise<Object>} - Das geladene shiftTypes-Objekt
 */
export async function loadShiftTypes(krankenhaus) {
  const url = `../krankenhaeuser/${krankenhaus}/shiftTypes.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Konnte shiftTypes für ${krankenhaus} nicht laden: ${response.statusText}`);
  }
  return await response.json();
}
