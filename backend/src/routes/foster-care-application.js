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
    
    // Previous Five Years Residency
    // N/A Checkbox = page2_field44
    fillCheckbox(form, 'page2_field44', formData.previousResidencyNA);
    
    // Row 1: State=field45, Start=field47, End=field48 (based on debug testing)
    if (formData.previousResidency && formData.previousResidency[0]) {
      fillTextField(form, 'page2_field45', formData.previousResidency[0].state);     // State row 1
      fillTextField(form, 'page2_field47', formData.previousResidency[0].startDate); // Start row 1
      fillTextField(form, 'page2_field48', formData.previousResidency[0].endDate);   // End row 1
    }
    // Row 2: State=field46, Start=field50, End=field51 (based on debug testing)
    if (formData.previousResidency && formData.previousResidency[1]) {
      fillTextField(form, 'page2_field46', formData.previousResidency[1].state);     // State row 2
      fillTextField(form, 'page2_field50', formData.previousResidency[1].startDate); // Start row 2
      fillTextField(form, 'page2_field51', formData.previousResidency[1].endDate);   // End row 2
    }
    // Row 3: State=field49, Start=field53, End=field54 (based on debug testing)
    if (formData.previousResidency && formData.previousResidency[2]) {
      fillTextField(form, 'page2_field49', formData.previousResidency[2].state);     // State row 3
      fillTextField(form, 'page2_field53', formData.previousResidency[2].startDate); // Start row 3
      fillTextField(form, 'page2_field54', formData.previousResidency[2].endDate);   // End row 3
    }
    
    // Applicant Signature on Page 2 - embedded as image only, no text fields
    // Signature is handled by embedSignatureImage() function, no field mapping needed here
    
    // ==========================================
    // PAGE 3 - Countries Lived In & Consent Checkboxes
    // ==========================================
    
    // Countries lived in (other than USA) - your 1-11
    // 1 = N/A checkbox
    fillCheckbox(form, 'page3_field1', formData.internationalResidencyNA);
    
    // 2 = Country HEADING - DO NOT MAP (PDF error - editable header)
    // Leave page3_field2 empty!
    
    // Row 1 (your 3, 4, 5) - frontend uses internationalResidency array
    if (formData.internationalResidency && formData.internationalResidency[0]) {
      fillTextField(form, 'page3_field3', formData.internationalResidency[0].country);   // 3 = Country row 1
      fillTextField(form, 'page3_field4', formData.internationalResidency[0].startDate); // 4 = Start row 1
      fillTextField(form, 'page3_field5', formData.internationalResidency[0].endDate);   // 5 = End row 1
    }
    // Row 2 (your 6, 7, 8)
    if (formData.internationalResidency && formData.internationalResidency[1]) {
      fillTextField(form, 'page3_field6', formData.internationalResidency[1].country);   // 6 = Country row 2
      fillTextField(form, 'page3_field7', formData.internationalResidency[1].startDate); // 7 = Start row 2
      fillTextField(form, 'page3_field8', formData.internationalResidency[1].endDate);   // 8 = End row 2
    }
    // Row 3 (your 9, 10, 11)
    if (formData.internationalResidency && formData.internationalResidency[2]) {
      fillTextField(form, 'page3_field9', formData.internationalResidency[2].country);   // 9 = Country row 3
      fillTextField(form, 'page3_field10', formData.internationalResidency[2].startDate); // 10 = Start row 3
      fillTextField(form, 'page3_field11', formData.internationalResidency[2].endDate);   // 11 = End row 3
    }
    
    // Have you ever been convicted of a crime? (your 12, 13) - frontend uses convictedOfCrime boolean
    fillCheckbox(form, 'page3_field12', formData.convictedOfCrime === true);  // 12 = Yes
    fillCheckbox(form, 'page3_field13', formData.convictedOfCrime === false); // 13 = No
    
    // 14 = "If yes, explain:" - multiline text field (frontend uses crimeExplanation)
    fillTextField(form, 'Text_1', formData.crimeExplanation);
    
    // Consent and Signature checkboxes (your 15-19 = field14-19) - frontend uses consentXxx names
    fillCheckbox(form, 'page3_field14', formData.consentBackgroundCheck);  // OKDHS will evaluate
    fillCheckbox(form, 'page3_field15', formData.consentChildAbuseCheck);  // child abuse and neglect
    fillCheckbox(form, 'page3_field16', formData.consentRestrictedRegistry); // Restricted Registry
    fillCheckbox(form, 'page3_field17', formData.consentFingerprints);     // OSBI fingerprints
    fillCheckbox(form, 'page3_field18', formData.consentFBICheck);         // FBI fingerprints
    fillCheckbox(form, 'page3_field19', formData.consentFBIChallenge);     // FBI challenge
    
    // ==========================================
    // BOTTOM OF PAGE 3 / TOP OF PAGE 4 - Background Check Purpose
    // User's numbering from screenshot (your 1-24+)
    // ==========================================
    
    // 1 = Privacy policy checkbox (top of next section)
    fillCheckbox(form, 'page4_field1', formData.privacyPolicyAccepted);
    
    // 2 = Signature line (no fillable field - embedded as image)
    // 3 = Date next to signature - need to find which field this is
    
    // Background Check Purpose checkboxes (your 4 onwards)
    // 4 = Child Welfare Name Based (main category)
    fillCheckbox(form, 'page4_field4', formData.childWelfareNameBased);
    
    // 5 = Adoption
    fillCheckbox(form, 'page4_field5', formData.adoption);
    // 6 = Indian Child Welfare (ICW) or tribal adoption  
    fillCheckbox(form, 'page4_field6', formData.indianChildWelfareAdoption);
    // 7 = OKDHS adoption
    fillCheckbox(form, 'page4_field7', formData.okdhsAdoption);
    
    // 8 = Erica's Rule
    fillCheckbox(form, 'page4_field8', formData.ericasRule);
    // 9 = Erica's rule (sub-checkbox)
    fillCheckbox(form, 'page4_field9', formData.ericasRuleSub);
    
    // 10 = Foster Care (main category)
    fillCheckbox(form, 'page4_field10', formData.fosterCare);
    // 11 = Contracted resource family partnership (RFP)
    fillCheckbox(form, 'page4_field11', formData.contractedResourceFamily);
    // 12 = Kinship - non-relative
    fillCheckbox(form, 'page4_field12', formData.kinshipNonRelative);
    // 13 = Kinship - relative
    fillCheckbox(form, 'page4_field13', formData.kinshipRelative);
    // 14 = Therapeutic foster care (TFC)
    fillCheckbox(form, 'page4_field14', formData.therapeuticFosterCare);
    // 15 = Traditional foster care
    fillCheckbox(form, 'page4_field15', formData.traditionalFosterCare);
    
    // 16 = Guardianship
    fillCheckbox(form, 'page4_field16', formData.guardianship);
    // 17 = ICW or tribal guardianship
    fillCheckbox(form, 'page4_field17', formData.icwTribalGuardianship);
    // 18 = OKDHS guardianship
    fillCheckbox(form, 'page4_field18', formData.okdhsGuardianship);
    
    // 19 = Immediate Protective Action Plan (IPAP)
    fillCheckbox(form, 'page4_field19', formData.ipap);
    // 20 = Immediate Protective Action Plan (IPAP) sub
    fillCheckbox(form, 'page4_field20', formData.ipapSub);
    
    // 21 = Indian Child Welfare (ICW) or tribal foster care (main)
    fillCheckbox(form, 'page4_field21', formData.indianChildWelfareFoster);
    // 22 = Indian Child Welfare (ICW) or tribal foster care (sub)
    fillCheckbox(form, 'page4_field22', formData.indianChildWelfareFosterSub);
    
    // 23 = Re-issue child welfare name based result within last 30 calendar days
    fillCheckbox(form, 'page4_field23', formData.reissueChildWelfare);
    // 24 = Re-issue previous results only
    fillCheckbox(form, 'page4_field24', formData.reissuePreviousOnly);
    
    // ==========================================
    // PAGE 5 - Fingerprint-Based Options (28 checkboxes, your 1-28)
    // ==========================================
    
    // 1 = Safety Plan Monitor
    fillCheckbox(form, 'page5_field1', formData.safetyPlanMonitor);
    // 2 = Safety Plan Monitor (sub)
    fillCheckbox(form, 'page5_field2', formData.safetyPlanMonitorSub);
    
    // 3 = OKDHS trial reunification
    fillCheckbox(form, 'page5_field3', formData.okdhsTrialReunification);
    // 4 = OKDHS trial Reunification (sub)
    fillCheckbox(form, 'page5_field4', formData.okdhsTrialReunificationSub);
    
    // 5 = Volunteer
    fillCheckbox(form, 'page5_field5', formData.volunteer);
    // 6 = Volunteer (sub)
    fillCheckbox(form, 'page5_field6', formData.volunteerSub);
    
    // 7 = Child Welfare Fingerprint Based (main category)
    fillCheckbox(form, 'page5_field7', formData.childWelfareFingerprintBased);
    
    // 8 = Adoption
    fillCheckbox(form, 'page5_field8', formData.adoptionFingerprint);
    // 9 = Indian Child Welfare (ICW) or tribal adoption
    fillCheckbox(form, 'page5_field9', formData.icwTribalAdoptionFingerprint);
    // 10 = OKDHS adoption
    fillCheckbox(form, 'page5_field10', formData.okdhsAdoptionFingerprint);
    
    // 11 = Foster Care
    fillCheckbox(form, 'page5_field11', formData.fosterCareFingerprint);
    // 12 = Contracted resource family partnership (RFP) agency
    fillCheckbox(form, 'page5_field12', formData.rfpAgency);
    // 13 = Developmental Disability Services (DDS) specialized foster care
    fillCheckbox(form, 'page5_field13', formData.ddsSpecializedFosterCare);
    // 14 = Emergency after hours placement-follow up (Purpose Code X)
    fillCheckbox(form, 'page5_field14', formData.emergencyAfterHours);
    // 15 = Indian Child Welfare (ICW) or tribal foster care
    fillCheckbox(form, 'page5_field15', formData.icwTribalFosterCareFingerprint);
    // 16 = OKDHS foster care
    fillCheckbox(form, 'page5_field16', formData.okdhsFosterCareFingerprint);
    // 17 = Therapeutic foster care (TFC)
    fillCheckbox(form, 'page5_field17', formData.therapeuticFosterCareFingerprint);
    
    // 18 = Guardianship
    fillCheckbox(form, 'page5_field18', formData.guardianshipFingerprint);
    // 19 = Indian Child Welfare (ICW) or tribal guardianship
    fillCheckbox(form, 'page5_field19', formData.icwTribalGuardianshipFingerprint);
    // 20 = OKDHS guardianship
    fillCheckbox(form, 'page5_field20', formData.okdhsGuardianshipFingerprint);
    
    // 21 = Host Homes
    fillCheckbox(form, 'page5_field21', formData.hostHomes);
    // 22 = Host homes (sub)
    fillCheckbox(form, 'page5_field22', formData.hostHomesSub);
    
    // 23 = Immediate Protective Action Plan (IPAP) or Safety Plan
    fillCheckbox(form, 'page5_field23', formData.ipapSafetyPlan);
    // 24 = Immediate Protective Action Plan (IPAP) or Safety Plan (sub)
    fillCheckbox(form, 'page5_field24', formData.ipapSafetyPlanSub);
    
    // 25 = Re-issue child welfare fingerprint result within last five years
    fillCheckbox(form, 'page5_field25', formData.reissueChildWelfareFingerprint);
    // 26 = Re-issue previous results only
    fillCheckbox(form, 'page5_field26', formData.reissueFingerprintPreviousOnly);
    
    // 27 = Trial reunification
    fillCheckbox(form, 'page5_field27', formData.trialReunification);
    // 28 = Trial Reunification (sub)
    fillCheckbox(form, 'page5_field28', formData.trialReunificationSub);
    
    // ==========================================
    // PAGE 6 - Private Child Welfare + OKDHS Representative Info (your 1-16)
    // ==========================================
    
    // Private Child Welfare checkboxes (your 1-6)
    // 1 = Private Child Welfare (main category)
    fillCheckbox(form, 'page6_field1', formData.privateChildWelfare);
    // 2 = Private Adoption
    fillCheckbox(form, 'page6_field2', formData.privateAdoption);
    // 3 = Private adoption - name based
    fillCheckbox(form, 'page6_field3', formData.privateAdoptionNameBased);
    // 4 = Private domestic adoption - fingerprint based
    fillCheckbox(form, 'page6_field4', formData.privateDomesticAdoptionFingerprint);
    // 5 = Private guardianship - name based
    fillCheckbox(form, 'page6_field5', formData.privateGuardianshipNameBased);
    // 6 = Private international adoption - name based
    fillCheckbox(form, 'page6_field6', formData.privateInternationalAdoptionNameBased);
    
    // OKDHS Representative or Requesting Authority text fields (your 7-16)
    // 7 = UE ID# field
    fillTextField(form, 'page6_field7', formData.ueId);
    // 8 = Name (left field in Name/Title row)
    fillTextField(form, 'page6_field8', formData.representativeName);
    // 9 = Title (right field in Name/Title row)
    fillTextField(form, 'page6_field9', formData.representativeTitle);
    // 10 = Mailing address
    fillTextField(form, 'page6_field10', formData.representativeMailingAddress);
    // 11 = City
    fillTextField(form, 'page6_field11', formData.representativeCity);
    // 12 = State (note: field12 and field13 positions are swapped in PDF)
    fillTextField(form, 'page6_field12', formData.representativeState);
    // 13 = ZIP code
    fillTextField(form, 'page6_field13', formData.representativeZipCode);
    // 14 = Phone number
    fillTextField(form, 'page6_field14', formData.representativePhone);
    // 15 = Fax number
    fillTextField(form, 'page6_field15', formData.representativeFax);
    // 16 = Email
    fillTextField(form, 'page6_field16', formData.representativeEmail);
    
    // ==========================================
    // PAGE 7 - Consent for Release of Information (your 1-28)
    // ==========================================
    
    // Resource Applicant Information (your 1-6)
    // 1 = First name (applicant 1)
    fillTextField(form, 'page7_field1', formData.resourceFirstName1 || formData.applicant1FirstName || formData.firstName);
    // 2 = Last name (applicant 1)
    fillTextField(form, 'page7_field2', formData.resourceLastName1 || formData.applicant1LastName || formData.lastName);
    // 3 = First name (applicant 2)
    fillTextField(form, 'page7_field3', formData.resourceFirstName2 || formData.applicant2FirstName || formData.spouseFirstName);
    // 4 = Last name (applicant 2)
    fillTextField(form, 'page7_field4', formData.resourceLastName2 || formData.applicant2LastName || formData.spouseLastName);
    // 5 = Individual or agency name
    fillTextField(form, 'page7_field5', formData.authorizedIndividualName || 'Open Arms Foster Care');
    // 6 = Individual or agency address
    fillTextField(form, 'page7_field6', formData.authorizedIndividualAddress || formData.physicalAddress || formData.streetAddress);
    
    // Information to Include checkboxes (your 7-28, Yes/No pairs)
    // 7-8 = First and last name (Yes/No)
    fillCheckbox(form, 'page7_field7', formData.includeFirstLastName === true);
    fillCheckbox(form, 'page7_field8', formData.includeFirstLastName === false);
    // 9-10 = Phone number (Yes/No)
    fillCheckbox(form, 'page7_field11', formData.includePhoneNumber === true);
    fillCheckbox(form, 'page7_field12', formData.includePhoneNumber === false);
    // 11-12 = Identified church home (Yes/No)
    fillCheckbox(form, 'page7_field15', formData.includeChurchHome === true);
    fillCheckbox(form, 'page7_field16', formData.includeChurchHome === false);
    // 13-14 = Application provided (Yes/No)
    fillCheckbox(form, 'page7_field19', formData.includeApplicationProvided === true);
    fillCheckbox(form, 'page7_field20', formData.includeApplicationProvided === false);
    // 15-16 = Application completed (Yes/No)
    fillCheckbox(form, 'page7_field23', formData.includeApplicationCompleted === true);
    fillCheckbox(form, 'page7_field24', formData.includeApplicationCompleted === false);
    // 17-18 = Identified agency (Yes/No)
    fillCheckbox(form, 'page7_field27', formData.includeAgency === true);
    fillCheckbox(form, 'page7_field28', formData.includeAgency === false);
    // 19-20 = Initial paperwork completed (Yes/No)
    fillCheckbox(form, 'page7_field9', formData.includeInitialPaperwork === true);
    fillCheckbox(form, 'page7_field10', formData.includeInitialPaperwork === false);
    // 21-22 = Training started (Yes/No)
    fillCheckbox(form, 'page7_field13', formData.includeTrainingStarted === true);
    fillCheckbox(form, 'page7_field14', formData.includeTrainingStarted === false);
    // 23-24 = Training completed (Yes/No)
    fillCheckbox(form, 'page7_field17', formData.includeTrainingCompleted === true);
    fillCheckbox(form, 'page7_field18', formData.includeTrainingCompleted === false);
    // 25-26 = Home study started (Yes/No)
    fillCheckbox(form, 'page7_field21', formData.includeHomeStudyStarted === true);
    fillCheckbox(form, 'page7_field22', formData.includeHomeStudyStarted === false);
    // 27-28 = Home study completed (Yes/No)
    fillCheckbox(form, 'page7_field25', formData.includeHomeStudyCompleted === true);
    fillCheckbox(form, 'page7_field26', formData.includeHomeStudyCompleted === false);
    
    // ==========================================
    // PAGE 8 - Consent Signatures (your 1-5)
    // ==========================================
    
    // 1 = Applicant signature 1 (embedded as image, not mapped here)
    // 2 = Date 1
    fillTextField(form, 'Date_2', formData.applicant1ConsentDate);
    // 3 = Applicant signature 2 (embedded as image, not mapped here)
    // 4 = Date 2
    fillTextField(form, 'Date_3', formData.applicant2ConsentDate);
    // 5 = Entity name
    fillTextField(form, 'page8_field1', formData.consentEntityName);
    
    // ==========================================
    // PAGE 9 - General Information + Resource Applicant 1 (your 1-33)
    // ==========================================
    
    // General Information (your 1-14)
    // 1 = Family name - This is likely page9_field1 based on y position
    fillTextField(form, 'page9_field1', formData.familyName || fullName);
    // 2 = Physical address (page9_field2 y:574)
    fillTextField(form, 'page9_field2', formData.physicalAddress || formData.streetAddress);
    // 3 = Physical city (page9_field3 y:575)
    fillTextField(form, 'page9_field3', formData.physicalCity || formData.city);
    // 4 = Physical state (page9_field4 y:575)
    fillTextField(form, 'page9_field4', formData.physicalState || formData.state);
    // 5 = Physical ZIP (page9_field5 y:575)
    fillTextField(form, 'page9_field5', formData.physicalZipCode || formData.zipCode);
    // 6 = Mailing address (page9_field6 y:539)
    fillTextField(form, 'page9_field6', formData.mailingAddress);
    // 7 = Mailing city (page9_field7 y:540)
    fillTextField(form, 'page9_field7', formData.mailingCity);
    // 8 = Mailing state (page9_field8 y:540)
    fillTextField(form, 'page9_field8', formData.mailingState);
    // 9 = Mailing ZIP (page9_field9 y:540)
    fillTextField(form, 'page9_field9', formData.mailingZipCode);
    // Finding directions to home (Text_2 field based on debug PDF)
    fillTextField(form, 'Text_2', formData.findingDirections);
    // Square footage (page9_field11 from debug PDF)
    fillTextField(form, 'page9_field11', formData.squareFootage);
    // Number of bedrooms (page9_field12)
    fillTextField(form, 'page9_field12', formData.numberOfBedrooms || formData.bedrooms);
    // Home: Rent checkbox (page9_field13)
    fillCheckbox(form, 'page9_field13', formData.homeRent);
    // Home: Own checkbox (page9_field14)
    fillCheckbox(form, 'page9_field14', formData.homeOwn);
    
    // ==========================================
    // RESOURCE APPLICANT 1 - Still on PDF Page 10 (uses page9_field*)
    // Based on debug PDF screenshot showing actual field positions
    // ==========================================
    
    // First name (page9_field17 from debug PDF)
    fillTextField(form, 'page9_field17', formData.applicant1FirstName || formData.firstName);
    // Middle name (page9_field15 from debug PDF)
    fillTextField(form, 'page9_field15', formData.applicant1MiddleName);
    // Last name (page9_field16 from debug PDF)
    fillTextField(form, 'page9_field16', formData.applicant1LastName || formData.lastName);
    // Other names / maiden name (page9_field18 from debug PDF)
    fillTextField(form, 'page9_field18', formData.applicant1OtherNames);
    // Date of birth (page9_field21 from debug PDF)
    fillTextField(form, 'page9_field21', formData.applicant1DateOfBirth || formData.dateOfBirth);
    // Social Security number (page9_field22 from debug PDF)
    fillTextField(form, 'page9_field22', formData.applicant1SSN || formData.ssn);
    // Gender (page9_field20 from debug PDF)
    fillTextField(form, 'page9_field20', formData.applicant1Gender || formData.gender);
    // Tribe, if applicable (page9_field23 from debug PDF)
    fillTextField(form, 'page9_field23', formData.applicant1Tribe);
    // Race (page9_field27 from debug PDF)
    fillTextField(form, 'page9_field27', formData.applicant1Race || formData.race);
    // Work phone (page9_field30 from debug PDF)
    fillTextField(form, 'page9_field30', formData.applicant1WorkPhone || formData.workPhone);
    // Cell phone (page9_field31 from debug PDF)
    fillTextField(form, 'page9_field31', formData.applicant1CellPhone || formData.cellPhone);
    // Home phone (page9_field32 from debug PDF)
    fillTextField(form, 'page9_field32', formData.applicant1HomePhone || formData.homePhone);
    // Email address (page9_field33 from debug PDF)
    fillTextField(form, 'page9_field33', formData.applicant1Email || formData.email);
    
    // ==========================================
    // PAGE 11 - Applicant 1 Employment & Additional Information
    // PDF Page 11 uses page10_field* (off-by-one naming)
    // Based on debug PDF screenshot showing actual field positions
    // ==========================================
    
    // States lived in last 5 years (page10_field1 from debug PDF)
    fillTextField(form, 'page10_field1', formData.applicant1StatesLived || formData.statesLived);
    
    // Number of previous marriages (page10_field9 from debug PDF)
    fillTextField(form, 'page10_field9', formData.applicant1PreviousMarriages || formData.previousMarriages);
    
    // Highest grade completed (page10_field10 from debug PDF)
    fillTextField(form, 'page10_field10', formData.applicant1HighestGrade || formData.highestGrade);
    
    // Unemployed section (page10_field19, 20, 21 from debug PDF)
    fillTextField(form, 'page10_field19', formData.applicant1UnemployedLabel || formData.unemployedStartDate);
    fillTextField(form, 'page10_field20', formData.applicant1UnemployedSourceOfIncome || formData.unemployedSourceOfIncome);
    fillTextField(form, 'page10_field21', formData.applicant1UnemployedTakeHome || formData.unemployedTakeHome);
    
    // Employed (Non Self-Employment) section
    // Employment start dates (page10_field22, 23 from debug PDF)
    fillTextField(form, 'page10_field22', formData.applicant1EmploymentStartDate || formData.employmentStartDate);
    fillTextField(form, 'page10_field23', formData.applicant1EmploymentEndDate || formData.employmentEndDate);
    // Source of income (page10_field24 from debug PDF)
    fillTextField(form, 'page10_field24', formData.applicant1EmployedIncome || formData.employedSourceOfIncome);
    // Total approximate monthly take-home pay (page10_field25 from debug PDF)
    fillTextField(form, 'page10_field25', formData.applicant1EmployedTakeHome || formData.employedTakeHome);
    // Employer name (page10_field26 from debug PDF)
    fillTextField(form, 'page10_field26', formData.applicant1EmployerName || formData.employerName);
    // Job title (page10_field27 from debug PDF)
    fillTextField(form, 'page10_field27', formData.applicant1JobTitle || formData.jobTitle);
    // Supervisor's name (page10_field28 from debug PDF)
    fillTextField(form, 'page10_field28', formData.applicant1SupervisorName || formData.supervisorName);
    // Supervisor's phone number (page10_field29 from debug PDF)
    fillTextField(form, 'page10_field29', formData.applicant1SupervisorPhone || formData.supervisorPhone);
    // Supervisor's email address (page10_field30 from debug PDF)
    fillTextField(form, 'page10_field30', formData.applicant1SupervisorEmail || formData.supervisorEmail);
    
    // Self-Employment section
    // Total approximate monthly take-home pay (page10_field31 from debug PDF)
    fillTextField(form, 'page10_field31', formData.applicant1SelfEmployedTakeHome || formData.selfEmployedTakeHome);
    
    // Page 11 Checkboxes (based on debug PDF testing)
    // N/A checkbox for states lived
    fillCheckbox(form, 'page10_field2', formData.statesLivedNA);
    // Marital status checkboxes
    fillCheckbox(form, 'page10_field3', formData.maritalStatus === 'single');
    fillCheckbox(form, 'page10_field4', formData.maritalStatus === 'unmarried couple');
    fillCheckbox(form, 'page10_field5', formData.maritalStatus === 'married');
    fillCheckbox(form, 'page10_field6', formData.maritalStatus === 'divorced');
    fillCheckbox(form, 'page10_field7', formData.maritalStatus === 'widowed');
    fillCheckbox(form, 'page10_field8', formData.maritalStatus === 'separated');
    // Advanced degree Yes/No
    fillCheckbox(form, 'page10_field11', formData.advancedDegree === 'yes' || formData.advancedDegree === true);
    fillCheckbox(form, 'page10_field12', formData.advancedDegree === 'no' || formData.advancedDegree === false);
    // Armed forces Yes/No
    fillCheckbox(form, 'page10_field13', formData.armedForces === 'yes' || formData.armedForces === true);
    fillCheckbox(form, 'page10_field14', formData.armedForces === 'no' || formData.armedForces === false);
    // Are you employed? Yes/No
    fillCheckbox(form, 'page10_field15', formData.isEmployed === 'yes' || formData.isEmployed === true);
    fillCheckbox(form, 'page10_field16', formData.isEmployed === 'no' || formData.isEmployed === false);
    // Are you self-employed? Yes/No
    fillCheckbox(form, 'page10_field17', formData.isSelfEmployed === 'yes' || formData.isSelfEmployed === true);
    fillCheckbox(form, 'page10_field18', formData.isSelfEmployed === 'no' || formData.isSelfEmployed === false);
    
    // ==========================================
    // PAGE 12 - Household Members, Children Not in Home, References
    // PDF Page 12 uses page11_field* (off-by-one naming)
    // Based on debug PDF testing with real data
    // ==========================================
    
    // N/A checkbox for Other Household Members
    fillCheckbox(form, 'page11_field1', formData.householdMembersNA);
    
    // Household Member 1 (based on real data test)
    if (formData.householdMembers && formData.householdMembers[0]) {
      fillTextField(form, 'page11_field8', formData.householdMembers[0].firstName);       // First name
      fillTextField(form, 'page11_field6', formData.householdMembers[0].middleName);      // Middle name
      fillTextField(form, 'page11_field9', formData.householdMembers[0].lastName);        // Last name
      fillTextField(form, 'page11_field7', formData.householdMembers[0].dateOfBirth);     // DOB
      fillTextField(form, 'page11_field10', formData.householdMembers[0].gender);         // Gender
      fillTextField(form, 'page11_field11', formData.householdMembers[0].ssn);            // SSN
      fillTextField(form, 'page11_field12', formData.householdMembers[0].relationship);   // Relationship
    }
    
    // K-12 school checkboxes
    fillCheckbox(form, 'page11_field13', formData.householdMemberK12 === 'yes');  // Yes
    fillCheckbox(form, 'page11_field14', formData.householdMemberK12 === 'no');   // No
    
    // N/A checkbox for Children Under 18 Not Living in Home
    fillCheckbox(form, 'page11_field15', formData.childrenNotInHomeNA);
    
    // Child 1 Not Living in Home (based on real data test)
    if (formData.childrenNotInHome && formData.childrenNotInHome[0]) {
      fillTextField(form, 'page11_field16', formData.childrenNotInHome[0].firstName);     // First name
      fillTextField(form, 'page11_field17', formData.childrenNotInHome[0].middleName);    // Middle name
      fillTextField(form, 'page11_field19', formData.childrenNotInHome[0].lastName);      // Last name
      fillTextField(form, 'page11_field18', formData.childrenNotInHome[0].dateOfBirth);   // DOB
    }
    
    // Personal Reference 1 (based on real data test - all correct!)
    if (formData.references && formData.references[0]) {
      fillTextField(form, 'page11_field21', formData.references[0].firstName);            // First name
      fillTextField(form, 'page11_field22', formData.references[0].lastName);             // Last name
      fillTextField(form, 'page11_field20', formData.references[0].phone || formData.references[0].phoneNumber); // Phone
      fillTextField(form, 'page11_field23', formData.references[0].relationship);         // Relationship
    }
    
    // ==========================================
    // PAGE 13 - Applicant 2 Info (Spouse)
    // PDF Page 13 uses page12_field*
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
  if (!value) {
    console.log(`Skipping ${fieldName}: value is empty/falsy`);
    return;
  }
  try {
    const field = form.getTextField(fieldName);
    if (field) {
      field.setText(String(value));
      console.log(`Filled ${fieldName}: ${value}`);
    } else {
      console.log(`Field ${fieldName} not found`);
    }
  } catch (e) {
    console.log(`Error filling ${fieldName}:`, e.message);
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
