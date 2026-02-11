# Development Applications Comprehensive Tracking System

## 📋 Overview

Complete DA tracking system with:
- **2 database tables**: Raw records + Pre-aggregated views (daily/weekly/monthly)
- **2 data scripts**: Fetch from API + Aggregate data
- **1 unified API route**: Serves all 6 card types
- **6 dashboard cards**: Daily, Weekly, Monthly, 13-Month, YoY Comparison, Complete History

---

## 🗄️ Phase 1: Database Setup

### Step 1: Create Tables

```bash
cd /Users/ben/Dashboard

# Connect to database and run comprehensive schema
# Note: Replace YOUR_DB_ADMIN_PASSWORD with actual password from .env.local
PGPASSWORD='YOUR_DB_ADMIN_PASSWORD' psql \
  -h mecone-data-lake.postgres.database.azure.com \
  -U db_admin \
  -d "research&insights" \
  -f database/create-da-comprehensive-tables.sql
```

**What this creates:**
- `housing_dashboard.da_records_raw` - Raw API records (all fields, JSONB storage)
- `housing_dashboard.da_aggregated` - Pre-computed daily/weekly/monthly summaries
- Indexes for fast queries
- Helper view: `v_da_aggregation_status`

### Step 2: Verify Tables

```sql
-- Check tables exist
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'housing_dashboard'
  AND table_name LIKE 'da_%';

-- Check helper view
SELECT * FROM housing_dashboard.v_da_aggregation_status;
```

---

## 📥 Phase 2: Data Pipeline Setup

### Step 1: Initial Data Fetch

First, let's test if the API works without a key:

```bash
cd /Users/ben/Dashboard

# Run comprehensive fetch script
node scripts/fetch-da-comprehensive.js
```

**Expected output:**
- If API requires key: Error message with instructions
- If API works: "Success: Received X records" → Raw data inserted

**Troubleshooting:**
- If "Required parameters not met": API needs specific query params - we'll need to investigate the API documentation
- If "401 Unauthorized": API still requires subscription key - contact ePlanning Integration Team
- If "Success" but 0 records: API might be empty or need date filters

### Step 2: Run Aggregation

Once raw data is in the database:

```bash
cd /Users/ben/Dashboard

# Generate daily/weekly/monthly aggregations
node scripts/aggregate-da-data.js
```

**Expected output:**
```
[Aggregate] Daily: X LGA-day combinations processed
[Aggregate] Weekly: Y LGA-week combinations processed
[Aggregate] Monthly: Z LGA-month combinations processed
```

### Step 3: Verify Data

```sql
-- Check raw records
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT lga_code) as unique_lgas,
  MIN(determined_date) as earliest_date,
  MAX(determined_date) as latest_date
FROM housing_dashboard.da_records_raw;

-- Check aggregated data
SELECT * FROM housing_dashboard.v_da_aggregation_status;

-- Sample daily data for Sydney
SELECT *
FROM housing_dashboard.da_aggregated
WHERE lga_name = 'Sydney'
  AND period_type = 'daily'
ORDER BY period_start DESC
LIMIT 10;
```

---

## 🔄 Phase 3: Automation Setup

### Daily Cron Job (Recommended: 2 AM)

```bash
# Open crontab editor
crontab -e
```

Add this line:

```cron
# DA Data Pipeline - Fetch + Aggregate (Daily at 2 AM)
0 2 * * * cd /Users/ben/Dashboard && /usr/local/bin/node scripts/fetch-da-comprehensive.js >> /tmp/da-fetch.log 2>&1 && /usr/local/bin/node scripts/aggregate-da-data.js >> /tmp/da-aggregate.log 2>&1
```

**Verify Node path:**
```bash
which node
# Use the output in your cron job
```

### View Logs

```bash
# Fetch logs
tail -f /tmp/da-fetch.log

# Aggregation logs
tail -f /tmp/da-aggregate.log
```

---

## 🎨 Phase 4: Dashboard Cards Setup

### Status of Card Development

**✅ Completed:**
1. DADailyCard.tsx - Last 30 days, daily granularity

**⏸️ Remaining (Need to be created):**
2. DAWeeklyCard.tsx - Last 12 weeks, weekly granularity
3. DAMonthlyCard.tsx - Last 12 months, monthly summary
4. DA13MonthCard.tsx - 13-month overview with trend line
5. DAYoYCard.tsx - Year-over-year comparison (12 vs 12)
6. DAHistoryCard.tsx - Complete historical view (interactive timeline)

### Card Structure Template

All cards follow this pattern:

```typescript
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { [Icon] } from "lucide-react";
import { [ChartType] } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

export function DA[Type]Card({ selectedLGA }: { selectedLGA: LGA | null }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!selectedLGA) return;

    fetch('/api/da-comprehensive', {
      method: 'POST',
      body: JSON.stringify({
        type: '[daily|weekly|monthly|13-month|yoy-comparison|history]',
        lgaCode: selectedLGA.id,
        lgaName: selectedLGA.name,
      }),
    })
    .then(res => res.json())
    .then(result => {
      setData(result.data);
      setSummary(result.summary);
    });
  }, [selectedLGA]);

  return (
    <Card>
      {/* Header with icon and title */}
      {/* Summary stats boxes */}
      {/* Chart (Line/Bar/Area/Comparison) */}
    </Card>
  );
}
```

### Card Integration Checklist

For each card, add to:

1. **DraggableCard.tsx** - Render logic:
```typescript
case 'da-daily':
  return <DADailyCard selectedLGA={selectedLGA} />;
case 'da-weekly':
  return <DAWeeklyCard selectedLGA={selectedLGA} />;
// ... etc
```

2. **DraggableDashboard.tsx** - Type definition:
```typescript
export type CardType =
  | 'da-daily'
  | 'da-weekly'
  | 'da-monthly'
  | 'da-13-month'
  | 'da-yoy'
  | 'da-history'
  // ... existing types
```

3. **AdminToolbar.tsx** - Card Library:
```typescript
const daCards = [
  {
    id: 'da-daily',
    name: 'DA Daily Activity',
    description: 'Last 30 days of DA determinations',
    icon: Calendar,
    color: 'blue'
  },
  // ... 5 more cards
];
```

---

## 📊 Card Specifications

### Card 1: Daily DA Activity ✅
- **Time Range**: Last 30 days
- **Granularity**: Daily
- **Chart**: Line chart (Total, Approved, Refused)
- **Stats**: Total Determined, Approval Rate, 7-Day Trend
- **Icon**: Calendar (blue)

### Card 2: Weekly DA Trends
- **Time Range**: Last 12 weeks
- **Granularity**: Weekly
- **Chart**: Bar chart (Stacked - Approved/Refused/Withdrawn)
- **Stats**: Current Week, Avg per Week, Trend vs Previous
- **Icon**: BarChart3 (green)

### Card 3: Monthly DA Summary
- **Time Range**: Last 12 months
- **Granularity**: Monthly
- **Chart**: Stacked area chart (Approved/Refused/Withdrawn/Other)
- **Stats**: Current Month, YTD Total, Avg per Month
- **Icon**: TrendingUp (purple)

### Card 4: 13-Month Overview
- **Time Range**: Last 13 months (include current partial month)
- **Granularity**: Monthly
- **Chart**: Line chart with polynomial trend line
- **Stats**: Rolling 12-Month Avg, Seasonality Index, Peak Month
- **Icon**: Activity (orange)

### Card 5: Year-over-Year Comparison
- **Time Range**: Last 12 months vs previous 12 months
- **Granularity**: Monthly
- **Chart**: Dual-axis line chart (overlaid)
- **Stats**: % Change Total, % Change Approved, Avg Days Comparison
- **Icon**: GitCompare (cyan)

### Card 6: Complete Historical View
- **Time Range**: All available data
- **Granularity**: Monthly
- **Chart**: Interactive timeline with zoom/pan
- **Stats**: All-Time Total, Historical Approval Rate, Data Coverage
- **Icon**: History (indigo)

---

## 🔧 API Endpoint Reference

### POST /api/da-comprehensive

**Request Body:**
```json
{
  "type": "daily|weekly|monthly|13-month|yoy-comparison|history",
  "lgaCode": "17200",  // Optional
  "lgaName": "Sydney"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "type": "daily",
  "lga": "Sydney",
  "data": [
    {
      "date": "2025-01-27",
      "total_determined": 15,
      "determined_approved": 12,
      "determined_refused": 2,
      "determined_withdrawn": 1,
      "avg_days_to_determination": 42.5
    }
  ],
  "summary": {
    "total_determined": 450,
    "total_approved": 380,
    "approval_rate": 84.4,
    "avg_days_to_decision": 45
  },
  "count": 30
}
```

---

## 🚨 Current Status & Next Steps

### ✅ Completed
1. Database schema (2 tables + view)
2. Fetch script (`fetch-da-comprehensive.js`)
3. Aggregation script (`aggregate-da-data.js`)
4. Unified API route (`/api/da-comprehensive`)
5. First card component (`DADailyCard.tsx`)

### ⏸️ BLOCKED: API Access
**Issue**: API endpoint `https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA` returns:
```
{ "ErrorMessage": "Required parameters for OnlineDA endpoint is not met." }
```

**Possible Solutions:**
1. **API Key**: You mentioned it works without authentication - do you have credentials that work?
2. **Query Parameters**: API might need specific date range or filters
3. **Different Endpoint**: Is there a v1 or public endpoint?

**Action Required:**
- Try accessing the API from your network (might be IP whitelist)
- Contact ePlanning Integration Team: eplanning.integration@planning.nsw.gov.au
- Provide sample API response so we can map fields correctly

### 📝 Remaining Work (Once API Access Resolved)

1. **Create 5 remaining cards** (2-3 hours):
   - Copy DADailyCard.tsx structure
   - Update `type` parameter for each
   - Customize chart type and stats

2. **Integrate cards into dashboard** (30 minutes):
   - Add to DraggableCard.tsx
   - Add to DraggableDashboard.tsx
   - Add to AdminToolbar.tsx with distinct colors

3. **Test with real data** (1 hour):
   - Run fetch script
   - Run aggregation
   - Verify each card displays correctly

4. **Set up automation** (15 minutes):
   - Configure cron job
   - Test log rotation

**Total Estimated Time**: ~4 hours once API access is working

---

## 💡 Tips & Best Practices

### Data Quality
- **Check raw data regularly**: `SELECT COUNT(*) FROM da_records_raw WHERE determined_date > CURRENT_DATE - 7;`
- **Monitor aggregation**: `SELECT * FROM v_da_aggregation_status;`
- **Watch for gaps**: Some LGAs may not use ePlanning portal

### Performance
- **Indexes are crucial**: Already created on all key columns
- **Aggregations are pre-computed**: Cards query aggregated table (fast!)
- **Limit results**: API enforces LIMIT to prevent slow queries

### Maintenance
- **Log rotation**: Set up logrotate for `/tmp/da-*.log` files
- **Disk space**: Raw table will grow - monitor storage
- **Data retention**: Consider archiving data older than 5 years

---

## 📞 Support

### API Issues
- Email: eplanning.integration@planning.nsw.gov.au
- Docs: https://www.planningportal.nsw.gov.au/apis-reporting

### Database Issues
- Check connection: `SELECT current_database(), current_user;`
- Check permissions: `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'da_records_raw';`

### Application Issues
- Check logs: `tail -f /tmp/da-*.log`
- Check API route: `curl -X POST http://localhost:3000/api/da-comprehensive -H "Content-Type: application/json" -d '{"type":"daily"}'`

---

**Ready to proceed once API access is confirmed! 🚀**
