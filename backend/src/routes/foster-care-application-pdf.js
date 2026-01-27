import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';

/**
 * GET /api/foster-care-application/:id/pdf
 * Retrieve the PDF for a foster care application
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    const db = await getDb();
    const applicationsCollection = db.collection('foster_applications');

    const application = await applicationsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if PDF is stored in database as base64
    if (!application.pdfBase64) {
      return res.status(404).json({ error: 'PDF not found for this application' });
    }

    // Convert base64 back to buffer and send
    const pdfBuffer = Buffer.from(application.pdfBase64, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${application.pdfFileName}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error retrieving PDF:', error);
    res.status(500).json({ error: 'Failed to retrieve PDF' });
  }
}
