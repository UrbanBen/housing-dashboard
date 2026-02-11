# Data Pipeline Automation - Conversation Summary

**Date:** 2026-01-15
**Status:** Planning Phase - Ready to Implement

## Context

We discussed how Claude Code can help automate data scraping and database updates for the Housing Insights Dashboard project. This document captures the key decisions and next steps.

---

## Database Security Rules (COMPLETED ✅)

**Added to CLAUDE.md:**
1. ✅ ONLY access database: `research&insights`
2. ✅ NEVER connect to: `mosaic_pro`, `postgres`, or any other database
3. ✅ CAN access any schema within `research&insights` database
4. ✅ ALWAYS use connection pool from `@/lib/db-pool`
5. ✅ No user approval required for scripts (trusted automation)

**File Updated:** `/Users/ben/housing-insights-dashboard/CLAUDE.md`

---

## Current Database Infrastructure

**Connection Details:**
- Host: `mecone-data-lake.postgres.database.azure.com`
- Database: `research&insights` (ONLY allowed database)
- Users: `mosaic_readonly` (read-only), `db_admin` (write access)
- Schemas: `housing_dashboard`, `s12_census`, `public` (and any others in research&insights)
- Connection Pool: `/src/lib/db-pool.ts` (centralized)

**Existing Data Sources:**
- ABS Excel files (building approvals)
- ABS ASGS2021 GeoJSON (LGA boundaries)
- Portal Spatial NSW (geographic data)
- Census data APIs

**Current Scripts:**
- `/scripts/check-ba-table.js` - Database inspection
- `/scripts/upgrade-user.ts` - User management example
- `/extract-nsw-boundary-to-wkb.py` - Python scraping example

---

## What Claude Code Can Do for Data Pipelines

### Automation Capabilities

1. **Intelligent Scrapers**
   - Auto-detect latest data releases
   - Handle Excel/CSV/JSON/GeoJSON formats
   - Parse complex table structures
   - Validate data quality
   - Retry logic and error recovery

2. **Database Updates**
   - UPSERT operations (update existing, insert new)
   - Schema validation
   - Transaction support
   - Conflict resolution
   - Audit logging

3. **Scheduling**
   - Cron-compatible scripts
   - Configurable frequency
   - Manual trigger support
   - Background execution

4. **Monitoring**
   - Success/failure tracking
   - Record count reporting
   - Error notifications
   - Performance metrics

---

## Multi-Layer Security Strategy (Recommended)

### Layer 1: PostgreSQL Database Permissions ⭐ MOST IMPORTANT

**Run on Azure PostgreSQL:**
```sql
-- Revoke access to other databases
REVOKE CONNECT ON DATABASE mosaic_pro FROM mosaic_readonly;
REVOKE CONNECT ON DATABASE mosaic_pro FROM db_admin;

-- Grant only research&insights access
GRANT CONNECT ON DATABASE "research&insights" TO mosaic_readonly;
GRANT CONNECT ON DATABASE "research&insights" TO db_admin;

-- Grant schema permissions
GRANT USAGE ON SCHEMA housing_dashboard, s12_census TO mosaic_readonly, db_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA housing_dashboard, s12_census TO mosaic_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA housing_dashboard, s12_census TO db_admin;
```

### Layer 2: Application-Level Validation (Optional)

**Create:** `/src/lib/db-guard.ts`
- Validates all queries before execution
- Blocks references to forbidden databases
- Logs all write operations
- Prevents dangerous SQL patterns

### Layer 3: Environment Lock-Down (Optional)

**Create:** `/src/lib/db-config.ts`
- Frozen configuration (Object.freeze)
- Cannot be modified at runtime
- Type-safe getters

---

## GUI Dashboard Options Discussed

### Recommended: Built-in Admin Dashboard

**What it includes:**
- Real-time pipeline status cards
- Manual trigger buttons
- Log viewer with filtering
- Schedule management
- Success/failure metrics
- Record counts per run

**Location:** `/src/app/dashboard/admin/pipelines/page.tsx`

**Components to create:**
1. Status monitoring page with live updates
2. API endpoints: `/api/admin/pipelines/{status|logs|trigger}`
3. Database tables: `pipeline_runs`, `pipeline_logs`
4. Integration with NextAuth (secure admin access)

**Features:**
- ✅ Visual status indicators (✓ success, ✗ failed, → running)
- ✅ One-click manual triggers
- ✅ Searchable/filterable logs
- ✅ Progress bars for running pipelines
- ✅ Email/Slack notifications on failures
- ✅ Data quality metrics tracking

**Implementation Time:** ~1 day with Claude Code assistance

---

## Example Automation Workflows

### Workflow 1: Weekly Building Approvals Update
```
Source: ABS Excel file (auto-detect latest)
Target: housing_dashboard.building_approvals_nsw_lga
Schedule: Monday 9:00 AM
Operation: UPSERT (update existing, insert new)
Notification: Email on completion/failure
```

### Workflow 2: Daily Census Data Sync
```
Source: ABS Census API
Target: s12_census.cen21_age_by_sex_lga
Schedule: Daily 2:00 AM
Operation: Incremental update
Notification: Slack webhook on error
```

### Workflow 3: Monthly LGA Boundary Update
```
Source: Portal Spatial NSW GeoJSON
Target: housing_dashboard.lga_boundaries
Schedule: 1st of month, 8:00 AM
Operation: Replace with change detection
Notification: Email with change report
```

---

## Next Steps When You Return

### Immediate Actions:
1. **Database Security:** Run PostgreSQL permission commands (Layer 1)
2. **Choose GUI Option:** Decide if you want the admin dashboard built
3. **Identify First Pipeline:** Pick which data source to automate first

### Quick Start Commands:

**To build the admin pipeline dashboard:**
```
"Build the pipeline dashboard"
```

**To create a specific scraper:**
```
"Create a scraper for [data source] that updates [table] on [schedule]"
```

**Example:**
```
"Create a weekly scraper for ABS building approvals that updates
housing_dashboard.building_approvals_nsw_lga every Monday at 9am"
```

---

## Key Files Modified This Session

1. ✅ `/Users/ben/housing-insights-dashboard/CLAUDE.md`
   - Added database security rules
   - Removed user approval requirements
   - Allowed all schemas in research&insights

2. ✅ `/Users/ben/housing-insights-dashboard/DATA_PIPELINE_NOTES.md`
   - This file - complete conversation summary

---

## Current Vercel Deployment Status

**Last Issue:** Login page needed Suspense boundary (Next.js 15 requirement)
**Resolution:** Wrapped `useSearchParams()` in Suspense, pushed to GitHub
**Build Status:** Should be deploying successfully now

**Building Approvals Card:**
- ✅ Now using: `research&insights.housing_dashboard.building_approvals_nsw_lga`
- ✅ Date format: DD/MM/YYYY (Australian format)
- ✅ Chart displays: Month abbreviation + year on separate lines
- ✅ State-wide and LGA-specific views working

---

## Questions to Answer When You Return

1. Do you want the PostgreSQL security commands run? (Recommended)
2. Should we build the admin pipeline dashboard?
3. Which data source should we automate first?
4. Do you want email/Slack notifications for pipeline failures?
5. What schedule frequency: daily, weekly, monthly?

---

## References

**Your User Profile Location:** `~/.claude/CLAUDE.md`
**Project Memory Location:** `/Users/ben/housing-insights-dashboard/CLAUDE.md`
**Existing Scripts Directory:** `/Users/ben/housing-insights-dashboard/scripts/`

**Database Connection:**
- Pool module: `/src/lib/db-pool.ts`
- Readonly password: `/users/ben/permissions/.env.readonly`
- Admin password: `/users/ben/permissions/.env.admin`

---

## Remember

Claude Code can now:
- ✅ Access any schema in `research&insights` database
- ✅ Create automation scripts without approval
- ✅ Use the existing connection pool infrastructure
- ✅ Generate Python or TypeScript scrapers
- ✅ Build complete ETL pipelines with monitoring

Just describe what you want automated, and Claude Code will build it!

---

**End of Session Notes**
