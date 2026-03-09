/**
 * Setup script for median_weekly_rent table
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setupTable() {
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: 'MVN0u0LL9rw',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📝 Reading SQL file...');
    const sqlPath = path.join(__dirname, '../database/create-median-rent-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 Creating median_weekly_rent table...');
    await pool.query(sql);

    console.log('✅ Table created successfully!');

    // Verify table exists
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'housing_dashboard'
        AND table_name = 'median_weekly_rent'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: median_weekly_rent table exists');
    } else {
      console.log('❌ Warning: Table not found after creation');
    }

  } catch (error) {
    console.error('❌ Error setting up table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupTable()
  .then(() => {
    console.log('\n🎉 Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  });
