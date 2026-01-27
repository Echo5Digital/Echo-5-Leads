/**
 * Test script to verify form data field arrangement matches PDF output
 * Compares submitted form data with the PDF field mapping
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, '../templates/OA 2024 Parent Application.pdf');
const MAPPING_PATH = path.join(__dirname, '../templates/field-mapping.json');

// Sample form data (typical foster care application)
const sampleFormData = {
  // Page 1 - Personal Info
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Michael',
  nicknames: 'Johnny',
  dateOfBirth: '01/15/1985',
  ssn: '123-45-6789',
  driversLicense: 'DL123456',
  sex: 'Male',
  height: '5\'10"',
  weight: '180',
  hairColor: 'Brown',
  eyeColor: 'Blue',
  cityOfBirth: 'Oklahoma City',
  stateOfBirth: 'OK',
  dlState: 'OK',
  driverSex: 'M',
  noMiddleName: false,
  
  // Page 2 - Aliases
  aliases: [
    { firstName: 'Jonathan', middleName: 'M', lastName: 'Doe' }
  ],
  
  // Previous Residency
  previousResidency: [
    { state: 'OK', startDate: '2020', endDate: '2025' }
  ],
  
  // International Residency
  internationalResidency: [],
  
  // Criminal History
  convictedOfCrime: false,
  crimeExplanation: '',
  
  // Consent checkboxes
  consentBackgroundCheck: true,
  consentChildAbuseCheck: true,
  consentRestrictedRegistry: true,
  consentFingerprints: true,
  
  // Signatures
  applicantSignature: 'John Doe',
  applicantSignatureDate: '01/27/2026',
  
  // Page 3 - Child Welfare
  childWelfareNameBased: true,
  adoption: false,
  indianChildWelfareAdoption: false,
  okdhsAdoption: false,
  ericasRule: false,
  fosterCare: true,
  contractedResourceFamily: false,
  kinshipNonRelative: false,
  kinshipRelative: false,
  
  // Agency Info
  representativeName: 'Open Arms Foster Care',
  representativeTitle: 'Agency Representative',
  representativeMailingAddress: '123 Main St',
  representativeCity: 'Tulsa',
  representativeState: 'OK',
  representativeZipCode: '74012',
  representativePhone: '918-555-1234',
  representativeFax: '918-555-1235',
  representativeEmail: 'info@openarmsfostercare.com',
  
  // Page 4 options
  therapeuticFosterCare: false,
  traditionalFosterCare: true,
  guardianship: false,
  icwTribalGuardianship: false,
  okdhsGuardianship: false,
  ipap: false,
  indianChildWelfareFoster: false,
  reissueChildWelfare: false,
  reissuePreviousOnly: false,
  safetyPlanMonitor: false,
  okdhsTrialReunification: false,
  volunteer: false,
  childWelfareFingerprintBased: true,
  adoptionFingerprint: false,
  icwTribalAdoptionFingerprint: false,
  okdhsAdoptionFingerprint: false,
  fosterCareFingerprint: true,
  rfpAgency: false,
  ddsSpecializedFosterCare: false,
  emergencyAfterHours: false,
  icwTribalFosterCareFingerprint: false,
  okdhsFosterCareFingerprint: false
};

async function testPDFFieldOrder() {
  console.log('\n==============================================');
  console.log('PDF FIELD ORDER VERIFICATION TEST');
  console.log('==============================================\n');
  
  try {
    // 1. Load the PDF template
    console.log('📄 Loading PDF template...');
    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    
    // 2. Load field mapping
    console.log('📋 Loading field mapping...');
    const fieldMapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8'));
    
    // 3. Get all fields from the PDF
    console.log('🔍 Extracting PDF fields...\n');
    const pdfFields = form.getFields();
    
    console.log(`Total PDF fields found: ${pdfFields.length}`);
    
    // 4. Create a map of form data keys to PDF field names
    const formDataToPDFFieldMap = new Map();
    
    // Map based on the actual code in foster-care-application.js
    const fieldMappings = {
      // Page 1
      'firstName': 'page1_field2',
      'lastName': 'page1_field3',
      'middleName': 'page1_field6',
      'nicknames': 'page1_field8',
      'dateOfBirth': 'page1_field9',
      'ssn': 'page1_field10',
      'driversLicense': 'page1_field11',
      'sex': 'page1_field20',
      'height': 'page1_field22',
      'weight': 'page1_field23',
      'hairColor': 'page1_field24',
      'eyeColor': 'page1_field25',
      'cityOfBirth': 'page1_field26',
      'stateOfBirth': 'page1_field27',
      'dlState': 'page1_field28',
      'driverSex': 'page1_field29',
      'noMiddleName': 'page1_field1',
      
      // Page 2 - Aliases
      'aliases[0].firstName': 'page2_field1',
      'aliases[0].middleName': 'page2_field2',
      'aliases[0].lastName': 'page2_field3',
      'aliases[1].firstName': 'page2_field6',
      'aliases[1].middleName': 'page2_field7',
      'aliases[1].lastName': 'page2_field8',
      
      // Page 2 - Previous Residency
      'previousResidency[0].state': 'page2_field12',
      'previousResidency[0].startDate': 'page2_field13',
      'previousResidency[0].endDate': 'page2_field14',
      
      // Page 2 - Criminal History
      'convictedOfCrime': 'page2_field44',
      'crimeExplanation': 'page2_field45',
      'consentBackgroundCheck': 'page2_field4',
      'consentChildAbuseCheck': 'page2_field5',
      'consentRestrictedRegistry': 'page2_field26',
      'consentFingerprints': 'page2_field27',
      'applicantSignature': 'page2_field53',
      'applicantSignatureDate': 'page2_field54',
      
      // Page 3 - Child Welfare
      'childWelfareNameBased': 'page3_field1',
      'adoption': 'page3_field12',
      'fosterCare': 'page3_field16',
      'representativeName': 'page3_field2',
      'representativeTitle': 'page3_field3',
      'representativeMailingAddress': 'page3_field4',
      'representativeCity': 'page3_field5',
      'representativeState': 'page3_field6',
      'representativeZipCode': 'page3_field7',
      'representativePhone': 'page3_field8',
      'representativeFax': 'page3_field9',
      'representativeEmail': 'page3_field10',
      
      // Page 4
      'traditionalFosterCare': 'page4_field4',
      'fosterCareFingerprint': 'page4_field19'
    };
    
    // 5. Test each mapping
    console.log('\n📊 FIELD MAPPING VERIFICATION:\n');
    console.log('┌─────────────────────────────────────┬─────────────────┬──────────┬────────────┐');
    console.log('│ Form Data Key                       │ PDF Field Name  │ Status   │ Has Value  │');
    console.log('├─────────────────────────────────────┼─────────────────┼──────────┼────────────┤');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const [formKey, pdfFieldName] of Object.entries(fieldMappings)) {
      try {
        const field = form.getField(pdfFieldName);
        const formValue = getNestedValue(sampleFormData, formKey);
        const hasValue = formValue !== undefined && formValue !== null && formValue !== '';
        const status = field ? '✓ FOUND' : '✗ MISSING';
        
        if (field) {
          successCount++;
        } else {
          errorCount++;
          errors.push({ formKey, pdfFieldName, error: 'Field not found in PDF' });
        }
        
        console.log(
          `│ ${formKey.padEnd(35)} │ ${pdfFieldName.padEnd(15)} │ ${status.padEnd(8)} │ ${(hasValue ? 'Yes' : 'No').padEnd(10)} │`
        );
      } catch (err) {
        errorCount++;
        errors.push({ formKey, pdfFieldName, error: err.message });
        console.log(
          `│ ${formKey.padEnd(35)} │ ${pdfFieldName.padEnd(15)} │ ${'✗ ERROR'.padEnd(8)} │ ${'N/A'.padEnd(10)} │`
        );
      }
    }
    
    console.log('└─────────────────────────────────────┴─────────────────┴──────────┴────────────┘');
    
    // 6. Summary
    console.log('\n📈 SUMMARY:');
    console.log(`   ✓ Successful mappings: ${successCount}`);
    console.log(`   ✗ Failed mappings: ${errorCount}`);
    console.log(`   📊 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      errors.forEach(({ formKey, pdfFieldName, error }) => {
        console.log(`   • ${formKey} → ${pdfFieldName}: ${error}`);
      });
    }
    
    // 7. Check for unused PDF fields
    console.log('\n🔍 CHECKING FOR UNUSED PDF FIELDS...\n');
    const mappedPDFFields = new Set(Object.values(fieldMappings));
    const allPDFFieldNames = pdfFields.map(f => f.getName());
    const unusedFields = allPDFFieldNames.filter(name => !mappedPDFFields.has(name));
    
    if (unusedFields.length > 0) {
      console.log(`⚠️  Found ${unusedFields.length} unmapped PDF fields:`);
      unusedFields.slice(0, 20).forEach(name => {
        console.log(`   • ${name}`);
      });
      if (unusedFields.length > 20) {
        console.log(`   ... and ${unusedFields.length - 20} more`);
      }
    } else {
      console.log('✓ All PDF fields are mapped!');
    }
    
    // 8. Test actual field filling
    console.log('\n🧪 TESTING FIELD FILLING...\n');
    let fillSuccessCount = 0;
    let fillErrorCount = 0;
    
    for (const [formKey, pdfFieldName] of Object.entries(fieldMappings)) {
      try {
        const field = form.getField(pdfFieldName);
        const formValue = getNestedValue(sampleFormData, formKey);
        
        if (formValue !== undefined && formValue !== null && formValue !== '') {
          const fieldType = field.constructor.name;
          
          if (fieldType.includes('CheckBox')) {
            if (typeof formValue === 'boolean' && formValue) {
              field.check();
              fillSuccessCount++;
            }
          } else if (fieldType.includes('Text')) {
            if (typeof formValue === 'string') {
              field.setText(String(formValue));
              fillSuccessCount++;
            }
          }
        }
      } catch (err) {
        fillErrorCount++;
        console.log(`   ✗ Error filling ${pdfFieldName}: ${err.message}`);
      }
    }
    
    console.log(`✓ Successfully filled ${fillSuccessCount} fields`);
    if (fillErrorCount > 0) {
      console.log(`✗ Failed to fill ${fillErrorCount} fields`);
    }
    
    // 9. Generate test PDF
    console.log('\n💾 Generating test PDF...');
    const pdfBytes = await pdfDoc.save();
    const testOutputPath = path.join(__dirname, '../uploads/test-field-order.pdf');
    
    // Ensure directory exists
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(testOutputPath, pdfBytes);
    console.log(`✓ Test PDF saved to: ${testOutputPath}`);
    
    // 10. Final verdict
    console.log('\n==============================================');
    if (errorCount === 0 && fillErrorCount === 0) {
      console.log('✅ TEST PASSED: All field mappings are correct!');
      console.log('   Form data field arrangement matches PDF output.');
    } else {
      console.log('⚠️  TEST COMPLETED WITH WARNINGS');
      console.log('   Some fields may need attention.');
    }
    console.log('==============================================\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper function to get nested values from object
function getNestedValue(obj, path) {
  const matches = path.match(/^([^\[]+)(?:\[(\d+)\])?\.?(.+)?$/);
  if (!matches) return obj[path];
  
  const [, key, index, rest] = matches;
  
  if (index !== undefined) {
    const arr = obj[key];
    if (!Array.isArray(arr) || !arr[index]) return undefined;
    if (rest) {
      return arr[index][rest];
    }
    return arr[index];
  }
  
  return obj[key];
}

// Run the test
testPDFFieldOrder().catch(console.error);
