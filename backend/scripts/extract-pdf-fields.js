/**
 * Extract all field names from the PDF template
 * This will show us the ACTUAL field names so we can fix the mappings
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, '../templates/OA 2024 Parent Application.pdf');

async function extractPDFFields() {
  try {
    console.log('Reading PDF template...');
    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`\n========================================`);
    console.log(`Found ${fields.length} total fields in PDF`);
    console.log(`========================================\n`);
    
    const fieldsByPage = {};
    
    fields.forEach((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      
      // Try to determine which page this field is on
      let pageNum = 'Unknown';
      try {
        const widgets = field.acroField.getWidgets();
        if (widgets.length > 0) {
          const ref = widgets[0].P();
          const pages = pdfDoc.getPages();
          for (let i = 0; i < pages.length; i++) {
            if (pages[i].ref === ref) {
              pageNum = i + 1;
              break;
            }
          }
        }
      } catch (e) {
        // Ignore error, use Unknown
      }
      
      if (!fieldsByPage[pageNum]) {
        fieldsByPage[pageNum] = [];
      }
      
      fieldsByPage[pageNum].push({
        index: index + 1,
        name: fieldName,
        type: fieldType
      });
    });
    
    // Print fields organized by page
    Object.keys(fieldsByPage).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return parseInt(a) - parseInt(b);
    }).forEach(pageNum => {
      console.log(`\n📄 PAGE ${pageNum}:`);
      console.log('─'.repeat(80));
      
      fieldsByPage[pageNum].forEach(field => {
        console.log(`${field.index}. ${field.name.padEnd(40)} [${field.type}]`);
      });
    });
    
    // Save to JSON file for reference
    const outputPath = path.join(__dirname, '../templates/actual-field-names.json');
    fs.writeFileSync(outputPath, JSON.stringify(fieldsByPage, null, 2));
    console.log(`\n✅ Field names saved to: actual-field-names.json`);
    
  } catch (error) {
    console.error('❌ Error extracting PDF fields:', error);
  }
}

extractPDFFields();
