// Test script to verify localStorage persistence
// Run this in browser console to check saved configurations

console.log('=== Checking Saved Configurations ===\n');

// Check dashboard layout
const dashboardLayout = localStorage.getItem('dashboard-layout');
if (dashboardLayout) {
  const layout = JSON.parse(dashboardLayout);
  console.log('✅ Dashboard Layout Saved:', layout.length, 'cards');
  console.log('   Cards:', layout.map(c => c.title || c.type).join(', '));
} else {
  console.log('❌ No dashboard layout saved');
}

// Check Test Card config
const testCardConfig = localStorage.getItem('test-card-config');
if (testCardConfig) {
  const config = JSON.parse(testCardConfig);
  console.log('✅ Test Card Config:', config.schema + '.' + config.table);
} else {
  console.log('❌ No Test Card config saved');
}

// Check Search Geography Card config
const searchGeographyConfig = localStorage.getItem('search-geography-card-config');
if (searchGeographyConfig) {
  const config = JSON.parse(searchGeographyConfig);
  console.log('✅ Search Geography Config:', config.schema + '.' + config.table);
} else {
  console.log('❌ No Search Geography config saved');
}

// Check ABS LGA Map config (now Boundary Map)
const absMapConfig = localStorage.getItem('abs-lga-map-config');
if (absMapConfig) {
  const config = JSON.parse(absMapConfig);
  console.log('✅ Boundary Map Config:', config.schema + '.' + config.table);
  console.log('   Geometry Column:', config.geometryColumn);
  console.log('   Filter Integration:', config.filterIntegration.enabled ? 'Enabled' : 'Disabled');
} else {
  console.log('❌ No Boundary Map config saved');
}

// Check Key Metrics config
const keyMetricsConfig = localStorage.getItem('key-metrics-config');
if (keyMetricsConfig) {
  const config = JSON.parse(keyMetricsConfig);
  console.log('✅ Key Metrics Config:', config.schema + '.' + config.table);
  console.log('   Area Column:', config.areaColumn);
  console.log('   Filter Integration:', config.filterIntegration.enabled ? 'Enabled' : 'Disabled');
} else {
  console.log('❌ No Key Metrics config saved');
}

console.log('\n=== Summary ===');
console.log('Total localStorage items:', Object.keys(localStorage).length);
console.log('Config items found:', Object.keys(localStorage).filter(k => k.includes('config') || k.includes('layout')).length);

// Function to clear all configs (use with caution)
window.clearAllConfigs = function() {
  if (confirm('Are you sure you want to clear all saved configurations?')) {
    const keys = Object.keys(localStorage).filter(k => k.includes('config') || k.includes('layout'));
    keys.forEach(k => localStorage.removeItem(k));
    console.log('Cleared', keys.length, 'configuration items');
    window.location.reload();
  }
};

console.log('\nTip: Run clearAllConfigs() to reset all saved configurations');