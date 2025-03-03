// middleware/adminAuth.js
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Admin privileges required'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};