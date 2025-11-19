import { getDb } from '../src/lib/mongo.js';
import { hashPassword, ROLES } from '../src/lib/auth.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateUsers() {
  try {
    console.log('🔄 Starting user migration...');
    
    const db = await getDb();
    
    // Get all existing users
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} existing users`);
    
    for (const user of users) {
      let newRole = null;
      let updates = { updatedAt: new Date() };
      
      // Map old roles to new roles
      if (user.role === 'admin') {
        newRole = ROLES.SUPER_ADMIN;
      } else if (user.role === 'user') {
        newRole = ROLES.CLIENT_ADMIN; // Assume existing users are client admins
      }
      
      if (newRole) {
        updates.role = newRole;
      }
      
      // Ensure password is properly hashed (if it's not already)
      if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        console.log(`  - Rehashing password for ${user.email}`);
        updates.password = await hashPassword(user.password);
      }
      
      // Set tenantId if missing for non-superadmins
      if (newRole !== ROLES.SUPER_ADMIN && !user.tenantId) {
        // Assign to first available tenant for now
        const firstTenant = await db.collection('tenants').findOne({});
        if (firstTenant) {
          updates.tenantId = firstTenant._id;
          console.log(`  - Assigning ${user.email} to tenant: ${firstTenant.name}`);
        }
      }
      
      // Update user
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: updates }
      );
      
      console.log(`  ✅ Updated ${user.email}: ${user.role} → ${newRole}`);
    }
    
    // Ensure SuperAdmin exists with correct credentials
    const superAdmin = await db.collection('users').findOne({ 
      email: 'sony@echo5digital.com' 
    });
    
    if (superAdmin) {
      // Update SuperAdmin with correct password and role
      const hashedPassword = await hashPassword('admin123');
      await db.collection('users').updateOne(
        { email: 'sony@echo5digital.com' },
        { 
          $set: { 
            password: hashedPassword,
            role: ROLES.SUPER_ADMIN,
            firstName: 'Sony',
            lastName: 'Echo5',
            tenantId: null, // SuperAdmin has no tenant
            active: true,
            updatedAt: new Date()
          }
        }
      );
      console.log('  ✅ Updated SuperAdmin credentials');
    } else {
      // Create SuperAdmin if not exists
      const hashedPassword = await hashPassword('admin123');
      await db.collection('users').insertOne({
        email: 'sony@echo5digital.com',
        password: hashedPassword,
        role: ROLES.SUPER_ADMIN,
        firstName: 'Sony',
        lastName: 'Echo5',
        tenantId: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('  ✅ Created SuperAdmin');
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
    // Show final user list
    const finalUsers = await db.collection('users').find({}, {
      projection: { password: 0 }
    }).toArray();
    
    console.log('\n📋 Final user list:');
    for (const user of finalUsers) {
      const tenant = user.tenantId ? 
        await db.collection('tenants').findOne({ _id: user.tenantId }) : 
        null;
      
      console.log(`  - ${user.email}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Tenant: ${tenant ? tenant.name : 'None (SuperAdmin)'}`);
      console.log(`    Active: ${user.active}`);
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();