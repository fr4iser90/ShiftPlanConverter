# Installation Guide

## Overview

This guide will help you install and set up ShiftPlanConverter on your system. The application can be deployed using Docker for easy setup and management.

## Prerequisites

Before installing ShiftPlanConverter, ensure you have the following:

### System Requirements
- **Operating System**: Linux, macOS, or Windows
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Web Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Internet Connection**: Required for Google Calendar integration

### Google Cloud Setup (Optional)
For Google Calendar integration, you'll need:
- Google Cloud Console account
- Google Calendar API enabled
- OAuth 2.0 credentials (Client ID)

## Installation Methods

### Method 1: Docker Installation (Recommended)

#### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/ShiftPlanConverter.git
cd ShiftPlanConverter
```

#### Step 2: Start the Application
```bash
docker-compose up -d
```

#### Step 3: Access the Application
Open your web browser and navigate to:
```
http://localhost:8080
```

### Method 2: Manual Installation

#### Step 1: Download the Source Code
```bash
git clone https://github.com/your-username/ShiftPlanConverter.git
cd ShiftPlanConverter
```

#### Step 2: Set Up Web Server
Since this is a client-side application, you can use any web server:

**Using Python (Python 3):**
```bash
python -m http.server 8080
```

**Using Node.js:**
```bash
npx http-server -p 8080
```

**Using PHP:**
```bash
php -S localhost:8080
```

#### Step 3: Access the Application
Open your web browser and navigate to:
```
http://localhost:8080
```

## Google Calendar Setup (Optional)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API

### Step 2: Create OAuth 2.0 Credentials
1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized JavaScript origins:
   - `http://localhost:8080` (for development)
   - `https://yourdomain.com` (for production)
5. Copy the Client ID for use in the application

### Step 3: Configure the Application
1. Open ShiftPlanConverter in your browser
2. Paste your Google Client ID in the "Google Client ID" field
3. Click "Mit Google Kalender verbinden" to test the connection

## Configuration

### Hospital Configuration
The application supports custom hospital configurations:

1. Navigate to the `krankenhaeuser/` directory
2. Create a new folder for your hospital
3. Add a `shiftTypes.json` file with your shift type definitions

Example configuration:
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

### Environment Variables
For production deployment, you can set the following environment variables:

```bash
# Port for the web server
PORT=8080

# Google Client ID (optional)
GOOGLE_CLIENT_ID=your_client_id_here
```

## Verification

### Test the Installation
1. **Basic Functionality**: Upload a test PDF to verify processing works
2. **Google Calendar**: Test the calendar integration if configured
3. **Export Features**: Verify CSV and ICS export functionality

### Common Issues

#### Docker Issues
- **Port already in use**: Change the port in `docker-compose.yml`
- **Permission denied**: Run with `sudo` or add user to docker group
- **Container won't start**: Check logs with `docker-compose logs`

#### Browser Issues
- **PDF not loading**: Ensure the PDF is text-based, not scanned images
- **Google Calendar not connecting**: Verify Client ID and API permissions
- **CORS errors**: Ensure proper domain configuration in Google Cloud Console

## Next Steps

After successful installation:

1. **Read the [Quick Start Guide](./quick-start.md)** to learn how to use the application
2. **Configure your hospital settings** in the application
3. **Set up Google Calendar integration** for automatic synchronization
4. **Test with your shift schedule PDFs**

## Support

If you encounter issues during installation:

1. Check the [Troubleshooting Guide](../08_reference/troubleshooting.md)
2. Review the browser console for error messages
3. Check Docker logs: `docker-compose logs`
4. Create an issue on the GitHub repository

---

*For development setup, see the [Development Guide](../05_development/setup.md).*
