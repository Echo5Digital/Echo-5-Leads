/**
 * Test script to submit a foster care application
 * Run: node scripts/test-foster-application.js
 * 
 * Options:
 *   --local     Use localhost:3001 (default)
 *   --prod      Use production API
 */

const API_LOCAL = 'http://localhost:3001';
const API_PROD = 'https://echo-5-leads-fxzz.vercel.app';

const useProd = process.argv.includes('--prod');
const API_URL = useProd ? API_PROD : API_LOCAL;

console.log(`\n🧪 Testing Foster Care Application Submission`);
console.log(`📡 API: ${API_URL}\n`);

const testFormData = {
  // Personal Information
  firstName: 'Test',
  middleName: 'User',
  lastName: 'Application',
  noMiddleName: false,
  nicknames: '',
  sex: 'Male',
  dateOfBirth: '1985-06-15',
  height: '5\'10"',
  weight: '175',
  cityOfBirth: 'Oklahoma City',
  stateOfBirth: 'OK',
  ssn: '123-45-6789',
  hairColor: 'Brown',
  eyeColor: 'Blue',
  driversLicense: 'DL123456789',
  dlState: 'OK',
  driverSex: 'M',
  
  // Contact Info
  email: 'test@echo5digital.com',
  cellPhone: '405-555-1234',
  homePhone: '',
  workPhone: '',
  
  // Address
  address: '123 Test Street',
  city: 'Oklahoma City',
  state: 'OK',
  zip: '73102',
  
  // Aliases
  aliases: [
    { firstName: '', middleName: '', lastName: '' },
    { firstName: '', middleName: '', lastName: '' },
    { firstName: '', middleName: '', lastName: '' }
  ],
  
  // Previous Residency
  previousResidency: [
    { state: 'TX', startDate: '2010-01', endDate: '2015-06' },
    { state: '', startDate: '', endDate: '' },
    { state: '', startDate: '', endDate: '' }
  ],
  
  // International Residency
  internationalResidency: [
    { country: '', startDate: '', endDate: '' },
    { country: '', startDate: '', endDate: '' },
    { country: '', startDate: '', endDate: '' }
  ],
  
  // Criminal History
  convictedOfCrime: false,
  crimeExplanation: '',
  
  // Consent checkboxes
  consentBackgroundCheck: true,
  consentChildAbuseCheck: true,
  consentRestrictedRegistry: true,
  consentFingerprints: true,
  consentFBICheck: true,
  consentFBIChallenge: true,
  
  // Privacy and certification
  privacyPolicyReviewed: true,
  certifyInformation: true,
  applicantSignature: 'Test User Application',
  applicantSignatureDate: new Date().toISOString().split('T')[0],
  
  // Background Check Purpose
  fosterCare: true,
  traditionalFosterCare: true,
  
  // Submission timestamp
  submittedAt: new Date().toISOString()
};

async function submitApplication() {
  try {
    console.log('📤 Submitting test application...\n');
    
    const response = await fetch(`${API_URL}/api/foster-care-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testFormData)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS!\n');
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log(`\n📄 PDF URL: ${API_URL}${data.pdfUrl}`);
    } else {
      console.log('❌ FAILED!\n');
      console.log('Status:', response.status);
      console.log('Error:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ ERROR!\n');
    console.log('Message:', error.message);
  }
}

submitApplication();
