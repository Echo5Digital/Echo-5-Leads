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

    await leadsCollection.insertOne(lead);

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
    res.status(500).json({ error: 'Failed to process application' });
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
    
    console.log('[PDF] Filling government PDF template with form data...');
    
    // ========== PAGE 1 - Personal Information ==========
    // Text fields
    fillTextField(form, 'page1_field2', formData.firstName);
    fillTextField(form, 'page1_field3', formData.lastName);
    fillTextField(form, 'page1_field6', formData.middleName);
    fillTextField(form, 'page1_field8', formData.nicknames);
    fillTextField(form, 'page1_field9', formData.dateOfBirth);
    fillTextField(form, 'page1_field10', formData.ssn);
    fillTextField(form, 'page1_field11', formData.driversLicense);
    fillTextField(form, 'page1_field19', formData.height);
    fillTextField(form, 'page1_field20', formData.weight);
    fillTextField(form, 'page1_field21', formData.cityOfBirth);
    fillTextField(form, 'page1_field22', formData.stateOfBirth);
    fillTextField(form, 'page1_field23', formData.hairColor);
    fillTextField(form, 'page1_field24', formData.eyeColor);
    fillTextField(form, 'page1_field25', formData.driverSex);
    fillTextField(form, 'page1_field26', formData.dlState);
    
    // Checkboxes
    fillCheckbox(form, 'page1_field1', formData.noMiddleName);
    
    // ========== PAGE 2 - Aliases and Previous Addresses ==========
    // Alias 1
    if (formData.aliases && formData.aliases[0]) {
      fillTextField(form, 'page2_field1', formData.aliases[0].firstName);
      fillTextField(form, 'page2_field2', formData.aliases[0].middleName);
      fillTextField(form, 'page2_field3', formData.aliases[0].lastName);
    }
    // Alias 2
    if (formData.aliases && formData.aliases[1]) {
      fillTextField(form, 'page2_field6', formData.aliases[1].firstName);
      fillTextField(form, 'page2_field7', formData.aliases[1].middleName);
      fillTextField(form, 'page2_field8', formData.aliases[1].lastName);
    }
    // Alias 3
    if (formData.aliases && formData.aliases[2]) {
      fillTextField(form, 'page2_field9', formData.aliases[2].firstName);
      fillTextField(form, 'page2_field10', formData.aliases[2].middleName);
      fillTextField(form, 'page2_field11', formData.aliases[2].lastName);
    }
    
    // Previous Residency
    if (formData.previousResidency && formData.previousResidency[0]) {
      fillTextField(form, 'page2_field12', formData.previousResidency[0].state);
      fillTextField(form, 'page2_field13', formData.previousResidency[0].startDate);
      fillTextField(form, 'page2_field14', formData.previousResidency[0].endDate);
    }
    
    // Criminal History
    fillCheckbox(form, 'page2_field44', formData.convictedOfCrime);
    fillTextField(form, 'page2_field45', formData.crimeExplanation);
    
    // Consent checkboxes
    fillCheckbox(form, 'page2_field4', formData.consentBackgroundCheck);
    fillCheckbox(form, 'page2_field5', formData.consentChildAbuseCheck);
    fillCheckbox(form, 'page2_field26', formData.consentRestrictedRegistry);
    fillCheckbox(form, 'page2_field27', formData.consentFingerprints);
    
    // Signature fields
    fillTextField(form, 'page2_field53', formData.applicantSignature);
    fillTextField(form, 'page2_field54', formData.applicantSignatureDate);
    
    // ========== PAGE 3 - Background Check Purpose ==========
    fillCheckbox(form, 'page3_field1', formData.childWelfareNameBased);
    fillCheckbox(form, 'page3_field12', formData.adoption);
    fillCheckbox(form, 'page3_field13', formData.fosterCare);
    fillCheckbox(form, 'page3_field14', formData.contractedResourceFamily);
    fillCheckbox(form, 'page3_field15', formData.kinshipNonRelative);
    fillCheckbox(form, 'page3_field16', formData.kinshipRelative);
    fillCheckbox(form, 'page3_field17', formData.therapeuticFosterCare);
    fillCheckbox(form, 'page3_field18', formData.traditionalFosterCare);
    fillCheckbox(form, 'page3_field19', formData.guardianship);
    
    // ========== PAGE 4 - More Background Check Options ==========
    fillCheckbox(form, 'page4_field1', formData.ipap);
    fillCheckbox(form, 'page4_field4', formData.hostHomes);
    fillCheckbox(form, 'page4_field5', formData.reissueChildWelfareFingerprint);
    fillCheckbox(form, 'page4_field6', formData.trialReunification);
    
    // Signature and Date
    fillTextField(form, 'Date_1', formData.applicantSignatureDate);
    
    // ========== PAGE 5 - Private Child Welfare ==========
    fillCheckbox(form, 'page5_field1', formData.privateChildWelfare);
    fillCheckbox(form, 'page5_field2', formData.privateAdoption);
    fillCheckbox(form, 'page5_field3', formData.privateAdoptionNameBased);
    
    // ========== PAGE 6 - OKDHS Representative ==========
    fillTextField(form, 'page6_field7', formData.representativeName);
    fillTextField(form, 'page6_field8', formData.representativeTitle);
    fillTextField(form, 'page6_field9', formData.representativeMailingAddress);
    fillTextField(form, 'page6_field10', formData.representativeCity);
    fillTextField(form, 'page6_field11', formData.representativeState);
    fillTextField(form, 'page6_field12', formData.representativeZipCode);
    fillTextField(form, 'page6_field13', formData.representativePhone);
    fillTextField(form, 'page6_field14', formData.representativeFax);
    fillTextField(form, 'page6_field15', formData.representativeEmail);
    
    // ========== PAGE 7 - Consent for Release ==========
    fillTextField(form, 'page7_field1', formData.resourceFirstName1);
    fillTextField(form, 'page7_field2', formData.resourceLastName1);
    fillTextField(form, 'page7_field3', formData.resourceFirstName2);
    fillTextField(form, 'page7_field4', formData.resourceLastName2);
    fillTextField(form, 'page7_field5', formData.authorizedIndividualName);
    fillTextField(form, 'page7_field6', formData.authorizedIndividualAddress);
    
    // Information to Include checkboxes
    fillCheckbox(form, 'page7_field7', formData.includeFirstLastName);
    fillCheckbox(form, 'page7_field8', formData.includePhoneNumber);
    fillCheckbox(form, 'page7_field9', formData.includeChurchHome);
    fillCheckbox(form, 'page7_field10', formData.includeApplicationProvided);
    fillCheckbox(form, 'page7_field11', formData.includeApplicationCompleted);
    fillCheckbox(form, 'page7_field12', formData.includeAgency);
    fillCheckbox(form, 'page7_field13', formData.includeInitialPaperwork);
    fillCheckbox(form, 'page7_field14', formData.includeTrainingStarted);
    fillCheckbox(form, 'page7_field15', formData.includeTrainingCompleted);
    fillCheckbox(form, 'page7_field16', formData.includeHomeStudyStarted);
    fillCheckbox(form, 'page7_field17', formData.includeHomeStudyCompleted);
    
    // ========== PAGE 8 - Consent Signatures ==========
    fillTextField(form, 'page8_field1', formData.consentEntityName);
    fillTextField(form, 'Date_2', formData.applicant1ConsentDate);
    fillTextField(form, 'Date_3', formData.applicant2ConsentDate);
    
    // ========== PAGE 9 - Resource Family Application - General Information ==========
    fillTextField(form, 'page9_field1', formData.familyName);
    fillTextField(form, 'page9_field2', formData.physicalAddress);
    fillTextField(form, 'page9_field3', formData.physicalCity);
    fillTextField(form, 'page9_field4', formData.physicalState);
    fillTextField(form, 'page9_field5', formData.physicalZipCode);
    fillTextField(form, 'page9_field6', formData.mailingAddress);
    fillTextField(form, 'page9_field7', formData.mailingCity);
    fillTextField(form, 'page9_field8', formData.mailingState);
    fillTextField(form, 'page9_field9', formData.mailingZipCode);
    fillTextField(form, 'page9_field11', formData.findingDirections);
    fillTextField(form, 'page9_field12', formData.squareFootage);
    fillTextField(form, 'page9_field15', formData.numberOfBedrooms);
    
    // Home Type
    fillCheckbox(form, 'page9_field13', formData.homeType === 'rent');
    fillCheckbox(form, 'page9_field14', formData.homeType === 'own');
    
    // ========== PAGE 10 - Resource Applicant 1 Information ==========
    fillTextField(form, 'page10_field1', formData.applicant1FirstName);
    fillTextField(form, 'page10_field9', formData.applicant1MiddleName);
    fillTextField(form, 'page10_field10', formData.applicant1LastName);
    fillTextField(form, 'page10_field19', formData.applicant1OtherNames);
    fillTextField(form, 'page10_field20', formData.applicant1DateOfBirth);
    fillTextField(form, 'page10_field21', formData.applicant1SSN);
    fillTextField(form, 'page10_field22', formData.applicant1Gender);
    fillTextField(form, 'page10_field23', formData.applicant1Tribe);
    fillTextField(form, 'page10_field24', formData.applicant1HispanicLatino);
    fillTextField(form, 'page10_field25', formData.applicant1Race);
    fillTextField(form, 'page10_field26', formData.applicant1WorkPhone);
    fillTextField(form, 'page10_field27', formData.applicant1CellPhone);
    fillTextField(form, 'page10_field28', formData.applicant1HomePhone);
    fillTextField(form, 'page10_field29', formData.applicant1Email);
    
    fillCheckbox(form, 'page10_field2', formData.applicant1OtherNamesNA);
    fillCheckbox(form, 'page10_field17', formData.applicant1TribeNA);
    fillCheckbox(form, 'page10_field32', formData.applicant1USCitizen === 'yes');
    fillCheckbox(form, 'page10_field33', formData.applicant1USCitizen === 'no');
    
    // ========== PAGE 11 - Applicant 1 Continued ==========
    fillTextField(form, 'page11_field6', formData.applicant1StatesLived);
    fillCheckbox(form, 'page11_field1', formData.applicant1StatesLivedNA);
    
    // Employment
    fillTextField(form, 'page11_field7', formData.applicant1Employer);
    fillTextField(form, 'page11_field8', formData.applicant1Occupation);
    fillTextField(form, 'page11_field9', formData.applicant1WorkAddress);
    fillTextField(form, 'page11_field10', formData.applicant1WorkCity);
    fillTextField(form, 'page11_field11', formData.applicant1WorkState);
    fillTextField(form, 'page11_field12', formData.applicant1WorkZipCode);
    fillTextField(form, 'page11_field16', formData.applicant1GrossIncome);
    
    // ========== PAGE 12 - Resource Applicant 2 Information ==========
    fillTextField(form, 'page12_field1', formData.applicant2FirstName);
    fillTextField(form, 'page12_field2', formData.applicant2MiddleName);
    fillTextField(form, 'page12_field3', formData.applicant2LastName);
    fillTextField(form, 'page12_field4', formData.applicant2OtherNames);
    fillTextField(form, 'page12_field6', formData.applicant2DateOfBirth);
    fillTextField(form, 'page12_field7', formData.applicant2SSN);
    fillTextField(form, 'page12_field8', formData.applicant2Gender);
    fillTextField(form, 'page12_field9', formData.applicant2Tribe);
    fillTextField(form, 'page12_field11', formData.applicant2HispanicLatino);
    fillTextField(form, 'page12_field12', formData.applicant2Race);
    fillTextField(form, 'page12_field13', formData.applicant2WorkPhone);
    fillTextField(form, 'page12_field15', formData.applicant2CellPhone);
    fillTextField(form, 'page12_field19', formData.applicant2HomePhone);
    fillTextField(form, 'page12_field20', formData.applicant2Email);
    
    // ========== PAGE 13 - Household Members ==========
    if (formData.householdMembers) {
      formData.householdMembers.forEach((member, index) => {
        // Map household members to appropriate fields
        // Field names would need exact mapping based on PDF layout
      });
    }
    
    // Signatures
    fillTextField(form, 'Date_4', formData.applicant1SignatureDate);
    fillTextField(form, 'Date_5', formData.applicant2SignatureDate);
    
    // ========== PAGE 14 - References ==========
    if (formData.references && formData.references[0]) {
      fillTextField(form, 'page14_field9', formData.references[0].name);
    }
    
    // ========== PAGE 15 - Additional Information ==========
    // Required forms checkboxes
    fillCheckbox(form, 'page15_field1', formData.requiredMedicalExam);
    fillTextField(form, 'page15_field2', formData.medicalExamAppointmentDate);
    fillCheckbox(form, 'page15_field3', formData.requiredFinancialAssessment);
    fillCheckbox(form, 'page15_field4', formData.requiredParentHealthHistory);
    fillCheckbox(form, 'page15_field5', formData.requiredChildHealthStatement);
    fillTextField(form, 'page15_field6', formData.childHealthAppointmentDate);
    fillCheckbox(form, 'page15_field7', formData.requiredChildCareApplication);
    fillCheckbox(form, 'page15_field8', formData.requiredOtherAdults);
    fillCheckbox(form, 'page15_field9', formData.requiredDivorceDecrees);
    fillCheckbox(form, 'page15_field10', formData.requiredAutoInsurance);
    fillCheckbox(form, 'page15_field11', formData.requiredCDIB);
    fillCheckbox(form, 'page15_field12', formData.requiredMarriageLicense);
    fillCheckbox(form, 'page15_field13', formData.requiredDD214);
    fillCheckbox(form, 'page15_field14', formData.requiredDriverLicense);
    fillCheckbox(form, 'page15_field15', formData.requiredImmunization);
    fillCheckbox(form, 'page15_field16', formData.requiredPaycheckStub);
    fillCheckbox(form, 'page15_field17', formData.requiredPetVaccination);
    fillCheckbox(form, 'page15_field18', formData.requiredSocialSecurity);
    fillCheckbox(form, 'page15_field19', formData.requiredFingerprints);
    fillCheckbox(form, 'page15_field20', formData.requiredLawfulResidence);
    fillCheckbox(form, 'page15_field22', formData.requiredOtherSpecify);
    fillTextField(form, 'page15_field21', formData.requiredOtherSpecifyText);
    
    // Note: Skipping form.flatten() due to PDF template compatibility issue
    
    console.log('[PDF] Government PDF filled successfully');
    
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
