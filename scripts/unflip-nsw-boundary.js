const fs = require('fs');

// Read the GeoJSON file
const geoJSON = JSON.parse(fs.readFileSync('/Users/ben/Dashboard/public/australia-states.geojson', 'utf8'));

console.log('Unflipping NSW boundary (keeping ACT hole flipped)...\n');

// Find NSW feature
const nswFeature = geoJSON.features.find(f => f.properties.STATE_NAME === 'New South Wales');

if (!nswFeature) {
  console.error('❌ NSW feature not found');
  process.exit(1);
}

console.log('Found NSW feature');
console.log('Geometry type:', nswFeature.geometry.type);
console.log('Number of polygons:', nswFeature.geometry.coordinates.length);

const ACT_CENTER_LNG = 149.0; // Approximate ACT longitude
const ACT_TOLERANCE = 1.0; // Within 1 degree

// Process each polygon
nswFeature.geometry.coordinates.forEach((polygon, polyIndex) => {
  console.log(`\nPolygon ${polyIndex}:`);
  console.log(`  Number of rings: ${polygon.length}`);

  polygon.forEach((ring, ringIndex) => {
    const avgLng = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
    const avgLat = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;

    // Check if this ring is the ACT hole (skip it)
    const isACTHole = Math.abs(avgLng - ACT_CENTER_LNG) < ACT_TOLERANCE && ring.length > 100;

    if (isACTHole) {
      console.log(`  Ring ${ringIndex}: ${ring.length} points, center: [${avgLng.toFixed(4)}, ${avgLat.toFixed(4)}] - ACT HOLE (KEEPING FLIPPED)`);
    } else {
      console.log(`  Ring ${ringIndex}: ${ring.length} points, center: [${avgLng.toFixed(4)}, ${avgLat.toFixed(4)}] - Flipping back...`);

      // Flip this ring back (reverse the previous flip)
      const unflippedRing = ring.map(point => {
        const [lng, lat] = point;
        const unflippedLng = 2 * avgLng - lng;
        return [unflippedLng, lat];
      });

      // Update the ring
      nswFeature.geometry.coordinates[polyIndex][ringIndex] = unflippedRing;

      console.log(`  ✅ Ring flipped back!`);
    }
  });
});

// Write back to file
fs.writeFileSync('/Users/ben/Dashboard/public/australia-states.geojson', JSON.stringify(geoJSON, null, 2));

console.log('\n✅ GeoJSON file updated - NSW boundary restored, ACT hole kept flipped');
