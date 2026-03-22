# Card Details Table Documentation

## Overview

The `housing_dashboard.card_details` table stores hierarchical geographic data for NSW with area and population metrics.

**Created**: 2026-03-22
**Schema**: `housing_dashboard`
**Table**: `card_details`

## Structure

### Hierarchy
- **State** → **Region** → **LGA**
- 1 State (New South Wales)
- 9 Regions (NSW Planning Regions)
- 131 LGAs

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `level` | VARCHAR(10) | Geographic level: 'state', 'region', or 'lga' |
| `state_code` | VARCHAR(5) | State code (e.g., '1' for NSW) |
| `state_name` | VARCHAR(100) | State name |
| `region_code` | VARCHAR(20) | Region code (lowercase hyphenated) |
| `region_name` | VARCHAR(100) | Region name |
| `lga_code` | VARCHAR(10) | LGA code from ABS |
| `lga_name` | VARCHAR(100) | LGA name |
| `area_sqkm` | NUMERIC(15,2) | Area in square kilometers |
| `population` | BIGINT | Population (currently NULL, awaiting ABS data) |
| `data_source` | VARCHAR(255) | Source of the data |
| `last_updated` | TIMESTAMP | Last update timestamp |

### Constraints

- Composite unique constraint on (level, state_code, region_code, lga_code)
- Check constraint: level IN ('state', 'region', 'lga')

### Indexes

- `idx_card_details_level` - Fast filtering by level
- `idx_card_details_state` - Fast filtering by state
- `idx_card_details_region` - Fast filtering by region
- `idx_card_details_lga_name` - Fast text search by LGA name

## Regions

The 9 NSW Planning Regions are:

1. **Greater Sydney** (29 LGAs) - 9,373 km²
2. **Central Coast** (1 LGA) - Included in the mapping
3. **Hunter** (9 LGAs) - 24,652 km²
4. **Illawarra** (5 LGAs) - 8,346 km²
5. **Central West** (14 LGAs) - 72,570 km²
6. **Riverina** (17 LGAs) - 98,725 km²
7. **North Coast** (12 LGAs) - 32,030 km²
8. **New England** (10 LGAs) - 81,943 km²
9. **Far West** (9 LGAs) - 315,754 km²

**Other NSW** (26 LGAs) - 157,406 km² (LGAs not mapped to specific regions)

## Usage Examples

### Query all LGAs with area
```sql
SELECT lga_code, lga_name, region_name, area_sqkm
FROM housing_dashboard.card_details
WHERE level = 'lga'
ORDER BY area_sqkm DESC;
```

### Query regions with total area
```sql
SELECT region_code, region_name, area_sqkm
FROM housing_dashboard.card_details
WHERE level = 'region'
ORDER BY area_sqkm DESC;
```

### Get state-level summary
```sql
SELECT state_name, area_sqkm, population
FROM housing_dashboard.card_details
WHERE level = 'state';
```

### Find LGAs in a specific region
```sql
SELECT lga_name, area_sqkm
FROM housing_dashboard.card_details
WHERE level = 'lga'
AND region_code = 'greater-sydney'
ORDER BY lga_name;
```

## Population Data

Currently, the `population` column is NULL for all rows. To add population data:

1. Obtain LGA-level population data from ABS
2. Run the population update script (template provided)
3. Regional and state populations will be calculated by aggregating LGA populations

See `scripts/update-card-details-population.js` for the update template.

## Maintenance

### Refresh from source
To refresh the table with latest data from `housing_dashboard.search`:
```bash
node scripts/create-and-populate-card-details.js
```

### Grant permissions
```bash
node scripts/grant-card-details-permissions.js
```

## Files

- `database/create-card-details-table.sql` - Table creation SQL
- `scripts/create-and-populate-card-details.js` - Population script
- `scripts/grant-card-details-permissions.js` - Permissions script
- `scripts/update-card-details-population.js` - Population data update template

## Notes

- Area data sourced from `housing_dashboard.search.areasqkm`
- Region mapping based on NSW Department of Planning regions
- Table supports future addition of population and other metrics
- Uses composite unique constraint to allow proper hierarchy
