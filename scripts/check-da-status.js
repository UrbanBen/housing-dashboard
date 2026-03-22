require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkDA() {
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'mosaic_readonly',
    password: process.env.DATABASE_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n📊 DA Database Investigation\n');
    
    // Check if da_aggregated exists
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'housing_dashboard'
        AND table_name IN ('da_records_raw', 'da_aggregated')
    `);
    
    console.log('✅ Tables found:');
    tableCheck.rows.forEach(t => console.log(`  - ${t.table_name}`));
    
    if (tableCheck.rows.some(t => t.table_name === 'da_aggregated')) {
      // Check data
      const count = await pool.query(`
        SELECT
          COUNT(*) as total_records,
          COUNT(DISTINCT lga_code) as unique_lgas,
          MIN(period_start) as earliest,
          MAX(period_start) as latest
        FROM housing_dashboard.da_aggregated
      `);
      
      console.log('\n📋 da_aggregated Status:');
      console.log(`  Total Records: ${count.rows[0].total_records}`);
      console.log(`  Unique LGAs: ${count.rows[0].unique_lgas}`);
      console.log(`  Date Range: ${count.rows[0].earliest} to ${count.rows[0].latest}`);
    }
    
    if (tableCheck.rows.some(t => t.table_name === 'da_records_raw')) {
      const rawCount = await pool.query(`
        SELECT COUNT(*) as total FROM housing_dashboard.da_records_raw
      `);
      console.log(`\n📋 da_records_raw: ${rawCount.rows[0].total} records`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDA();
