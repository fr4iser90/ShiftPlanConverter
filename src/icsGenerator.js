/**
 * icsExport.js
 * Generates and downloads/shares an .ics (iCalendar) file from parsed shift entries.
 * Compatible with Nextcloud, Outlook, Apple Calendar, Thunderbird, etc.
 * On iOS: opens blob in Safari (Calendar „Hinzufügen“). Android: Web Share.
 */

import { buildEventDescription } from './eventDescription.js';
import { isRichEventDetailsEnabled } from './monthSummary.js';
import { readJsonStore } from './localData.js';

/** Europe/Berlin — needed so Apple Calendar accepts TZID=Europe/Berlin. */
const VTIMEZONE_BERLIN = [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Berlin',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
];

export function formatDateTime(date, time) {
    // date: YYYY-MM-DD, time: HH:MM
    if (!time) return date.replace(/-/g, '') + 'T000000';
    return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
}

/** YYYY-MM-DD → next calendar day (noon local avoids DST edge cases). */
export function nextDay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function escapeICalText(text) {
    return (text || '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}

export function formatDtStampUtc(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/** @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number }} [nav] */
export function isAppleTouchDevice(nav = typeof navigator !== 'undefined' ? navigator : {}) {
    const ua = nav.userAgent || '';
    const platform = nav.platform || '';
    const maxTouchPoints = nav.maxTouchPoints || 0;
    return (
        /iPad|iPhone|iPod/i.test(ua) ||
        (platform === 'MacIntel' && maxTouchPoints > 1)
    );
}

export function buildIcsContent(entries, { richDetails = isRichEventDetailsEnabled(), now = new Date() } = {}) {
    const dtstamp = formatDtStampUtc(now);

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ShiftPlanConverter//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        ...VTIMEZONE_BERLIN,
    ];

    for (const entry of entries) {
        let endDate = entry.date;
        if (!entry.allDay && entry.start && entry.end && entry.end < entry.start) {
            endDate = nextDay(entry.date);
        }

        const start = entry.allDay
            ? formatDateTime(entry.date)
            : formatDateTime(entry.date, entry.start);
        const end = entry.allDay
            ? null
            : formatDateTime(endDate, entry.end);

        // Stable UID (re-export updates same events instead of duplicating)
        const uid = [
            entry.date,
            entry.type,
            entry.start || 'allday',
            entry.end || '',
        ]
            .join('-')
            .replace(/\s/g, '')
            .replace(/[^A-Za-z0-9._-]/g, '_');

        const description = buildEventDescription(entry, { richDetails });

        lines.push('BEGIN:VEVENT');
        lines.push('UID:' + uid + '@shiftplan.fr4iser.com');
        lines.push('DTSTAMP:' + dtstamp);
        lines.push('SUMMARY:' + escapeICalText(entry.type));
        lines.push('DESCRIPTION:' + escapeICalText(description));
        if (entry.allDay) {
            // RFC 5545: DTEND is exclusive → day after the event
            lines.push('DTSTART;VALUE=DATE:' + entry.date.replace(/-/g, ''));
            lines.push('DTEND;VALUE=DATE:' + nextDay(entry.date).replace(/-/g, ''));
        } else {
            lines.push('DTSTART;TZID=Europe/Berlin:' + start);
            lines.push('DTEND;TZID=Europe/Berlin:' + end);
        }
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

/**
 * iOS/iPadOS: open blob URL → Safari Calendar invite UI („Hinzufügen“).
 * Android: Web Share when available. Desktop: classical download.
 * Blob URL is kept alive longer — Safari often needs that.
 *
 * @param {Blob} blob
 * @param {string} filename
 * @param {{ navigator?: Navigator, window?: Window, document?: Document, URL?: typeof URL, revokeMs?: number }} [env]
 */
export async function deliverIcsFile(blob, filename, env = globalThis) {
    const nav = env.navigator || globalThis.navigator;
    const win = env.window || globalThis.window;
    const doc = env.document || globalThis.document;
    const UrlApi = env.URL || globalThis.URL;
    const revokeMs = env.revokeMs ?? 60_000;

    const scheduleRevoke = (url, anchor) => {
        const timer = setTimeout(() => {
            if (anchor) anchor.remove();
            UrlApi.revokeObjectURL(url);
        }, revokeMs);
        if (typeof timer.unref === 'function') timer.unref();
    };

    // Apple: open ICS in Safari — Share Sheet only saves to Files and skips „Hinzufügen“.
    if (isAppleTouchDevice(nav)) {
        const url = UrlApi.createObjectURL(blob);
        const opened = win.open(url, '_blank');
        if (!opened) {
            win.location.assign(url);
            scheduleRevoke(url);
            return { method: 'ios-location', url };
        }
        scheduleRevoke(url);
        return { method: 'ios-window-open', url };
    }

    const file = new File([blob], filename, { type: 'text/calendar' });
    const canFileShare =
        typeof nav.canShare === 'function' &&
        (() => {
            try {
                return nav.canShare({ files: [file] });
            } catch {
                return false;
            }
        })();

    // Android (and other non-Apple mobiles): Share Sheet is the useful path
    if (canFileShare && /Android/i.test(nav.userAgent || '')) {
        try {
            await nav.share({
                files: [file],
                title: 'Dienstplan',
                text: 'Kalender-Datei (.ics)',
            });
            return { method: 'share' };
        } catch (err) {
            if (err && err.name === 'AbortError') return { method: 'share-aborted' };
            // fall through to download
        }
    }

    const url = UrlApi.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    doc.body.appendChild(a);
    a.click();
    scheduleRevoke(url, a);
    return { method: 'anchor-download', url };
}

export async function exportToICS(filename = 'dienstplan.ics') {
    const entries = readJsonStore('parsedEntries', []);
    if (!entries || entries.length === 0) {
        alert('Keine Einträge zum Exportieren gefunden.');
        return;
    }

    const content = buildIcsContent(entries);
    const blob = new Blob([content], { type: 'text/calendar' });
    await deliverIcsFile(blob, filename);
}
