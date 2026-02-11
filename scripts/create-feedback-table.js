const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createFeedbackTable() {
  const client = new Client({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: process.env.DB_ADMIN_PASSWORD || require('fs').readFileSync('/users/ben/permissions/.env.admin', 'utf8').trim(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to research&insights database');

    // Read SQL file
    const sqlPath = path.join(__dirname, '../database/create-feedback-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📋 Creating user_feedback table...');
    await client.query(sql);

    console.log('✓ Table created successfully');

    // Verify table exists
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'housing_dashboard'
        AND table_name = 'user_feedback'
    `);

    if (result.rows[0].count === '1') {
      console.log('✓ Table verified');
    } else {
      console.log('❌ Table verification failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createFeedbackTable();
