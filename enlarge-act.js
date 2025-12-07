const fs = require('fs');
const path = require('path');

// File paths
const inputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const outputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const backupFile = path.join(__dirname, 'public', 'australia-states-pre-act-enlargement.backup.geojson');

const SCALE_FACTOR = 2.0; // Make ACT 2x larger

console.log('🗺️  Enlarging Australian Capital Territory...\n');

// Read the GeoJSON file
console.log('📖 Reading GeoJSON file...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Create backup
console.log('💾 Creating backup...');
fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
console.log(`   Backup saved to: ${backupFile}\n`);

// Find ACT feature
const actFeature = data.features.find(f => f.properties.STATE_NAME === 'Australian Capital Territory');
if (!actFeature) {
  console.error('❌ ACT feature not found!');
  process.exit(1);
}

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

  if (coords[0][0] instanceof Array) {
    // Polygon
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

  if (coords[0][0] instanceof Array) {
    // Polygon
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
console.log('   ✓ ACT scaled');

// Find NSW feature and check if it has ACT as a hole
const nswFeature = data.features.find(f => f.properties.STATE_NAME === 'New South Wales');
if (nswFeature) {
  console.log('\n🔧 Checking NSW for ACT hole...');

  // NSW is a MultiPolygon, check each polygon for rings (holes)
  if (nswFeature.geometry.type === 'MultiPolygon') {
    let foundHole = false;

    nswFeature.geometry.coordinates.forEach((polygon, polyIndex) => {
      // Check if this polygon has multiple rings (outer + holes)
      if (polygon.length > 1) {
        console.log(`   Found polygon with ${polygon.length} rings (may include ACT hole)`);

        // Scale all inner rings (holes) - ACT might be one of them
        for (let ringIndex = 1; ringIndex < polygon.length; ringIndex++) {
          const ring = polygon[ringIndex];

          // Calculate ring centroid to check if it's ACT
          const ringCentroid = calculateCentroid([ring]);
          const distToACT = Math.sqrt(
            Math.pow(ringCentroid[0] - actCentroid[0], 2) +
            Math.pow(ringCentroid[1] - actCentroid[1], 2)
          );

          // If this ring's centroid is very close to ACT's centroid, scale it
          if (distToACT < 0.5) { // Within 0.5 degrees
            console.log(`   Scaling NSW hole ring ${ringIndex} (likely ACT)`);
            polygon[ringIndex] = scaleCoordinates([ring], actCentroid, SCALE_FACTOR)[0];
            foundHole = true;
          }
        }
      }
    });

    if (foundHole) {
      console.log('   ✓ NSW ACT hole scaled');
    } else {
      console.log('   ℹ No ACT hole found in NSW (ACT may be separate)');
    }
  }
}

// Save modified GeoJSON
console.log('\n💾 Saving modified GeoJSON...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

console.log('\n✅ ACT enlargement complete!');
console.log(`\n📁 Files:`);
console.log(`   Backup: ${backupFile}`);
console.log(`   Modified: ${outputFile}`);
console.log(`\n💡 ACT is now ${SCALE_FACTOR}x larger on the map.`);
