const { Client } = require('pg');
const fs = require('fs');

// Read database password from .env.local
function getDbPassword() {
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^DB_ADMIN_PASSWORD\s*=\s*(.+)$/m);
    if (match) {
      return match[1].replace(/^["']|["']$/g, '');
    }
  } catch (error) {
    console.error('Error reading .env.local:', error.message);
  }
  throw new Error('DB_ADMIN_PASSWORD not found in .env.local');
}

async function checkTable() {
  const client = new Client({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: getDbPassword(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get column information
    const columnQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 's12_census'
        AND table_name = 'cen21_dwelling_type_lga'
      ORDER BY ordinal_position
      LIMIT 30;
    `;

    const columns = await client.query(columnQuery);
    console.log('\n=== Table Columns ===');
    columns.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    // Get sample data
    const sampleQuery = `
      SELECT *
      FROM s12_census.cen21_dwelling_type_lga
      LIMIT 5;
    `;

    const sample = await client.query(sampleQuery);
    console.log('\n=== Sample Data (first 5 rows) ===');
    console.log(JSON.stringify(sample.rows, null, 2));

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    if (client) {
      try {
        await client.end();
      } catch (e) {}
    }
  }
}

checkTable();
