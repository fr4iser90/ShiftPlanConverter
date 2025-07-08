# Development Setup

## Overview

This guide will help you set up a development environment for ShiftPlanConverter. The application is a client-side web application that can be developed and tested locally.

## Prerequisites

### Required Software
- **Node.js**: Version 16.0 or higher
- **Git**: Version 2.0 or higher
- **Web Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Code Editor**: VS Code, WebStorm, or similar

### Optional Software
- **Docker**: Version 20.10 or higher (for containerized development)
- **Docker Compose**: Version 2.0 or higher
- **Python**: Version 3.7 or higher (for local web server)

## Development Environment Setup

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/ShiftPlanConverter.git

# Navigate to project directory
cd ShiftPlanConverter

# Check the current branch
git branch
```

### Step 2: Install Dependencies

Since this is a client-side application, there are no npm dependencies to install. However, you may want to set up development tools:

```bash
# Initialize package.json (optional)
npm init -y

# Install development dependencies (optional)
npm install --save-dev http-server live-server
```

### Step 3: Set Up Local Web Server

Choose one of the following methods to serve the application locally:

#### Method 1: Using Node.js http-server
```bash
# Install http-server globally
npm install -g http-server

# Start the server
http-server -p 8080 -c-1
```

#### Method 2: Using Python
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

#### Method 3: Using PHP
```bash
php -S localhost:8080
```

#### Method 4: Using Live Server (VS Code Extension)
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Step 4: Access the Application

Open your web browser and navigate to:
```
http://localhost:8080
```

## Project Structure

### Directory Layout
```
ShiftPlanConverter/
├── docs/                    # Documentation
├── krankenhaeuser/         # Hospital configurations
│   └── st-elisabeth-leipzig/
│       └── shiftTypes.json
├── src/                    # Source code
│   └── shiftTypesLoader.js
├── assets/                 # Static assets
│   ├── 1.png
│   ├── 2.png
│   └── ...
├── index.html             # Main HTML file
├── main.js               # Main application logic
├── pdfLoader.js          # PDF processing
├── convert.js            # Data conversion
├── preview.js            # UI rendering
├── googleCalendar.js     # Google Calendar integration
├── icsExport.js          # ICS export functionality
├── styles.css            # Application styles
├── docker-compose.yml    # Docker configuration
├── nginx.conf           # Nginx configuration
└── README.md            # Project documentation
```

### Key Files

#### `index.html`
- Main HTML structure
- External library imports (PDF.js, Google APIs)
- UI components and layout

#### `main.js`
- Application entry point
- Component initialization
- Event handling
- State management

#### `pdfLoader.js`
- PDF file handling
- Text extraction
- File validation

#### `convert.js`
- PDF text parsing
- Shift pattern recognition
- Data conversion

#### `preview.js`
- Calendar rendering
- UI updates
- Data visualization

#### `googleCalendar.js`
- Google Calendar API integration
- OAuth authentication
- Event management

## Development Workflow

### 1. Making Changes

#### Code Style Guidelines
- **JavaScript**: Use ES6+ features, consistent indentation
- **HTML**: Semantic markup, accessibility attributes
- **CSS**: Tailwind CSS classes, responsive design
- **Comments**: Clear, descriptive comments for complex logic

#### File Organization
```javascript
// Example file structure
/**
 * File: pdfLoader.js
 * Purpose: PDF file handling and text extraction
 */

// Imports
import { validatePDF } from './utils/validation.js'

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Main functions
export function initPDFLoad(config) {
  // Implementation
}

// Helper functions
function extractTextFromPDF(arrayBuffer) {
  // Implementation
}

// Event handlers
function handleFileUpload(file) {
  // Implementation
}
```

### 2. Testing Changes

#### Manual Testing
1. **PDF Processing**: Test with various PDF formats
2. **Calendar Integration**: Test Google Calendar sync
3. **Export Features**: Test CSV and ICS export
4. **UI Responsiveness**: Test on different screen sizes
5. **Browser Compatibility**: Test in different browsers

#### Browser Developer Tools
```javascript
// Enable debug logging
localStorage.setItem('debug', 'true')

// Check console for errors
console.log('Debug information')

// Test specific functions
window.testPDFProcessing = function(file) {
  // Test implementation
}
```

### 3. Debugging

#### Common Debugging Techniques

#### Console Logging
```javascript
// Add debug logging
function processPDF(file) {
  console.log('Processing PDF:', file.name)
  console.log('File size:', file.size)
  
  try {
    const result = extractText(file)
    console.log('Extraction result:', result)
    return result
  } catch (error) {
    console.error('PDF processing failed:', error)
    throw error
  }
}
```

#### Breakpoints
```javascript
// Add breakpoints in browser dev tools
function parseTimeSheet(pdfText) {
  debugger; // Browser will pause here
  // Implementation
}
```

#### Error Handling
```javascript
// Comprehensive error handling
async function safeOperation(operation) {
  try {
    return await operation()
  } catch (error) {
    console.error('Operation failed:', error)
    
    // Log additional context
    console.error('Error context:', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })
    
    throw error
  }
}
```

## Configuration

### Development Configuration

#### Local Development Settings
```javascript
// Development configuration
const DEV_CONFIG = {
  debug: true,
  logLevel: 'debug',
  apiEndpoint: 'http://localhost:8080',
  googleClientId: 'your-dev-client-id'
}
```

#### Environment Variables
```bash
# Create .env file for local development
NODE_ENV=development
GOOGLE_CLIENT_ID=your-dev-client-id
DEBUG=true
PORT=8080
```

### Hospital Configuration

#### Adding New Hospital
1. Create new directory in `krankenhaeuser/`
2. Add `shiftTypes.json` configuration
3. Update hospital selection in UI

```json
// Example: krankenhaeuser/new-hospital/shiftTypes.json
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

## Testing

### Manual Testing Checklist

#### PDF Processing
- [ ] Upload text-based PDF
- [ ] Upload scanned PDF
- [ ] Test large PDF files
- [ ] Test corrupted PDF files
- [ ] Verify text extraction accuracy

#### Calendar Integration
- [ ] Test Google OAuth flow
- [ ] Test calendar selection
- [ ] Test event creation
- [ ] Test batch operations
- [ ] Test error handling

#### Export Features
- [ ] Test CSV export
- [ ] Test ICS export
- [ ] Verify export format
- [ ] Test with different data sets

#### UI/UX
- [ ] Test responsive design
- [ ] Test theme switching
- [ ] Test keyboard navigation
- [ ] Test accessibility features

### Automated Testing (Future)

#### Unit Tests
```javascript
// Example test structure
describe('PDF Processing', () => {
  test('should extract text from PDF', async () => {
    const file = new File(['test content'], 'test.pdf')
    const result = await extractTextFromPDF(file)
    expect(result).toBe('test content')
  })
})
```

#### Integration Tests
```javascript
// Example integration test
describe('End-to-End Workflow', () => {
  test('should process PDF and create calendar events', async () => {
    // Test complete workflow
  })
})
```

## Performance Optimization

### Development Performance

#### Code Splitting
```javascript
// Lazy load components
const PDFLoader = await import('./pdfLoader.js')
const CalendarIntegration = await import('./googleCalendar.js')
```

#### Caching
```javascript
// Cache frequently used data
const shiftTypesCache = new Map()

function getShiftTypes(hospital) {
  if (shiftTypesCache.has(hospital)) {
    return shiftTypesCache.get(hospital)
  }
  
  const types = loadShiftTypes(hospital)
  shiftTypesCache.set(hospital, types)
  return types
}
```

#### Memory Management
```javascript
// Clean up resources
function cleanup() {
  // Clear caches
  shiftTypesCache.clear()
  
  // Remove event listeners
  document.removeEventListener('drop', handleDrop)
  
  // Clear intervals/timeouts
  clearInterval(updateInterval)
}
```

## Deployment

### Local Development Deployment

#### Using Docker
```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

#### Manual Deployment
```bash
# Copy files to web server
cp -r . /var/www/shiftplanconverter/

# Set permissions
chmod -R 755 /var/www/shiftplanconverter/

# Restart web server
sudo systemctl restart nginx
```

## Troubleshooting

### Common Development Issues

#### 1. CORS Errors
**Problem**: Cross-origin requests blocked
**Solution**:
```bash
# Use local web server instead of file:// protocol
http-server -p 8080 --cors
```

#### 2. Google API Errors
**Problem**: Google Calendar API not working
**Solution**:
- Check Google Cloud Console configuration
- Verify client ID and API key
- Check authorized origins

#### 3. PDF Processing Issues
**Problem**: PDF text extraction failing
**Solution**:
- Check PDF format (text-based vs scanned)
- Verify PDF.js library loading
- Check browser console for errors

#### 4. File Upload Issues
**Problem**: File upload not working
**Solution**:
- Check file size limits
- Verify file type validation
- Check browser permissions

### Debug Commands

#### Check Dependencies
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version
```

#### Check Network
```bash
# Test local server
curl http://localhost:8080

# Check ports
netstat -tulpn | grep 8080
```

#### Check Browser
```javascript
// Check browser compatibility
console.log('User Agent:', navigator.userAgent)
console.log('PDF.js available:', typeof window.pdfjsLib !== 'undefined')
console.log('Google API available:', typeof gapi !== 'undefined')
```

## Next Steps

After setting up your development environment:

1. **Read the [Architecture Documentation](../02_architecture/overview.md)** to understand the system design
2. **Review the [API Reference](../04_api-reference/endpoints.md)** for integration details
3. **Check the [Git Workflow](./git-workflow.md)** for contribution guidelines
4. **Explore the [Testing Documentation](../07_testing/unit-tests.md)** for testing strategies

---

*For environment setup details, see [Environment Setup](./environment.md).*
