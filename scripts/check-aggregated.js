const { executeQuery } = require('../src/lib/db-pool');

async function checkAggregated() {
  try {
    // Check total records
    const totalResult = await executeQuery(`
      SELECT COUNT(*) as total_records
      FROM housing_dashboard.da_aggregated
    `, [], 'readonly');
    console.log('\nTotal aggregated records:', totalResult.rows[0].total_records);
    
    // Check LGA names containing "wooll"
    const woolResult = await executeQuery(`
      SELECT DISTINCT lga_name
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%wooll%'
      ORDER BY lga_name
    `, [], 'readonly');
    console.log('\nLGA names with "wooll":', woolResult.rows.map(r => r.lga_name));
    
    // Check first 10 LGA names
    const lgaResult = await executeQuery(`
      SELECT DISTINCT lga_name
      FROM housing_dashboard.da_aggregated
      ORDER BY lga_name
      LIMIT 10
    `, [], 'readonly');
    console.log('\nFirst 10 LGA names in da_aggregated:');
    lgaResult.rows.forEach(row => console.log(`  - ${row.lga_name}`));
    
    // Check aggregation types
    const typeResult = await executeQuery(`
      SELECT aggregation_type, COUNT(*) as count
      FROM housing_dashboard.da_aggregated
      GROUP BY aggregation_type
      ORDER BY aggregation_type
    `, [], 'readonly');
    console.log('\nRecords by aggregation type:');
    typeResult.rows.forEach(row => console.log(`  ${row.aggregation_type}: ${row.count}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkAggregated();
