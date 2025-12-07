const fs = require('fs');
const path = require('path');
const buffer = require('@turf/buffer').default;

// File paths
const inputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const outputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const backupFile = path.join(__dirname, 'public', 'australia-states-pre-act-smoothing.backup.geojson');

// Buffer distance in kilometers (smaller = more subtle rounding)
const BUFFER_DISTANCE = 3; // km
const STEPS = 32; // More steps = smoother curves

console.log('🔄 Smoothing Australian Capital Territory...\n');

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

console.log(`\n🔧 Applying smoothing (buffer: ${BUFFER_DISTANCE}km)...`);

// Apply buffer outward then inward to round corners
const bufferedOut = buffer(actTurfFeature, BUFFER_DISTANCE, { units: 'kilometers', steps: STEPS });
const bufferedBack = buffer(bufferedOut, -BUFFER_DISTANCE, { units: 'kilometers', steps: STEPS });

// Update ACT geometry with smoothed version
data.features[actFeatureIndex].geometry = bufferedBack.geometry;
console.log('   ✓ ACT smoothed');

// Find NSW feature and update ACT hole
const nswFeature = data.features.find(f => f.properties.STATE_NAME === 'New South Wales');
if (nswFeature && nswFeature.geometry.type === 'MultiPolygon') {
  console.log('\n🔧 Updating NSW ACT hole...');

  // Calculate ACT centroid for finding the hole
  const actCoords = bufferedBack.geometry.coordinates[0];
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
          // Replace with smoothed ACT outline
          polygon[ringIndex] = bufferedBack.geometry.coordinates[0];
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
console.log('\n💾 Saving smoothed GeoJSON...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

console.log('\n✅ ACT smoothing complete!');
console.log(`\n📁 Files:`);
console.log(`   Backup: ${backupFile}`);
console.log(`   Modified: ${outputFile}`);
console.log(`\n💡 ACT now has rounded, smooth edges instead of angular corners.`);
