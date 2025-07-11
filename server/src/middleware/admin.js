const adminAuth = (req, res, next) => {
  try {
    // Check if user is authenticated (should be called after auth middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has admin role
    // If role field doesn't exist (backward compatibility), allow access temporarily
    if (req.user.role !== undefined && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'Only administrators can access this resource' 
      });
    }
    
    // If role is undefined (legacy users), log warning but allow access
    if (req.user.role === undefined) {
      console.warn('User without role field accessing admin endpoint:', req.user.id);
    }
    
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

module.exports = adminAuth;