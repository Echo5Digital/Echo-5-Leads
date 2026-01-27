/**
 * Detailed PDF field analysis with position info
 * Run: node scripts/analyze-pdf-detailed.js
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzePDFDetailed() {
  const templatePath = path.join(__dirname, '../templates/OA 2024 Parent Application.pdf');
  
  console.log('Loading PDF template:', templatePath);
  
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  const pages = pdfDoc.getPages();
  
  console.log(`\nTotal Pages: ${pages.length}`);
  console.log(`Total Fields: ${fields.length}\n`);
  
  // Group fields by page prefix
  const fieldsByPage = {};
  
  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name.replace('PDF', '');
    
    // Extract page number from field name
    let pageNum = 'Other';
    const pageMatch = name.match(/page(\d+)/i);
    if (pageMatch) {
      pageNum = `Page ${pageMatch[1]}`;
    } else if (name.includes('Signature') || name.includes('Date') || name.includes('Text')) {
      pageNum = 'Special';
    }
    
    if (!fieldsByPage[pageNum]) {
      fieldsByPage[pageNum] = [];
    }
    
    fieldsByPage[pageNum].push({
      name,
      type,
      pageNum
    });
  }
  
  // Print organized output
  console.log('='.repeat(80));
  console.log('FIELD MAPPING BY PAGE');
  console.log('='.repeat(80));
  
  const sortedPages = Object.keys(fieldsByPage).sort((a, b) => {
    const numA = parseInt(a.replace('Page ', '')) || 999;
    const numB = parseInt(b.replace('Page ', '')) || 999;
    return numA - numB;
  });
  
  for (const page of sortedPages) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`${page} (${fieldsByPage[page].length} fields)`);
    console.log('='.repeat(40));
    
    // Sort fields by number
    const sortedFields = fieldsByPage[page].sort((a, b) => {
      const numA = parseInt(a.name.match(/_field(\d+)/)?.[1]) || 0;
      const numB = parseInt(b.name.match(/_field(\d+)/)?.[1]) || 0;
      return numA - numB;
    });
    
    const textFields = sortedFields.filter(f => f.type === 'TextField');
    const checkboxes = sortedFields.filter(f => f.type === 'CheckBox');
    const signatures = sortedFields.filter(f => f.type === 'Signature');
    
    if (textFields.length > 0) {
      console.log('\nText Fields:');
      textFields.forEach(f => console.log(`  - ${f.name}`));
    }
    
    if (checkboxes.length > 0) {
      console.log('\nCheckboxes:');
      checkboxes.forEach(f => console.log(`  - ${f.name}`));
    }
    
    if (signatures.length > 0) {
      console.log('\nSignatures:');
      signatures.forEach(f => console.log(`  - ${f.name}`));
    }
  }
  
  // Also save to JSON for reference
  const outputPath = path.join(__dirname, '../templates/field-mapping.json');
  fs.writeFileSync(outputPath, JSON.stringify(fieldsByPage, null, 2));
  console.log(`\n\n✅ Field mapping saved to: ${outputPath}`);
}

analyzePDFDetailed().catch(console.error);
