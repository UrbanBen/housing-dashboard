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

// ABS ASGS 2021 Country (Australia) ArcGIS Service
const ABS_AUS_SERVICE = 'https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/AUS/MapServer/0/query';

async function fetchAustraliaFromABS() {
  try {
    console.log('Fetching Australia boundary from ABS ArcGIS service...');

    const params = {
      where: "1=1", // Get all records (should be just Australia)
      outFields: 'aus_code_2021,aus_name_2021,area_albers_sqkm',
      returnGeometry: true,
      f: 'geojson',
      outSR: 4326 // WGS84 coordinate system
    };

    const response = await axios.get(ABS_AUS_SERVICE, { params });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      return {
        name: 'Australia',
        code: feature.properties.aus_code_2021,
        area: feature.properties.area_albers_sqkm,
        geometry: feature.geometry
      };
    } else {
      throw new Error('No data returned for Australia');
    }
  } catch (error) {
    console.error('Error fetching Australia:', error.message);
    throw error;
  }
}

async function insertAustraliaBoundary() {
  console.log('========================================');
  console.log('Adding Australia Boundary');
  console.log('Source: ASGS 2021 Edition 3');
  console.log('========================================\n');

  try {
    // Fetch from ABS
    const australiaData = await fetchAustraliaFromABS();

    console.log(`Country Code: ${australiaData.code}`);
    console.log(`Area (ABS): ${Math.round(australiaData.area).toLocaleString()} km²\n`);

    // Check if Australia already exists
    const checkQuery = `
      SELECT ogc_fid
      FROM housing_dashboard.search
      WHERE lga_name24 = 'Australia'
    `;

    const existing = await pool.query(checkQuery);

    if (existing.rows.length > 0) {
      console.log('⚠️  Australia entry already exists. Updating...');

      const geoJSONString = JSON.stringify(australiaData.geometry);

      const updateQuery = `
        UPDATE housing_dashboard.search
        SET
          wkb_geometry = ST_GeomFromGeoJSON($1),
          areasqkm = $2
        WHERE lga_name24 = 'Australia'
        RETURNING ogc_fid, lga_name24, areasqkm
      `;

      const result = await pool.query(updateQuery, [
        geoJSONString,
        Math.round(australiaData.area)
      ]);

      console.log(`✅ Updated: ${result.rows[0].lga_name24}`);
      console.log(`   Area: ${result.rows[0].areasqkm.toLocaleString()} km²`);
      console.log(`   ogc_fid: ${result.rows[0].ogc_fid}`);
    } else {
      console.log('Inserting new Australia entry...');

      const geoJSONString = JSON.stringify(australiaData.geometry);

      const insertQuery = `
        INSERT INTO housing_dashboard.search (
          lga_name24,
          ste_name21,
          areasqkm,
          wkb_geometry
        ) VALUES (
          'Australia',
          'Australia',
          $1,
          ST_GeomFromGeoJSON($2)
        )
        RETURNING ogc_fid, lga_name24, areasqkm
      `;

      const result = await pool.query(insertQuery, [
        Math.round(australiaData.area),
        geoJSONString
      ]);

      console.log(`✅ Inserted: ${result.rows[0].lga_name24}`);
      console.log(`   Area: ${result.rows[0].areasqkm.toLocaleString()} km²`);
      console.log(`   ogc_fid: ${result.rows[0].ogc_fid}`);
    }

    console.log('\n========================================');
    console.log('✅ Australia boundary added successfully!');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ Failed to add Australia boundary:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await insertAustraliaBoundary();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
