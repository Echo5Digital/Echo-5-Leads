'use client';

import { useState } from 'react';

export default function ShareFosterApplication() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const formUrl = 'https://echo-5-leads.vercel.app/foster-care-application';

  const handleSendLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/share-foster-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // If using auth
        },
        body: JSON.stringify({
          recipientEmail,
          recipientName,
          message,
          formUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send form link');
      }

      setSuccess(true);
      setRecipientEmail('');
      setRecipientName('');
      setMessage('');
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to send form link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formUrl);
    alert('Form link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Share Foster Care Application Form
            </h1>
            <p className="text-gray-600">
              Send the application form link to potential foster parents via email
            </p>
          </div>

          {/* Quick Copy Section */}
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Application Form Link
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={formUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                📋 Copy Link
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              You can copy this link and share it via text, WhatsApp, or any other method
            </p>
          </div>

          {/* Email Form */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Send via Email
            </h2>

            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                ✅ Form link sent successfully to {recipientEmail}
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSendLink} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Name *
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email *
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows="4"
                  placeholder="Add a personal message to include in the email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Email Preview:</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>To:</strong> {recipientEmail || 'recipient@example.com'}</p>
                  <p><strong>Subject:</strong> Foster Care Application - Open Arms Foster Care</p>
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200 text-xs">
                    <p>Dear {recipientName || '[Name]'},</p>
                    <br />
                    {message && (
                      <>
                        <p>{message}</p>
                        <br />
                      </>
                    )}
                    <p>Thank you for your interest in becoming a foster parent with Open Arms Foster Care!</p>
                    <p>To complete your application, please click the link below:</p>
                    <br />
                    <p className="text-blue-600 underline">{formUrl}</p>
                    <br />
                    <p>The application takes approximately 15-20 minutes to complete.</p>
                    <p>Once submitted, you will receive a confirmation email with a PDF copy.</p>
                    <br />
                    <p>If you have any questions, please contact us.</p>
                    <br />
                    <p>Best regards,<br />Open Arms Foster Care Team</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : '📧 Send Form Link'}
                </button>
              </div>
            </form>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">💡 How it works:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>1️⃣ Enter the potential foster parent's email and name</li>
              <li>2️⃣ Add a personal message (optional)</li>
              <li>3️⃣ Click "Send Form Link" - they'll receive an email with the application link</li>
              <li>4️⃣ When they complete the form, you'll receive a notification with their PDF</li>
              <li>5️⃣ The application will appear in your Leads dashboard automatically</li>
            </ul>
          </div>

          {/* Back to Dashboard */}
          <div className="mt-6 text-center">
            <a
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
