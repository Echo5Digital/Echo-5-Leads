'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from '../components/SignatureCanvas';

export default function FosterCareApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Signature refs for all signature fields
  const signatureRef = useRef(null);
  const consent1SignatureRef = useRef(null);
  const consent2SignatureRef = useRef(null);
  const personNamedSignatureRef = useRef(null);
  const personMakingSignatureRef = useRef(null);
  const applicant1SignatureRef = useRef(null);
  const applicant2SignatureRef = useRef(null);
  const adultMember1SignatureRef = useRef(null);
  const adultMember2SignatureRef = useRef(null);
  const adultMember3SignatureRef = useRef(null);
  const adultMember4SignatureRef = useRef(null);

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    noMiddleName: false,
    nicknames: '',
    sex: '',
    dateOfBirth: '',
    height: '',
    weight: '',
    cityOfBirth: '',
    stateOfBirth: '',
    ssn: '',
    hairColor: '',
    eyeColor: '',
    driversLicense: '',
    dlState: '',
    driverSex: '',
    collisionReportDate: '',
    collisionReportCity: '',
    aliases: [
      { firstName: '', middleName: '', lastName: '' },
      { firstName: '', middleName: '', lastName: '' },
      { firstName: '', middleName: '', lastName: '' }
    ],
    previousResidency: [
      { state: '', startDate: '', endDate: '' },
      { state: '', startDate: '', endDate: '' },
      { state: '', startDate: '', endDate: '' }
    ],
    internationalResidency: [
      { country: '', startDate: '', endDate: '' },
      { country: '', startDate: '', endDate: '' },
      { country: '', startDate: '', endDate: '' }
    ],
    
    // Criminal History
    convictedOfCrime: false,
    crimeExplanation: '',
    
    // Consent checkboxes
    consentBackgroundCheck: false,
    consentChildAbuseCheck: false,
    consentRestrictedRegistry: false,
    consentFingerprints: false,
    consentFBICheck: false,
    consentFBIChallenge: false,
    
    // Privacy policy and certification
    privacyPolicyReviewed: false,
    certifyInformation: false,
    applicantSignature: '',
    applicantSignatureDate: '',
    
    // Background Check Purpose
    childWelfareNameBased: false,
    adoption: false,
    indianChildWelfareAdoption: false,
    okdhsAdoption: false,
    ericasRule: false,
    ericasRuleSub: false,
    fosterCare: false,
    contractedResourceFamily: false,
    kinshipNonRelative: false,
    kinshipRelative: false,
    therapeuticFosterCare: false,
    traditionalFosterCare: false,
    guardianship: false,
    icwTribalGuardianship: false,
    okdhsGuardianship: false,
    ipap: false,
    ipapSub: false,
    indianChildWelfareFoster: false,
    indianChildWelfareFosterSub: false,
    reissueChildWelfare: false,
    reissuePreviousOnly: false,
    
    // Page 6 fields
    safetyPlanMonitor: false,
    safetyPlanMonitorSub: false,
    okdhsTrialReunification: false,
    okdhsTrialReunificationSub: false,
    volunteer: false,
    volunteerSub: false,
    
    // Child Welfare Fingerprint Based
    childWelfareFingerprintBased: false,
    adoptionFingerprint: false,
    icwTribalAdoptionFingerprint: false,
    okdhsAdoptionFingerprint: false,
    fosterCareFingerprint: false,
    rfpAgency: false,
    ddsSpecializedFosterCare: false,
    emergencyAfterHours: false,
    icwTribalFosterCareFingerprint: false,
    okdhsFosterCareFingerprint: false,
    therapeuticFosterCareFingerprint: false,
    guardianshipFingerprint: false,
    icwTribalGuardianshipFingerprint: false,
    okdhsGuardianshipFingerprint: false,
    hostHomes: false,
    hostHomesSub: false,
    ipapSafetyPlan: false,
    ipapSafetyPlanSub: false,
    reissueChildWelfareFingerprint: false,
    reissueFingerprintPreviousOnly: false,
    trialReunification: false,
    trialReunificationSub: false,
    
    // Page 7 - Private Child Welfare
    privateChildWelfare: false,
    privateAdoption: false,
    privateAdoptionNameBased: false,
    privateDomesticAdoptionFingerprint: false,
    privateGuardianshipNameBased: false,
    privateInternationalAdoptionNameBased: false,
    
    // OKDHS Representative
    representativeName: '',
    representativeTitle: '',
    representativeMailingAddress: '',
    representativeCity: '',
    representativeState: '',
    representativeZipCode: '',
    representativePhone: '',
    representativeFax: '',
    representativeEmail: '',
    
    // Page 8 - Consent for Release of Information
    resourceFirstName1: '',
    resourceLastName1: '',
    resourceFirstName2: '',
    resourceLastName2: '',
    authorizedIndividualName: '',
    authorizedIndividualAddress: '',
    
    // Information to Include checkboxes
    includeFirstLastName: false,
    includePhoneNumber: false,
    includeChurchHome: false,
    includeApplicationProvided: false,
    includeApplicationCompleted: false,
    includeAgency: false,
    includeInitialPaperwork: false,
    includeTrainingStarted: false,
    includeTrainingCompleted: false,
    includeHomeStudyStarted: false,
    includeHomeStudyCompleted: false,
    
    // Page 9 - Consent Signatures
    applicant1ConsentSignature: '',
    applicant1ConsentDate: '',
    applicant2ConsentSignature: '',
    applicant2ConsentDate: '',
    
    // Page 10 - Resource Family Application - General Information
    familyName: '',
    physicalAddress: '',
    physicalCity: '',
    physicalState: '',
    physicalZipCode: '',
    mailingAddress: '',
    mailingCity: '',
    mailingState: '',
    mailingZipCode: '',
    findingDirections: '',
    homeType: '', // 'rent' or 'own'
    squareFootage: '',
    numberOfBedrooms: '',
    
    // Resource Applicant 1 Information
    applicant1FirstName: '',
    applicant1MiddleName: '',
    applicant1LastName: '',
    applicant1OtherNames: '',
    applicant1OtherNamesNA: false,
    applicant1DateOfBirth: '',
    applicant1SSN: '',
    applicant1Gender: '',
    applicant1Tribe: '',
    applicant1TribeNA: false,
    applicant1HispanicLatino: '',
    applicant1Race: '',
    applicant1WorkPhone: '',
    applicant1CellPhone: '',
    applicant1HomePhone: '',
    applicant1Email: '',
    applicant1USCitizen: '',
    
    // Page 11 - Applicant 1 continued
    applicant1StatesLived: '',
    applicant1StatesLivedNA: false,
    applicant1MaritalStatus: '',
    applicant1PreviousMarriages: '',
    applicant1HighestGrade: '',
    applicant1AdvancedDegree: '',
    applicant1ArmedForces: '',
    
    // Employment
    applicant1Employed: '',
    applicant1SelfEmployed: '',
    applicant1UnemployedIncome: '',
    applicant1UnemployedTakeHome: '',
    applicant1EmployedIncome: '',
    applicant1EmployedTakeHome: '',
    applicant1EmployerName: '',
    applicant1JobTitle: '',
    applicant1SupervisorName: '',
    applicant1SupervisorPhone: '',
    applicant1SupervisorEmail: '',
    applicant1SelfEmployedTakeHome: '',
    applicant1SelfEmployedContact: '',
    
    // Additional Information
    applicant1PreviousFosterApply: '',
    applicant1ArrestedCharges: '',
    applicant1PleaGuilty: '',
    applicant1InvestigatedAbuse: '',
    
    // Page 12 - Other Household Members and References
    applicant1ProtectiveOrder: '',
    otherHouseholdMembersNA: false,
    householdMembers: [{ firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '', ssn: '', relationship: '', k12Enrolled: '' }],
    childrenNotLivingNA: false,
    childrenNotLiving: [{ firstName: '', middleName: '', lastName: '', dateOfBirth: '', reason: '' }],
    references: [
      { firstName: '', lastName: '', phoneNumber: '', relationship: '' },
      { firstName: '', lastName: '', phoneNumber: '', relationship: '' },
      { firstName: '', lastName: '', phoneNumber: '', relationship: '' },
      { firstName: '', lastName: '', phoneNumber: '', relationship: '' }
    ],
    
    // Page 13 - Counseling and Adult Children
    counselingTreatmentNA: false,
    counselingMembers: [{ name: '', datesOfTreatment: '', providerName: '', address: '', city: '', state: '', zipCode: '', phoneNumber: '', email: '' }],
    adultChildrenNA: false,
    adultChildren: [{ firstName: '', middleInitial: '', lastName: '', phoneNumber: '', email: '', address: '', city: '', state: '', zipCode: '' }],
    
    // Page 14 - Signature and Agreement
    contactWithAdultChild: '',
    signatureDay: '',
    signatureMonth: '',
    signatureYear: '',
    signatureCity: '',
    signatureState: '',
    applicant1Signature: '',
    applicant1SignatureDate: '',
    applicant2Signature: '',
    applicant2SignatureDate: '',
    adultMember1Signature: '',
    adultMember1SignatureDate: '',
    adultMember2Signature: '',
    adultMember2SignatureDate: '',
    adultMember3Signature: '',
    adultMember3SignatureDate: '',
    adultMember4Signature: '',
    adultMember4SignatureDate: '',
    
    // Driver Records Request Signatures
    personNamedSignature: '',
    personMakingSignature: '',
    
    // Page 15 - Agency Use Only
    assessmentFosterHome: false,
    assessmentKinshipFoster: false,
    assessmentAdoptive: false,
    assessmentBothAdoptiveFoster: false,
    resourceHomeDHS: false,
    resourceHomeSupportedAgency: false,
    resourceHomeTherapeutic: false,
    resourceHomeIntensiveTreatment: false,
    agencyReceivedDocumentation: false,
    agencyReceivedDate: '',
    
    // Page 16 - Required Forms
    requiredMedicalExam: false,
    requiredFinancialAssessment: false,
    requiredParentHealthHistory: false,
    requiredChildHealthStatement: false,
    requiredChildCareApplication: false,
    requiredOtherAdults: false,
    requiredDivorceDecrees: false,
    requiredAutoInsurance: false,
    requiredCDIB: false,
    requiredMarriageLicense: false,
    requiredDD214: false,
    requiredDriverLicense: false,
    requiredImmunization: false,
    requiredPaycheckStub: false,
    requiredPetVaccination: false,
    requiredSocialSecurity: false,
    requiredFingerprints: false,
    requiredLawfulResidence: false,
    requiredOtherSpecify: false,
    requiredOtherSpecifyText: '',
    
    // Contact Information
    mailingAddress: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    homePhone: '',
    cellPhone: '',
    workPhone: '',
    faxNumber: '',
    email: '',
    
    // Employment Information
    employer: '',
    occupation: '',
    workAddress: '',
    workYears: '',
    grossIncome: '',
    
    // Spouse/Partner Information
    hasSpouse: false,
    spouseFirstName: '',
    spouseMiddleName: '',
    spouseLastName: '',
    spouseDateOfBirth: '',
    spouseSSN: '',
    spouseDriversLicense: '',
    spouseDLState: '',
    spouseEmployer: '',
    spouseOccupation: '',
    spouseWorkAddress: '',
    spouseWorkYears: '',
    spouseGrossIncome: '',
    
    // Household Information
    residenceType: '',
    residenceYears: '',
    landlordName: '',
    landlordPhone: '',
    bedrooms: '',
    bathrooms: '',
    householdMembers: [{ name: '', age: '', relationship: '' }],
    
    // References
    references: [
      { name: '', relationship: '', phone: '', yearsKnown: '' },
      { name: '', relationship: '', phone: '', yearsKnown: '' },
      { name: '', relationship: '', phone: '', yearsKnown: '' }
    ],
    
    // Background Information
    criminalHistory: false,
    criminalDetails: '',
    childAbuseHistory: false,
    childAbuseDetails: '',
    substanceAbuseHistory: false,
    substanceAbuseDetails: '',
    
    // Motivation
    reasonForFostering: '',
    childCareExperience: '',
    preferredAgeRange: '',
    specialNeedsWillingness: false,
    
    // Emergency Contact
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    emergencyAddress: '',
    
    // Signature
    signatureName: '',
    signatureDate: '',
    agreeToTerms: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleHouseholdMemberChange = (index, field, value) => {
    const updatedMembers = [...formData.householdMembers];
    updatedMembers[index][field] = value;
    setFormData(prev => ({ ...prev, householdMembers: updatedMembers }));
  };

  const addHouseholdMember = () => {
    setFormData(prev => ({
      ...prev,
      householdMembers: [...prev.householdMembers, { name: '', age: '', relationship: '' }]
    }));
  };

  const removeHouseholdMember = (index) => {
    setFormData(prev => ({
      ...prev,
      householdMembers: prev.householdMembers.filter((_, i) => i !== index)
    }));
  };

  const handleAliasChange = (index, field, value) => {
    const updatedAliases = [...formData.aliases];
    updatedAliases[index][field] = value;
    setFormData(prev => ({ ...prev, aliases: updatedAliases }));
  };

  const handleResidencyChange = (index, field, value) => {
    const updatedResidency = [...formData.previousResidency];
    updatedResidency[index][field] = value;
    setFormData(prev => ({ ...prev, previousResidency: updatedResidency }));
  };

  const handleInternationalResidencyChange = (index, field, value) => {
    const updatedResidency = [...formData.internationalResidency];
    updatedResidency[index][field] = value;
    setFormData(prev => ({ ...prev, internationalResidency: updatedResidency }));
  };

  const handleReferenceChange = (index, field, value) => {
    const updatedReferences = [...formData.references];
    updatedReferences[index][field] = value;
    setFormData(prev => ({ ...prev, references: updatedReferences }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/foster-care-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      const result = await response.json();
      router.push(`/foster-care-application/success?id=${result.applicationId}`);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {currentPage === 1 && (
          <>
            {/* Service Oklahoma Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="mr-4">
                  <svg viewBox="0 0 100 100" className="w-20 h-20">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#004B87" strokeWidth="2"/>
                    <polygon points="50,20 55,40 75,40 60,52 65,70 50,58 35,70 40,52 25,40 45,40" fill="#004B87"/>
                    <text x="50" y="85" textAnchor="middle" fontSize="12" fill="#004B87" fontWeight="bold">SERVICE</text>
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-light text-gray-700 tracking-[0.3em] mb-1">
                SERVICE
              </h1>
              <h2 className="text-4xl font-light text-[#004B87] tracking-[0.2em] mb-4">
                OKLAHOMA
              </h2>
              <div className="text-sm text-gray-700 mb-1">Driver License Services - Records Management Division</div>
              <div className="text-base font-bold text-gray-900 uppercase">
                RECORDS REQUEST AND CONSENT TO RELEASE
              </div>
            </div>

            {/* Form Instructions */}
            <div className="mb-12">
              <h2 className="text-base font-bold text-gray-900 mb-4">Form Instructions</h2>
              <div className="space-y-4 text-[13px] leading-relaxed text-gray-800">
                <p>
                  Please fill out completely all applicable portions of the Records Request and Consent to Release form.
                </p>
                
                <p>
                  Mail the form and all applicable fees, using one of the forms of payment listed at the bottom of the form, to:
                </p>
                <div className="pl-8 space-y-0.5">
                  <p>Service Oklahoma</p>
                  <p>Records Management Division</p>
                  <p>P. O. Box 11415</p>
                  <p>Oklahoma City, OK 73136-0415</p>
                </div>

                <p>
                  Please include a self-addressed stamped envelope with your request. Service Oklahoma will not mail documents C.O.D. Please <span className="font-bold">do not</span> use Federal Express (FedEx) or United Parcel Service (UPS).
                </p>

                <p>
                  You may also present the completed form and fees to Service Oklahoma at 6015 North Classen Boulevard in Oklahoma City, Oklahoma.
                </p>

                <p>
                  To obtain a regular driving record summary (Motor Vehicle Report, or MVR), you may present the completed form and the $25 fee at any motor license agency in the state.
                </p>

                <p>
                  Service Oklahoma does not issue National Driving Records.
                </p>

                <p>
                  Service Oklahoma is not affiliated with DocViews.
                </p>

                <p>
                  To preserve your rights and privacy under the <span className="font-semibold">Driver's Privacy Protection Act, 18 U.S.C., Sections 2721 through 2725</span>:
                </p>
                <div className="pl-8 space-y-0.5">
                  <p>Requests for records cannot be made by telephone or email.</p>
                  <p>Records cannot be faxed or e-mailed.</p>
                </div>
              </div>
            </div>

            {/* Form ID at bottom */}
            <div className="text-right text-[11px] text-gray-600 mt-16">
              303814 00497 02/2023
            </div>

            {/* Continue Button */}
            <div className="mt-12 flex justify-center">
              <button
                type="button"
                onClick={() => setCurrentPage(2)}
                className="px-8 py-3 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
              >
                Continue to Application Form →
              </button>
            </div>
          </>
        )}

        {currentPage === 2 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Header matching Service Oklahoma form style */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-[13px] font-bold text-gray-900 uppercase mb-2">
                    RECORDS REQUEST AND CONSENT TO RELEASE
                  </h1>
                  <p className="text-[11px] text-gray-700">
                    (For birth certificates, contact Department of Health)
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end mb-2">
                    <div className="mr-2">
                      <svg viewBox="0 0 100 100" className="w-16 h-16">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#004B87" strokeWidth="2"/>
                        <polygon points="50,20 55,40 75,40 60,52 65,70 50,58 35,70 40,52 25,40 45,40" fill="#004B87"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-light text-gray-700 tracking-widest">SERVICE</div>
                      <div className="text-xl font-light text-[#004B87] tracking-widest">OKLAHOMA</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-600 border border-gray-400">
                    <div className="grid grid-cols-2 border-b border-gray-400">
                      <div className="border-r border-gray-400 px-2 py-1 font-semibold text-center">Per Record Fee</div>
                      <div className="px-2 py-1 font-semibold text-center">Per Certified<br/>Record Fee</div>
                    </div>
                    <div className="grid grid-cols-2 border-b border-gray-400 text-[8px]">
                      <div className="border-r border-gray-400 px-2 py-1 text-right">$25.00</div>
                      <div className="px-2 py-1 text-right">$28.00</div>
                    </div>
                    <div className="grid grid-cols-2 border-b border-gray-400 text-[8px]">
                      <div className="border-r border-gray-400 px-2 py-1 text-right">$7.00</div>
                      <div className="px-2 py-1 text-right">$10.00</div>
                    </div>
                    <div className="grid grid-cols-2 text-[8px]">
                      <div className="border-r border-gray-400 px-2 py-1">
                        <div>Per Page</div>
                        <div className="text-right">$0.25</div>
                      </div>
                      <div className="px-2 py-1">
                        <div>Per Certified</div>
                        <div>Record Fee</div>
                        <div className="text-right">$3.00</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-400 px-2 py-1 font-bold text-[8px]">
                      Total due as cost per fee:
                    </div>
                  </div>
                </div>
              </div>

              {/* Records Request Section */}
              <div className="mb-6">
                <p className="text-[11px] font-bold text-gray-900 mb-3">
                  I hereby request the following driver record(s):
                </p>
                
                <div className="space-y-2 text-[11px] mb-4">
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Oklahoma driving record summary (Motor Vehicle Report, or MVR) [State law limits this summary to three years]</span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Collision Report. Provide Date: 
                      <input
                        type="date"
                        name="collisionReportDate"
                        value={formData.collisionReportDate}
                        onChange={handleInputChange}
                        className="border border-gray-400 rounded px-2 py-1 w-36 text-[11px] ml-1"
                      /> City/County: 
                      <input
                        type="text"
                        name="collisionReportCity"
                        value={formData.collisionReportCity}
                        onChange={handleInputChange}
                        className="border-b border-gray-400 outline-none bg-transparent px-2 w-40 text-[11px] ml-1"
                      />
                    </span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Other Driving Record(s) [please specify record by type and date]:</span>
                  </label>
                  <div className="ml-6">
                    <input
                      type="text"
                      className="w-full border-b border-gray-400 outline-none bg-transparent text-[11px]"
                    />
                  </div>
                </div>

                <div className="text-[11px] mb-2">
                  <span className="font-semibold">for:</span>
                </div>
                
                <table className="w-full border border-gray-400 text-[11px] mb-6">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Driver's Name</th>
                      <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold w-24">Sex</th>
                      <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold w-40">Driver License Number</th>
                      <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold w-32">Date of Birth</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-2 py-2">
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full outline-none bg-transparent text-[11px]"
                        />
                      </td>
                      <td className="border border-gray-400 px-2 py-2">
                        <select
                          name="driverSex"
                          value={formData.driverSex || ''}
                          onChange={handleInputChange}
                          className="w-full h-8 px-2 text-base text-black font-semibold bg-white border-2 border-gray-400 rounded focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Select</option>
                          <option value="M">M</option>
                          <option value="F">F</option>
                          <option value="X">X</option>
                        </select>
                      </td>
                      <td className="border border-gray-400 px-2 py-2">
                        <input
                          type="text"
                          name="driversLicense"
                          value={formData.driversLicense}
                          onChange={handleInputChange}
                          className="w-full outline-none bg-transparent text-[11px]"
                        />
                      </td>
                      <td className="border border-gray-400 px-2 py-2">
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          className="w-full outline-none bg-transparent text-[11px]"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Check applicable statement section */}
              <div className="mb-6">
                <p className="text-[11px] font-bold text-gray-900 mb-2">
                  Check the following applicable statement:
                </p>
                <div className="flex gap-8 text-[11px] mb-4">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5" />
                    <span>I am the person named in the record(s) sought.</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5" />
                    <span>I am requesting the record(s) of another person.</span>
                  </label>
                </div>
              </div>

              {/* Legal text section */}
              <div className="mb-6 text-[11px] leading-relaxed space-y-3 text-gray-800">
                <p>
                  <span className="font-bold">If you are not the person named in the record(s) sought, provide the reason(s) you are entitled to this record without approval of the named person [please check all that apply].</span> If none of these reasons apply, you must have the named person sign the Consent to Release below.
                </p>

                <div className="space-y-1.5">
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Government Agency (federal, state, or local, including court or law enforcement): for carrying out its functions †</span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>In Use in connection with any court, administrative, arbitral, or self-regulatory body; service of process; investigation in anticipation of litigation; execution or enforcement of judgment; or pursuant to the order of a court</span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Research Activities or Statistical Reports: personal information shall not be published, re-disclosed, or used to contact individuals †</span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Insurance Company, Insurance Support Organizations, Self-insured Entity: for claims investigation, anti-fraud, rating, or underwriting activities †</span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Licensed Private Investigative Agency or Licensed Security Service: for any purpose permitted under 18 U.S.C. § 2721, subsection (b) †</span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Employer of Commercial Driver License Holder: to obtain or verify information required under 49 U.S.C., Chapter 313 †</span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="flex items-center gap-2">
                      Other: for use specifically authorized under the law of the State of Oklahoma related to the public safety Statutory citation:
                      <input
                        type="text"
                        className="flex-1 border-b border-gray-400 outline-none bg-transparent text-[11px] min-w-[200px]"
                      />
                    </span>
                  </label>
                </div>

                <div className="border border-gray-400 px-3 py-2 bg-gray-50 font-bold">
                  <p>
                    CONSENT TO RELEASE by Person Named in Request [consent to release is required if none of the reasons above apply. Employers MUST have consent to release a driving record when it is to be used for purposes other than 49 U.S.C., Chapter 313.]
                  </p>
                </div>

                {/* Person Named in Request Signature Table */}
                <div className="mb-4">
                  <table className="w-full border border-gray-400 text-[11px]">
                    <tbody>
                      <tr>
                        <td className="border border-gray-400 px-2 py-3 w-1/2">
                          <div className="mb-1">Printed Name of Person Named in Request</div>
                          <input
                            type="text"
                            className="w-full border-b border-gray-400 outline-none bg-transparent mt-2"
                          />
                        </td>
                        <td className="border border-gray-400 px-2 py-3 w-1/2">
                          <div className="mb-1">Signature of Person Named in Request</div>
                          <div className="mt-2">
                            <SignatureCanvas
                              ref={personNamedSignatureRef}
                              width={350}
                              height={100}
                              onSave={(dataURL) => {
                                setFormData(prev => ({
                                  ...prev,
                                  personNamedSignature: dataURL
                                }));
                              }}
                            />
                            {formData.personNamedSignature && (
                              <div className="mt-1 text-xs text-green-700">✓ Saved</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>
                  By signing above, I voluntarily give consent to Service Oklahoma or any Motor License Agency to release the above-named record(s) to the person making this Records Request. I understand, as required by the federal Driver Privacy Protection Act (DPPA), 18 U.S.C. Section 2721, et seq., Service Oklahoma or any Motor License Agency will not release personal information from my driving record unless I consent by waiving my right to privacy under the DPPA, or unless Service Oklahoma is required or authorized by DPPA to release personal information without my consent or enumerated above.
                </p>

                <p className="font-bold">AFFIRMATION of Person Making Request</p>
                
                <p>
                  Pursuant to applicable laws, I affirm under penalty of perjury that the requested information is being solicited solely for the reason(s) checked above or at the consent of the named person, and that the personal information furnished is confidential under Federal and State laws and is being released to me only for the reason I have indicated above or at the consent of the named person, and that it is unlawful for me to furnish the information to any unauthorized person or entity or to be used for any unauthorized purpose and if I release any of such information to another authorized person, I understand that I must inform that person or entity that person(s) has/have duties and responsibilities under the Drivers Privacy Protection Act [21 U.S.C. §§ 2621, et seq.] and his or her obligations to review and correct inaccurate information associated with me or my successors' or assignees' wrongful use and/or release of such information, and I further agree to indemnify and hold harmless both the Service Oklahoma and/or the Oklahoma motor license agencies associated with me or my successor' or assignees' wrongful use and/or release of such information.
                </p>
              </div>

              {/* Signature sections */}
              <div className="mb-6">
                <table className="w-full border border-gray-400 text-[11px]">
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-2 py-3 w-1/2">
                        <div className="font-semibold mb-1">Printed Name of Person Making Request</div>
                        <input
                          type="text"
                          className="w-full border-b border-gray-400 outline-none bg-transparent mt-4"
                        />
                      </td>
                      <td className="border border-gray-400 px-2 py-3 w-1/2">
                        <div className="font-semibold mb-1">Signature of Person Making Request</div>
                        <div className="mt-2">
                          <SignatureCanvas
                            ref={personMakingSignatureRef}
                            width={350}
                            height={100}
                            onSave={(dataURL) => {
                              setFormData(prev => ({
                                ...prev,
                                personMakingSignature: dataURL
                              }));
                            }}
                          />
                          {formData.personMakingSignature && (
                            <div className="mt-1 text-xs text-green-700">✓ Saved</div>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-2 py-3" colSpan="2">
                        <div className="font-semibold mb-1">† Print Agency/Company Name (if items 1, 3, 4, 5, or 6 was checked above)</div>
                        <input
                          type="text"
                          className="w-full border-b border-gray-400 outline-none bg-transparent mt-2"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-2 py-3">
                        <div className="font-semibold mb-1">Date</div>
                        <input
                          type="date"
                          className="w-full border-b border-gray-400 outline-none bg-transparent mt-2"
                        />
                      </td>
                      <td className="border border-gray-400 px-2 py-3" rowSpan="2">
                        <div className="font-semibold mb-1">City, State Zip</div>
                        <input
                          type="text"
                          className="w-full border-b border-gray-400 outline-none bg-transparent mt-2"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-2 py-3">
                        <div className="font-semibold mb-1">Address</div>
                        <input
                          type="text"
                          className="w-full border-b border-gray-400 outline-none bg-transparent mt-2"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer information */}
              <div className="flex justify-between text-[11px] mt-8 pt-4 border-t border-gray-400">
                <div className="space-y-0.5">
                  <p className="font-semibold">Mail completed form along with appropriate fees to:</p>
                  <p>Service Oklahoma</p>
                  <p>Records Management Division</p>
                  <p>PO Box 11415</p>
                  <p>Oklahoma City, OK 73136-0415</p>
                </div>
                <div className="space-y-0.5 text-left">
                  <p className="font-semibold">Fees are listed above.</p>
                  <p>Please send total amount due in form of Cashier's Check, Money</p>
                  <p>Order, or Business Check.</p>
                  <p>Cash is accepted only when paying in person.</p>
                  <p>Record fees are in accordance with Oklahoma Statues.</p>
                </div>
              </div>

              {/* Form ID at bottom */}
              <div className="text-right text-[11px] text-gray-600 mt-8">
                303814 00497 02/2023
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back to Instructions
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(3)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue to Background Check →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 3 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Header with Oklahoma Human Services logo */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="w-16 h-16 mr-3">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="45" fill="#4A90E2"/>
                      <path d="M50 20 L60 40 L40 40 Z" fill="#E94B3C"/>
                      <path d="M70 50 L80 70 L60 70 Z" fill="#F39C12"/>
                      <path d="M50 80 L60 60 L40 60 Z" fill="#2ECC71"/>
                      <path d="M30 50 L20 70 L40 70 Z" fill="#9B59B6"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">OKLAHOMA</h1>
                    <h2 className="text-2xl font-normal text-blue-600">Human Services</h2>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Request for Background Check</h3>
                </div>
              </div>

              {/* Applicant Information Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Applicant Information
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-12 gap-3 mb-4 text-[11px]">
                  <div className="col-span-4">
                    <label className="block mb-1 font-semibold text-gray-800">First name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 px-2 py-1.5 outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block mb-1 font-semibold text-gray-800">Middle Name</label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 px-2 py-1.5 outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex items-end pb-1">
                    <label className="flex items-center text-[10px]">
                      <input
                        type="checkbox"
                        name="noMiddleName"
                        checked={formData.noMiddleName}
                        onChange={handleInputChange}
                        className="mr-1 w-3 h-3"
                      />
                      N/A
                    </label>
                  </div>
                  <div className="col-span-4">
                    <label className="block mb-1 font-semibold text-gray-800">Last name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-400 px-2 py-1.5 outline-none"
                    />
                  </div>
                </div>

                {/* Aliases Section */}
                <div className="mb-4">
                  <div className="flex items-center text-[11px] mb-2">
                    <span className="font-semibold text-gray-800">Aliases, including maiden:</span>
                    <label className="flex items-center ml-2">
                      <input type="checkbox" className="mr-1 w-3 h-3" />
                      <span className="text-[10px]">N/A (check box if this section does not apply to the applicant)</span>
                    </label>
                  </div>
                  <table className="w-full border border-gray-400 text-[11px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">First name</th>
                        <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">Middle name</th>
                        <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">Last name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.aliases.map((alias, index) => (
                        <tr key={index}>
                          <td className="border border-gray-400 px-2 py-2">
                            <input
                              type="text"
                              value={alias.firstName || ''}
                              onChange={(e) => handleAliasChange(index, 'firstName', e.target.value)}
                              className="w-full outline-none bg-transparent"
                            />
                          </td>
                          <td className="border border-gray-400 px-2 py-2">
                            <input
                              type="text"
                              value={alias.middleName || ''}
                              onChange={(e) => handleAliasChange(index, 'middleName', e.target.value)}
                              className="w-full outline-none bg-transparent"
                            />
                          </td>
                          <td className="border border-gray-400 px-2 py-2">
                            <input
                              type="text"
                              value={alias.lastName || ''}
                              onChange={(e) => handleAliasChange(index, 'lastName', e.target.value)}
                              className="w-full outline-none bg-transparent"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Nickname */}
                <div className="mb-4">
                  <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Nickname(s)</label>
                  <input
                    type="text"
                    name="nicknames"
                    value={formData.nicknames}
                    onChange={handleInputChange}
                    className="w-full border-b border-gray-400 px-2 py-1 outline-none text-[11px]"
                  />
                </div>

                {/* Personal Details Grid */}
                <div className="grid grid-cols-12 gap-3 mb-3 text-[11px]">
                  <div className="col-span-3">
                    <label className="block mb-1 font-semibold text-gray-800">Date of birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div className="col-span-2 flex items-end pb-1">
                    <label className="flex items-center mr-3">
                      <input
                        type="radio"
                        name="sex"
                        value="Male"
                        checked={formData.sex === 'Male'}
                        onChange={handleInputChange}
                        className="mr-1 w-3 h-3"
                      />
                      Male
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="sex"
                        value="Female"
                        checked={formData.sex === 'Female'}
                        onChange={handleInputChange}
                        className="mr-1 w-3 h-3"
                      />
                      Female
                    </label>
                  </div>
                  <div className="col-span-3">
                    <label className="block mb-1 font-semibold text-gray-800">Height</label>
                    <input
                      type="text"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                      placeholder="e.g., 5'10&quot;"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block mb-1 font-semibold text-gray-800">Weight</label>
                    <input
                      type="text"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                      placeholder="lbs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-[11px]">
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800">City and state of birth</label>
                    <input
                      type="text"
                      name="cityOfBirth"
                      value={formData.cityOfBirth}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800">Social Security number</label>
                    <input
                      type="text"
                      name="ssn"
                      value={formData.ssn}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                      placeholder="XXX-XX-XXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 mb-3 text-[11px]">
                  <div className="col-span-2">
                    <label className="block mb-1 font-semibold text-gray-800">Hair color</label>
                    <input
                      type="text"
                      name="hairColor"
                      value={formData.hairColor}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block mb-1 font-semibold text-gray-800">Eye color</label>
                    <input
                      type="text"
                      name="eyeColor"
                      value={formData.eyeColor}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="block mb-1 font-semibold text-gray-800">Driver license (DL) number</label>
                    <input
                      type="text"
                      name="driversLicense"
                      value={formData.driversLicense}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block mb-1 font-semibold text-gray-800">State DL issued</label>
                    <input
                      type="text"
                      name="dlState"
                      value={formData.dlState}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 mb-3 text-[11px]">
                  <div className="col-span-5">
                    <label className="block mb-1 font-semibold text-gray-800">Mailing address</label>
                    <input
                      type="text"
                      name="mailingAddress"
                      value={formData.mailingAddress}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block mb-1 font-semibold text-gray-800">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block mb-1 font-semibold text-gray-800">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block mb-1 font-semibold text-gray-800">ZIP code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-[11px]">
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800">Phone number</label>
                    <input
                      type="tel"
                      name="homePhone"
                      value={formData.homePhone}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800">Fax number</label>
                    <input
                      type="tel"
                      name="faxNumber"
                      value={formData.faxNumber}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none"
                    />
                  </div>
                </div>

                {/* Previous Five Years Residency */}
                <div className="mb-4">
                  <div className="font-bold text-[11px] mb-2 text-gray-800">Previous Five Years Residency</div>
                  <div className="text-[11px] mb-2 text-gray-800">
                    List all states, other than Oklahoma, you have lived in during the past five (5) years.
                  </div>
                  <div className="flex items-center text-[10px] mb-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-1 w-3 h-3" />
                      N/A (check box if this section does not apply to the applicant)
                    </label>
                  </div>
                  <table className="w-full border border-gray-400 text-[11px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">State</th>
                        <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">Start date</th>
                        <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">End date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.previousResidency.map((residency, index) => (
                        <tr key={index}>
                          <td className="border border-gray-400 px-2 py-2">
                            <input
                              type="text"
                              value={residency.state || ''}
                              onChange={(e) => handleResidencyChange(index, 'state', e.target.value)}
                              className="w-full outline-none bg-transparent"
                            />
                          </td>
                          <td className="border border-gray-400 px-2 py-2">
                            <input
                              type="date"
                              value={residency.startDate || ''}
                              onChange={(e) => handleResidencyChange(index, 'startDate', e.target.value)}
                              className="w-full outline-none bg-transparent"
                            />
                          </td>
                          <td className="border border-gray-400 px-2 py-2">
                            <input
                              type="date"
                              value={residency.endDate || ''}
                              onChange={(e) => handleResidencyChange(index, 'endDate', e.target.value)}
                              className="w-full outline-none bg-transparent"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AD003E</span>
                <span>7/1/2024</span>
                <span>Page 1 of 5</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(4)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 4 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* International Residency Section */}
              <div className="mb-6">
                <div className="text-[11px] mb-2 text-gray-800">
                  List all countries, other than the United States of America, you have lived in during the past five (5) years.
                </div>
                <div className="flex items-center text-[10px] mb-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1 w-3 h-3" />
                    N/A (check box if this section does not apply to the applicant)
                  </label>
                </div>
                <table className="w-full border border-gray-400 text-[11px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">Country</th>
                      <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">Start date</th>
                      <th className="border border-gray-400 px-2 py-1.5 text-center font-bold">End date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.internationalResidency.map((residency, index) => (
                      <tr key={index}>
                        <td className="border border-gray-400 px-2 py-2">
                          <input
                            type="text"
                            value={residency.country}
                            onChange={(e) => handleInternationalResidencyChange(index, 'country', e.target.value)}
                            className="w-full outline-none bg-transparent"
                          />
                        </td>
                        <td className="border border-gray-400 px-2 py-2">
                          <input
                            type="date"
                            value={residency.startDate}
                            onChange={(e) => handleInternationalResidencyChange(index, 'startDate', e.target.value)}
                            className="w-full outline-none bg-transparent"
                          />
                        </td>
                        <td className="border border-gray-400 px-2 py-2">
                          <input
                            type="date"
                            value={residency.endDate}
                            onChange={(e) => handleInternationalResidencyChange(index, 'endDate', e.target.value)}
                            className="w-full outline-none bg-transparent"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Criminal History Section */}
              <div className="mb-6">
                <div className="flex items-center gap-6 mb-2 text-[11px]">
                  <span className="font-semibold text-gray-800">Have you ever been convicted of a crime?</span>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="convictedOfCrime"
                      value="yes"
                      checked={formData.convictedOfCrime === true}
                      onChange={() => setFormData(prev => ({ ...prev, convictedOfCrime: true }))}
                      className="mr-1 w-3 h-3"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="convictedOfCrime"
                      value="no"
                      checked={formData.convictedOfCrime === false}
                      onChange={() => setFormData(prev => ({ ...prev, convictedOfCrime: false }))}
                      className="mr-1 w-3 h-3"
                    />
                    No
                  </label>
                </div>
                <div className="text-[11px] mb-2 text-gray-800">If yes, explain:</div>
                <textarea
                  name="crimeExplanation"
                  value={formData.crimeExplanation}
                  onChange={handleInputChange}
                  rows="6"
                  className="w-full border border-gray-400 px-3 py-2 outline-none text-[11px] bg-blue-50"
                  disabled={!formData.convictedOfCrime}
                />
              </div>

              {/* Consent and Signature Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Consent and Signature
                </div>

                <div className="space-y-3 text-[11px]">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentBackgroundCheck"
                      checked={formData.consentBackgroundCheck}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-800">
                      I understand Oklahoma Human Services (OKDHS) will evaluate the results of the state background check and/or national fingerprint-based background check as part of a comprehensive review.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentChildAbuseCheck"
                      checked={formData.consentChildAbuseCheck}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-800">
                      I understand OKDHS will evaluate child abuse and neglect history for Oklahoma and all other states as required and when available as part of a comprehensive review.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentRestrictedRegistry"
                      checked={formData.consentRestrictedRegistry}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-800">
                      I understand registration on the Restricted Registry may occur when there is a confirmed or substantiated finding of abuse or neglect against a child in care.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentFingerprints"
                      checked={formData.consentFingerprints}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-800">
                      The Oklahoma State Bureau of Investigation (OSBI) will retain my fingerprints in the Automated Fingerprint Identification System and will notify the OKDHS Office of Background Investigations (OBI) of any future Oklahoma criminal arrests through the Records of Arrest and Prosecution (RAP) Back service.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentFBICheck"
                      checked={formData.consentFBICheck}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-800">
                      I understand my fingerprints will be used to check the Federal Bureau of Investigation's (FBI's) criminal history records. The FBI will retain my fingerprints and associated information/biometrics, and while retained, my fingerprints will continue to be compared against submitted to or retained by the FBI, and the FBI will notify the Office of Background Investigations (OBI) of any future National criminal arrests through the Records of Arrest and Prosecution (RAP) Back Service.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="consentFBIChallenge"
                      checked={formData.consentFBIChallenge}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-gray-800">
                      I understand I have the opportunity to complete or challenge the accuracy of the information contained in the FBI identification record. The procedure for obtaining a change, correction, or updating an FBI identification record are set forth in Section 16.34 of Title 28, United States Code of Federal Regulations. Additional information:<br />
                      <a href="https://www.fbi.gov/about-us/cjis/background-checks" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                        https://www.fbi.gov/about-us/cjis/background-checks
                      </a>
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AD003E</span>
                <span>7/1/2024</span>
                <span>Page 2 of 5</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(3)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(5)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 5 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Privacy Policy Section */}
              <div className="mb-6">
                <label className="flex items-start text-[11px]">
                  <input
                    type="checkbox"
                    name="privacyPolicyReviewed"
                    checked={formData.privacyPolicyReviewed}
                    onChange={handleInputChange}
                    className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-gray-800">
                    I have received and reviewed the privacy policy. View the privacy policy online at:<br />
                    <a href="https://www.fbi.gov/services/cjis/compact-council/privacy-act-statement" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                      https://www.fbi.gov/services/cjis/compact-council/privacy-act-statement
                    </a>
                  </span>
                </label>
              </div>

              {/* Certification Statement */}
              <div className="mb-6 text-[11px] text-gray-800 leading-relaxed">
                <p>
                  I certify that all personal identifying information provided on this form is true and correct. I understand the purpose of this form and background check and grant permission, without recourse, for the use and release of information as necessary for the purpose of an Oklahoma name-based and/or a national fingerprint criminal background check and driving record. This information cannot be released for any other purpose without my written permission.
                </p>
              </div>

              {/* Signature Section */}
              <div className="mb-6">
                <label className="block mb-2 font-semibold text-gray-800 text-[11px]">Signature</label>
                <SignatureCanvas
                  ref={signatureRef}
                  width={500}
                  height={150}
                  onSave={(dataURL) => {
                    setFormData(prev => ({
                      ...prev,
                      applicantSignature: dataURL,
                      applicantSignatureDate: new Date().toISOString().split('T')[0]
                    }));
                  }}
                />
                {formData.applicantSignature && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-xs text-green-700">
                    ✓ Signature saved (Date: {formData.applicantSignatureDate})
                  </div>
                )}
              </div>

              {/* Background Check Purpose Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Background Check Purpose
                </div>

                <div className="text-[11px] mb-3 text-gray-800">
                  This section is completed by the OKDHS representative or requesting authority.
                </div>

                <div className="text-[11px] font-bold mb-3 text-gray-800">
                  Request Category: Child Welfare Name Based
                </div>

                <div className="space-y-2 text-[11px] text-gray-800">
                  {/* Child Welfare Name Based */}
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="childWelfareNameBased"
                      checked={formData.childWelfareNameBased}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="font-semibold">Child Welfare Name Based</span>
                  </label>

                  {/* Adoption */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="adoption"
                        checked={formData.adoption}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Adoption</span>
                    </label>
                    <div className="pl-6 space-y-1">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="indianChildWelfareAdoption"
                          checked={formData.indianChildWelfareAdoption}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Indian Child Welfare (ICW) or tribal adoption</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="okdhsAdoption"
                          checked={formData.okdhsAdoption}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>OKDHS adoption</span>
                      </label>
                    </div>
                  </div>

                  {/* Erica's Rule */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="ericasRule"
                        checked={formData.ericasRule}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Erica's Rule</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="ericasRuleSub"
                          checked={formData.ericasRuleSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Erica's rule</span>
                      </label>
                    </div>
                  </div>

                  {/* Foster Care */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="fosterCare"
                        checked={formData.fosterCare}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Foster Care</span>
                    </label>
                    <div className="pl-6 space-y-1">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="contractedResourceFamily"
                          checked={formData.contractedResourceFamily}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Contracted resource family partnership (RFP)</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="kinshipNonRelative"
                          checked={formData.kinshipNonRelative}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Kinship - non-relative</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="kinshipRelative"
                          checked={formData.kinshipRelative}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Kinship - relative</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="therapeuticFosterCare"
                          checked={formData.therapeuticFosterCare}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Therapeutic foster care (TFC)</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="traditionalFosterCare"
                          checked={formData.traditionalFosterCare}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Traditional foster care</span>
                      </label>
                    </div>
                  </div>

                  {/* Guardianship */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="guardianship"
                        checked={formData.guardianship}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Guardianship</span>
                    </label>
                    <div className="pl-6 space-y-1">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="icwTribalGuardianship"
                          checked={formData.icwTribalGuardianship}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>ICW or tribal guardianship</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="okdhsGuardianship"
                          checked={formData.okdhsGuardianship}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>OKDHS guardianship</span>
                      </label>
                    </div>
                  </div>

                  {/* IPAP */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="ipap"
                        checked={formData.ipap}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Immediate Protective Action Plan (IPAP)</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="ipapSub"
                          checked={formData.ipapSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Immediate Protective Action Plan (IPAP)</span>
                      </label>
                    </div>
                  </div>

                  {/* Indian Child Welfare Foster */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="indianChildWelfareFoster"
                        checked={formData.indianChildWelfareFoster}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Indian Child Welfare (ICW) or tribal foster care</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="indianChildWelfareFosterSub"
                          checked={formData.indianChildWelfareFosterSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Indian Child Welfare (ICW) or tribal foster care</span>
                      </label>
                    </div>
                  </div>

                  {/* Re-issue */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="reissueChildWelfare"
                        checked={formData.reissueChildWelfare}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Re-issue child welfare name based result within last 30 calendar days</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="reissuePreviousOnly"
                          checked={formData.reissuePreviousOnly}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Re-issue previous results only</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AD003E</span>
                <span>7/1/2024</span>
                <span>Page 3 of 5</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(4)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(6)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 6 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Continuing from page 5 checkboxes */}
              <div className="mb-6">
                <div className="space-y-2 text-[11px] text-gray-800">
                  {/* Safety Plan Monitor */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="safetyPlanMonitor"
                        checked={formData.safetyPlanMonitor}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Safety Plan Monitor</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="safetyPlanMonitorSub"
                          checked={formData.safetyPlanMonitorSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Safety Plan Monitor</span>
                      </label>
                    </div>
                  </div>

                  {/* OKDHS trial reunification */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="okdhsTrialReunification"
                        checked={formData.okdhsTrialReunification}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>OKDHS trial reunification</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="okdhsTrialReunificationSub"
                          checked={formData.okdhsTrialReunificationSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>OKDHS trial Reunification</span>
                      </label>
                    </div>
                  </div>

                  {/* Volunteer */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="volunteer"
                        checked={formData.volunteer}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Volunteer</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="volunteerSub"
                          checked={formData.volunteerSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Volunteer</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Child Welfare Fingerprint Based Section */}
              <div className="mb-6">
                <div className="text-[11px] font-bold mb-3 text-gray-800">
                  Request Category: Child Welfare Fingerprint Based
                </div>

                <div className="space-y-2 text-[11px] text-gray-800">
                  {/* Child Welfare Fingerprint Based */}
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="childWelfareFingerprintBased"
                      checked={formData.childWelfareFingerprintBased}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="font-semibold">Child Welfare Fingerprint Based</span>
                  </label>

                  {/* Adoption */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="adoptionFingerprint"
                        checked={formData.adoptionFingerprint}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Adoption</span>
                    </label>
                    <div className="pl-6 space-y-1">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="icwTribalAdoptionFingerprint"
                          checked={formData.icwTribalAdoptionFingerprint}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Indian Child Welfare (ICW) or tribal adoption</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="okdhsAdoptionFingerprint"
                          checked={formData.okdhsAdoptionFingerprint}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>OKDHS adoption</span>
                      </label>
                    </div>
                  </div>

                  {/* Foster Care */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="fosterCareFingerprint"
                        checked={formData.fosterCareFingerprint}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Foster Care</span>
                    </label>
                    <div className="pl-6 space-y-1">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="rfpAgency"
                          checked={formData.rfpAgency}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Contracted resource family partnership (RFP) agency</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="ddsSpecializedFosterCare"
                          checked={formData.ddsSpecializedFosterCare}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Developmental Disability Services (DDS) specialized foster care</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="emergencyAfterHours"
                          checked={formData.emergencyAfterHours}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Emergency after hours placement-follow up (Purpose Code X)</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="icwTribalFosterCareFingerprint"
                          checked={formData.icwTribalFosterCareFingerprint}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Indian Child Welfare (ICW) or tribal foster care</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="okdhsFosterCareFingerprint"
                          checked={formData.okdhsFosterCareFingerprint}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>OKDHS foster care</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="therapeuticFosterCareFingerprint"
                          checked={formData.therapeuticFosterCareFingerprint}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Therapeutic foster care (TFC)</span>
                      </label>
                    </div>
                  </div>

                  {/* Guardianship */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="guardianshipFingerprint"
                        checked={formData.guardianshipFingerprint}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Guardianship</span>
                    </label>
                    <div className="pl-6 space-y-1">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="icwTribalGuardianshipFingerprint"
                          checked={formData.icwTribalGuardianshipFingerprint}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Indian Child Welfare (ICW) or tribal guardianship</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="okdhsGuardianshipFingerprint"
                          checked={formData.okdhsGuardianshipFingerprint}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>OKDHS guardianship</span>
                      </label>
                    </div>
                  </div>

                  {/* Host Homes */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="hostHomes"
                        checked={formData.hostHomes}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Host Homes</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="hostHomesSub"
                          checked={formData.hostHomesSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Host homes</span>
                      </label>
                    </div>
                  </div>

                  {/* IPAP or Safety Plan */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="ipapSafetyPlan"
                        checked={formData.ipapSafetyPlan}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Immediate Protective Action Plan (IPAP) or Safety Plan</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="ipapSafetyPlanSub"
                          checked={formData.ipapSafetyPlanSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Immediate Protective Action Plan (IPAP) or Safety Plan</span>
                      </label>
                    </div>
                  </div>

                  {/* Re-issue fingerprint */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="reissueChildWelfareFingerprint"
                        checked={formData.reissueChildWelfareFingerprint}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Re-issue child welfare fingerprint result within last five years</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="reissueFingerprintPreviousOnly"
                          checked={formData.reissueFingerprintPreviousOnly}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Re-issue previous results only</span>
                      </label>
                    </div>
                  </div>

                  {/* Trial reunification */}
                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="trialReunification"
                        checked={formData.trialReunification}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Trial reunification</span>
                    </label>
                    <div className="pl-6">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="trialReunificationSub"
                          checked={formData.trialReunificationSub}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Trial Reunification</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AD003E</span>
                <span>7/1/2024</span>
                <span>Page 4 of 5</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(5)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(7)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 7 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Private Child Welfare Section */}
              <div className="mb-6">
                <div className="text-[11px] font-bold mb-3 text-gray-800">
                  Request Category: Private Child Welfare
                </div>

                <div className="space-y-2 text-[11px] text-gray-800">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="privateChildWelfare"
                      checked={formData.privateChildWelfare}
                      onChange={handleInputChange}
                      className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    />
                    <span className="font-semibold">Private Child Welfare</span>
                  </label>

                  <div className="pl-6 space-y-1.5">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="privateAdoption"
                        checked={formData.privateAdoption}
                        onChange={handleInputChange}
                        className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      />
                      <span>Private Adoption</span>
                    </label>
                    <div className="pl-6 space-y-1">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="privateAdoptionNameBased"
                          checked={formData.privateAdoptionNameBased}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Private adoption - name based</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="privateDomesticAdoptionFingerprint"
                          checked={formData.privateDomesticAdoptionFingerprint}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Private domestic adoption - fingerprint based</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="privateGuardianshipNameBased"
                          checked={formData.privateGuardianshipNameBased}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Private guardianship - name based</span>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="privateInternationalAdoptionNameBased"
                          checked={formData.privateInternationalAdoptionNameBased}
                          onChange={handleInputChange}
                          className="mr-2 w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                        />
                        <span>Private international adoption - name based</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fingerprint Notice */}
              <div className="mb-6 border-2 border-blue-600 bg-blue-50 px-4 py-3 text-[11px] text-gray-800">
                <p>
                  If requesting a national fingerprint background check, you must be fingerprinted prior to completing this form. If you have not been fingerprinted, a complete national fingerprint-based background check cannot be conducted.
                </p>
              </div>

              {/* Contact Information */}
              <div className="mb-6 text-center text-[11px] text-gray-800 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <label className="font-semibold">UE ID#</label>
                  <input
                    type="text"
                    name="ueId"
                    className="border-b border-gray-400 outline-none bg-transparent w-48 px-2"
                  />
                </div>
                <p className="font-semibold">Questions?</p>
                <p>Contact the Office of Background Investigations</p>
                <p>1-800-347-2276</p>
                <p>
                  <a href="mailto:OBICW@okdhs.org" className="text-blue-600 underline">
                    OBICW@okdhs.org
                  </a>
                </p>
              </div>

              {/* OKDHS Representative Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  OKDHS Representative or Requesting Authority
                </div>

                <div className="space-y-4 text-[11px]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800">Name</label>
                      <input
                        type="text"
                        name="representativeName"
                        value={formData.representativeName}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800">Title</label>
                      <input
                        type="text"
                        name="representativeTitle"
                        value={formData.representativeTitle}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-5">
                      <label className="block mb-1 font-semibold text-gray-800">Mailing address</label>
                      <input
                        type="text"
                        name="representativeMailingAddress"
                        value={formData.representativeMailingAddress}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 font-semibold text-gray-800">City</label>
                      <input
                        type="text"
                        name="representativeCity"
                        value={formData.representativeCity}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block mb-1 font-semibold text-gray-800">State</label>
                      <input
                        type="text"
                        name="representativeState"
                        value={formData.representativeState}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block mb-1 font-semibold text-gray-800">ZIP code</label>
                      <input
                        type="text"
                        name="representativeZipCode"
                        value={formData.representativeZipCode}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800">Phone number</label>
                      <input
                        type="tel"
                        name="representativePhone"
                        value={formData.representativePhone}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800">Fax number</label>
                      <input
                        type="tel"
                        name="representativeFax"
                        value={formData.representativeFax}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800">Email</label>
                      <input
                        type="email"
                        name="representativeEmail"
                        value={formData.representativeEmail}
                        onChange={handleInputChange}
                        className="w-full border-b-2 border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stop Notice */}
              <div className="mb-4 text-[11px] text-gray-800">
                <p className="font-bold">Stop! This form must be signed by the subject of the background check.</p>
              </div>

              {/* Note */}
              <div className="mb-6 text-[11px] text-gray-800">
                <p>
                  <span className="font-bold">Note:</span> This form and the information contained therein including, but not limited to, obtaining accurate information and signatures, are the responsibility of the person submitting this request. Paper copies must be kept on file for a minimum of five (5) years and are subject to audit by OKDHS OBI, OSBI, and the FBI.
                </p>
              </div>

              {/* Routing Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Routing
                </div>

                <div className="text-[11px] text-gray-800 text-center space-y-3">
                  <div>
                    <p className="font-semibold mb-1">Send completed request by mail to:</p>
                    <p>OKDHS Office of Background Investigations</p>
                    <p>PO Box 268935</p>
                    <p>Oklahoma City, OK 73126</p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Or scan and send completed request by email to:</p>
                    <p>
                      <a href="mailto:OBICW@okdhs.org" className="text-blue-600 underline">
                        OBICW@okdhs.org
                      </a>
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold mb-1">Or by fax to:</p>
                    <p>405-702-5053</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AD003E</span>
                <span>7/1/2024</span>
                <span>Page 5 of 5</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(6)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(8)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 8 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Header with logos */}
              <div className="flex justify-between items-center mb-6">
                <div className="w-20 h-20 border-2 border-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-500">Logo</span>
                </div>
                <div className="flex-1 text-center">
                  <h1 className="text-base font-bold text-gray-900">
                    Consent for Release of Information to Community Partners
                  </h1>
                </div>
                <div className="w-20 h-20 border-2 border-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-500">Logo</span>
                </div>
              </div>

              {/* Notice */}
              <div className="mb-4 text-[11px] text-gray-800">
                <p>Print information clearly. Incomplete applications cannot be processed.</p>
              </div>

              {/* Resource Applicant Information Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Resource Applicant Information
                </div>

                <div className="text-[11px] mb-3 text-gray-800">
                  <p>For each adult applicant, provide the following information:</p>
                </div>

                <div className="space-y-4">
                  {/* First applicant */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">First name</label>
                      <input
                        type="text"
                        name="resourceFirstName1"
                        value={formData.resourceFirstName1}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Last name</label>
                      <input
                        type="text"
                        name="resourceLastName1"
                        value={formData.resourceLastName1}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Second applicant */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">First name</label>
                      <input
                        type="text"
                        name="resourceFirstName2"
                        value={formData.resourceFirstName2}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Last name</label>
                      <input
                        type="text"
                        name="resourceLastName2"
                        value={formData.resourceLastName2}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Authorization text */}
                  <div className="text-[11px] text-gray-800 mb-3">
                    <p>
                      I authorize the following individual or agency to disclose and exchange information through voice, mail, email, and/or fax.
                    </p>
                  </div>

                  {/* Individual/Agency info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Individual or agency name</label>
                      <input
                        type="text"
                        name="authorizedIndividualName"
                        value={formData.authorizedIndividualName}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Individual or agency address</label>
                      <input
                        type="text"
                        name="authorizedIndividualAddress"
                        value={formData.authorizedIndividualAddress}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Rights statement */}
                  <div className="text-[11px] text-gray-800 leading-relaxed">
                    <p>
                      I have the right to choose the information that I am willing to share with the above designated entity to assist in becoming a Department of Human Services (DHS) resource parent. I understand that the designated entity is not authorized to advocate for my approval as a resource parent. The designated entity's role is limited to providing support in completing application requirements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Information to Include Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Information to Include
                </div>

                <div className="text-[11px] font-bold mb-3 text-gray-800">
                  <p>No information will be shared with entity if you do not check a box.</p>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px]">
                  {/* Left column */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">First and last name</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeFirstLastName"
                            value="yes"
                            checked={formData.includeFirstLastName === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeFirstLastName: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeFirstLastName"
                            value="no"
                            checked={formData.includeFirstLastName === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeFirstLastName: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Phone number</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includePhoneNumber"
                            value="yes"
                            checked={formData.includePhoneNumber === true}
                            onChange={() => setFormData(prev => ({ ...prev, includePhoneNumber: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includePhoneNumber"
                            value="no"
                            checked={formData.includePhoneNumber === false}
                            onChange={() => setFormData(prev => ({ ...prev, includePhoneNumber: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Identified church home</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeChurchHome"
                            value="yes"
                            checked={formData.includeChurchHome === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeChurchHome: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeChurchHome"
                            value="no"
                            checked={formData.includeChurchHome === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeChurchHome: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Application provided</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeApplicationProvided"
                            value="yes"
                            checked={formData.includeApplicationProvided === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeApplicationProvided: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeApplicationProvided"
                            value="no"
                            checked={formData.includeApplicationProvided === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeApplicationProvided: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Application completed</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeApplicationCompleted"
                            value="yes"
                            checked={formData.includeApplicationCompleted === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeApplicationCompleted: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeApplicationCompleted"
                            value="no"
                            checked={formData.includeApplicationCompleted === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeApplicationCompleted: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Identified agency</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeAgency"
                            value="yes"
                            checked={formData.includeAgency === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeAgency: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeAgency"
                            value="no"
                            checked={formData.includeAgency === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeAgency: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Initial paperwork completed</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeInitialPaperwork"
                            value="yes"
                            checked={formData.includeInitialPaperwork === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeInitialPaperwork: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeInitialPaperwork"
                            value="no"
                            checked={formData.includeInitialPaperwork === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeInitialPaperwork: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Training started</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeTrainingStarted"
                            value="yes"
                            checked={formData.includeTrainingStarted === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeTrainingStarted: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeTrainingStarted"
                            value="no"
                            checked={formData.includeTrainingStarted === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeTrainingStarted: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Training completed</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeTrainingCompleted"
                            value="yes"
                            checked={formData.includeTrainingCompleted === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeTrainingCompleted: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeTrainingCompleted"
                            value="no"
                            checked={formData.includeTrainingCompleted === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeTrainingCompleted: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Home study started</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeHomeStudyStarted"
                            value="yes"
                            checked={formData.includeHomeStudyStarted === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeHomeStudyStarted: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeHomeStudyStarted"
                            value="no"
                            checked={formData.includeHomeStudyStarted === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeHomeStudyStarted: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">Home study completed</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeHomeStudyCompleted"
                            value="yes"
                            checked={formData.includeHomeStudyCompleted === true}
                            onChange={() => setFormData(prev => ({ ...prev, includeHomeStudyCompleted: true }))}
                            className="mr-1 w-3 h-3"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="includeHomeStudyCompleted"
                            value="no"
                            checked={formData.includeHomeStudyCompleted === false}
                            onChange={() => setFormData(prev => ({ ...prev, includeHomeStudyCompleted: false }))}
                            className="mr-1 w-3 h-3"
                          />
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD49E</span>
                <span>7/12/2019</span>
                <span>Page 1 of 2</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(7)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(9)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 9 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Consent Information Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Consent Information
                </div>

                <div className="space-y-4 text-[11px] text-gray-800 leading-relaxed">
                  <p>
                    I understand my consent is being sought to release certain information associated with my efforts to become a resource family.
                  </p>

                  <p>
                    I also understand that my resource applicant records are protected under the federal and state confidentiality laws and regulations, and cannot be released without my written consent, unless otherwise specifically provided for in law or regulation. Federal and state laws and regulations prohibit any further disclosure without my specific written consent.
                  </p>

                  <p>
                    I understand that I may revoke this consent in writing at any time to prevent subsequent disclosure of any confidential information.
                  </p>

                  <p>
                    I also understand that, as a resource applicant, this consent to share information is limited to two years from the date this Consent for Release is signed, unless revoked earlier.
                  </p>
                </div>
              </div>

              {/* Signatures Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Signatures
                </div>

                <div className="text-[11px] text-gray-800 mb-6">
                  <p className="flex items-center flex-wrap gap-1">
                    By signing this Consent for Release, I am giving permission for DHS and
                    <input
                      type="text"
                      name="consentEntityName"
                      className="border-b border-gray-400 outline-none bg-transparent px-2 min-w-[250px]"
                      placeholder=""
                    />
                    to share and exchange the information I have specifically designated above that is associated with my resource application process.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* First Applicant Signature */}
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-[11px]">
                      Applicant 1 Signature
                    </label>
                    <SignatureCanvas
                      ref={consent1SignatureRef}
                      width={450}
                      height={120}
                      onSave={(dataURL) => {
                        setFormData(prev => ({
                          ...prev,
                          applicant1ConsentSignature: dataURL,
                          applicant1ConsentDate: new Date().toISOString().split('T')[0]
                        }));
                      }}
                    />
                    {formData.applicant1ConsentSignature && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-xs text-green-700">
                        ✓ Signature saved (Date: {formData.applicant1ConsentDate})
                      </div>
                    )}
                  </div>

                  {/* Second Applicant Signature */}
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-[11px]">
                      Applicant 2 Signature
                    </label>
                    <SignatureCanvas
                      ref={consent2SignatureRef}
                      width={450}
                      height={120}
                      onSave={(dataURL) => {
                        setFormData(prev => ({
                          ...prev,
                          applicant2ConsentSignature: dataURL,
                          applicant2ConsentDate: new Date().toISOString().split('T')[0]
                        }));
                      }}
                    />
                    {formData.applicant2ConsentSignature && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-xs text-green-700">
                        ✓ Signature saved (Date: {formData.applicant2ConsentDate})
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD49E</span>
                <span>7/12/2019</span>
                <span>Page 2 of 2</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(8)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(10)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 10 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="w-32 h-20 border-2 border-gray-400 flex items-center justify-center">
                  <span className="text-xs text-gray-500">OK Human Services Logo</span>
                </div>
                <div className="flex-1 text-right">
                  <h1 className="text-base font-bold text-gray-900">Resource Family Application</h1>
                </div>
              </div>

              {/* General Information Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  General Information
                </div>

                <div className="space-y-4">
                  {/* Family name */}
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Family name</label>
                    <input
                      type="text"
                      name="familyName"
                      value={formData.familyName}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                    />
                  </div>

                  {/* Physical address */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Physical address</label>
                      <input
                        type="text"
                        name="physicalAddress"
                        value={formData.physicalAddress}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">City</label>
                      <input
                        type="text"
                        name="physicalCity"
                        value={formData.physicalCity}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">State</label>
                      <input
                        type="text"
                        name="physicalState"
                        value={formData.physicalState}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">ZIP code</label>
                      <input
                        type="text"
                        name="physicalZipCode"
                        value={formData.physicalZipCode}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Mailing address */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Mailing address</label>
                      <input
                        type="text"
                        name="mailingAddress"
                        value={formData.mailingAddress}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">City</label>
                      <input
                        type="text"
                        name="mailingCity"
                        value={formData.mailingCity}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">State</label>
                      <input
                        type="text"
                        name="mailingState"
                        value={formData.mailingState}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">ZIP code</label>
                      <input
                        type="text"
                        name="mailingZipCode"
                        value={formData.mailingZipCode}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Finding directions */}
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Finding directions to home:</label>
                    <textarea
                      name="findingDirections"
                      value={formData.findingDirections}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full border border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px]"
                    />
                  </div>

                  {/* Home type and details */}
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <label className="block mb-2 font-semibold text-gray-800 text-[11px]">Home:</label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="homeType"
                            value="rent"
                            checked={formData.homeType === 'rent'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Rent</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="homeType"
                            value="own"
                            checked={formData.homeType === 'own'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Own</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Square footage:</label>
                      <input
                        type="text"
                        name="squareFootage"
                        value={formData.squareFootage}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Number of bedrooms:</label>
                      <input
                        type="text"
                        name="numberOfBedrooms"
                        value={formData.numberOfBedrooms}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Resource Applicant Information Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Resource Applicant Information
                </div>

                <div className="text-[11px] mb-4 text-gray-800">
                  <p>
                    For <strong>each adult applicant</strong>, provide the following information. Use the "+" button on the electronic form to add a second applicant.
                  </p>
                </div>

                <div className="font-bold text-[11px] mb-3 text-gray-800">
                  Resource Applicant 1 Information
                </div>

                <div className="space-y-4">
                  {/* Name fields */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">First name</label>
                      <input
                        type="text"
                        name="applicant1FirstName"
                        value={formData.applicant1FirstName}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Middle name</label>
                      <input
                        type="text"
                        name="applicant1MiddleName"
                        value={formData.applicant1MiddleName}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Last name</label>
                      <input
                        type="text"
                        name="applicant1LastName"
                        value={formData.applicant1LastName}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Other names */}
                  <div>
                    <label className="block mb-1 text-gray-800 text-[11px]">
                      Other names used including maiden name, any other name by which you are or have been known, or aliases, when applicable
                    </label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="text"
                        name="applicant1OtherNames"
                        value={formData.applicant1OtherNames}
                        onChange={handleInputChange}
                        disabled={formData.applicant1OtherNamesNA}
                        className="flex-1 border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px] disabled:opacity-50"
                      />
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="applicant1OtherNamesNA"
                          checked={formData.applicant1OtherNamesNA}
                          onChange={(e) => setFormData(prev => ({ ...prev, applicant1OtherNamesNA: e.target.checked }))}
                          className="mr-1 w-3 h-3"
                        />
                        <span className="text-[11px]">N/A</span>
                      </label>
                    </div>
                  </div>

                  {/* Personal details row 1 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Date of birth</label>
                      <input
                        type="date"
                        name="applicant1DateOfBirth"
                        value={formData.applicant1DateOfBirth}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Social Security number</label>
                      <input
                        type="text"
                        name="applicant1SSN"
                        value={formData.applicant1SSN}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Gender</label>
                      <input
                        type="text"
                        name="applicant1Gender"
                        value={formData.applicant1Gender}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Personal details row 2 */}
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-4">
                      <label className="block mb-1 text-gray-800 text-[11px]">Tribe, if applicable</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          name="applicant1Tribe"
                          value={formData.applicant1Tribe}
                          onChange={handleInputChange}
                          disabled={formData.applicant1TribeNA}
                          className="flex-1 border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px] disabled:opacity-50"
                        />
                        <label className="flex items-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            name="applicant1TribeNA"
                            checked={formData.applicant1TribeNA}
                            onChange={(e) => setFormData(prev => ({ ...prev, applicant1TribeNA: e.target.checked }))}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">N/A</span>
                        </label>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 text-gray-800 text-[11px]">Hispanic or Latino origin?</label>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1HispanicLatino"
                            value="yes"
                            checked={formData.applicant1HispanicLatino === 'yes'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1HispanicLatino"
                            value="no"
                            checked={formData.applicant1HispanicLatino === 'no'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">No</span>
                        </label>
                      </div>
                    </div>
                    <div className="col-span-5">
                      <div className="flex items-end justify-end gap-4">
                        <div className="text-right">
                          <label className="block mb-1 text-gray-800 text-[11px]">Are you a U.S. citizen?</label>
                          <div className="flex gap-3">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="applicant1USCitizen"
                                value="yes"
                                checked={formData.applicant1USCitizen === 'yes'}
                                onChange={handleInputChange}
                                className="mr-1 w-3 h-3"
                              />
                              <span className="text-[11px]">Yes</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="applicant1USCitizen"
                                value="no"
                                checked={formData.applicant1USCitizen === 'no'}
                                onChange={handleInputChange}
                                className="mr-1 w-3 h-3"
                              />
                              <span className="text-[11px]">No</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Race */}
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Race</label>
                    <input
                      type="text"
                      name="applicant1Race"
                      value={formData.applicant1Race}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                    />
                  </div>

                  {/* Phone numbers */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Work phone</label>
                      <input
                        type="tel"
                        name="applicant1WorkPhone"
                        value={formData.applicant1WorkPhone}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Cell phone</label>
                      <input
                        type="tel"
                        name="applicant1CellPhone"
                        value={formData.applicant1CellPhone}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Home phone</label>
                      <input
                        type="tel"
                        name="applicant1HomePhone"
                        value={formData.applicant1HomePhone}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Email address</label>
                    <input
                      type="email"
                      name="applicant1Email"
                      value={formData.applicant1Email}
                      onChange={handleInputChange}
                      className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD01E</span>
                <span>11/14/2022</span>
                <span>Page 1 of 7</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(9)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(11)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 11 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Continuation of Applicant 1 Information */}
              <div className="mb-6">
                <div className="space-y-4">
                  {/* States lived */}
                  <div>
                    <label className="block mb-1 text-gray-800 text-[11px]">
                      List each state you have lived in within the last five years
                    </label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="text"
                        name="applicant1StatesLived"
                        value={formData.applicant1StatesLived}
                        onChange={handleInputChange}
                        disabled={formData.applicant1StatesLivedNA}
                        className="flex-1 border-b border-gray-400 px-2 py-1 outline-none bg-gray-50 text-[11px] disabled:opacity-50"
                      />
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="applicant1StatesLivedNA"
                          checked={formData.applicant1StatesLivedNA}
                          onChange={(e) => setFormData(prev => ({ ...prev, applicant1StatesLivedNA: e.target.checked }))}
                          className="mr-1 w-3 h-3"
                        />
                        <span className="text-[11px]">N/A</span>
                      </label>
                    </div>
                  </div>

                  {/* Marital status */}
                  <div>
                    <label className="block mb-2 text-gray-800 text-[11px]">Select one:</label>
                    <div className="flex flex-wrap gap-4">
                      {['Single', 'Unmarried couple', 'Married', 'Divorced', 'Widowed', 'Separated'].map((status) => (
                        <label key={status} className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1MaritalStatus"
                            value={status.toLowerCase()}
                            checked={formData.applicant1MaritalStatus === status.toLowerCase()}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Previous marriages */}
                  <div>
                    <label className="block mb-1 text-gray-800 text-[11px]">Number of previous marriages:</label>
                    <input
                      type="text"
                      name="applicant1PreviousMarriages"
                      value={formData.applicant1PreviousMarriages}
                      onChange={handleInputChange}
                      className="w-48 border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                    />
                  </div>

                  {/* Education and military */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block mb-1 text-gray-800 text-[11px]">Highest grade completed:</label>
                      <input
                        type="text"
                        name="applicant1HighestGrade"
                        value={formData.applicant1HighestGrade}
                        onChange={handleInputChange}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-gray-800 text-[11px]">Advanced degree?</label>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1AdvancedDegree"
                            value="yes"
                            checked={formData.applicant1AdvancedDegree === 'yes'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1AdvancedDegree"
                            value="no"
                            checked={formData.applicant1AdvancedDegree === 'no'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Military service */}
                  <div>
                    <label className="block mb-1 text-gray-800 text-[11px]">
                      Have you served or are you currently serving in the armed forces?
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="applicant1ArmedForces"
                          value="yes"
                          checked={formData.applicant1ArmedForces === 'yes'}
                          onChange={handleInputChange}
                          className="mr-1 w-3 h-3"
                        />
                        <span className="text-[11px]">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="applicant1ArmedForces"
                          value="no"
                          checked={formData.applicant1ArmedForces === 'no'}
                          onChange={handleInputChange}
                          className="mr-1 w-3 h-3"
                        />
                        <span className="text-[11px]">No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Employment
                </div>

                <div className="space-y-4">
                  {/* Employment status */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block mb-1 text-gray-800 text-[11px]">Are you employed?</label>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1Employed"
                            value="yes"
                            checked={formData.applicant1Employed === 'yes'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1Employed"
                            value="no"
                            checked={formData.applicant1Employed === 'no'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 text-gray-800 text-[11px]">Are you self-employed?</label>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1SelfEmployed"
                            value="yes"
                            checked={formData.applicant1SelfEmployed === 'yes'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1SelfEmployed"
                            value="no"
                            checked={formData.applicant1SelfEmployed === 'no'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Unemployed Section */}
                  <div className="bg-gray-100 p-3">
                    <div className="font-bold text-[11px] mb-2 text-gray-800">Unemployed</div>
                    <div className="space-y-2">
                      <div>
                        <label className="block mb-1 text-gray-800 text-[11px]">Source of income</label>
                        <input
                          type="text"
                          name="applicant1UnemployedIncome"
                          value={formData.applicant1UnemployedIncome}
                          onChange={handleInputChange}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-gray-800 text-[11px]">Take-home</label>
                        <input
                          type="text"
                          name="applicant1UnemployedTakeHome"
                          value={formData.applicant1UnemployedTakeHome}
                          onChange={handleInputChange}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Employed (Non Self-Employment) Section */}
                  <div className="bg-gray-100 p-3">
                    <div className="font-bold text-[11px] mb-2 text-gray-800">Employed (Non Self-Employment)</div>
                    <div className="space-y-3">
                      <div>
                        <label className="block mb-1 text-gray-800 text-[11px]">Source of income:</label>
                        <input
                          type="text"
                          name="applicant1EmployedIncome"
                          value={formData.applicant1EmployedIncome}
                          onChange={handleInputChange}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-gray-800 text-[11px]">Total approximate monthly take-home pay:</label>
                        <input
                          type="text"
                          name="applicant1EmployedTakeHome"
                          value={formData.applicant1EmployedTakeHome}
                          onChange={handleInputChange}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1 text-gray-800 text-[11px]">Employer name</label>
                          <input
                            type="text"
                            name="applicant1EmployerName"
                            value={formData.applicant1EmployerName}
                            onChange={handleInputChange}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-gray-800 text-[11px]">Job title</label>
                          <input
                            type="text"
                            name="applicant1JobTitle"
                            value={formData.applicant1JobTitle}
                            onChange={handleInputChange}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1 text-gray-800 text-[11px]">Supervisor's name</label>
                          <input
                            type="text"
                            name="applicant1SupervisorName"
                            value={formData.applicant1SupervisorName}
                            onChange={handleInputChange}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-gray-800 text-[11px]">Supervisor's phone number</label>
                          <input
                            type="tel"
                            name="applicant1SupervisorPhone"
                            value={formData.applicant1SupervisorPhone}
                            onChange={handleInputChange}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block mb-1 text-gray-800 text-[11px]">Supervisor's email address</label>
                        <input
                          type="email"
                          name="applicant1SupervisorEmail"
                          value={formData.applicant1SupervisorEmail}
                          onChange={handleInputChange}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Self-Employment Section */}
                  <div className="bg-gray-100 p-3">
                    <div className="font-bold text-[11px] mb-2 text-gray-800">Self-Employment</div>
                    <div className="space-y-2">
                      <div>
                        <label className="block mb-1 text-gray-800 text-[11px]">Total approximate monthly take-home pay:</label>
                        <input
                          type="text"
                          name="applicant1SelfEmployedTakeHome"
                          value={formData.applicant1SelfEmployedTakeHome}
                          onChange={handleInputChange}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-gray-800 text-[11px]">
                          List a client or co-worker that can be contacted, include phone number and email address:
                        </label>
                        <input
                          type="text"
                          name="applicant1SelfEmployedContact"
                          value={formData.applicant1SelfEmployedContact}
                          onChange={handleInputChange}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-white text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="mb-6">
                <div className="font-bold text-[11px] mb-3 text-gray-800">Additional Information</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-800">
                      Have you ever applied to foster, adopt, or provide in home daycare in any state?
                    </span>
                    <div className="flex gap-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="applicant1PreviousFosterApply"
                          value="yes"
                          checked={formData.applicant1PreviousFosterApply === 'yes'}
                          onChange={handleInputChange}
                          className="mr-1 w-3 h-3"
                        />
                        <span className="text-[11px]">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="applicant1PreviousFosterApply"
                          value="no"
                          checked={formData.applicant1PreviousFosterApply === 'no'}
                          onChange={handleInputChange}
                          className="mr-1 w-3 h-3"
                        />
                        <span className="text-[11px]">No</span>
                      </label>
                    </div>
                  </div>

                  <div className="text-[11px] mb-2 text-gray-800">Have you:</div>

                  <div className="ml-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-800">• been arrested or had criminal charges filed?</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1ArrestedCharges"
                            value="yes"
                            checked={formData.applicant1ArrestedCharges === 'yes'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1ArrestedCharges"
                            value="no"
                            checked={formData.applicant1ArrestedCharges === 'no'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">No</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-800">• entered a plea of guilty or nolo contendere to a crime?</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1PleaGuilty"
                            value="yes"
                            checked={formData.applicant1PleaGuilty === 'yes'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1PleaGuilty"
                            value="no"
                            checked={formData.applicant1PleaGuilty === 'no'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">No</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-800">• been investigated for child physical abuse, sexual abuse, or neglect?</span>
                      <div className="flex gap-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1InvestigatedAbuse"
                            value="yes"
                            checked={formData.applicant1InvestigatedAbuse === 'yes'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="applicant1InvestigatedAbuse"
                            value="no"
                            checked={formData.applicant1InvestigatedAbuse === 'no'}
                            onChange={handleInputChange}
                            className="mr-1 w-3 h-3"
                          />
                          <span className="text-[11px]">No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD01E</span>
                <span>11/14/2022</span>
                <span>Page 2 of 7</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(10)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(12)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 12 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Protective Order Question */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-800">• filed or been party to a protective order?</span>
                  <div className="flex gap-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="applicant1ProtectiveOrder"
                        value="yes"
                        checked={formData.applicant1ProtectiveOrder === 'yes'}
                        onChange={handleInputChange}
                        className="mr-1 w-3 h-3"
                      />
                      <span className="text-[11px]">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="applicant1ProtectiveOrder"
                        value="no"
                        checked={formData.applicant1ProtectiveOrder === 'no'}
                        onChange={handleInputChange}
                        className="mr-1 w-3 h-3"
                      />
                      <span className="text-[11px]">No</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Other Household Members Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4 flex justify-between items-center">
                  <span>Other Household Members</span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="otherHouseholdMembersNA"
                      checked={formData.otherHouseholdMembersNA}
                      onChange={(e) => setFormData(prev => ({ ...prev, otherHouseholdMembersNA: e.target.checked }))}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-xs">N/A</span>
                  </label>
                </div>

                <div className="text-[11px] mb-4 text-gray-800 leading-relaxed">
                  <p>
                    <strong>All other persons residing in the home must be listed including children, relatives, and non-relatives.</strong> Add additional sheets as necessary or use the "+" button on the electronic form to add more household members. For each school-age child, list a contact person and contact information at the child's school, such as the principal, counselor, or teacher. A reference is obtained on each school-aged child.
                  </p>
                </div>

                <div className="font-bold text-[11px] mb-3 text-gray-800">
                  Household Member Information
                </div>

                {formData.householdMembers.map((member, index) => (
                  <div key={index} className="mb-6 pb-4 border-b border-gray-300">
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-3">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">First name</label>
                          <input
                            type="text"
                            value={member.firstName}
                            onChange={(e) => {
                              const newMembers = [...formData.householdMembers];
                              newMembers[index].firstName = e.target.value;
                              setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Middle name</label>
                          <input
                            type="text"
                            value={member.middleName}
                            onChange={(e) => {
                              const newMembers = [...formData.householdMembers];
                              newMembers[index].middleName = e.target.value;
                              setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Last name</label>
                          <input
                            type="text"
                            value={member.lastName}
                            onChange={(e) => {
                              const newMembers = [...formData.householdMembers];
                              newMembers[index].lastName = e.target.value;
                              setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Date of birth</label>
                          <input
                            type="date"
                            value={member.dateOfBirth}
                            onChange={(e) => {
                              const newMembers = [...formData.householdMembers];
                              newMembers[index].dateOfBirth = e.target.value;
                              setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Gender</label>
                          <input
                            type="text"
                            value={member.gender}
                            onChange={(e) => {
                              const newMembers = [...formData.householdMembers];
                              newMembers[index].gender = e.target.value;
                              setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Social Security number</label>
                          <input
                            type="text"
                            value={member.ssn}
                            onChange={(e) => {
                              const newMembers = [...formData.householdMembers];
                              newMembers[index].ssn = e.target.value;
                              setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Relationship to applicant</label>
                          <input
                            type="text"
                            value={member.relationship}
                            onChange={(e) => {
                              const newMembers = [...formData.householdMembers];
                              newMembers[index].relationship = e.target.value;
                              setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-800">Is the household member currently enrolled in K-12 school?</span>
                        <div className="flex gap-3 mt-1">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`k12Enrolled_${index}`}
                              value="yes"
                              checked={member.k12Enrolled === 'yes'}
                              onChange={(e) => {
                                const newMembers = [...formData.householdMembers];
                                newMembers[index].k12Enrolled = e.target.value;
                                setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                              }}
                              className="mr-1 w-3 h-3"
                            />
                            <span className="text-[11px]">Yes</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`k12Enrolled_${index}`}
                              value="no"
                              checked={member.k12Enrolled === 'no'}
                              onChange={(e) => {
                                const newMembers = [...formData.householdMembers];
                                newMembers[index].k12Enrolled = e.target.value;
                                setFormData(prev => ({ ...prev, householdMembers: newMembers }));
                              }}
                              className="mr-1 w-3 h-3"
                            />
                            <span className="text-[11px]">No</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Applicant's Child(ren) Not Living in the Home */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4 flex justify-between items-center">
                  <span>Applicant's Child(ren) Under 18 Years of Age Not Living in the Home</span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="childrenNotLivingNA"
                      checked={formData.childrenNotLivingNA}
                      onChange={(e) => setFormData(prev => ({ ...prev, childrenNotLivingNA: e.target.checked }))}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-xs">N/A</span>
                  </label>
                </div>

                <div className="text-[11px] mb-4 text-gray-800">
                  <p>
                    List each applicant's child(ren) under 18 years of age not living in the home and explain why he or she does not reside in the home.
                  </p>
                </div>

                <div className="font-bold text-[11px] mb-3 text-gray-800">
                  Child 1 Information
                </div>

                {formData.childrenNotLiving.map((child, index) => (
                  <div key={index} className="mb-4 space-y-3">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-3">
                        <label className="block mb-1 font-semibold text-gray-800 text-[11px]">First name</label>
                        <input
                          type="text"
                          value={child.firstName}
                          onChange={(e) => {
                            const newChildren = [...formData.childrenNotLiving];
                            newChildren[index].firstName = e.target.value;
                            setFormData(prev => ({ ...prev, childrenNotLiving: newChildren }));
                          }}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Middle name</label>
                        <input
                          type="text"
                          value={child.middleName}
                          onChange={(e) => {
                            const newChildren = [...formData.childrenNotLiving];
                            newChildren[index].middleName = e.target.value;
                            setFormData(prev => ({ ...prev, childrenNotLiving: newChildren }));
                          }}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Last name</label>
                        <input
                          type="text"
                          value={child.lastName}
                          onChange={(e) => {
                            const newChildren = [...formData.childrenNotLiving];
                            newChildren[index].lastName = e.target.value;
                            setFormData(prev => ({ ...prev, childrenNotLiving: newChildren }));
                          }}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Date of birth</label>
                        <input
                          type="date"
                          value={child.dateOfBirth}
                          onChange={(e) => {
                            const newChildren = [...formData.childrenNotLiving];
                            newChildren[index].dateOfBirth = e.target.value;
                            setFormData(prev => ({ ...prev, childrenNotLiving: newChildren }));
                          }}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Reason the child is out of home:</label>
                      <input
                        type="text"
                        value={child.reason}
                        onChange={(e) => {
                          const newChildren = [...formData.childrenNotLiving];
                          newChildren[index].reason = e.target.value;
                          setFormData(prev => ({ ...prev, childrenNotLiving: newChildren }));
                        }}
                        className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* References Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  References
                </div>

                <div className="text-[11px] mb-4 text-gray-800 leading-relaxed">
                  <p>
                    As part of the applicant assessment, references are requested including employers, adult children, behavioral health professionals, and other individuals with personal knowledge of the applicant and the applicant's family.
                  </p>
                </div>

                <div className="font-bold text-[11px] mb-3 text-gray-800">
                  Personal
                </div>

                <div className="text-[11px] mb-4 text-gray-800 leading-relaxed">
                  <p>
                    Applicants must provide the name and contact information for four personal references, <strong>only ONE of whom can be a family member.</strong> Persons listed as personal references should not be an adult child or employer.
                  </p>
                </div>

                {formData.references.map((reference, index) => (
                  <div key={index} className="mb-4 space-y-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block mb-1 font-semibold text-gray-800 text-[11px]">First name</label>
                        <input
                          type="text"
                          value={reference.firstName}
                          onChange={(e) => {
                            const newReferences = [...formData.references];
                            newReferences[index].firstName = e.target.value;
                            setFormData(prev => ({ ...prev, references: newReferences }));
                          }}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Last name</label>
                        <input
                          type="text"
                          value={reference.lastName}
                          onChange={(e) => {
                            const newReferences = [...formData.references];
                            newReferences[index].lastName = e.target.value;
                            setFormData(prev => ({ ...prev, references: newReferences }));
                          }}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Phone number</label>
                        <input
                          type="tel"
                          value={reference.phoneNumber}
                          onChange={(e) => {
                            const newReferences = [...formData.references];
                            newReferences[index].phoneNumber = e.target.value;
                            setFormData(prev => ({ ...prev, references: newReferences }));
                          }}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Relationship</label>
                      <input
                        type="text"
                        value={reference.relationship}
                        onChange={(e) => {
                          const newReferences = [...formData.references];
                          newReferences[index].relationship = e.target.value;
                          setFormData(prev => ({ ...prev, references: newReferences }));
                        }}
                        className="w-full border-b-2 border-blue-600 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD01E</span>
                <span>11/14/2022</span>
                <span>Page 3 of 7</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(11)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(13)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 13 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Continuation of References (reference entries 2-4 already on page 12) */}

              {/* Counseling or Inpatient Treatment Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4 flex justify-between items-center">
                  <span>Counseling or Inpatient Treatment</span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="counselingTreatmentNA"
                      checked={formData.counselingTreatmentNA}
                      onChange={(e) => setFormData(prev => ({ ...prev, counselingTreatmentNA: e.target.checked }))}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-xs">N/A</span>
                  </label>
                </div>

                <div className="text-[11px] mb-4 text-gray-800 leading-relaxed">
                  <p>
                    If any applicant or child in the home participates or has participated in counseling, individual or group therapy, or inpatient treatment, provide the following information. If more than one provider was seen within the last 10 years by the applicant or child, list each provider separately by using the "+" button to add additional providers.
                  </p>
                </div>

                {formData.counselingMembers.map((member, index) => (
                  <div key={index} className="mb-6">
                    <div className="font-bold text-[11px] mb-3 text-gray-800">
                      Household Member {index + 1}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Name</label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => {
                              const newMembers = [...formData.counselingMembers];
                              newMembers[index].name = e.target.value;
                              setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Dates of treatment</label>
                          <input
                            type="text"
                            value={member.datesOfTreatment}
                            onChange={(e) => {
                              const newMembers = [...formData.counselingMembers];
                              newMembers[index].datesOfTreatment = e.target.value;
                              setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Provider name</label>
                        <input
                          type="text"
                          value={member.providerName}
                          onChange={(e) => {
                            const newMembers = [...formData.counselingMembers];
                            newMembers[index].providerName = e.target.value;
                            setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                          }}
                          className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                        />
                      </div>

                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-5">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Address</label>
                          <input
                            type="text"
                            value={member.address}
                            onChange={(e) => {
                              const newMembers = [...formData.counselingMembers];
                              newMembers[index].address = e.target.value;
                              setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">City</label>
                          <input
                            type="text"
                            value={member.city}
                            onChange={(e) => {
                              const newMembers = [...formData.counselingMembers];
                              newMembers[index].city = e.target.value;
                              setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">State</label>
                          <input
                            type="text"
                            value={member.state}
                            onChange={(e) => {
                              const newMembers = [...formData.counselingMembers];
                              newMembers[index].state = e.target.value;
                              setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Zip code</label>
                          <input
                            type="text"
                            value={member.zipCode}
                            onChange={(e) => {
                              const newMembers = [...formData.counselingMembers];
                              newMembers[index].zipCode = e.target.value;
                              setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Phone number</label>
                          <input
                            type="tel"
                            value={member.phoneNumber}
                            onChange={(e) => {
                              const newMembers = [...formData.counselingMembers];
                              newMembers[index].phoneNumber = e.target.value;
                              setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Email</label>
                          <input
                            type="email"
                            value={member.email}
                            onChange={(e) => {
                              const newMembers = [...formData.counselingMembers];
                              newMembers[index].email = e.target.value;
                              setFormData(prev => ({ ...prev, counselingMembers: newMembers }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adult Child(ren) Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4 flex justify-between items-center">
                  <span>Adult Child(ren)</span>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="adultChildrenNA"
                      checked={formData.adultChildrenNA}
                      onChange={(e) => setFormData(prev => ({ ...prev, adultChildrenNA: e.target.checked }))}
                      className="mr-2 w-4 h-4"
                    />
                    <span className="text-xs">N/A</span>
                  </label>
                </div>

                {formData.adultChildren.map((child, index) => (
                  <div key={index} className="mb-6">
                    <div className="font-bold text-[11px] mb-3 text-gray-800">
                      Adult Child {index + 1} Information
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-5">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">First name</label>
                          <input
                            type="text"
                            value={child.firstName}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].firstName = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">M.I.</label>
                          <input
                            type="text"
                            maxLength="1"
                            value={child.middleInitial}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].middleInitial = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-5">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Last name</label>
                          <input
                            type="text"
                            value={child.lastName}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].lastName = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Phone number</label>
                          <input
                            type="tel"
                            value={child.phoneNumber}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].phoneNumber = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Email</label>
                          <input
                            type="email"
                            value={child.email}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].email = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-5">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">Address</label>
                          <input
                            type="text"
                            value={child.address}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].address = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">City</label>
                          <input
                            type="text"
                            value={child.city}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].city = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">State</label>
                          <input
                            type="text"
                            value={child.state}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].state = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block mb-1 font-semibold text-gray-800 text-[11px]">ZIP code</label>
                          <input
                            type="text"
                            value={child.zipCode}
                            onChange={(e) => {
                              const newChildren = [...formData.adultChildren];
                              newChildren[index].zipCode = e.target.value;
                              setFormData(prev => ({ ...prev, adultChildren: newChildren }));
                            }}
                            className="w-full border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD01E</span>
                <span>11/14/2022</span>
                <span>Page 4 of 7</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(12)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(14)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 14 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Adult Child Contact Question */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-800">Do you have contact with this adult child?</span>
                  <div className="flex gap-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="contactWithAdultChild"
                        value="yes"
                        checked={formData.contactWithAdultChild === 'yes'}
                        onChange={handleInputChange}
                        className="mr-1 w-3 h-3"
                      />
                      <span className="text-[11px]">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="contactWithAdultChild"
                        value="no"
                        checked={formData.contactWithAdultChild === 'no'}
                        onChange={handleInputChange}
                        className="mr-1 w-3 h-3"
                      />
                      <span className="text-[11px]">No</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Signature and Agreement Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Signature and Agreement
                </div>

                <div className="text-[11px] text-gray-800 leading-relaxed mb-6">
                  <p>
                    I, the undersigned, have provided accurate information and authorize OKDHS to use this information, including the national criminal background investigation, all applicable out-of-state child abuse and neglect registry checks, an Oklahoma Child Abuse and Neglect Information System check, a Community Services Worker Registry check, and all accompanying records, in completing an assessment of the applicants. I further authorize OKDHS to conduct a Juvenile Justice Information System review for children 13 years of age and older, contact references, and contact me by email. I understand that failure of <strong>all household members 18 years of age and older to sign this form will result in denial or withdrawal of the application.</strong>
                  </p>
                </div>

                <div className="text-[11px] text-gray-800 mb-6">
                  <p>
                    <strong>By signing this application, I agree to complete these activities and provide these documents or information within 20-calendar days of my signature date.</strong>
                  </p>
                </div>

                <div className="font-bold text-[11px] mb-3 text-gray-800">
                  Unsworn Falsification Under Penalty of Perjury
                </div>

                <div className="text-[11px] text-gray-800 mb-4 leading-relaxed">
                  <p>
                    I state under penalty of perjury under the laws of Oklahoma that the foregoing is true and correct to the best of my information and belief.
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-gray-800 mb-3">
                    <span>Subscribed on this</span>
                    <input
                      type="text"
                      name="signatureDay"
                      value={formData.signatureDay}
                      onChange={handleInputChange}
                      className="w-16 border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-center"
                      placeholder="day"
                    />
                    <span>day of</span>
                    <input
                      type="text"
                      name="signatureMonth"
                      value={formData.signatureMonth}
                      onChange={handleInputChange}
                      className="w-32 border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-center"
                      placeholder="month"
                    />
                    <span>, 20</span>
                    <input
                      type="text"
                      name="signatureYear"
                      value={formData.signatureYear}
                      onChange={handleInputChange}
                      className="w-12 border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-center"
                      placeholder="YY"
                    />
                    <span>at (city)</span>
                    <input
                      type="text"
                      name="signatureCity"
                      value={formData.signatureCity}
                      onChange={handleInputChange}
                      className="flex-1 border-b border-gray-400 px-2 py-1 outline-none bg-transparent"
                    />
                    <span>,</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-800">
                    <span>(state)</span>
                    <input
                      type="text"
                      name="signatureState"
                      value={formData.signatureState}
                      onChange={handleInputChange}
                      className="w-48 border-b border-gray-400 px-2 py-1 outline-none bg-transparent"
                    />
                    <span>.</span>
                  </div>
                </div>

                {/* Applicant Signatures */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-[11px]">Applicant 1 Signature</label>
                    <SignatureCanvas
                      ref={applicant1SignatureRef}
                      width={450}
                      height={120}
                      onSave={(dataURL) => {
                        setFormData(prev => ({
                          ...prev,
                          applicant1Signature: dataURL,
                          applicant1SignatureDate: new Date().toISOString().split('T')[0]
                        }));
                      }}
                    />
                    {formData.applicant1Signature && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-xs text-green-700">
                        ✓ Signature saved (Date: {formData.applicant1SignatureDate})
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-[11px]">Applicant 2 Signature</label>
                    <SignatureCanvas
                      ref={applicant2SignatureRef}
                      width={450}
                      height={120}
                      onSave={(dataURL) => {
                        setFormData(prev => ({
                          ...prev,
                          applicant2Signature: dataURL,
                          applicant2SignatureDate: new Date().toISOString().split('T')[0]
                        }));
                      }}
                    />
                    {formData.applicant2Signature && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-xs text-green-700">
                        ✓ Signature saved (Date: {formData.applicant2SignatureDate})
                      </div>
                    )}
                  </div>
                </div>

                {/* Adult Household Member Signatures */}
                <div className="space-y-6">
                  {[1, 2, 3, 4].map((num) => {
                    const refMap = {
                      1: adultMember1SignatureRef,
                      2: adultMember2SignatureRef,
                      3: adultMember3SignatureRef,
                      4: adultMember4SignatureRef
                    };
                    return (
                      <div key={num}>
                        <label className="block mb-2 font-semibold text-gray-800 text-[11px]">
                          Adult Household Member {num} Signature
                        </label>
                        <SignatureCanvas
                          ref={refMap[num]}
                          width={450}
                          height={100}
                          onSave={(dataURL) => {
                            setFormData(prev => ({
                              ...prev,
                              [`adultMember${num}Signature`]: dataURL,
                              [`adultMember${num}SignatureDate`]: new Date().toISOString().split('T')[0]
                            }));
                          }}
                        />
                        {formData[`adultMember${num}Signature`] && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-xs text-green-700">
                            ✓ Signature saved (Date: {formData[`adultMember${num}SignatureDate`]})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notice Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Notice
                </div>

                <div className="text-[11px] text-gray-800 leading-relaxed">
                  <p>
                    OKDHS has assured compliance with United States Department of Health and Human Services (DHHS) Regulations, Title 45, Code of Federal Regulations, Part 80, that implements Public Law 88-352, Civil Rights Act of 1964, Section 601, Part 84, that implements Public Law 93-112, Rehabilitation Act of 1973, Section 504, and Part 90, that implements Public Law 94-135, Age Discrimination Act of 1975, Section 301. These laws and regulations prohibit excluding participation in, denying the benefits of, or subjecting to discrimination under any program or activity receiving federal financial assistance, any person on the grounds of race, color, national origin or any qualified person on the basis of handicap or, unless program-enabling legislation permits, on the basis of age. Under these requirements, payment cannot be made to vendors providing care, services, or both in federally-assisted programs conducted by OKDHS unless such care, service, or both is provided without discrimination on the grounds of race, color, national origin, or handicap or without distinction on the basis of age, except as legislatively permitted or required. Written complaints about non-compliance with any of these laws should be made to the OKDHS Director, PO Box 25352, Oklahoma City, Oklahoma 73125, Secretary of Health and Human Services, Washington D.C., or both.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD01E</span>
                <span>11/14/2022</span>
                <span>Page 5 of 7</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(13)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(15)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 15 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Agency Use Only Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Agency Use Only
                </div>

                <div className="space-y-4">
                  {/* Resource Assessment Type */}
                  <div>
                    <div className="text-[11px] font-semibold text-gray-800 mb-2">
                      Check each type of resource assessment requested:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="assessmentFosterHome"
                          checked={formData.assessmentFosterHome}
                          onChange={(e) => setFormData(prev => ({ ...prev, assessmentFosterHome: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">Foster home</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="assessmentKinshipFoster"
                          checked={formData.assessmentKinshipFoster}
                          onChange={(e) => setFormData(prev => ({ ...prev, assessmentKinshipFoster: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">Kinship foster home</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="assessmentAdoptive"
                          checked={formData.assessmentAdoptive}
                          onChange={(e) => setFormData(prev => ({ ...prev, assessmentAdoptive: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">Adoptive home</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="assessmentBothAdoptiveFoster"
                          checked={formData.assessmentBothAdoptiveFoster}
                          onChange={(e) => setFormData(prev => ({ ...prev, assessmentBothAdoptiveFoster: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">Both adoptive and foster home</span>
                      </label>
                    </div>
                  </div>

                  {/* Resource Home Type */}
                  <div>
                    <div className="text-[11px] font-semibold text-gray-800 mb-2">
                      Check which type of resource home for which the applicant is applying.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="resourceHomeDHS"
                          checked={formData.resourceHomeDHS}
                          onChange={(e) => setFormData(prev => ({ ...prev, resourceHomeDHS: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">DHS home</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="resourceHomeSupportedAgency"
                          checked={formData.resourceHomeSupportedAgency}
                          onChange={(e) => setFormData(prev => ({ ...prev, resourceHomeSupportedAgency: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">Supported agency home</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="resourceHomeTherapeutic"
                          checked={formData.resourceHomeTherapeutic}
                          onChange={(e) => setFormData(prev => ({ ...prev, resourceHomeTherapeutic: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">Therapeutic home</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="resourceHomeIntensiveTreatment"
                          checked={formData.resourceHomeIntensiveTreatment}
                          onChange={(e) => setFormData(prev => ({ ...prev, resourceHomeIntensiveTreatment: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">Intensive Treatment Family Care</span>
                      </label>
                    </div>
                  </div>

                  {/* Documentation Received */}
                  <div className="mt-6">
                    <div className="font-bold text-[11px] text-gray-800 mb-3">
                      Applications cannot be processed until all documentation is received
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="agencyReceivedDocumentation"
                          checked={formData.agencyReceivedDocumentation}
                          onChange={(e) => setFormData(prev => ({ ...prev, agencyReceivedDocumentation: e.target.checked }))}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-[11px]">Agency received documentation from applicant on:</span>
                      </label>
                      <input
                        type="date"
                        name="agencyReceivedDate"
                        value={formData.agencyReceivedDate}
                        onChange={handleInputChange}
                        className="border-b border-gray-400 px-2 py-1 outline-none bg-transparent text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD01E</span>
                <span>11/14/2022</span>
                <span>Page 6 of 7</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(14)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(16)}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors uppercase tracking-wide"
                >
                  Continue →
                </button>
              </div>
            </form>
          </div>
        )}

        {currentPage === 16 && (
          <div className="bg-white">
            <form onSubmit={handleSubmit}>
              {/* Required Forms and Verification Documents Section */}
              <div className="mb-6">
                <div className="bg-blue-600 text-white px-3 py-2 font-bold text-sm mb-4">
                  Required Forms and Verification Documents
                </div>

                <div className="text-[11px] text-gray-800 leading-relaxed mb-6">
                  <p>
                    Below is a list of forms and verification documents that applicants are required to provide to the agency within 20 calendar days.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredMedicalExam"
                      checked={formData.requiredMedicalExam}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredMedicalExam: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px] leading-relaxed">
                      Form 04AF008E, Medical Examination Report, for each adult household member 18 years of age or older. Appointment date(s) 
                      <input
                        type="text"
                        name="medicalExamAppointmentDate"
                        value={formData.medicalExamAppointmentDate}
                        onChange={handleInputChange}
                        className="border-b border-gray-400 outline-none bg-transparent px-2 w-48 ml-2"
                      />
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredFinancialAssessment"
                      checked={formData.requiredFinancialAssessment}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredFinancialAssessment: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Form 04AF010E, Resource Family Financial Assessment.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredParentHealthHistory"
                      checked={formData.requiredParentHealthHistory}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredParentHealthHistory: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">
                      Form 04AF017E, Resource Parent Health History, for each adult household member 18 years of age or older.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredChildHealthStatement"
                      checked={formData.requiredChildHealthStatement}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredChildHealthStatement: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px] leading-relaxed">
                      Form 04AF039E, Child(ren)'s Health Statement, from the physician for each child in the household, not in the legal custody, when applicable. Appointment date(s) 
                      <input
                        type="text"
                        name="childHealthAppointmentDate"
                        value={formData.childHealthAppointmentDate}
                        onChange={handleInputChange}
                        className="border-b border-gray-400 outline-none bg-transparent px-2 w-48 ml-2"
                      />
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredChildCareApplication"
                      checked={formData.requiredChildCareApplication}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredChildCareApplication: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">
                      Form 04MP042E, Application for Child Welfare Services Child Care Benefits, when applicable.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredOtherAdults"
                      checked={formData.requiredOtherAdults}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredOtherAdults: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">
                      Form 04AF043E, Resource Family Application Other Adults in the Home, when applicable.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredDivorceDecrees"
                      checked={formData.requiredDivorceDecrees}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredDivorceDecrees: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Copy of all divorce decrees for each applicant, when applicable.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredAutoInsurance"
                      checked={formData.requiredAutoInsurance}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredAutoInsurance: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Copy of automobile insurance verification for each applicant, when applicable.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredCDIB"
                      checked={formData.requiredCDIB}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredCDIB: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px] leading-relaxed">
                      Copy of Certificate of Degree of Indian Blood (CDIB) card and/or tribal membership card for each applicant, when applicable.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredMarriageLicense"
                      checked={formData.requiredMarriageLicense}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredMarriageLicense: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Copy of current marriage license, when applicable.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredDD214"
                      checked={formData.requiredDD214}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredDD214: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px] leading-relaxed">
                      Copy of DD Form 214, Certificate of Release from Active Military Duty, for each applicant, when applicable.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredDriverLicense"
                      checked={formData.requiredDriverLicense}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredDriverLicense: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Copy of driver license or state issued ID for each applicant.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredImmunization"
                      checked={formData.requiredImmunization}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredImmunization: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px] leading-relaxed">
                      Copy of immunization record for each child in household who is not in OKDHS custody, when applicable.
                    </span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredPaycheckStub"
                      checked={formData.requiredPaycheckStub}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredPaycheckStub: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Copy of paycheck stub(s) or income verification for each applicant.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredPetVaccination"
                      checked={formData.requiredPetVaccination}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredPetVaccination: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Copy of pet vaccination record(s), when applicable.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredSocialSecurity"
                      checked={formData.requiredSocialSecurity}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredSocialSecurity: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Copy of Social Security card for each applicant.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredFingerprints"
                      checked={formData.requiredFingerprints}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredFingerprints: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Submit fingerprints for each adult household member 18 years of age or older.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredLawfulResidence"
                      checked={formData.requiredLawfulResidence}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredLawfulResidence: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px]">Verification of lawful residence when not born in the United States, when applicable.</span>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="requiredOtherSpecify"
                      checked={formData.requiredOtherSpecify}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredOtherSpecify: e.target.checked }))}
                      className="mr-3 mt-0.5 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-[11px] flex items-center gap-2">
                      Other, specify:
                      <input
                        type="text"
                        name="requiredOtherSpecifyText"
                        value={formData.requiredOtherSpecifyText}
                        onChange={handleInputChange}
                        className="flex-1 border-b border-gray-400 px-2 py-1 outline-none bg-transparent"
                      />
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between text-[11px] text-gray-600 mt-8 pt-4 border-t border-gray-300">
                <span>04AFD01E</span>
                <span>11/14/2022</span>
                <span>Page 7 of 7</span>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t-2 border-gray-300">
                <button
                  type="button"
                  onClick={() => setCurrentPage(15)}
                  className="px-6 py-2.5 bg-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:bg-gray-400 uppercase tracking-wide"
                >
                  {loading ? 'Submitting...' : 'Submit Complete Application'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
