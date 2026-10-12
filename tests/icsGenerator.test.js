/**
 * ICS generator + delivery path tests.
 * Emulates desktop vs iOS Safari (UA + canShare/share / window.open) — not a real WebKit,
 * but covers the branches that caused intermittent “button does nothing” on iPhone.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    buildIcsContent,
    deliverIcsFile,
    escapeICalText,
    formatDateTime,
    isAppleTouchDevice,
    nextDay,
} from '../src/icsGenerator.js';

function memoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        clear: () => map.clear(),
    };
}

beforeEach(() => {
    globalThis.localStorage = memoryStorage();
    globalThis.sessionStorage = memoryStorage();
});

describe('ICS helpers', () => {
    it('formats local datetime without Z', () => {
        assert.equal(formatDateTime('2026-03-15', '07:35'), '20260315T073500');
    });

    it('nextDay crosses month boundary', () => {
        assert.equal(nextDay('2026-01-31'), '2026-02-01');
    });

    it('escapes iCal special characters', () => {
        assert.equal(escapeICalText('A;B,C\\D\nE'), 'A\\;B\\,C\\\\D\\nE');
    });

    it('detects iPhone UA', () => {
        assert.equal(
            isAppleTouchDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }),
            true
        );
    });

    it('detects iPadOS desktop UA via maxTouchPoints', () => {
        assert.equal(
            isAppleTouchDevice({ userAgent: 'Mozilla/5.0', platform: 'MacIntel', maxTouchPoints: 5 }),
            true
        );
    });

    it('does not treat desktop Chrome as Apple touch', () => {
        assert.equal(
            isAppleTouchDevice({
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
                platform: 'Linux x86_64',
                maxTouchPoints: 0,
            }),
            false
        );
    });
});

describe('buildIcsContent', () => {
    const fixedNow = new Date(Date.UTC(2026, 8, 2, 10, 0, 0));

    it('includes VTIMEZONE, DTSTAMP, METHOD and CRLF', () => {
        const ics = buildIcsContent(
            [{ date: '2026-09-01', type: 'F', start: '07:35', end: '15:50' }],
            { richDetails: false, now: fixedNow }
        );
        assert.match(ics, /BEGIN:VCALENDAR/);
        assert.match(ics, /METHOD:PUBLISH/);
        assert.match(ics, /BEGIN:VTIMEZONE/);
        assert.match(ics, /TZID:Europe\/Berlin/);
        assert.match(ics, /DTSTAMP:20260902T100000Z/);
        assert.match(ics, /DTSTART;TZID=Europe\/Berlin:20260901T073500/);
        assert.match(ics, /DTEND;TZID=Europe\/Berlin:20260901T155000/);
        assert.ok(ics.includes('\r\n'), 'ICS must use CRLF line endings');
    });

    it('uses exclusive DTEND for all-day events (Apple Calendar)', () => {
        const ics = buildIcsContent(
            [{ date: '2026-09-01', type: 'URLAUB', allDay: true }],
            { richDetails: false, now: fixedNow }
        );
        assert.match(ics, /DTSTART;VALUE=DATE:20260901/);
        assert.match(ics, /DTEND;VALUE=DATE:20260902/);
    });

    it('rolls overnight shifts to next calendar day', () => {
        const ics = buildIcsContent(
            [{ date: '2026-09-01', type: 'B38', start: '19:50', end: '07:35' }],
            { richDetails: false, now: fixedNow }
        );
        assert.match(ics, /DTSTART;TZID=Europe\/Berlin:20260901T195000/);
        assert.match(ics, /DTEND;TZID=Europe\/Berlin:20260902T073500/);
    });

    it('keeps stable UIDs (no random suffix)', () => {
        const a = buildIcsContent(
            [{ date: '2026-09-01', type: 'F', start: '07:35', end: '15:50' }],
            { richDetails: false, now: fixedNow }
        );
        const b = buildIcsContent(
            [{ date: '2026-09-01', type: 'F', start: '07:35', end: '15:50' }],
            { richDetails: false, now: fixedNow }
        );
        const uidA = a.match(/^UID:(.+)$/m)[1];
        const uidB = b.match(/^UID:(.+)$/m)[1];
        assert.equal(uidA, uidB);
        assert.match(uidA, /@shiftplan\.fr4iser\.com$/);
    });

    it('escapes commas in SUMMARY', () => {
        const ics = buildIcsContent(
            [{ date: '2026-09-01', type: 'F, Sonder', start: '07:35', end: '15:50' }],
            { richDetails: false, now: fixedNow }
        );
        assert.match(ics, /SUMMARY:F\\, Sonder/);
    });
});

describe('deliverIcsFile (platform emulation)', () => {
    function makeEnv({ ua, canShare = false, shareImpl, openResult = {} } = {}) {
        const created = [];
        const clicks = [];
        const shares = [];
        const opens = [];
        const assigns = [];

        const nav = {
            userAgent: ua,
            platform: /iPhone|iPad/.test(ua) ? 'iPhone' : 'Linux x86_64',
            maxTouchPoints: /iPhone|iPad/.test(ua) ? 5 : 0,
        };

        if (canShare) {
            nav.canShare = () => true;
            nav.share = async (payload) => {
                shares.push(payload);
                if (shareImpl) return shareImpl(payload);
            };
        }

        return {
            navigator: nav,
            window: {
                open: (url, target) => {
                    opens.push({ url, target });
                    return openResult;
                },
                location: {
                    assign: (url) => assigns.push(url),
                },
            },
            document: {
                body: {
                    appendChild: mock.fn(),
                },
                createElement: (tag) => {
                    const el = {
                        tagName: tag.toUpperCase(),
                        href: '',
                        download: '',
                        rel: '',
                        click: () => clicks.push(el),
                        remove: mock.fn(),
                    };
                    created.push(el);
                    return el;
                },
            },
            URL: {
                createObjectURL: (blob) => `blob:mock-${blob.size}`,
                revokeObjectURL: mock.fn(),
            },
            _spy: { created, clicks, shares, opens, assigns },
        };
    }

    it('desktop: uses <a download> (not share / window.open)', async () => {
        const env = makeEnv({
            ua: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
            canShare: false,
        });
        const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' });
        const result = await deliverIcsFile(blob, 'dienstplan.ics', env);

        assert.equal(result.method, 'anchor-download');
        assert.equal(env._spy.clicks.length, 1);
        assert.equal(env._spy.clicks[0].download, 'dienstplan.ics');
        assert.equal(env._spy.shares.length, 0);
        assert.equal(env._spy.opens.length, 0);
    });

    it('iOS Safari with Web Share: prefers navigator.share(files)', async () => {
        const env = makeEnv({
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
            canShare: true,
        });
        const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' });
        const result = await deliverIcsFile(blob, 'dienstplan.ics', env);

        assert.equal(result.method, 'share');
        assert.equal(env._spy.shares.length, 1);
        assert.equal(env._spy.shares[0].files[0].name, 'dienstplan.ics');
        assert.equal(env._spy.shares[0].files[0].type, 'text/calendar');
        assert.equal(env._spy.clicks.length, 0);
        assert.equal(env._spy.opens.length, 0);
    });

    it('iOS without share: opens blob URL (Safari calendar invite path)', async () => {
        const env = makeEnv({
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1',
            canShare: false,
            openResult: { name: 'fake-window' },
        });
        const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' });
        const result = await deliverIcsFile(blob, 'dienstplan.ics', env);

        assert.equal(result.method, 'ios-window-open');
        assert.equal(env._spy.opens.length, 1);
        assert.equal(env._spy.opens[0].target, '_blank');
        assert.equal(env._spy.clicks.length, 0);
    });

    it('iOS popup blocked: falls back to location.assign', async () => {
        const env = makeEnv({
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            canShare: false,
            openResult: null,
        });
        const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' });
        const result = await deliverIcsFile(blob, 'dienstplan.ics', env);

        assert.equal(result.method, 'ios-location');
        assert.equal(env._spy.assigns.length, 1);
        assert.match(env._spy.assigns[0], /^blob:/);
    });

    it('iOS share AbortError: stops without falling through', async () => {
        const err = new Error('cancelled');
        err.name = 'AbortError';
        const env = makeEnv({
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            canShare: true,
            shareImpl: async () => {
                throw err;
            },
        });
        const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' });
        const result = await deliverIcsFile(blob, 'dienstplan.ics', env);

        assert.equal(result.method, 'share-aborted');
        assert.equal(env._spy.opens.length, 0);
        assert.equal(env._spy.clicks.length, 0);
    });

    it('iOS share failure: falls through to window.open', async () => {
        const env = makeEnv({
            ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            canShare: true,
            shareImpl: async () => {
                throw new Error('share failed');
            },
            openResult: { name: 'ok' },
        });
        const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' });
        const result = await deliverIcsFile(blob, 'dienstplan.ics', env);

        assert.equal(result.method, 'ios-window-open');
        assert.equal(env._spy.shares.length, 1);
        assert.equal(env._spy.opens.length, 1);
    });
});
