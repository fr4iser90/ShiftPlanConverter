/**
 * Normalize hospital mapping JSON for the web converter.
 * Mobile packs use flat `dutyCodes`; web UI historically used `presets.<name>`.
 * Code identifiers stay English; UI may show German labels.
 */

/**
 * @param {object|null|undefined} mapping
 * @returns {object|null}
 */
export function normalizeMapping(mapping) {
  if (!mapping || typeof mapping !== 'object') return null;

  const out = { ...mapping };

  if (out.presets && typeof out.presets === 'object' && Object.keys(out.presets).length) {
    return out;
  }

  if (out.dutyCodes && typeof out.dutyCodes === 'object') {
    const role = out.role || out.department || 'default';
    const presetName = String(role).trim() || 'default';
    out.presets = {
      [presetName]: { ...out.dutyCodes },
    };
  }

  return out;
}

/**
 * Resolve the active time→code table for a preset name.
 * @param {object|null|undefined} mapping - preferably already normalized
 * @param {string} [preset]
 * @returns {Record<string, unknown>}
 */
export function resolvePresetTable(mapping, preset) {
  if (!mapping) return {};
  if (mapping.presets && typeof mapping.presets === 'object') {
    if (preset && mapping.presets[preset]) return mapping.presets[preset];
    const keys = Object.keys(mapping.presets);
    if (keys.length) return mapping.presets[keys[0]];
  }
  if (mapping.dutyCodes && typeof mapping.dutyCodes === 'object') {
    return mapping.dutyCodes;
  }
  return {};
}
