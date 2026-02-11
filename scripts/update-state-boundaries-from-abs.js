const axios = require('axios');
const fs = require('fs');
const { Pool } = require('pg');

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

// ABS ASGS 2021 State/Territory ArcGIS Service
const ABS_STE_SERVICE = 'https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/STE/MapServer/0/query';

// State name mappings (ABS uses different names)
const STATE_NAME_MAPPING = {
  'New South Wales': 'New South Wales',
  'Victoria': 'Victoria',
  'Queensland': 'Queensland',
  'South Australia': 'South Australia',
  'Western Australia': 'Western Australia',
  'Tasmania': 'Tasmania',
  'Northern Territory': 'Northern Territory',
  'Australian Capital Territory': 'Australian Capital Territory'
};

async function fetchStateFromABS(stateName) {
  try {
    console.log(`Fetching ${stateName} from ABS ArcGIS service...`);

    const params = {
      where: `state_name_2021='${stateName}'`,
      outFields: 'state_code_2021,state_name_2021,area_albers_sqkm',
      returnGeometry: true,
      f: 'geojson',
      outSR: 4326 // WGS84 coordinate system
    };

    const response = await axios.get(ABS_STE_SERVICE, { params });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      return {
        name: feature.properties.state_name_2021,
        code: feature.properties.state_code_2021,
        area: feature.properties.area_albers_sqkm,
        geometry: feature.geometry
      };
    } else {
      throw new Error(`No data returned for ${stateName}`);
    }
  } catch (error) {
    console.error(`Error fetching ${stateName}:`, error.message);
    throw error;
  }
}

async function updateStateGeometry(stateName, geometry, area) {
  try {
    const geoJSONString = JSON.stringify(geometry);

    const updateQuery = `
      UPDATE housing_dashboard.search
      SET
        wkb_geometry = ST_GeomFromGeoJSON($1),
        areasqkm = $2
      WHERE lga_name24 = $3
      RETURNING ogc_fid, lga_name24, areasqkm
    `;

    const result = await pool.query(updateQuery, [
      geoJSONString,
      Math.round(area),
      stateName
    ]);

    if (result.rows.length > 0) {
      console.log(`  ✅ Updated: ${result.rows[0].lga_name24}`);
      console.log(`     Area: ${result.rows[0].areasqkm.toLocaleString()} km²`);
      console.log(`     ogc_fid: ${result.rows[0].ogc_fid}`);
      return true;
    } else {
      console.log(`  ⚠️  No row found for ${stateName}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error updating ${stateName}:`, error.message);
    return false;
  }
}

async function updateAllStates() {
  console.log('========================================');
  console.log('Updating State Boundaries from ABS');
  console.log('Source: ASGS 2021 Edition 3');
  console.log('========================================\n');

  let successCount = 0;
  let failCount = 0;

  for (const [dbName, absName] of Object.entries(STATE_NAME_MAPPING)) {
    try {
      console.log(`\nProcessing: ${dbName}`);

      // Fetch from ABS
      const stateData = await fetchStateFromABS(absName);

      console.log(`  State Code: ${stateData.code}`);
      console.log(`  Area (ABS): ${Math.round(stateData.area).toLocaleString()} km²`);

      // Update database
      const updated = await updateStateGeometry(dbName, stateData.geometry, stateData.area);

      if (updated) {
        successCount++;
      } else {
        failCount++;
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`\n❌ Failed to process ${dbName}:`, error.message);
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log('Summary:');
  console.log(`  ✅ Successfully updated: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log('========================================');
}

async function main() {
  try {
    await updateAllStates();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
