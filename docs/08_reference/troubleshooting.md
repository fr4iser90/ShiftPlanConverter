# Troubleshooting Guide

## Overview

This guide provides solutions for common issues you may encounter when using ShiftPlanConverter. Each section includes problem descriptions, causes, and step-by-step solutions.

## Quick Diagnosis

### Check Application Status
1. **Open Browser Console**: Press F12 and check for error messages
2. **Verify Network**: Ensure internet connection is working
3. **Check URL**: Confirm you're accessing the correct application URL
4. **Clear Cache**: Try refreshing the page with Ctrl+F5

### Common Error Messages
- **"PDF not supported"**: File format or corruption issue
- **"Google Calendar connection failed"**: Authentication or API issue
- **"Shift types not found"**: Configuration or file loading issue
- **"Export failed"**: Browser or file system issue

## PDF Processing Issues

### Problem: PDF Not Loading

#### Symptoms
- File upload fails
- "PDF not supported" error message
- Browser freezes during upload
- No preview generated

#### Possible Causes
1. **File Format**: PDF is scanned image, not text-based
2. **File Size**: PDF is too large (>50MB)
3. **File Corruption**: PDF file is damaged
4. **Browser Support**: Browser doesn't support PDF.js
5. **File Type**: File is not actually a PDF

#### Solutions

##### 1. Check PDF Format
```bash
# Verify PDF is text-based (not scanned)
# Open PDF in text editor - if you see readable text, it's text-based
# If you see garbled characters, it's likely scanned
```

##### 2. Reduce File Size
```bash
# Use PDF compression tools
# Recommended: PDF24, Adobe Acrobat, or online compressors
# Target size: <10MB for optimal performance
```

##### 3. Convert Scanned PDF
```bash
# Use OCR tools to convert scanned PDF to text
# Tools: Adobe Acrobat Pro, ABBYY FineReader, or online OCR
```

##### 4. Test with Sample PDF
```bash
# Download a sample text-based PDF
# Test if the application works with known good file
```

#### Debug Steps
```javascript
// Check browser console for errors
console.log('PDF file size:', file.size)
console.log('PDF file type:', file.type)
console.log('PDF file name:', file.name)

// Test PDF.js availability
console.log('PDF.js loaded:', typeof window.pdfjsLib !== 'undefined')
```

### Problem: PDF Text Extraction Fails

#### Symptoms
- PDF loads but no text is extracted
- Empty preview after processing
- "No text found" error message

#### Solutions

##### 1. Check PDF Content
```bash
# Open PDF in different PDF readers
# Verify text is selectable and copyable
# Check if text is embedded as images
```

##### 2. Update PDF.js
```html
<!-- Ensure latest PDF.js version -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
```

##### 3. Try Alternative Processing
```javascript
// Force text extraction method
const textContent = await page.getTextContent()
const text = textContent.items.map(item => item.str).join(' ')
```

#### Debug Steps
```javascript
// Log PDF processing steps
console.log('PDF pages:', pdf.numPages)
console.log('Page text length:', pageText.length)
console.log('Extracted text sample:', pageText.substring(0, 200))
```

### Problem: Shift Recognition Fails

#### Symptoms
- PDF processes but shifts not recognized
- All shifts show as "unrecognized"
- Wrong shift types assigned
- Missing shifts in preview

#### Solutions

##### 1. Check Shift Type Configuration
```json
// Verify shiftTypes.json configuration
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

##### 2. Verify Hospital and Department Selection
```javascript
// Check current selections
console.log('Hospital:', currentKrankenhaus)
console.log('Profession:', professionSelect.value)
console.log('Department:', bereichSelect.value)
console.log('Preset:', presetSelect.value)
```

##### 3. Check Time Format
```javascript
// Ensure times are in correct format (HH:MM)
// Example: "07:35" not "7:35" or "7:35 AM"
```

#### Debug Steps
```javascript
// Log parsing process
console.log('PDF text sample:', pdfText.substring(0, 500))
console.log('Shift types config:', shiftTypes)
console.log('Parsed entries:', parsed.entries)
```

## Google Calendar Issues

### Problem: Google Calendar Connection Fails

#### Symptoms
- "Connection failed" error message
- OAuth popup doesn't open
- Authentication popup closes immediately
- "Invalid client ID" error

#### Possible Causes
1. **Invalid Client ID**: Incorrect or expired Google Client ID
2. **API Not Enabled**: Google Calendar API not enabled
3. **Domain Not Authorized**: Domain not in authorized origins
4. **Network Issues**: Internet connectivity problems
5. **Browser Blocking**: Popup blocker or security settings

#### Solutions

##### 1. Verify Google Cloud Console Setup
```bash
# Check Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to "APIs & Services" > "Credentials"
4. Verify OAuth 2.0 Client ID exists
5. Check "Authorized JavaScript origins"
```

##### 2. Update Authorized Origins
```bash
# Add your domain to authorized origins
http://localhost:8080          # Development
https://yourdomain.com         # Production
```

##### 3. Enable Google Calendar API
```bash
# In Google Cloud Console
1. Go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click "Enable"
```

##### 4. Check Client ID Format
```javascript
// Client ID should look like this
const CLIENT_ID = '123456789-abcdefghijklmnop.apps.googleusercontent.com'
```

#### Debug Steps
```javascript
// Check Google API loading
console.log('Google API loaded:', typeof gapi !== 'undefined')
console.log('Client ID:', CLIENT_ID)

// Test OAuth flow
gapi.load('client:auth2', () => {
  console.log('Google API client loaded')
})
```

### Problem: Calendar Events Not Created

#### Symptoms
- Authentication successful but no events created
- "Sync failed" error message
- Events appear but with wrong details
- Duplicate events created

#### Solutions

##### 1. Check Calendar Permissions
```bash
# Verify calendar access
1. Go to Google Calendar
2. Check calendar sharing settings
3. Ensure calendar is writable
4. Verify user has edit permissions
```

##### 2. Check Event Creation Process
```javascript
// Log event creation
console.log('Creating events for calendar:', calendarId)
console.log('Number of entries:', entries.length)
console.log('First entry:', entries[0])
```

##### 3. Handle Duplicate Events
```javascript
// Check for existing events before creating
const existingEvents = await gapi.client.calendar.events.list({
  calendarId: calendarId,
  timeMin: startDate,
  timeMax: endDate
})
```

#### Debug Steps
```javascript
// Monitor API calls
console.log('API response:', response)
console.log('Created events:', createdEvents)
console.log('Failed events:', failedEvents)
```

### Problem: OAuth Token Expired

#### Symptoms
- "Token expired" error message
- Calendar operations fail after some time
- Need to re-authenticate frequently

#### Solutions

##### 1. Implement Token Refresh
```javascript
// Check token expiration
const expiresAt = user.getAuthResponse().expires_at
const isExpired = Date.now() >= expiresAt

if (isExpired) {
  await user.reloadAuthResponse()
}
```

##### 2. Automatic Re-authentication
```javascript
// Handle token expiration gracefully
try {
  await calendarOperation()
} catch (error) {
  if (error.status === 401) {
    await authenticateUser()
    await calendarOperation()
  }
}
```

## Configuration Issues

### Problem: Shift Types Not Loading

#### Symptoms
- "No shift types available" message
- Empty shift type dropdown
- Default shift types not showing
- Hospital-specific configurations not working

#### Solutions

##### 1. Check Configuration File
```bash
# Verify shiftTypes.json exists and is valid
ls -la krankenhaeuser/st-elisabeth-leipzig/shiftTypes.json

# Validate JSON format
cat krankenhaeuser/st-elisabeth-leipzig/shiftTypes.json | jq .
```

##### 2. Check File Path
```javascript
// Verify file loading path
const configPath = `krankenhaeuser/${hospitalName}/shiftTypes.json`
console.log('Loading config from:', configPath)
```

##### 3. Validate JSON Structure
```json
// Ensure proper JSON structure
{
  "pflege": {
    "op": {
      "default": {
        "07:35-15:50": "F"
      }
    }
  }
}
```

#### Debug Steps
```javascript
// Log configuration loading
console.log('Hospital:', hospitalName)
console.log('Loaded config:', shiftTypes)
console.log('Available professions:', Object.keys(shiftTypes))
```

### Problem: Hospital Configuration Not Found

#### Symptoms
- Hospital not in dropdown list
- "Hospital not found" error
- Default configuration used instead

#### Solutions

##### 1. Add Hospital Configuration
```bash
# Create new hospital directory
mkdir -p krankenhaeuser/new-hospital

# Create shiftTypes.json
cat > krankenhaeuser/new-hospital/shiftTypes.json << EOF
{
  "pflege": {
    "op": {
      "default": {
        "07:35-15:50": "F"
      }
    }
  }
}
EOF
```

##### 2. Update Hospital Selection
```javascript
// Add hospital to dropdown
const hospitalSelect = document.getElementById('krankenhausSelect')
const option = document.createElement('option')
option.value = 'new-hospital'
option.textContent = 'New Hospital'
hospitalSelect.appendChild(option)
```

## Export Issues

### Problem: CSV Export Fails

#### Symptoms
- "Download failed" error message
- File not downloaded
- Empty CSV file
- Wrong file format

#### Solutions

##### 1. Check Browser Download Settings
```bash
# Verify browser allows downloads
# Check download folder permissions
# Disable popup blockers for downloads
```

##### 2. Verify CSV Generation
```javascript
// Check CSV content
console.log('CSV content:', csv)
console.log('CSV length:', csv.length)

// Test CSV format
const lines = csv.split('\n')
console.log('CSV lines:', lines.length)
console.log('CSV headers:', lines[0])
```

##### 3. Handle Large Files
```javascript
// Use blob for large files
const blob = new Blob([csv], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
```

#### Debug Steps
```javascript
// Log export process
console.log('Entries to export:', entries.length)
console.log('Generated CSV:', csv.substring(0, 200))
```

### Problem: ICS Export Fails

#### Symptoms
- ICS file not generated
- Calendar import fails
- Wrong event details in calendar
- Time zone issues

#### Solutions

##### 1. Verify ICS Format
```ics
# Check ICS file structure
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

##### 2. Fix Time Zone Issues
```javascript
// Use proper time zone format
const startDateTime = `${date}T${startTime}:00`
const endDateTime = `${date}T${endTime}:00`
```

##### 3. Generate Unique UIDs
```javascript
// Create unique event IDs
const uid = `shift-${date}-${shiftType}-${Math.random().toString(36).substr(2, 9)}`
```

## Browser Compatibility Issues

### Problem: Application Not Working in Browser

#### Symptoms
- Application doesn't load
- JavaScript errors in console
- Features not working
- Layout broken

#### Solutions

##### 1. Check Browser Support
```javascript
// Test browser compatibility
console.log('User Agent:', navigator.userAgent)
console.log('ES6 Support:', typeof Promise !== 'undefined')
console.log('File API Support:', typeof File !== 'undefined')
```

##### 2. Update Browser
```bash
# Recommended browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
```

##### 3. Enable JavaScript
```bash
# Ensure JavaScript is enabled
# Disable content blockers temporarily
# Allow popups for the site
```

##### 4. Clear Browser Cache
```bash
# Clear cache and cookies
# Try incognito/private mode
# Disable browser extensions
```

## Performance Issues

### Problem: Slow PDF Processing

#### Symptoms
- PDF processing takes too long
- Browser becomes unresponsive
- Memory usage high
- Processing fails for large files

#### Solutions

##### 1. Optimize File Size
```bash
# Compress PDF files
# Use text-based PDFs instead of scanned
# Split large PDFs into smaller files
```

##### 2. Implement Progress Indication
```javascript
// Show processing progress
function updateProgress(percent) {
  const progressBar = document.getElementById('progress')
  progressBar.style.width = percent + '%'
  progressBar.textContent = percent + '%'
}
```

##### 3. Use Web Workers
```javascript
// Process PDF in background thread
const worker = new Worker('pdf-worker.js')
worker.postMessage({ pdfData: arrayBuffer })
worker.onmessage = function(e) {
  const result = e.data
  // Handle result
}
```

### Problem: High Memory Usage

#### Symptoms
- Browser becomes slow
- Memory warnings
- Application crashes
- Large file processing fails

#### Solutions

##### 1. Implement Memory Management
```javascript
// Clear unused data
function cleanup() {
  // Clear caches
  shiftTypesCache.clear()
  
  // Remove event listeners
  document.removeEventListener('drop', handleDrop)
  
  // Clear intervals/timeouts
  clearInterval(updateInterval)
}
```

##### 2. Use Streaming Processing
```javascript
// Process large files in chunks
function processInChunks(data, chunkSize) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    processChunk(chunk)
  }
}
```

## Network Issues

### Problem: Google API Connection Fails

#### Symptoms
- "Network error" messages
- API calls timeout
- Authentication fails
- Calendar operations fail

#### Solutions

##### 1. Check Network Connectivity
```bash
# Test internet connection
ping google.com

# Test DNS resolution
nslookup googleapis.com

# Check firewall settings
```

##### 2. Implement Retry Logic
```javascript
// Retry failed API calls
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

##### 3. Handle Offline Mode
```javascript
// Check online status
if (!navigator.onLine) {
  showOfflineMessage()
  return
}
```

## Getting Help

### When to Contact Support

Contact support if you encounter:
- **Critical bugs**: Application crashes or data loss
- **Security issues**: Unauthorized access or data breaches
- **Performance problems**: Consistent slow performance
- **Feature requests**: Missing functionality

### Information to Provide

When reporting issues, include:
1. **Browser and version**: Chrome 90+, Firefox 88+, etc.
2. **Operating system**: Windows 10, macOS 11, Linux, etc.
3. **Error messages**: Exact error text from console
4. **Steps to reproduce**: Detailed reproduction steps
5. **Expected vs actual behavior**: What should happen vs what happens
6. **Screenshots**: Visual evidence of the issue

### Debug Information

Collect debug information:
```javascript
// Run this in browser console
console.log('Debug Info:', {
  userAgent: navigator.userAgent,
  url: window.location.href,
  timestamp: new Date().toISOString(),
  pdfJsVersion: window.pdfjsLib?.version,
  googleApiLoaded: typeof gapi !== 'undefined'
})
```

---

*For more detailed information, see the [Configuration Guide](./config.md) and [API Reference](../04_api-reference/endpoints.md).*
