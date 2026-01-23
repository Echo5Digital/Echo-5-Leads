import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import fs from 'fs';

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

    // Check if PDF file exists
    if (!fs.existsSync(application.pdfFilePath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    // Read and send the PDF file
    const pdfBuffer = fs.readFileSync(application.pdfFilePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${application.pdfFileName}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error retrieving PDF:', error);
    res.status(500).json({ error: 'Failed to retrieve PDF' });
  }
}
