import dotenv from 'dotenv';
import { getDb } from '../src/lib/mongo.js';
import { createUser, ROLES } from '../src/lib/auth.js';

// Load environment variables
dotenv.config();

async function seedSuperAdmin() {
  try {
    console.log('🌱 Seeding SuperAdmin user...');
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
    console.log('MongoDB DB:', process.env.MONGODB_DB);
    
    const db = await getDb();
    console.log('✅ Database connected successfully');
    
    // Check if SuperAdmin already exists
    const existing = await db.collection('users').findOne({ 
      email: 'sony@echo5digital.com' 
    });
    
    if (existing) {
      console.log('✅ SuperAdmin user already exists');
      console.log('User details:', {
        _id: existing._id,
        email: existing.email,
        role: existing.role,
        firstName: existing.firstName,
        lastName: existing.lastName,
        active: existing.active
      });
      return;
    }

    // Create SuperAdmin user
    const superAdmin = await createUser(db, {
      email: 'sony@echo5digital.com',
      password: 'admin123',
      firstName: 'Sony',
      lastName: 'Admin',
      role: ROLES.SUPER_ADMIN,
      tenantId: null // SuperAdmin has no tenant
    });

    console.log('✅ SuperAdmin user created successfully!');
    console.log('Login credentials:');
    console.log('  Email: sony@echo5digital.com');
    console.log('  Password: admin123');
    console.log('  Role: Super Admin');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    
  } catch (error) {
    console.error('❌ Error seeding SuperAdmin:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSuperAdmin().then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  });
}

export default seedSuperAdmin;