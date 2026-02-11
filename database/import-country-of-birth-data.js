const fs = require('fs');
const { Pool } = require('pg');
const csv = require('csv-parser');
const path = require('path');

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

// Sample countries for testing
const SAMPLE_COUNTRIES = [
  'Australia', 'England', 'New Zealand', 'China', 'India',
  'Philippines', 'Vietnam', 'Italy', 'South Africa', 'Malaysia',
  'Scotland', 'United States of America', 'Sri Lanka', 'Germany', 'Hong Kong'
];

const SAMPLE_AGE_GROUPS = [
  '0-4 years', '5-9 years', '10-14 years', '15-19 years', '20-24 years',
  '25-29 years', '30-34 years', '35-39 years', '40-44 years', '45-49 years',
  '50-54 years', '55-59 years', '60-64 years', '65-69 years', '70-74 years',
  '75-79 years', '80-84 years', '85 years and over'
];

const SAMPLE_LGAS = [
  { name: 'Sydney', code: '17200' },
  { name: 'Melbourne', code: '24600' },
  { name: 'Brisbane', code: '31000' }
];

async function createTable() {
  console.log('Creating table if not exists...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS s12_census.cen21_country_of_birth_lga (
      lga_name_2021 VARCHAR(255) NOT NULL,
      lga_code_2021 VARCHAR(50),
      country_of_birth VARCHAR(255) NOT NULL,
      age_group VARCHAR(50),
      sex VARCHAR(10),
      value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (lga_name_2021, country_of_birth, age_group, sex)
    );

    CREATE INDEX IF NOT EXISTS idx_cob_lga
      ON s12_census.cen21_country_of_birth_lga(lga_name_2021);

    CREATE INDEX IF NOT EXISTS idx_cob_country
      ON s12_census.cen21_country_of_birth_lga(country_of_birth);
  `;

  await pool.query(createTableSQL);
  console.log('✅ Table created/verified\n');
}

async function generateSampleData() {
  console.log('========================================');
  console.log('Generating Sample Data');
  console.log('========================================\n');

  let insertCount = 0;

  for (const lga of SAMPLE_LGAS) {
    console.log(`Generating data for ${lga.name}...`);

    for (const country of SAMPLE_COUNTRIES) {
      for (const ageGroup of SAMPLE_AGE_GROUPS) {
        for (const sex of ['Male', 'Female']) {
          // Generate realistic-looking random values
          // More people from Australia, fewer from other countries
          const baseValue = country === 'Australia' ? 500 : 50;
          const randomFactor = Math.random() * 2;
          const value = Math.round(baseValue * randomFactor);

          const insertQuery = `
            INSERT INTO s12_census.cen21_country_of_birth_lga
              (lga_name_2021, lga_code_2021, country_of_birth, age_group, sex, value)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (lga_name_2021, country_of_birth, age_group, sex)
            DO UPDATE SET value = EXCLUDED.value
          `;

          await pool.query(insertQuery, [
            lga.name,
            lga.code,
            country,
            ageGroup,
            sex,
            value
          ]);

          insertCount++;
        }
      }
    }

    console.log(`  ✅ ${lga.name} complete`);
  }

  console.log(`\n✅ Generated ${insertCount} sample records`);
  console.log('========================================\n');
}

async function importFromCSV(filePath) {
  console.log('========================================');
  console.log(`Importing from: ${filePath}`);
  console.log('========================================\n');

  return new Promise((resolve, reject) => {
    let rowCount = 0;
    let insertCount = 0;
    const batchSize = 1000;
    let batch = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', async (row) => {
        rowCount++;

        // Flexible field mapping - adjust these based on your actual CSV columns
        const lgaName = row.LGA_NAME_2021 || row.LGA_NAME || row.lga_name;
        const lgaCode = row.LGA_CODE_2021 || row.LGA_CODE || row.lga_code;
        const country = row.Country_of_Birth || row.BPLP || row.country_of_birth;
        const ageGroup = row.Age_Group || row.AGEP || row.age_group;
        const sex = row.Sex || row.SEXP || row.sex;
        const value = parseInt(row.Count || row.Persons || row.value || 0);

        if (!lgaName || !country) {
          console.warn(`Skipping row ${rowCount}: missing required fields`);
          return;
        }

        batch.push([lgaName, lgaCode, country, ageGroup, sex, value]);

        // Insert in batches
        if (batch.length >= batchSize) {
          await insertBatch(batch);
          insertCount += batch.length;
          batch = [];

          if (insertCount % 10000 === 0) {
            console.log(`  Processed ${insertCount} records...`);
          }
        }
      })
      .on('end', async () => {
        // Insert remaining batch
        if (batch.length > 0) {
          await insertBatch(batch);
          insertCount += batch.length;
        }

        console.log(`\n✅ Import complete: ${insertCount} records inserted from ${rowCount} rows`);
        resolve();
      })
      .on('error', reject);
  });
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

async function grantPermissions() {
  console.log('Granting permissions to mosaic_readonly...');

  await pool.query(`
    GRANT SELECT ON s12_census.cen21_country_of_birth_lga TO mosaic_readonly
  `);

  console.log('✅ Permissions granted\n');
}

async function displaySummary() {
  console.log('========================================');
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

  // Count countries
  const countryResult = await pool.query(`
    SELECT COUNT(DISTINCT country_of_birth) as count
    FROM s12_census.cen21_country_of_birth_lga
  `);
  console.log(`Unique countries: ${parseInt(countryResult.rows[0].count).toLocaleString()}`);

  // Sample LGAs
  const sampleResult = await pool.query(`
    SELECT DISTINCT lga_name_2021
    FROM s12_census.cen21_country_of_birth_lga
    LIMIT 5
  `);
  console.log('\nSample LGAs:');
  sampleResult.rows.forEach(row => console.log(`  - ${row.lga_name_2021}`));

  console.log('\n========================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  const isSample = args.includes('--sample');
  const csvPath = args.find(arg => !arg.startsWith('--'));

  try {
    // Create table
    await createTable();

    if (isSample) {
      // Generate sample data
      await generateSampleData();
    } else if (csvPath && fs.existsSync(csvPath)) {
      // Import from CSV
      await importFromCSV(csvPath);
    } else {
      console.log('========================================');
      console.log('Usage:');
      console.log('========================================\n');
      console.log('Generate sample data:');
      console.log('  node import-country-of-birth-data.js --sample\n');
      console.log('Import from CSV:');
      console.log('  node import-country-of-birth-data.js /path/to/data.csv\n');
      console.log('See COUNTRY_OF_BIRTH_DATA_GUIDE.md for data sources\n');
      process.exit(0);
    }

    // Grant permissions
    await grantPermissions();

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
