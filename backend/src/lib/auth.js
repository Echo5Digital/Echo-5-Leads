import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './mongo.js';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// User roles
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CLIENT_ADMIN: 'client_admin', 
  MEMBER: 'member'
};

// Permission levels for easier role checking
export const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    canViewAllTenants: true,
    canManageTenants: true,
    canViewAllLeads: true,
    canManageUsers: true,
    canAssignLeads: true
  },
  [ROLES.CLIENT_ADMIN]: {
    canViewAllTenants: false,
    canManageTenants: false,
    canViewAllLeads: false, // Only their tenant's leads
    canManageUsers: true,   // Only their tenant's users
    canAssignLeads: true    // Only within their tenant
  },
  [ROLES.MEMBER]: {
    canViewAllTenants: false,
    canManageTenants: false,
    canViewAllLeads: false, // Only assigned leads
    canManageUsers: false,
    canAssignLeads: true    // Only reassign within same tenant
  }
};

// Hash password
export async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Compare password
export async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateAccessToken(user) {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    firstName: user.firstName,
    lastName: user.lastName
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Generate refresh token
export function generateRefreshToken(user) {
  const payload = {
    userId: user._id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

// Verify token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

// Role-based authorization middleware
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

// Check if user can access tenant data
export function canAccessTenant(userRole, userTenantId, targetTenantId) {
  // SuperAdmin can access all tenants
  if (userRole === ROLES.SUPER_ADMIN) {
    return true;
  }
  
  // ClientAdmin and Member can only access their own tenant
  return userTenantId && userTenantId.toString() === targetTenantId.toString();
}

// Check if user can view specific lead
export async function canViewLead(db, user, leadId) {
  const lead = await db.collection('leads').findOne({ 
    _id: new ObjectId(leadId) 
  });
  
  if (!lead) return false;

  // SuperAdmin can view all leads
  if (user.role === ROLES.SUPER_ADMIN) {
    return { canView: true, lead };
  }

  // Must be same tenant
  if (!canAccessTenant(user.role, user.tenantId, lead.tenantId)) {
    return { canView: false, lead: null };
  }

  // ClientAdmin and Members can view all leads in their tenant
  if (user.role === ROLES.CLIENT_ADMIN || user.role === ROLES.MEMBER) {
    return { canView: true, lead };
  }

  return { canView: false, lead: null };
}

// Get user by ID with full details
export async function getUserById(db, userId) {
  return await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { password: 0 } } // Exclude password
  );
}

// Create user
export async function createUser(db, userData) {
  const { email, password, role, tenantId, firstName, lastName } = userData;
  
  // Check if user already exists
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Validate role
  if (!Object.values(ROLES).includes(role)) {
    throw new Error('Invalid role');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user document
  const user = {
    email,
    password: hashedPassword,
    role,
    // Handle both ObjectId (24-char hex) and UUID formats
    tenantId: tenantId 
      ? (typeof tenantId === 'string' && tenantId.length === 24 ? new ObjectId(tenantId) : tenantId)
      : null,
    firstName,
    lastName,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('users').insertOne(user);
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return { ...userWithoutPassword, _id: result.insertedId };
}

// Update indexes for users collection
export async function ensureUserIndexes(db) {
  await db.collection('users').createIndexes([
    { key: { email: 1 }, unique: true, name: 'idx_email_unique' },
    { key: { tenantId: 1, role: 1 }, name: 'idx_tenant_role' },
    { key: { active: 1 }, name: 'idx_active' }
  ]);
}