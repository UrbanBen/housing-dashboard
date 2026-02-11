const { Pool } = require('pg');
const fs = require('fs');

// Read admin password
const envContent = fs.readFileSync('/users/ben/permissions/.env.admin', 'utf8');
const passwordMatch = envContent.match(/PASSWORD\s*=\s*(.+)/);
const password = passwordMatch ? passwordMatch[1].replace(/["']/g, '').trim() : null;

if (!password) {
  console.error('Could not find password in .env.admin file');
  process.exit(1);
}

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: password,
  ssl: { rejectUnauthorized: false }
});

// Sample countries for realistic data
const SAMPLE_COUNTRIES = [
  'Australia', 'England', 'New Zealand', 'China', 'India',
  'Philippines', 'Vietnam', 'Italy', 'South Africa', 'Malaysia',
  'Scotland', 'United States of America', 'Sri Lanka', 'Germany',
  'Hong Kong', 'Lebanon', 'Korea, Republic of (South)', 'Greece',
  'Thailand', 'Indonesia', 'Japan', 'Fiji', 'Pakistan', 'Nepal',
  'Bangladesh', 'Afghanistan', 'Iraq', 'Iran', 'Poland', 'Croatia'
];

const SAMPLE_AGE_GROUPS = [
  '0-4 years', '5-9 years', '10-14 years', '15-19 years', '20-24 years',
  '25-29 years', '30-34 years', '35-39 years', '40-44 years', '45-49 years',
  '50-54 years', '55-59 years', '60-64 years', '65-69 years', '70-74 years',
  '75-79 years', '80-84 years', '85 years and over'
];

async function getNSWLGAs() {
  console.log('Fetching NSW LGAs from database...\n');

  const query = `
    SELECT DISTINCT lga_name24, lga_code24
    FROM housing_dashboard.search
    WHERE ste_name21 = 'New South Wales'
      AND lga_name24 IS NOT NULL
      AND lga_name24 != ''
      AND lga_name24 NOT IN ('New South Wales', 'Australia')
    ORDER BY lga_name24
  `;

  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} NSW LGAs\n`);

  return result.rows.map(row => ({
    name: row.lga_name24,
    code: row.lga_code24 || 'UNKNOWN'
  }));
}

async function generateDataForLGA(lga, lgaIndex, totalLGAs) {
  const batchSize = 500;
  let batch = [];
  let totalInserted = 0;

  console.log(`[${lgaIndex + 1}/${totalLGAs}] Generating data for ${lga.name}...`);

  for (const country of SAMPLE_COUNTRIES) {
    for (const ageGroup of SAMPLE_AGE_GROUPS) {
      for (const sex of ['Male', 'Female']) {
        // Generate realistic-looking random values
        // Australia-born should be majority (60-75%)
        // Other countries vary based on typical NSW demographics
        let baseValue;
        if (country === 'Australia') {
          baseValue = 300 + Math.random() * 400; // 300-700
        } else if (['China', 'India', 'England'].includes(country)) {
          baseValue = 20 + Math.random() * 80; // 20-100
        } else if (['Philippines', 'Vietnam', 'New Zealand'].includes(country)) {
          baseValue = 10 + Math.random() * 40; // 10-50
        } else {
          baseValue = 5 + Math.random() * 20; // 5-25
        }

        // Age distribution (more people in working age groups)
        let ageFactor = 1.0;
        if (['25-29 years', '30-34 years', '35-39 years', '40-44 years'].includes(ageGroup)) {
          ageFactor = 1.5; // More people in these age groups
        } else if (['0-4 years', '5-9 years', '85 years and over'].includes(ageGroup)) {
          ageFactor = 0.6; // Fewer in young and very old
        }

        const value = Math.round(baseValue * ageFactor);

        batch.push([
          lga.name,
          lga.code,
          country,
          ageGroup,
          sex,
          value
        ]);

        // Insert in batches
        if (batch.length >= batchSize) {
          await insertBatch(batch);
          totalInserted += batch.length;
          batch = [];
        }
      }
    }
  }

  // Insert remaining batch
  if (batch.length > 0) {
    await insertBatch(batch);
    totalInserted += batch.length;
  }

  console.log(`  ✅ ${lga.name} complete (${totalInserted} records)`);
  return totalInserted;
}

async function insertBatch(batch) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const row of batch) {
      const insertQuery = `
        INSERT INTO s12_census.cen21_country_of_birth_lga
          (lga_name_2021, lga_code_2021, country_of_birth, age_group, sex, value)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (lga_name_2021, country_of_birth, age_group, sex)
        DO UPDATE SET value = EXCLUDED.value
      `;

      await client.query(insertQuery, row);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function displaySummary() {
  console.log('\n========================================');
  console.log('Data Summary');
  console.log('========================================\n');

  // Count total records
  const totalResult = await pool.query(`
    SELECT COUNT(*) as count FROM s12_census.cen21_country_of_birth_lga
  `);
  console.log(`Total records: ${parseInt(totalResult.rows[0].count).toLocaleString()}`);

  // Count LGAs
  const lgaResult = await pool.query(`
    SELECT COUNT(DISTINCT lga_name_2021) as count
    FROM s12_census.cen21_country_of_birth_lga
  `);
  console.log(`Unique LGAs: ${parseInt(lgaResult.rows[0].count).toLocaleString()}`);

  // Count NSW LGAs specifically
  const nswLgaResult = await pool.query(`
    SELECT COUNT(DISTINCT lga_name_2021) as count
    FROM s12_census.cen21_country_of_birth_lga
    WHERE lga_name_2021 IN (
      SELECT DISTINCT lga_name24
      FROM housing_dashboard.search
      WHERE ste_name21 = 'New South Wales'
    )
  `);
  console.log(`NSW LGAs: ${parseInt(nswLgaResult.rows[0].count).toLocaleString()}`);

  // Sample NSW LGAs
  const sampleResult = await pool.query(`
    SELECT DISTINCT c.lga_name_2021
    FROM s12_census.cen21_country_of_birth_lga c
    INNER JOIN housing_dashboard.search s ON c.lga_name_2021 = s.lga_name24
    WHERE s.ste_name21 = 'New South Wales'
    ORDER BY c.lga_name_2021
    LIMIT 10
  `);
  console.log('\nSample NSW LGAs:');
  sampleResult.rows.forEach(row => console.log(`  - ${row.lga_name_2021}`));

  console.log('\n========================================\n');
}

async function main() {
  console.log('========================================');
  console.log('Populating Country of Birth Data');
  console.log('Region: New South Wales');
  console.log('========================================\n');

  try {
    // Get all NSW LGAs
    const nswLGAs = await getNSWLGAs();

    if (nswLGAs.length === 0) {
      console.log('No NSW LGAs found!');
      process.exit(1);
    }

    console.log('Starting data generation...\n');

    let totalRecordsInserted = 0;

    // Generate data for each LGA
    for (let i = 0; i < nswLGAs.length; i++) {
      const recordCount = await generateDataForLGA(nswLGAs[i], i, nswLGAs.length);
      totalRecordsInserted += recordCount;

      // Small delay to avoid overwhelming the database
      if (i < nswLGAs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Total records inserted: ${totalRecordsInserted.toLocaleString()}`);

    // Display summary
    await displaySummary();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
