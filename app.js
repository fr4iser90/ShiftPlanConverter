// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Google Calendar API configuration
const CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with your Google Cloud Console Client ID
const API_KEY = 'YOUR_API_KEY'; // Replace with your Google Cloud Console API Key
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar';

// DOM Elements
const pdfInput = document.getElementById('pdfInput');
const previewSection = document.getElementById('previewSection');
const previewContent = document.getElementById('previewContent');
const calendarSection = document.getElementById('calendarSection');
const authorizeButton = document.getElementById('authorizeButton');
const syncButton = document.getElementById('syncButton');
const statusMessages = document.getElementById('statusMessages');

// Shift codes mapping
const shiftCodes = {
    '07:35-15:50': 'F',
    '08:30-16:45': 'F1',
    '09:00-17:15': 'F2',
    '09:30-17:45': 'F3',
    '10:00-18:15': 'M1',
    '11:00-19:15': 'M2',
    '11:35-19:50': 'M3'
};

// Initialize Google Calendar API
function initGoogleCalendarAPI() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
        }).then(() => {
            // Listen for sign-in state changes
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
            // Handle the initial sign-in state
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        }).catch(error => {
            addStatusMessage('Fehler beim Initialisieren der Google API: ' + error.message, 'error');
        });
    });
}

// Update UI based on sign-in status
function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        syncButton.style.display = 'inline-block';
    } else {
        authorizeButton.style.display = 'inline-block';
        syncButton.style.display = 'none';
    }
}

// Handle authorization
function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn();
}

// Handle sign out
function handleSignoutClick() {
    gapi.auth2.getAuthInstance().signOut();
}

// Parse PDF content
async function parsePDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return parseTimeSheet(fullText);
    } catch (error) {
        addStatusMessage('Fehler beim Lesen der PDF: ' + error.message, 'error');
        return null;
    }
}

// Parse time sheet content
function parseTimeSheet(text) {
    const lines = text.split('\n');
    const mainEntries = [];
    const bereitschaftEntries = [];
    let currentYear = '';
    let currentMonth = '';

    // Regex patterns
    const monthYearRegex = /Abrechnungsmonat (\d{2})\/(\d{4})/;
    const shiftRegex = /^(\d{2})\s+\w+\s+KO\*\s+(\d{2}:\d{2})\s+GE\*\s+(\d{2}:\d{2})/;
    const vacationRegex = /^(\d{2})\s+\w+\s+URLTV/;
    const holidayRegex = /^(\d{2})\s+\w+\*?\s+FEIER/;
    const onCallBereitschaftRegex = /^(\d{2}\.\d{2}\.\d{4})\s+.*?(\d{2}:\d{2})\s+(\d{2}:\d{2})/;
    const bereitSectioRegex = /Bereitschaftsdienste/;

    let inBereitschaftSection = false;

    // Process each line
    for (const line of lines) {
        if (!currentYear || !currentMonth) {
            const monthYearMatch = line.match(monthYearRegex);
            if (monthYearMatch) {
                currentMonth = monthYearMatch[1];
                currentYear = monthYearMatch[2];
            }
        }

        if (bereitSectioRegex.test(line)) {
            inBereitschaftSection = true;
            continue;
        }

        if (inBereitschaftSection) {
            const onCallMatch = line.match(onCallBereitschaftRegex);
            if (onCallMatch) {
                const [_, dateStr, startTime, endTime] = onCallMatch;
                const [day, month, year] = dateStr.split('.');
                const fullDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                bereitschaftEntries.push({ date: fullDate, start: startTime, end: endTime });
            }
        } else {
            const shiftMatch = line.match(shiftRegex);
            const vacationMatch = line.match(vacationRegex);
            const holidayMatch = line.match(holidayRegex);

            if (shiftMatch && currentYear && currentMonth) {
                const [_, day, startTime, endTime] = shiftMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                const timeKey = `${startTime}-${endTime}`;
                const shiftType = shiftCodes[timeKey] || `⚠️ ${timeKey}`;
                mainEntries.push({ type: shiftType, date: date, start: startTime, end: endTime });
            } else if (vacationMatch && currentYear && currentMonth) {
                const [_, day] = vacationMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'URLAUB', date: date, allDay: true });
            } else if (holidayMatch && currentYear && currentMonth) {
                const [_, day] = holidayMatch;
                const date = `${currentYear}-${currentMonth.padStart(2, '0')}-${day.padStart(2, '0')}`;
                mainEntries.push({ type: 'FEIERTAG', date: date, allDay: true });
            }
        }
    }

    return { entries: [...mainEntries, ...bereitschaftEntries], year: currentYear, month: currentMonth };
}

// Format event for Google Calendar
function formatForGoogleCalendar(entry, year, month) {
    const timeZone = 'Europe/Berlin';
    const workflowId = `dienstplan-${year}-${month.padStart(2, '0')}`;

    const eventBase = {
        timeZone: timeZone,
        extendedProperties: {
            private: {
                n8nWorkflowId: workflowId
            }
        }
    };

    if (entry.allDay) {
        return {
            ...eventBase,
            summary: entry.type,
            start: { date: entry.date },
            end: { date: entry.date }
        };
    }

    const fullDate = entry.date;
    let startDate = new Date(`${fullDate}T${entry.start}:00`);
    let endDate = new Date(`${fullDate}T${entry.end}:00`);

    if (entry.type === 'MO' || entry.type === 'B38' || (!entry.allDay && endDate <= startDate)) {
        endDate.setDate(endDate.getDate() + 1);
    }

    let summary = entry.type;
    if (entry.type === 'MO') {
        summary = 'MO 11:35-07:35';
    } else if (entry.type === 'B38') {
        summary = 'B38 19:50-07:35';
    } else if (!entry.allDay) {
        summary = `${entry.type} ${entry.start}-${entry.end}`;
    }

    return {
        ...eventBase,
        summary: summary,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() }
    };
}

// Add status message to UI
function addStatusMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `status-message ${type}`;
    messageElement.textContent = message;
    statusMessages.appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: 'smooth' });
}

// Handle file selection
pdfInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    addStatusMessage('Verarbeite PDF...', 'info');
    const result = await parsePDF(file);
    
    if (result) {
        previewSection.style.display = 'block';
        calendarSection.style.display = 'block';
        
        // Display preview
        const previewHTML = result.entries.map(entry => {
            if (entry.allDay) {
                return `<div>${entry.date}: ${entry.type}</div>`;
            }
            return `<div>${entry.date}: ${entry.type} (${entry.start}-${entry.end})</div>`;
        }).join('');
        
        previewContent.innerHTML = previewHTML;
        addStatusMessage('PDF erfolgreich verarbeitet!', 'success');
    }
});

// Handle Google Calendar sync
syncButton.addEventListener('click', async () => {
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        addStatusMessage('Bitte zuerst bei Google anmelden', 'error');
        return;
    }

    try {
        const file = pdfInput.files[0];
        if (!file) {
            addStatusMessage('Bitte wähle zuerst eine PDF-Datei aus', 'error');
            return;
        }

        addStatusMessage('Synchronisiere mit Google Kalender...', 'info');
        const result = await parsePDF(file);
        
        if (!result) {
            addStatusMessage('Fehler beim Verarbeiten der PDF', 'error');
            return;
        }

        const { entries, year, month } = result;
        const calendarId = 'primary'; // Use primary calendar, or specify a different calendar ID

        // Delete existing events for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const existingEvents = await gapi.client.calendar.events.list({
            calendarId: calendarId,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true
        });

        // Delete existing events
        for (const event of existingEvents.result.items) {
            await gapi.client.calendar.events.delete({
                calendarId: calendarId,
                eventId: event.id
            });
        }

        // Create new events
        for (const entry of entries) {
            const event = formatForGoogleCalendar(entry, year, month);
            await gapi.client.calendar.events.insert({
                calendarId: calendarId,
                resource: event
            });
        }

        addStatusMessage('Synchronisierung erfolgreich abgeschlossen!', 'success');
    } catch (error) {
        addStatusMessage('Fehler bei der Synchronisierung: ' + error.message, 'error');
    }
});

// Initialize Google Calendar API
authorizeButton.addEventListener('click', handleAuthClick);
initGoogleCalendarAPI(); 