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

async function findTables() {
  console.log('Looking for census tables in s12_census schema...\n');

  try {
    // List all tables in s12_census
    const query = `
      SELECT table_name,
             pg_size_pretty(pg_total_relation_size('s12_census.' || table_name)) as size
      FROM information_schema.tables
      WHERE table_schema = 's12_census'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const result = await pool.query(query);

    console.log(`Found ${result.rows.length} tables:\n`);
    result.rows.forEach(row => {
      console.log(`  ${row.table_name} (${row.size})`);
    });

    // Check if there's a table that looks like country of birth
    console.log('\n\nTables with "country" or "birth" in name:');
    const cobTables = result.rows.filter(row =>
      row.table_name.includes('country') ||
      row.table_name.includes('birth') ||
      row.table_name.includes('g09')
    );

    if (cobTables.length > 0) {
      cobTables.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    } else {
      console.log('  No tables found with country/birth in name');
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findTables();
