import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import { sendEmail } from '../lib/email.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the government PDF template
const TEMPLATE_PATH = path.join(__dirname, '../../templates/OA 2024 Parent Application.pdf');

/**
 * POST /api/foster-care-application
 * Submit foster care application, generate PDF, store in database, and send emails
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData = req.body;

    // No validation - accept all submissions

    const db = await getDb();
    const applicationsCollection = db.collection('foster_applications');
    const leadsCollection = db.collection('leads');

    // Generate PDF
    const pdfBuffer = await generateApplicationPDF(formData);
    const applicationId = new ObjectId();
    const timestamp = new Date();
    const fileName = `foster-application-${applicationId}.pdf`;

    // Store PDF as base64 in database (works with Vercel serverless)
    const pdfBase64 = pdfBuffer.toString('base64');

    // Find the Open Arms tenant
    const tenantsCollection = db.collection('tenants');
    const tenant = await tenantsCollection.findOne({
      name: { $regex: /open.*arms/i }
    });

    if (!tenant) {
      console.error('Open Arms tenant not found');
      return res.status(500).json({ error: 'Configuration error: Tenant not found' });
    }

    // Save application to database (with PDF stored as base64)
    const application = {
      _id: applicationId,
      tenantId: tenant._id,
      formData: formData,
      pdfFileName: fileName,
      pdfBase64: pdfBase64,
      status: 'submitted',
      submittedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await applicationsCollection.insertOne(application);

    // Also create a lead entry for tracking
    const lead = {
      tenantId: tenant._id,
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      email: formData.email || '',
      phone: formData.cellPhone || '',
      source: 'Foster Care Application Form',
      status: 'New',
      stage: 'New',
      leadType: 'Foster Care Application',
      customFields: {
        applicationType: 'Foster Parent',
        hasSpouse: formData.hasSpouse,
        preferredAgeRange: formData.preferredAgeRange,
        residenceType: formData.residenceType,
        applicationId: applicationId.toString()
      },
      submittedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Try to insert lead, but don't fail if duplicate exists
    try {
      await leadsCollection.insertOne(lead);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error - update existing lead instead
        console.log('[Foster App] Duplicate lead detected, updating existing lead');
        await leadsCollection.updateOne(
          { email: formData.email, tenantId: tenant._id },
          { 
            $set: {
              firstName: formData.firstName || '',
              lastName: formData.lastName || '',
              phone: formData.cellPhone || '',
              source: 'Foster Care Application Form',
              status: 'New',
              stage: 'New',
              leadType: 'Foster Care Application',
              customFields: {
                applicationType: 'Foster Parent',
                hasSpouse: formData.hasSpouse,
                preferredAgeRange: formData.preferredAgeRange,
                residenceType: formData.residenceType,
                applicationId: applicationId.toString()
              },
              updatedAt: timestamp
            }
          }
        );
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

    // Send confirmation email to applicant with PDF attachment
    const applicantEmailSubject = 'Foster Care Application Received - Open Arms Foster Care';
    const applicantEmailBody = `
Dear ${formData.firstName} ${formData.lastName},

Thank you for submitting your Foster Care Parent Application with Open Arms Foster Care!

We have received your application and it is now under review. Your application ID is: ${applicationId}

What happens next:
• Our case worker team will review your application within 2-3 business days
• A caseworker will contact you within 5 business days to schedule an initial interview
• Background checks and home study will be scheduled after the initial interview

Your completed application PDF is attached to this email for your records.

If you have any questions or need to provide additional information, please don't hesitate to contact us.

Contact Information:
Email: amber.price@openarmsfostercare.com
Phone: (Contact number)

Thank you for your interest in becoming a foster parent. We look forward to working with you!

Best regards,
Open Arms Foster Care Team
    `.trim();

    await sendEmail({
      to: formData.email,
      subject: applicantEmailSubject,
      text: applicantEmailBody,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    // Send notification email to admin/case workers with PDF attachment
    const notificationEmails = tenant.config?.notificationEmails || [
      'amber.price@openarmsfostercare.com',
      'kamryn.bass@openarmsfostercare.com'
    ];

    const adminEmailSubject = `New Foster Care Application: ${formData.firstName} ${formData.lastName}`;
    const adminEmailBody = `
New Foster Care Application Received

Application ID: ${applicationId}
Submitted: ${timestamp.toLocaleString()}

Applicant Information:
Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formData.cellPhone}
Address: ${formData.streetAddress}, ${formData.city}, ${formData.state} ${formData.zipCode}

${formData.hasSpouse ? `Spouse: ${formData.spouseFirstName} ${formData.spouseLastName}` : 'Single Applicant'}

Household Information:
Residence Type: ${formData.residenceType}
Bedrooms: ${formData.bedrooms}
Bathrooms: ${formData.bathrooms}
Household Members: ${formData.householdMembers.length}

Preferences:
Preferred Age Range: ${formData.preferredAgeRange}
Special Needs Willingness: ${formData.specialNeedsWillingness ? 'Yes' : 'No'}

Background Checks Required:
Criminal History Indicated: ${formData.criminalHistory ? 'Yes' : 'No'}
Child Abuse History Indicated: ${formData.childAbuseHistory ? 'Yes' : 'No'}
Substance Abuse History Indicated: ${formData.substanceAbuseHistory ? 'Yes' : 'No'}

The complete application PDF is attached.

Please review and follow up with the applicant within 5 business days.

View in Dashboard: ${process.env.FRONTEND_URL || 'https://leads.echo5software.com'}/leads?id=${lead._id}
    `.trim();

    // Send notification email to admin/case workers
    for (const email of notificationEmails) {
      try {
        await sendEmail({
          to: email,
          subject: adminEmailSubject,
          text: adminEmailBody,
          attachments: [
            {
              filename: fileName,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
      } catch (emailError) {
        console.error(`Failed to send notification to ${email}:`, emailError);
      }
    }

    // Return success response
    res.status(200).json({
      success: true,
      applicationId: applicationId.toString(),
      message: 'Application submitted successfully',
      pdfUrl: `/api/foster-care-application/${applicationId}/pdf`
    });

  } catch (error) {
    console.error('Foster care application error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({ 
      error: 'Failed to process application',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Generate a filled PDF from form data using the government template
 */
async function generateApplicationPDF(formData) {
  try {
    // Read the government PDF template
    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Get the form from the PDF
    const form = pdfDoc.getForm();
    
    // Build the full name from form data
    const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
    
    console.log('[PDF] Filling government PDF template with form data...');
    
    // ==========================================
    // PAGE 1 - DRIVER RECORDS REQUEST (Service Oklahoma)
    // Records Request and Consent to Release
    // ==========================================
    
    // Driver record request checkboxes at top
    fillCheckbox(form, 'page1_field1', formData.driverRecordMVR); // Oklahoma driving record summary (MVR)
    fillTextField(form, 'page1_field2', formData.collisionReportDate); // Collision Report Date
    fillTextField(form, 'page1_field3', formData.collisionReportCity); // City/County
    fillCheckbox(form, 'page1_field4', formData.driverRecordCollision); // Collision Report checkbox
    fillCheckbox(form, 'page1_field5', formData.driverRecordOther); // Other Driving Records checkbox
    fillTextField(form, 'page1_field6', formData.driverRecordOtherDetails); // Other Driving Records details
    
    // Driver information table
    fillTextField(form, 'page1_field8', fullName); // Driver's Name
    fillTextField(form, 'page1_field9', formData.driverSex || formData.sex); // Sex
    fillTextField(form, 'page1_field10', formData.driversLicense); // Driver License Number
    fillTextField(form, 'page1_field11', formData.dateOfBirth); // Date of Birth
    
    // Check the following applicable statement
    fillCheckbox(form, 'page1_field12', formData.personIsNamed); // I am the person named
    fillCheckbox(form, 'page1_field13', formData.personRequestingOther); // I am requesting records of another
    
    // Reasons checkboxes
    fillCheckbox(form, 'page1_field14', formData.reasonGovernmentAgency); // Government Agency
    fillCheckbox(form, 'page1_field15', formData.reasonCourt); // Legal/Court
    fillCheckbox(form, 'page1_field16', formData.reasonResearch); // Research Activities
    fillCheckbox(form, 'page1_field17', formData.reasonInsurance); // Insurance Company
    fillCheckbox(form, 'page1_field18', formData.reasonInvestigator); // Licensed Private Investigator
    fillCheckbox(form, 'page1_field19', formData.reasonEmployer); // Employer of Commercial Driver
    fillTextField(form, 'page1_field20', formData.reasonOtherCitation); // Other reason text
    fillCheckbox(form, 'page1_field21', formData.reasonOther); // Other checkbox
    
    // Consent to Release by Person Named in Request
    fillTextField(form, 'page1_field22', formData.personNamedPrintedName || fullName); // Printed Name of Person Named in Request
    // page1_field23 is signature - will be embedded as image, leave text empty
    
    // Affirmation of Person Making Request
    fillTextField(form, 'page1_field24', formData.personMakingPrintedName || fullName); // Printed Name of Person Making Request
    // page1_field25 is signature - will be embedded as image, leave text empty
    fillTextField(form, 'page1_field26', formData.personMakingAgencyName || formData.agencyName || ''); // Agency/Company Name
    fillTextField(form, 'page1_field27', formData.personMakingDate || formData.applicantSignatureDate); // Date
    fillTextField(form, 'page1_field28', formData.personMakingAddress || formData.physicalAddress || formData.streetAddress || ''); // Address
    fillTextField(form, 'page1_field29', formData.personMakingCityStateZip || `${formData.physicalCity || formData.city || ''}, ${formData.physicalState || formData.state || ''} ${formData.physicalZipCode || formData.zipCode || ''}`.trim()); // City, State Zip
    
    // ==========================================
    // PAGE 2 - BACKGROUND CHECK (Applicant Information)
    // Oklahoma Human Services - Request for Background Check
    // ==========================================
    
    // Applicant's personal information
    fillTextField(form, 'page2_field2', formData.firstName); // First name
    fillTextField(form, 'page2_field3', formData.middleName); // Middle Name
    fillTextField(form, 'page2_field1', formData.lastName); // Last name
    
    // Aliases (5 rows)
    if (formData.aliases && formData.aliases[0]) {
      fillTextField(form, 'page2_field6', formData.aliases[0].firstName);
      fillTextField(form, 'page2_field7', formData.aliases[0].middleName);
      fillTextField(form, 'page2_field8', formData.aliases[0].lastName);
    }
    if (formData.aliases && formData.aliases[1]) {
      fillTextField(form, 'page2_field9', formData.aliases[1].firstName);
      fillTextField(form, 'page2_field10', formData.aliases[1].middleName);
      fillTextField(form, 'page2_field11', formData.aliases[1].lastName);
    }
    if (formData.aliases && formData.aliases[2]) {
      fillTextField(form, 'page2_field12', formData.aliases[2].firstName);
      fillTextField(form, 'page2_field13', formData.aliases[2].middleName);
      fillTextField(form, 'page2_field14', formData.aliases[2].lastName);
    }
    if (formData.aliases && formData.aliases[3]) {
      fillTextField(form, 'page2_field15', formData.aliases[3].firstName);
      fillTextField(form, 'page2_field16', formData.aliases[3].middleName);
      fillTextField(form, 'page2_field17', formData.aliases[3].lastName);
    }
    if (formData.aliases && formData.aliases[4]) {
      fillTextField(form, 'page2_field18', formData.aliases[4].firstName);
      fillTextField(form, 'page2_field19', formData.aliases[4].middleName);
      fillTextField(form, 'page2_field20', formData.aliases[4].lastName);
    }
    
    // Nickname(s)
    fillTextField(form, 'page2_field21', formData.nicknames);
    
    // Personal details
    fillTextField(form, 'page2_field23', formData.dateOfBirth); // Date of birth
    fillTextField(form, 'page2_field24', formData.height); // Height
    fillTextField(form, 'page2_field25', formData.weight); // Weight
    fillTextField(form, 'page2_field28', `${formData.cityOfBirth || ''}, ${formData.stateOfBirth || ''}`.trim()); // City and state of birth
    fillTextField(form, 'page2_field29', formData.ssn); // Social Security number
    fillTextField(form, 'page2_field30', formData.hairColor); // Hair color
    fillTextField(form, 'page2_field31', formData.dlState); // State DL issued
    fillTextField(form, 'page2_field32', formData.eyeColor); // Eye color
    fillTextField(form, 'page2_field33', formData.driversLicense); // Driver license (DL) number
    
    // Mailing address
    fillTextField(form, 'page2_field36', formData.mailingAddress || formData.physicalAddress || formData.streetAddress); // Mailing address
    fillTextField(form, 'page2_field34', formData.mailingCity || formData.physicalCity || formData.city); // City
    fillTextField(form, 'page2_field35', formData.mailingState || formData.physicalState || formData.state); // State
    fillTextField(form, 'page2_field37', formData.mailingZipCode || formData.physicalZipCode || formData.zipCode); // ZIP code
    fillTextField(form, 'page2_field38', formData.homePhone || formData.cellPhone); // Phone number
    fillTextField(form, 'page2_field39', formData.faxNumber); // Fax number
    fillTextField(form, 'page2_field40', formData.email); // Email
    
    // Previous Five Years Residency (fields 39-48 in your numbering)
    fillCheckbox(form, 'page2_field44', formData.previousResidencyNA); // N/A checkbox
    
    // Previous Residency Row 1
    if (formData.previousResidency && formData.previousResidency[0]) {
      fillTextField(form, 'page2_field41', formData.previousResidency[0].state);
      fillTextField(form, 'page2_field42', formData.previousResidency[0].startDate);
      fillTextField(form, 'page2_field43', formData.previousResidency[0].endDate);
    }
    // Previous Residency Row 2
    if (formData.previousResidency && formData.previousResidency[1]) {
      fillTextField(form, 'page2_field46', formData.previousResidency[1].state);
      fillTextField(form, 'page2_field47', formData.previousResidency[1].startDate);
      fillTextField(form, 'page2_field48', formData.previousResidency[1].endDate);
    }
    // Previous Residency Row 3
    if (formData.previousResidency && formData.previousResidency[2]) {
      fillTextField(form, 'page2_field49', formData.previousResidency[2].state);
      fillTextField(form, 'page2_field50', formData.previousResidency[2].startDate);
      fillTextField(form, 'page2_field51', formData.previousResidency[2].endDate);
    }
    
    // Applicant Signature on Page 2 - embedded as image only, not text
    // fillTextField(form, 'page2_field53', formData.applicantSignature); // Removed - now using image embedding
    fillTextField(form, 'page2_field54', formData.applicantSignatureDate);
    
    // ==========================================
    // PAGE 3 - Child Welfare Purpose (Name Based)
    // Text Fields: page3_field2-11 (for agency info)
    // Checkboxes: page3_field1,12-19
    // ==========================================
    
    fillCheckbox(form, 'page3_field1', formData.childWelfareNameBased);
    
    // Adoption options
    fillCheckbox(form, 'page3_field12', formData.adoption);
    fillCheckbox(form, 'page3_field13', formData.indianChildWelfareAdoption);
    fillCheckbox(form, 'page3_field14', formData.okdhsAdoption);
    fillCheckbox(form, 'page3_field15', formData.ericasRule);
    
    // Foster Care options
    fillCheckbox(form, 'page3_field16', formData.fosterCare);
    fillCheckbox(form, 'page3_field17', formData.contractedResourceFamily);
    fillCheckbox(form, 'page3_field18', formData.kinshipNonRelative);
    fillCheckbox(form, 'page3_field19', formData.kinshipRelative);
    
    // Agency information text fields
    fillTextField(form, 'page3_field2', formData.representativeName);
    fillTextField(form, 'page3_field3', formData.representativeTitle);
    fillTextField(form, 'page3_field4', formData.representativeMailingAddress);
    fillTextField(form, 'page3_field5', formData.representativeCity);
    fillTextField(form, 'page3_field6', formData.representativeState);
    fillTextField(form, 'page3_field7', formData.representativeZipCode);
    fillTextField(form, 'page3_field8', formData.representativePhone);
    fillTextField(form, 'page3_field9', formData.representativeFax);
    fillTextField(form, 'page3_field10', formData.representativeEmail);
    
    // ==========================================
    // PAGE 4 - More Child Welfare Options (22 checkboxes)
    // ==========================================
    
    fillCheckbox(form, 'page4_field1', formData.therapeuticFosterCare);
    fillCheckbox(form, 'page4_field4', formData.traditionalFosterCare);
    fillCheckbox(form, 'page4_field5', formData.guardianship);
    fillCheckbox(form, 'page4_field6', formData.icwTribalGuardianship);
    fillCheckbox(form, 'page4_field7', formData.okdhsGuardianship);
    fillCheckbox(form, 'page4_field8', formData.ipap);
    fillCheckbox(form, 'page4_field9', formData.indianChildWelfareFoster);
    fillCheckbox(form, 'page4_field10', formData.reissueChildWelfare);
    fillCheckbox(form, 'page4_field11', formData.reissuePreviousOnly);
    fillCheckbox(form, 'page4_field12', formData.safetyPlanMonitor);
    fillCheckbox(form, 'page4_field13', formData.okdhsTrialReunification);
    fillCheckbox(form, 'page4_field14', formData.volunteer);
    fillCheckbox(form, 'page4_field15', formData.childWelfareFingerprintBased);
    fillCheckbox(form, 'page4_field16', formData.adoptionFingerprint);
    fillCheckbox(form, 'page4_field17', formData.icwTribalAdoptionFingerprint);
    fillCheckbox(form, 'page4_field18', formData.okdhsAdoptionFingerprint);
    fillCheckbox(form, 'page4_field19', formData.fosterCareFingerprint);
    fillCheckbox(form, 'page4_field20', formData.rfpAgency);
    fillCheckbox(form, 'page4_field21', formData.ddsSpecializedFosterCare);
    fillCheckbox(form, 'page4_field22', formData.emergencyAfterHours);
    fillCheckbox(form, 'page4_field23', formData.icwTribalFosterCareFingerprint);
    fillCheckbox(form, 'page4_field24', formData.okdhsFosterCareFingerprint);
    
    // Signature Date
    fillTextField(form, 'Date_1', formData.applicantSignatureDate);
    
    // ==========================================
    // PAGE 5 - More Fingerprint Options (28 checkboxes)
    // ==========================================
    
    fillCheckbox(form, 'page5_field1', formData.therapeuticFosterCareFingerprint);
    fillCheckbox(form, 'page5_field2', formData.guardianshipFingerprint);
    fillCheckbox(form, 'page5_field3', formData.icwTribalGuardianshipFingerprint);
    fillCheckbox(form, 'page5_field4', formData.okdhsGuardianshipFingerprint);
    fillCheckbox(form, 'page5_field5', formData.hostHomes);
    fillCheckbox(form, 'page5_field6', formData.ipapSafetyPlan);
    fillCheckbox(form, 'page5_field7', formData.reissueChildWelfareFingerprint);
    fillCheckbox(form, 'page5_field8', formData.reissueFingerprintPreviousOnly);
    fillCheckbox(form, 'page5_field9', formData.trialReunification);
    fillCheckbox(form, 'page5_field10', formData.privateChildWelfare);
    fillCheckbox(form, 'page5_field11', formData.privateAdoption);
    fillCheckbox(form, 'page5_field12', formData.privateAdoptionNameBased);
    fillCheckbox(form, 'page5_field13', formData.privateDomesticAdoptionFingerprint);
    fillCheckbox(form, 'page5_field14', formData.privateGuardianshipNameBased);
    fillCheckbox(form, 'page5_field15', formData.privateInternationalAdoptionNameBased);
    
    // ==========================================
    // PAGE 6 - OKDHS Representative Info
    // Text Fields: page6_field7-16
    // Checkboxes: page6_field1-6
    // ==========================================
    
    fillTextField(form, 'page6_field7', formData.representativeName);
    fillTextField(form, 'page6_field8', formData.representativeTitle);
    fillTextField(form, 'page6_field9', formData.representativeMailingAddress);
    fillTextField(form, 'page6_field10', formData.representativeCity);
    fillTextField(form, 'page6_field11', formData.representativeState);
    fillTextField(form, 'page6_field12', formData.representativeZipCode);
    fillTextField(form, 'page6_field13', formData.representativePhone);
    fillTextField(form, 'page6_field14', formData.representativeFax);
    fillTextField(form, 'page6_field15', formData.representativeEmail);
    fillTextField(form, 'page6_field16', formData.representativeDate);
    
    // ==========================================
    // PAGE 8/9 - Consent Entity Name  
    // Text Fields: page8_field1, Date_2, Date_3
    // ==========================================
    
    fillTextField(form, 'page8_field1', formData.resourceFirstName1 + ' ' + formData.resourceLastName1);
    fillTextField(form, 'Date_2', formData.applicant1ConsentDate);
    fillTextField(form, 'Date_3', formData.applicant2ConsentDate);
    
    // ==========================================
    // PAGE 10 - Resource Family Application
    // Text Fields: 24 total for address and home info
    // Checkboxes: page9_field13,14,19,24,25,26,28,29
    // ==========================================
    
    fillTextField(form, 'page9_field1', formData.familyName || fullName);
    fillTextField(form, 'page9_field2', formData.physicalAddress || formData.streetAddress);
    fillTextField(form, 'page9_field3', formData.physicalCity || formData.city);
    fillTextField(form, 'page9_field4', formData.physicalState || formData.state);
    fillTextField(form, 'page9_field5', formData.physicalZipCode || formData.zipCode);
    fillTextField(form, 'page9_field6', formData.mailingAddress);
    fillTextField(form, 'page9_field7', formData.mailingCity);
    fillTextField(form, 'page9_field8', formData.mailingState);
    fillTextField(form, 'page9_field9', formData.mailingZipCode);
    fillTextField(form, 'page9_field11', formData.findingDirections);
    fillTextField(form, 'page9_field12', formData.homePhone);
    fillTextField(form, 'page9_field15', formData.cellPhone);
    fillTextField(form, 'page9_field16', formData.workPhone);
    fillTextField(form, 'page9_field17', formData.faxNumber);
    fillTextField(form, 'page9_field18', formData.email);
    fillTextField(form, 'page9_field20', formData.squareFootage);
    fillTextField(form, 'page9_field21', formData.numberOfBedrooms || formData.bedrooms);
    fillTextField(form, 'page9_field22', formData.bathrooms);
    fillTextField(form, 'page9_field23', formData.residenceYears);
    
    // Home Type checkboxes
    fillCheckbox(form, 'page9_field13', formData.homeType === 'rent');
    fillCheckbox(form, 'page9_field14', formData.homeType === 'own');
    
    // ==========================================
    // PAGE 10 - Resource Applicant 1 Info
    // Text Fields: 16 total
    // Checkboxes: 23 total
    // ==========================================
    
    fillTextField(form, 'page10_field1', formData.applicant1FirstName || formData.firstName);
    fillTextField(form, 'page10_field9', formData.applicant1MiddleName || formData.middleName);
    fillTextField(form, 'page10_field10', formData.applicant1LastName || formData.lastName);
    fillTextField(form, 'page10_field19', formData.applicant1OtherNames);
    fillTextField(form, 'page10_field20', formData.applicant1DateOfBirth || formData.dateOfBirth);
    fillTextField(form, 'page10_field21', formData.applicant1SSN || formData.ssn);
    fillTextField(form, 'page10_field22', formData.applicant1Gender || formData.sex);
    fillTextField(form, 'page10_field23', formData.applicant1Tribe);
    fillTextField(form, 'page10_field24', formData.applicant1HispanicLatino);
    fillTextField(form, 'page10_field25', formData.applicant1Race);
    fillTextField(form, 'page10_field26', formData.applicant1WorkPhone || formData.workPhone);
    fillTextField(form, 'page10_field27', formData.applicant1CellPhone || formData.cellPhone);
    fillTextField(form, 'page10_field28', formData.applicant1HomePhone || formData.homePhone);
    fillTextField(form, 'page10_field29', formData.applicant1Email || formData.email);
    fillTextField(form, 'page10_field30', formData.applicant1DriversLicense || formData.driversLicense);
    fillTextField(form, 'page10_field31', formData.applicant1DLState || formData.dlState);
    
    fillCheckbox(form, 'page10_field2', formData.applicant1OtherNamesNA);
    fillCheckbox(form, 'page10_field17', formData.applicant1TribeNA);
    fillCheckbox(form, 'page10_field32', formData.applicant1USCitizen === 'yes');
    fillCheckbox(form, 'page10_field33', formData.applicant1USCitizen === 'no');
    
    // ==========================================
    // PAGE 11 - Applicant 1 Employment & History
    // Text Fields: 15 total
    // Checkboxes: 6 total
    // ==========================================
    
    fillTextField(form, 'page11_field6', formData.applicant1StatesLived);
    fillTextField(form, 'page11_field7', formData.applicant1Employer || formData.employer);
    fillTextField(form, 'page11_field8', formData.applicant1Occupation || formData.occupation);
    fillTextField(form, 'page11_field9', formData.applicant1WorkAddress || formData.workAddress);
    fillTextField(form, 'page11_field10', formData.applicant1WorkCity);
    fillTextField(form, 'page11_field11', formData.applicant1WorkState);
    fillTextField(form, 'page11_field12', formData.applicant1WorkZipCode);
    fillTextField(form, 'page11_field16', formData.applicant1GrossIncome || formData.grossIncome);
    fillTextField(form, 'page11_field17', formData.applicant1WorkYears || formData.workYears);
    fillTextField(form, 'page11_field18', formData.applicant1MaritalStatus);
    fillTextField(form, 'page11_field19', formData.applicant1HighestGrade);
    fillTextField(form, 'page11_field20', formData.applicant1AdvancedDegree);
    
    fillCheckbox(form, 'page11_field1', formData.applicant1StatesLivedNA);
    fillCheckbox(form, 'page11_field2', formData.applicant1Employed === 'yes');
    fillCheckbox(form, 'page11_field3', formData.applicant1SelfEmployed === 'yes');
    
    // ==========================================
    // PAGE 12 - Applicant 2 Info (Spouse)
    // Text Fields: 30 total
    // Checkboxes: 2 total
    // ==========================================
    
    fillTextField(form, 'page12_field1', formData.applicant2FirstName || formData.spouseFirstName);
    fillTextField(form, 'page12_field2', formData.applicant2MiddleName || formData.spouseMiddleName);
    fillTextField(form, 'page12_field3', formData.applicant2LastName || formData.spouseLastName);
    fillTextField(form, 'page12_field4', formData.applicant2OtherNames);
    fillTextField(form, 'page12_field6', formData.applicant2DateOfBirth || formData.spouseDateOfBirth);
    fillTextField(form, 'page12_field7', formData.applicant2SSN || formData.spouseSSN);
    fillTextField(form, 'page12_field8', formData.applicant2Gender);
    fillTextField(form, 'page12_field9', formData.applicant2Tribe);
    fillTextField(form, 'page12_field11', formData.applicant2HispanicLatino);
    fillTextField(form, 'page12_field12', formData.applicant2Race);
    fillTextField(form, 'page12_field13', formData.applicant2WorkPhone);
    fillTextField(form, 'page12_field15', formData.applicant2CellPhone);
    fillTextField(form, 'page12_field19', formData.applicant2HomePhone);
    fillTextField(form, 'page12_field20', formData.applicant2Email);
    fillTextField(form, 'page12_field21', formData.spouseDriversLicense);
    fillTextField(form, 'page12_field22', formData.spouseDLState);
    fillTextField(form, 'page12_field23', formData.spouseEmployer);
    fillTextField(form, 'page12_field24', formData.spouseOccupation);
    fillTextField(form, 'page12_field25', formData.spouseWorkAddress);
    fillTextField(form, 'page12_field26', formData.spouseWorkYears);
    fillTextField(form, 'page12_field27', formData.spouseGrossIncome);
    
    // ==========================================
    // PAGE 13 - References
    // Text Fields: 5 total
    // Checkboxes: 2 total
    // ==========================================
    
    if (formData.references && formData.references[0]) {
      fillTextField(form, 'page13_field3', formData.references[0].firstName + ' ' + formData.references[0].lastName);
      fillTextField(form, 'page13_field4', formData.references[0].phoneNumber || formData.references[0].phone);
      fillTextField(form, 'page13_field5', formData.references[0].relationship);
    }
    if (formData.references && formData.references[1]) {
      fillTextField(form, 'page13_field6', formData.references[1].firstName + ' ' + formData.references[1].lastName);
      fillTextField(form, 'page13_field7', formData.references[1].phoneNumber || formData.references[1].phone);
    }
    
    // ==========================================
    // PAGE 14 - Background Questions
    // Text Fields: page14_field9
    // Checkboxes: 10 total
    // ==========================================
    
    fillCheckbox(form, 'page14_field1', formData.criminalHistory);
    fillCheckbox(form, 'page14_field2', formData.childAbuseHistory);
    fillCheckbox(form, 'page14_field3', formData.substanceAbuseHistory);
    fillCheckbox(form, 'page14_field4', formData.applicant1ArrestedCharges === 'yes');
    fillCheckbox(form, 'page14_field5', formData.applicant1PleaGuilty === 'yes');
    fillCheckbox(form, 'page14_field6', formData.applicant1InvestigatedAbuse === 'yes');
    fillCheckbox(form, 'page14_field7', formData.applicant1PreviousFosterApply === 'yes');
    fillCheckbox(form, 'page14_field8', formData.applicant1ProtectiveOrder === 'yes');
    fillTextField(form, 'page14_field9', formData.criminalDetails || formData.childAbuseDetails || formData.substanceAbuseDetails);
    
    // ==========================================
    // PAGE 15 - Required Documents Checklist
    // Text Fields: page15_field2,6,21
    // Checkboxes: 19 total
    // ==========================================
    
    fillCheckbox(form, 'page15_field1', formData.requiredMedicalExam);
    fillTextField(form, 'page15_field2', formData.medicalExamAppointmentDate);
    fillCheckbox(form, 'page15_field3', formData.requiredFinancialAssessment);
    fillCheckbox(form, 'page15_field4', formData.requiredParentHealthHistory);
    fillCheckbox(form, 'page15_field5', formData.requiredChildHealthStatement);
    fillTextField(form, 'page15_field6', formData.childHealthAppointmentDate);
    fillCheckbox(form, 'page15_field7', formData.requiredCDIB);
    fillCheckbox(form, 'page15_field8', formData.requiredMarriageLicense);
    fillCheckbox(form, 'page15_field9', formData.requiredDD214);
    fillCheckbox(form, 'page15_field10', formData.requiredDriverLicense);
    fillCheckbox(form, 'page15_field11', formData.requiredImmunization);
    fillCheckbox(form, 'page15_field12', formData.requiredPaycheckStub);
    fillCheckbox(form, 'page15_field13', formData.requiredPetVaccination);
    fillCheckbox(form, 'page15_field14', formData.requiredSocialSecurity);
    fillCheckbox(form, 'page15_field15', formData.requiredFingerprints);
    fillCheckbox(form, 'page15_field16', formData.requiredLawfulResidence);
    fillCheckbox(form, 'page15_field17', formData.requiredDivorceDecrees);
    fillCheckbox(form, 'page15_field18', formData.requiredAutoInsurance);
    fillCheckbox(form, 'page15_field19', formData.requiredChildCareApplication);
    fillCheckbox(form, 'page15_field20', formData.requiredOtherAdults);
    fillTextField(form, 'page15_field21', formData.requiredOtherSpecifyText);
    fillCheckbox(form, 'page15_field22', formData.requiredOtherSpecify);
    
    // ==========================================
    // SIGNATURE DATES (Special Fields)
    // ==========================================
    
    fillTextField(form, 'Date_4', formData.applicant1SignatureDate || formData.signatureDate);
    fillTextField(form, 'Date_5', formData.applicant2SignatureDate);
    fillTextField(form, 'Date_6', formData.adultMember1SignatureDate);
    fillTextField(form, 'Date_7', formData.adultMember2SignatureDate);
    
    // Extra text fields
    fillTextField(form, 'Text_1', formData.reasonForFostering);
    fillTextField(form, 'Text_2', formData.childCareExperience);
    fillTextField(form, 'Text_3', formData.preferredAgeRange);
    const emergencyContact = [formData.emergencyName, formData.emergencyPhone].filter(Boolean).join(' - ');
    fillTextField(form, 'Text_4', emergencyContact);
    
    console.log('[PDF] Government PDF filled successfully');
    
    // ==========================================
    // EMBED SIGNATURE IMAGES
    // ==========================================
    
    // Note: These positions need to be adjusted based on your actual PDF template
    // You may need to experiment with x, y coordinates to align properly
    // PDF coordinates start from bottom-left corner
    
    // Embed main applicant signature (Page 3 - PDF page index 2)
    // PAGE 3 has page2_field53 (signature) and page2_field54 (date) fields
    if (formData.applicantSignature && formData.applicantSignature.startsWith('data:image')) {
      await embedSignatureImage(pdfDoc, 2, formData.applicantSignature, {
        x: 50,  // Adjust these coordinates based on your PDF
        y: 150,
        width: 200,
        height: 50
      });
    }
    
    // Embed consent signatures (Page 9 - PDF page index 8)
    // PAGE 9 has Signature_2 and Signature_3 fields
    if (formData.applicant1ConsentSignature && formData.applicant1ConsentSignature.startsWith('data:image')) {
      await embedSignatureImage(pdfDoc, 8, formData.applicant1ConsentSignature, {
        x: 50,
        y: 200,
        width: 180,
        height: 45
      });
    }
    
    if (formData.applicant2ConsentSignature && formData.applicant2ConsentSignature.startsWith('data:image')) {
      await embedSignatureImage(pdfDoc, 8, formData.applicant2ConsentSignature, {
        x: 50,
        y: 100,
        width: 180,
        height: 45
      });
    }
    
    // Embed driver records request signatures (PAGE 1 - Driver Records page)
    // Based on DEBUG PDF, signatures are page1_field23 and page1_field25
    if (formData.personNamedSignature && formData.personNamedSignature.startsWith('data:image')) {
      await embedSignatureImage(pdfDoc, 1, formData.personNamedSignature, {
        x: 360,
        y: 330,
        width: 180,
        height: 35
      });
    }
    
    if (formData.personMakingSignature && formData.personMakingSignature.startsWith('data:image')) {
      await embedSignatureImage(pdfDoc, 1, formData.personMakingSignature, {
        x: 360,
        y: 190,
        width: 180,
        height: 35
      });
    }
    
    // Embed resource family application signatures (Page 14)
    if (formData.applicant1Signature && formData.applicant1Signature.startsWith('data:image')) {
      await embedSignatureImage(pdfDoc, 13, formData.applicant1Signature, {
        x: 50,
        y: 400,
        width: 200,
        height: 50
      });
    }
    
    if (formData.applicant2Signature && formData.applicant2Signature.startsWith('data:image')) {
      await embedSignatureImage(pdfDoc, 13, formData.applicant2Signature, {
        x: 50,
        y: 330,
        width: 200,
        height: 50
      });
    }
    
    // Embed adult household member signatures (Page 14)
    const adultMemberPositions = [
      { y: 260 },
      { y: 190 },
      { y: 120 },
      { y: 50 }
    ];
    
    for (let i = 1; i <= 4; i++) {
      const signature = formData[`adultMember${i}Signature`];
      if (signature && signature.startsWith('data:image')) {
        await embedSignatureImage(pdfDoc, 13, signature, {
          x: 50,
          y: adultMemberPositions[i - 1].y,
          width: 180,
          height: 40
        });
      }
    }
    
    console.log('[PDF] Signature images embedded successfully');
    
    // Save and return the filled PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    throw error;
  }
}

/**
 * Safely fill a text field, ignoring if field doesn't exist
 */
function fillTextField(form, fieldName, value) {
  if (!value) return;
  try {
    const field = form.getTextField(fieldName);
    if (field) {
      field.setText(String(value));
    }
  } catch (e) {
    // Field doesn't exist or is wrong type, skip it
  }
}

/**
 * Safely fill a checkbox field
 */
function fillCheckbox(form, fieldName, value) {
  if (!value) return;
  try {
    const field = form.getCheckBox(fieldName);
    if (field && value) {
      field.check();
    }
  } catch (e) {
    // Field doesn't exist or is wrong type, skip it
  }
}

/**
 * Embed a signature image (base64 data URL) into the PDF at specified location
 * @param {PDFDocument} pdfDoc - The PDF document
 * @param {number} pageIndex - The page number (0-indexed)
 * @param {string} signatureDataURL - The base64 data URL of the signature
 * @param {object} position - {x, y, width, height} position on the page
 */
async function embedSignatureImage(pdfDoc, pageIndex, signatureDataURL, position) {
  if (!signatureDataURL || !signatureDataURL.startsWith('data:image')) {
    return; // Not a valid signature image
  }

  try {
    // Extract base64 data from data URL
    const base64Data = signatureDataURL.split(',')[1];
    const imageBytes = Buffer.from(base64Data, 'base64');
    
    // Embed the image (supports both PNG and JPEG)
    let signatureImage;
    if (signatureDataURL.includes('image/png')) {
      signatureImage = await pdfDoc.embedPng(imageBytes);
    } else if (signatureDataURL.includes('image/jpeg') || signatureDataURL.includes('image/jpg')) {
      signatureImage = await pdfDoc.embedJpg(imageBytes);
    } else {
      console.error('[PDF] Unsupported signature image format');
      return;
    }
    
    // Get the page
    const pages = pdfDoc.getPages();
    const page = pages[pageIndex];
    
    // Draw the signature image
    const { width, height } = position;
    page.drawImage(signatureImage, {
      x: position.x,
      y: position.y,
      width: width,
      height: height,
    });
    
    console.log(`[PDF] Embedded signature on page ${pageIndex + 1}`);
  } catch (error) {
    console.error('[PDF] Error embedding signature image:', error);
    // Continue without the signature rather than failing
  }
}
