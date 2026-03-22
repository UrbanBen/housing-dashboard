const { Pool } = require('pg');
const fs = require('fs');

// Read password from file
const passwordPath = '/users/ben/permissions/.env.admin';
const envContent = fs.readFileSync(passwordPath, 'utf8');
const passwordMatch = envContent.match(/ADMIN_DATABASE_PASSWORD=(.+)/);
const password = passwordMatch ? passwordMatch[1].trim() : 'MVN0u0LL9rw';

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function grantPermissions() {
  try {
    console.log('Granting permissions on card_details table...');

    // Grant SELECT to mosaic_readonly
    await pool.query(`
      GRANT SELECT ON housing_dashboard.card_details TO mosaic_readonly;
    `);
    console.log('✓ Granted SELECT to mosaic_readonly');

    // Grant all permissions to db_admin (already has it, but explicit is good)
    await pool.query(`
      GRANT ALL PRIVILEGES ON housing_dashboard.card_details TO db_admin;
    `);
    console.log('✓ Granted ALL PRIVILEGES to db_admin');

    // Grant usage on sequence
    await pool.query(`
      GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.card_details_id_seq TO db_admin;
    `);
    console.log('✓ Granted sequence permissions to db_admin');

    console.log('\n✅ Permissions granted successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

grantPermissions();
