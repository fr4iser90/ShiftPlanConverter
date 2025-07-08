# API Reference

## Overview

ShiftPlanConverter is primarily a client-side application, but it integrates with several external APIs. This document provides comprehensive API reference information for all integrations and internal functions.

## Google Calendar API

### Authentication

#### OAuth 2.0 Flow
```javascript
// Initialize Google Calendar integration
initGoogleCalendar(clientId)

// Authenticate user
authenticateUser()
```

**Parameters**:
- `clientId` (string): Google OAuth 2.0 Client ID

**Returns**: Promise that resolves when authentication is complete

#### Required Scopes
- `https://www.googleapis.com/auth/calendar` - Full access to calendars
- `https://www.googleapis.com/auth/calendar.events` - Read/write calendar events

### Calendar Management

#### List Calendars
```javascript
listCalendars()
```

**Returns**: Promise<Array> - List of available calendars

**Response Format**:
```javascript
[
  {
    id: "primary",
    summary: "My Calendar",
    description: "Personal calendar",
    accessRole: "owner"
  }
]
```

#### Select Calendar
```javascript
selectCalendar(calendarId)
```

**Parameters**:
- `calendarId` (string): Google Calendar ID

**Returns**: Promise<void>

### Event Management

#### Create Calendar Event
```javascript
createCalendarEvent(entry, calendarId)
```

**Parameters**:
- `entry` (object): Shift entry object
- `calendarId` (string): Target calendar ID

**Entry Format**:
```javascript
{
  date: "2024-01-15",
  startTime: "07:35",
  endTime: "15:50",
  shiftType: "F",
  department: "OP"
}
```

**Returns**: Promise<object> - Created event object

#### Batch Create Events
```javascript
syncShiftsToCalendar(entries, calendarId)
```

**Parameters**:
- `entries` (Array): Array of shift entries
- `calendarId` (string): Target calendar ID

**Returns**: Promise<Array> - Array of created event objects

#### Delete Event
```javascript
deleteCalendarEvent(eventId, calendarId)
```

**Parameters**:
- `eventId` (string): Google Calendar event ID
- `calendarId` (string): Calendar ID

**Returns**: Promise<void>

### Error Handling

#### API Errors
```javascript
{
  error: {
    code: 400,
    message: "Bad Request",
    details: "Invalid calendar ID"
  }
}
```

#### Common Error Codes
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - Rate limit exceeded

## PDF.js API

### PDF Loading

#### Load PDF Document
```javascript
window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
```

**Parameters**:
- `arrayBuffer` (ArrayBuffer): PDF file data

**Returns**: Promise<PDFDocumentProxy>

#### Extract Text from Page
```javascript
// Method 1: Direct text extraction (PDF.js >=3.0)
const pageText = await page.getText()

// Method 2: Text content extraction
const textContent = await page.getTextContent()
```

**Returns**: Promise<string> - Extracted text content

### Error Handling

#### PDF Loading Errors
```javascript
{
  name: "InvalidPDFException",
  message: "Invalid PDF structure"
}
```

#### Common PDF Errors
- `InvalidPDFException`: Corrupted or invalid PDF
- `MissingPDFException`: PDF file not found
- `UnexpectedResponseException`: Network error
- `PasswordException`: Password-protected PDF

## Internal API Functions

### PDF Processing

#### Parse Time Sheet
```javascript
parseTimeSheet(pdfText, profession, department, preset, shiftTypes)
```

**Parameters**:
- `pdfText` (string): Extracted PDF text
- `profession` (string): User profession (e.g., "pflege")
- `department` (string): Department (e.g., "op")
- `preset` (string): Shift type preset (e.g., "default")
- `shiftTypes` (object): Shift type configuration

**Returns**: Object with parsed entries and summary

**Response Format**:
```javascript
{
  entries: [
    {
      date: "2024-01-15",
      startTime: "07:35",
      endTime: "15:50",
      shiftType: "F",
      department: "OP"
    }
  ],
  summary: {
    totalShifts: 20,
    shiftTypes: { "F": 10, "S": 5, "N": 5 },
    unrecognized: []
  }
}
```

#### Convert to CSV
```javascript
convertParsedEntriesToCSV(entries)
```

**Parameters**:
- `entries` (Array): Array of shift entries

**Returns**: string - CSV formatted data

**CSV Format**:
```csv
Date,Start Time,End Time,Shift Type,Department
2024-01-15,07:35,15:50,F,OP
2024-01-16,15:35,23:50,S,OP
```

### Configuration Management

#### Load Shift Types
```javascript
loadShiftTypes(hospitalName)
```

**Parameters**:
- `hospitalName` (string): Hospital identifier

**Returns**: Promise<object> - Shift type configuration

**Configuration Format**:
```javascript
{
  "pflege": {
    "op": {
      "default": {
        "07:35-15:50": "F",
        "15:35-23:50": "S",
        "23:35-07:35": "N"
      }
    }
  }
}
```

#### Get Preset Group
```javascript
getPresetGroup(profession, department)
```

**Parameters**:
- `profession` (string): User profession
- `department` (string): Department

**Returns**: object - Preset group configuration

#### Add Shift Type
```javascript
addShiftType(profession, department, preset, timeRange, code)
```

**Parameters**:
- `profession` (string): User profession
- `department` (string): Department
- `preset` (string): Preset name
- `timeRange` (string): Time range (e.g., "07:35-15:50")
- `code` (string): Shift type code (e.g., "F")

**Returns**: void

#### Update Shift Type
```javascript
updateShiftType(profession, department, preset, timeRange, newCode)
```

**Parameters**:
- `profession` (string): User profession
- `department` (string): Department
- `preset` (string): Preset name
- `timeRange` (string): Time range
- `newCode` (string): New shift type code

**Returns**: void

#### Delete Shift Type
```javascript
deleteShiftType(profession, department, preset, timeRange)
```

**Parameters**:
- `profession` (string): User profession
- `department` (string): Department
- `preset` (string): Preset name
- `timeRange` (string): Time range to delete

**Returns**: void

### Export Functions

#### Export to ICS
```javascript
exportToICS(entries)
```

**Parameters**:
- `entries` (Array): Array of shift entries

**Returns**: string - ICS formatted data

**ICS Format**:
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ShiftPlanConverter//EN
BEGIN:VEVENT
UID:shift-2024-01-15-F
DTSTART:20240115T073500
DTEND:20240115T155000
SUMMARY:Early Shift (F)
DESCRIPTION:OP Department
END:VEVENT
END:VCALENDAR
```

#### Generate Calendar Event
```javascript
generateCalendarEvent(entry)
```

**Parameters**:
- `entry` (object): Shift entry object

**Returns**: object - Google Calendar event object

**Event Format**:
```javascript
{
  summary: "Early Shift (F)",
  description: "OP Department",
  start: {
    dateTime: "2024-01-15T07:35:00",
    timeZone: "Europe/Berlin"
  },
  end: {
    dateTime: "2024-01-15T15:50:00",
    timeZone: "Europe/Berlin"
  },
  colorId: "1"
}
```

### Utility Functions

#### Validate Shift Data
```javascript
validateShiftData(entries)
```

**Parameters**:
- `entries` (Array): Array of shift entries

**Returns**: object - Validation results

**Validation Format**:
```javascript
{
  isValid: true,
  errors: [],
  warnings: []
}
```

#### Format Date
```javascript
formatDate(date, format)
```

**Parameters**:
- `date` (Date): Date object
- `format` (string): Format string

**Returns**: string - Formatted date

#### Parse Time
```javascript
parseTime(timeString)
```

**Parameters**:
- `timeString` (string): Time string (e.g., "07:35")

**Returns**: object - Parsed time object

## Error Handling

### Error Types

#### ValidationError
```javascript
{
  type: "ValidationError",
  message: "Invalid shift data",
  field: "startTime",
  value: "invalid"
}
```

#### ProcessingError
```javascript
{
  type: "ProcessingError",
  message: "Failed to process PDF",
  cause: "Corrupted file"
}
```

#### APIError
```javascript
{
  type: "APIError",
  message: "Google Calendar API error",
  code: 400,
  details: "Invalid calendar ID"
}
```

### Error Handling Patterns

#### Try-Catch Pattern
```javascript
try {
  const result = await processPDF(file)
  return result
} catch (error) {
  console.error('Processing failed:', error)
  throw new ProcessingError('Failed to process PDF', error)
}
```

#### Promise Error Handling
```javascript
processPDF(file)
  .then(result => {
    // Handle success
  })
  .catch(error => {
    // Handle error
    console.error('Error:', error)
  })
```

## Rate Limits

### Google Calendar API
- **Queries per day**: 1,000,000,000
- **Queries per 100 seconds per user**: 1,000
- **Queries per 100 seconds**: 10,000

### PDF.js
- **File size limit**: 50MB
- **Processing time**: Varies by file size and complexity

## Best Practices

### API Usage
1. **Error Handling**: Always implement proper error handling
2. **Rate Limiting**: Respect API rate limits
3. **Authentication**: Use secure authentication methods
4. **Validation**: Validate all input data
5. **Logging**: Log API calls for debugging

### Performance
1. **Batch Operations**: Use batch operations when possible
2. **Caching**: Cache frequently used data
3. **Lazy Loading**: Load data on demand
4. **Memory Management**: Clean up resources properly

### Security
1. **HTTPS**: Always use HTTPS for API calls
2. **Token Management**: Secure token storage and refresh
3. **Input Validation**: Validate all user inputs
4. **Error Messages**: Don't expose sensitive information in errors

---

*For authentication details, see [Authentication Guide](./authentication.md).*
