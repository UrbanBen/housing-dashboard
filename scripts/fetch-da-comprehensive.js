#!/usr/bin/env node

/**
 * Comprehensive Development Applications Data Fetcher
 *
 * Fetches ALL DA records from DPHI ePlanning API and stores in raw table
 * Designed to run daily via cron job (2 AM recommended)
 *
 * Usage: node scripts/fetch-da-comprehensive.js
 *
 * Environment Variables (Optional):
 * - DPHI_API_KEY: Subscription key for DPHI ePlanning API (if required)
 * - NODE_ENV: 'development' for verbose logging
 */

const { Pool } = require('pg');
const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration
const API_BASE_URL = 'https://api.apps1.nsw.gov.au/eplanning/data/v0';
const API_ENDPOINT = `${API_BASE_URL}/OnlineDA`;

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
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Get API key if available (optional)
function getApiKey() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DPHI_API_KEY\s*=\s*(.+)/);
    if (match) {
      return match[1].replace(/['"]/g, '').trim();
    }
  }
  return process.env.DPHI_API_KEY || null;
}

// Fetch single page from DPHI API
async function fetchDPHIPage(apiKey, pageNumber, pageSize = 1000) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MecOne-Housing-Dashboard/1.0',
        'PageSize': pageSize.toString(),
        'PageNumber': pageNumber.toString(),
        'filters': JSON.stringify({ "filters": {} })
      }
    };

    // Add API key if available
    if (apiKey) {
      options.headers['Ocp-Apim-Subscription-Key'] = apiKey;
    }

    const req = https.request(API_ENDPOINT, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);

            // NSW ePlanning API format: { PageSize, PageNumber, TotalPages, TotalCount, Application: [] }
            const records = jsonData.Application || [];
            const metadata = {
              pageSize: jsonData.PageSize,
              pageNumber: jsonData.PageNumber,
              totalPages: jsonData.TotalPages,
              totalCount: jsonData.TotalCount
            };

            resolve({ records, metadata });
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`));
          }
        } else {
          console.error(`[DPHI API] Error response:`, data);
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`API request error: ${error.message}`));
    });

    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('API request timeout after 120 seconds'));
    });

    req.end();
  });
}

// Fetch all data from DPHI API with pagination
async function fetchDPHIData(apiKey, maxPages = null) {
  console.log(`[DPHI API] Fetching data from ${API_ENDPOINT}...`);
  console.log(`[DPHI API] Authentication: ${apiKey ? 'Using API key' : 'Public access'}`);

  const allRecords = [];
  let currentPage = 1;
  let totalPages = null;
  let totalCount = null;

  try {
    // Fetch first page to get metadata
    const firstPage = await fetchDPHIPage(apiKey, currentPage);
    allRecords.push(...firstPage.records);

    totalPages = firstPage.metadata.totalPages;
    totalCount = firstPage.metadata.totalCount;

    console.log(`[DPHI API] Total records available: ${totalCount.toLocaleString()}`);
    console.log(`[DPHI API] Total pages: ${totalPages.toLocaleString()}`);
    console.log(`[DPHI API] Page 1/${totalPages}: ${firstPage.records.length} records fetched`);

    // Determine how many pages to fetch
    const pagesToFetch = maxPages ? Math.min(maxPages, totalPages) : totalPages;

    if (pagesToFetch > 1000) {
      console.log(`[DPHI API] WARNING: ${pagesToFetch} pages will take significant time`);
      console.log(`[DPHI API] Consider running this as a background job`);
    }

    // Fetch remaining pages
    for (currentPage = 2; currentPage <= pagesToFetch; currentPage++) {
      try {
        const page = await fetchDPHIPage(apiKey, currentPage);
        allRecords.push(...page.records);

        // Progress update every 100 pages
        if (currentPage % 100 === 0 || currentPage === pagesToFetch) {
          console.log(`[DPHI API] Page ${currentPage}/${pagesToFetch}: ${allRecords.length.toLocaleString()} total records fetched`);
        }

        // Rate limiting: small delay to avoid overwhelming the API
        if (currentPage % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`[DPHI API] Error fetching page ${currentPage}:`, error.message);
        // Continue with next page instead of failing completely
      }
    }

    console.log(`[DPHI API] Success: Fetched ${allRecords.length.toLocaleString()} total records from ${currentPage - 1} pages`);
    return allRecords;

  } catch (error) {
    console.error(`[DPHI API] Fatal error during pagination:`, error.message);
    throw error;
  }
}

// Map API field names to database columns
function mapApiRecordToDb(record) {
  // Extract nested fields
  const councilName = record.Council?.CouncilName || null;

  // Development types are arrays - join them
  const developmentTypes = record.DevelopmentType?.map(dt => dt.DevelopmentType).join('; ') || null;

  // Get primary location if multiple locations exist
  const primaryLocation = record.Location?.[0] || {};
  const address = primaryLocation.FullAddress || null;

  // Extract lot/DP from Location array
  const lotDp = primaryLocation.Lot?.map(lot => {
    const lotNum = lot.Lot || '';
    const plan = lot.PlanLabel || '';
    return `${lotNum}/${plan}`;
  }).join(', ') || null;

  return {
    application_number: record.PlanningPortalApplicationNumber || record.ApplicationNumber,
    planning_portal_app_number: record.PlanningPortalApplicationNumber,

    lga_code: record.LGACode || null,
    lga_name: councilName || record.LGAName,
    consent_authority: councilName,
    address: address,
    lot_dp: lotDp,

    lodged_date: record.LodgementDate || null,
    determined_date: record.DeterminationDate || record.DeterminedDate || null,
    notification_start_date: record.NotificationStartDate || null,
    notification_end_date: record.NotificationEndDate || null,

    determination_type: record.DeterminationType || record.ApplicationType,
    status: record.ApplicationStatus || record.Status,
    development_type: developmentTypes,
    development_description: record.DevelopmentDescription || record.Description || null,
    number_of_new_dwellings: record.NumberOfNewDwellings || null,
    number_of_existing_dwellings: record.NumberOfExistingDwellings || null,
    estimated_cost: record.CostOfDevelopment || record.EstimatedCost || null,

    development_category: record.DevelopmentCategory || null,
    development_class: record.DevelopmentClass || null,
    modification_number: record.ModificationApplicationNumber || record.ModificationNumber || null,
    is_modification: record.ApplicationType === 'Modification Application' || !!(record.ModificationApplicationNumber || record.ModificationNumber),

    applicant_name: record.ApplicantName || null,
    applicant_type: record.ApplicantType || null,

    assessment_officer: record.AssessmentOfficer || null,

    raw_json: record, // Store full original record
    api_fetched_at: new Date()
  };
}

// Calculate days to determination
function calculateDaysToDetermination(lodgedDate, determinedDate) {
  if (!lodgedDate || !determinedDate) return null;
  const lodged = new Date(lodgedDate);
  const determined = new Date(determinedDate);
  if (isNaN(lodged.getTime()) || isNaN(determined.getTime())) return null;
  const diffTime = determined - lodged;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
}

// Upsert raw records to database with batched commits
async function upsertRawRecords(pool, records) {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const BATCH_SIZE = 1000; // Commit every 1000 records
  let currentBatch = 0;

  try {
    await client.query('BEGIN');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        const mapped = mapApiRecordToDb(record);

        // Skip if missing critical fields (application_number and lga_name are required)
        // Note: lga_code is often not provided by API, so we rely on lga_name (council name)
        if (!mapped.application_number || !mapped.lga_name) {
          skippedCount++;
          if (process.env.NODE_ENV === 'development') {
            console.log('[DB] Skipping record - missing critical fields:', {
              app_num: mapped.application_number,
              lga_name: mapped.lga_name
            });
          }
          continue;
        }

        // Calculate days to determination
        const daysToDetermination = calculateDaysToDetermination(
          mapped.lodged_date,
          mapped.determined_date
        );

        const query = `
          INSERT INTO housing_dashboard.da_records_raw (
            application_number, planning_portal_app_number,
            lga_code, lga_name, consent_authority, address, lot_dp,
            lodged_date, determined_date, notification_start_date, notification_end_date,
            determination_type, status, development_type, development_description,
            number_of_new_dwellings, number_of_existing_dwellings, estimated_cost,
            development_category, development_class, modification_number, is_modification,
            applicant_name, applicant_type, days_to_determination, assessment_officer,
            raw_json, api_fetched_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW(), NOW(), NOW()
          )
          ON CONFLICT (application_number)
          DO UPDATE SET
            planning_portal_app_number = EXCLUDED.planning_portal_app_number,
            lga_code = EXCLUDED.lga_code,
            lga_name = EXCLUDED.lga_name,
            consent_authority = EXCLUDED.consent_authority,
            address = EXCLUDED.address,
            lot_dp = EXCLUDED.lot_dp,
            lodged_date = EXCLUDED.lodged_date,
            determined_date = EXCLUDED.determined_date,
            notification_start_date = EXCLUDED.notification_start_date,
            notification_end_date = EXCLUDED.notification_end_date,
            determination_type = EXCLUDED.determination_type,
            status = EXCLUDED.status,
            development_type = EXCLUDED.development_type,
            development_description = EXCLUDED.development_description,
            number_of_new_dwellings = EXCLUDED.number_of_new_dwellings,
            number_of_existing_dwellings = EXCLUDED.number_of_existing_dwellings,
            estimated_cost = EXCLUDED.estimated_cost,
            development_category = EXCLUDED.development_category,
            development_class = EXCLUDED.development_class,
            modification_number = EXCLUDED.modification_number,
            is_modification = EXCLUDED.is_modification,
            applicant_name = EXCLUDED.applicant_name,
            applicant_type = EXCLUDED.applicant_type,
            days_to_determination = EXCLUDED.days_to_determination,
            assessment_officer = EXCLUDED.assessment_officer,
            raw_json = EXCLUDED.raw_json,
            api_fetched_at = NOW(),
            updated_at = NOW()
        `;

        await client.query(query, [
          mapped.application_number,
          mapped.planning_portal_app_number,
          mapped.lga_code,
          mapped.lga_name,
          mapped.consent_authority,
          mapped.address,
          mapped.lot_dp,
          mapped.lodged_date,
          mapped.determined_date,
          mapped.notification_start_date,
          mapped.notification_end_date,
          mapped.determination_type,
          mapped.status,
          mapped.development_type,
          mapped.development_description,
          mapped.number_of_new_dwellings,
          mapped.number_of_existing_dwellings,
          mapped.estimated_cost,
          mapped.development_category,
          mapped.development_class,
          mapped.modification_number,
          mapped.is_modification,
          mapped.applicant_name,
          mapped.applicant_type,
          daysToDetermination,
          mapped.assessment_officer,
          JSON.stringify(mapped.raw_json)
        ]);

        successCount++;

        // Batched commits for better performance with large datasets
        if ((i + 1) % BATCH_SIZE === 0) {
          await client.query('COMMIT');
          currentBatch++;

          // Log progress every 10,000 records
          if ((i + 1) % 10000 === 0) {
            console.log(`[DB] Progress: ${(i + 1).toLocaleString()} / ${records.length.toLocaleString()} records processed (${successCount.toLocaleString()} successful, ${errorCount} errors, ${skippedCount} skipped)`);
          }

          // Start new transaction for next batch
          await client.query('BEGIN');
        }

      } catch (error) {
        errorCount++;
        if (process.env.NODE_ENV === 'development') {
          console.error(`[DB] Error upserting record:`, error.message);
          console.error('[DB] Problematic record:', JSON.stringify(record).substring(0, 200));
        }
      }
    }

    // Commit any remaining records
    await client.query('COMMIT');
    console.log(`[DB] Upsert complete: ${successCount.toLocaleString()} successful, ${errorCount} failed, ${skippedCount} skipped`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Transaction failed:', error.message);
    throw error;
  } finally {
    client.release();
  }

  return { successCount, errorCount, skippedCount };
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[DA Comprehensive Fetcher] Starting at ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}\n`);

  const apiKey = getApiKey();
  let pool;

  try {
    // Initialize database
    pool = createDbPool();
    console.log('[DB] Database connection established');

    // Fetch data from API
    console.log('\n--- Fetching Data from API ---');
    // For testing, limit to first 2 pages (2000 records)
    // For production, remove the second parameter to fetch all pages
    const maxPages = process.env.TEST_MODE === 'true' ? 2 : null;
    if (maxPages) {
      console.log(`[TEST MODE] Limiting to ${maxPages} pages for testing`);
    }
    const daRecords = await fetchDPHIData(apiKey, maxPages);

    if (!daRecords || daRecords.length === 0) {
      console.log('[Warning] No records received from API');
      console.log('[Info] This may be normal if the API requires specific parameters');
      console.log('[Info] Check API documentation or contact ePlanning Integration Team');
      return;
    }

    // Upsert to database
    console.log('\n--- Upserting to Database ---');
    const { successCount, errorCount, skippedCount } = await upsertRawRecords(pool, daRecords);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[DA Comprehensive Fetcher] Completed in ${duration}s`);
    console.log(`${'='.repeat(70)}`);
    console.log(`[Summary]`);
    console.log(`  Total fetched:  ${daRecords.length} records`);
    console.log(`  Inserted/Updated: ${successCount} records`);
    console.log(`  Failed:         ${errorCount} records`);
    console.log(`  Skipped:        ${skippedCount} records (missing critical data)`);
    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error('\n[ERROR] Fatal error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR] Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('[DB] Database connection closed\n');
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

module.exports = { main, fetchDPHIData, upsertRawRecords };
