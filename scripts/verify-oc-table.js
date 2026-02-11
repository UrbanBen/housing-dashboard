#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');

function readPasswordFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z_]*PASSWORD)\s*=\s*(.*)$/);
    if (match) {
      return match[2].replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

async function main() {
  const password = readPasswordFromFile('/users/ben/permissions/.env.readonly');
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'mosaic_readonly',
    password: password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('\n=== Verifying housing_dashboard.oc_aggregated ===\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'housing_dashboard'
        AND table_name = 'oc_aggregated'
      );
    `);

    console.log('✓ Table Exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Get record counts by period type
      const counts = await pool.query(`
        SELECT
          period_type,
          COUNT(*) as count,
          MIN(period_start) as earliest,
          MAX(period_start) as latest
        FROM housing_dashboard.oc_aggregated
        GROUP BY period_type
        ORDER BY period_type
      `);

      console.log('\nData Summary by Period Type:');
      if (counts.rows.length === 0) {
        console.log('  No data found');
      } else {
        counts.rows.forEach(row => {
          const earliest = row.earliest ? new Date(row.earliest).toISOString().split('T')[0] : 'N/A';
          const latest = row.latest ? new Date(row.latest).toISOString().split('T')[0] : 'N/A';
          console.log(`  ${row.period_type.padEnd(10)}: ${row.count.toString().padStart(6)} records (${earliest} to ${latest})`);
        });
      }

      // Get total records
      const total = await pool.query(`
        SELECT COUNT(*) as total FROM housing_dashboard.oc_aggregated
      `);

      console.log(`\nTotal Records: ${total.rows[0].total}`);

      // Sample data check
      const sample = await pool.query(`
        SELECT lga_name, period_type, period_start, total_determined, determined_approved, determined_withdrawn
        FROM housing_dashboard.oc_aggregated
        ORDER BY period_start DESC
        LIMIT 3
      `);

      console.log('\nSample Records (most recent):');
      sample.rows.forEach(row => {
        const date = new Date(row.period_start).toISOString().split('T')[0];
        console.log(`  ${row.lga_name} (${row.period_type}): ${date} - Total: ${row.total_determined}, Approved: ${row.determined_approved}, Withdrawn: ${row.determined_withdrawn}`);
      });

      // Check indexes
      const indexes = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'housing_dashboard'
        AND tablename = 'oc_aggregated'
        ORDER BY indexname
      `);

      console.log(`\nIndexes (${indexes.rows.length}):`);
      indexes.rows.forEach(row => {
        console.log(`  - ${row.indexname}`);
      });
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
