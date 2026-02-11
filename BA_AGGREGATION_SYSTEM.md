# Building Approvals (BA) Aggregation System

## Current Status

**Aggregation Status:** ✅ Complete
**Last Run:** 2026-02-06 (completed in 1.37 seconds)
**Records Aggregated:** 5,895 total records
**Automation:** ✅ Automated (weekly cron job configured)

### Current Data State
- **Daily records:** 1,965
- **Weekly records:** 1,965
- **Monthly records:** 1,965
- **Total records:** 5,895

---

## Data Flow Overview

```
SOURCE (READ ONLY)                                    TARGET (READ/WRITE)
research&insights.housing_dashboard.building_approvals_nsw_lga  →→→→  research&insights.housing_dashboard.ba_aggregated
     156 rows (wide format with date columns)                                5,895 records (normalized)
```

---

## Source Database: research&insights (READ ONLY)

### Table: `housing_dashboard.building_approvals_nsw_lga`

**Connection:**
- Database: `research&insights`
- User: `mosaic_readonly` (READ ONLY access)
- Password: `/users/ben/permissions/.env.readonly`
- Total Records: ~156 rows (wide format)

**Table Structure:**
| Field Name | Type | Purpose |
|------------|------|---------|
| `lga_code` | text | Local Government Area code |
| `lga_name` | text | Local Government Area name |
| `DD/MM/YYYY` columns | integer | Each column represents a date with approval count |

**Data Format:**
- **Wide format:** Each date is a separate column (e.g., "01/01/2021", "01/02/2021", etc.)
- **Approval values:** Integer count of building approvals on that date
- **Null handling:** 'null' strings and NULL values treated as 0 approvals

---

## Target Database: research&insights (READ/WRITE)

### Table: `housing_dashboard.ba_aggregated`

**Connection:**
- Database: `research&insights`
- User: `db_admin` (for writing), `mosaic_readonly` (for reading)
- Password: `/users/ben/permissions/.env.admin`

**Table Structure:**
```sql
CREATE TABLE housing_dashboard.ba_aggregated (
  -- Identification
  id SERIAL PRIMARY KEY,
  lga_code VARCHAR(10),
  lga_name VARCHAR(100) NOT NULL,

  -- Period classification
  period_type VARCHAR(10) NOT NULL,  -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Time dimensions
  fiscal_year INTEGER,     -- NSW fiscal year (July 1 - June 30)
  calendar_year INTEGER,
  calendar_month INTEGER,  -- 1-12
  calendar_week INTEGER,   -- 1-53

  -- Aggregation metrics
  total_approvals INTEGER DEFAULT 0,
  record_count INTEGER DEFAULT 0,  -- Raw records aggregated

  -- Metadata
  aggregated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT ba_aggregated_unique UNIQUE (lga_name, period_type, period_start)
);
```

**Indexes (for fast dashboard queries):**
1. `idx_ba_aggregated_lga` - Fast LGA lookups
2. `idx_ba_aggregated_lga_code` - Fast LGA code lookups
3. `idx_ba_aggregated_period_type` - Filter by period type
4. `idx_ba_aggregated_period_start` - Date range queries
5. `idx_ba_aggregated_fiscal_year` - Fiscal year filtering
6. `idx_ba_aggregated_calendar_year` - Calendar year filtering
7. `idx_ba_aggregated_lga_period` - Combined LGA + period queries
8. `idx_ba_aggregated_period_date` - Combined period + date queries

**Permissions:**
- `mosaic_readonly`: SELECT (for dashboard API queries)
- `db_admin`: SELECT, INSERT, UPDATE, DELETE (for aggregation script)

---

## Aggregation Process

### Script Location
`/Users/ben/Dashboard/scripts/aggregate-ba-comprehensive.js`

### What It Does

1. **Connects to research&insights database**

2. **Unpivots wide-format source data:**
   ```sql
   WITH unpivoted AS (
     SELECT
       lga_code::TEXT,
       lga_name,
       TO_DATE(col.key, 'DD/MM/YYYY') as date,
       CASE
         WHEN col.value::text = 'null' OR col.value IS NULL THEN 0
         ELSE col.value::text::integer
       END as approvals
     FROM housing_dashboard.building_approvals_nsw_lga,
     LATERAL jsonb_each(to_jsonb(building_approvals_nsw_lga) - 'lga_code' - 'lga_name') col
     WHERE col.key ~ '^[0-9]+/[0-9]+/[0-9]+$'
   )
   ```

3. **Aggregates in 3 periods:**

   **DAILY:**
   ```sql
   SELECT
     lga_code,
     lga_name,
     date as period_start,
     date as period_end,
     SUM(approvals) as total_approvals,
     COUNT(*) as record_count
   FROM unpivoted
   WHERE approvals > 0
   GROUP BY lga_code, lga_name, date
   ```

   **WEEKLY:**
   ```sql
   SELECT
     lga_code,
     lga_name,
     DATE_TRUNC('week', date)::DATE as period_start,
     (DATE_TRUNC('week', date) + INTERVAL '6 days')::DATE as period_end,
     SUM(approvals) as total_approvals,
     COUNT(*) as record_count
   FROM unpivoted
   WHERE approvals > 0
   GROUP BY lga_code, lga_name, DATE_TRUNC('week', date)
   ```

   **MONTHLY:**
   ```sql
   SELECT
     lga_code,
     lga_name,
     DATE_TRUNC('month', date)::DATE as period_start,
     (DATE_TRUNC('month', date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE as period_end,
     SUM(approvals) as total_approvals,
     COUNT(*) as record_count
   FROM unpivoted
   WHERE approvals > 0
   GROUP BY lga_code, lga_name, DATE_TRUNC('month', date)
   ```

4. **Calculates time dimensions:**
   - **Fiscal Year**: NSW fiscal year (July 1 - June 30)
   - **Calendar Year**: Extract from date
   - **Calendar Month**: 1-12
   - **Calendar Week**: ISO week number (1-53)

5. **Inserts/Updates records:**
   - Uses `ON CONFLICT (lga_name, period_type, period_start)` to update existing records
   - Inserts new records for new date/LGA combinations
   - Batch inserts (500 records per query) for performance

---

## Automation Status

### ✅ FULLY AUTOMATED

**Cron Job Schedule:**
```bash
# Runs every Sunday at 3:00 AM (1 hour after OC aggregation)
0 3 * * 0 cd /Users/ben/Dashboard && /usr/local/bin/node scripts/aggregate-ba-comprehensive.js >> /Users/ben/.local/log/ba-aggregation.log 2>&1
```

**Setup:**
- Script: `scripts/aggregate-ba-comprehensive.js`
- Setup script: `scripts/setup-ba-cron.sh`
- Log file: `~/.local/log/ba-aggregation.log`

**Performance:**
- Execution time: ~1.37 seconds
- Batch size: 500 records per INSERT
- Progress reporting: Yes (every batch)

**Manual Execution:**
```bash
node scripts/aggregate-ba-comprehensive.js
```

**View Logs:**
```bash
tail -f ~/.local/log/ba-aggregation.log
```

**Modify/Remove Cron Job:**
```bash
crontab -e
```

**Setup Cron Job:**
```bash
./scripts/setup-ba-cron.sh
```

---

## Performance Optimization

### ✅ Implemented Solutions

**Batch Insert Optimization**
```javascript
const BATCH_SIZE = 500; // Insert 500 records at a time

// Build multi-row INSERT with explicit type casting
const placeholders = batch.map((_, idx) => {
  const baseIdx = idx * 11;
  return `($${baseIdx + 1}::VARCHAR(10), $${baseIdx + 2}::VARCHAR(100), ..., $${baseIdx + 11}::INTEGER, NOW())`;
}).join(', ');

await targetClient.query(insertQuery, values);
```

**Results:**
- Aggregation time: 1.37 seconds
- Records processed: 5,895 total records
- Efficiency: Excellent performance with batch inserts

**Key Implementation Details:**
1. ✅ Wide-format unpivoting using LATERAL jsonb_each
2. ✅ Batch inserts (500 records per query)
3. ✅ Explicit type casting in SQL (prevents type inference errors)
4. ✅ Integer conversion (handles 'null' strings and NULL values)
5. ✅ Progress reporting (shows % complete)

---

## How Dashboard Uses This Data

### API Endpoint
`/Users/ben/Dashboard/src/app/api/building-approvals-comprehensive/route.ts`

**Handles 6 card types:**
- `daily` - Last 30 days
- `weekly` - Last 12 weeks
- `monthly` - Last 12 months
- `13-month` - 13-month trend analysis
- `yoy-comparison` - Year-over-year comparison
- `history` - All available data

**Example API Call:**
```javascript
POST /api/building-approvals-comprehensive
{
  "type": "monthly",
  "lgaName": "Sydney"
}
```

**Response:**
```json
{
  "success": true,
  "type": "monthly",
  "lga": "Sydney",
  "data": [
    {
      "month": "2025-12-01",
      "total_approvals": 250
    }
  ],
  "summary": {
    "total_last_12_months": 3000,
    "avg_per_month": 250
  }
}
```

---

## Dashboard Card Components

### 6 BA Cards (Matching DA Color Themes)

1. **BADailyCard.tsx** - Last 30 days
   - Color theme: Blue (blue-500, blue-400, blue-600)
   - Shows: 30-Day Total, Avg per Day, Days Recorded
   - Icon: Calendar

2. **BAWeeklyCard.tsx** - Last 12 weeks
   - Color theme: Blue/Green/Purple
   - Shows: 12-Week Total, Avg per Week, Weeks Recorded
   - Icon: CalendarDays

3. **BAMonthlyCard.tsx** - Last 12 months
   - Color theme: Purple (purple-500, purple-400, purple-600)
   - Shows: 12-Month Total, Avg per Month, Months Recorded
   - Icon: CalendarRange

4. **BA13MonthCard.tsx** - 13-month overview
   - Color theme: Orange (orange-500, orange-400, orange-600)
   - Shows: Total Approvals, Avg per Month, Months
   - Icon: BarChart3

5. **BAYoYCard.tsx** - Year-over-year comparison
   - Color theme: Cyan/Blue (cyan-500, blue-500)
   - Shows: Current Year, Previous Year, YoY Change %
   - Icon: GitCompare

6. **BAHistoryCard.tsx** - Complete history
   - Color theme: Indigo (indigo-500, indigo-400, indigo-600)
   - Shows: Total Approvals, Avg per Month, Months of Data
   - Icon: History

---

## Completed Implementation

### ✅ Phase 1: Initial Setup (Complete)

1. ✅ **Database schema created**
   - Table: `housing_dashboard.ba_aggregated`
   - 8 indexes for fast queries
   - Permissions granted

2. ✅ **Aggregation script developed**
   - Script: `aggregate-ba-comprehensive.js`
   - Wide-format unpivoting with LATERAL jsonb_each
   - Batch inserts (500 records per query)
   - Progress reporting
   - Error handling

3. ✅ **Full aggregation completed**
   - 5,895 total records aggregated
   - Daily: 1,965 records
   - Weekly: 1,965 records
   - Monthly: 1,965 records

### ✅ Phase 2: Dashboard Integration (Complete)

4. ✅ **API endpoint created**
   - Route: `/api/building-approvals-comprehensive`
   - Supports 6 card types
   - Returns data + summary statistics

5. ✅ **6 BA card components created**
   - All cards match DA color themes
   - Recharts LineChart integration
   - Custom tooltips and summary stats
   - LGA selection handling

6. ✅ **Dashboard integration**
   - Cards added to DraggableCard.tsx
   - Cards added to AdminToolbar Card Library
   - Old building-approvals-chart card removed

### ✅ Phase 3: Automation (Complete)

7. ✅ **Cron job configured**
   - Runs every Sunday at 3:00 AM
   - Logs to `~/.local/log/ba-aggregation.log`
   - Setup script: `scripts/setup-ba-cron.sh`

---

## Files Created

### Database Schema
- `database/create-ba-aggregated-table.sql` - Table DDL with indexes

### Aggregation Scripts
- `scripts/aggregate-ba-comprehensive.js` - **PRODUCTION** (optimized, automated)
- `scripts/create-ba-aggregated-table.js` - Table creation utility
- `scripts/setup-ba-cron.sh` - Cron job setup script

### API & Components
- `src/app/api/building-approvals-comprehensive/route.ts` - API endpoint (handles 6 card types)
- `src/components/dashboard/BADailyCard.tsx` - Last 30 days (blue theme)
- `src/components/dashboard/BAWeeklyCard.tsx` - Last 12 weeks (blue/green/purple theme)
- `src/components/dashboard/BAMonthlyCard.tsx` - Last 12 months (purple theme)
- `src/components/dashboard/BA13MonthCard.tsx` - 13-month overview (orange theme)
- `src/components/dashboard/BAYoYCard.tsx` - Year-over-year comparison (cyan theme)
- `src/components/dashboard/BAHistoryCard.tsx` - Complete timeline (indigo theme)

### Documentation
- `BA_AGGREGATION_SYSTEM.md` - This file (complete system documentation)

---

## Comparison with DA and OC Systems

| Aspect | DA System | OC System | BA System |
|--------|-----------|-----------|-----------|
| Source Table | `da_records_raw` | `nsw_oc_data` | `building_approvals_nsw_lga` |
| Source DB | research&insights | mosaic_pro (READ ONLY) | research&insights |
| Source Format | Normalized | Normalized | **Wide format** |
| Target Table | `da_aggregated` | `oc_aggregated` | `ba_aggregated` |
| Date Field | `determined_date` | `date_last_updated` | **Column names** |
| Aggregation | Standard GROUP BY | Standard GROUP BY | **Unpivot + GROUP BY** |
| Automation | ✅ Automated | ✅ Automated | ✅ Automated |
| Cron Schedule | Sunday 1:00 AM | Sunday 2:00 AM | Sunday 3:00 AM |
| Performance | ~10-15 seconds | ~20 seconds | ~1.37 seconds |
| Data Volume | ~50k raw records | ~281k raw → 73k agg | ~156 rows → 5,895 agg |
| Color Themes | Blue/Purple/Orange/Cyan/Indigo | Lime/Fuchsia/Pink/Yellow/Slate/Zinc | Blue/Purple/Orange/Cyan/Indigo |

---

## Summary

**✅ System Status: PRODUCTION READY**

**What's Working:**
✅ Table structure created (5,895 records)
✅ Full data aggregation complete (daily, weekly, monthly)
✅ API endpoint functional (6 card types supported)
✅ Dashboard cards ready and integrated
✅ Automation configured (weekly cron job)
✅ Performance excellent (1.37 seconds execution time)
✅ Wide-format unpivoting successful

**Key Metrics:**
- **Total Records:** 5,895 aggregated records
- **Execution Time:** ~1.37 seconds
- **Automation:** Weekly (every Sunday at 3:00 AM)
- **Logs:** `~/.local/log/ba-aggregation.log`
- **Setup:** `./scripts/setup-ba-cron.sh`

**Impact on Dashboard:**
- ✅ BA cards display complete historical data
- ✅ Data refreshes automatically every week
- ✅ All 6 card types functional (daily, weekly, monthly, 13-month, YoY, history)
- ✅ Matches DA color scheme for consistency
- ✅ No manual intervention required
- ✅ Old building-approvals-chart card removed

**Technical Innovation:**
- ✅ Successfully unpivots wide-format source data using LATERAL jsonb_each
- ✅ Handles 'null' strings and NULL values correctly
- ✅ Converts date column names (DD/MM/YYYY) to proper DATE types
- ✅ Batch processing with explicit type casting for reliability
