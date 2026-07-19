/**
 * googleCalendar.js
 * Handles Google Calendar integration using Google Identity Services (GIS) and direct REST API calls.
 * Migration: gapi.client is deprecated for new projects. All calendar operations now use fetch + OAuth2 access token.
 *
 * Persistenz: Client ID + gewählter Kalender in localStorage.
 * Access-Token wird NICHT gespeichert – nach Reload stilles Re-Auth (prompt: '').
 */

import { buildEventDescription } from './eventDescription.js';
import { isRichEventDetailsEnabled } from './monthSummary.js';

const STORAGE = {
    clientId: 'googleClientId',
    calendarId: 'googleCalendarId',
};

const CALENDAR_SCOPES =
    'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';

let tokenClient = null;
let accessToken = null;
let currentClientId = null;
/** @type {{ resolve: (v: unknown) => void, reject: (e: unknown) => void } | null} */
let pendingAuth = null;

export function initGoogleCalendar() {
    const clientIdInput = document.getElementById('googleClientId');
    const connectBtn = document.getElementById('connectGoogleBtn');
    const syncBtn = document.getElementById('syncBtn');
    const calendarSelect = document.getElementById('calendarSelect');
    const createCalendarBtn = document.getElementById('createCalendarBtn');

    if (!clientIdInput || !connectBtn || !syncBtn) return;

    syncBtn.style.display = 'none';

    const savedClientId = localStorage.getItem(STORAGE.clientId);
    if (savedClientId) {
        clientIdInput.value = savedClientId;
    }

    clientIdInput.addEventListener('change', () => {
        const value = clientIdInput.value.trim();
        if (value) localStorage.setItem(STORAGE.clientId, value);
        else localStorage.removeItem(STORAGE.clientId);
    });

    if (calendarSelect) {
        calendarSelect.addEventListener('change', () => {
            if (calendarSelect.value) {
                localStorage.setItem(STORAGE.calendarId, calendarSelect.value);
            }
        });
    }

    connectBtn.addEventListener('click', async () => {
        const clientId = clientIdInput.value.trim();
        if (!clientId) {
            alert('Bitte geben Sie Ihre Google Client ID ein.');
            return;
        }

        localStorage.setItem(STORAGE.clientId, clientId);
        connectBtn.disabled = true;
        connectBtn.textContent = 'Verbinde...';

        try {
            await ensureGoogleLoaded();
            await requestAccessToken(clientId, { interactive: true });
        } catch (error) {
            console.error('Google Calendar integration error:', error);
            resetConnectButton(connectBtn);
            alert('Fehler bei der Google-Authentifizierung. Bitte versuchen Sie es erneut.');
        }
    });

    // Stilles Re-Auth nach Reload, wenn Client ID bekannt (kein Token speichern)
    if (savedClientId) {
        attemptSilentReconnect(savedClientId, connectBtn);
    }

    async function afterGoogleLogin() {
        try {
            const calendars = await fetchCalendarList();
            if (!calendars) throw new Error('Keine Kalender gefunden.');

            if (calendarSelect) {
                calendarSelect.innerHTML = '';
                calendars.forEach(cal => {
                    const opt = document.createElement('option');
                    opt.value = cal.id;
                    opt.textContent = cal.summary || cal.id;
                    calendarSelect.appendChild(opt);
                });

                const savedCalendarId = localStorage.getItem(STORAGE.calendarId);
                if (savedCalendarId && calendars.some(c => c.id === savedCalendarId)) {
                    calendarSelect.value = savedCalendarId;
                } else if (calendars[0]) {
                    localStorage.setItem(STORAGE.calendarId, calendars[0].id);
                }

                calendarSelect.style.display = '';
                calendarSelect.disabled = false;
            }

            if (createCalendarBtn) {
                createCalendarBtn.style.display = '';
                createCalendarBtn.disabled = false;
                createCalendarBtn.onclick = async () => {
                    const calendarName = prompt('Name für neuen Kalender:', 'Dienstplan');
                    if (!calendarName) return;
                    try {
                        await createCalendar(calendarName);
                        const newCalendars = await fetchCalendarList();
                        calendarSelect.innerHTML = '';
                        newCalendars.forEach(cal => {
                            const opt = document.createElement('option');
                            opt.value = cal.id;
                            opt.textContent = cal.summary || cal.id;
                            calendarSelect.appendChild(opt);
                        });
                        const created = newCalendars.find(cal => cal.summary === calendarName);
                        if (created) {
                            calendarSelect.value = created.id;
                            localStorage.setItem(STORAGE.calendarId, created.id);
                        }
                        alert('Neuer Kalender erfolgreich angelegt!');
                    } catch (e) {
                        alert('Fehler beim Anlegen des Kalenders: ' + (e.message || e));
                    }
                };
            }

            syncBtn.style.display = '';
            syncBtn.disabled = false;
            syncBtn.onclick = () => {
                const selectedCalendarId = calendarSelect ? calendarSelect.value : calendars[0].id;
                if (selectedCalendarId) {
                    localStorage.setItem(STORAGE.calendarId, selectedCalendarId);
                }
                syncToCalendar(selectedCalendarId);
            };

            connectBtn.disabled = false;
            connectBtn.textContent = 'Verbunden';
            connectBtn.classList.remove('bg-blue-500');
            connectBtn.classList.add('bg-green-500');
        } catch (error) {
            console.error('Calendar list error:', error);
            accessToken = null;
            resetConnectButton(connectBtn);
            alert('Fehler beim Abrufen der Kalenderliste.');
        }
    }

    /**
     * @param {string} clientId
     * @param {{ interactive: boolean }} options
     */
    function requestAccessToken(clientId, { interactive }) {
        return new Promise((resolve, reject) => {
            if (!window.google?.accounts?.oauth2) {
                reject(new Error('Google Identity Services nicht geladen'));
                return;
            }

            pendingAuth = { resolve, reject };

            if (!tokenClient || currentClientId !== clientId) {
                currentClientId = clientId;
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: CALENDAR_SCOPES,
                    callback: async (tokenResponse) => {
                        const pending = pendingAuth;
                        pendingAuth = null;
                        if (tokenResponse && tokenResponse.access_token) {
                            accessToken = tokenResponse.access_token;
                            try {
                                await afterGoogleLogin();
                                pending?.resolve(tokenResponse);
                            } catch (e) {
                                pending?.reject(e);
                            }
                        } else {
                            pending?.reject(new Error('Kein Zugriffstoken erhalten'));
                        }
                    },
                    error_callback: (err) => {
                        const pending = pendingAuth;
                        pendingAuth = null;
                        pending?.reject(err || new Error('OAuth-Fehler'));
                    },
                });
            }

            if (interactive) {
                tokenClient.requestAccessToken();
            } else {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }

    async function attemptSilentReconnect(clientId, btn) {
        btn.disabled = true;
        btn.textContent = 'Verbinde...';
        try {
            await ensureGoogleLoaded();
            await requestAccessToken(clientId, { interactive: false });
        } catch (e) {
            // Kein vorheriger Consent / Session abgelaufen – kein Alarm, User kann manuell verbinden
            console.info('Stilles Re-Auth nicht möglich, manuelle Verbindung nötig.', e);
            accessToken = null;
            resetConnectButton(btn);
        }
    }
}

function resetConnectButton(connectBtn) {
    if (!connectBtn) return;
    connectBtn.disabled = false;
    connectBtn.textContent = 'Mit Google verbinden';
    connectBtn.classList.add('bg-blue-500');
    connectBtn.classList.remove('bg-green-500');
}

function ensureGoogleLoaded() {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }

        let attempts = 0;
        const maxAttempts = 100; // ~5s
        const interval = setInterval(() => {
            attempts++;
            if (window.google?.accounts?.oauth2) {
                clearInterval(interval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                reject(new Error('Google Identity Services Timeout'));
            }
        }, 50);
    });
}

// --- Google Calendar REST API Calls ---

async function fetchCalendarList() {
    const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
    const resp = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + accessToken,
        }
    });
    if (!resp.ok) throw new Error('Fehler beim Laden der Kalenderliste');
    const data = await resp.json();
    return data.items || [];
}

async function createCalendar(summary) {
    const url = 'https://www.googleapis.com/calendar/v3/calendars';
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summary })
    });
    if (!resp.ok) throw new Error('Fehler beim Anlegen des Kalenders');
    return await resp.json();
}

async function deleteEventsInRange(calendarId, timeMin, timeMax) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&maxResults=2500`;
    const resp = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + accessToken,
        }
    });
    if (!resp.ok) throw new Error('Fehler beim Laden der Events');
    const data = await resp.json();
    const events = data.items || [];
    let deletedCount = 0;
    for (const ev of events) {
        try {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(ev.id)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                }
            });
            deletedCount++;
        } catch (e) {
            console.warn('Fehler beim Löschen eines Events:', e);
        }
    }
    return deletedCount;
}

async function insertEvent(calendarId, event) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
    });
    if (!resp.ok) throw new Error('Fehler beim Erstellen eines Events');
    return await resp.json();
}

export async function syncToCalendar(calendarId) {
    const syncBtn = document.getElementById('syncBtn');
    if (!syncBtn) return;

    try {
        syncBtn.disabled = true;
        syncBtn.textContent = 'Synchronisiere...';

        if (!accessToken) {
            alert('Bitte zuerst mit Google verbinden.');
            return;
        }

        if (calendarId) {
            localStorage.setItem(STORAGE.calendarId, calendarId);
        }

        const entries = JSON.parse(localStorage.getItem('parsedEntries') || '[]');
        if (!entries || entries.length === 0) {
            alert('Keine Einträge zum Synchronisieren gefunden.');
            return;
        }

        const dates = entries.map(e => e.date).filter(Boolean).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        let deletedCount = 0;
        if (startDate && endDate) {
            const timeMin = `${startDate}T00:00:00+01:00`;
            const timeMax = `${endDate}T23:59:59+01:00`;
            deletedCount = await deleteEventsInRange(calendarId, timeMin, timeMax);
        }

        let successCount = 0;

        const storedColors = JSON.parse(localStorage.getItem('shiftColors') || '{}');
        const colors = { ...storedColors };

        for (const entry of entries) {
            let summary = entry.type;
            if (!entry.allDay && entry.start && entry.end) {
                summary += ` ${entry.start}–${entry.end}`;
            }

            let description = buildEventDescription(entry, {
                richDetails: isRichEventDetailsEnabled(),
            });

            let endDate = entry.date;
            if (!entry.allDay && entry.start && entry.end && entry.end < entry.start) {
                const d = new Date(entry.date);
                d.setDate(d.getDate() + 1);
                endDate = d.toISOString().split('T')[0];
            }

            const event = {
                summary,
                description,
                start: {
                    dateTime: entry.allDay
                        ? `${entry.date}T00:00:00`
                        : `${entry.date}T${entry.start}:00`,
                    timeZone: 'Europe/Berlin'
                },
                end: {
                    dateTime: entry.allDay
                        ? `${entry.date}T23:59:59`
                        : `${endDate}T${entry.end}:00`,
                    timeZone: 'Europe/Berlin'
                }
            };

            if (colors[entry.type]) {
                const hex = colors[entry.type];
                const googleColorId = mapHexToGoogleColorId(hex);
                if (googleColorId) {
                    event.colorId = googleColorId;
                }
            }

            await insertEvent(calendarId, event);
            successCount++;
        }

        alert(`${successCount} Einträge erfolgreich mit Google Calendar synchronisiert!\n${deletedCount} alte Einträge wurden entfernt.`);
    } catch (error) {
        console.error('Sync error:', error);
        alert('Fehler bei der Synchronisation mit Google Calendar. Bitte versuchen Sie es erneut.');
    } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = 'Mit Kalender synchronisieren';
    }
}

/**
 * Mappt eine Hex-Farbe auf die ähnlichste Google Calendar Color ID (1-11).
 * @param {string} hex
 * @returns {string|null} colorId
 */
function mapHexToGoogleColorId(hex) {
    if (!hex) return null;

    const googleColors = {
        "1": "#a4bdfc",
        "2": "#7ae7bf",
        "3": "#dbadff",
        "4": "#ff887c",
        "5": "#fbd75b",
        "6": "#ffb878",
        "7": "#46d6db",
        "8": "#e1e1e1",
        "9": "#5484ed",
        "10": "#51b749",
        "11": "#dc2127"
    };

    const target = hex.toLowerCase();

    for (const [id, gHex] of Object.entries(googleColors)) {
        if (gHex.toLowerCase() === target) return id;
    }

    if (target.match(/#(22c55e|4ade80|86efac|bbf7d0|51b749|2ecc71|27ae60)/)) return "10";
    if (target.match(/#(eab308|facc15|fef08a|fbd75b|f1c40f|f39c12)/)) return "5";
    if (target.match(/#(3b82f6|60a5fa|93c5fd|5484ed|3498db|2980b9)/)) return "9";
    if (target.match(/#(ef4444|f87171|dc2626|dc2127|e74c3c|c0392b)/)) return "11";
    if (target.match(/#(8b5cf6|a78bfa|dbadff|9b59b6|8e44ad)/)) return "3";

    return findClosestColor(target, googleColors);
}

function findClosestColor(targetHex, palette) {
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    const targetRgb = hexToRgb(targetHex);
    if (!targetRgb) return null;

    let minDistance = Infinity;
    let closestId = null;

    for (const [id, hex] of Object.entries(palette)) {
        const rgb = hexToRgb(hex);
        if (!rgb) continue;

        const distance = Math.sqrt(
            Math.pow(targetRgb.r - rgb.r, 2) +
            Math.pow(targetRgb.g - rgb.g, 2) +
            Math.pow(targetRgb.b - rgb.b, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestId = id;
        }
    }

    return closestId;
}
