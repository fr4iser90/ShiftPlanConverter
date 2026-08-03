// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/convert/types.ts
function resolveDutyCodes(mapping, tableId) {
  if (!mapping) return {};
  if (mapping.dutyCodes) return mapping.dutyCodes;
  const presets = mapping.presets;
  if (!presets) return {};
  const id = (tableId || "").trim() || Object.keys(presets)[0] || "";
  return id && presets[id] || {};
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/convert/shiftMapping.ts
function mappingCode(value) {
  if (!value) return { code: null, isValidated: false };
  if (typeof value === "object") {
    return { code: value.code, isValidated: !!value.isValidated };
  }
  return { code: value, isValidated: false };
}
function mappingType(value) {
  if (!value || typeof value !== "object") return null;
  const t = String(value.type || "").trim().toLowerCase();
  return t || null;
}
function mappingAlso(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.also)) return [];
  return value.also.map((c) => String(c || "").trim()).filter(Boolean);
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/convert/codeTimes.ts
function timeRangeForCode(code, preset) {
  const u = String(code || "").trim().toUpperCase();
  if (!u || !preset) return null;
  for (const [key, value] of Object.entries(preset)) {
    if (key.startsWith("SPECIAL:")) continue;
    const m = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(key);
    if (!m) continue;
    const { code: primary } = mappingCode(value);
    if (!primary) continue;
    const primaryU = primary.trim().toUpperCase();
    if (primaryU === u) {
      return { start: m[1], end: m[2], primaryCode: primaryU };
    }
    for (const a of mappingAlso(value)) {
      if (a.toUpperCase() === u) {
        return { start: m[1], end: m[2], primaryCode: primaryU };
      }
    }
  }
  return null;
}
function isSpecialPackCode(code, preset) {
  const u = String(code || "").trim().toUpperCase();
  if (!u || !preset) return false;
  if (u === "/" || u === "//") return true;
  for (const [key, value] of Object.entries(preset)) {
    if (!key.startsWith("SPECIAL:")) continue;
    const { code: c } = mappingCode(value);
    if (c && c.trim().toUpperCase() === u) return true;
  }
  return false;
}
function composeRulesForMapping(mapping) {
  return Array.isArray(mapping?.composeRules) ? mapping.composeRules : [];
}
function overflowAttachFromComposeRules(rules) {
  const out = {};
  if (!rules?.length) return out;
  for (const rule of rules) {
    const codes = (rule.codes || []).map((c) => String(c || "").trim().toUpperCase()).filter(Boolean);
    if (codes.length < 2) continue;
    const head = codes[0];
    const rest = codes.slice(1);
    const prev = out[head] || [];
    out[head] = [.../* @__PURE__ */ new Set([...prev, ...rest])];
  }
  return out;
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/sources/ocr/names.ts
var NAME_CORE = "([A-Z\xC4\xD6\xDC][A-Za-z\xC4\xD6\xDC\xE4\xF6\xFC\xDF\\-']{1,40}),\\s*((?:Dr\\.?\\s*)?[A-Z\xC4\xD6\xDC][A-Za-z\xC4\xD6\xDC\xE4\xF6\xFC\xDF\\-']{1,40}(?:\\s+[A-Z\xC4\xD6\xDC][A-Za-z\xC4\xD6\xDC\xE4\xF6\xFC\xDF\\-']{1,40})?)";
var NAME_ONLY_RE = new RegExp(`^${NAME_CORE}$`);
var NAME_PREFIX_RE = new RegExp(`^${NAME_CORE}\\b`);

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/sources/ocr/layouts/month-matrix/skew.ts
var OCR_DESKEW_SLOPE_MAX = Math.tan(25 * Math.PI / 180);

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/convert/parsers/ocr/applyPackMapping.ts
function collectPackCodes(presetMapping, _colors, codeAliases) {
  const codes = /* @__PURE__ */ new Set();
  if (presetMapping) {
    for (const v of Object.values(presetMapping)) {
      const { code } = mappingCode(v);
      if (code) codes.add(code.trim().toUpperCase());
      if (typeof v === "object" && Array.isArray(v.also)) {
        for (const a of v.also) {
          const c = String(a || "").trim().toUpperCase();
          if (c) codes.add(c);
        }
      }
    }
  }
  if (codeAliases) {
    for (const [from, to] of Object.entries(codeAliases)) {
      const a = from.trim().toUpperCase();
      const b = String(to || "").trim().toUpperCase();
      if (a) codes.add(a);
      if (b) codes.add(b);
    }
  }
  return codes;
}
function canonicalizePackCode(code, codeAliases) {
  const u = String(code || "").trim().toUpperCase();
  if (!u || u === "/" || u === "//") return u;
  let hit;
  if (codeAliases) {
    hit = codeAliases[u];
    if (!hit) {
      for (const [from, to] of Object.entries(codeAliases)) {
        if (from.toUpperCase() === u) {
          hit = to;
          break;
        }
      }
    }
  }
  if (!hit) return u;
  const out = String(hit).trim();
  if (out === "/" || out === "//") return out;
  const ou = out.toUpperCase();
  if (ou === "OPTN") return "OPTn";
  if (ou === "OPNN") return "OPNn";
  return ou || u;
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/convert/parsers/engines/shared.ts
function emptyParseResult() {
  return {
    year: "",
    month: "",
    mainEntries: [],
    onCallEntries: [],
    summary: null,
    summaries: []
  };
}
function inferMonthYear(entries) {
  const counts = /* @__PURE__ */ new Map();
  for (const e of entries) {
    const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(e.date || "");
    if (!m) continue;
    const key = `${m[1]}-${m[2]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = "";
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  if (!best) {
    const now = /* @__PURE__ */ new Date();
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, "0")
    };
  }
  const [year, month] = best.split("-");
  return { year, month };
}
function finishParseResult(entries) {
  const { year, month } = inferMonthYear(entries);
  return {
    year,
    month,
    mainEntries: entries,
    onCallEntries: [],
    summary: null,
    summaries: []
  };
}
function toIsoDate(year, month, day) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/convert/parsers/engines/pdf-code-grid.ts
function packCodeSet(mapping, presetName) {
  const preset = resolveDutyCodes(mapping, presetName);
  const codes = collectPackCodes(preset, null, mapping?.codeAliases);
  for (const rule of composeRulesForMapping(mapping)) {
    for (const c of [...rule.codes || [], ...rule.nextDayCodes || []]) {
      const u = String(c || "").trim().toUpperCase();
      if (u) codes.add(u);
    }
  }
  codes.add("/");
  codes.add("//");
  codes.add("-");
  return codes;
}
function holidayCodeSet(preset) {
  const out = /* @__PURE__ */ new Set();
  if (!preset) return out;
  for (const [key, value] of Object.entries(preset)) {
    if (!key.startsWith("SPECIAL:")) continue;
    const { code } = mappingCode(value);
    if (!code) continue;
    const t = mappingType(value);
    if (t === "holiday" || /^feiertag$/i.test(String(value.label || ""))) {
      out.add(code.trim().toUpperCase());
    }
  }
  return out;
}
function isPackDutyToken(raw, codes, codeAliases) {
  const t = String(raw || "").trim();
  if (!t) return false;
  if (t === "-" || t === "/" || t === "//") return true;
  const u = t.toUpperCase();
  if (codes.has(u)) return true;
  return codes.has(canonicalizePackCode(t, codeAliases).toUpperCase());
}
function anyMatch(text, patterns, flags) {
  if (!patterns?.length) return false;
  const f = flags ?? "i";
  return patterns.some((p) => {
    try {
      return new RegExp(p, f).test(text);
    } catch {
      return false;
    }
  });
}
function allMatch(text, patterns, flags) {
  if (!patterns?.length) return true;
  const f = flags ?? "i";
  return patterns.every((p) => {
    try {
      return new RegExp(p, f).test(text);
    } catch {
      return false;
    }
  });
}
function looksLikeCodeGrid(text, config, mapping, preset) {
  const t = String(text || "");
  if (!t.trim()) return false;
  const cg = config?.codeGrid;
  if (!cg) return false;
  if (anyMatch(t, cg.rejectPatterns, cg.rejectFlags)) return false;
  if (!allMatch(t, cg.requirePatterns, cg.requireFlags)) return false;
  if (!/[A-Za-zÄÖÜäöüß]{2,},\s*[A-Za-zÄÖÜäöüß]/.test(t)) return false;
  if (!mapping?.dutyCodes && !mapping?.presets) return false;
  const codes = packCodeSet(mapping, preset);
  const aliases = mapping.codeAliases;
  let hits = 0;
  for (const m of t.match(/\b[A-Za-z][A-Za-z0-9]{0,5}\b|\/\/|\//g) || []) {
    if (m === "-") continue;
    if (isPackDutyToken(m, codes, aliases)) hits++;
  }
  return hits >= (cg.minCodeHits ?? 10);
}
function scanMonthYear(text, cg) {
  const mh = cg?.monthHeader;
  if (!mh?.pattern) return null;
  let re;
  try {
    re = new RegExp(mh.pattern, mh.flags ?? "i");
  } catch {
    return null;
  }
  const m = re.exec(text);
  if (!m) return null;
  const mi = mh.monthGroup ?? 1;
  const yi = mh.yearGroup ?? 2;
  const rawMonth = String(m[mi] || "").trim();
  const year = String(m[yi] || "").trim();
  if (!year) return null;
  if (/^\d{1,2}$/.test(rawMonth)) {
    return { year, month: rawMonth.padStart(2, "0") };
  }
  const map = mh.monthNameMap || {};
  const key = rawMonth.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");
  const month = map[key] || map[rawMonth.toLowerCase()];
  if (!month) return null;
  return { year, month };
}
function normalizeCode(tok, codeAliases) {
  const t = tok.trim();
  if (!t || t === "-") return null;
  if (t === "/" || t === "//") return t;
  return canonicalizePackCode(t, codeAliases);
}
function tokenizeDutyLine(line, codes, codeAliases) {
  const out = [];
  for (const raw of line.trim().split(/\s+/)) {
    if (!raw) continue;
    if (raw === "-") {
      out.push("-");
      continue;
    }
    if (raw === "//" || raw === "/") {
      out.push(raw);
      continue;
    }
    if (/\/\/$/.test(raw) && raw.length > 2) {
      const head = raw.slice(0, -2);
      if (isPackDutyToken(head, codes, codeAliases)) {
        const n = normalizeCode(head, codeAliases);
        if (n) out.push(n);
      }
      out.push("//");
      continue;
    }
    if (/\/$/.test(raw) && raw.length > 1 && !raw.endsWith("//")) {
      const head = raw.slice(0, -1);
      if (isPackDutyToken(head, codes, codeAliases)) {
        const n = normalizeCode(head, codeAliases);
        if (n) out.push(n);
      }
      out.push("/");
      continue;
    }
    if (isPackDutyToken(raw, codes, codeAliases)) {
      const n = normalizeCode(raw, codeAliases);
      if (n) out.push(n);
    }
  }
  return out;
}
function shouldSkipLine(line, cg) {
  if (!line.trim()) return true;
  if (/^\s*\d+\s*$/.test(line)) return true;
  return anyMatch(line, cg?.skipLinePatterns, cg?.skipLineFlags);
}
function assignCodes(person, codes, dayCount) {
  let day = 1;
  for (const c of codes) {
    while (day <= dayCount && (person.days.get(day) || []).length > 0) day++;
    if (day > dayCount) break;
    if (c === "-") {
      day++;
      continue;
    }
    const list = person.days.get(day) || [];
    list.push(c);
    person.days.set(day, list);
    day++;
  }
}
function mergeOverflow(person, codes, dayCount, overflowAttach) {
  const occupied = [...person.days.entries()].filter(([, v]) => v.length > 0).sort((a, b) => a[0] - b[0]);
  if (!occupied.length) {
    assignCodes(person, codes, dayCount);
    return;
  }
  for (const code of codes) {
    if (code === "-") continue;
    const u = code.toUpperCase();
    let placed = false;
    for (const [d, list] of occupied) {
      const head = (list[0] || "").toUpperCase();
      const want = overflowAttach[head];
      if (!want?.includes(u)) continue;
      if (list.some((x) => x.toUpperCase() === u)) continue;
      list.push(code);
      person.days.set(d, list);
      placed = true;
      break;
    }
    if (placed) continue;
    for (let i = occupied.length - 1; i >= 0; i--) {
      const [d, list] = occupied[i];
      if (list.length === 1 && (list[0] === "/" || list[0] === "//")) continue;
      list.push(code);
      person.days.set(d, list);
      placed = true;
      break;
    }
    if (!placed) assignCodes(person, [code], dayCount);
  }
}
function parsePersonBlocksLayout(text, dayCount, codes, codeAliases, overflowAttach, cg) {
  const lines = text.split(/\r?\n/);
  const people = [];
  let current = null;
  let pendingFirst = "";
  const nameStart = /^([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-']+),\s*(.*)$/;
  const flush = () => {
    if (current?.name) people.push(current);
    current = null;
    pendingFirst = "";
  };
  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00a0/g, " ");
    if (shouldSkipLine(line, cg)) continue;
    const nm = nameStart.exec(line.trim());
    if (nm) {
      flush();
      const last = nm[1].trim();
      const rest = nm[2].trim();
      const firstTok = rest.split(/\s+/)[0] || "";
      const looksCode = firstTok && isPackDutyToken(firstTok, codes, codeAliases);
      let first = "";
      let dutyPart = rest;
      if (rest && !looksCode && /^[A-ZÄÖÜa-zäöü]/.test(rest)) {
        const m2 = /^([A-Za-zÄÖÜäöüß\.\-]+)\s+(.*)$/.exec(rest);
        if (m2 && !isPackDutyToken(m2[1], codes, codeAliases)) {
          first = m2[1];
          dutyPart = m2[2];
        } else if (!isPackDutyToken(firstTok, codes, codeAliases) && tokenizeDutyLine(rest, codes, codeAliases).length === 0) {
          first = rest;
          dutyPart = "";
        }
      }
      current = { name: first ? `${last}, ${first}` : `${last},`, days: /* @__PURE__ */ new Map() };
      pendingFirst = first ? "" : "maybe";
      assignCodes(current, tokenizeDutyLine(dutyPart, codes, codeAliases), dayCount);
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    if (pendingFirst === "maybe" && /^[A-ZÄÖÜ][a-zäöüß\-]+$/.test(trimmed) && !isPackDutyToken(trimmed, codes, codeAliases)) {
      current.name = current.name.replace(/,$/, `, ${trimmed}`);
      pendingFirst = "";
      continue;
    }
    const dutyCodes = tokenizeDutyLine(trimmed, codes, codeAliases);
    if (!dutyCodes.length) continue;
    mergeOverflow(current, dutyCodes, dayCount, overflowAttach);
    pendingFirst = "";
  }
  flush();
  return people;
}
function parsePersonBlocksFlat(text, dayCount, codes, codeAliases, overflowAttach) {
  const re = /([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-']+),\s*/g;
  const starts = [];
  let m;
  while (m = re.exec(text)) {
    starts.push({ last: m[1], index: m.index, end: m.index + m[0].length });
  }
  const people = [];
  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i];
    const next = starts[i + 1];
    const slice = text.slice(cur.end, next ? next.index : text.length);
    const tokens = slice.trim().split(/\s+/).filter(Boolean);
    let first = "";
    let dutyStart = 0;
    if (tokens[0] && !isPackDutyToken(tokens[0], codes, codeAliases) && /^[A-ZÄÖÜa-zäöü]/.test(tokens[0])) {
      first = tokens[0];
      dutyStart = 1;
    }
    const dutyRaw = tokens.slice(dutyStart).join(" ");
    const duty = tokenizeDutyLine(dutyRaw, codes, codeAliases);
    const person = {
      name: first ? `${cur.last}, ${first}` : `${cur.last},`,
      days: /* @__PURE__ */ new Map()
    };
    const main = duty.slice(0, dayCount);
    const overflow = duty.slice(dayCount).filter((c) => c !== "-");
    assignCodes(person, main, dayCount);
    if (overflow.length) mergeOverflow(person, overflow, dayCount, overflowAttach);
    people.push(person);
  }
  return people;
}
function countNameLines(text) {
  return (text.match(/(?:^|\n)[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-']+,\s*/g) || []).length;
}
function detectDayCount(text, cg) {
  const pat = cg?.dayHeaderPattern || "^1\\s+2\\s+3\\s+4\\b";
  let re;
  try {
    re = new RegExp(pat, cg?.dayHeaderFlags ?? "m");
  } catch {
    return 31;
  }
  const header = text.split(/\r?\n/).map((l) => l.trim()).find((l) => re.test(l.replace(/\s+/g, " ")) || re.test(l));
  const blob = header || (re.exec(text.replace(/\s+/g, " ")) ? text : "");
  const nums = [...(blob || text).matchAll(/\b(\d{1,2})\b/g)].map((x) => parseInt(x[1], 10));
  const max = Math.max(...nums.filter((n) => n >= 28 && n <= 31), 0);
  return max || 31;
}
function weekdayMon0(iso) {
  return ((/* @__PURE__ */ new Date(iso + "T12:00:00")).getDay() + 6) % 7;
}
function dayFlags(iso, dayCodes, holidays) {
  const holiday = dayCodes.some((c) => holidays.has(c.toUpperCase()));
  const wd = weekdayMon0(iso);
  const weekend = wd >= 5;
  return {
    weekday: !weekend && !holiday,
    weekend: weekend || holiday,
    holiday,
    friday: wd === 4 && !holiday
  };
}
function whenMatches(when, flags, nextFlags) {
  const w = when || "any";
  switch (w) {
    case "any":
      return true;
    case "weekday":
      return flags.weekday;
    case "weekday-mon-thu":
      return flags.weekday && !flags.friday;
    case "friday":
      return flags.friday;
    case "weekend-or-holiday":
      return flags.weekend;
    case "next-day-weekend-or-holiday":
      return !!nextFlags?.weekend;
    case "next-day-weekday":
      return !!nextFlags?.weekday;
    default:
      return true;
  }
}
function tryCompose(dayCodes, nextCodes, rules, flags, nextFlags) {
  const have = new Set(dayCodes.map((c) => c.toUpperCase()));
  const haveNext = new Set(nextCodes.map((c) => c.toUpperCase()));
  for (const rule of rules) {
    if (!whenMatches(rule.when, flags, nextFlags)) continue;
    const need = rule.codes.map((c) => c.toUpperCase());
    if (!need.every((c) => have.has(c))) continue;
    const needNext = (rule.nextDayCodes || []).map((c) => c.toUpperCase());
    if (needNext.length && !needNext.every((c) => haveNext.has(c))) continue;
    return { rule, used: new Set(need), usedNext: new Set(needNext) };
  }
  return null;
}
function entriesForPerson(person, year, month, dayCount, mapping, presetName) {
  const preset = resolveDutyCodes(mapping, presetName);
  const rules = composeRulesForMapping(mapping);
  const holidays = holidayCodeSet(preset);
  const out = [];
  const consumedNext = /* @__PURE__ */ new Set();
  for (let day = 1; day <= dayCount; day++) {
    const iso = toIsoDate(year, month, String(day));
    const rawDay = person.days.get(day) || [];
    const codes = rawDay.filter((c) => !holidays.has(c.toUpperCase()));
    if (rawDay.length && !codes.length) continue;
    const nextIso = toIsoDate(year, month, String(day + 1));
    const nextCodes = (person.days.get(day + 1) || []).filter(
      (c) => !consumedNext.has(`${day + 1}:${c.toUpperCase()}`)
    );
    const flags = dayFlags(iso, rawDay, holidays);
    const nextFlags = day < dayCount ? dayFlags(nextIso, person.days.get(day + 1) || [], holidays) : dayFlags(iso, [], holidays);
    const remaining = [...codes];
    const composed = tryCompose(remaining, nextCodes, rules, flags, nextFlags);
    if (composed) {
      out.push({
        type: composed.rule.label || composed.rule.id,
        date: iso,
        start: composed.rule.start,
        end: composed.rule.end,
        isValidated: true,
        isWork: true
      });
      for (const c of composed.used) {
        const i = remaining.findIndex((x) => x.toUpperCase() === c);
        if (i >= 0) remaining.splice(i, 1);
      }
      for (const c of composed.usedNext) consumedNext.add(`${day + 1}:${c}`);
    }
    for (const code of remaining) {
      const u = code.toUpperCase();
      if (consumedNext.has(`${day}:${u}`)) continue;
      if (isSpecialPackCode(code, preset)) {
        if (code === "/" || code === "//") continue;
        out.push({
          type: code,
          date: iso,
          allDay: true,
          isSpecial: true,
          isValidated: true
        });
        continue;
      }
      const range = timeRangeForCode(code, preset);
      if (!range) {
        out.push({ type: code, date: iso, allDay: true, isValidated: false });
        continue;
      }
      out.push({
        type: code,
        date: iso,
        start: range.start,
        end: range.end,
        isValidated: true,
        isWork: true
      });
    }
  }
  return out;
}
function parsePdfCodeGrid(text, config, opts = {}) {
  const mapping = opts.mapping;
  if (!looksLikeCodeGrid(text, config, mapping, opts.preset)) return emptyParseResult();
  const cg = config?.codeGrid;
  const ym = scanMonthYear(text, cg);
  if (!ym || !mapping?.dutyCodes && !mapping?.presets) return emptyParseResult();
  const presetName = opts.preset || "default";
  if (!presetName) return emptyParseResult();
  const codes = packCodeSet(mapping, presetName);
  const overflowAttach = overflowAttachFromComposeRules(composeRulesForMapping(mapping));
  const dayCount = detectDayCount(text, cg);
  const people = countNameLines(text) >= 2 ? parsePersonBlocksLayout(
    text,
    dayCount,
    codes,
    mapping.codeAliases,
    overflowAttach,
    cg
  ) : parsePersonBlocksFlat(
    text,
    dayCount,
    codes,
    mapping.codeAliases,
    overflowAttach
  );
  let filtered = people;
  const filter = String(opts.personFilter || "").trim();
  let personPickRequired = false;
  if (filter) {
    const key = filter.toLowerCase();
    const hit = people.filter((p) => {
      const n = p.name.toLowerCase();
      return n.includes(key) || key.includes(n.split(",")[0] || "");
    });
    filtered = hit;
  } else if (people.length > 1) {
    // Mehrpersonen-Plan: ohne Namenswahl keine gemischten Kalendereinträge
    filtered = [];
    personPickRequired = true;
  }
  const entries = [];
  for (const p of filtered) {
    entries.push(...entriesForPerson(p, ym.year, ym.month, dayCount, mapping, presetName));
  }
  const result = finishParseResult(entries);
  result.year = ym.year;
  result.month = ym.month;
  result.people = people.map((p) => p.name).filter(Boolean);
  result.personPickRequired = personPickRequired;
  return result;
}
export {
  looksLikeCodeGrid,
  parsePdfCodeGrid
};
