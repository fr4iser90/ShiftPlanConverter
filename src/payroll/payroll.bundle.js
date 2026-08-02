// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/payroll/parseTarifHeader.ts
function parseTarifFromPayslipHeader(text) {
  const tarifLabel = (() => {
    const m = /Tarif\s+([^\n]+)/i.exec(text);
    return m?.[1]?.replace(/\s+/g, " ").trim();
  })();
  let eg;
  let stage;
  let workHoursPerWeek;
  const pflege = /Gruppe\s+(P?\d+)\s+Stufe\s+(\d+)/i.exec(text);
  if (pflege) {
    eg = pflege[1].toUpperCase().startsWith("P") ? pflege[1].toUpperCase() : `P${pflege[1]}`;
    stage = Number(pflege[2]);
  }
  const aerzte = /(?:Entgeltgruppe|EG)\s*([IVX]+|\d+)\s*(?:\/|,)?\s*Stufe\s*(\d+)/i.exec(text);
  if (!eg && aerzte) {
    eg = aerzte[1].toUpperCase();
    stage = Number(aerzte[2]);
  }
  const hours = /\[\s*(\d+[.,]\d+)\s*Stunden/i.exec(text) || /(\d+[.,]\d+)\s*Stunden\s*je\s*Woche/i.exec(text);
  if (hours) {
    const n = Number(hours[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) workHoursPerWeek = n;
  }
  return { eg, stage, workHoursPerWeek, tarifLabel };
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/convert/parsers/engines/pdf-payslip.ts
var MONTHS_DE = {
  januar: 1,
  februar: 2,
  m\u00E4rz: 3,
  maerz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12
};
function money(n) {
  return Math.round(n * 100) / 100;
}
function parseDeAmount(raw) {
  const s = String(raw || "").trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!s || s === "\u2013" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? money(n) : null;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function previousMonth(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const d = new Date(Number(m[1]), Number(m[2]) - 2, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function parsePayMonth(text) {
  const m = /Abrechnungsmonat\s+([A-Za-zÄÖÜäöüß]+)\s+(\d{4})/i.exec(text);
  if (!m) return null;
  const key = m[1].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const mon = MONTHS_DE[m[1].toLowerCase()] || MONTHS_DE[key] || MONTHS_DE[key.replace("a", "ae").replace("o", "oe").replace("u", "ue")];
  const fixed = mon || { jan: 1, feb: 2, mar: 3, apr: 4, mai: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dez: 12 }[key.slice(0, 3)];
  const year = Number(m[2]);
  if (!fixed || !year) return null;
  return `${year}-${pad2(fixed)}`;
}
var MONEY_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}/g;
function parsePayslipText(text, opts = {}) {
  const payMonth = parsePayMonth(text);
  if (!payMonth) {
    throw new Error("Verdienstnachweis: Abrechnungsmonat nicht gefunden");
  }
  const lines = [];
  const seen = /* @__PURE__ */ new Set();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = /^([0-9A-Z]{2,3})\s+(?:\((?:JLL)\)\s+)?(.+)$/.exec(line);
    if (!m) continue;
    const la = m[1];
    let rest = m[2].trim();
    if (la === "LA") continue;
    let qty = null;
    let unit = null;
    let rate = null;
    const qtyM = /(\d+,\d{2})\s*(Std\.?|Tage)\b/i.exec(rest);
    if (qtyM) {
      qty = parseDeAmount(qtyM[1]);
      unit = /tage/i.test(qtyM[2]) ? "Tage" : "Std";
      rest = rest.replace(qtyM[0], " ").replace(/\s+/g, " ").trim();
    }
    const moneyTokens = [...rest.matchAll(MONEY_RE)].map((x) => x[0]);
    if (!moneyTokens.length) continue;
    let amount = null;
    if (qty != null && moneyTokens.length >= 2) {
      rate = parseDeAmount(moneyTokens[0]);
      amount = parseDeAmount(moneyTokens[1]);
    } else {
      amount = parseDeAmount(moneyTokens[0]);
    }
    if (amount == null) continue;
    if (seen.has(la)) continue;
    seen.add(la);
    const textPart = rest.replace(MONEY_RE, "").replace(/\s+/g, " ").trim();
    lines.push({
      la,
      text: textPart || la,
      qty,
      unit,
      rate,
      amount
    });
  }
  if (!lines.length) {
    throw new Error("Verdienstnachweis: keine Lohnarten-Zeilen gefunden");
  }
  const brg = lines.find((l) => l.la === "BRG");
  const tarif = parseTarifFromPayslipHeader(text);
  return {
    payMonth,
    serviceMonth: previousMonth(payMonth),
    tarifLabel: tarif.tarifLabel,
    eg: tarif.eg,
    stage: tarif.stage,
    workHoursPerWeek: tarif.workHoursPerWeek,
    lines,
    gross: brg?.amount,
    workplaceId: opts.workplaceId,
    source: opts.source || "pdf",
    importedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function isLikelyPayslipText(text) {
  return /Verdienstabrechnung/i.test(text) && /Abrechnungsmonat/i.test(text) && /\b(LA|BRG)\b/.test(text);
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/convert/shiftMapping.ts
function mappingType(value) {
  if (!value || typeof value !== "object") return null;
  const t = String(value.type || "").trim().toLowerCase();
  return t || null;
}
function mappingAlso(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.also)) return [];
  return value.also.map((c) => String(c || "").trim()).filter(Boolean);
}
function shiftTypeForCode(code, mapping, codeAliases) {
  let u = String(code || "").trim().toUpperCase();
  if (!u) return null;
  if (codeAliases) {
    for (const [from, to] of Object.entries(codeAliases)) {
      if (from.toUpperCase() === u) {
        u = String(to || "").trim().toUpperCase() || u;
        break;
      }
    }
  }
  for (const value of Object.values(mapping)) {
    if (typeof value !== "object") continue;
    const primary = String(value.code || "").trim().toUpperCase();
    if (primary === u) return mappingType(value);
    for (const a of mappingAlso(value)) {
      if (a.toUpperCase() === u) return mappingType(value);
    }
  }
  return null;
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/payroll/calendar.ts
function pad22(n) {
  return String(n).padStart(2, "0");
}
function isoDate(d) {
  return `${d.getFullYear()}-${pad22(d.getMonth() + 1)}-${pad22(d.getDate())}`;
}
function parseDateLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
function sameYearMonth(a, b) {
  return String(a || "").slice(0, 7) === String(b || "").slice(0, 7);
}
function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = (h + l - 7 * m + 114) % 31 + 1;
  return new Date(year, month - 1, day);
}
function saxonyHolidayMap(year) {
  const map = {};
  const add = (date, name) => {
    map[date] = name;
  };
  const e = easterDate(year);
  add(`${year}-01-01`, "Neujahr");
  add(isoDate(addDays(e, -2)), "Karfreitag");
  add(isoDate(addDays(e, 1)), "Ostermontag");
  add(`${year}-05-01`, "Tag der Arbeit");
  add(isoDate(addDays(e, 39)), "Christi Himmelfahrt");
  add(isoDate(addDays(e, 50)), "Pfingstmontag");
  add(`${year}-10-03`, "Tag der Deutschen Einheit");
  add(`${year}-10-31`, "Reformationstag");
  for (let day = 16; day <= 22; day++) {
    const d = new Date(year, 10, day);
    if (d.getDay() === 3) {
      add(isoDate(d), "Bu\xDF- und Bettag");
      break;
    }
  }
  add(`${year}-12-25`, "1. Weihnachtstag");
  add(`${year}-12-26`, "2. Weihnachtstag");
  return map;
}
function calendarInfo(dateStr, extraHolidays = {}) {
  const d = parseDateLocal(dateStr);
  if (!d) return null;
  const w = d.getDay();
  const names = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const next = addDays(d, 1);
  const nextIso = isoDate(next);
  const holidays = { ...saxonyHolidayMap(d.getFullYear()), ...extraHolidays };
  const hn = holidays[dateStr] || "";
  const nextH = holidays[nextIso] || "";
  return {
    iso: dateStr,
    weekday: w,
    weekdayName: names[w],
    isSaturday: w === 6,
    isSunday: w === 0,
    isFriday: w === 5,
    isHoliday: !!hn,
    holiday: hn,
    nextIso,
    nextIsSunday: next.getDay() === 0,
    nextIsSaturday: next.getDay() === 6,
    nextIsHoliday: !!nextH,
    nextHoliday: nextH
  };
}
function parseDeHours(raw) {
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function durationHours(start, end) {
  const parse = (t) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  if (!start || !end) return null;
  const a = parse(start);
  const b = parse(end);
  if (a == null || b == null) return null;
  let mins = b - a;
  if (mins <= 0) mins += 24 * 60;
  return Math.round(mins / 60 * 100) / 100;
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/payroll/resolveHours.ts
function money2(n) {
  return Math.round((n || 0) * 100) / 100;
}
function emptyHours() {
  return {
    paidBd: 0,
    timeOff: 0,
    bd15: 0,
    bdSunHol25: 0,
    bdNight: 0,
    bdNight004: 0,
    activeNight: 0,
    sundayReg: 0,
    holidayReg: 0,
    saturdayReg: 0
  };
}
function addHours(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const key = k;
    out[key] = money2((out[key] || 0) + (v || 0));
  }
  return out;
}
function isNightPattern(id) {
  return id.includes("NACHT") || id.endsWith("MO_DO") || id.endsWith("FR_VF");
}
function isTagPattern(id) {
  return id.includes("_TAG");
}
function deriveArztDienstId(dateStr, choice, isTransfer = false) {
  const ci = calendarInfo(dateStr);
  const prefix = String(choice || "OP").toUpperCase().startsWith("ITS") ? "ITS" : "OP";
  if (isTransfer || String(choice).includes("TRANSFER")) {
    return prefix === "ITS" ? "UEBERTRAG_ITS" : "UEBERTRAG_OP";
  }
  if (!ci) return prefix === "ITS" ? "ITS_MO_DO" : "OP_MO_DO";
  const nextFree = ci.nextIsHoliday || ci.nextIsSaturday || ci.nextIsSunday;
  const isTag = String(choice).includes("TAG");
  const isNight = String(choice).includes("NACHT") || !isTag && (ci.isSaturday || ci.isSunday || ci.isHoliday);
  if (ci.isSaturday || ci.isSunday || ci.isHoliday) {
    if (isTag || String(choice).includes("TAG")) return `${prefix}_SA_SO_FT_TAG`;
    if (prefix === "ITS") {
      if (ci.isSaturday) return "ITS_SA_NACHT";
      if ((ci.isSunday || ci.isHoliday) && !nextFree) return "ITS_SO_FT_NACHT_VWT";
      return "ITS_FT_NACHT_VF";
    }
    return nextFree ? "OP_SA_SO_FT_NACHT_VF" : "OP_SO_FT_NACHT_VWT";
  }
  if (ci.isFriday || ci.nextIsHoliday) return `${prefix}_FR_VF`;
  return `${prefix}_MO_DO`;
}
function choiceFromEntryCode(code) {
  const c = code.toUpperCase();
  if (c.startsWith("ITS") || c.includes("HAUS")) return "ITS";
  if (c === "OP" || c === "RD" || c.startsWith("OP") || c.includes("RUF")) return "OP";
  if (c.startsWith("BEREIT")) return "ITS";
  return c;
}
function localHolidayBd25(dienstId, dateStr) {
  const ci = calendarInfo(dateStr);
  if (!ci) return null;
  const id = dienstId;
  const p = id.startsWith("ITS") ? "ITS" : "OP";
  if (p === "ITS") {
    if (id === "ITS_FR_VF" && ci.nextIsHoliday) return sameYearMonth(dateStr, ci.nextIso) ? 9 : 0;
    if (ci.isHoliday && id === "ITS_SA_SO_FT_TAG") return 10.5;
    if (ci.isHoliday && (id === "ITS_SO_FT_NACHT_VWT" || id === "ITS_FT_NACHT_VF")) {
      return ci.nextIsHoliday ? 10.5 : 3.5;
    }
    if (id === "ITS_SA_NACHT") return 0;
  }
  if (p === "OP") {
    if (id === "OP_FR_VF" && ci.nextIsHoliday) return sameYearMonth(dateStr, ci.nextIso) ? 8 : 0;
    if (ci.isHoliday && id === "OP_SA_SO_FT_TAG") return 12;
    if (ci.isHoliday && (id === "OP_SO_FT_NACHT_VWT" || id === "OP_SA_SO_FT_NACHT_VF")) {
      return ci.nextIsHoliday ? 12 : 4;
    }
  }
  return null;
}
function currentMonthNightPartBeforeMidnight(id) {
  if (id.startsWith("ITS_") && id.includes("NACHT")) return 3.5;
  return 4;
}
function applyArztCalendarOverrides(hours, def, dateStr, isTransfer) {
  const ci = calendarInfo(dateStr);
  if (!ci) return hours;
  let h = { ...hours };
  if (isTransfer || def.kat === "\xDCbertrag") {
    h.bdSunHol25 = 0;
    h.bdNight = 2;
    h.bdNight004 = 4;
    h.activeNight = 0;
    h.sundayReg = 0;
    h.holidayReg = 0;
    h.paidBd = 0;
    h.bd15 = 0;
    const p = def.id === "UEBERTRAG_ITS" ? "ITS" : "OP";
    if (ci.isHoliday) h.bdSunHol25 = p === "ITS" ? 9 : 8;
    if (p === "ITS" && ci.isSunday && !ci.isHoliday) h.sundayReg = 1;
    return h;
  }
  const crossesMonth = ci.nextIso && !sameYearMonth(dateStr, ci.nextIso) && isNightPattern(def.id);
  if (crossesMonth) {
    h.bdNight004 = 0;
    h.bdNight = currentMonthNightPartBeforeMidnight(def.id);
  }
  const bd25 = localHolidayBd25(def.id, dateStr);
  if (bd25 !== null) h.bdSunHol25 = bd25;
  if (def.kat === "Hausdienst") {
    const reg = isTagPattern(def.id) ? 2 : isNightPattern(def.id) ? 1 : 0;
    h.sundayReg = 0;
    h.holidayReg = 0;
    if (ci.isHoliday) h.holidayReg = reg;
    else if (ci.isSunday) h.sundayReg = reg;
    else if (def.id === "ITS_SA_NACHT" && ci.nextIsSunday) h.sundayReg = 1;
  }
  return h;
}
function findByCode(profile, code) {
  const c = code.toUpperCase();
  return profile.dienstarten.find(
    (d) => (d.codes || []).some((x) => x.toUpperCase() === c)
  );
}
function findById(profile, id) {
  return profile.dienstarten.find((d) => d.id === id);
}
function findByMatchType(profile, matchType) {
  const t = matchType.trim().toLowerCase();
  return profile.dienstarten.find((d) => String(d.matchType || "").trim().toLowerCase() === t);
}
function resolvePflegeShiftType(entry, code, presetMapping, codeAliases) {
  if (presetMapping) {
    const byCode = shiftTypeForCode(code, presetMapping, codeAliases);
    if (byCode) return byCode;
    if (entry.start && entry.end) {
      const key = `${entry.start}-${entry.end}`;
      const t = mappingType(presetMapping[key]);
      if (t) return t;
    }
  }
  return null;
}
function hoursForEntry(profile, entry, opts) {
  const code = String(entry.type || "").trim().toUpperCase();
  if (!code) return { hours: emptyHours(), matched: false };
  if (entry.allDay) {
    return { hours: emptyHours(), matched: true, note: "allDay" };
  }
  if (profile.tarifFamily === "avr-aerzte") {
    const choice = choiceFromEntryCode(code);
    const isTransfer = /UEBERTRAG|TRANSFER|ÜBERTRAG/i.test(code);
    let def2 = findByCode(profile, code);
    let dienstId = def2?.id;
    if (!def2 || /^(ITS|OP|RD)$/i.test(code) || code.startsWith("BEREIT")) {
      dienstId = deriveArztDienstId(entry.date, choice, isTransfer);
      def2 = findById(profile, dienstId);
    }
    if (!def2) return { hours: emptyHours(), matched: false };
    let h2 = addHours(emptyHours(), def2.hours);
    h2 = applyArztCalendarOverrides(h2, def2, entry.date, isTransfer || def2.kat === "\xDCbertrag");
    return { hours: h2, matched: true, dienstartId: def2.id };
  }
  const shiftType = resolvePflegeShiftType(
    entry,
    code,
    opts?.presetMapping,
    opts?.codeAliases
  );
  const def = (shiftType ? findByMatchType(profile, shiftType) : void 0) || // Legacy fallback if profile still lists codes
  findByCode(profile, code);
  if (!def) return { hours: emptyHours(), matched: false };
  let h = addHours(emptyHours(), def.hours);
  const ci = calendarInfo(entry.date);
  if (ci?.isSaturday && def.kat === "Arbeit") {
    const dur = parseDeHours(entry.actual) || durationHours(entry.start, entry.end) || 0;
    if (dur > 0) h.saturdayReg = money2(dur);
  }
  const isNightRule = String(def.matchType || "").toLowerCase() === "night" || def.id === "B38_NIGHT" || def.id === "B39_NIGHT" || def.id === "NIGHT";
  if (ci && isNightRule) {
    const crosses = ci.nextIso && !sameYearMonth(entry.date, ci.nextIso);
    if (crosses) {
      h.bdNight004 = 0;
      h.bdNight = Math.min(h.bdNight, 4);
    }
  }
  return {
    hours: h,
    matched: Object.keys(def.hours || {}).length > 0 || h.saturdayReg > 0,
    dienstartId: def.id
  };
}
function sumHoursForEntries(profile, entries, opts) {
  let hours = emptyHours();
  let matched = 0;
  let unmatched = 0;
  let urlaubDays = 0;
  for (const e of entries) {
    const code = String(e.type || "").trim().toUpperCase();
    if (e.allDay && /URLAUB|URLTV|U\b|KRANK|KROAU/.test(code)) {
      if (/URLAUB|URLTV|^U$/.test(code)) urlaubDays += 1;
      matched += 1;
      continue;
    }
    const r = hoursForEntry(profile, e, opts);
    if (!r.matched) {
      if (code) unmatched += 1;
      continue;
    }
    if (r.note === "allDay") continue;
    matched += 1;
    hours = addHours(hours, r.hours);
  }
  return { hours, matched, unmatched, urlaubDays };
}

// ../../home/fr4iser/Documents/Git/ShiftPlanConverter-Mobile/src/payroll/check.ts
function money3(n) {
  return Math.round((n || 0) * 100) / 100;
}
function pad23(n) {
  return String(n).padStart(2, "0");
}
function previousYm(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const d = new Date(Number(m[1]), Number(m[2]) - 2, 1);
  return `${d.getFullYear()}-${pad23(d.getMonth() + 1)}`;
}
function entriesInMonth(entries, ym, workplaceId) {
  return entries.filter((e) => {
    if (workplaceId && e.workplaceId && e.workplaceId !== workplaceId) return false;
    return String(e.date || "").startsWith(ym);
  });
}
function lohnartText(profile, la) {
  return profile.lohnarten.find((l) => l.la === la)?.text || la;
}
function shouldCompare(profile, la) {
  const def = profile.lohnarten.find((l) => l.la === la);
  if (!def) return true;
  if (def.compare === false) return false;
  return def.kind === "gross" || def.kind === "zuschlag";
}
function lineByLa(lines, la) {
  return lines.find((l) => l.la === la);
}
function resolveWorkPct(profile, tarif) {
  if (tarif.workPct != null && tarif.workPct > 0) return tarif.workPct;
  const hours = tarif.workHoursPerWeek;
  const full = tarif.fullWeekHours || profile.fullWeekHours || 38.5;
  if (hours != null && hours > 0 && full > 0) {
    return money3(hours / full * 100);
  }
  return 100;
}
function runPayrollCheck(opts) {
  const { profile, payslip } = opts;
  const tarif = opts.tarif || {};
  const payMonth = payslip.payMonth;
  const serviceMonth = payslip.serviceMonth || previousYm(payMonth);
  const diagnostics = [];
  const monthEntries = entriesInMonth(opts.entries, serviceMonth, opts.workplaceId);
  if (!monthEntries.length) {
    diagnostics.push(
      `Keine importierten Dienste f\xFCr den Dienstmonat ${serviceMonth}. Bitte zuerst den Dienstplan/die Zeitabrechnung f\xFCr diesen Monat konvertieren \u2014 sonst bleibt Soll f\xFCr Bereitschaft und Zuschl\xE4ge bei 0.`
    );
  }
  const { hours: hourSums, matched, unmatched, urlaubDays } = sumHoursForEntries(
    profile,
    monthEntries,
    {
      presetMapping: opts.presetMapping,
      codeAliases: opts.codeAliases
    }
  );
  if (monthEntries.length && unmatched) {
    diagnostics.push(
      `${unmatched} Schicht(en) ohne Abrechnungsregel (Codes noch nicht kalibriert).`
    );
  }
  if (matched) {
    diagnostics.push(`${matched} Schicht(en) \xFCber Dienstarten-Profile gematcht.`);
  }
  const expected = /* @__PURE__ */ new Map();
  const workPct = resolveWorkPct(profile, tarif);
  const eg = tarif.eg || payslip.eg || profile.egRows?.[0]?.eg;
  const stage = tarif.stage || payslip.stage || 1;
  const egRow = profile.egRows?.find((r) => r.eg === eg);
  const stIdx = Math.max(0, stage - 1);
  const divisor = profile.hourDivisor || 173.92;
  if (profile.tarifFamily === "avr-aerzte") {
    if (!egRow) {
      diagnostics.push("\xC4rzte: Entgeltgruppe/Stufe setzen, damit Soll berechnet wird.");
    } else {
      const fullBase = egRow.salary[stIdx] || 0;
      const bd = egRow.bd[stIdx] || 0;
      const base = money3(fullBase * workPct / 100);
      const sbIdx = eg === "IV" ? 1 : 2;
      const surchargeBase = egRow.salary[sbIdx] || fullBase;
      const baseHourly = surchargeBase / divisor;
      const rateBd = money3(bd);
      const rateBd15 = money3(bd * 0.15);
      const rateBd25 = money3(bd * 0.25);
      const rateNightActive = money3(baseHourly * 0.2);
      const rateSun = money3(baseHourly * 0.25);
      const rateHol = money3(baseHourly * 0.35);
      expected.set("100", { qty: null, rate: null, amount: base });
      const vl = tarif.vlAg ?? profile.defaults?.vlAg ?? 6.65;
      if (vl) expected.set("200", { qty: null, rate: null, amount: money3(vl * workPct / 100) });
      if (tarif.shiftAllowance) {
        expected.set("245", {
          qty: null,
          rate: null,
          amount: money3(315 * workPct / 100)
        });
      }
      if (hourSums.paidBd) {
        expected.set("304", {
          qty: money3(hourSums.paidBd),
          rate: rateBd,
          amount: money3(hourSums.paidBd * rateBd)
        });
      }
      if (hourSums.activeNight) {
        expected.set("314", {
          qty: money3(hourSums.activeNight),
          rate: rateNightActive,
          amount: money3(hourSums.activeNight * rateNightActive)
        });
      }
      if (hourSums.bdSunHol25) {
        expected.set("361", {
          qty: money3(hourSums.bdSunHol25),
          rate: rateBd25,
          amount: money3(hourSums.bdSunHol25 * rateBd25)
        });
      }
      if (hourSums.sundayReg) {
        expected.set("310", {
          qty: money3(hourSums.sundayReg),
          rate: rateSun,
          amount: money3(hourSums.sundayReg * rateSun)
        });
      }
      if (hourSums.holidayReg) {
        expected.set("31F", {
          qty: money3(hourSums.holidayReg),
          rate: rateHol,
          amount: money3(hourSums.holidayReg * rateHol)
        });
      }
      if (hourSums.bdNight) {
        expected.set("316", {
          qty: money3(hourSums.bdNight),
          rate: rateBd15,
          amount: money3(hourSums.bdNight * rateBd15)
        });
      }
      if (hourSums.bdNight004) {
        expected.set("317", {
          qty: money3(hourSums.bdNight004),
          rate: rateBd15,
          amount: money3(hourSums.bdNight004 * rateBd15)
        });
      }
      if (hourSums.bd15) {
        expected.set("345", {
          qty: money3(hourSums.bd15),
          rate: rateBd15,
          amount: money3(hourSums.bd15 * rateBd15)
        });
      }
      const ukDays = tarif.ukDays ?? 0;
      const ukRate = tarif.ukRate ?? 0;
      if (ukDays && ukRate) {
        expected.set("34U", {
          qty: money3(ukDays),
          rate: money3(ukRate),
          amount: money3(ukDays * ukRate)
        });
      }
    }
  } else if (profile.tarifFamily === "avr-c-pflege") {
    const base = lineByLa(payslip.lines, "100")?.amount ?? (egRow?.salary[stIdx] != null ? money3((egRow.salary[stIdx] || 0) * workPct / 100) : 0);
    if (base) expected.set("100", { qty: null, rate: null, amount: money3(base) });
    const z1 = tarif.zulage2Y1 ?? lineByLa(payslip.lines, "2Y1")?.amount ?? 0;
    const z7 = tarif.zulage2Z7 ?? lineByLa(payslip.lines, "2Z7")?.amount ?? 0;
    if (z1) expected.set("2Y1", { qty: null, rate: null, amount: money3(z1) });
    if (z7) expected.set("2Z7", { qty: null, rate: null, amount: money3(z7) });
    const shiftIst = lineByLa(payslip.lines, "245")?.amount;
    if (shiftIst != null && shiftIst !== 0) {
      expected.set("245", { qty: null, rate: null, amount: money3(shiftIst) });
    }
    const bdRate = tarif.bdRate ?? lineByLa(payslip.lines, "304")?.rate ?? egRow?.bd[stIdx] ?? 0;
    const rateBd15 = money3(bdRate * 0.15);
    const rateSat = lineByLa(payslip.lines, "362")?.rate ?? lineByLa(payslip.lines, "314")?.rate ?? 0;
    if (hourSums.paidBd && bdRate) {
      expected.set("304", {
        qty: money3(hourSums.paidBd),
        rate: money3(bdRate),
        amount: money3(hourSums.paidBd * bdRate)
      });
    }
    if (hourSums.bdNight && rateBd15) {
      expected.set("316", {
        qty: money3(hourSums.bdNight),
        rate: rateBd15,
        amount: money3(hourSums.bdNight * rateBd15)
      });
    }
    if (hourSums.bdNight004 && rateBd15) {
      expected.set("317", {
        qty: money3(hourSums.bdNight004),
        rate: rateBd15,
        amount: money3(hourSums.bdNight004 * rateBd15)
      });
    }
    if (hourSums.activeNight && rateSat) {
      expected.set("314", {
        qty: money3(hourSums.activeNight),
        rate: rateSat,
        amount: money3(hourSums.activeNight * rateSat)
      });
    }
    if (hourSums.saturdayReg && rateSat) {
      expected.set("362", {
        qty: money3(hourSums.saturdayReg),
        rate: rateSat,
        amount: money3(hourSums.saturdayReg * rateSat)
      });
    }
    const ukLine = lineByLa(payslip.lines, "34U");
    const ukDays = tarif.ukDays ?? urlaubDays ?? ukLine?.qty ?? 0;
    const ukRate = tarif.ukRate ?? ukLine?.rate ?? 0;
    if (ukLine?.amount != null && (ukDays || ukRate)) {
      expected.set("34U", {
        qty: ukLine.qty,
        rate: ukLine.rate,
        amount: money3(ukLine.amount)
      });
    } else if (ukDays && ukRate) {
      expected.set("34U", {
        qty: money3(ukDays),
        rate: money3(ukRate),
        amount: money3(ukDays * ukRate)
      });
    } else if (urlaubDays && !ukRate) {
      diagnostics.push(
        `${urlaubDays} Urlaubstag(e) \u2014 U/K-Satz erscheint nach VN-Import.`
      );
    }
  }
  const las = /* @__PURE__ */ new Set();
  for (const l of payslip.lines) {
    if (shouldCompare(profile, l.la) || expected.has(l.la)) las.add(l.la);
  }
  for (const la of expected.keys()) las.add(la);
  const ordered = [
    ...profile.lohnarten.map((l) => l.la).filter((la) => las.has(la)),
    ...[...las].filter((la) => !profile.lohnarten.some((l) => l.la === la))
  ];
  const rows = [];
  let expectedGross = 0;
  for (const la of ordered) {
    if (la === "BRG" || la === "GSN" || la === "AZB" || la === "SZF") continue;
    const exp = expected.get(la);
    const act = lineByLa(payslip.lines, la);
    const expectedAmount = exp?.amount ?? 0;
    const actualAmount = act?.amount ?? null;
    const ok = exp == null || actualAmount == null ? null : Math.abs(actualAmount - expectedAmount) < 0.02;
    if (exp) expectedGross += expectedAmount;
    rows.push({
      la,
      text: act?.text || lohnartText(profile, la),
      expectedQty: exp?.qty ?? null,
      expectedRate: exp?.rate ?? null,
      expectedAmount: exp ? expectedAmount : 0,
      actualQty: act?.qty ?? null,
      actualRate: act?.rate ?? null,
      actualAmount,
      delta: exp && actualAmount != null ? money3(actualAmount - expectedAmount) : null,
      ok
    });
  }
  return {
    payMonth,
    serviceMonth,
    rows,
    diagnostics,
    expectedGross: money3(expectedGross),
    actualGross: payslip.gross ?? lineByLa(payslip.lines, "BRG")?.amount ?? null
  };
}
export {
  isLikelyPayslipText,
  parsePayslipText,
  runPayrollCheck
};
