import { getDb } from '../lib/mongo.js';
import { authenticateToken, getUserById } from '../lib/auth.js';

export default async function getProfile(req, res) {
  try {
    const db = await getDb();
    
    // Get full user details
    const user = await getUserById(db, req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Get tenant info if exists
    let tenant = null;
    if (user.tenantId) {
      tenant = await db.collection('tenants').findOne({ _id: user.tenantId });
    }

    res.json({
      success: true,
      user: {
        ...user,
        tenant: tenant ? { _id: tenant._id, name: tenant.name } : null
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

// Apply authentication middleware
export const protectedProfile = [authenticateToken, getProfile];