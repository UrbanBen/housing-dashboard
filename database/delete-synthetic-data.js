const { Pool } = require('pg');
const fs = require('fs');

// Read admin password
const envContent = fs.readFileSync('/users/ben/permissions/.env.admin', 'utf8');
const passwordMatch = envContent.match(/PASSWORD\s*=\s*(.+)/);
const password = passwordMatch ? passwordMatch[1].replace(/["']/g, '').trim() : null;

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function deleteSyntheticData() {
  console.log('========================================');
  console.log('Deleting Synthetic Data');
  console.log('========================================\n');

  try {
    // Count records before deletion
    const countBefore = await pool.query(`
      SELECT COUNT(*) as count FROM s12_census.cen21_country_of_birth_lga
    `);
    console.log(`Records before deletion: ${parseInt(countBefore.rows[0].count).toLocaleString()}\n`);

    // Delete all records (since they're all synthetic)
    console.log('Deleting all synthetic records...');
    const deleteResult = await pool.query(`
      DELETE FROM s12_census.cen21_country_of_birth_lga
    `);
    console.log(`✅ Deleted ${deleteResult.rowCount.toLocaleString()} records\n`);

    // Verify deletion
    const countAfter = await pool.query(`
      SELECT COUNT(*) as count FROM s12_census.cen21_country_of_birth_lga
    `);
    console.log(`Records after deletion: ${parseInt(countAfter.rows[0].count).toLocaleString()}`);

    console.log('\n========================================');
    console.log('Synthetic data removed successfully');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

deleteSyntheticData();
