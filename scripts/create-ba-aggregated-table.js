const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read database password from .env.local
function getDbPassword() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^DB_ADMIN_PASSWORD\s*=\s*(.+)$/m);
    if (match) {
      return match[1].replace(/^["']|["']$/g, '');
    }
  } catch (error) {
    console.error('Error reading .env.local:', error.message);
  }
  throw new Error('DB_ADMIN_PASSWORD not found in .env.local');
}

async function createBATable() {
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: getDbPassword(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('[BA Table Creation] Starting...');

    // Read SQL file
    const sqlPath = path.join(__dirname, '../database/create-ba-aggregated-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[BA Table Creation] Executing SQL...');
    await pool.query(sql);

    console.log('[BA Table Creation] ✅ Table created successfully!');
    console.log('[BA Table Creation] Table: housing_dashboard.ba_aggregated');
    console.log('[BA Table Creation] Indexes: 8 created');
    console.log('[BA Table Creation] Permissions: granted to mosaic_readonly and db_admin');

  } catch (error) {
    console.error('[BA Table Creation] ❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createBATable();
