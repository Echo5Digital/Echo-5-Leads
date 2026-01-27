/**
 * Debug script to identify PDF field positions
 * Fills each field with its own name so you can see where it appears
 * Run: node scripts/debug-pdf-fields.js
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugPDF() {
  const templatePath = path.join(__dirname, '../templates/OA 2024 Parent Application.pdf');
  const outputPath = path.join(__dirname, '../templates/DEBUG-fields-labeled.pdf');
  
  console.log('Loading PDF template:', templatePath);
  
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  console.log(`\nFilling ${fields.length} fields with their names...\n`);
  
  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name;
    
    try {
      if (type === 'PDFTextField') {
        const textField = form.getTextField(name);
        textField.setText(name);
      } else if (type === 'PDFCheckBox') {
        // Check some checkboxes to see them
        const checkbox = form.getCheckBox(name);
        if (name.includes('field1') || name.includes('field5')) {
          checkbox.check();
        }
      }
    } catch (err) {
      console.log(`Skipped ${name}: ${err.message}`);
    }
  }
  
  // Save without flattening (keep form editable)
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  
  console.log(`\n✅ Debug PDF saved to: ${outputPath}`);
  console.log('Open this PDF to see which field name appears where!\n');
}

debugPDF().catch(console.error);
