/**
 * Local browser storage helpers for ShiftPlanConverter (web).
 * Sensitive shift/payslip-derived data should prefer sessionStorage;
 * prefs (theme, colors) may use localStorage.
 */

const SESSION_KEYS = [
  'parsedEntries',
  'monthSummaries',
];

const LOCAL_PII_KEYS = [
  'dienstplanPDF', // legacy full-PDF cache
  'parsedEntries', // may still exist from older builds
  'monthSummaries',
  'spc_person_filter',
];

const LOCAL_PREF_KEYS = [
  'shiftColors',
  'theme',
  'prefShowMonthSummary',
  'prefRichEventDetails',
  'spc_workplace_prefs',
];

/** Keys that look like user mapping overrides. */
function mappingKeys() {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('mapping_')) out.push(k);
  }
  return out;
}

export function clearSensitiveLocalData() {
  for (const k of SESSION_KEYS) {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
  for (const k of [...LOCAL_PII_KEYS, ...mappingKeys()]) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export function clearAllLocalAppData() {
  clearSensitiveLocalData();
  for (const k of LOCAL_PREF_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
  // Google calendar id (not a token, but user-linked)
  try {
    localStorage.removeItem('googleCalendarId');
  } catch {
    /* ignore */
  }
}

/** Read JSON: session first, then local (migration). */
export function readJsonStore(key, fallback) {
  try {
    const s = sessionStorage.getItem(key);
    if (s != null) return JSON.parse(s);
  } catch {
    /* ignore */
  }
  try {
    const l = localStorage.getItem(key);
    if (l != null) {
      const parsed = JSON.parse(l);
      // migrate sensitive keys into session
      if (SESSION_KEYS.includes(key)) {
        try {
          sessionStorage.setItem(key, l);
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function writeJsonStore(key, value) {
  const raw = JSON.stringify(value);
  if (SESSION_KEYS.includes(key)) {
    try {
      sessionStorage.setItem(key, raw);
      localStorage.removeItem(key);
      return;
    } catch {
      /* quota / private mode — fall through */
    }
  }
  localStorage.setItem(key, raw);
}
