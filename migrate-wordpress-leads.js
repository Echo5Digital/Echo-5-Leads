/**
 * Migration Script: Import existing WordPress leads to Vercel backend
 * 
 * This script reads leads from WordPress database and sends them to Vercel API
 */

const mysql = require('mysql2/promise');

// WordPress Database Configuration
const WP_DB_CONFIG = {
  host: 'localhost',  // Your WordPress database host
  user: 'echo121_wp167',  // From your wp-config.php
  password: 'j18h]S(8dp',  // From your wp-config.php
  database: 'echo121_wp167',  // From your wp-config.php
};

// Vercel API Configuration
const VERCEL_API_URL = 'https://echo5-digital-leads.vercel.app';
const VERCEL_API_KEY = 'open_523e0520a0fd927169f2fb0a14099fb2';

async function migrateLeads() {
  console.log('🔄 Starting WordPress → Vercel migration...\n');

  let connection;
  try {
    // Connect to WordPress database
    console.log('📡 Connecting to WordPress database...');
    connection = await mysql.createConnection(WP_DB_CONFIG);
    console.log('✅ Connected to WordPress database\n');

    // Get all leads from WordPress
    const [leads] = await connection.execute(
      'SELECT * FROM wpmj_openarms_leads ORDER BY created_at DESC'
    );

    console.log(`📊 Found ${leads.length} leads in WordPress database\n`);

    if (leads.length === 0) {
      console.log('⚠️  No leads found to migrate');
      return;
    }

    // Migrate each lead to Vercel
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      console.log(`[${i + 1}/${leads.length}] Migrating: ${lead.first_name} ${lead.last_name} (${lead.email || lead.phone_e164})`);

      try {
        // Prepare payload for Vercel API
        const payload = {
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone_e164,
          city: lead.city,
          source: lead.source || 'wordpress_migration',
          campaign_name: lead.campaign_name,
          form_id: 'wordpress_existing_lead',
          // Parse original_payload if it exists
          ...(lead.original_payload ? JSON.parse(lead.original_payload) : {}),
        };

        // Send to Vercel API
        const response = await fetch(`${VERCEL_API_URL}/api/ingest/lead`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Key': VERCEL_API_KEY,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ Success - Lead ID: ${result.leadId}`);
          successCount++;
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Error (HTTP ${response.status}): ${errorText}`);
          errorCount++;
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        errorCount++;
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log(`   Total leads: ${leads.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount > 0) {
      console.log('\n⚠️  Some leads failed to migrate. Check the errors above.');
    } else {
      console.log('\n🎉 All leads migrated successfully!');
      console.log(`\nCheck Vercel frontend: https://echo5-leads-fe.vercel.app/leads`);
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('\nMake sure:');
    console.error('1. WordPress database credentials are correct');
    console.error('2. Database is accessible from this machine');
    console.error('3. Vercel backend API is running');
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 Database connection closed');
    }
  }
}

// Run migration
migrateLeads().catch(console.error);
