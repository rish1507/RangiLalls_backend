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
  resetPassword 
} = require('../controllers/authController');
const {verifyCaptcha} = require('../middleware/verifyCaptcha');
router.post('/register', register);
router.post('/login',verifyCaptcha,login);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', protect, getMe);
router.post("/forgot-password",forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);
module.exports = router;