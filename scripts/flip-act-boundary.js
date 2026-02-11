const fs = require('fs');

// Read the GeoJSON file
const geoJSON = JSON.parse(fs.readFileSync('/Users/ben/Dashboard/public/australia-states.geojson', 'utf8'));

console.log('Flipping Australian Capital Territory boundary horizontally...\n');

// Find ACT feature
const actFeature = geoJSON.features.find(f => f.properties.STATE_NAME === 'Australian Capital Territory');

if (!actFeature) {
  console.error('❌ ACT feature not found');
  process.exit(1);
}

console.log('Found ACT feature');
console.log('Geometry type:', actFeature.geometry.type);
console.log('Coordinates array length:', actFeature.geometry.coordinates[0].length);

// Get the centroid longitude to flip around
const coords = actFeature.geometry.coordinates[0];
const avgLng = coords.reduce((sum, point) => sum + point[0], 0) / coords.length;
console.log('Centroid longitude:', avgLng);

// Flip horizontally by reflecting around the centroid
actFeature.geometry.coordinates[0] = coords.map(point => {
  const [lng, lat] = point;
  const flippedLng = 2 * avgLng - lng; // Reflect around centroid
  return [flippedLng, lat];
});

console.log('\n✅ ACT boundary flipped horizontally');
console.log('Sample original point:', coords[0]);
console.log('Sample flipped point:', actFeature.geometry.coordinates[0][0]);

// Write back to file
fs.writeFileSync('/Users/ben/Dashboard/public/australia-states.geojson', JSON.stringify(geoJSON, null, 2));

console.log('\n✅ GeoJSON file updated successfully');
