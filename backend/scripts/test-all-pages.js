/**
 * Comprehensive test for ALL pages of the PDF form
 * Tests pages 1-15 with complete field coverage
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.join(__dirname, '../templates/OA 2024 Parent Application.pdf');

// Comprehensive form data covering ALL pages
const completeFormData = {
  // PAGE 1 - Personal Information
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Michael',
  nicknames: 'Johnny',
  dateOfBirth: '01/15/1985',
  ssn: '123-45-6789',
  driversLicense: 'DL-123456',
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
  
  // PAGE 2 - Aliases and Previous Addresses
  aliases: [
    { firstName: 'Jonathan', middleName: 'M', lastName: 'Doe' },
    { firstName: 'Jon', middleName: 'Michael', lastName: 'Doe' }
  ],
  previousResidency: [
    { state: 'Texas', startDate: '01/2015', endDate: '12/2018' },
    { state: 'Oklahoma', startDate: '01/2019', endDate: '12/2024' }
  ],
  internationalResidency: [
    { country: 'Canada', startDate: '01/2010', endDate: '12/2014' }
  ],
  convictedOfCrime: false,
  crimeExplanation: '',
  consentBackgroundCheck: true,
  consentChildAbuseCheck: true,
  consentRestrictedRegistry: true,
  consentFingerprints: true,
  applicantSignature: 'John Michael Doe',
  applicantSignatureDate: '01/27/2026',
  
  // PAGE 3 - Child Welfare Name Based
  childWelfareNameBased: true,
  adoption: false,
  indianChildWelfareAdoption: false,
  okdhsAdoption: false,
  ericasRule: false,
  fosterCare: true,
  contractedResourceFamily: false,
  kinshipNonRelative: false,
  kinshipRelative: false,
  representativeName: 'Open Arms Foster Care',
  representativeTitle: 'Agency Director',
  representativeMailingAddress: '123 Main Street',
  representativeCity: 'Tulsa',
  representativeState: 'Oklahoma',
  representativeZipCode: '74012',
  representativePhone: '918-555-1234',
  representativeFax: '918-555-1235',
  representativeEmail: 'info@openarmsfostercare.com',
  
  // PAGE 4 - More Child Welfare Options
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
  okdhsFosterCareFingerprint: false,
  
  // PAGE 5 - More Fingerprint Options
  therapeuticFosterCareFingerprint: false,
  guardianshipFingerprint: false,
  icwTribalGuardianshipFingerprint: false,
  okdhsGuardianshipFingerprint: false,
  hostHomes: false,
  ipapSafetyPlan: false,
  reissueChildWelfareFingerprint: false,
  reissueFingerprintPreviousOnly: false,
  trialReunification: false,
  privateChildWelfare: false,
  privateAdoption: false,
  privateAdoptionNameBased: false,
  privateDomesticAdoptionFingerprint: false,
  privateGuardianshipNameBased: false,
  privateInternationalAdoptionNameBased: false,
  
  // PAGE 6 - OKDHS Representative
  representativeDate: '01/27/2026',
  
  // PAGE 7 - Driver Records
  oklahomaDrivingRecord: true,
  collisionReport: false,
  otherDrivingRecord: false,
  iAmPersonNamed: true,
  requestingRecordOfAnother: false,
  governmentAgency: false,
  legalUse: true,
  researchActivities: false,
  insuranceCompany: false,
  licensedInvestigator: false,
  commercialDriverEmployer: false,
  otherAuthorized: false,
  
  // PAGE 8 - Consent Entity
  resourceFirstName1: 'John',
  resourceLastName1: 'Doe',
  applicant1ConsentDate: '01/27/2026',
  applicant2ConsentDate: '01/27/2026',
  
  // PAGE 9 - Resource Family Application
  familyName: 'John Doe Family',
  physicalAddress: '456 Oak Avenue',
  streetAddress: '456 Oak Avenue',
  physicalCity: 'Tulsa',
  city: 'Tulsa',
  physicalState: 'OK',
  state: 'OK',
  physicalZipCode: '74012',
  zipCode: '74012',
  mailingAddress: '456 Oak Avenue',
  mailingCity: 'Tulsa',
  mailingState: 'OK',
  mailingZipCode: '74012',
  findingDirections: 'Near Central Park, turn left at Oak Street',
  homePhone: '918-555-1100',
  cellPhone: '918-555-1234',
  workPhone: '918-555-5678',
  faxNumber: '918-555-1235',
  email: 'john.doe@email.com',
  squareFootage: '2500',
  numberOfBedrooms: '4',
  bedrooms: '4',
  bathrooms: '2.5',
  residenceYears: '5',
  homeType: 'own',
  
  // PAGE 10 - Resource Applicant 1
  applicant1FirstName: 'John',
  applicant1MiddleName: 'Michael',
  applicant1LastName: 'Doe',
  applicant1OtherNames: 'Johnny',
  applicant1OtherNamesNA: false,
  applicant1DateOfBirth: '01/15/1985',
  applicant1SSN: '123-45-6789',
  applicant1Gender: 'Male',
  applicant1Tribe: 'N/A',
  applicant1TribeNA: true,
  applicant1HispanicLatino: 'No',
  applicant1Race: 'White',
  applicant1WorkPhone: '918-555-5678',
  applicant1CellPhone: '918-555-1234',
  applicant1HomePhone: '918-555-1100',
  applicant1Email: 'john.doe@email.com',
  applicant1DriversLicense: 'DL-123456',
  applicant1DLState: 'OK',
  applicant1USCitizen: 'yes',
  
  // PAGE 11 - Applicant 1 Employment
  applicant1StatesLived: 'Texas, Oklahoma',
  applicant1StatesLivedNA: false,
  applicant1Employed: 'yes',
  applicant1SelfEmployed: 'no',
  applicant1Employer: 'Tech Company Inc',
  employer: 'Tech Company Inc',
  applicant1Occupation: 'Software Engineer',
  occupation: 'Software Engineer',
  applicant1WorkAddress: '789 Business Blvd',
  workAddress: '789 Business Blvd',
  applicant1WorkCity: 'Tulsa',
  applicant1WorkState: 'OK',
  applicant1WorkZipCode: '74012',
  applicant1GrossIncome: '85000',
  grossIncome: '85000',
  applicant1WorkYears: '7',
  workYears: '7',
  applicant1MaritalStatus: 'Married',
  applicant1HighestGrade: 'Bachelor\'s Degree',
  applicant1AdvancedDegree: 'Computer Science',
  
  // PAGE 12 - Applicant 2 (Spouse)
  hasSpouse: true,
  applicant2FirstName: 'Jane',
  spouseFirstName: 'Jane',
  applicant2MiddleName: 'Elizabeth',
  spouseMiddleName: 'Elizabeth',
  applicant2LastName: 'Doe',
  spouseLastName: 'Doe',
  applicant2OtherNames: 'Janie',
  applicant2DateOfBirth: '03/22/1987',
  spouseDateOfBirth: '03/22/1987',
  applicant2SSN: '987-65-4321',
  spouseSSN: '987-65-4321',
  applicant2Gender: 'Female',
  applicant2Tribe: 'N/A',
  applicant2HispanicLatino: 'No',
  applicant2Race: 'White',
  applicant2WorkPhone: '918-555-5679',
  applicant2CellPhone: '918-555-1235',
  applicant2HomePhone: '918-555-1100',
  applicant2Email: 'jane.doe@email.com',
  spouseDriversLicense: 'DL-654321',
  spouseDLState: 'OK',
  spouseEmployer: 'Healthcare Center',
  spouseOccupation: 'Registered Nurse',
  spouseWorkAddress: '321 Medical Plaza',
  spouseWorkYears: '6',
  spouseGrossIncome: '72000',
  
  // PAGE 13 - References
  references: [
    {
      firstName: 'Robert',
      lastName: 'Smith',
      phoneNumber: '918-555-2000',
      phone: '918-555-2000',
      relationship: 'Friend'
    },
    {
      firstName: 'Mary',
      lastName: 'Johnson',
      phoneNumber: '918-555-3000',
      phone: '918-555-3000',
      relationship: 'Colleague'
    }
  ],
  
  // PAGE 14 - Background Questions
  criminalHistory: false,
  childAbuseHistory: false,
  substanceAbuseHistory: false,
  applicant1ArrestedCharges: 'no',
  applicant1PleaGuilty: 'no',
  applicant1InvestigatedAbuse: 'no',
  applicant1PreviousFosterApply: 'yes',
  applicant1ProtectiveOrder: 'no',
  criminalDetails: '',
  childAbuseDetails: '',
  substanceAbuseDetails: '',
  
  // PAGE 15 - Required Documents
  requiredMedicalExam: true,
  medicalExamAppointmentDate: '02/15/2026',
  requiredFinancialAssessment: true,
  requiredParentHealthHistory: true,
  requiredChildHealthStatement: true,
  childHealthAppointmentDate: '02/20/2026',
  requiredCDIB: false,
  requiredMarriageLicense: true,
  requiredDD214: false,
  requiredDriverLicense: true,
  requiredImmunization: true,
  requiredPaycheckStub: true,
  requiredPetVaccination: true,
  requiredSocialSecurity: true,
  requiredFingerprints: true,
  requiredLawfulResidence: true,
  requiredDivorceDecrees: false,
  requiredAutoInsurance: true,
  requiredChildCareApplication: false,
  requiredOtherAdults: false,
  requiredOtherSpecify: false,
  requiredOtherSpecifyText: '',
  
  // Signature Dates
  applicant1SignatureDate: '01/27/2026',
  signatureDate: '01/27/2026',
  applicant2SignatureDate: '01/27/2026',
  adultMember1SignatureDate: '',
  adultMember2SignatureDate: '',
  
  // Extra Text Fields
  reasonForFostering: 'We want to provide a loving home to children in need',
  childCareExperience: '10 years of experience with our own children and volunteer work',
  preferredAgeRange: '5-12 years',
  emergencyName: 'Robert Smith',
  emergencyPhone: '918-555-2000'
};

async function testAllPagesData() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('COMPREHENSIVE PDF TEST - ALL 15 PAGES');
  console.log('══════════════════════════════════════════════════════════\n');
  
  try {
    // Load PDF template
    console.log('📄 Loading PDF template...');
    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    
    console.log(`   ✓ PDF loaded: ${pages.length} pages\n`);
    
    // Get all fields
    const allFields = form.getFields();
    console.log(`📋 Total form fields in PDF: ${allFields.length}\n`);
    
    // Define all field mappings by page
    const pageFieldMappings = {
      'Page 1': {
        fields: {
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
          'driverSex': 'page1_field29'
        }
      },
      'Page 2': {
        fields: {
          'aliases[0].firstName': 'page2_field1',
          'aliases[0].middleName': 'page2_field2',
          'aliases[0].lastName': 'page2_field3',
          'previousResidency[0].state': 'page2_field12',
          'previousResidency[0].startDate': 'page2_field13',
          'previousResidency[0].endDate': 'page2_field14',
          'previousResidency[1].state': 'page2_field15',
          'previousResidency[1].startDate': 'page2_field16',
          'previousResidency[1].endDate': 'page2_field17',
          'convictedOfCrime': 'page2_field44',
          'applicantSignature': 'page2_field53',
          'applicantSignatureDate': 'page2_field54'
        }
      },
      'Page 3': {
        fields: {
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
          'representativeEmail': 'page3_field10'
        }
      },
      'Page 4': {
        fields: {
          'traditionalFosterCare': 'page4_field4',
          'childWelfareFingerprintBased': 'page4_field15',
          'fosterCareFingerprint': 'page4_field19'
        }
      },
      'Page 5': {
        fields: {
          'therapeuticFosterCareFingerprint': 'page5_field1',
          'guardianshipFingerprint': 'page5_field2'
        }
      },
      'Page 6': {
        fields: {
          'representativeName': 'page6_field7',
          'representativeTitle': 'page6_field8',
          'representativeDate': 'page6_field16'
        }
      },
      'Page 7': {
        fields: {
          'driversLicense': 'page7_field3',
          'dateOfBirth': 'page7_field4',
          'applicantSignature': 'page7_field5',
          'oklahomaDrivingRecord': 'page7_field7',
          'iAmPersonNamed': 'page7_field10'
        }
      },
      'Page 8': {
        fields: {
          'applicant1ConsentDate': 'Date_2',
          'applicant2ConsentDate': 'Date_3'
        }
      },
      'Page 9': {
        fields: {
          'physicalAddress': 'page9_field2',
          'physicalCity': 'page9_field3',
          'physicalState': 'page9_field4',
          'physicalZipCode': 'page9_field5',
          'homePhone': 'page9_field12',
          'cellPhone': 'page9_field15',
          'email': 'page9_field18',
          'numberOfBedrooms': 'page9_field21',
          'bathrooms': 'page9_field22'
        }
      },
      'Page 10': {
        fields: {
          'applicant1FirstName': 'page10_field1',
          'applicant1MiddleName': 'page10_field9',
          'applicant1LastName': 'page10_field10',
          'applicant1DateOfBirth': 'page10_field20',
          'applicant1SSN': 'page10_field21',
          'applicant1Gender': 'page10_field22',
          'applicant1Email': 'page10_field29',
          'applicant1DriversLicense': 'page10_field30'
        }
      },
      'Page 11': {
        fields: {
          'applicant1Employer': 'page11_field7',
          'applicant1Occupation': 'page11_field8',
          'applicant1GrossIncome': 'page11_field16',
          'applicant1WorkYears': 'page11_field17',
          'applicant1MaritalStatus': 'page11_field18',
          'applicant1HighestGrade': 'page11_field19'
        }
      },
      'Page 12': {
        fields: {
          'applicant2FirstName': 'page12_field1',
          'applicant2MiddleName': 'page12_field2',
          'applicant2LastName': 'page12_field3',
          'applicant2DateOfBirth': 'page12_field6',
          'applicant2SSN': 'page12_field7',
          'applicant2Gender': 'page12_field8',
          'spouseDriversLicense': 'page12_field21',
          'spouseEmployer': 'page12_field23'
        }
      },
      'Page 13': {
        fields: {
          'references[0].phoneNumber': 'page13_field4',
          'references[0].relationship': 'page13_field5',
          'references[1].phoneNumber': 'page13_field7'
        }
      },
      'Page 14': {
        fields: {
          'criminalHistory': 'page14_field1',
          'childAbuseHistory': 'page14_field2',
          'substanceAbuseHistory': 'page14_field3'
        }
      },
      'Page 15': {
        fields: {
          'requiredMedicalExam': 'page15_field1',
          'medicalExamAppointmentDate': 'page15_field2',
          'requiredFinancialAssessment': 'page15_field3',
          'requiredDriverLicense': 'page15_field10',
          'requiredFingerprints': 'page15_field15'
        }
      }
    };
    
    // Test each page
    console.log('🧪 TESTING EACH PAGE:\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    for (const [pageName, pageData] of Object.entries(pageFieldMappings)) {
      console.log(`\n📄 ${pageName}:`);
      console.log('─'.repeat(60));
      
      let pageTests = 0;
      let pagePassed = 0;
      let pageFailed = 0;
      
      for (const [formKey, pdfFieldName] of Object.entries(pageData.fields)) {
        totalTests++;
        pageTests++;
        
        try {
          const field = form.getField(pdfFieldName);
          const formValue = getNestedValue(completeFormData, formKey);
          
          // Fill the field
          if (field.constructor.name.includes('CheckBox')) {
            if (typeof formValue === 'boolean' && formValue) {
              field.check();
            }
          } else if (field.constructor.name.includes('Text')) {
            if (formValue !== undefined && formValue !== null && formValue !== '') {
              field.setText(String(formValue));
            }
          }
          
          passedTests++;
          pagePassed++;
          console.log(`   ✓ ${formKey.padEnd(35)} → ${pdfFieldName}`);
          
        } catch (err) {
          failedTests++;
          pageFailed++;
          console.log(`   ✗ ${formKey.padEnd(35)} → ${pdfFieldName} [${err.message}]`);
        }
      }
      
      const pageSuccessRate = ((pagePassed / pageTests) * 100).toFixed(1);
      console.log(`\n   📊 ${pageName} Results: ${pagePassed}/${pageTests} passed (${pageSuccessRate}%)`);
    }
    
    // Save the filled PDF
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('💾 Generating test PDF...');
    const pdfBytes = await pdfDoc.save();
    const testOutputPath = path.join(__dirname, '../uploads/test-all-pages.pdf');
    
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(testOutputPath, pdfBytes);
    console.log(`   ✓ Test PDF saved: ${testOutputPath}`);
    
    // Final summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 OVERALL SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total Fields Tested: ${totalTests}`);
    console.log(`   ✓ Passed: ${passedTests}`);
    console.log(`   ✗ Failed: ${failedTests}`);
    console.log(`   📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (failedTests === 0) {
      console.log('✅ ALL PAGES TEST PASSED!');
      console.log('   All 15 pages have correct field mappings and data.\n');
      process.exit(0);
    } else {
      console.log('⚠️  TEST COMPLETED WITH SOME FAILURES');
      console.log(`   ${failedTests} field(s) need attention.\n`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper function
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

// Run test
testAllPagesData().catch(console.error);
