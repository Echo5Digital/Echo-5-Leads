import { sendEmail } from '../lib/email.js';

/**
 * POST /api/share-foster-application
 * Send foster care application form link to a potential applicant
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Share Form] Received request body:', req.body);
    
    const { recipientEmail, recipientName, message, formUrl } = req.body;

    // Validate required fields
    if (!recipientEmail || !recipientName || !formUrl) {
      console.log('[Share Form] Missing required fields:', { recipientEmail, recipientName, formUrl });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[Share Form] Sending form to: ${recipientEmail} (${recipientName})`);

    // Email subject
    const subject = 'Foster Care Application - Open Arms Foster Care';

    // Plain text version
    const textBody = `
Dear ${recipientName},

${message ? message + '\n\n' : ''}Thank you for your interest in becoming a foster parent with Open Arms Foster Care.

To complete your application, please visit: ${formUrl}

The application takes approximately 15-20 minutes to complete.

If you have any questions, please contact us at amber.price@openarmsfostercare.com

Best regards,
Open Arms Foster Care Team
    `.trim();

    // Professional HTML email template - Simple and Classic
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #ffffff;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <tr>
            <td style="border-bottom: 2px solid #000000; padding-bottom: 20px;">
              <h1 style="margin: 0; color: #000000; font-size: 24px; font-weight: bold;">OPEN ARMS FOSTER CARE</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 0;">
              <p style="margin: 0 0 20px 0; color: #000000; font-size: 16px; line-height: 1.6;">Dear ${recipientName},</p>
              
              ${message ? `<p style="margin: 0 0 20px 0; color: #000000; font-size: 16px; line-height: 1.6;">${message}</p>` : ''}
              
              <p style="margin: 0 0 20px 0; color: #000000; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in becoming a foster parent with Open Arms Foster Care.
              </p>
              
              <p style="margin: 0 0 20px 0; color: #000000; font-size: 16px; line-height: 1.6;">
                To complete your application, please visit the following link:
              </p>
              
              <p style="margin: 0 0 30px 0;">
                <a href="${formUrl}" style="color: #000000; text-decoration: underline; font-size: 16px;">${formUrl}</a>
              </p>
              
          
             
              
              <p style="margin: 30px 0 0 0; color: #000000; font-size: 16px; line-height: 1.6;">
                If you have any questions, please contact us at:<br>
                <strong>Email:</strong> amber.price@openarmsfostercare.com
              </p>
              
              <p style="margin: 30px 0 0 0; color: #000000; font-size: 16px; line-height: 1.6;">
                Best regards,<br>
                <strong>Open Arms Foster Care Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #cccccc; padding-top: 20px; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Open Arms Foster Care. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #666666; font-size: 12px;">
                This email was sent by a staff member at Open Arms Foster Care.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Send the email
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: subject,
      text: textBody,
      html: htmlBody
    });

    if (!emailResult.success) {
      console.error('[Share Form] Email send failed:', emailResult.error);
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: emailResult.error 
      });
    }

    // Log the share action
    console.log(`📧 Form link ${emailResult.testMode ? '(TEST MODE)' : 'shared'} with ${recipientEmail} (${recipientName})`);

    // Return success response
    res.status(200).json({
      success: true,
      message: emailResult.testMode 
        ? `Form link logged (TEST MODE) - Check backend console for details` 
        : `Form link sent successfully to ${recipientEmail}`,
      testMode: emailResult.testMode || false
    });

  } catch (error) {
    console.error('[Share Form] Error:', error);
    res.status(500).json({ error: 'Failed to send form link', details: error.message });
  }
}
