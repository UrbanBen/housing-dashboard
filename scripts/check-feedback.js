/**
 * Check feedback entries in database
 */

const { Pool } = require('pg');

async function checkFeedback() {
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
    console.log('📋 Checking feedback entries...\n');

    const result = await pool.query(`
      SELECT
        id,
        feedback_text,
        category,
        priority,
        user_email,
        user_name,
        selected_lga,
        created_at
      FROM housing_dashboard.user_feedback
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('❌ No feedback entries found');
    } else {
      console.log(`✅ Found ${result.rows.length} feedback entries:\n`);
      result.rows.forEach((row, index) => {
        console.log(`[${index + 1}] ID: ${row.id}`);
        console.log(`    Text: ${row.feedback_text}`);
        console.log(`    Category: ${row.category}`);
        console.log(`    Priority: ${row.priority}`);
        console.log(`    User: ${row.user_name || 'Anonymous'} (${row.user_email || 'N/A'})`);
        console.log(`    LGA: ${row.selected_lga || 'None'}`);
        console.log(`    Created: ${row.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error checking feedback:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkFeedback()
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error.message);
    process.exit(1);
  });
