/**
 * Migration script to add subject column to user_feedback table
 * Run: node scripts/add-subject-column.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function addSubjectColumn() {
  console.log('\n📋 Adding subject column to user_feedback table...\n');

  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: process.env.DATABASE_ADMIN_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query(`
      ALTER TABLE housing_dashboard.user_feedback
      ADD COLUMN IF NOT EXISTS subject TEXT;

      COMMENT ON COLUMN housing_dashboard.user_feedback.subject IS 'Brief subject/title of the feedback';
    `);

    console.log('✅ Subject column added successfully!\n');

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
        AND table_name = 'user_feedback'
        AND column_name = 'subject';
    `);

    if (result.rows.length > 0) {
      console.log('✓ Verified: subject column exists');
      console.log(`  Type: ${result.rows[0].data_type}\n`);
    } else {
      console.log('⚠️  Warning: Could not verify column addition\n');
    }

  } catch (error) {
    console.error('❌ Error adding subject column:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addSubjectColumn();
