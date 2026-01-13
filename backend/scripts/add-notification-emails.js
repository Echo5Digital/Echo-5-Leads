import { getDb } from '../src/lib/mongo.js';
import dotenv from 'dotenv';

dotenv.config();

async function addNotificationEmails() {
  try {
    const db = await getDb();
    const tenants = db.collection('tenants');

    // Define the notification emails for Open Arms Foster Care
    const notificationEmails = [
      'amber.price@openarmsfostercare.com',
      'kamryn.bass@openarmsfostercare.com',
      'shani@echo5digital.com'
    ];

    console.log('🔍 Looking for Open Arms Foster Care tenant...\n');

    // Find all tenants to see what we have
    const allTenants = await tenants.find({}).toArray();
    console.log('Found tenants:');
    allTenants.forEach(t => {
      console.log(`  - ${t.name} (ID: ${t._id})`);
    });

    // Try to find Open Arms tenant (case-insensitive search)
    const tenant = await tenants.findOne({
      name: { $regex: /open.*arms/i }
    });

    if (!tenant) {
      console.log('\n❌ Open Arms Foster Care tenant not found.');
      console.log('\nPlease provide the exact tenant name from the list above:');
      console.log('Or run this command with tenant ID:');
      console.log('node scripts/add-notification-emails.js <tenant-id>');
      process.exit(1);
    }

    console.log(`\n✅ Found tenant: ${tenant.name}`);
    console.log(`   ID: ${tenant._id}`);

    // Update tenant config with notification emails
    const result = await tenants.updateOne(
      { _id: tenant._id },
      {
        $set: {
          'config.notificationEmails': notificationEmails
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('\n✅ Successfully added notification emails:');
      notificationEmails.forEach(email => console.log(`   - ${email}`));
      console.log('\n📧 Notifications will now be sent when notes are added to leads.');
    } else {
      console.log('\n⚠️  No changes made (emails may already be configured)');
    }

    // Show the updated config
    const updatedTenant = await tenants.findOne({ _id: tenant._id });
    console.log('\n📋 Current tenant config:');
    console.log(JSON.stringify(updatedTenant.config, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addNotificationEmails();
