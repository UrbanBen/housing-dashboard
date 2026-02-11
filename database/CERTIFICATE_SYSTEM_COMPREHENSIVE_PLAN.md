# NSW ePlanning Certificate Tracking System
## Comprehensive Implementation Plan for DA + CC + OC

**Last Updated**: 2026-01-27
**Status**: ✅ DA System Designed | 🔄 CC & OC Expansion In Progress

---

## 🎯 Executive Summary

Complete tracking system for three NSW Planning certificate types:
1. **Development Applications (DA)** - Planning approvals for new developments
2. **Construction Certificates (CC)** - Building permits to commence construction
3. **Occupation Certificates (OC)** - Approval to occupy completed buildings

### System Architecture: Two-Table Pattern (Per Certificate Type)

```
Certificate Type → Raw Records Table + Aggregated Views Table → API Routes → Dashboard Cards

DA:  da_records_raw      + da_aggregated      → /api/da-comprehensive  → 6 cards
CC:  cc_records_raw      + cc_aggregated      → /api/cc-comprehensive  → 6 cards
OC:  oc_records_raw      + oc_aggregated      → /api/oc-comprehensive  → 6 cards

Total: 6 tables + 3 API routes + 18 dashboard cards
```

---

## 📊 Data Availability

All three APIs accessed via NSW ePlanning Data Warehouse:

| Certificate | API Endpoint | Total Records | Available From | Updated |
|-------------|-------------|---------------|----------------|---------|
| **DA** | `https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA` | **393,850** | 2019-01-01 | Daily |
| **CC** | `https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineCC` | **256,877** | 2019-01-01 | Daily |
| **OC** | `https://api.apps1.nsw.gov.au/eplanning/data/v0/OC` | **281,170** | 2019-01-01 | Daily |

**Total Historical Records**: 931,897 records across all certificate types

---

## 🔑 Critical API Discovery: Header-Based Structure

### ✅ Working API Pattern

```bash
curl -H "PageSize: 1000" \
     -H "PageNumber: 1" \
     -H "filters: {\"filters\":{}}" \
     "https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA"
```

**Key Findings**:
- ✅ **No authentication required** - Public access confirmed
- ✅ **Headers not URL parameters** - PageSize, PageNumber, filters
- ✅ **Pagination metadata** - TotalPages, TotalCount returned
- ✅ **Consistent structure** - All three endpoints use same pattern

**Response Format**:
```json
{
  "PageSize": 1000,
  "PageNumber": 1,
  "TotalPages": 394,
  "TotalCount": 393850,
  "Application": [ /* records */ ]
}
```

---

## 📁 Phase 1: Database Schema (All Certificate Types)

### Development Applications (DA) - ✅ COMPLETED

**Tables Created**:
- `housing_dashboard.da_records_raw` - 27 columns + JSONB
- `housing_dashboard.da_aggregated` - Daily/Weekly/Monthly rollups

### Construction Certificates (CC) - 🔄 TO CREATE

**Table**: `housing_dashboard.cc_records_raw`

```sql
CREATE TABLE housing_dashboard.cc_records_raw (
  id SERIAL PRIMARY KEY,
  application_number VARCHAR(100) UNIQUE NOT NULL,
  planning_portal_app_number VARCHAR(100),

  -- Council Information
  lga_code VARCHAR(20),
  lga_name VARCHAR(255) NOT NULL,
  council_name VARCHAR(255),

  -- Dates
  lodged_date DATE,
  determined_date DATE,
  date_last_updated TIMESTAMP,

  -- Status
  application_status VARCHAR(100),

  -- Builder Information
  builder_legal_name VARCHAR(255),
  builder_trading_name VARCHAR(255),
  search_business_by VARCHAR(50),

  -- Development Details
  development_purpose TEXT,
  storeys_proposed INTEGER,
  units_proposed INTEGER,
  land_area DECIMAL(15,2),
  existing_gross_floor_area DECIMAL(15,2),
  proposed_gross_floor_area DECIMAL(15,2),
  cost_of_development DECIMAL(15,2),

  -- Building Use
  current_building_use VARCHAR(255),
  proposed_building_use VARCHAR(255),

  -- Building Code Classification (Array stored as TEXT)
  building_code_class TEXT,
  building_code_description TEXT,

  -- Development Types (Array)
  development_type TEXT,

  -- Location
  address TEXT,
  lot_dp TEXT,

  -- Metadata
  raw_json JSONB NOT NULL,
  api_fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_cc_raw_lga_code ON housing_dashboard.cc_records_raw(lga_code);
CREATE INDEX idx_cc_raw_council_name ON housing_dashboard.cc_records_raw(council_name);
CREATE INDEX idx_cc_raw_determined_date ON housing_dashboard.cc_records_raw(determined_date);
CREATE INDEX idx_cc_raw_status ON housing_dashboard.cc_records_raw(application_status);
CREATE INDEX idx_cc_raw_updated ON housing_dashboard.cc_records_raw(date_last_updated);
```

**Table**: `housing_dashboard.cc_aggregated`

```sql
CREATE TABLE housing_dashboard.cc_aggregated (
  id SERIAL PRIMARY KEY,
  lga_code VARCHAR(20),
  lga_name VARCHAR(255) NOT NULL,

  -- Period Information
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calendar_week INTEGER,
  calendar_month INTEGER,
  calendar_year INTEGER,
  fiscal_year INTEGER,

  -- Aggregated Counts
  total_applications INTEGER DEFAULT 0,
  total_approved INTEGER DEFAULT 0,
  total_withdrawn INTEGER DEFAULT 0,
  total_cancelled INTEGER DEFAULT 0,

  -- Financial Metrics
  total_estimated_cost DECIMAL(18,2),
  avg_estimated_cost DECIMAL(15,2),

  -- Building Metrics
  total_proposed_floor_area DECIMAL(18,2),
  avg_proposed_floor_area DECIMAL(15,2),
  total_units_proposed INTEGER,
  avg_storeys DECIMAL(5,2),

  -- Metadata
  record_count INTEGER DEFAULT 0,
  aggregated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_cc_lga_period UNIQUE(lga_code, lga_name, period_type, period_start)
);

-- Indexes
CREATE INDEX idx_cc_agg_period ON housing_dashboard.cc_aggregated(period_type, period_start);
CREATE INDEX idx_cc_agg_lga ON housing_dashboard.cc_aggregated(lga_code, lga_name);
CREATE INDEX idx_cc_agg_fiscal ON housing_dashboard.cc_aggregated(fiscal_year, calendar_month);
```

### Occupation Certificates (OC) - 🔄 TO CREATE

**Table**: `housing_dashboard.oc_records_raw`

```sql
CREATE TABLE housing_dashboard.oc_records_raw (
  id SERIAL PRIMARY KEY,
  application_number VARCHAR(100) UNIQUE NOT NULL,
  planning_portal_app_number VARCHAR(100),

  -- Council Information
  lga_code VARCHAR(20),
  lga_name VARCHAR(255) NOT NULL,
  council_name VARCHAR(255),

  -- Dates
  lodged_date DATE,
  determined_date DATE,
  date_last_updated TIMESTAMP,

  -- Status
  application_status VARCHAR(100),

  -- Builder Information
  builder_legal_name VARCHAR(255),
  builder_trading_name VARCHAR(255),
  search_business_by VARCHAR(50),

  -- Development Details
  development_purpose TEXT,
  cost_of_development DECIMAL(15,2),

  -- Building Code Classification (Array)
  building_code_class TEXT,

  -- Development Types (Array)
  development_type TEXT,

  -- Location
  address TEXT,
  lot_dp TEXT,

  -- Metadata
  raw_json JSONB NOT NULL,
  api_fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_oc_raw_lga_code ON housing_dashboard.oc_records_raw(lga_code);
CREATE INDEX idx_oc_raw_council_name ON housing_dashboard.oc_records_raw(council_name);
CREATE INDEX idx_oc_raw_determined_date ON housing_dashboard.oc_records_raw(determined_date);
CREATE INDEX idx_oc_raw_status ON housing_dashboard.oc_records_raw(application_status);
```

**Table**: `housing_dashboard.oc_aggregated`

```sql
CREATE TABLE housing_dashboard.oc_aggregated (
  id SERIAL PRIMARY KEY,
  lga_code VARCHAR(20),
  lga_name VARCHAR(255) NOT NULL,

  -- Period Information
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calendar_week INTEGER,
  calendar_month INTEGER,
  calendar_year INTEGER,
  fiscal_year INTEGER,

  -- Aggregated Counts
  total_applications INTEGER DEFAULT 0,
  total_approved INTEGER DEFAULT 0,
  total_withdrawn INTEGER DEFAULT 0,
  total_cancelled INTEGER DEFAULT 0,

  -- Financial Metrics
  total_estimated_cost DECIMAL(18,2),
  avg_estimated_cost DECIMAL(15,2),

  -- Metadata
  record_count INTEGER DEFAULT 0,
  aggregated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_oc_lga_period UNIQUE(lga_code, lga_name, period_type, period_start)
);

-- Indexes
CREATE INDEX idx_oc_agg_period ON housing_dashboard.oc_aggregated(period_type, period_start);
CREATE INDEX idx_oc_agg_lga ON housing_dashboard.oc_aggregated(lga_code, lga_name);
```

---

## 🔄 Phase 2: Data Pipeline Scripts

### DA Fetch Script - ✅ UPDATED (Header-Based)

**File**: `scripts/fetch-da-comprehensive.js`
**Status**: Updated to use headers, supports pagination
**Features**:
- Header-based API calls (PageSize, PageNumber, filters)
- Full pagination support (393,850 records across ~394 pages)
- Nested field extraction (Council, DevelopmentType, Location)
- UPSERT conflict resolution

### CC Fetch Script - 🔄 TO CREATE

**File**: `scripts/fetch-cc-comprehensive.js`

**Field Mapping** (Based on API Response):
```javascript
{
  application_number: record.PlanningPortalApplicationNumber,
  council_name: record.Council?.CouncilName,
  builder_legal_name: record.BuilderLegalName,
  builder_trading_name: record.BuilderTradingName,
  development_purpose: record.DevPurpose,
  storeys_proposed: record.StoreysProposed,
  units_proposed: record.UnitsProposed,
  land_area: record.LandArea,
  existing_gross_floor_area: record.ExistingGrossFloorArea,
  proposed_gross_floor_area: record.ProposedGrossFloorArea,
  cost_of_development: record.CostOfDevelopment,
  current_building_use: record.CurrentBuildingUse,
  proposed_building_use: record.ProposedBuildingUse,
  building_code_class: record.BuildingCodeClass?.map(bc => bc.BuildingCodeClass).join('; '),
  development_type: record.DevelopmentType?.map(dt => dt.DevelopmentType).join('; '),
  address: record.Location?.[0]?.FullAddress
}
```

### OC Fetch Script - 🔄 TO CREATE

**File**: `scripts/fetch-oc-comprehensive.js`

**Field Mapping**:
```javascript
{
  application_number: record.PlanningPortalApplicationNumber,
  council_name: record.Council?.CouncilName,
  builder_legal_name: record.BuilderLegalName,
  builder_trading_name: record.BuilderTradingName,
  development_purpose: record.DevPurpose,
  cost_of_development: record.CostOfDevelopment,
  building_code_class: record.BuildingCodeClass?.map(bc => bc.BuildingCodeClass).join('; '),
  development_type: record.DevelopmentType?.map(dt => dt.DevelopmentType).join('; '),
  address: record.Location?.[0]?.FullAddress
}
```

### Aggregation Scripts - 🔄 TO CREATE

- `scripts/aggregate-cc-data.js` - CC daily/weekly/monthly rollups
- `scripts/aggregate-oc-data.js` - OC daily/weekly/monthly rollups

---

## 🌐 Phase 3: API Routes

### DA API Route - ✅ COMPLETED

**File**: `src/app/api/da-comprehensive/route.ts`
**Endpoints**: Serves 6 card types (daily, weekly, monthly, 13-month, yoy-comparison, history)

### CC API Route - 🔄 TO CREATE

**File**: `src/app/api/cc-comprehensive/route.ts`
**Pattern**: Clone DA route, update queries for CC tables

### OC API Route - 🔄 TO CREATE

**File**: `src/app/api/oc-comprehensive/route.ts`
**Pattern**: Clone DA route, update queries for OC tables

---

## 🎨 Phase 4: Dashboard Cards (18 Total)

### Development Applications (DA) - 1/6 Complete

| Card | Status | File | Icon | Color | Chart Type |
|------|--------|------|------|-------|------------|
| Daily DA Activity | ✅ Complete | `DADailyCard.tsx` | Calendar | Blue | Line Chart |
| Weekly DA Trends | 🔄 To Create | `DAWeeklyCard.tsx` | BarChart3 | Green | Bar Chart |
| Monthly DA Summary | 🔄 To Create | `DAMonthlyCard.tsx` | TrendingUp | Purple | Stacked Area |
| 13-Month Overview | 🔄 To Create | `DA13MonthCard.tsx` | Activity | Orange | Line + Trend |
| Year-over-Year | 🔄 To Create | `DAYoYCard.tsx` | GitCompare | Cyan | Dual Line |
| Complete History | 🔄 To Create | `DAHistoryCard.tsx` | History | Indigo | Timeline |

### Construction Certificates (CC) - 0/6 Complete

| Card | Status | File | Icon | Color | Chart Type |
|------|--------|------|------|-------|------------|
| Daily CC Activity | 🔄 To Create | `CCDailyCard.tsx` | Calendar | Emerald | Line Chart |
| Weekly CC Trends | 🔄 To Create | `CCWeeklyCard.tsx` | BarChart3 | Teal | Bar Chart |
| Monthly CC Summary | 🔄 To Create | `CCMonthlyCard.tsx` | TrendingUp | Sky | Stacked Area |
| 13-Month Overview | 🔄 To Create | `CC13MonthCard.tsx` | Activity | Amber | Line + Trend |
| Year-over-Year | 🔄 To Create | `CCYoYCard.tsx` | GitCompare | Rose | Dual Line |
| Complete History | 🔄 To Create | `CCHistoryCard.tsx` | History | Violet | Timeline |

### Occupation Certificates (OC) - 0/6 Complete

| Card | Status | File | Icon | Color | Chart Type |
|------|--------|------|------|-------|------------|
| Daily OC Activity | 🔄 To Create | `OCDailyCard.tsx` | Calendar | Lime | Line Chart |
| Weekly OC Trends | 🔄 To Create | `OCWeeklyCard.tsx` | BarChart3 | Fuchsia | Bar Chart |
| Monthly OC Summary | 🔄 To Create | `OCMonthlyCard.tsx` | TrendingUp | Pink | Stacked Area |
| 13-Month Overview | 🔄 To Create | `OC13MonthCard.tsx` | Activity | Yellow | Line + Trend |
| Year-over-Year | 🔄 To Create | `OCYoYCard.tsx` | GitCompare | Slate | Dual Line |
| Complete History | 🔄 To Create | `OCHistoryCard.tsx` | History | Zinc | Timeline |

---

## 🔧 Phase 5: System Integration

### Card Library Updates - 🔄 TO DO

**AdminToolbar.tsx**: Add 18 new cards in organized sections

```typescript
const planningCertificateCards = [
  {
    category: 'Development Applications',
    cards: [
      { id: 'da-daily', name: 'DA Daily Activity', icon: Calendar, color: 'blue' },
      { id: 'da-weekly', name: 'DA Weekly Trends', icon: BarChart3, color: 'green' },
      // ... 4 more DA cards
    ]
  },
  {
    category: 'Construction Certificates',
    cards: [
      { id: 'cc-daily', name: 'CC Daily Activity', icon: Calendar, color: 'emerald' },
      // ... 5 more CC cards
    ]
  },
  {
    category: 'Occupation Certificates',
    cards: [
      { id: 'oc-daily', name: 'OC Daily Activity', icon: Calendar, color: 'lime' },
      // ... 5 more OC cards
    ]
  }
];
```

### DraggableCard.tsx - 🔄 TO UPDATE

Add render cases for all 18 card types

### DraggableDashboard.tsx - 🔄 TO UPDATE

Add TypeScript type definitions for all 18 card types

---

## 📅 Phase 6: Automation & Monitoring

### Daily Cron Jobs

```bash
# DA Pipeline (2:00 AM)
0 2 * * * cd /Users/ben/Dashboard && node scripts/fetch-da-comprehensive.js >> /tmp/da-fetch.log 2>&1 && node scripts/aggregate-da-data.js >> /tmp/da-aggregate.log 2>&1

# CC Pipeline (3:00 AM)
0 3 * * * cd /Users/ben/Dashboard && node scripts/fetch-cc-comprehensive.js >> /tmp/cc-fetch.log 2>&1 && node scripts/aggregate-cc-data.js >> /tmp/cc-aggregate.log 2>&1

# OC Pipeline (4:00 AM)
0 4 * * * cd /Users/ben/Dashboard && node scripts/fetch-oc-comprehensive.js >> /tmp/oc-fetch.log 2>&1 && node scripts/aggregate-oc-data.js >> /tmp/oc-aggregate.log 2>&1
```

### Monitoring SQL Queries

```sql
-- Check all certificate data freshness
SELECT
  'DA' as certificate_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT lga_code) as unique_lgas,
  MAX(api_fetched_at) as last_fetch
FROM housing_dashboard.da_records_raw
UNION ALL
SELECT
  'CC',
  COUNT(*),
  COUNT(DISTINCT lga_code),
  MAX(api_fetched_at)
FROM housing_dashboard.cc_records_raw
UNION ALL
SELECT
  'OC',
  COUNT(*),
  COUNT(DISTINCT lga_code),
  MAX(api_fetched_at)
FROM housing_dashboard.oc_records_raw;

-- Check aggregation status
SELECT * FROM housing_dashboard.v_da_aggregation_status;
SELECT * FROM housing_dashboard.v_cc_aggregation_status;
SELECT * FROM housing_dashboard.v_oc_aggregation_status;
```

---

## 📋 Implementation Checklist

### Immediate Next Steps

#### 1. Test Updated DA Fetch Script ✅
- [x] Update to header-based API
- [x] Update field mapping for actual API structure
- [ ] Run test fetch: `node scripts/fetch-da-comprehensive.js`
- [ ] Verify data inserted correctly
- [ ] Run aggregation: `node scripts/aggregate-da-data.js`

#### 2. Create CC Database Tables
- [ ] Create SQL file: `database/create-cc-comprehensive-tables.sql`
- [ ] Run SQL migration
- [ ] Verify tables created

#### 3. Create CC Fetch Script
- [ ] Copy `fetch-da-comprehensive.js` → `fetch-cc-comprehensive.js`
- [ ] Update API endpoint to `/OnlineCC`
- [ ] Update field mapping for CC structure
- [ ] Update database table references
- [ ] Test with small page limit first

#### 4. Create CC Aggregation Script
- [ ] Copy `aggregate-da-data.js` → `aggregate-cc-data.js`
- [ ] Update table references
- [ ] Test aggregation

#### 5. Repeat Steps 2-4 for OC
- [ ] Create OC database tables
- [ ] Create OC fetch script
- [ ] Create OC aggregation script

#### 6. Create API Routes
- [ ] CC API route: `src/app/api/cc-comprehensive/route.ts`
- [ ] OC API route: `src/app/api/oc-comprehensive/route.ts`

#### 7. Create Remaining DA Cards (5 cards)
- [ ] DAWeeklyCard.tsx
- [ ] DAMonthlyCard.tsx
- [ ] DA13MonthCard.tsx
- [ ] DAYoYCard.tsx
- [ ] DAHistoryCard.tsx

#### 8. Create All CC Cards (6 cards)
- [ ] CCDailyCard.tsx
- [ ] CCWeeklyCard.tsx
- [ ] CCMonthlyCard.tsx
- [ ] CC13MonthCard.tsx
- [ ] CCYoYCard.tsx
- [ ] CCHistoryCard.tsx

#### 9. Create All OC Cards (6 cards)
- [ ] OCDailyCard.tsx
- [ ] OCWeeklyCard.tsx
- [ ] OCMonthlyCard.tsx
- [ ] OC13MonthCard.tsx
- [ ] OCYoYCard.tsx
- [ ] OCHistoryCard.tsx

#### 10. Integrate All Cards
- [ ] Update DraggableCard.tsx (18 render cases)
- [ ] Update DraggableDashboard.tsx (18 type definitions)
- [ ] Update AdminToolbar.tsx (18 card library entries)

#### 11. Set Up Automation
- [ ] Configure cron jobs for all three pipelines
- [ ] Set up log rotation
- [ ] Test automated runs

---

## 📊 Expected Outcomes

### Database Size Estimates

| Certificate | Raw Records | Aggregations | Total Size (Est.) |
|-------------|-------------|--------------|-------------------|
| DA | ~400,000 | ~150,000 | ~600 MB |
| CC | ~260,000 | ~100,000 | ~400 MB |
| OC | ~280,000 | ~110,000 | ~420 MB |
| **Total** | **~940,000** | **~360,000** | **~1.4 GB** |

### Dashboard Capabilities

Once complete, users can:
- **Track all three certificate types** across NSW LGAs
- **View multiple time scales** (daily, weekly, monthly, yearly, historical)
- **Compare year-over-year** trends
- **Analyze patterns** in planning, construction, and occupation activity
- **Identify bottlenecks** in development pipeline (DA → CC → OC flow)

---

## 🚀 Next Action: Test Updated DA Fetch Script

```bash
cd /Users/ben/Dashboard

# Test with limited pagination (first 2 pages = 2000 records)
# Edit main() to add maxPages parameter: await fetchDPHIData(apiKey, 2)

node scripts/fetch-da-comprehensive.js
```

**Expected Output**:
```
[DPHI API] Total records available: 393,850
[DPHI API] Total pages: 394
[DPHI API] Page 1/2: 1000 records fetched
[DPHI API] Page 2/2: 2000 total records fetched
[DB] Upsert complete: 2000 successful, 0 failed, 0 skipped
```

If successful → Run full fetch (all 394 pages) → Run aggregation → Create remaining cards
