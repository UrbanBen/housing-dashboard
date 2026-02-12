# Pipeline Manager Information

## Two Separate Projects

You now have **two separate Next.js applications**:

### 1. Housing Dashboard (This Project)
- **Location**: `/Users/ben/Dashboard`
- **Port**: `3000`
- **Purpose**: Main user-facing dashboard for housing insights
- **Database Access**: Read-only (`mosaic_readonly`)

### 2. Pipeline Manager
- **Location**: `/users/ben/Pipeline`
- **Port**: `3001`
- **Purpose**: Admin tool for managing data scrapers and aggregations
- **Database Access**: Read-write (`db_admin`)

## Data Flow

```
Pipeline Manager Scrapers
    ↓
Raw Database Tables (da_records_raw, cc_records_raw)
    ↓
Pipeline Manager Aggregators
    ↓
Aggregated Tables (da_aggregated, cc_aggregated)
    ↓
Dashboard API Routes
    ↓
Dashboard UI Components
```

## Working with Both Projects

### Dashboard Development (Current Context)
```bash
# You're here now
cd /Users/ben/Dashboard
npm run dev
# Access at http://localhost:3000
```

**Tell Claude:**
> "I'm working on the Housing Dashboard at /Users/ben/Dashboard"

### Pipeline Development (Separate Terminal)
```bash
# Open new terminal
cd /users/ben/Pipeline
npm run dev
# Access at http://localhost:3001
```

**Tell Claude:**
> "I'm working on the Pipeline Manager at /users/ben/Pipeline"

## Quick Reference

### Dashboard (Port 3000)
- **What it does**: Displays housing data to end users
- **Database**: Read-only access
- **API Routes**: `/api/da-comprehensive`, `/api/age-by-sex`, etc.
- **Components**: Dashboard cards, maps, charts
- **Auth**: NextAuth with Microsoft OAuth

### Pipeline (Port 3001)
- **What it does**: Fetches and processes data for the dashboard
- **Database**: Read-write access
- **API Routes**: `/api/scrapers`, `/api/logs`
- **Components**: Scraper cards, execution logs
- **Auth**: None (internal admin tool)

## Switching Between Projects

### In Claude Code

When you want to work on the Pipeline:
1. Open a new terminal
2. `cd /users/ben/Pipeline`
3. Tell Claude: "Switch to Pipeline project at /users/ben/Pipeline"
4. Read `/users/ben/Pipeline/DEVELOPMENT.md` for full context

When you want to return to Dashboard:
1. Tell Claude: "Switch back to Dashboard project at /Users/ben/Dashboard"
2. Claude has full context from CLAUDE.md

### File Locations

**Dashboard Project Files:**
- `/Users/ben/Dashboard/src/` - Source code
- `/Users/ben/Dashboard/scripts/` - Old standalone scripts (being migrated)
- `/Users/ben/Dashboard/.env.local` - Dashboard environment

**Pipeline Project Files:**
- `/users/ben/Pipeline/app/` - Next.js app
- `/users/ben/Pipeline/lib/` - Core logic (scrapers, DB, logger)
- `/users/ben/Pipeline/.env.local` - Pipeline environment

## They Share

- **Database**: Both use `research&insights` on Azure PostgreSQL
- **Tables**: Pipeline writes, Dashboard reads
- **Credentials**: Same database password (different users)

## They Don't Share

- `node_modules` - Completely separate dependencies
- `.next` build folders - Separate builds
- `.env.local` - Different configurations
- Git repos - Separate version control (if using Git)

## Running Both Simultaneously

You can run both at the same time:

**Terminal 1 (Dashboard):**
```bash
cd /Users/ben/Dashboard
npm run dev
# Running on http://localhost:3000
```

**Terminal 2 (Pipeline):**
```bash
cd /users/ben/Pipeline
npm run dev
# Running on http://localhost:3001
```

They won't conflict because they use different ports!

## Development Workflow

**Typical workflow:**

1. **Use Pipeline to update data:**
   - Open http://localhost:3001
   - Run scrapers to fetch fresh data
   - Run aggregators to process data

2. **Use Dashboard to view data:**
   - Open http://localhost:3000
   - View updated charts and metrics
   - Test new dashboard features

3. **Both projects can run simultaneously** without issues

## Important Notes

⚠️ **Case Sensitivity**: Note the path case difference:
- Dashboard: `/Users/ben/Dashboard` (capital U, D)
- Pipeline: `/users/ben/Pipeline` (lowercase u, capital P)

⚠️ **Environment Files**: Each has its own `.env.local` - don't mix them up!

⚠️ **Database Users**:
- Dashboard uses `mosaic_readonly` (can't write)
- Pipeline uses `db_admin` (can write)

⚠️ **Port Conflicts**: If you get "port in use" errors:
```bash
# Check what's using the port
lsof -i :3000  # for Dashboard
lsof -i :3001  # for Pipeline

# Kill if needed
kill -9 <PID>
```

---

**For complete Pipeline documentation, see:**
- `/users/ben/Pipeline/DEVELOPMENT.md` - Development guide
- `/users/ben/Pipeline/README.md` - User documentation
