# System Architecture Overview

## Overview

ShiftPlanConverter is a client-side web application that processes shift schedule PDFs locally in the browser and integrates with Google Calendar for synchronization. The architecture prioritizes privacy and security by keeping all data processing local.

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Browser  │    │  Google Calendar │    │  Local Storage  │
│                 │    │      API         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ShiftPlanConverter                          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ PDF Loader  │  │   Parser    │  │   Preview   │            │
│  │             │  │             │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Export    │  │   Google    │  │   Config    │            │
│  │             │  │  Calendar   │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. PDF Loader (`pdfLoader.js`)
- **Purpose**: Handles PDF file upload and text extraction
- **Technology**: PDF.js library
- **Responsibilities**:
  - File drag-and-drop interface
  - PDF text extraction
  - Error handling for corrupted files
  - Progress indication

### 2. Parser (`convert.js`)
- **Purpose**: Converts extracted PDF text into structured shift data
- **Responsibilities**:
  - Pattern recognition for shift types
  - Date and time parsing
  - Shift type mapping
  - Data validation

### 3. Preview (`preview.js`)
- **Purpose**: Displays processed shift data in calendar format
- **Responsibilities**:
  - Calendar visualization
  - Shift type color coding
  - Data summary display
  - Interactive calendar navigation

### 4. Export (`icsExport.js`)
- **Purpose**: Exports shift data in various formats
- **Responsibilities**:
  - CSV generation
  - ICS (iCalendar) file creation
  - File download handling

### 5. Google Calendar Integration (`googleCalendar.js`)
- **Purpose**: Synchronizes shift data with Google Calendar
- **Technology**: Google Calendar API v3
- **Responsibilities**:
  - OAuth 2.0 authentication
  - Calendar event creation
  - Conflict detection
  - Batch operations

### 6. Configuration (`shiftTypesLoader.js`)
- **Purpose**: Manages hospital-specific shift type configurations
- **Responsibilities**:
  - Loading shift type definitions
  - Dynamic configuration updates
  - Hospital-specific presets

## Data Flow

### 1. PDF Processing Flow
```
User Upload → PDF.js Extraction → Text Processing → Pattern Recognition → Structured Data
```

### 2. Calendar Integration Flow
```
Structured Data → Google OAuth → Calendar Selection → Event Creation → Sync Confirmation
```

### 3. Export Flow
```
Structured Data → Format Conversion → File Generation → Download
```

## Security Architecture

### Privacy-First Design
- **Local Processing**: All PDF processing happens in the browser
- **No Server Storage**: No data is uploaded to external servers
- **Client-Side Only**: Application runs entirely in the user's browser

### Google Calendar Security
- **OAuth 2.0**: Secure authentication with Google
- **Minimal Permissions**: Only calendar read/write access
- **Token Management**: Secure token storage and refresh

### Data Protection
- **No Data Persistence**: Data is not stored on external servers
- **Temporary Storage**: Data only exists in browser memory
- **Secure Communication**: HTTPS for all external API calls

## Technology Stack

### Frontend Technologies
- **HTML5**: Semantic markup and structure
- **CSS3**: Styling with Tailwind CSS framework
- **Vanilla JavaScript**: Core application logic
- **ES6 Modules**: Modular code organization

### External Libraries
- **PDF.js**: PDF text extraction and processing
- **Google APIs**: Calendar integration and OAuth
- **Tailwind CSS**: Utility-first CSS framework

### Deployment Technologies
- **Docker**: Containerized deployment
- **Nginx**: Web server and reverse proxy
- **Docker Compose**: Multi-container orchestration

## Performance Considerations

### Client-Side Optimization
- **Lazy Loading**: Load components on demand
- **Memory Management**: Efficient data structures
- **Caching**: Browser cache utilization
- **Minification**: Optimized bundle sizes

### PDF Processing
- **Streaming**: Process large PDFs efficiently
- **Background Processing**: Non-blocking UI operations
- **Progress Indication**: User feedback during processing

### Calendar Operations
- **Batch Operations**: Efficient bulk calendar updates
- **Rate Limiting**: Respect Google API limits
- **Error Recovery**: Graceful handling of API failures

## Scalability

### Horizontal Scaling
- **Stateless Design**: No server-side state to manage
- **CDN Ready**: Static assets can be served from CDN
- **Load Balancing**: Multiple instances can serve the same application

### Configuration Scaling
- **Dynamic Loading**: Hospital configurations loaded on demand
- **Modular Design**: Easy to add new features
- **Plugin Architecture**: Extensible for new export formats

## Monitoring and Logging

### Client-Side Monitoring
- **Error Tracking**: Browser console error logging
- **Performance Metrics**: Processing time measurement
- **User Analytics**: Feature usage tracking (optional)

### External Service Monitoring
- **Google API Status**: Monitor API availability
- **Network Connectivity**: Detect connection issues
- **Service Health**: Application availability checks

## Future Architecture Considerations

### Potential Enhancements
- **Service Workers**: Offline functionality
- **Progressive Web App**: Native app-like experience
- **Cloud Storage**: Optional data backup
- **Multi-User Support**: Shared configurations

### Integration Opportunities
- **Hospital Systems**: Direct integration with HR systems
- **Mobile Apps**: Native mobile applications
- **API Services**: REST API for external integrations
- **Analytics**: Advanced usage analytics

---

*For detailed component documentation, see [Component Architecture](./components.md).*
