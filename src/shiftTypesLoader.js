/**
 * shiftTypesLoader.js
 * Lädt die Krankenhaus-Konfiguration, Schicht-Mappings und Parser.
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

/**
 * Lädt den spezifischen Parser für ein Krankenhaus.
 * @param {string} krankenhaus - z.B. "st-elisabeth-leipzig"
 * @returns {Promise<Function|null>} - Die Parser-Funktion
 */
export async function loadHospitalParser(krankenhaus) {
  try {
    const module = await import(`../krankenhaeuser/${krankenhaus}/parser.js`);
    // Wir suchen nach einer exportierten Funktion, die "parse" im Namen hat oder die einzige Export-Funktion ist
    if (module.parseStElisabeth) return module.parseStElisabeth;
    if (module.default) return module.default;
    return Object.values(module).find(f => typeof f === 'function');
  } catch (e) {
    console.warn(`Kein spezifischer Parser für ${krankenhaus} gefunden, nutze Standard.`, e);
    return null;
  }
}

/**
 * Lädt die zentrale Sonder-Schichttypen-Konfiguration.
 * @returns {Promise<Object>} - Die Sonder-Schichttypen-Konfiguration
 */
export async function loadSpecialShiftTypes() {
  const url = `./src/specialShiftTypes.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Konnte Sonder-Schichttypen-Konfiguration nicht laden: ${response.statusText}`);
  }
  return await response.json();
}
