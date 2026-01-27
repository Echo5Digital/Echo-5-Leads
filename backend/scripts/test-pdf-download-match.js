/**
 * Test script to verify downloaded PDF contains exact same data as submitted form
 * This simulates the full flow: submit form → generate PDF → read PDF → compare values
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, '../templates/OA 2024 Parent Application.pdf');

// Sample form data - exactly what a user would submit
const submittedFormData = {
  firstName: 'Jane',
  lastName: 'Smith',
  middleName: 'Elizabeth',
  nicknames: 'Janie',
  dateOfBirth: '05/20/1990',
  ssn: '987-65-4321',
  driversLicense: 'OK-DL98765',
  sex: 'Female',
  height: '5\'6"',
  weight: '145',
  hairColor: 'Blonde',
  eyeColor: 'Green',
  cityOfBirth: 'Tulsa',
  stateOfBirth: 'Oklahoma',
  dlState: 'OK',
  driverSex: 'F',
  noMiddleName: false,
  
  aliases: [
    { firstName: 'Jane', middleName: 'E', lastName: 'Johnson' }
  ],
  
  previousResidency: [
    { state: 'Texas', startDate: '01/2018', endDate: '12/2020' },
    { state: 'Oklahoma', startDate: '01/2021', endDate: 'Present' }
  ],
  
  internationalResidency: [],
  
  convictedOfCrime: false,
  crimeExplanation: '',
  consentBackgroundCheck: true,
  consentChildAbuseCheck: true,
  consentRestrictedRegistry: true,
  consentFingerprints: true,
  
  applicantSignature: 'Jane Elizabeth Smith',
  applicantSignatureDate: '01/27/2026',
  
  childWelfareNameBased: true,
  adoption: false,
  indianChildWelfareAdoption: false,
  okdhsAdoption: false,
  ericasRule: false,
  fosterCare: true,
  contractedResourceFamily: false,
  kinshipNonRelative: false,
  kinshipRelative: false,
  
  representativeName: 'Open Arms Foster Care Agency',
  representativeTitle: 'Licensed Child Placement Agency',
  representativeMailingAddress: '456 Oak Avenue',
  representativeCity: 'Tulsa',
  representativeState: 'Oklahoma',
  representativeZipCode: '74012',
  representativePhone: '(918) 555-0123',
  representativeFax: '(918) 555-0124',
  representativeEmail: 'intake@openarmsfostercare.com',
  
  therapeuticFosterCare: false,
  traditionalFosterCare: true,
  guardianship: false,
  childWelfareFingerprintBased: true,
  fosterCareFingerprint: true
};

// Simulate the PDF generation function from foster-care-application.js
async function generateApplicationPDF(formData) {
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  
  // Fill text field helper
  const fillTextField = (form, fieldName, value) => {
    if (!value) return;
    try {
      const field = form.getTextField(fieldName);
      field.setText(String(value));
    } catch (err) {
      // Field might not exist or be wrong type
    }
  };
  
  // Fill checkbox helper
  const fillCheckbox = (form, fieldName, value) => {
    if (!value) return;
    try {
      const field = form.getCheckBox(fieldName);
      field.check();
    } catch (err) {
      // Field might not exist or be wrong type
    }
  };
  
  // Page 1 - Personal Information
  fillTextField(form, 'page1_field2', formData.firstName);
  fillTextField(form, 'page1_field3', formData.lastName);
  fillTextField(form, 'page1_field6', formData.middleName);
  fillTextField(form, 'page1_field8', formData.nicknames);
  fillTextField(form, 'page1_field9', formData.dateOfBirth);
  fillTextField(form, 'page1_field10', formData.ssn);
  fillTextField(form, 'page1_field11', formData.driversLicense);
  fillTextField(form, 'page1_field20', formData.sex);
  fillTextField(form, 'page1_field22', formData.height);
  fillTextField(form, 'page1_field23', formData.weight);
  fillTextField(form, 'page1_field24', formData.hairColor);
  fillTextField(form, 'page1_field25', formData.eyeColor);
  fillTextField(form, 'page1_field26', formData.cityOfBirth);
  fillTextField(form, 'page1_field27', formData.stateOfBirth);
  fillTextField(form, 'page1_field28', formData.dlState);
  fillTextField(form, 'page1_field29', formData.driverSex);
  fillCheckbox(form, 'page1_field1', formData.noMiddleName);
  
  // Page 2 - Aliases
  if (formData.aliases && formData.aliases[0]) {
    fillTextField(form, 'page2_field1', formData.aliases[0].firstName);
    fillTextField(form, 'page2_field2', formData.aliases[0].middleName);
    fillTextField(form, 'page2_field3', formData.aliases[0].lastName);
  }
  
  // Previous Residency
  if (formData.previousResidency) {
    if (formData.previousResidency[0]) {
      fillTextField(form, 'page2_field12', formData.previousResidency[0].state);
      fillTextField(form, 'page2_field13', formData.previousResidency[0].startDate);
      fillTextField(form, 'page2_field14', formData.previousResidency[0].endDate);
    }
    if (formData.previousResidency[1]) {
      fillTextField(form, 'page2_field15', formData.previousResidency[1].state);
      fillTextField(form, 'page2_field16', formData.previousResidency[1].startDate);
      fillTextField(form, 'page2_field17', formData.previousResidency[1].endDate);
    }
  }
  
  // Consent checkboxes
  fillCheckbox(form, 'page2_field4', formData.consentBackgroundCheck);
  fillCheckbox(form, 'page2_field5', formData.consentChildAbuseCheck);
  fillCheckbox(form, 'page2_field26', formData.consentRestrictedRegistry);
  fillCheckbox(form, 'page2_field27', formData.consentFingerprints);
  fillCheckbox(form, 'page2_field44', formData.convictedOfCrime);
  fillTextField(form, 'page2_field45', formData.crimeExplanation);
  fillTextField(form, 'page2_field53', formData.applicantSignature);
  fillTextField(form, 'page2_field54', formData.applicantSignatureDate);
  
  // Page 3 - Child Welfare
  fillCheckbox(form, 'page3_field1', formData.childWelfareNameBased);
  fillCheckbox(form, 'page3_field12', formData.adoption);
  fillCheckbox(form, 'page3_field16', formData.fosterCare);
  fillTextField(form, 'page3_field2', formData.representativeName);
  fillTextField(form, 'page3_field3', formData.representativeTitle);
  fillTextField(form, 'page3_field4', formData.representativeMailingAddress);
  fillTextField(form, 'page3_field5', formData.representativeCity);
  fillTextField(form, 'page3_field6', formData.representativeState);
  fillTextField(form, 'page3_field7', formData.representativeZipCode);
  fillTextField(form, 'page3_field8', formData.representativePhone);
  fillTextField(form, 'page3_field9', formData.representativeFax);
  fillTextField(form, 'page3_field10', formData.representativeEmail);
  
  // Page 4
  fillCheckbox(form, 'page4_field4', formData.traditionalFosterCare);
  fillCheckbox(form, 'page4_field15', formData.childWelfareFingerprintBased);
  fillCheckbox(form, 'page4_field19', formData.fosterCareFingerprint);
  
  return await pdfDoc.save();
}

// Read values back from PDF
async function readPDFValues(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();
  const values = {};
  
  const getTextFieldValue = (fieldName) => {
    try {
      const field = form.getTextField(fieldName);
      return field.getText() || '';
    } catch (err) {
      return null;
    }
  };
  
  const getCheckboxValue = (fieldName) => {
    try {
      const field = form.getCheckBox(fieldName);
      return field.isChecked();
    } catch (err) {
      return null;
    }
  };
  
  // Read all the fields back
  values.firstName = getTextFieldValue('page1_field2');
  values.lastName = getTextFieldValue('page1_field3');
  values.middleName = getTextFieldValue('page1_field6');
  values.nicknames = getTextFieldValue('page1_field8');
  values.dateOfBirth = getTextFieldValue('page1_field9');
  values.ssn = getTextFieldValue('page1_field10');
  values.driversLicense = getTextFieldValue('page1_field11');
  values.sex = getTextFieldValue('page1_field20');
  values.height = getTextFieldValue('page1_field22');
  values.weight = getTextFieldValue('page1_field23');
  values.hairColor = getTextFieldValue('page1_field24');
  values.eyeColor = getTextFieldValue('page1_field25');
  values.cityOfBirth = getTextFieldValue('page1_field26');
  values.stateOfBirth = getTextFieldValue('page1_field27');
  values.dlState = getTextFieldValue('page1_field28');
  values.driverSex = getTextFieldValue('page1_field29');
  values.noMiddleName = getCheckboxValue('page1_field1');
  
  values.alias1FirstName = getTextFieldValue('page2_field1');
  values.alias1MiddleName = getTextFieldValue('page2_field2');
  values.alias1LastName = getTextFieldValue('page2_field3');
  
  values.prevRes1State = getTextFieldValue('page2_field12');
  values.prevRes1Start = getTextFieldValue('page2_field13');
  values.prevRes1End = getTextFieldValue('page2_field14');
  values.prevRes2State = getTextFieldValue('page2_field15');
  values.prevRes2Start = getTextFieldValue('page2_field16');
  values.prevRes2End = getTextFieldValue('page2_field17');
  
  values.consentBackgroundCheck = getCheckboxValue('page2_field4');
  values.consentChildAbuseCheck = getCheckboxValue('page2_field5');
  values.consentRestrictedRegistry = getCheckboxValue('page2_field26');
  values.consentFingerprints = getCheckboxValue('page2_field27');
  values.convictedOfCrime = getCheckboxValue('page2_field44');
  values.applicantSignature = getTextFieldValue('page2_field53');
  values.applicantSignatureDate = getTextFieldValue('page2_field54');
  
  values.childWelfareNameBased = getCheckboxValue('page3_field1');
  values.adoption = getCheckboxValue('page3_field12');
  values.fosterCare = getCheckboxValue('page3_field16');
  values.representativeName = getTextFieldValue('page3_field2');
  values.representativeTitle = getTextFieldValue('page3_field3');
  values.representativeMailingAddress = getTextFieldValue('page3_field4');
  values.representativeCity = getTextFieldValue('page3_field5');
  values.representativeState = getTextFieldValue('page3_field6');
  values.representativeZipCode = getTextFieldValue('page3_field7');
  values.representativePhone = getTextFieldValue('page3_field8');
  values.representativeFax = getTextFieldValue('page3_field9');
  values.representativeEmail = getTextFieldValue('page3_field10');
  
  values.traditionalFosterCare = getCheckboxValue('page4_field4');
  values.childWelfareFingerprintBased = getCheckboxValue('page4_field15');
  values.fosterCareFingerprint = getCheckboxValue('page4_field19');
  
  return values;
}

async function testPDFDownloadMatch() {
  console.log('\n==============================================');
  console.log('PDF DOWNLOAD DATA MATCH TEST');
  console.log('==============================================\n');
  
  try {
    // Step 1: Generate PDF from form data
    console.log('📝 Step 1: Generating PDF from submitted form data...');
    const pdfBuffer = await generateApplicationPDF(submittedFormData);
    console.log('   ✓ PDF generated successfully\n');
    
    // Step 2: Read values back from the generated PDF
    console.log('📖 Step 2: Reading values from generated PDF...');
    const pdfValues = await readPDFValues(pdfBuffer);
    console.log('   ✓ Values extracted successfully\n');
    
    // Step 3: Compare submitted data vs PDF data
    console.log('🔍 Step 3: Comparing submitted form data with PDF output...\n');
    console.log('┌─────────────────────────────────┬──────────────────────────┬──────────────────────────┬────────┐');
    console.log('│ Field                           │ Submitted Value          │ PDF Value                │ Match  │');
    console.log('├─────────────────────────────────┼──────────────────────────┼──────────────────────────┼────────┤');
    
    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches = [];
    
    const comparisons = [
      { field: 'First Name', submitted: submittedFormData.firstName, pdf: pdfValues.firstName },
      { field: 'Last Name', submitted: submittedFormData.lastName, pdf: pdfValues.lastName },
      { field: 'Middle Name', submitted: submittedFormData.middleName, pdf: pdfValues.middleName },
      { field: 'Nicknames', submitted: submittedFormData.nicknames, pdf: pdfValues.nicknames },
      { field: 'Date of Birth', submitted: submittedFormData.dateOfBirth, pdf: pdfValues.dateOfBirth },
      { field: 'SSN', submitted: submittedFormData.ssn, pdf: pdfValues.ssn },
      { field: 'Drivers License', submitted: submittedFormData.driversLicense, pdf: pdfValues.driversLicense },
      { field: 'Sex', submitted: submittedFormData.sex, pdf: pdfValues.sex },
      { field: 'Height', submitted: submittedFormData.height, pdf: pdfValues.height },
      { field: 'Weight', submitted: submittedFormData.weight, pdf: pdfValues.weight },
      { field: 'Hair Color', submitted: submittedFormData.hairColor, pdf: pdfValues.hairColor },
      { field: 'Eye Color', submitted: submittedFormData.eyeColor, pdf: pdfValues.eyeColor },
      { field: 'City of Birth', submitted: submittedFormData.cityOfBirth, pdf: pdfValues.cityOfBirth },
      { field: 'State of Birth', submitted: submittedFormData.stateOfBirth, pdf: pdfValues.stateOfBirth },
      { field: 'DL State', submitted: submittedFormData.dlState, pdf: pdfValues.dlState },
      { field: 'Driver Sex', submitted: submittedFormData.driverSex, pdf: pdfValues.driverSex },
      { field: 'Alias First', submitted: submittedFormData.aliases[0].firstName, pdf: pdfValues.alias1FirstName },
      { field: 'Alias Middle', submitted: submittedFormData.aliases[0].middleName, pdf: pdfValues.alias1MiddleName },
      { field: 'Alias Last', submitted: submittedFormData.aliases[0].lastName, pdf: pdfValues.alias1LastName },
      { field: 'Prev Res 1 State', submitted: submittedFormData.previousResidency[0].state, pdf: pdfValues.prevRes1State },
      { field: 'Prev Res 1 Start', submitted: submittedFormData.previousResidency[0].startDate, pdf: pdfValues.prevRes1Start },
      { field: 'Prev Res 1 End', submitted: submittedFormData.previousResidency[0].endDate, pdf: pdfValues.prevRes1End },
      { field: 'Prev Res 2 State', submitted: submittedFormData.previousResidency[1].state, pdf: pdfValues.prevRes2State },
      { field: 'Prev Res 2 Start', submitted: submittedFormData.previousResidency[1].startDate, pdf: pdfValues.prevRes2Start },
      { field: 'Prev Res 2 End', submitted: submittedFormData.previousResidency[1].endDate, pdf: pdfValues.prevRes2End },
      { field: 'Consent Background', submitted: submittedFormData.consentBackgroundCheck, pdf: pdfValues.consentBackgroundCheck },
      { field: 'Consent Child Abuse', submitted: submittedFormData.consentChildAbuseCheck, pdf: pdfValues.consentChildAbuseCheck },
      { field: 'Consent Registry', submitted: submittedFormData.consentRestrictedRegistry, pdf: pdfValues.consentRestrictedRegistry },
      { field: 'Consent Fingerprints', submitted: submittedFormData.consentFingerprints, pdf: pdfValues.consentFingerprints },
      { field: 'Convicted of Crime', submitted: submittedFormData.convictedOfCrime, pdf: pdfValues.convictedOfCrime },
      { field: 'Applicant Signature', submitted: submittedFormData.applicantSignature, pdf: pdfValues.applicantSignature },
      { field: 'Signature Date', submitted: submittedFormData.applicantSignatureDate, pdf: pdfValues.applicantSignatureDate },
      { field: 'Child Welfare Based', submitted: submittedFormData.childWelfareNameBased, pdf: pdfValues.childWelfareNameBased },
      { field: 'Adoption', submitted: submittedFormData.adoption, pdf: pdfValues.adoption },
      { field: 'Foster Care', submitted: submittedFormData.fosterCare, pdf: pdfValues.fosterCare },
      { field: 'Rep Name', submitted: submittedFormData.representativeName, pdf: pdfValues.representativeName },
      { field: 'Rep Title', submitted: submittedFormData.representativeTitle, pdf: pdfValues.representativeTitle },
      { field: 'Rep Address', submitted: submittedFormData.representativeMailingAddress, pdf: pdfValues.representativeMailingAddress },
      { field: 'Rep City', submitted: submittedFormData.representativeCity, pdf: pdfValues.representativeCity },
      { field: 'Rep State', submitted: submittedFormData.representativeState, pdf: pdfValues.representativeState },
      { field: 'Rep Zip', submitted: submittedFormData.representativeZipCode, pdf: pdfValues.representativeZipCode },
      { field: 'Rep Phone', submitted: submittedFormData.representativePhone, pdf: pdfValues.representativePhone },
      { field: 'Rep Fax', submitted: submittedFormData.representativeFax, pdf: pdfValues.representativeFax },
      { field: 'Rep Email', submitted: submittedFormData.representativeEmail, pdf: pdfValues.representativeEmail },
      { field: 'Traditional Foster Care', submitted: submittedFormData.traditionalFosterCare, pdf: pdfValues.traditionalFosterCare },
      { field: 'Fingerprint Based', submitted: submittedFormData.childWelfareFingerprintBased, pdf: pdfValues.childWelfareFingerprintBased },
      { field: 'Foster Care Fingerprint', submitted: submittedFormData.fosterCareFingerprint, pdf: pdfValues.fosterCareFingerprint }
    ];
    
    for (const { field, submitted, pdf } of comparisons) {
      const submittedStr = String(submitted || '').substring(0, 24);
      const pdfStr = String(pdf || '').substring(0, 24);
      const match = submitted === pdf;
      const status = match ? '✓' : '✗';
      
      if (match) {
        matchCount++;
      } else {
        mismatchCount++;
        mismatches.push({ field, submitted, pdf });
      }
      
      console.log(
        `│ ${field.padEnd(31)} │ ${submittedStr.padEnd(24)} │ ${pdfStr.padEnd(24)} │ ${status.padEnd(6)} │`
      );
    }
    
    console.log('└─────────────────────────────────┴──────────────────────────┴──────────────────────────┴────────┘');
    
    // Step 4: Summary
    console.log('\n📊 COMPARISON SUMMARY:');
    console.log(`   ✓ Matching fields: ${matchCount}`);
    console.log(`   ✗ Mismatched fields: ${mismatchCount}`);
    console.log(`   📈 Match rate: ${((matchCount / (matchCount + mismatchCount)) * 100).toFixed(1)}%`);
    
    if (mismatches.length > 0) {
      console.log('\n⚠️  MISMATCHES DETECTED:');
      mismatches.forEach(({ field, submitted, pdf }) => {
        console.log(`   • ${field}:`);
        console.log(`     Expected: "${submitted}"`);
        console.log(`     Got:      "${pdf}"`);
      });
    }
    
    // Step 5: Save test PDF for manual verification
    const testOutputPath = path.join(__dirname, '../uploads/test-download-match.pdf');
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(testOutputPath, pdfBuffer);
    console.log(`\n💾 Test PDF saved to: ${testOutputPath}`);
    console.log('   You can manually verify the PDF contains the correct data.\n');
    
    // Final verdict
    console.log('==============================================');
    if (mismatchCount === 0) {
      console.log('✅ TEST PASSED: All fields match perfectly!');
      console.log('   Downloaded PDF contains exact same data');
      console.log('   as the submitted form in correct order.');
    } else {
      console.log('❌ TEST FAILED: Data mismatches found');
      console.log('   Downloaded PDF does not match submitted data.');
    }
    console.log('==============================================\n');
    
    process.exit(mismatchCount > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testPDFDownloadMatch().catch(console.error);
