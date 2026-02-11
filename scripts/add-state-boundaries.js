const fs = require('fs');
const { Pool } = require('pg');

// Read the GeoJSON file
const geoJSON = JSON.parse(fs.readFileSync('/Users/ben/Dashboard/public/australia-states.geojson', 'utf8'));

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

// Calculate area using Shoelace formula (approximate, in degrees²)
function calculatePolygonArea(coordinates) {
  let totalArea = 0;

  // Handle MultiPolygon
  if (Array.isArray(coordinates[0][0][0])) {
    coordinates.forEach(polygon => {
      totalArea += calculateSinglePolygonArea(polygon);
    });
  } else {
    totalArea = calculateSinglePolygonArea(coordinates);
  }

  return totalArea;
}

function calculateSinglePolygonArea(polygon) {
  const ring = polygon[0]; // Outer ring
  let area = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x1 * y2) - (x2 * y1);
  }

  return Math.abs(area / 2);
}

// Convert degrees² to km² (rough approximation)
// At Australia's latitude (~25°S), 1 degree ≈ 111 km latitude, ~102 km longitude
function degreesToKm2(degrees2) {
  return degrees2 * 111 * 102;
}

async function insertStateData() {
  try {
    console.log('Processing states from GeoJSON...\n');

    for (const feature of geoJSON.features) {
      const stateName = feature.properties.STATE_NAME;
      const stateCode = feature.properties.STATE_CODE;
      const geometry = feature.geometry;

      // Calculate area
      const areaInDegrees = calculatePolygonArea(geometry.coordinates);
      const areaInKm2 = Math.round(degreesToKm2(areaInDegrees));

      console.log(`Processing: ${stateName}`);
      console.log(`  State Code: ${stateCode}`);
      console.log(`  Area (approx): ${areaInKm2.toLocaleString()} km²`);

      // Convert GeoJSON to PostGIS geometry using ST_GeomFromGeoJSON
      const geoJSONString = JSON.stringify(geometry);

      // Check if state already exists
      const checkQuery = `
        SELECT ogc_fid
        FROM housing_dashboard.search
        WHERE lga_name24 = $1
      `;

      const existing = await pool.query(checkQuery, [stateName]);

      if (existing.rows.length > 0) {
        console.log(`  ⚠️  State already exists, skipping...`);
        console.log('');
        continue;
      }

      // Insert state row
      const insertQuery = `
        INSERT INTO housing_dashboard.search (
          lga_name24,
          ste_name21,
          areasqkm,
          wkb_geometry
        ) VALUES (
          $1,
          $2,
          $3,
          ST_GeomFromGeoJSON($4)
        )
        RETURNING ogc_fid
      `;

      const result = await pool.query(insertQuery, [
        stateName,
        stateName,
        areaInKm2,
        geoJSONString
      ]);

      console.log(`  ✅ Inserted with ogc_fid: ${result.rows[0].ogc_fid}`);
      console.log('');
    }

    console.log('✅ All states processed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

insertStateData();
