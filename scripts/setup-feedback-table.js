/**
 * Setup script for user_feedback table
 * Reads and executes the SQL file to create the feedback table
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setupFeedbackTable() {
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: 'MVN0u0LL9rw',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('📝 Reading SQL file...');
    const sqlPath = path.join(__dirname, '../database/create-feedback-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 Creating user_feedback table...');
    await pool.query(sql);

    console.log('✅ Feedback table created successfully!');

    // Verify table exists
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'housing_dashboard'
        AND table_name = 'user_feedback'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: user_feedback table exists');
    } else {
      console.log('❌ Warning: Table not found after creation');
    }

  } catch (error) {
    console.error('❌ Error setting up feedback table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupFeedbackTable()
  .then(() => {
    console.log('\n🎉 Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  });
