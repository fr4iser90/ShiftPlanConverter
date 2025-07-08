# Quick Start Guide

## Overview

This guide will get you up and running with ShiftPlanConverter in under 5 minutes. You'll learn how to convert your first shift schedule PDF and sync it with your calendar.

## Prerequisites

- ShiftPlanConverter installed and running (see [Installation Guide](./installation.md))
- A shift schedule PDF file
- Google account (optional, for calendar integration)

## Step 1: Access the Application

1. Open your web browser
2. Navigate to `http://localhost:8080` (or your deployment URL)
3. You should see the ShiftPlanConverter interface

## Step 2: Configure Your Hospital Settings

### Select Your Hospital
1. In the top-right corner, select your hospital from the dropdown
2. If your hospital isn't listed, you can use the default configuration

### Choose Your Department
1. Select your **Profession** (e.g., "Pflege" for nursing)
2. Select your **Department** (e.g., "OP" for operating room)
3. Select your **Shift Type Set** (e.g., "default")

### Verify Shift Types
The right panel shows your current shift type mappings:
- **F**: 07:35-15:50 (Early shift)
- **F1**: 08:30-16:45 (Early shift variant)
- **M1**: 10:00-18:15 (Mid shift)
- **B36**: 07:35-19:35 (Long shift)
- **B38**: 19:50-07:35 (Night shift)

## Step 3: Upload Your PDF

### Method 1: Drag and Drop
1. Drag your shift schedule PDF file onto the upload area
2. The file will be processed automatically

### Method 2: Click to Select
1. Click the upload area
2. Select your PDF file from the file dialog
3. The file will be processed automatically

### What Happens During Processing
- PDF text is extracted using PDF.js
- Shift patterns are automatically recognized
- A preview is generated showing your shifts

## Step 4: Review the Preview

After processing, you'll see:
- **Calendar View**: Monthly calendar showing your shifts
- **Shift Summary**: Count of different shift types
- **Data Validation**: Any unrecognized patterns highlighted

### Understanding the Preview
- **Green**: Regular shifts (F, M, etc.)
- **Blue**: Long shifts (B36, B38)
- **Orange**: Vacation days
- **Red**: Holidays
- **Gray**: Unrecognized patterns

## Step 5: Export Your Data

### Option A: Download CSV
1. Click "Dienstplan herunterladen" (Download Shift Schedule)
2. Save the CSV file to your computer
3. Open in Excel, Google Sheets, or similar

### Option B: Export to ICS
1. Click "Als .ics-Datei exportieren"
2. Save the ICS file
3. Import into your calendar application

## Step 6: Google Calendar Integration (Optional)

### Set Up Google Calendar
1. **Get a Google Client ID**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials
   - Copy the Client ID

2. **Connect to Google Calendar**:
   - Paste your Client ID in the "Google Client ID" field
   - Click "Mit Google Kalender verbinden"
   - Authorize the application in the popup
   - Select your target calendar

3. **Sync Your Shifts**:
   - Click "Mit Kalender synchronisieren"
   - Your shifts will be added to your Google Calendar

## Common Workflow

### Daily Usage
1. **Upload PDF**: New shift schedule from your hospital
2. **Review**: Check that all shifts are recognized correctly
3. **Export**: Download CSV for your records
4. **Sync**: Update your Google Calendar

### Weekly Usage
1. **Batch Process**: Upload multiple PDFs
2. **Review All**: Check all schedules for accuracy
3. **Calendar Sync**: Update all calendars at once
4. **Backup**: Save CSV files for record keeping

## Tips for Best Results

### PDF Quality
- **Text-based PDFs**: Work best (not scanned images)
- **Standard Format**: Use hospital's standard shift schedule format
- **Clear Text**: Ensure text is readable and not corrupted

### Shift Recognition
- **Consistent Format**: Use the same format for all shifts
- **Time Format**: Use 24-hour format (07:35, not 7:35 AM)
- **Shift Codes**: Use standard codes (F, M, B, etc.)

### Calendar Integration
- **Dedicated Calendar**: Create a separate calendar for work shifts
- **Regular Sync**: Sync after each schedule update
- **Backup**: Keep CSV exports as backup

## Troubleshooting Quick Fixes

### PDF Not Loading
- **Check Format**: Ensure it's a text-based PDF
- **Try Different File**: Test with a known working PDF
- **Browser**: Try a different browser

### Shifts Not Recognized
- **Check Configuration**: Verify hospital and department settings
- **Time Format**: Ensure times are in correct format
- **Shift Codes**: Check if codes match your configuration

### Google Calendar Issues
- **Client ID**: Verify Google Client ID is correct
- **Authorization**: Re-authorize the application
- **Calendar Selection**: Ensure correct calendar is selected

## Next Steps

Now that you're familiar with the basics:

1. **Explore Advanced Features**: Check out the [Features Overview](../03_features/overview.md)
2. **Customize Configuration**: Learn about [Configuration Options](../08_reference/config.md)
3. **Add Your Hospital**: See how to [Add New Hospital Configurations](../08_reference/config.md#hospital-configuration)
4. **Troubleshoot Issues**: Visit the [Troubleshooting Guide](../08_reference/troubleshooting.md)

## Keyboard Shortcuts

- **Ctrl+O**: Open file dialog
- **Ctrl+S**: Download CSV (after processing)
- **Ctrl+G**: Focus Google Client ID field
- **F5**: Refresh page

## Support

If you need help:
1. Check the [Troubleshooting Guide](../08_reference/troubleshooting.md)
2. Review browser console for error messages
3. Create an issue on the GitHub repository

---

*This quick start guide covers the essential steps to get you using ShiftPlanConverter immediately. For detailed information, refer to the other documentation sections.*
