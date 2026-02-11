# Development Applications Tracking System - Setup Guide

This guide walks through setting up the automated Development Applications (DA) tracking system that fetches data weekly from the DPHI ePlanning Portal.

## Overview

The system consists of:
- **Database Table**: Stores monthly DA determination data per LGA
- **Data Fetching Script**: Fetches and processes DA data from DPHI API
- **API Route**: Serves DA data to the dashboard
- **Dashboard Card**: Displays DA trends and statistics
- **Automated Updates**: Weekly cron job to refresh data

---

## Step 1: Obtain DPHI API Key

### Register for API Access

1. Visit the [NSW Planning Portal Developer Portal](https://www.planningportal.nsw.gov.au/apis-reporting/apis-eplanning-digital-services)

2. Create an account or log in

3. Request a subscription key for the **Online DA Data API**

4. Wait for approval (typically 1-2 business days)

5. Once approved, copy your **Subscription Key**

### Store API Key

Add your API key to `.env.local` in the project root:

```bash
# /Users/ben/Dashboard/.env.local

# DPHI ePlanning API Subscription Key
DPHI_API_KEY=your-subscription-key-here
```

**Security Note**: Never commit `.env.local` to version control. It's already in `.gitignore`.

---

## Step 2: Create Database Table

### Run SQL Migration

Execute the SQL script to create the table and set permissions:

```bash
cd /Users/ben/Dashboard

# Connect to database and run script
psql -h mecone-data-lake.postgres.database.azure.com \
  -U db_admin \
  -d "research&insights" \
  -f database/create-development-applications-table.sql
```

When prompted, enter the admin password from `/users/ben/permissions/.env.admin`.

### Verify Table Creation

```sql
-- Check table exists
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'development_applications';

-- Check permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'development_applications';
```

Expected result:
- `mosaic_readonly`: SELECT
- `db_admin`: SELECT, INSERT, UPDATE, DELETE

---

## Step 3: Test Data Fetching Script

### Manual Test Run

Before setting up automation, test the script manually:

```bash
cd /Users/ben/Dashboard

# Run the script
node scripts/fetch-development-applications.js
```

**Expected Output:**
```
[DA Fetcher] Starting at 2024-01-23T12:00:00.000Z
[DB] Database connection established
[DPHI API] Fetching data from https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA...
[DPHI API] Success: Received 15234 records
[Processing] Aggregating data by LGA and month...
[Processing] Aggregated into 1247 LGA-month combinations
[DB] Upserting data to database...
[DB] Upsert complete: 1247 successful, 0 failed

[DA Fetcher] Completed in 12.45s
[Summary] Total records: 1247 successful, 0 failed
[DB] Database connection closed
```

### Troubleshooting

**Error: "DPHI_API_KEY not found"**
- Ensure `.env.local` exists in project root
- Check API key is on a new line: `DPHI_API_KEY=your-key-here`
- No quotes needed around the key

**Error: "API request failed with status 401"**
- Verify API key is correct
- Check subscription is active on NSW Planning Portal
- Ensure key has permissions for Online DA Data API

**Error: "Failed to read admin database password"**
- Verify `/users/ben/permissions/.env.admin` exists
- Check file has `PASSWORD=your-password` line

**Error: "permission denied for table development_applications"**
- Re-run the SQL migration script (Step 2)
- Verify permissions were granted correctly

---

## Step 4: Set Up Automated Weekly Updates

### Option A: System Cron (Recommended)

Set up a cron job to run the script every Sunday at 8 PM:

```bash
# Open crontab editor
crontab -e
```

Add this line:

```cron
# Development Applications Data Update - Every Sunday at 8 PM
0 20 * * 0 cd /Users/ben/Dashboard && /usr/local/bin/node scripts/fetch-development-applications.js >> /tmp/da-update.log 2>&1
```

**Breakdown:**
- `0 20 * * 0`: Sunday at 20:00 (8 PM)
- `cd /Users/ben/Dashboard`: Navigate to project directory
- `/usr/local/bin/node`: Full path to Node.js (run `which node` to verify)
- `>> /tmp/da-update.log 2>&1`: Append output to log file

**Find Node.js Path:**
```bash
which node
# Use the output in your cron job
```

### Option B: macOS LaunchAgent (Alternative)

Create a LaunchAgent plist file for more control:

```bash
# Create plist file
nano ~/Library/LaunchAgents/com.dashboard.da-fetcher.plist
```

Paste this content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dashboard.da-fetcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/ben/Dashboard/scripts/fetch-development-applications.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>20</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/da-update.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/da-update-error.log</string>
</dict>
</plist>
```

Load the agent:

```bash
launchctl load ~/Library/LaunchAgents/com.dashboard.da-fetcher.plist
```

### Verify Cron Job

```bash
# List all cron jobs
crontab -l

# Or for LaunchAgent
launchctl list | grep da-fetcher
```

### View Logs

```bash
# View recent log entries
tail -n 50 /tmp/da-update.log

# Watch log in real-time
tail -f /tmp/da-update.log
```

---

## Step 5: Test Dashboard Card

### Start Development Server

```bash
cd /Users/ben/Dashboard
npm run dev
```

### Access Dashboard

1. Open browser: `http://localhost:3000/dashboard`

2. **Select an LGA** from the "Search Geography" card

3. The **Development Applications** card should automatically load data

### Expected Behavior

- **Loading State**: Shows spinner while fetching data
- **Data Display**: Line chart with monthly DA determinations over last 12 months
- **Summary Stats**: Total determined, approved, refused, withdrawn with percentages
- **Auto-Refresh**: Card updates when you select a different LGA

### Troubleshooting Card

**No Data Displayed**
- Check if data exists in database (run manual script first)
- Verify LGA name matches exactly (case-sensitive)
- Check browser console for API errors

**Card Shows Error**
- Open browser DevTools (F12) → Console tab
- Look for API error messages
- Check Network tab for failed requests

**Slow Loading**
- Database query may need optimization
- Check readonly pool connection status
- Verify indexes were created correctly

---

## Step 6: Maintenance & Monitoring

### Weekly Checks (Optional)

```bash
# Check last update time
psql -h mecone-data-lake.postgres.database.azure.com \
  -U mosaic_readonly \
  -d "research&insights" \
  -c "SELECT MAX(data_updated_at) as last_update FROM housing_dashboard.development_applications;"
```

### Monthly Data Review

```bash
# Check data completeness
psql -h mecone-data-lake.postgres.database.azure.com \
  -U mosaic_readonly \
  -d "research&insights" \
  -c "SELECT
        COUNT(DISTINCT lga_code) as total_lgas,
        COUNT(*) as total_records,
        MAX(month_year) as latest_month,
        MIN(month_year) as earliest_month
      FROM housing_dashboard.development_applications;"
```

### Log Rotation

Keep log files from growing too large:

```bash
# Truncate log file monthly
echo "" > /tmp/da-update.log
```

Or set up logrotate (advanced).

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interaction                         │
│  1. User selects LGA in dashboard                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (React Card)                        │
│  DevelopmentApplicationsCard.tsx                             │
│  - Sends POST request with LGA name                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              API Route (Next.js)                             │
│  /api/development-applications                               │
│  - Queries database for LGA-specific data                   │
│  - Returns JSON with monthly DA statistics                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                           │
│  housing_dashboard.development_applications                  │
│  - Stores monthly DA data per LGA                            │
└────────────────────▲────────────────────────────────────────┘
                     │
                     │ (Weekly Update)
                     │
┌─────────────────────────────────────────────────────────────┐
│            Automated Data Fetching                           │
│  Cron Job (Sundays 8 PM)                                     │
│  ├─ Fetches data from DPHI API                               │
│  ├─ Aggregates by LGA and month                              │
│  └─ Upserts to database                                      │
└─────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           External API (DPHI ePlanning)                      │
│  https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA    │
│  - Provides DA records from NSW councils                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Files Created

- `database/create-development-applications-table.sql` - Database schema
- `scripts/fetch-development-applications.js` - Data fetching script
- `src/app/api/development-applications/route.ts` - API endpoint
- `src/components/dashboard/DevelopmentApplicationsCard.tsx` - UI component

### Environment Variables

- `DPHI_API_KEY` - DPHI ePlanning API subscription key (in `.env.local`)

### Database Table

- **Schema**: `housing_dashboard`
- **Table**: `development_applications`
- **Key Columns**: `lga_code`, `month_year`, `total_determined`, `approved`, `refused`

### Cron Schedule

- **Frequency**: Weekly
- **Day**: Sunday
- **Time**: 8:00 PM (20:00)

### Log File

- **Location**: `/tmp/da-update.log`
- **Format**: Timestamped entries with success/error messages

---

## Support & Troubleshooting

### Common Issues

1. **API Key Issues**: Verify key is active on NSW Planning Portal
2. **Database Permissions**: Re-run SQL migration script
3. **Cron Not Running**: Check Node.js path with `which node`
4. **No Data in Card**: Run manual script first to populate database

### Getting Help

- **DPHI API Documentation**: https://www.planningportal.nsw.gov.au/apis-reporting
- **Project Issues**: Check `/tmp/da-update.log` for error messages
- **Database Issues**: Verify connection with readonly or admin credentials

---

## Next Steps

Once setup is complete:

1. ✅ Data will automatically update every Sunday evening
2. ✅ Dashboard card will show real-time DA trends for any selected LGA
3. ✅ Historical data accumulates over time for trend analysis

**Note**: Initial data fetch may take 10-15 minutes depending on API data volume. Subsequent updates are typically faster (incremental updates).
