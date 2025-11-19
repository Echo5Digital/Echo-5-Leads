import { getDb } from '../lib/mongo.js';
import { 
  authenticateToken, 
  requireRole, 
  createUser, 
  canAccessTenant,
  ROLES 
} from '../lib/auth.js';
import { ObjectId } from 'mongodb';

// List users - SuperAdmin sees all, ClientAdmin sees only their tenant
async function listUsers(req, res) {
  try {
    const db = await getDb();
    let filter = { active: true };

    // SuperAdmin can see all users
    if (req.user.role === ROLES.SUPER_ADMIN) {
      // Optional tenant filter
      if (req.query.tenantId) {
        filter.tenantId = new ObjectId(req.query.tenantId);
      }
    } else {
      // ClientAdmin can only see users in their tenant
      filter.tenantId = new ObjectId(req.user.tenantId);
    }

    const users = await db.collection('users')
      .find(filter, { projection: { password: 0, refreshToken: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    // Get tenant names for each user
    const tenantIds = [...new Set(users.map(u => u.tenantId).filter(Boolean))];
    const tenants = await db.collection('tenants')
      .find({ _id: { $in: tenantIds } })
      .toArray();
    
    const tenantMap = Object.fromEntries(tenants.map(t => [t._id.toString(), t]));

    const usersWithTenants = users.map(user => ({
      ...user,
      tenant: user.tenantId ? tenantMap[user.tenantId.toString()] : null
    }));

    res.json({
      success: true,
      users: usersWithTenants
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Create user - SuperAdmin can create any role, ClientAdmin can create Members in their tenant
async function createUserRoute(req, res) {
  try {
    const { email, password, firstName, lastName, role, tenantId } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, firstName, lastName, role' 
      });
    }

    // Validate role permissions
    if (req.user.role === ROLES.CLIENT_ADMIN) {
      // ClientAdmin can only create Members in their own tenant
      if (role !== ROLES.MEMBER) {
        return res.status(403).json({ 
          error: 'ClientAdmin can only create Member users' 
        });
      }
      
      if (tenantId && tenantId !== req.user.tenantId.toString()) {
        return res.status(403).json({ 
          error: 'Can only create users in your own tenant' 
        });
      }
    }

    // Set tenant ID based on user role and permissions
    let finalTenantId = null;
    if (role === ROLES.SUPER_ADMIN) {
      // SuperAdmin has no tenant
      finalTenantId = null;
    } else if (req.user.role === ROLES.CLIENT_ADMIN) {
      // ClientAdmin creating member - use their tenant
      finalTenantId = req.user.tenantId;
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      // SuperAdmin creating user - use provided tenantId
      finalTenantId = tenantId;
    }

    const db = await getDb();
    const newUser = await createUser(db, {
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      tenantId: finalTenantId
    });

    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update user
async function updateUserRoute(req, res) {
  try {
    const { userId } = req.params;
    const { firstName, lastName, active, role, tenantId } = req.body;
    
    const db = await getDb();
    
    // Get existing user
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Permission checks
    if (req.user.role === ROLES.CLIENT_ADMIN) {
      // ClientAdmin can only update users in their tenant
      if (!canAccessTenant(req.user.role, req.user.tenantId, existingUser.tenantId)) {
        return res.status(403).json({ error: 'Cannot update users outside your tenant' });
      }
      
      // Cannot change role or tenant
      if (role && role !== existingUser.role) {
        return res.status(403).json({ error: 'Cannot change user role' });
      }
      if (tenantId && tenantId !== existingUser.tenantId?.toString()) {
        return res.status(403).json({ error: 'Cannot change user tenant' });
      }
    }

    // Build update object
    const updateDoc = { updatedAt: new Date() };
    if (firstName !== undefined) updateDoc.firstName = firstName;
    if (lastName !== undefined) updateDoc.lastName = lastName;
    if (active !== undefined) updateDoc.active = active;
    
    // Only SuperAdmin can change role and tenant
    if (req.user.role === ROLES.SUPER_ADMIN) {
      if (role !== undefined) updateDoc.role = role;
      if (tenantId !== undefined) {
        updateDoc.tenantId = tenantId ? new ObjectId(tenantId) : null;
      }
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateDoc }
    );

    // Get updated user
    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0, refreshToken: 0 } }
    );

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete/deactivate user
async function deleteUserRoute(req, res) {
  try {
    const { userId } = req.params;
    const db = await getDb();
    
    // Get existing user
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Permission checks
    if (req.user.role === ROLES.CLIENT_ADMIN) {
      // ClientAdmin can only deactivate users in their tenant
      if (!canAccessTenant(req.user.role, req.user.tenantId, existingUser.tenantId)) {
        return res.status(403).json({ error: 'Cannot delete users outside your tenant' });
      }
    }

    // Cannot delete yourself
    if (userId === req.user.userId.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Soft delete (deactivate)
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          active: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Export protected routes
export const protectedListUsers = [
  authenticateToken, 
  requireRole(ROLES.SUPER_ADMIN, ROLES.CLIENT_ADMIN), 
  listUsers
];

export const protectedCreateUser = [
  authenticateToken, 
  requireRole(ROLES.SUPER_ADMIN, ROLES.CLIENT_ADMIN), 
  createUserRoute
];

export const protectedUpdateUser = [
  authenticateToken, 
  requireRole(ROLES.SUPER_ADMIN, ROLES.CLIENT_ADMIN), 
  updateUserRoute
];

export const protectedDeleteUser = [
  authenticateToken, 
  requireRole(ROLES.SUPER_ADMIN, ROLES.CLIENT_ADMIN), 
  deleteUserRoute
];