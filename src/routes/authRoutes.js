const express = require('express');
const router = express.Router();
const {protect} =require("../middleware/authMiddleware");
const { 
  register, 
  login, 
  verifyEmail,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  updateProfile,
  getInterestedProperties,
  addInterestedProperty,
  removeInterestedProperty,
  getUserBiddingHistory
} = require('../controllers/authController');
const {verifyCaptcha} = require('../middleware/verifyCaptcha');
router.post('/register', register);
router.post('/login',verifyCaptcha,login);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', protect, getMe);
router.post("/forgot-password",forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);
// Profile management
router.put('/profile', protect,updateProfile);

// Interested properties
router.get('/interested-properties',protect, getInterestedProperties);
router.post('/interested-properties/:propertyId', protect,addInterestedProperty);
router.delete('/interested-properties/:propertyId', protect,removeInterestedProperty);

// User bidding history
router.get('/bidding-history',protect,getUserBiddingHistory);

module.exports = router;
