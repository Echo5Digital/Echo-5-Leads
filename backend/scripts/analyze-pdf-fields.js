/**
 * Analyze PDF fields to help map form data to the government PDF template
 * Run with: node scripts/analyze-pdf-fields.js
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzePDF() {
  const templatePath = path.join(__dirname, '../templates/OA 2024 Parent Application.pdf');
  
  console.log('Loading PDF template:', templatePath);
  
  if (!fs.existsSync(templatePath)) {
    console.error('PDF template not found!');
    return;
  }
  
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  
  console.log('\n=== PDF Analysis ===\n');
  console.log('Total Pages:', pdfDoc.getPageCount());
  
  // Get page dimensions
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    console.log(`Page ${index + 1}: ${width} x ${height}`);
  });
  
  // Try to get form fields
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    if (fields.length > 0) {
      console.log('\n=== Form Fields Found ===\n');
      fields.forEach((field, index) => {
        const name = field.getName();
        const type = field.constructor.name;
        console.log(`${index + 1}. "${name}" (${type})`);
      });
      console.log(`\nTotal fillable fields: ${fields.length}`);
    } else {
      console.log('\nNo fillable form fields found in this PDF.');
      console.log('Will use text overlay method to fill the PDF.');
    }
  } catch (error) {
    console.log('\nNo form fields in this PDF. Will use text overlay method.');
  }
  
  console.log('\n=== Analysis Complete ===\n');
}

analyzePDF().catch(console.error);
