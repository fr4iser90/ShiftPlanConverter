/**
 * googleCalendar.js
 * Handles Google Calendar integration using Google Identity Services (GIS) and direct REST API calls.
 * Migration: gapi.client is deprecated for new projects. All calendar operations now use fetch + OAuth2 access token.
 */

let tokenClient = null;
let accessToken = null;

export function initGoogleCalendar() {
    const clientIdInput = document.getElementById('googleClientId');
    const connectBtn = document.getElementById('connectGoogleBtn');
    const syncBtn = document.getElementById('syncBtn');
    const calendarSelect = document.getElementById('calendarSelect');
    const createCalendarBtn = document.getElementById('createCalendarBtn');

    if (!clientIdInput || !connectBtn || !syncBtn) return;

    // Initially hide sync button
    syncBtn.style.display = 'none';

    connectBtn.addEventListener('click', async () => {
        const clientId = clientIdInput.value.trim();
        if (!clientId) {
            alert('Bitte geben Sie Ihre Google Client ID ein.');
            return;
        }

        connectBtn.disabled = true;
        connectBtn.textContent = 'Verbinde...';

        try {
            // Initialize token client if not already done
            if (!tokenClient) {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
                    callback: async (tokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            accessToken = tokenResponse.access_token;
                            await afterGoogleLogin();
                        } else {
                            alert('Fehler beim Abrufen des Zugriffstokens.');
                            connectBtn.disabled = false;
                            connectBtn.textContent = 'Mit Google verbinden';
                        }
                    },
                });
            }
            // Request access token
            tokenClient.requestAccessToken();
        } catch (error) {
            console.error('Google Calendar integration error:', error);
            connectBtn.disabled = false;
            connectBtn.textContent = 'Mit Google verbinden';
            alert('Fehler bei der Google-Authentifizierung. Bitte versuchen Sie es erneut.');
        }
    });

    async function afterGoogleLogin() {
        try {
            // Kalenderliste abrufen
            const calendars = await fetchCalendarList();
            if (!calendars) throw new Error('Keine Kalender gefunden.');

            // Kalenderauswahl-Dropdown befüllen
            if (calendarSelect) {
                calendarSelect.innerHTML = '';
                calendars.forEach(cal => {
                    const opt = document.createElement('option');
                    opt.value = cal.id;
                    opt.textContent = cal.summary || cal.id;
                    calendarSelect.appendChild(opt);
                });
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
                        if (created) calendarSelect.value = created.id;
                        alert('Neuer Kalender erfolgreich angelegt!');
                    } catch (e) {
                        alert('Fehler beim Anlegen des Kalenders: ' + (e.message || e));
                    }
                };
            }

            // Show and enable sync button
            syncBtn.style.display = '';
            syncBtn.disabled = false;
            syncBtn.onclick = () => {
                const selectedCalendarId = calendarSelect ? calendarSelect.value : calendars[0].id;
                syncToCalendar(selectedCalendarId);
            };

            // Update connect button
            connectBtn.textContent = 'Verbunden';
            connectBtn.classList.remove('bg-blue-500');
            connectBtn.classList.add('bg-green-500');
        } catch (error) {
            console.error('Calendar list error:', error);
            alert('Fehler beim Abrufen der Kalenderliste.');
            connectBtn.disabled = false;
            connectBtn.textContent = 'Mit Google verbinden';
        }
    }
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
    // List events in range
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

async function syncToCalendar(calendarId) {
    const syncBtn = document.getElementById('syncBtn');
    if (!syncBtn) return;

    try {
        syncBtn.disabled = true;
        syncBtn.textContent = 'Synchronisiere...';

        const entries = JSON.parse(localStorage.getItem('parsedEntries') || '[]');
        if (!entries || entries.length === 0) {
            alert('Keine Einträge zum Synchronisieren gefunden.');
            return;
        }

        // Zeitraum bestimmen (frühestes und spätestes Datum)
        const dates = entries.map(e => e.date).filter(Boolean).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        // Vorher alle Events im Zeitraum löschen ("Clear & Create")
        let deletedCount = 0;
        if (startDate && endDate) {
            const timeMin = `${startDate}T00:00:00+01:00`;
            const timeMax = `${endDate}T23:59:59+01:00`;
            deletedCount = await deleteEventsInRange(calendarId, timeMin, timeMax);
        }

        let successCount = 0;
        const colors = JSON.parse(localStorage.getItem('shiftColors') || '{}');

        for (const entry of entries) {
            // Titel: Code + Zeit (falls vorhanden)
            let summary = entry.type;
            if (!entry.allDay && entry.start && entry.end) {
                summary += ` ${entry.start}–${entry.end}`;
            }

            // Beschreibung: Hinweis + Originaldaten
            let description = "Automatisch importiert aus Dienstplan – keine Gewähr.";
            if (entry.allDay) {
                description += `\nOriginal: ${entry.type}`;
            } else {
                description += `\nOriginal: ${entry.type}, ${entry.start}, ${entry.end}`;
            }

            // Korrektur: Enddatum auf Folgetag setzen, wenn Endzeit < Startzeit (über Mitternacht)
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

            // Farbe hinzufügen, falls vorhanden
            if (colors[entry.type]) {
                // Google Calendar nutzt colorId (1-11). 
                // Wir mappen Hex-Farben grob auf Google-Farben oder lassen es bei der Standardfarbe,
                // da Google keine beliebigen Hex-Farben pro Event via API ohne colorId erlaubt.
                // Für jetzt lassen wir es bei der UI-Vorschau, da colorId-Mapping komplex ist.
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
