#!/usr/bin/env node

/**
 * Development Applications Data Fetcher
 *
 * Fetches DA determination data from DPHI ePlanning API and stores in database.
 * Designed to run weekly via cron job (Sunday evenings).
 *
 * Usage: node scripts/fetch-development-applications.js
 *
 * Environment Variables Required:
 * - DPHI_API_KEY: Subscription key for DPHI ePlanning API
 */

const { Pool } = require('pg');
const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration
const API_BASE_URL = 'https://api.apps1.nsw.gov.au/eplanning/data/v0';
const API_ENDPOINT = `${API_BASE_URL}/OnlineDA`;

// Read DPHI API key from environment
function getApiKey() {
  // Try .env.local first
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DPHI_API_KEY\s*=\s*(.+)/);
    if (match) {
      return match[1].replace(/['"]/g, '').trim();
    }
  }

  // Fallback to process.env
  return process.env.DPHI_API_KEY;
}

// Read database password
function readPasswordFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Password file not found: ${filePath}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([A-Z_]*PASSWORD)\s*=\s*(.*)$/);
      if (match) {
        let value = match[2];
        value = value.replace(/^["']|["']$/g, '');
        return value;
      }
    }

    console.error(`No password found in file: ${filePath}`);
    return null;
  } catch (error) {
    console.error(`Error reading password file ${filePath}:`, error);
    return null;
  }
}

// Initialize database connection
function createDbPool() {
  const password = readPasswordFromFile('/users/ben/permissions/.env.admin');

  if (!password) {
    throw new Error('Failed to read admin database password');
  }

  return new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: password,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

// Fetch data from DPHI API
async function fetchDPHIData(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json'
      }
    };

    console.log(`[DPHI API] Fetching data from ${API_ENDPOINT}...`);

    const req = https.request(API_ENDPOINT, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`[DPHI API] Success: Received ${jsonData.length || 0} records`);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`));
          }
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`API request error: ${error.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('API request timeout after 30 seconds'));
    });

    req.end();
  });
}

// Process and aggregate DA data by LGA and month
function aggregateDataByLGAMonth(daRecords) {
  const aggregated = new Map();

  for (const record of daRecords) {
    // Filter for determined DAs only
    if (!record.DeterminedDate) continue;

    const lgaCode = record.LGACode || record.ConsentAuthority;
    const lgaName = record.LGAName || record.ConsentAuthorityName;
    const determinedDate = new Date(record.DeterminedDate);

    if (!lgaCode || !lgaName || isNaN(determinedDate.getTime())) {
      continue; // Skip invalid records
    }

    // Get first day of month
    const monthYear = new Date(determinedDate.getFullYear(), determinedDate.getMonth(), 1);
    const key = `${lgaCode}-${monthYear.toISOString().split('T')[0]}`;

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        lgaCode,
        lgaName,
        monthYear: monthYear.toISOString().split('T')[0],
        totalDetermined: 0,
        approved: 0,
        refused: 0,
        withdrawn: 0
      });
    }

    const entry = aggregated.get(key);
    entry.totalDetermined++;

    // Categorize by determination type
    const determination = (record.DeterminationType || '').toLowerCase();
    if (determination.includes('approve') || determination.includes('consent')) {
      entry.approved++;
    } else if (determination.includes('refuse') || determination.includes('reject')) {
      entry.refused++;
    } else if (determination.includes('withdraw')) {
      entry.withdrawn++;
    }
  }

  return Array.from(aggregated.values());
}

// Upsert data to database
async function upsertToDatabase(pool, aggregatedData) {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    await client.query('BEGIN');

    for (const record of aggregatedData) {
      try {
        const query = `
          INSERT INTO housing_dashboard.development_applications
          (lga_code, lga_name, month_year, total_determined, approved, refused, withdrawn, data_updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (lga_code, month_year)
          DO UPDATE SET
            lga_name = EXCLUDED.lga_name,
            total_determined = EXCLUDED.total_determined,
            approved = EXCLUDED.approved,
            refused = EXCLUDED.refused,
            withdrawn = EXCLUDED.withdrawn,
            data_updated_at = NOW()
        `;

        await client.query(query, [
          record.lgaCode,
          record.lgaName,
          record.monthYear,
          record.totalDetermined,
          record.approved,
          record.refused,
          record.withdrawn
        ]);

        successCount++;
      } catch (error) {
        console.error(`[DB] Error upserting record for ${record.lgaName} ${record.monthYear}:`, error.message);
        errorCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`[DB] Upsert complete: ${successCount} successful, ${errorCount} failed`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Transaction failed:', error.message);
    throw error;
  } finally {
    client.release();
  }

  return { successCount, errorCount };
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log(`[DA Fetcher] Starting at ${new Date().toISOString()}`);

  // Get API key
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[Error] DPHI_API_KEY not found in environment or .env.local');
    console.error('[Error] Please add DPHI_API_KEY=your-subscription-key to .env.local');
    process.exit(1);
  }

  let pool;

  try {
    // Initialize database
    pool = createDbPool();
    console.log('[DB] Database connection established');

    // Fetch data from API
    const daRecords = await fetchDPHIData(apiKey);

    if (!daRecords || daRecords.length === 0) {
      console.log('[Warning] No records received from API');
      return;
    }

    // Aggregate data
    console.log('[Processing] Aggregating data by LGA and month...');
    const aggregatedData = aggregateDataByLGAMonth(daRecords);
    console.log(`[Processing] Aggregated into ${aggregatedData.length} LGA-month combinations`);

    // Upsert to database
    console.log('[DB] Upserting data to database...');
    const { successCount, errorCount } = await upsertToDatabase(pool, aggregatedData);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n[DA Fetcher] Completed in ${duration}s`);
    console.log(`[Summary] Total records: ${successCount} successful, ${errorCount} failed`);

  } catch (error) {
    console.error('[Error] Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('[DB] Database connection closed');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('[Fatal]', error);
    process.exit(1);
  });
}

module.exports = { main, fetchDPHIData, aggregateDataByLGAMonth };
