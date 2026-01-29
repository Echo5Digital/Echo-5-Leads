import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';

/**
 * GET /api/download-foster-application/:applicationId
 * Download a completed foster care application PDF
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { applicationId } = req.query;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    const db = await getDb();
    const applicationsCollection = db.collection('foster_applications');

    // Find the application
    const application = await applicationsCollection.findOne({
      _id: new ObjectId(applicationId)
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!application.pdfBase64) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    // Convert base64 back to buffer
    const pdfBuffer = Buffer.from(application.pdfBase64, 'base64');

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${application.pdfFileName || 'foster-application.pdf'}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF
    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('[Download Foster App] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to download application',
      details: error.message 
    });
  }
}
