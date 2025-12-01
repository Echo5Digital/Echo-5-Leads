#!/usr/bin/env node

/**
 * Convert XLSX to CSV with proper field mapping for Open Arms
 * Usage: node convert-xlsx-to-csv.js <input.xlsx> [output.csv]
 */

import fs from 'fs';
import path from 'path';

// Try to import xlsx - if not available, give helpful instructions
let XLSX;
try {
  XLSX = (await import('xlsx')).default;
} catch (e) {
  console.error('❌ xlsx package not installed');
  console.error('\nTo fix this, run from the backend folder:');
  console.error('  npm install xlsx');
  console.error('\nThen try again:');
  console.error('  node convert-xlsx-to-csv.js <input.xlsx>');
  process.exit(1);
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('📋 XLSX to CSV Converter for Meta Leads Import');
  console.log('Usage: node convert-xlsx-to-csv.js <input.xlsx> [output.csv]');
  console.log('\nExample:');
  console.log('  node convert-xlsx-to-csv.js open-arms-leads-2025-10-29.xlsx');
  console.log('\nField Mapping:');
  console.log('  full_name → firstName & lastName');
  console.log('  phone → phoneE164');
  console.log('  what_service... → campaignName (Stage)');
  console.log('  do_you_currently... → stage (Qualified/Not Qualified/Prospect)');
  console.log('  city → city');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || inputFile.replace(/\.xlsx?$/i, '.csv');

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ File not found: ${inputFile}`);
  process.exit(1);
}

try {
  console.log(`📖 Reading: ${inputFile}`);
  
  // Read the workbook
  const workbook = XLSX.readFile(inputFile);
  const sheetName = workbook.SheetNames[0];
  
  if (!sheetName) {
    console.error('❌ No sheets found in workbook');
    process.exit(1);
  }
  
  console.log(`📄 Sheet: ${sheetName}`);
  
  // Get the worksheet
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON first to handle complex headers
  const rows = XLSX.utils.sheet_to_json(worksheet);
  
  if (rows.length === 0) {
    console.error('❌ No data rows found in worksheet');
    process.exit(1);
  }
  
  // Get original headers from first row
  const originalHeaders = Object.keys(rows[0]);
  console.log(`📊 Original columns: ${originalHeaders.join(', ')}`);
  
  // Create CSV with headers and rows
  let csv = originalHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
  
  // Add rows
  for (const row of rows) {
    const values = originalHeaders.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escape quotes and wrap in quotes if contains comma or quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    });
    csv += values.join(',') + '\n';
  }
  
  // Write CSV file
  fs.writeFileSync(outputFile, csv, 'utf-8');
  
  // Get file sizes
  const inputSize = (fs.statSync(inputFile).size / 1024).toFixed(2);
  const outputSize = (fs.statSync(outputFile).size / 1024).toFixed(2);
  
  console.log(`\n✅ Conversion successful!`);
  console.log(`\n📊 Details:`);
  console.log(`  Input:   ${inputFile} (${inputSize} KB)`);
  console.log(`  Output:  ${outputFile} (${outputSize} KB)`);
  console.log(`  Rows:    ${rows.length}`);
  console.log(`  Columns: ${originalHeaders.length}`);
  
  console.log(`\n✨ Ready to import!`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open the Leads page in your app`);
  console.log(`  2. Click "📥 Import Facebook Leads" button`);
  console.log(`  3. Select the file: ${outputFile}`);
  console.log(`  4. Click "Import"`);
  
} catch (err) {
  console.error('❌ Conversion failed:');
  console.error(err.message);
  process.exit(1);
}
