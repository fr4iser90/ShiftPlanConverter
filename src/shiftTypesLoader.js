/**
 * shiftTypesLoader.js
 * Lädt die Krankenhaus-Konfiguration und die zugehörigen Schicht-Mappings.
 */

/**
 * Lädt die config.json für das angegebene Krankenhaus.
 * @param {string} krankenhaus - z.B. "st-elisabeth-leipzig"
 * @returns {Promise<Object>} - Die Krankenhaus-Konfiguration
 */
export async function loadHospitalConfig(krankenhaus) {
  const url = `./krankenhaeuser/${krankenhaus}/config.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Konnte Konfiguration für ${krankenhaus} nicht laden: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Lädt ein spezifisches Schicht-Mapping.
 * @param {string} krankenhaus - z.B. "st-elisabeth-leipzig"
 * @param {string} mappingPath - Pfad zum Mapping relativ zum Krankenhaus-Ordner
 * @returns {Promise<Object>} - Das Schicht-Mapping
 */
export async function loadMapping(krankenhaus, mappingPath) {
  const url = `./krankenhaeuser/${krankenhaus}/${mappingPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Konnte Mapping ${mappingPath} nicht laden: ${response.statusText}`);
  }
  return await response.json();
}
