import { getDb } from '../lib/mongo.js';
import { verifyToken, generateAccessToken, getUserById } from '../lib/auth.js';

export default async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token is required' 
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(403).json({ 
        error: 'Invalid refresh token' 
      });
    }

    const db = await getDb();
    
    // Get user and verify refresh token matches
    const user = await getUserById(db, decoded.userId);
    if (!user || !user.active) {
      return res.status(403).json({ 
        error: 'User not found or inactive' 
      });
    }

    // Optional: Check if stored refresh token matches
    if (user.refreshToken && user.refreshToken !== refreshToken) {
      return res.status(403).json({ 
        error: 'Refresh token revoked' 
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}