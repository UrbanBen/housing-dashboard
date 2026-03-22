# Card Details Table - Census and Population Growth Documentation

**Updated**: 2026-03-22
**Schema**: `housing_dashboard`
**Table**: `card_details`

## Overview

The `housing_dashboard.card_details` table now includes:
- All Australian states and territories
- Historical census data (2011, 2016, 2021)
- Current estimated population (2024)
- Annual population growth rates
- Hierarchical geographic data (Country → State → Region → LGA)

## Table Structure Updates

### New Columns Added

| Column | Type | Description |
|--------|------|-------------|
| `population_2011` | BIGINT | Population from 2011 Census |
| `population_2016` | BIGINT | Population from 2016 Census |
| `population_2021` | BIGINT | Population from 2021 Census |
| `population_2024` | BIGINT | Current estimated population (June 2024) |
| `growth_rate_2011_2016` | NUMERIC(5,2) | Avg annual growth rate 2011-2016 (%) |
| `growth_rate_2016_2021` | NUMERIC(5,2) | Avg annual growth rate 2016-2021 (%) |
| `growth_rate_2021_2024` | NUMERIC(5,2) | Avg annual growth rate 2021-2024 (%) |
| `growth_rate_annual_avg` | NUMERIC(5,2) | Avg annual growth rate 2011-2024 (%) |

### Geographic Levels

Now supports 4 levels:
- **Country**: Australia
- **State**: 8 states and territories
- **Region**: NSW planning regions (9 regions)
- **LGA**: Local Government Areas (131 NSW LGAs currently)

## Australian States and Territories (2024 Population)

| State/Territory | Code | Population 2024 | Growth Rate (2011-2024) |
|-----------------|------|-----------------|-------------------------|
| New South Wales | 1 | 8,391,900 | 1.14% p.a. |
| Victoria | 2 | 6,773,800 | 1.51% p.a. |
| Queensland | 3 | 5,482,100 | 1.50% p.a. |
| Western Australia | 5 | 2,903,800 | 1.63% p.a. |
| South Australia | 4 | 1,842,400 | 0.82% p.a. |
| Tasmania | 6 | 591,800 | 1.12% p.a. |
| Australian Capital Territory | 8 | 466,100 | 1.69% p.a. |
| Northern Territory | 7 | 251,100 | 0.67% p.a. |
| **Australia (Total)** | AUS | **26,703,000** | **1.34% p.a.** |

## Growth Rate Calculations

Growth rates are calculated using compound annual growth rate (CAGR) formula:

```
Growth Rate = ((End Pop / Start Pop) ^ (1 / Years) - 1) × 100
```

For example:
- `growth_rate_2011_2016`: 5-year CAGR from 2011 to 2016
- `growth_rate_2016_2021`: 5-year CAGR from 2016 to 2021
- `growth_rate_2021_2024`: 3-year CAGR from 2021 to 2024
- `growth_rate_annual_avg`: 13-year CAGR from 2011 to 2024

## Usage Examples

### Query Australia total with growth
```sql
SELECT
  state_name as country,
  population_2011,
  population_2024,
  growth_rate_annual_avg
FROM housing_dashboard.card_details
WHERE level = 'country';
```

### Query all states with census data
```sql
SELECT
  state_name,
  population_2011,
  population_2016,
  population_2021,
  population_2024,
  growth_rate_annual_avg
FROM housing_dashboard.card_details
WHERE level = 'state'
ORDER BY population_2024 DESC;
```

### Find fastest growing states
```sql
SELECT
  state_name,
  population_2024,
  growth_rate_annual_avg
FROM housing_dashboard.card_details
WHERE level = 'state'
ORDER BY growth_rate_annual_avg DESC;
```

### NSW regions with population and growth
```sql
SELECT
  region_name,
  population_2024,
  growth_rate_annual_avg
FROM housing_dashboard.card_details
WHERE level = 'region'
AND state_code = '1'
ORDER BY population_2024 DESC;
```

### LGAs with highest growth rates
```sql
SELECT
  lga_name,
  region_name,
  population_2024,
  growth_rate_annual_avg
FROM housing_dashboard.card_details
WHERE level = 'lga'
AND growth_rate_annual_avg IS NOT NULL
ORDER BY growth_rate_annual_avg DESC
LIMIT 10;
```

## Data Sources

- **State/Territory Data**: ABS Census 2011, 2016, 2021 and June 2024 estimates
- **NSW LGA Data**: Currently using estimates based on NSW state growth rates
  - **Production**: Should be replaced with actual ABS census data packs
- **Regional Data**: Aggregated from LGA-level data

## Scripts

### Initial Setup
1. `database/alter-card-details-add-census.sql` - Adds census columns to existing table
2. `scripts/populate-australia-census-data.js` - Populates all Australian states/territories with census data

### NSW LGA Population Data
3. `scripts/populate-nsw-lga-census-data.js` - Template for NSW LGA census data
   - Currently uses estimates for demonstration
   - **Production**: Replace with actual ABS data

### Running the Scripts

```bash
# 1. Add census columns and populate states
node scripts/populate-australia-census-data.js

# 2. Populate NSW LGA data (currently sample estimates)
node scripts/populate-nsw-lga-census-data.js

# 3. Grant permissions
node scripts/grant-card-details-permissions.js
```

## Production Data Requirements

To populate with actual ABS data:

1. **Download ABS Census Data Packs**
   - 2011 Census: https://www.abs.gov.au/census/find-census-data/datapacks
   - 2016 Census: https://www.abs.gov.au/census/find-census-data/datapacks
   - 2021 Census: https://www.abs.gov.au/census/find-census-data/datapacks

2. **Extract LGA Population Data**
   - Look for files with LGA-level population counts
   - Match LGA codes to existing `card_details.lga_code` values

3. **Update Script with Real Data**
   - Edit `scripts/populate-nsw-lga-census-data.js`
   - Replace estimates with actual census figures
   - Add data in format:
   ```javascript
   const lgaPopulationData = {
     "10050": { // Albury LGA code
       pop_2011: 50919,
       pop_2016: 51345,
       pop_2021: 53677
     },
     // ... more LGAs
   };
   ```

4. **Run Population Script**
   ```bash
   node scripts/populate-nsw-lga-census-data.js
   ```

## Regional Aggregation

Regional populations and growth rates are automatically calculated by:
1. Summing LGA populations within each region
2. Calculating growth rates from aggregated census figures
3. The script `populate-nsw-lga-census-data.js` handles this automatically

## Current Status

✅ **Complete**:
- Table schema with census and growth columns
- All 8 Australian states/territories populated
- Australia country-level totals
- Growth rate calculations implemented
- Sample NSW LGA estimates (5 LGAs)
- Regional aggregation logic

⏳ **Pending**:
- Actual ABS census data for all 131 NSW LGAs
- LGAs for other states/territories (VIC, QLD, etc.)

## Notes

- Population estimates for NSW LGAs are currently calculated using state-level growth rates
- For production use, replace with actual ABS census data
- Growth rates use compound annual growth rate (CAGR) formula
- Regional and state totals are aggregated from LGA-level data
- 2024 populations are estimates based on 2021 census and growth trends
