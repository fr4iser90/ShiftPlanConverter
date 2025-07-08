# Component Architecture

## Overview

This document provides detailed information about each component in the ShiftPlanConverter application, including their interfaces, dependencies, and internal structure.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Application                         │
│                         (main.js)                              │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ PDF     │ │ Config  │ │ Google  │
│ Loader  │ │ Loader  │ │ Calendar│
└─────────┘ └─────────┘ └─────────┘
    │             │             │
    ▼             ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Parser  │ │ Preview │ │ Export  │
│(convert)│ │         │ │ (ICS)   │
└─────────┘ └─────────┘ └─────────┘
```

## Core Components

### 1. Main Application (`main.js`)

**Purpose**: Central orchestrator that coordinates all components and manages the application lifecycle.

**Key Functions**:
```javascript
// Initialize all components
initPDFLoad({ onPdfLoaded: callback })
reloadShiftTypesAndUI()
updatePresetOptions()
renderShiftTypesList()
```

**Dependencies**:
- `pdfLoader.js` - PDF file handling
- `shiftTypesLoader.js` - Configuration management
- `convert.js` - Data parsing
- `preview.js` - UI rendering
- `googleCalendar.js` - Calendar integration

**State Management**:
- Current hospital selection
- Shift type configurations
- Parsed shift data
- UI state

### 2. PDF Loader (`pdfLoader.js`)

**Purpose**: Handles PDF file upload, validation, and text extraction.

**Key Functions**:
```javascript
initPDFLoad({ onPdfLoaded: callback })
handleFileUpload(file)
extractTextFromPDF(arrayBuffer)
validatePDF(file)
```

**Features**:
- Drag and drop interface
- File type validation
- Progress indication
- Error handling
- PDF.js integration

**Dependencies**:
- PDF.js library
- Browser File API

### 3. Configuration Loader (`shiftTypesLoader.js`)

**Purpose**: Manages hospital-specific shift type configurations and dynamic loading.

**Key Functions**:
```javascript
loadShiftTypes(hospitalName)
getPresetGroup(profession, department)
addShiftType(profession, department, preset, timeRange, code)
updateShiftType(profession, department, preset, timeRange, newCode)
deleteShiftType(profession, department, preset, timeRange)
```

**Configuration Structure**:
```json
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

**Features**:
- Dynamic configuration loading
- Hospital-specific presets
- Runtime configuration updates
- Validation and error handling

### 4. Parser (`convert.js`)

**Purpose**: Converts extracted PDF text into structured shift data.

**Key Functions**:
```javascript
parseTimeSheet(pdfText, profession, department, preset, shiftTypes)
convertParsedEntriesToCSV(entries)
validateShiftData(entries)
```

**Parsing Logic**:
1. **Text Extraction**: Extract all text from PDF
2. **Pattern Recognition**: Identify date and time patterns
3. **Shift Mapping**: Map times to shift type codes
4. **Data Validation**: Verify parsed data integrity
5. **Structure Creation**: Create standardized data format

**Output Format**:
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
    shiftTypes: { "F": 10, "S": 5, "N": 5 }
  }
}
```

### 5. Preview (`preview.js`)

**Purpose**: Renders parsed shift data in an interactive calendar view.

**Key Functions**:
```javascript
renderPreview(entries)
createCalendarView(entries)
generateShiftSummary(entries)
applyColorCoding(shiftType)
```

**Features**:
- Monthly calendar view
- Shift type color coding
- Interactive navigation
- Data summary display
- Responsive design

**Color Scheme**:
- **Green**: Regular shifts (F, M, etc.)
- **Blue**: Long shifts (B36, B38)
- **Orange**: Vacation days
- **Red**: Holidays
- **Gray**: Unrecognized patterns

### 6. Export (`icsExport.js`)

**Purpose**: Exports shift data in various formats (CSV, ICS).

**Key Functions**:
```javascript
exportToCSV(entries)
exportToICS(entries)
generateCalendarEvent(entry)
createDownloadLink(content, filename, mimeType)
```

**Export Formats**:

#### CSV Format
```csv
Date,Start Time,End Time,Shift Type,Department
2024-01-15,07:35,15:50,F,OP
2024-01-16,15:35,23:50,S,OP
```

#### ICS Format
```ics
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20240115T073500
DTEND:20240115T155000
SUMMARY:Early Shift (F)
DESCRIPTION:OP Department
END:VEVENT
END:VCALENDAR
```

### 7. Google Calendar Integration (`googleCalendar.js`)

**Purpose**: Handles Google Calendar authentication and synchronization.

**Key Functions**:
```javascript
initGoogleCalendar(clientId)
authenticateUser()
listCalendars()
createCalendarEvent(entry)
syncShiftsToCalendar(entries, calendarId)
```

**OAuth Flow**:
1. **Client ID Setup**: User provides Google Client ID
2. **Authentication**: OAuth 2.0 flow with Google
3. **Calendar Selection**: User chooses target calendar
4. **Event Creation**: Shifts converted to calendar events
5. **Sync Confirmation**: User receives sync status

**API Integration**:
- Google Calendar API v3
- OAuth 2.0 authentication
- Batch operations for efficiency
- Error handling and retry logic

## Component Interactions

### Data Flow Between Components

```
User Upload → PDF Loader → Parser → Preview
                                    ↓
Config Loader → Parser → Preview → Export
                                    ↓
Google Calendar ← Export ← Preview
```

### Event Handling

#### PDF Upload Event
1. **PDF Loader** receives file
2. **PDF Loader** extracts text
3. **Main App** receives extracted text
4. **Main App** calls Parser
5. **Parser** returns structured data
6. **Main App** calls Preview
7. **Preview** renders calendar view

#### Configuration Change Event
1. **Config Loader** loads new configuration
2. **Main App** updates UI
3. **Preview** re-renders with new settings
4. **Export** uses updated configuration

#### Calendar Sync Event
1. **Google Calendar** authenticates user
2. **Google Calendar** lists available calendars
3. **User** selects target calendar
4. **Google Calendar** creates events
5. **Google Calendar** confirms sync status

## Error Handling

### Component-Level Error Handling

#### PDF Loader Errors
- **File Type Error**: Invalid file format
- **Corruption Error**: PDF file is corrupted
- **Size Error**: File too large
- **Permission Error**: File access denied

#### Parser Errors
- **Format Error**: Unrecognized PDF format
- **Pattern Error**: Cannot identify shift patterns
- **Validation Error**: Invalid shift data
- **Configuration Error**: Missing shift type definitions

#### Google Calendar Errors
- **Authentication Error**: OAuth flow failed
- **Permission Error**: Insufficient calendar permissions
- **API Error**: Google API unavailable
- **Network Error**: Connection issues

### Error Recovery Strategies

#### Graceful Degradation
- **PDF Processing**: Fallback to manual entry
- **Calendar Sync**: Export to file instead
- **Configuration**: Use default settings

#### User Feedback
- **Error Messages**: Clear, actionable error descriptions
- **Progress Indication**: Show processing status
- **Retry Options**: Allow users to retry failed operations

## Performance Optimization

### Component Optimization

#### PDF Loader
- **Streaming**: Process large PDFs in chunks
- **Background Processing**: Non-blocking UI operations
- **Caching**: Cache processed PDF data

#### Parser
- **Efficient Algorithms**: Optimized pattern matching
- **Memory Management**: Efficient data structures
- **Batch Processing**: Process multiple entries at once

#### Preview
- **Virtual Scrolling**: Handle large datasets
- **Lazy Rendering**: Render only visible calendar cells
- **Caching**: Cache rendered calendar views

#### Google Calendar
- **Batch Operations**: Group multiple API calls
- **Rate Limiting**: Respect API quotas
- **Connection Pooling**: Reuse API connections

### Memory Management

#### Data Structures
- **Efficient Objects**: Use appropriate data types
- **Garbage Collection**: Proper cleanup of unused objects
- **Memory Monitoring**: Track memory usage

#### UI Optimization
- **Event Delegation**: Efficient event handling
- **DOM Manipulation**: Minimize DOM updates
- **Resource Cleanup**: Remove event listeners

## Testing Strategy

### Component Testing

#### Unit Tests
- **PDF Loader**: Test file handling and text extraction
- **Parser**: Test pattern recognition and data validation
- **Preview**: Test rendering and interaction
- **Export**: Test format generation

#### Integration Tests
- **End-to-End**: Complete workflow testing
- **Component Interaction**: Test component communication
- **API Integration**: Test Google Calendar integration

#### Performance Tests
- **Load Testing**: Test with large PDFs
- **Memory Testing**: Monitor memory usage
- **Speed Testing**: Measure processing times

---

*For system-level architecture, see [System Overview](./overview.md).*
