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

async function createAustraliaFromStates() {
  console.log('========================================');
  console.log('Creating Australia Boundary from States');
  console.log('Method: PostGIS ST_Union of all states');
  console.log('========================================\n');

  try {
    const states = [
      'New South Wales',
      'Victoria',
      'Queensland',
      'South Australia',
      'Western Australia',
      'Tasmania',
      'Northern Territory',
      'Australian Capital Territory'
    ];

    console.log('Creating unified boundary from 8 states/territories...');
    console.log('Applying simplification (0.02 degrees) for performance...\n');

    // Create Australia boundary by unioning all state boundaries with simplification
    const query = `
      WITH state_union AS (
        SELECT ST_Union(wkb_geometry) as geometry
        FROM housing_dashboard.search
        WHERE lga_name24 IN (${states.map((_, i) => `$${i + 1}`).join(', ')})
      ),
      simplified AS (
        SELECT ST_Simplify(geometry, 0.02) as geometry
        FROM state_union
      )
      SELECT
        ST_AsGeoJSON(geometry) as geometry_json,
        ST_Area(geometry::geography) / 1000000 as area_km2
      FROM simplified
    `;

    console.log('Executing PostGIS union and simplification...');
    const result = await pool.query(query, states);

    if (result.rows.length === 0) {
      throw new Error('Failed to create Australia boundary');
    }

    const geometry = JSON.parse(result.rows[0].geometry_json);
    const area = Math.round(result.rows[0].area_km2);

    console.log(`✅ Boundary created successfully`);
    console.log(`   Area: ${area.toLocaleString()} km²\n`);

    // Check if Australia exists
    const checkQuery = `
      SELECT ogc_fid FROM housing_dashboard.search WHERE lga_name24 = 'Australia'
    `;
    const existing = await pool.query(checkQuery);

    if (existing.rows.length > 0) {
      console.log('Updating existing Australia entry...');
      const updateQuery = `
        UPDATE housing_dashboard.search
        SET
          wkb_geometry = ST_GeomFromGeoJSON($1),
          areasqkm = $2
        WHERE lga_name24 = 'Australia'
        RETURNING ogc_fid, lga_name24, areasqkm
      `;

      const updateResult = await pool.query(updateQuery, [
        JSON.stringify(geometry),
        area
      ]);

      console.log(`✅ Updated: ${updateResult.rows[0].lga_name24}`);
      console.log(`   Area: ${updateResult.rows[0].areasqkm.toLocaleString()} km²`);
      console.log(`   ogc_fid: ${updateResult.rows[0].ogc_fid}`);
    } else {
      console.log('Inserting new Australia entry...');
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

      const insertResult = await pool.query(insertQuery, [
        area,
        JSON.stringify(geometry)
      ]);

      console.log(`✅ Inserted: ${insertResult.rows[0].lga_name24}`);
      console.log(`   Area: ${insertResult.rows[0].areasqkm.toLocaleString()} km²`);
      console.log(`   ogc_fid: ${insertResult.rows[0].ogc_fid}`);
    }

    console.log('\n========================================');
    console.log('✅ Australia boundary successfully created!');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    throw error;
  }
}

async function main() {
  try {
    await createAustraliaFromStates();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
