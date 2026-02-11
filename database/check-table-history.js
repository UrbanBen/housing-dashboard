const { Pool } = require('pg');
const fs = require('fs');

// Read admin password
const envContent = fs.readFileSync('/users/ben/permissions/.env.admin', 'utf8');
const passwordMatch = envContent.match(/PASSWORD\s*=\s*(.+)/);
const password = passwordMatch ? passwordMatch[1].replace(/["']/g, '').trim() : null;

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function checkHistory() {
  console.log('========================================');
  console.log('Analyzing Table State');
  console.log('========================================\n');

  try {
    // Check if there are countries in the table beyond the synthetic 30
    console.log('1. Checking for countries beyond synthetic list...\n');

    const syntheticCountries = [
      'Australia', 'England', 'New Zealand', 'China', 'India',
      'Philippines', 'Vietnam', 'Italy', 'South Africa', 'Malaysia',
      'Scotland', 'United States of America', 'Sri Lanka', 'Germany',
      'Hong Kong', 'Lebanon', 'Korea, Republic of (South)', 'Greece',
      'Thailand', 'Indonesia', 'Japan', 'Fiji', 'Pakistan', 'Nepal',
      'Bangladesh', 'Afghanistan', 'Iraq', 'Iran', 'Poland', 'Croatia'
    ];

    const allCountriesQuery = `
      SELECT DISTINCT country_of_birth
      FROM s12_census.cen21_country_of_birth_lga
      ORDER BY country_of_birth
    `;
    const allCountries = await pool.query(allCountriesQuery);

    const realCensusCountries = allCountries.rows.filter(row =>
      !syntheticCountries.includes(row.country_of_birth)
    );

    console.log(`Total countries in table: ${allCountries.rows.length}`);
    console.log(`Synthetic countries: ${syntheticCountries.length}`);
    console.log(`Non-synthetic countries: ${realCensusCountries.length}\n`);

    if (realCensusCountries.length > 0) {
      console.log('✅ Found NON-SYNTHETIC countries! Real census data may still exist:');
      realCensusCountries.slice(0, 20).forEach(row => console.log(`  - ${row.country_of_birth}`));
      if (realCensusCountries.length > 20) {
        console.log(`  ... and ${realCensusCountries.length - 20} more`);
      }
      console.log();
    } else {
      console.log('❌ Only synthetic countries found. Real data was overwritten.\n');
    }

    // Check record counts by LGA to see data distribution
    console.log('2. Checking data distribution across LGAs...\n');

    const lgaDistQuery = `
      SELECT
        lga_name_2021,
        COUNT(*) as record_count,
        COUNT(DISTINCT country_of_birth) as country_count
      FROM s12_census.cen21_country_of_birth_lga
      GROUP BY lga_name_2021
      ORDER BY country_count DESC
      LIMIT 10
    `;
    const lgaDist = await pool.query(lgaDistQuery);

    console.log('Top 10 LGAs by country diversity:');
    lgaDist.rows.forEach(row => {
      console.log(`  ${row.lga_name_2021}: ${row.record_count} records, ${row.country_count} countries`);
    });
    console.log();

    // Summary and recommendation
    console.log('========================================');
    console.log('SITUATION ASSESSMENT');
    console.log('========================================\n');

    if (realCensusCountries.length > 0) {
      console.log('✅ GOOD NEWS: Real census data exists alongside synthetic data');
      console.log('   - The table contains countries beyond the 30 synthetic ones');
      console.log('   - Original G09 data may be partially preserved\n');
      console.log('RECOMMENDATION:');
      console.log('   - Delete records for the 30 synthetic countries');
      console.log('   - Keep real census data for other countries');
      console.log('   - May need to re-import full data for complete coverage');
    } else {
      console.log('❌ BAD NEWS: Only synthetic data found in the table');
      console.log('   - All 30 countries match the synthetic list');
      console.log('   - Real G09 data with age/sex breakdown was overwritten\n');
      console.log('OPTIONS:');
      console.log('   1. Use cen21_country_of_birth_person_lga (real, but no age/sex)');
      console.log('   2. Restore from database backup if available');
      console.log('   3. Import original ABS G09 Census 2021 data');
      console.log('   4. Generate age/sex breakdown from person-level table if possible');
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkHistory();
