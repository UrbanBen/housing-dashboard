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

async function checkForBackups() {
  try {
    // Check if there are any backup tables
    const backupQuery = `
      SELECT table_schema, table_name,
             pg_size_pretty(pg_total_relation_size(table_schema || '.' || table_name)) as size
      FROM information_schema.tables
      WHERE (table_name LIKE '%cen21_country_of_birth_lga%' OR
             table_name LIKE '%_backup%' OR
             table_name LIKE '%_bak%' OR
             table_name LIKE '%_original%')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `;

    const backups = await pool.query(backupQuery);
    console.log('Tables that might contain backups or original data:');
    if (backups.rows.length > 0) {
      backups.rows.forEach(row => {
        console.log(`  ${row.table_schema}.${row.table_name} (${row.size})`);
      });
    } else {
      console.log('  No backup tables found\n');
    }

    // Check the cen21_country_of_birth_person_lga table structure (might be different data structure)
    console.log('\n--- Examining cen21_country_of_birth_person_lga ---');
    console.log('(This is a different table that might have similar data)\n');

    const personQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 's12_census'
        AND table_name = 'cen21_country_of_birth_person_lga'
      ORDER BY ordinal_position
    `;
    const personCols = await pool.query(personQuery);
    console.log('Columns:');
    personCols.rows.forEach(row => console.log(`  ${row.column_name}: ${row.data_type}`));

    const personCountQuery = `SELECT COUNT(*) as count FROM s12_census.cen21_country_of_birth_person_lga`;
    const personCount = await pool.query(personCountQuery);
    console.log(`\nRecord count: ${parseInt(personCount.rows[0].count).toLocaleString()}`);

    const personCountryQuery = `SELECT COUNT(DISTINCT country_of_birth_of_person) as count FROM s12_census.cen21_country_of_birth_person_lga`;
    const personCountryCount = await pool.query(personCountryQuery);
    console.log(`Distinct countries: ${parseInt(personCountryCount.rows[0].count).toLocaleString()}`);

    const personLgaQuery = `SELECT COUNT(DISTINCT lga_name_2021) as count FROM s12_census.cen21_country_of_birth_person_lga`;
    const personLgaCount = await pool.query(personLgaQuery);
    console.log(`Distinct LGAs: ${parseInt(personLgaCount.rows[0].count).toLocaleString()}`);

    const personSampleQuery = `SELECT * FROM s12_census.cen21_country_of_birth_person_lga LIMIT 3`;
    const personSample = await pool.query(personSampleQuery);
    console.log('\nSample records:');
    console.log(JSON.stringify(personSample.rows, null, 2));

    // Check if there's an import history or ETL log
    console.log('\n--- Checking for data lineage information ---');
    const schemaQuery = `
      SELECT DISTINCT table_schema
      FROM information_schema.tables
      WHERE table_schema LIKE '%etl%' OR table_schema LIKE '%staging%' OR table_schema LIKE '%raw%'
    `;
    const schemas = await pool.query(schemaQuery);
    if (schemas.rows.length > 0) {
      console.log('Found potential staging/ETL schemas:');
      schemas.rows.forEach(row => console.log(`  ${row.table_schema}`));
    } else {
      console.log('No ETL or staging schemas found');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkForBackups();
