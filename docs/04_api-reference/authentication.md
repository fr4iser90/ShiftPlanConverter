# Authentication Guide

## Overview

ShiftPlanConverter uses OAuth 2.0 for secure authentication with Google Calendar API. This document provides detailed information about the authentication process, security considerations, and implementation details.

## OAuth 2.0 Flow

### Overview
ShiftPlanConverter implements the OAuth 2.0 Authorization Code flow with PKCE (Proof Key for Code Exchange) for enhanced security.

### Authentication Flow Diagram
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User      │    │ ShiftPlanConverter │    │   Google OAuth  │
│             │    │                 │    │                 │
└─────────────┘    └─────────────────┘    └─────────────────┘
       │                     │                     │
       │ 1. Enter Client ID  │                     │
       │ ──────────────────► │                     │
       │                     │                     │
       │                     │ 2. Init OAuth       │
       │                     │ ──────────────────► │
       │                     │                     │
       │                     │ 3. Redirect to Auth │
       │                     │ ◄────────────────── │
       │                     │                     │
       │ 4. Authorize App    │                     │
       │ ──────────────────► │                     │
       │                     │                     │
       │                     │ 5. Auth Code        │
       │                     │ ◄────────────────── │
       │                     │                     │
       │                     │ 6. Exchange Code    │
       │                     │ ──────────────────► │
       │                     │                     │
       │                     │ 7. Access Token     │
       │                     │ ◄────────────────── │
       │                     │                     │
       │ 8. Calendar Access  │                     │
       │ ◄────────────────── │                     │
```

## Implementation Details

### 1. Client ID Setup

#### Google Cloud Console Configuration
1. **Create Project**: Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable APIs**: Enable Google Calendar API
3. **Create Credentials**: Create OAuth 2.0 Client ID
4. **Configure Origins**: Add authorized JavaScript origins

#### Required Configuration
```javascript
// Authorized JavaScript origins
http://localhost:8080          // Development
https://yourdomain.com         // Production

// Authorized redirect URIs
http://localhost:8080/         // Development
https://yourdomain.com/        // Production
```

#### Client ID Format
```javascript
const CLIENT_ID = '123456789-abcdefghijklmnop.apps.googleusercontent.com'
```

### 2. OAuth Initialization

#### Initialize Google Calendar Integration
```javascript
// Initialize with client ID
initGoogleCalendar(CLIENT_ID)

// Configuration options
const config = {
  clientId: CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/calendar',
  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
  ux_mode: 'popup',
  redirect_uri: window.location.origin
}
```

#### Required Scopes
```javascript
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',           // Full calendar access
  'https://www.googleapis.com/auth/calendar.events'     // Read/write events
]
```

### 3. Authentication Process

#### Step 1: User Authentication
```javascript
async function authenticateUser() {
  try {
    // Load Google API client
    await gapi.load('client:auth2', async () => {
      await gapi.client.init(config)
      
      // Check if user is already signed in
      if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        // Sign in user
        await gapi.auth2.getAuthInstance().signIn()
      }
      
      // Load calendar API
      await gapi.client.load('calendar', 'v3')
      
      return true
    })
  } catch (error) {
    console.error('Authentication failed:', error)
    throw new AuthenticationError('Failed to authenticate with Google', error)
  }
}
```

#### Step 2: Token Management
```javascript
// Get current user
const user = gapi.auth2.getAuthInstance().currentUser.get()

// Get access token
const accessToken = user.getAuthResponse().access_token

// Check token expiration
const expiresAt = user.getAuthResponse().expires_at
const isExpired = Date.now() >= expiresAt

// Refresh token if needed
if (isExpired) {
  await user.reloadAuthResponse()
}
```

### 4. Calendar Access

#### List Available Calendars
```javascript
async function listCalendars() {
  try {
    const response = await gapi.client.calendar.calendarList.list({
      maxResults: 100,
      showDeleted: false,
      showHidden: false
    })
    
    return response.result.items
  } catch (error) {
    console.error('Failed to list calendars:', error)
    throw new CalendarError('Failed to retrieve calendars', error)
  }
}
```

#### Select Target Calendar
```javascript
async function selectCalendar(calendarId) {
  try {
    // Verify calendar access
    const calendar = await gapi.client.calendar.calendars.get({
      calendarId: calendarId
    })
    
    // Store selected calendar
    localStorage.setItem('selectedCalendarId', calendarId)
    
    return calendar.result
  } catch (error) {
    console.error('Failed to select calendar:', error)
    throw new CalendarError('Failed to access calendar', error)
  }
}
```

## Security Considerations

### 1. Token Security

#### Secure Token Storage
```javascript
// Store tokens securely (in memory only)
let accessToken = null
let refreshToken = null

// Never store tokens in localStorage or sessionStorage
// Tokens are kept in memory and cleared on page refresh
```

#### Token Validation
```javascript
function validateToken(token) {
  if (!token) {
    throw new AuthenticationError('No access token available')
  }
  
  // Check token format
  if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
    throw new AuthenticationError('Invalid token format')
  }
  
  return true
}
```

### 2. Request Security

#### Secure API Calls
```javascript
async function makeSecureRequest(endpoint, data) {
  try {
    // Validate authentication
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
      throw new AuthenticationError('User not authenticated')
    }
    
    // Get fresh token
    const user = gapi.auth2.getAuthInstance().currentUser.get()
    const token = user.getAuthResponse().access_token
    
    // Make request with token
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    
    return response.json()
  } catch (error) {
    console.error('Request failed:', error)
    throw error
  }
}
```

#### HTTPS Enforcement
```javascript
// Ensure HTTPS in production
if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
  throw new SecurityError('HTTPS required for authentication')
}
```

### 3. Error Handling

#### Authentication Errors
```javascript
class AuthenticationError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'AuthenticationError'
    this.cause = cause
  }
}

// Handle authentication errors
function handleAuthError(error) {
  switch (error.name) {
    case 'AuthenticationError':
      // Re-authenticate user
      authenticateUser()
      break
    case 'TokenExpiredError':
      // Refresh token
      refreshToken()
      break
    default:
      // Log and show user-friendly message
      console.error('Authentication error:', error)
      showErrorMessage('Authentication failed. Please try again.')
  }
}
```

## Best Practices

### 1. Security Best Practices

#### Client ID Protection
- **Never expose in client code**: Use environment variables
- **Validate on server**: Verify client ID on backend
- **Rotate regularly**: Change client IDs periodically

#### Token Management
- **Minimal scope**: Request only necessary permissions
- **Short expiration**: Use short-lived access tokens
- **Secure refresh**: Implement secure token refresh
- **Immediate cleanup**: Clear tokens on logout

#### Request Security
- **HTTPS only**: Always use HTTPS in production
- **Validate requests**: Validate all API requests
- **Rate limiting**: Implement request rate limiting
- **Error handling**: Don't expose sensitive information

### 2. User Experience

#### Seamless Authentication
```javascript
// Check authentication status on page load
window.addEventListener('load', async () => {
  try {
    // Check if user is already authenticated
    if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
      // User is already signed in
      await loadUserCalendars()
    } else {
      // Show sign-in button
      showSignInButton()
    }
  } catch (error) {
    console.error('Failed to check authentication:', error)
  }
})
```

#### Clear User Feedback
```javascript
// Show authentication status
function updateAuthStatus(isAuthenticated) {
  const statusElement = document.getElementById('auth-status')
  
  if (isAuthenticated) {
    statusElement.textContent = '✓ Connected to Google Calendar'
    statusElement.className = 'text-green-600'
  } else {
    statusElement.textContent = '⚠ Not connected to Google Calendar'
    statusElement.className = 'text-red-600'
  }
}
```

### 3. Error Recovery

#### Automatic Retry
```javascript
async function retryWithRefresh(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (error.status === 401 && i < maxRetries - 1) {
        // Token expired, try to refresh
        await refreshToken()
        continue
      }
      throw error
    }
  }
}
```

#### Graceful Degradation
```javascript
// Fallback when authentication fails
function handleAuthFailure() {
  // Disable calendar features
  disableCalendarFeatures()
  
  // Show alternative options
  showExportOptions()
  
  // Provide clear instructions
  showAuthInstructions()
}
```

## Troubleshooting

### Common Issues

#### 1. "Invalid Client ID" Error
**Cause**: Incorrect or expired client ID
**Solution**:
- Verify client ID in Google Cloud Console
- Check authorized origins configuration
- Ensure client ID is correctly copied

#### 2. "Access Denied" Error
**Cause**: Insufficient permissions
**Solution**:
- Check required scopes are enabled
- Verify user has granted necessary permissions
- Check calendar access permissions

#### 3. "Token Expired" Error
**Cause**: Access token has expired
**Solution**:
- Implement automatic token refresh
- Re-authenticate user if refresh fails
- Clear stored tokens and re-authenticate

#### 4. "CORS Error" Error
**Cause**: Cross-origin request blocked
**Solution**:
- Ensure proper origin configuration
- Use HTTPS in production
- Check redirect URI configuration

### Debug Information

#### Enable Debug Logging
```javascript
// Enable Google API debug logging
gapi.load('client:auth2', {
  callback: function() {
    console.log('Google API loaded successfully')
  },
  onerror: function() {
    console.error('Failed to load Google API')
  }
})
```

#### Check Authentication Status
```javascript
function checkAuthStatus() {
  const authInstance = gapi.auth2.getAuthInstance()
  
  console.log('Is signed in:', authInstance.isSignedIn.get())
  console.log('Current user:', authInstance.currentUser.get())
  console.log('Auth response:', authInstance.currentUser.get().getAuthResponse())
}
```

---

*For API endpoint details, see [API Reference](./endpoints.md).*
