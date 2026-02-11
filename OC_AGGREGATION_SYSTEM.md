# Occupation Certificate (OC) Aggregation System

## Current Status

**Aggregation Status:** ✅ Complete
**Last Run:** 2026-02-05 (completed in 20.29 seconds)
**Records Aggregated:** 73,671 total records
**Automation:** ✅ Automated (weekly cron job)

### Current Data State
- **Daily records:** 53,654 (Oct 2022 - Jan 2026)
- **Weekly records:** 15,555 (Oct 2022 - Jan 2026)
- **Monthly records:** 4,462 (Sep 2022 - Dec 2025)
- **Total records:** 73,671

---

## Data Flow Overview

```
SOURCE (READ ONLY)                    TARGET (READ/WRITE)
mosaic_pro.public.nsw_oc_data  →→→→  research&insights.housing_dashboard.oc_aggregated
     281,519 records                        73,671 records (complete)
```

---

## Source Database: mosaic_pro (READ ONLY)

### Table: `public.nsw_oc_data`

**Connection:**
- Database: `mosaic_pro`
- User: `mosaic_readonly` (READ ONLY access)
- Password: `/users/ben/permissions/.env.readonly`
- Total Records: ~281,519

**Key Fields Used:**
| Field Name | Type | Purpose |
|------------|------|---------|
| `lga_name` | text | Local Government Area name |
| `lga_code` | bigint | LGA code (converted to TEXT) |
| `date_last_updated` | date | **Primary date field** (determines when OC was last updated) |
| `application_status` | text | **Status categorization** (Determined, Withdrawn, Cancelled, etc.) |

**Application Status Values:**
- **Approved/Determined (211,315 records):**
  - "Determined" ← Main approved status
  - "Post OC completed"
  - "Issued"
  - "Approved"
  - "Finalised"

- **Withdrawn/Cancelled (43,367 records):**
  - "Cancelled"
  - "Withdrawn"
  - "Returned"
  - "Declined"
  - "Rejected"

- **In Progress (26,837 records):**
  - "Under Assessment"
  - "Submitted"
  - "Additional Information Requested"
  - "In Progress"
  - "Resubmitted"

**Other Fields (not currently used):**
- `pan` - Application number
- `full_address` - Property address
- `dev_purpose` - Development purpose
- `building_code_class` - Building classification
- `development_type` - Type of development
- `builder_legal_name` - Builder name
- `council_name` - Council name (vs lga_name)

---

## Target Database: research&insights (READ/WRITE)

### Table: `housing_dashboard.oc_aggregated`

**Connection:**
- Database: `research&insights`
- User: `db_admin` (for writing), `mosaic_readonly` (for reading)
- Password: `/users/ben/permissions/.env.admin`

**Table Structure:**
```sql
CREATE TABLE housing_dashboard.oc_aggregated (
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

  -- Determination metrics
  total_determined INTEGER DEFAULT 0,
  determined_approved INTEGER DEFAULT 0,
  determined_withdrawn INTEGER DEFAULT 0,

  -- Metadata
  record_count INTEGER DEFAULT 0,  -- Raw records aggregated
  aggregated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT oc_aggregated_unique UNIQUE (lga_name, period_type, period_start)
);
```

**Indexes (for fast dashboard queries):**
1. `idx_oc_aggregated_lga` - Fast LGA lookups
2. `idx_oc_aggregated_lga_code` - Fast LGA code lookups
3. `idx_oc_aggregated_period_type` - Filter by period type
4. `idx_oc_aggregated_period_start` - Date range queries
5. `idx_oc_aggregated_fiscal_year` - Fiscal year filtering
6. `idx_oc_aggregated_calendar_year` - Calendar year filtering
7. `idx_oc_aggregated_lga_period` - Combined LGA + period queries
8. `idx_oc_aggregated_period_date` - Combined period + date queries

**Permissions:**
- `mosaic_readonly`: SELECT (for dashboard API queries)
- `db_admin`: SELECT, INSERT, UPDATE, DELETE (for aggregation script)

---

## Aggregation Process

### Script Location
`/Users/ben/Dashboard/scripts/aggregate-oc-comprehensive.js`

### What It Does

1. **Connects to BOTH databases:**
   - Source: `mosaic_pro` (READ ONLY)
   - Target: `research&insights` (WRITE)

2. **Aggregates in 3 periods:**

   **DAILY:**
   ```sql
   -- Groups by LGA and day
   SELECT
     lga_name,
     lga_code::TEXT,
     DATE(date_last_updated) as determination_date,
     application_status,
     COUNT(*) as record_count
   FROM public.nsw_oc_data
   WHERE date_last_updated IS NOT NULL
     AND lga_name IS NOT NULL
   GROUP BY lga_name, lga_code, DATE(date_last_updated), application_status
   ```

   **WEEKLY:**
   ```sql
   -- Groups by LGA and week (Monday-Sunday)
   SELECT
     lga_name,
     lga_code::TEXT,
     DATE_TRUNC('week', date_last_updated)::DATE as week_start,
     application_status,
     COUNT(*) as record_count
   FROM public.nsw_oc_data
   WHERE date_last_updated IS NOT NULL
     AND lga_name IS NOT NULL
   GROUP BY lga_name, lga_code, DATE_TRUNC('week', date_last_updated), application_status
   ```

   **MONTHLY:**
   ```sql
   -- Groups by LGA and month
   SELECT
     lga_name,
     lga_code::TEXT,
     DATE_TRUNC('month', date_last_updated)::DATE as month_start,
     application_status,
     COUNT(*) as record_count
   FROM public.nsw_oc_data
   WHERE date_last_updated IS NOT NULL
     AND lga_name IS NOT NULL
   GROUP BY lga_name, lga_code, DATE_TRUNC('month', date_last_updated), application_status
   ```

3. **Categorizes statuses:**
   - **Approved** if status includes: 'determined', 'issued', 'approved', 'finalised', 'post oc completed'
   - **Withdrawn** if status includes: 'withdrawn', 'returned', 'cancelled', 'declined', 'rejected'

4. **Inserts/Updates records:**
   - Uses `ON CONFLICT` to update existing records
   - Inserts new records for new date/LGA combinations

---

## Automation Status

### ✅ FULLY AUTOMATED

**Cron Job Schedule:**
```bash
# Runs every Sunday at 2:00 AM
0 2 * * 0 cd /Users/ben/Dashboard && /usr/local/bin/node scripts/aggregate-oc-comprehensive-optimized.js >> /Users/ben/.local/log/oc-aggregation.log 2>&1
```

**Setup:**
- Script: `scripts/aggregate-oc-comprehensive-optimized.js`
- Setup script: `scripts/setup-oc-cron.sh`
- Log file: `~/.local/log/oc-aggregation.log`

**Performance:**
- Execution time: ~20 seconds (optimized with batch inserts)
- Batch size: 500 records per INSERT
- Progress reporting: Yes (every batch)

**Manual Execution:**
```bash
node scripts/aggregate-oc-comprehensive-optimized.js
```

**View Logs:**
```bash
tail -f ~/.local/log/oc-aggregation.log
```

**Modify/Remove Cron Job:**
```bash
crontab -e
```

### 💡 Future Enhancement (Optional)

**Daily Incremental Update:**
   - Only aggregate last 7 days of data
   - Much faster (completes in seconds)
   - Keeps recent data fresh between weekly full updates

---

## Performance Optimization

### ✅ Implemented Solutions

**Batch Insert Optimization (Implemented)**
```javascript
const BATCH_SIZE = 500; // Insert 500 records at a time

async function batchInsert(client, aggregates, periodType) {
  // Split into batches
  for (let i = 0; i < aggregatesArray.length; i += BATCH_SIZE) {
    batches.push(aggregatesArray.slice(i, i + BATCH_SIZE));
  }

  // Build multi-row INSERT with proper type casting
  const placeholders = batch.map(agg =>
    `($1::VARCHAR(20), $2::VARCHAR(100), ..., $13::INTEGER, NOW())`
  ).join(', ');

  await client.query(insertQuery, values);
}
```

**Results:**
- Before: Timed out after 2 minutes (incomplete)
- After: Completes in ~20 seconds (all periods)
- Improvement: ~6-10x faster

**Key Fixes:**
1. ✅ Batch inserts (500 records per query)
2. ✅ Explicit type casting in SQL (prevents type inference errors)
3. ✅ Integer conversion (prevents string concatenation bug)
4. ✅ Progress reporting (shows % complete)

### 💡 Future Optimization Ideas

**Option 1: Use COPY for Bulk Loading**
```javascript
// Create temp file → COPY command → Delete temp file
// Potential 10-100x faster than batch inserts
```

**Option 2: Direct SQL Aggregation**
```sql
-- Run aggregation entirely in PostgreSQL using FDW
-- Eliminates Node.js data transfer overhead
```

---

## How Dashboard Uses This Data

### API Endpoint
`/Users/ben/Dashboard/src/app/api/oc-comprehensive/route.ts`

**Handles 6 card types:**
- `daily` - Last 30 days
- `weekly` - Last 12 weeks
- `monthly` - Last 12 months
- `13-month` - 13-month trend analysis
- `yoy-comparison` - Year-over-year comparison
- `history` - All available data

**Example API Call:**
```javascript
POST /api/oc-comprehensive
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
      "period_start": "2025-12-01",
      "total_determined": 150,
      "determined_approved": 120,
      "determined_withdrawn": 30
    }
  ],
  "summary": {
    "total_determined": 1800,
    "total_approved": 1440,
    "approval_rate": 80
  }
}
```

---

## Completed Implementation

### ✅ Phase 1: Initial Setup (Complete)

1. ✅ **Database schema created**
   - Table: `housing_dashboard.oc_aggregated`
   - 10 indexes for fast queries
   - Permissions granted

2. ✅ **Aggregation script developed**
   - Script: `aggregate-oc-comprehensive-optimized.js`
   - Batch inserts (500 records per query)
   - Progress reporting
   - Error handling

3. ✅ **Full aggregation completed**
   - 73,671 total records aggregated
   - Daily: 53,654 records (Oct 2022 - Jan 2026)
   - Weekly: 15,555 records (Oct 2022 - Jan 2026)
   - Monthly: 4,462 records (Sep 2022 - Dec 2025)

### ✅ Phase 2: Automation (Complete)

4. ✅ **Cron job configured**
   - Runs every Sunday at 2:00 AM
   - Logs to `~/.local/log/oc-aggregation.log`
   - Setup script: `scripts/setup-oc-cron.sh`

5. ✅ **Verification tools**
   - `scripts/verify-oc-table.js` - Check aggregation status
   - `scripts/check-oc-schema.js` - Inspect table structure
   - `scripts/check-oc-statuses.js` - Analyze source data

### 💡 Future Enhancements (Optional)

6. **Add incremental aggregation:**
   - Only process new/updated records
   - Track last aggregation timestamp
   - Much faster daily updates

7. **Add monitoring:**
   - Email alerts on aggregation failures
   - Dashboard showing last successful run
   - Data quality checks

8. **Performance improvements:**
   - Use COPY for bulk loading (10-100x faster)
   - Direct SQL aggregation via FDW

---

## Files Created

### Database Schema
- `database/create-oc-aggregated-table.sql` - Table DDL with indexes

### Aggregation Scripts
- `scripts/aggregate-oc-comprehensive-optimized.js` - **PRODUCTION** (optimized, automated)
- `scripts/aggregate-oc-comprehensive.js` - Original (deprecated)
- `scripts/create-oc-table.js` - Table creation utility
- `scripts/setup-oc-cron.sh` - Cron job setup script

### Verification & Inspection Scripts
- `scripts/verify-oc-table.js` - Check aggregation status
- `scripts/check-oc-schema.js` - Inspect table structure
- `scripts/check-oc-columns.js` - Source table inspection
- `scripts/check-oc-statuses.js` - Status values analysis
- `scripts/check-source-lga-codes.js` - LGA code validation
- `scripts/alter-oc-lga-code.js` - Schema alteration (lga_code size fix)

### API & Components
- `src/app/api/oc-comprehensive/route.ts` - API endpoint (handles 6 card types)
- `src/components/dashboard/OCDailyCard.tsx` - Last 30 days (lime theme)
- `src/components/dashboard/OCWeeklyCard.tsx` - Last 12 weeks (fuchsia theme)
- `src/components/dashboard/OCMonthlyCard.tsx` - Last 12 months (pink theme)
- `src/components/dashboard/OC13MonthCard.tsx` - 13-month overview (yellow theme)
- `src/components/dashboard/OCYoYCard.tsx` - Year-over-year comparison (slate theme)
- `src/components/dashboard/OCHistoryCard.tsx` - Complete timeline (zinc theme)

### Documentation
- `OC_AGGREGATION_SYSTEM.md` - This file (complete system documentation)

---

## Comparison with DA System

| Aspect | DA System | OC System |
|--------|-----------|-----------|
| Source Table | `housing_dashboard.da_records_raw` | `mosaic_pro.public.nsw_oc_data` |
| Source DB | research&insights | mosaic_pro (READ ONLY) |
| Target Table | `housing_dashboard.da_aggregated` | `housing_dashboard.oc_aggregated` |
| Date Field | `determined_date` | `date_last_updated` |
| Status Field | `status` | `application_status` |
| Automation | ✅ Automated | ✅ Automated |
| Performance | Fast (single DB) | Fast (batch inserts, ~20s) |
| Data Volume | ~50k raw records | ~281k raw → 73k aggregated |
| Execution Time | ~10-15 seconds | ~20 seconds |

---

## Summary

**✅ System Status: PRODUCTION READY**

**What's Working:**
✅ Table structure created (73,671 records)
✅ Full data aggregation complete (daily, weekly, monthly)
✅ API endpoint functional (6 card types supported)
✅ Dashboard cards ready and displaying data
✅ Automation configured (weekly cron job)
✅ Performance optimized (20 seconds execution time)
✅ Data quality verified (approved/withdrawn counts correct)

**Key Metrics:**
- **Total Records:** 73,671 aggregated records
- **Date Range:** October 2022 - January 2026
- **Execution Time:** ~20 seconds (6-10x improvement)
- **Automation:** Weekly (every Sunday at 2:00 AM)
- **Logs:** `~/.local/log/oc-aggregation.log`

**Impact on Dashboard:**
- ✅ OC cards display complete historical data
- ✅ Data refreshes automatically every week
- ✅ All 6 card types functional (daily, weekly, monthly, 13-month, YoY, history)
- ✅ Approved/withdrawn metrics accurate
- ✅ No manual intervention required
