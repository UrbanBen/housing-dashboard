const fs = require('fs');
const path = require('path');

// File paths
const inputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const outputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const backupFile = path.join(__dirname, 'public', 'australia-states-pre-double.backup.geojson');

const SCALE_FACTOR = 2.0; // Double the size

console.log('📐 Doubling ACT size (fill and clickable area)...\n');

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

// Calculate centroid of ACT
const calculateCentroid = (coords) => {
  let totalLng = 0, totalLat = 0, count = 0;

  const processRing = (ring) => {
    ring.forEach(point => {
      totalLng += point[0];
      totalLat += point[1];
      count++;
    });
  };

  if (coords[0] instanceof Array) {
    coords.forEach(ring => processRing(ring));
  }

  return [totalLng / count, totalLat / count];
};

// Scale coordinates around a center point
const scaleCoordinates = (coords, center, scale) => {
  const [centerLng, centerLat] = center;

  const scalePoint = (point) => {
    const [lng, lat] = point;
    const scaledLng = centerLng + (lng - centerLng) * scale;
    const scaledLat = centerLat + (lat - centerLat) * scale;
    return [scaledLng, scaledLat];
  };

  const scaleRing = (ring) => ring.map(scalePoint);

  if (coords[0] instanceof Array) {
    return coords.map(ring => scaleRing(ring));
  }

  return coords;
};

// Get ACT centroid
const actCentroid = calculateCentroid(actFeature.geometry.coordinates);
console.log(`   ACT centroid: [${actCentroid[0].toFixed(4)}, ${actCentroid[1].toFixed(4)}]`);

// Scale ACT geometry
console.log(`\n🔧 Scaling ACT by ${SCALE_FACTOR}x...`);
actFeature.geometry.coordinates = scaleCoordinates(
  actFeature.geometry.coordinates,
  actCentroid,
  SCALE_FACTOR
);
console.log('   ✓ ACT scaled (now 2x larger)');

// Find NSW feature and update ACT hole
const nswFeature = data.features.find(f => f.properties.STATE_NAME === 'New South Wales');
if (nswFeature && nswFeature.geometry.type === 'MultiPolygon') {
  console.log('\n🔧 Updating NSW ACT hole...');

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

        if (dist < 1.0) { // Increased threshold since ACT is larger
          console.log(`   Found ACT hole at polygon ${polyIndex}, ring ${ringIndex}`);
          // Scale the hole to match
          polygon[ringIndex] = scaleCoordinates([ring], actCentroid, SCALE_FACTOR)[0];
          foundHole = true;
          break;
        }
      }
    }
  });

  if (foundHole) {
    console.log('   ✓ NSW ACT hole scaled (now 2x larger)');
  } else {
    console.log('   ℹ No ACT hole found in NSW');
  }
}

// Save modified GeoJSON
console.log('\n💾 Saving doubled GeoJSON...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

console.log('\n✅ ACT doubling complete!');
console.log(`\n📁 Files:`);
console.log(`   Backup: ${backupFile}`);
console.log(`   Modified: ${outputFile}`);
console.log(`\n💡 ACT is now 2x larger (both fill area and clickable region).`);
