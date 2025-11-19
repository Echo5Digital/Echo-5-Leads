import { getDb } from '../lib/mongo.js';
import { authenticateToken } from '../lib/auth.js';

export default async function logout(req, res) {
  try {
    // Optional: Clear refresh token from database
    if (req.user && req.user.userId) {
      const db = await getDb();
      await db.collection('users').updateOne(
        { _id: req.user.userId },
        { 
          $unset: { refreshToken: 1 },
          $set: { lastLogoutAt: new Date() }
        }
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

// Apply authentication middleware
export const protectedLogout = [authenticateToken, logout];