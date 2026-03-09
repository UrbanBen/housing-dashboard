/**
 * Import median weekly rent data from Excel to database
 * Source: NSW Fair Trading Rent and Sales Reports
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');

const EXCEL_FILE = '/Users/ben/Desktop/rent_tables_december_2025_quarter.xlsx';
const QUARTER = 'December 2025 Quarter';
const QUARTER_DATE = '2025-10-01'; // First day of Oct-Dec quarter

async function importData() {
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: 'MVN0u0LL9rw',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📊 Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets['LGA'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    console.log(`📝 Total rows in sheet: ${data.length}`);

    // Header is at row 9 (index 8)
    const headers = data[8];
    console.log('📋 Headers:', headers);

    // Data starts at row 10 (index 9)
    const dataRows = data.slice(9);
    console.log(`📦 Data rows to process: ${dataRows.length}`);

    // Clear existing data for this quarter
    console.log('\n🗑️  Clearing existing December 2025 Quarter data...');
    const deleteResult = await pool.query(
      'DELETE FROM housing_dashboard.median_weekly_rent WHERE quarter = $1',
      [QUARTER]
    );
    console.log(`✓ Deleted ${deleteResult.rowCount} existing rows`);

    // Process rows
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    console.log('\n📥 Importing data...');

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Skip empty rows
      if (!row || row.length === 0 || !row[3]) {
        skipped++;
        continue;
      }

      try {
        const [
          gmr,
          greater_sydney,
          rings,
          lga_name,
          dwelling_type,
          num_bedrooms,
          first_quartile,
          median,
          third_quartile,
          new_bonds,
          total_bonds,
          quarterly_change_median,
          annual_change_median,
          quarterly_change_bonds,
          annual_change_bonds
        ] = row;

        // Skip if LGA name is empty or 'Total'
        if (!lga_name || lga_name === 'Total') {
          skipped++;
          continue;
        }

        // Parse numeric values, handling special characters and strings
        const parseNumber = (val) => {
          if (val === null || val === undefined || val === '') return null;
          if (typeof val === 'number') return val;

          // Handle special markers: (s) = suppress, (-) = very small
          const str = String(val).trim();
          if (str === '(s)' || str === '-' || str === 'n.a.' || str === '') return null;

          // Remove commas and dollar signs
          const cleaned = str.replace(/[$,%]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? null : parsed;
        };

        await pool.query(`
          INSERT INTO housing_dashboard.median_weekly_rent (
            quarter, quarter_date,
            gmr, greater_sydney, rings, lga_name,
            dwelling_type, num_bedrooms,
            first_quartile_rent, median_rent, third_quartile_rent,
            new_bonds_lodged, total_bonds_held,
            quarterly_change_median_pct, annual_change_median_pct,
            quarterly_change_bonds_pct, annual_change_bonds_pct
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          QUARTER,
          QUARTER_DATE,
          gmr || 'Total',
          greater_sydney || 'Total',
          rings || 'Total',
          lga_name,
          dwelling_type || 'Total',
          num_bedrooms || 'Total',
          parseNumber(first_quartile),
          parseNumber(median),
          parseNumber(third_quartile),
          parseNumber(new_bonds),
          parseNumber(total_bonds),
          parseNumber(quarterly_change_median),
          parseNumber(annual_change_median),
          parseNumber(quarterly_change_bonds),
          parseNumber(annual_change_bonds)
        ]);

        inserted++;

        if (inserted % 1000 === 0) {
          console.log(`  ✓ Inserted ${inserted} rows...`);
        }

      } catch (error) {
        errors++;
        console.error(`  ✗ Error on row ${i + 10}:`, error.message);
        if (errors > 10) {
          console.error('  ⚠️  Too many errors, stopping...');
          break;
        }
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`  ✓ Inserted: ${inserted}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ✗ Errors: ${errors}`);

    // Verify data
    console.log('\n🔍 Verifying imported data...');
    const verifyResult = await pool.query(`
      SELECT
        COUNT(*) as total_rows,
        COUNT(DISTINCT lga_name) as unique_lgas,
        COUNT(DISTINCT dwelling_type) as unique_dwelling_types,
        COUNT(DISTINCT num_bedrooms) as unique_bedroom_counts
      FROM housing_dashboard.median_weekly_rent
      WHERE quarter = $1
    `, [QUARTER]);

    const stats = verifyResult.rows[0];
    console.log(`  Total rows: ${stats.total_rows}`);
    console.log(`  Unique LGAs: ${stats.unique_lgas}`);
    console.log(`  Unique dwelling types: ${stats.unique_dwelling_types}`);
    console.log(`  Unique bedroom counts: ${stats.unique_bedroom_counts}`);

    // Show sample data
    console.log('\n📋 Sample data (first 5 rows):');
    const sampleResult = await pool.query(`
      SELECT lga_name, dwelling_type, num_bedrooms, median_rent
      FROM housing_dashboard.median_weekly_rent
      WHERE quarter = $1
      ORDER BY lga_name, dwelling_type, num_bedrooms
      LIMIT 5
    `, [QUARTER]);

    sampleResult.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.lga_name} - ${row.dwelling_type} (${row.num_bedrooms} bed) = $${row.median_rent}`);
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

importData()
  .then(() => {
    console.log('\n🎉 Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error.message);
    process.exit(1);
  });
