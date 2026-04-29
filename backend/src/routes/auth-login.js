import { getDb } from '../lib/mongo.js';
import { 
  comparePassword, 
  generateAccessToken, 
  generateRefreshToken,
  getUserById,
  ROLES
} from '../lib/auth.js';

export default async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    const db = await getDb();

    // Find all active users with this email (same email may exist in multiple tenants)
    const candidates = await db.collection('users')
      .find({ email: email.toLowerCase(), active: true })
      .toArray();

    if (candidates.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Find the one whose password matches (handles same email across different tenants)
    let user = null;
    for (const candidate of candidates) {
      const isValidPassword = await comparePassword(password, candidate.password);
      if (isValidPassword) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token (optional - for token revocation)
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          lastLoginAt: new Date(),
          refreshToken: refreshToken
        }
      }
    );

    // Get user tenant info if exists
    let tenant = null;
    if (user.tenantId) {
      tenant = await db.collection('tenants').findOne({ _id: user.tenantId });
    }

    // Return user info (excluding password)
    const { password: _, refreshToken: __, ...userInfo } = user;
    
    res.json({
      success: true,
      user: {
        ...userInfo,
        tenant: tenant ? { _id: tenant._id, name: tenant.name } : null
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}