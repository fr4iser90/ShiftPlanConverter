/**
 * Abrechnungsprüfung UI (user-facing DE label).
 * Code module name stays English: payroll.
 */

import { isLikelyPayslipText, parsePayslipText, runPayrollCheck } from './payroll/payroll.bundle.js';
import { loadPayrollProfile } from './shiftTypesLoader.js';
import { resolvePresetTable } from './mappingNormalize.js';

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Extract a short “Stand / Gültigkeit” line from profile.notes. */
export function summarizeTariffNotes(notes) {
  if (!Array.isArray(notes) || !notes.length) return null;
  const joined = notes.join(' ');
  const stand =
    joined.match(/Stand\s+\d{1,2}\.\d{1,2}\.\d{4}/i)?.[0] ||
    joined.match(
      /gültig(?:\s+ab)?\s+\d{1,2}\.\d{1,2}\.\d{4}(?:\s*[–\-]\s*\d{1,2}\.\d{1,2}\.\d{4})?/i
    )?.[0] ||
    null;
  const anlage = joined.match(/Anlage\s+\d+/i)?.[0] || null;
  const rk = joined.match(/RK\s+Ost/i)?.[0] || null;
  const parts = [anlage, rk, stand].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  return notes[0].slice(0, 160) + (notes[0].length > 160 ? '…' : '');
}

/**
 * @param {{
 *   krankenhaus: () => string,
 *   mapping: () => object|null,
 *   preset: () => string,
 *   getShiftEntries: () => object[],
 *   extractTextFromPdfBuffer: (buf: ArrayBuffer) => Promise<string>,
 * }} ctx
 */
export function initPayrollUi(ctx) {
  const fileInput = document.getElementById('payslipInput');
  const runBtn = document.getElementById('payrollCheckBtn');
  const out = document.getElementById('payrollResults');
  const dropLabel = document.getElementById('payslipDropLabel');
  const dropzone = document.getElementById('payslipDropzone');
  if (!fileInput || !runBtn || !out) return;

  const refresh = () => refreshPayrollTariffNotice(ctx);
  refresh();

  const syncPayslipLabel = () => {
    if (!dropLabel) return;
    const f = fileInput.files && fileInput.files[0];
    dropLabel.textContent = f
      ? f.name
      : 'Verdienstnachweis-PDF auswählen oder hierher ziehen';
    if (dropzone) {
      dropzone.classList.toggle('border-blue-400', !!f);
      dropzone.classList.toggle('bg-blue-50', !!f);
    }
  };
  fileInput.addEventListener('change', syncPayslipLabel);

  runBtn.addEventListener('click', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      alert('Bitte zuerst einen Verdienstnachweis (PDF) wählen.');
      return;
    }
    const mapping = ctx.mapping();
    if (!mapping?.payroll?.supported || !mapping.payroll.profile) {
      out.innerHTML =
        '<p class="text-sm text-amber-700">Für dieses Profil ist die Abrechnungsprüfung noch nicht freigeschaltet.</p>';
      return;
    }
    const entries = ctx.getShiftEntries() || [];
    if (!entries.length) {
      alert('Zuerst Dienstplan / Zeitabrechnung konvertieren (Schichten werden für Soll benötigt).');
      return;
    }

    out.innerHTML = '<p class="text-sm text-gray-500">Prüfe lokal…</p>';
    try {
      const buf = await file.arrayBuffer();
      const text = await ctx.extractTextFromPdfBuffer(buf);
      if (!isLikelyPayslipText(text)) {
        out.innerHTML =
          '<p class="text-sm text-red-600">Kein Verdienstnachweis erkannt (lokale Textprüfung).</p>';
        return;
      }
      const payslip = parsePayslipText(text);
      const profile = await loadPayrollProfile(ctx.krankenhaus(), mapping.payroll.profile);
      if (!profile) {
        out.innerHTML = '<p class="text-sm text-red-600">Payroll-Profil konnte nicht geladen werden.</p>';
        return;
      }
      await refreshPayrollTariffNotice(ctx, profile);
      const result = runPayrollCheck({
        profile,
        payslip,
        entries,
        presetMapping: resolvePresetTable(mapping, ctx.preset()),
        codeAliases: mapping.codeAliases || null,
      });
      renderPayrollResult(out, result, payslip, profile);
    } catch (e) {
      console.error(e);
      out.innerHTML = `<p class="text-sm text-red-600">${escapeHtml(e.message || String(e))}</p>`;
    }
  });

  return { refreshTariffNotice: refresh };
}

/**
 * Update #payrollTariffMeta with stand/source from the active payroll profile.
 * @param {object} ctx
 * @param {object|null} [profileAlready]
 */
export async function refreshPayrollTariffNotice(ctx, profileAlready = null) {
  const meta = document.getElementById('payrollTariffMeta');
  if (!meta) return;

  const mapping = ctx.mapping();
  if (!mapping?.payroll?.supported || !mapping.payroll.profile) {
    meta.innerHTML =
      '<p class="text-[11px] text-gray-500">Für dieses Profil sind keine Tarifdaten hinterlegt.</p>';
    return;
  }

  try {
    const profile =
      profileAlready || (await loadPayrollProfile(ctx.krankenhaus(), mapping.payroll.profile));
    if (!profile) {
      meta.innerHTML = '<p class="text-[11px] text-red-600">Tarifprofil nicht ladbar.</p>';
      return;
    }
    const summary = summarizeTariffNotes(profile.notes);
    const label = profile.label || profile.id || 'Tarifprofil';
    let html = `<p><span class="font-medium text-gray-700">Tarif:</span> ${escapeHtml(label)}`;
    if (summary) html += ` <span class="text-gray-400">·</span> ${escapeHtml(summary)}`;
    html += '</p>';
    if (Array.isArray(profile.notes) && profile.notes.length) {
      html += `<details class="mt-1"><summary class="cursor-pointer hover:text-gray-700">Quellenhinweise</summary><ul class="list-disc ml-4 mt-1 space-y-0.5 text-gray-500">`;
      for (const n of profile.notes) {
        html += `<li>${escapeHtml(n)}</li>`;
      }
      html += '</ul></details>';
    }
    meta.innerHTML = html;
  } catch (e) {
    meta.innerHTML = `<p class="text-[11px] text-red-600">${escapeHtml(e.message || String(e))}</p>`;
  }
}

function renderPayrollResult(el, result, payslip, profile) {
  const rows = result?.rows || [];
  const compared = rows.filter((r) => r.ok !== null);
  const okN = compared.filter((r) => r.ok).length;
  const badN = compared.length - okN;
  const summary = summarizeTariffNotes(profile?.notes);
  let html = `
    <div class="space-y-2 border-t border-gray-100 pt-3">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="text-sm font-semibold text-gray-800">
          ${escapeHtml(payslip.serviceMonth || payslip.payMonth || '?')}
        </p>
        <p class="text-[11px]">
          <span class="text-green-700 font-bold">${okN} ok</span>
          <span class="text-gray-400 mx-1">·</span>
          <span class="${badN ? 'text-red-600 font-bold' : 'text-gray-500'}">${badN} Abweichung(en)</span>
        </p>
      </div>
  `;
  if (summary) {
    html += `<p class="text-[10px] text-gray-500">Tarifstand: ${escapeHtml(summary)}</p>`;
  }
  const diags = (result.diagnostics || []).map(translatePayrollDiagnostic);
  const critical = diags.filter((d) => d.level === 'warn');
  const info = diags.filter((d) => d.level === 'info');
  for (const d of critical) {
    html += `
      <div class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-950 leading-snug">
        <p class="font-bold mb-0.5">⚠ Fehlende Schichten</p>
        <p>${escapeHtml(d.text)}</p>
      </div>`;
  }
  if (info.length) {
    html += `<ul class="text-[11px] text-gray-600 list-disc ml-4 space-y-0.5">${info
      .map((d) => `<li>${escapeHtml(d.text)}</li>`)
      .join('')}</ul>`;
  }
  html += `
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="w-full text-[11px] bg-gray-50">
          <thead>
            <tr class="bg-gray-100 text-gray-600 text-left">
              <th class="px-2 py-1.5 font-semibold">LA</th>
              <th class="px-2 py-1.5 font-semibold text-right">Soll</th>
              <th class="px-2 py-1.5 font-semibold text-right">Ist</th>
              <th class="px-2 py-1.5 font-semibold text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
  `;
  for (const r of rows) {
    const cls = r.ok === false ? 'bg-red-50 text-red-900' : 'bg-white';
    html += `<tr class="${cls} border-t border-gray-100">
      <td class="px-2 py-1 font-mono whitespace-nowrap">${escapeHtml(r.la || '')}<span class="text-gray-400 font-sans ml-1">${escapeHtml(r.text || '')}</span></td>
      <td class="px-2 py-1 text-right tabular-nums">${fmt(r.expectedAmount)}</td>
      <td class="px-2 py-1 text-right tabular-nums">${fmt(r.actualAmount)}</td>
      <td class="px-2 py-1 text-right tabular-nums">${fmt(r.delta)}</td>
    </tr>`;
  }
  html += '</tbody></table></div></div>';
  el.innerHTML = html;
}

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** @returns {{ text: string, level: 'warn'|'info' }} */
function translatePayrollDiagnostic(raw) {
  const s = String(raw || '');
  const missing = /^missing-shifts:(\d{4}-\d{2})$/i.exec(s);
  if (missing) {
    const [, ym] = missing;
    const [y, m] = ym.split('-');
    return {
      level: 'warn',
      text:
        `Keine importierten Dienste für den Dienstmonat ${m}/${y}. ` +
        `Bitte zuerst den Dienstplan bzw. die Zeitabrechnung für diesen Monat konvertieren — ` +
        `sonst bleibt Soll für Bereitschaft und Zuschläge bei 0.`,
    };
  }
  if (/keine importierten dienste/i.test(s) || /keine schichten/i.test(s)) {
    return { level: 'warn', text: s };
  }
  return { level: 'info', text: s };
}
