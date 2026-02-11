# Country of Birth Data Import Guide

## Data Source: ABS Census 2021 Table G09

### Option 1: ABS GeoPackages (Recommended)
**URL**: https://www.abs.gov.au/census/find-census-data/geopackages

**Steps**:
1. Navigate to the ABS GeoPackages page
2. Select "2021 Census"
3. Choose your state/territory or download Australia-wide
4. Look for table **G09 - Country of birth of person by age by sex**
5. Download the GeoPackage (.gpkg) or CSV file
6. Place the downloaded file(s) in `/Users/ben/Dashboard/data/census/`

**File Format**: GeoPackage (.gpkg) or CSV
**File Size**: ~155 MB per state/territory

### Option 2: ABS DataPacks
**URL**: https://www.abs.gov.au/census/find-census-data/datapacks

**Steps**:
1. Select "General Community Profile"
2. Choose "LGA" geography level
3. Download for your required state(s)
4. Extract and find G09 table
5. Place in `/Users/ben/Dashboard/data/census/`

### Option 3: OpenDataSoft (Quick Test)
**URL**: https://data.opendatasoft.com/explore/dataset/abs-g09-lga-level-by-state@australiademo/

This provides a REST API endpoint for quick testing, though may not have complete data.

---

## Data Structure Expected

The CSV/table should have columns similar to:
- `LGA_CODE_2021` or `LGA_CODE`
- `LGA_NAME_2021` or `LGA_NAME`
- `Country_of_Birth` or `BPLP` (Birth Place of Person)
- `Age_Group` or `AGEP` (Age of Person)
- `Sex` or `SEXP`
- `Count` or `Persons` (the value)

---

## After Downloading

1. Place files in: `/Users/ben/Dashboard/data/census/`
2. Run: `node /Users/ben/Dashboard/database/import-country-of-birth-data.js`
3. The script will:
   - Parse the CSV/GeoPackage
   - Transform to the required structure
   - Insert into `s12_census.cen21_country_of_birth_lga`
   - Report progress and any errors

---

## Quick Start (For Testing)

If you want to test with sample data first, the import script can generate mock data for a few LGAs.

Run with `--sample` flag:
```bash
node /Users/ben/Dashboard/database/import-country-of-birth-data.js --sample
```
