const fs = require('fs');

// Read the GeoJSON file
const geoJSON = JSON.parse(fs.readFileSync('/Users/ben/Dashboard/public/australia-states.geojson', 'utf8'));

console.log('Flipping ACT hole in NSW boundary horizontally...\n');

// Find NSW feature
const nswFeature = geoJSON.features.find(f => f.properties.STATE_NAME === 'New South Wales');

if (!nswFeature) {
  console.error('❌ NSW feature not found');
  process.exit(1);
}

console.log('Found NSW feature');
console.log('Geometry type:', nswFeature.geometry.type);
console.log('Number of polygons:', nswFeature.geometry.coordinates.length);

// Analyze each polygon to find the ACT hole
// The ACT hole should be in the mainland polygon (largest by area)
// and should be around longitude 149 (ACT location)

const ACT_CENTER_LNG = 149.0; // Approximate ACT longitude
const ACT_TOLERANCE = 1.0; // Within 1 degree

nswFeature.geometry.coordinates.forEach((polygon, polyIndex) => {
  console.log(`\nPolygon ${polyIndex}:`);
  console.log(`  Number of rings: ${polygon.length}`);

  polygon.forEach((ring, ringIndex) => {
    const avgLng = ring.reduce((sum, point) => sum + point[0], 0) / ring.length;
    const avgLat = ring.reduce((sum, point) => sum + point[1], 0) / ring.length;
    console.log(`  Ring ${ringIndex}: ${ring.length} points, center: [${avgLng.toFixed(4)}, ${avgLat.toFixed(4)}]`);

    // Check if this ring is near ACT coordinates
    if (Math.abs(avgLng - ACT_CENTER_LNG) < ACT_TOLERANCE) {
      console.log(`  ⭐ This is likely the ACT hole! Flipping it...`);

      // Flip this ring horizontally around its centroid
      const flippedRing = ring.map(point => {
        const [lng, lat] = point;
        const flippedLng = 2 * avgLng - lng;
        return [flippedLng, lat];
      });

      // Update the ring
      nswFeature.geometry.coordinates[polyIndex][ringIndex] = flippedRing;

      console.log(`  ✅ Ring flipped!`);
      console.log(`  Sample original: [${ring[0][0].toFixed(4)}, ${ring[0][1].toFixed(4)}]`);
      console.log(`  Sample flipped: [${flippedRing[0][0].toFixed(4)}, ${flippedRing[0][1].toFixed(4)}]`);
    }
  });
});

// Write back to file
fs.writeFileSync('/Users/ben/Dashboard/public/australia-states.geojson', JSON.stringify(geoJSON, null, 2));

console.log('\n✅ GeoJSON file updated successfully');
