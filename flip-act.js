const fs = require('fs');
const path = require('path');

// File paths
const inputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const outputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const backupFile = path.join(__dirname, 'public', 'australia-states-pre-act-flip.backup.geojson');

console.log('🔄 Flipping Australian Capital Territory horizontally...\n');

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

// Calculate centroid longitude for flipping axis
const calculateCentroidLng = (coords) => {
  let totalLng = 0, count = 0;

  const processRing = (ring) => {
    ring.forEach(point => {
      totalLng += point[0];
      count++;
    });
  };

  if (coords[0] instanceof Array) {
    coords.forEach(ring => processRing(ring));
  }

  return totalLng / count;
};

// Flip coordinates horizontally around center longitude
const flipHorizontally = (coords, centerLng) => {
  const flipPoint = (point) => {
    const [lng, lat] = point;
    const flippedLng = 2 * centerLng - lng;
    return [flippedLng, lat];
  };

  const flipRing = (ring) => ring.map(flipPoint);

  if (coords[0] instanceof Array) {
    // Polygon or MultiPolygon rings
    return coords.map(item => {
      if (item[0] instanceof Array) {
        // Ring of coordinates
        return flipRing(item);
      } else {
        // Single point (shouldn't happen in polygon)
        return flipPoint(item);
      }
    });
  }

  return coords;
};

// Get ACT centroid longitude
const actCenterLng = calculateCentroidLng(actFeature.geometry.coordinates);
console.log(`   ACT center longitude: ${actCenterLng.toFixed(4)}`);

// Flip ACT geometry
console.log(`\n🔧 Flipping ACT horizontally...`);
actFeature.geometry.coordinates = flipHorizontally(
  actFeature.geometry.coordinates,
  actCenterLng
);
console.log('   ✓ ACT flipped');

// Find NSW feature and flip ACT hole
const nswFeature = data.features.find(f => f.properties.STATE_NAME === 'New South Wales');
if (nswFeature && nswFeature.geometry.type === 'MultiPolygon') {
  console.log('\n🔧 Flipping NSW ACT hole...');

  let foundHole = false;

  nswFeature.geometry.coordinates.forEach((polygon, polyIndex) => {
    if (polygon.length > 1) {
      for (let ringIndex = 1; ringIndex < polygon.length; ringIndex++) {
        const ring = polygon[ringIndex];

        // Calculate ring centroid to identify ACT hole
        let ringLng = 0, ringLat = 0;
        ring.forEach(point => {
          ringLng += point[0];
          ringLat += point[1];
        });
        const ringCentroid = [ringLng / ring.length, ringLat / ring.length];

        // Check if this is near ACT (within 0.5 degrees)
        const dist = Math.sqrt(
          Math.pow(ringCentroid[0] - actCenterLng, 2) +
          Math.pow(ringCentroid[1] - (-35.485), 2) // approximate ACT lat
        );

        if (dist < 0.5) {
          console.log(`   Found ACT hole at polygon ${polyIndex}, ring ${ringIndex}`);
          // Flip the hole to match flipped ACT
          polygon[ringIndex] = flipHorizontally([ring], actCenterLng)[0];
          foundHole = true;
          break;
        }
      }
    }
  });

  if (foundHole) {
    console.log('   ✓ NSW ACT hole flipped');
  } else {
    console.log('   ℹ No ACT hole found in NSW');
  }
}

// Save modified GeoJSON
console.log('\n💾 Saving flipped GeoJSON...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

console.log('\n✅ ACT horizontal flip complete!');
console.log(`\n📁 Files:`);
console.log(`   Backup: ${backupFile}`);
console.log(`   Modified: ${outputFile}`);
console.log(`\n💡 ACT has been mirrored horizontally and NSW hole synchronized.`);
