const fs = require('fs');
const path = require('path');
const simplify = require('@turf/simplify').default;

// File paths
const inputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const outputFile = path.join(__dirname, 'public', 'australia-states.geojson');
const backupFile = path.join(__dirname, 'public', 'australia-states.backup.geojson');

// Tolerance parameter (in degrees) - higher values = more simplification
// 0.01 degrees ≈ 1km at the equator
// Adjust this value to control the level of simplification
const TOLERANCE = 0.15; // Very aggressive simplification for cleaner borders
const ACT_TOLERANCE = 0.01; // Keep ACT detailed

console.log('🗺️  Simplifying Australia State Boundaries...\n');

// Read the original GeoJSON file
console.log('📖 Reading original GeoJSON file...');
const originalData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const originalSize = fs.statSync(inputFile).size;

console.log(`   Original file size: ${(originalSize / 1024).toFixed(2)} KB`);
console.log(`   Features: ${originalData.features.length}`);
console.log(`   Tolerance: ${TOLERANCE} degrees (${ACT_TOLERANCE} for ACT)\n`);

// Create backup
console.log('💾 Creating backup...');
fs.writeFileSync(backupFile, JSON.stringify(originalData, null, 2));
console.log(`   Backup saved to: ${backupFile}\n`);

// Simplify each feature
console.log('🔧 Simplifying polygons...');
const simplifiedFeatures = originalData.features.map((feature, index) => {
  const stateName = feature.properties.STATE_NAME;

  // Count original coordinates
  let originalCoords = 0;
  if (feature.geometry.type === 'MultiPolygon') {
    feature.geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        originalCoords += ring.length;
      });
    });
  } else if (feature.geometry.type === 'Polygon') {
    feature.geometry.coordinates.forEach(ring => {
      originalCoords += ring.length;
    });
  }

  // Determine tolerance based on state (don't over-simplify ACT)
  const isACT = stateName === 'Australian Capital Territory';
  const tolerance = isACT ? ACT_TOLERANCE : TOLERANCE;

  // Simplify the feature
  const simplified = simplify(feature, {
    tolerance: tolerance,
    highQuality: true,
    mutate: false
  });

  // Count simplified coordinates
  let simplifiedCoords = 0;
  if (simplified.geometry.type === 'MultiPolygon') {
    simplified.geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        simplifiedCoords += ring.length;
      });
    });
  } else if (simplified.geometry.type === 'Polygon') {
    simplified.geometry.coordinates.forEach(ring => {
      simplifiedCoords += ring.length;
    });
  }

  const reduction = ((1 - simplifiedCoords / originalCoords) * 100).toFixed(1);
  const toleranceNote = isACT ? ' [preserved detail]' : '';

  console.log(`   ${stateName}: ${originalCoords} → ${simplifiedCoords} points (${reduction}% reduction)${toleranceNote}`);

  return simplified;
});

// Create new GeoJSON with simplified features
const simplifiedData = {
  type: 'FeatureCollection',
  features: simplifiedFeatures
};

// Write simplified GeoJSON to file
console.log('\n💾 Saving simplified GeoJSON...');
fs.writeFileSync(outputFile, JSON.stringify(simplifiedData, null, 2));

const finalSize = fs.statSync(outputFile).size;
const totalReduction = ((1 - finalSize / originalSize) * 100).toFixed(1);

console.log(`   Simplified file size: ${(finalSize / 1024).toFixed(2)} KB`);
console.log(`   Total size reduction: ${totalReduction}%`);

console.log('\n✅ Simplification complete!');
console.log(`\n📁 Files:`);
console.log(`   Original backup: ${backupFile}`);
console.log(`   Simplified file: ${outputFile}`);
console.log(`\n💡 Tip: If the borders look too simplified, reduce the TOLERANCE value in this script and run again.`);
console.log(`   If borders are still too detailed, increase the TOLERANCE value.`);
