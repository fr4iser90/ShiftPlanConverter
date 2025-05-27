/**
 * googleCalendar.js
 * Handles Google Calendar integration using user-provided credentials
 */

let isGoogleApiLoaded = false;
let isInitializing = false;
let tokenClient = null;
let gapiInited = false;
let gisInited = false;

// Initialize Google Identity Services
function gisLoaded() {
    gisInited = true;
    console.log('Google Identity Services loaded');
}

// Initialize Google API Client
function gapiLoaded() {
    gapi.load('client', async () => {
        try {
            await gapi.client.init({
                apiKey: null,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            });
            gapiInited = true;
            isGoogleApiLoaded = true;
            isInitializing = false;
            console.log('Google API client library loaded');
        } catch (error) {
            console.error('Error initializing Google API client:', error);
        }
    });
}

export function initGoogleCalendar() {
    const clientIdInput = document.getElementById('googleClientId');
    const connectBtn = document.getElementById('connectGoogleBtn');
    const syncBtn = document.getElementById('syncBtn');
    
    if (!clientIdInput || !connectBtn || !syncBtn) return;

    // Initially hide sync button
    syncBtn.style.display = 'none';

    // Set up callback for Google Identity Services
    window.onload = function() {
        if (window.google) {
            gisLoaded();
        }
    };

    // Set up callback for Google API Client
    if (window.gapi) {
        gapiLoaded();
    } else {
        window.onload = function() {
            if (window.gapi) {
                gapiLoaded();
            }
        };
    }

    connectBtn.addEventListener('click', async () => {
        const clientId = clientIdInput.value.trim();
        if (!clientId) {
            alert('Bitte geben Sie Ihre Google Client ID ein.');
            return;
        }

        if (!gapiInited || !gisInited) {
            alert('Bitte warten Sie einen Moment, bis die Google API geladen ist.');
            return;
        }

        try {
            connectBtn.disabled = true;
            connectBtn.textContent = 'Verbinde...';

            // Initialize token client
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        try {
                            // Get user's calendars
                            const response = await gapi.client.calendar.calendarList.list();
                            console.log('Available calendars:', response.result.items);

                            // Show and enable sync button
                            syncBtn.style.display = '';
                            syncBtn.disabled = false;
                            syncBtn.onclick = () => syncToCalendar(response.result.items[0].id);

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
                },
            });

            // Request access token
            tokenClient.requestAccessToken();

        } catch (error) {
            console.error('Google Calendar integration error:', error);
            connectBtn.disabled = false;
            connectBtn.textContent = 'Mit Google verbinden';
            
            if (error.error === 'popup_closed_by_user') {
                alert('Die Anmeldung wurde abgebrochen. Sie können es jederzeit erneut versuchen.');
            } else if (error.error === 'immediate_failed') {
                alert('Bitte melden Sie sich zuerst bei Google an, bevor Sie fortfahren.');
            } else if (error.error === 'idpiframe_initialization_failed') {
                alert('Bitte stellen Sie sicher, dass Sie die Domain https://shift.fr4iser.com in der Google Cloud Console als autorisierte JavaScript-Ursprung hinzugefügt haben.\n\nDirekter Link: https://console.cloud.google.com/apis/credentials');
            } else {
                alert('Um Ihre Dienstplan-Einträge mit Google Kalender zu synchronisieren, müssen Sie den Zugriff erlauben. Dies ist ein einmaliger Vorgang und Sie können den Zugriff jederzeit widerrufen.');
            }
        }
    });
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
        
        let successCount = 0;
        for (const entry of entries) {
            const event = {
                summary: entry.type,
                start: {
                    dateTime: entry.allDay ? 
                        `${entry.date}T00:00:00` : 
                        `${entry.date}T${entry.start}:00`,
                    timeZone: 'Europe/Berlin'
                },
                end: {
                    dateTime: entry.allDay ? 
                        `${entry.date}T23:59:59` : 
                        `${entry.date}T${entry.end}:00`,
                    timeZone: 'Europe/Berlin'
                }
            };

            await gapi.client.calendar.events.insert({
                calendarId: calendarId,
                resource: event
            });
            successCount++;
        }

        alert(`${successCount} Einträge erfolgreich mit Google Calendar synchronisiert!`);
    } catch (error) {
        console.error('Sync error:', error);
        alert('Fehler bei der Synchronisation mit Google Calendar. Bitte versuchen Sie es erneut.');
    } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = 'Mit Kalender synchronisieren';
    }
} 