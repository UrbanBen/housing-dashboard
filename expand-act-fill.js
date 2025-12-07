const fs = require('fs');
const path = require('path');
const buffer = require('@turf/buffer').default;

// File paths
const inputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const outputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const backupFile = path.join(__dirname, 'public', 'australia-states-pre-fill-expand.backup.geojson');

// The stroke width in SVG is 0.3 degrees, so we need to expand by half that (0.15 degrees)
// Convert to kilometers: 0.15 degrees ≈ 16.7 km at this latitude
const EXPANSION_KM = 16.7;
const STEPS = 32;

console.log('📐 Expanding ACT fill to match stroke outer edge...\n');

// Read the GeoJSON file
console.log('📖 Reading GeoJSON file...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Create backup
console.log('💾 Creating backup...');
fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
console.log(`   Backup saved to: ${backupFile}\n`);

// Find ACT feature
const actFeatureIndex = data.features.findIndex(f => f.properties.STATE_NAME === 'Australian Capital Territory');
if (actFeatureIndex === -1) {
  console.error('❌ ACT feature not found!');
  process.exit(1);
}

const actFeature = data.features[actFeatureIndex];
console.log('📍 Found ACT feature');

// Create Turf feature for buffering
const actTurfFeature = {
  type: 'Feature',
  properties: actFeature.properties,
  geometry: actFeature.geometry
};

console.log(`\n🔧 Expanding ACT by ${EXPANSION_KM}km (half stroke width)...`);

// Buffer outward to expand the fill area
const expanded = buffer(actTurfFeature, EXPANSION_KM, { units: 'kilometers', steps: STEPS });

// Update ACT geometry with expanded version
data.features[actFeatureIndex].geometry = expanded.geometry;
console.log('   ✓ ACT fill expanded');

// Find NSW feature and update ACT hole
const nswFeature = data.features.find(f => f.properties.STATE_NAME === 'New South Wales');
if (nswFeature && nswFeature.geometry.type === 'MultiPolygon') {
  console.log('\n🔧 Updating NSW ACT hole...');

  // Calculate ACT centroid for finding the hole
  const actCoords = expanded.geometry.coordinates[0];
  let totalLng = 0, totalLat = 0;
  actCoords.forEach(point => {
    totalLng += point[0];
    totalLat += point[1];
  });
  const actCentroid = [totalLng / actCoords.length, totalLat / actCoords.length];

  let foundHole = false;

  nswFeature.geometry.coordinates.forEach((polygon, polyIndex) => {
    if (polygon.length > 1) {
      for (let ringIndex = 1; ringIndex < polygon.length; ringIndex++) {
        const ring = polygon[ringIndex];

        // Calculate ring centroid
        let ringLng = 0, ringLat = 0;
        ring.forEach(point => {
          ringLng += point[0];
          ringLat += point[1];
        });
        const ringCentroid = [ringLng / ring.length, ringLat / ring.length];

        // Check distance to ACT centroid
        const dist = Math.sqrt(
          Math.pow(ringCentroid[0] - actCentroid[0], 2) +
          Math.pow(ringCentroid[1] - actCentroid[1], 2)
        );

        if (dist < 0.5) {
          console.log(`   Found ACT hole at polygon ${polyIndex}, ring ${ringIndex}`);
          // Replace with expanded ACT outline
          polygon[ringIndex] = expanded.geometry.coordinates[0];
          foundHole = true;
          break;
        }
      }
    }
  });

  if (foundHole) {
    console.log('   ✓ NSW ACT hole updated');
  }
}

// Save modified GeoJSON
console.log('\n💾 Saving expanded GeoJSON...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

console.log('\n✅ ACT fill expansion complete!');
console.log(`\n📁 Files:`);
console.log(`   Backup: ${backupFile}`);
console.log(`   Modified: ${outputFile}`);
console.log(`\n💡 ACT fill now extends to the outer edge of the stroke.`);
