const { Client } = require('pg');

async function checkTable() {
  const client = new Client({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: 'MVN0u0LL9rw',
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
        AND table_name = 'cen21_age_by_sex_lga'
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
      FROM s12_census.cen21_age_by_sex_lga
      LIMIT 5;
    `;

    const sample = await client.query(sampleQuery);
    console.log('\n=== Sample Data (first 5 rows) ===');
    console.log(JSON.stringify(sample.rows, null, 2));

    // Get distinct age groups
    const ageGroupsQuery = `
      SELECT DISTINCT age5p_age_in_five_year_groups
      FROM s12_census.cen21_age_by_sex_lga
      ORDER BY age5p_age_in_five_year_groups;
    `;

    const ageGroups = await client.query(ageGroupsQuery);
    console.log('\n=== Distinct Age Groups ===');
    ageGroups.rows.forEach(row => {
      console.log(row.age5p_age_in_five_year_groups);
    });

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
