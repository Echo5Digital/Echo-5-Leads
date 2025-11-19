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
    
    // Find user by email
    const user = await db.collection('users').findOne({ 
      email: email.toLowerCase(),
      active: true
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
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