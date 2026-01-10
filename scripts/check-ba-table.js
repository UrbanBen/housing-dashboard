const { Pool } = require('pg');
const fs = require('fs');

async function checkSchema() {
  const passwordContent = fs.readFileSync('/users/ben/permissions/.env.admin', 'utf8');
  const passwordMatch = passwordContent.match(/PASSWORD\s*=\s*(.+)/);
  const password = passwordMatch ? passwordMatch[1].replace(/['"]/g, '').trim() : null;

  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get column names
    const colQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
      AND table_name = 'building_approvals_nsw_lga'
      ORDER BY ordinal_position
      LIMIT 20
    `;
    const cols = await pool.query(colQuery);
    console.log('First 20 columns:');
    cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Get sample data
    const dataQuery = `SELECT * FROM housing_dashboard.building_approvals_nsw_lga LIMIT 1`;
    const data = await pool.query(dataQuery);
    if (data.rows[0]) {
      const keys = Object.keys(data.rows[0]);
      console.log(`\nTotal columns: ${keys.length}`);
      console.log('\nFirst 15 column names:', keys.slice(0, 15));
      console.log('Last 15 column names:', keys.slice(-15));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
