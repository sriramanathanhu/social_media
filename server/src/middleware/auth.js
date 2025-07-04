const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // First, try to get token from Authorization header
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no token in header, try to get from query params (for OAuth callbacks)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    // For OAuth callbacks, we might have stored user info in session
    if (!token && req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    // Store user ID in session for OAuth callbacks
    req.session.userId = user.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;