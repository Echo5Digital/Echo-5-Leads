// List all leads
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function listLeads() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    const leads = await db.collection('leads')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`\nFound ${leads.length} leads:\n`);
    
    for (const lead of leads) {
      console.log('---');
      console.log('Name:', lead.firstName, lead.lastName);
      console.log('Email:', lead.email);
      console.log('Created:', lead.createdAt);
      console.log('Application ID:', lead.customFields?.applicationId || 'None');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

listLeads();
