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
        
        // Farben aus localStorage ODER aus der aktuellen Konfiguration laden
        const storedColors = JSON.parse(localStorage.getItem('shiftColors') || '{}');
        // Wir versuchen, die Farben so zu laden, wie sie in der UI angezeigt werden
        const colors = { ...storedColors };

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
    
    // Google Event Colors (from API)
    const googleColors = {
        "1": "#a4bdfc",  // Lavendel
        "2": "#7ae7bf",  // Salbei
        "3": "#dbadff",  // Traube
        "4": "#ff887c",  // Flamingo
        "5": "#fbd75b",  // Banane
        "6": "#ffb878",  // Mandarine
        "7": "#46d6db",  // Pfau
        "8": "#e1e1e1",  // Graphit
        "9": "#5484ed",  // Heidelbeere
        "10": "#51b749", // Basilikum
        "11": "#dc2127"  // Tomate
    };

    // Einfaches Mapping für bekannte Standard-Hex-Werte oder Distanzberechnung
    const target = hex.toLowerCase();
    
    // 1. Direkte Treffer (falls der Nutzer eine Google-Farbe gewählt hat)
    for (const [id, gHex] of Object.entries(googleColors)) {
        if (gHex.toLowerCase() === target) return id;
    }

    // 2. Heuristik für typische Dienstplan-Farben
    // Grüntöne (Frühschicht)
    if (target.match(/#(22c55e|4ade80|86efac|bbf7d0|51b749|2ecc71|27ae60)/)) return "10"; 
    // Gelbtöne (Spätschicht)
    if (target.match(/#(eab308|facc15|fef08a|fbd75b|f1c40f|f39c12)/)) return "5";
    // Blautöne (Mittelschicht)
    if (target.match(/#(3b82f6|60a5fa|93c5fd|5484ed|3498db|2980b9)/)) return "9";
    // Rottöne (Nachtschicht)
    if (target.match(/#(ef4444|f87171|dc2626|dc2127|e74c3c|c0392b)/)) return "11";
    // Lila (Spezial)
    if (target.match(/#(8b5cf6|a78bfa|dbadff|9b59b6|8e44ad)/)) return "3";

    // 3. Fallback: Distanzberechnung (Euklidisch im RGB-Raum)
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
