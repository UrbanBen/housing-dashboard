/**
 * Examine the rent Excel file structure
 */

const XLSX = require('xlsx');

const filePath = '/Users/ben/Desktop/rent_tables_december_2025_quarter.xlsx';

console.log('📊 Reading Excel file...\n');

const workbook = XLSX.readFile(filePath);

console.log('📋 Sheet Names:');
workbook.SheetNames.forEach((name, index) => {
  console.log(`  [${index + 1}] ${name}`);
});

console.log('\n' + '='.repeat(80) + '\n');

// Examine each sheet
workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n📄 Sheet: "${sheetName}"`);
  console.log('─'.repeat(80));

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Show first 10 rows
  console.log('\nFirst 10 rows:');
  data.slice(0, 10).forEach((row, index) => {
    console.log(`Row ${index + 1}:`, row);
  });

  // Try to detect header row
  console.log('\nDetecting structure...');
  const possibleHeaders = data.slice(0, 5);
  possibleHeaders.forEach((row, index) => {
    if (row.some(cell => typeof cell === 'string' && cell.length > 0)) {
      console.log(`  Possible header at row ${index + 1}:`, row.filter(c => c));
    }
  });

  console.log(`\nTotal rows: ${data.length}`);
  console.log('─'.repeat(80));
});

console.log('\n✅ Examination complete!');
