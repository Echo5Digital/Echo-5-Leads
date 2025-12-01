import fs from 'fs';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testImport() {
  try {
    // Read the CSV file
    const csvPath = './test-import-sample.csv';
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath);
      process.exit(1);
    }

    const csvData = fs.readFileSync(csvPath, 'utf-8');
    console.log('📄 CSV file loaded:', csvPath);
    console.log('📊 Lines:', csvData.split('\n').length);

    // Get auth token - you need to be logged in first
    const token = process.env.AUTH_TOKEN;
    if (!token) {
      console.error('❌ AUTH_TOKEN environment variable not set');
      console.log('Please login first and set the token: export AUTH_TOKEN="your_token"');
      process.exit(1);
    }

    console.log('🔐 Using auth token:', token.substring(0, 20) + '...');

    // Call import API
    console.log('📤 Sending import request...');
    const response = await fetch(`${API_URL}/api/leads/import/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        csvData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Import failed:', error);
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Import successful!');
    console.log('📊 Results:');
    console.log(`   Imported: ${result.imported}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Total: ${result.total}`);
    
    if (result.errors.length > 0) {
      console.log('⚠️  Errors:');
      result.errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n✨ Import completed!');
    console.log(`Check http://localhost:3000/leads to see the imported leads`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testImport();
