'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FosterCareApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    ssn: '',
    driversLicense: '',
    dlState: '',
    
    // Contact Information
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    homePhone: '',
    cellPhone: '',
    workPhone: '',
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

  const handleReferenceChange = (index, field, value) => {
    const updatedReferences = [...formData.references];
    updatedReferences[index][field] = value;
    setFormData(prev => ({ ...prev, references: updatedReferences }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/foster-care-application', {
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
            {/* Government Form Header - Exact match to Oklahoma form */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-3">
                <div className="w-12 h-12 flex items-center justify-center mr-3">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 text-gray-700">
                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="currentColor"/>
                  </svg>
                </div>
                <h1 className="text-4xl font-light text-gray-700 tracking-[0.3em]">
                  OPEN ARMS
                </h1>
              </div>
              <div className="text-sm text-gray-700 mb-1">Foster Care Services - Application Division</div>
              <div className="text-base font-semibold text-gray-900 uppercase">
                Foster Care Application and Consent
              </div>
            </div>

            {/* Form Instructions */}
            <div className="mb-12">
              <h2 className="text-base font-bold text-gray-900 mb-4">Form Instructions</h2>
              <div className="space-y-4 text-[13px] leading-relaxed text-gray-800">
                <p>
                  Please fill out completely all applicable portions of the Foster Care Application and Consent form.
                </p>
                
                <p>
                  Mail the form and all applicable fees, using one of the forms of payment listed at the bottom of the form, to:
                </p>
                <div className="pl-8 space-y-0.5">
                  <p>Open Arms Foster Care</p>
                  <p>Application Division</p>
                  <p>P. O. Box 12345</p>
                  <p>Oklahoma City, OK 73136-0415</p>
                </div>

                <p>
                  Please include a self-addressed stamped envelope with your request. Open Arms Foster Care will not mail documents C.O.D. Please <span className="font-bold">do not</span> use Federal Express (FedEx) or United Parcel Service (UPS).
                </p>

                <p>
                  You may also present the completed form and fees to Open Arms Foster Care at 6015 North Classen Boulevard in Oklahoma City, Oklahoma.
                </p>

                <p>
                  To obtain a regular foster care application summary, you may present the completed form and the $25 fee at any foster care licensing agency in the state.
                </p>

                <p>
                  Open Arms Foster Care does not issue National Foster Care Records.
                </p>

                <p>
                  Open Arms Foster Care is not affiliated with DocViews.
                </p>

                <p>
                  To preserve your rights and privacy under the <span className="font-semibold">Foster Care Privacy Protection Act, 18 U.S.C., Sections 2721 through 2725</span>:
                </p>
                <div className="pl-8 space-y-0.5">
                  <p>Requests for records cannot be made by telephone or email.</p>
                  <p>Records cannot be faxed or e-mailed.</p>
                </div>
              </div>
            </div>

            {/* Form ID at bottom */}
            <div className="text-right text-[11px] text-gray-600 mt-16">
              3038M 0097 02/2025
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
            <form onSubmit={handleSubmit} className="space-y-8">
            {/* I'll add the actual form fields when you share the next page */}
            <div className="text-center py-12">
              <p className="text-gray-600">Application form sections will appear here based on your next page design...</p>
            </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
