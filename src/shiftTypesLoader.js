/**
 * shiftTypesLoader.js
 * Load hospital config, shift mappings, PDF parser config, and payroll profiles.
 */

import { normalizeMapping } from './mappingNormalize.js';

/**
 * @param {string} krankenhaus
 * @returns {Promise<Object>}
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
 * @param {string} krankenhaus
 * @param {string} mappingPath
 * @returns {Promise<Object>}
 */
export async function loadMapping(krankenhaus, mappingPath) {
  const url = `./krankenhaeuser/${krankenhaus}/${mappingPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Konnte Mapping ${mappingPath} nicht laden: ${response.statusText}`);
  }
  return normalizeMapping(await response.json());
}

/**
 * Pack PDF engine config (code-grid detection patterns, etc.).
 * @param {string} krankenhaus
 * @returns {Promise<Object|null>}
 */
export async function loadPdfParserConfig(krankenhaus) {
  const url = `./krankenhaeuser/${krankenhaus}/parsers-pdf.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * @param {string} krankenhaus
 * @param {string} profilePath - relative to hospital folder
 * @returns {Promise<Object|null>}
 */
export async function loadPayrollProfile(krankenhaus, profilePath) {
  if (!profilePath) return null;
  const url = `./krankenhaeuser/${krankenhaus}/${profilePath}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Lädt den spezifischen Parser für ein Krankenhaus.
 * @param {string} krankenhaus - z.B. "st-elisabeth-leipzig"
 * @returns {Promise<Function|null>} - Die Parser-Funktion
 */
export async function loadHospitalParser(krankenhaus) {
  try {
    // Cache-Bust: Parser ändert sich oft; Browser-Module-Cache sonst zu hartnäckig
    const module = await import(`../krankenhaeuser/${krankenhaus}/parser.js?v=20260719`);
    if (module.parseStElisabeth) return module.parseStElisabeth;
    if (module.default) return module.default;
    return Object.values(module).find(f => typeof f === 'function');
  } catch (e) {
    console.warn('Kein spezifischer Parser für', krankenhaus, 'gefunden, nutze Standard.', e);
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
