require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkCDC() {
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'mosaic_readonly',
    password: process.env.DATABASE_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n📊 CDC Database Investigation\n');
    
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
        AND table_name = 'cdc_historic'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Table: housing_dashboard.cdc_historic');
    console.log('Columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check data sample
    const sample = await pool.query(`
      SELECT * FROM housing_dashboard.cdc_historic
      ORDER BY month DESC
      LIMIT 3
    `);
    
    console.log('\n📋 Sample Data (last 3 months):');
    sample.rows.forEach(row => {
      console.log(`  Month: ${row.month}, LGA: ${row.lga_name}, Dwellings: ${row.monthly_new_dwellings}`);
    });
    
    // Check date range
    const range = await pool.query(`
      SELECT
        MIN(month) as earliest,
        MAX(month) as latest,
        COUNT(*) as total_records,
        COUNT(DISTINCT lga_code) as unique_lgas
      FROM housing_dashboard.cdc_historic
    `);
    
    console.log('\n📅 Date Range:');
    console.log(`  Earliest: ${range.rows[0].earliest}`);
    console.log(`  Latest: ${range.rows[0].latest}`);
    console.log(`  Total Records: ${range.rows[0].total_records}`);
    console.log(`  Unique LGAs: ${range.rows[0].unique_lgas}\n`);
    
  } finally {
    await pool.end();
  }
}

checkCDC();
