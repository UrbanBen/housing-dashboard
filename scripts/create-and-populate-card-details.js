const { Pool } = require('pg');
const fs = require('fs');

// Read password from file
const passwordPath = '/users/ben/permissions/.env.admin';
const envContent = fs.readFileSync(passwordPath, 'utf8');
const passwordMatch = envContent.match(/ADMIN_DATABASE_PASSWORD=(.+)/);
const password = passwordMatch ? passwordMatch[1].trim() : 'MVN0u0LL9rw';

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: password,
  ssl: { rejectUnauthorized: false }
});

// NSW Planning Region mapping (based on NSW Department of Planning regions)
const lgaToRegionMapping = {
  // Sydney Metro
  'Sydney': 'Greater Sydney', 'Inner West': 'Greater Sydney', 'Canterbury-Bankstown': 'Greater Sydney',
  'Parramatta': 'Greater Sydney', 'Blacktown': 'Greater Sydney', 'Penrith': 'Greater Sydney',
  'The Hills Shire': 'Greater Sydney', 'Hornsby': 'Greater Sydney', 'Ku-ring-gai': 'Greater Sydney',
  'Northern Beaches': 'Greater Sydney', 'Ryde': 'Greater Sydney', 'Willoughby': 'Greater Sydney',
  'North Sydney': 'Greater Sydney', 'Mosman': 'Greater Sydney', 'Lane Cove': 'Greater Sydney',
  'Hunters Hill': 'Greater Sydney', 'Burwood': 'Greater Sydney', 'Strathfield': 'Greater Sydney',
  'Canada Bay': 'Greater Sydney', 'Liverpool': 'Greater Sydney', 'Fairfield': 'Greater Sydney',
  'Cumberland': 'Greater Sydney', 'Bayside': 'Greater Sydney', 'Randwick': 'Greater Sydney',
  'Waverley': 'Greater Sydney', 'Woollahra': 'Greater Sydney', 'Georges River': 'Greater Sydney',
  'Sutherland Shire': 'Greater Sydney', 'Campbelltown': 'Greater Sydney', 'Camden': 'Greater Sydney',
  'Wollondilly': 'Greater Sydney', 'Blue Mountains': 'Greater Sydney', 'Hawkesbury': 'Greater Sydney',

  // Central Coast
  'Central Coast': 'Central Coast',

  // Hunter
  'Newcastle': 'Hunter', 'Lake Macquarie': 'Hunter', 'Maitland': 'Hunter',
  'Cessnock': 'Hunter', 'Port Stephens': 'Hunter', 'Singleton': 'Hunter',
  'Muswellbrook': 'Hunter', 'Upper Hunter Shire': 'Hunter', 'Dungog': 'Hunter',
  'Mid-Coast': 'Hunter',

  // Illawarra-Shoalhaven
  'Wollongong': 'Illawarra', 'Shellharbour': 'Illawarra', 'Kiama': 'Illawarra',
  'Shoalhaven': 'Illawarra', 'Wingecarribee': 'Illawarra',

  // Central West
  'Bathurst': 'Central West', 'Orange': 'Central West', 'Dubbo': 'Central West',
  'Parkes': 'Central West', 'Forbes': 'Central West', 'Cabonne': 'Central West',
  'Cowra': 'Central West', 'Weddin': 'Central West', 'Lachlan': 'Central West',
  'Bland': 'Central West', 'Blayney': 'Central West', 'Oberon': 'Central West',
  'Lithgow': 'Central West', 'Mid-Western Regional': 'Central West',
  'Warrumbungle Shire': 'Central West', 'Gilgandra': 'Central West',

  // Riverina-Murray
  'Wagga Wagga': 'Riverina', 'Albury': 'Riverina', 'Griffith': 'Riverina',
  'Leeton': 'Riverina', 'Narrandera': 'Riverina', 'Coolamon': 'Riverina',
  'Junee': 'Riverina', 'Temora': 'Riverina', 'Cootamundra-Gundagai': 'Riverina',
  'Lockhart': 'Riverina', 'Greater Hume Shire': 'Riverina', 'Federation': 'Riverina',
  'Murray River': 'Riverina', 'Edward River': 'Riverina', 'Murrumbidgee': 'Riverina',
  'Hay': 'Riverina', 'Carrathool': 'Riverina', 'Snowy Valleys': 'Riverina',
  'Snowy Monaro Regional': 'Riverina',

  // North Coast
  'Tweed': 'North Coast', 'Byron': 'North Coast', 'Ballina': 'North Coast',
  'Lismore': 'North Coast', 'Richmond Valley': 'North Coast', 'Kyogle': 'North Coast',
  'Clarence Valley': 'North Coast', 'Coffs Harbour': 'North Coast',
  'Bellingen': 'North Coast', 'Nambucca Valley': 'North Coast',
  'Kempsey': 'North Coast', 'Port Macquarie-Hastings': 'North Coast',

  // New England North West
  'Armidale Regional': 'New England', 'Tamworth Regional': 'New England',
  'Uralla': 'New England', 'Walcha': 'New England', 'Glen Innes Severn': 'New England',
  'Inverell': 'New England', 'Tenterfield': 'New England', 'Gunnedah': 'New England',
  'Liverpool Plains': 'New England', 'Narrabri': 'New England', 'Moree Plains': 'New England',
  'Gwydir': 'New England',

  // Far West
  'Broken Hill': 'Far West', 'Unincorporated NSW': 'Far West', 'Central Darling': 'Far West',
  'Wentworth': 'Far West', 'Balranald': 'Far West', 'Brewarrina': 'Far West',
  'Bourke': 'Far West', 'Cobar': 'Far West', 'Bogan': 'Far West'
};

async function createAndPopulateCardDetails() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Step 1: Creating card_details table...');
    const createTableSQL = fs.readFileSync('database/create-card-details-table.sql', 'utf8');
    await client.query(createTableSQL);
    console.log('✓ Table created successfully');

    console.log('\nStep 2: Inserting LGA data from search table...');

    // Get all NSW LGAs
    const lgasResult = await client.query(`
      SELECT
        lga_code24,
        lga_name24,
        ste_code21,
        ste_name21,
        CAST(areasqkm AS NUMERIC) as areasqkm
      FROM housing_dashboard.search
      WHERE ste_code21 = '1'
      AND lga_name24 IS NOT NULL
      ORDER BY lga_name24;
    `);

    console.log(`Found ${lgasResult.rows.length} NSW LGAs`);

    // Insert each LGA
    let insertedCount = 0;
    let regionsMap = new Map();

    for (const lga of lgasResult.rows) {
      const regionName = lgaToRegionMapping[lga.lga_name24] || 'Other NSW';
      const regionCode = regionName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // Track regions for later aggregation
      if (!regionsMap.has(regionCode)) {
        regionsMap.set(regionCode, {
          name: regionName,
          code: regionCode,
          lgaCount: 0,
          totalArea: 0
        });
      }

      const regionData = regionsMap.get(regionCode);
      regionData.lgaCount++;
      regionData.totalArea += parseFloat(lga.areasqkm) || 0;

      await client.query(`
        INSERT INTO housing_dashboard.card_details
          (level, state_code, state_name, region_code, region_name, lga_code, lga_name, area_sqkm, data_source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT ON CONSTRAINT unique_geographic_entity DO UPDATE
        SET
          area_sqkm = EXCLUDED.area_sqkm,
          region_code = EXCLUDED.region_code,
          region_name = EXCLUDED.region_name,
          last_updated = CURRENT_TIMESTAMP
      `, [
        'lga',
        lga.ste_code21,
        lga.ste_name21,
        regionCode,
        regionName,
        lga.lga_code24,
        lga.lga_name24,
        lga.areasqkm,
        'housing_dashboard.search'
      ]);

      insertedCount++;
    }

    console.log(`✓ Inserted ${insertedCount} LGAs`);

    console.log('\nStep 3: Inserting region aggregates...');

    // Insert region records
    let regionCount = 0;
    for (const [code, data] of regionsMap) {
      await client.query(`
        INSERT INTO housing_dashboard.card_details
          (level, state_code, state_name, region_code, region_name, area_sqkm, data_source)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ON CONSTRAINT unique_geographic_entity DO UPDATE
        SET
          area_sqkm = EXCLUDED.area_sqkm,
          last_updated = CURRENT_TIMESTAMP
      `, [
        'region',
        '1',
        'New South Wales',
        code,
        data.name,
        data.totalArea.toFixed(2),
        'aggregated from LGAs'
      ]);

      regionCount++;
      console.log(`  ✓ Region: ${data.name} (${data.lgaCount} LGAs, ${data.totalArea.toFixed(0)} km²)`);
    }

    console.log(`✓ Inserted ${regionCount} regions`);

    await client.query('COMMIT');

    console.log('\n=== Summary ===');
    const summaryResult = await client.query(`
      SELECT
        level,
        COUNT(*) as count,
        SUM(area_sqkm) as total_area
      FROM housing_dashboard.card_details
      GROUP BY level
      ORDER BY level;
    `);

    console.log(summaryResult.rows);

    console.log('\n✅ Card details table created and populated successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createAndPopulateCardDetails();
