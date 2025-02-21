const express = require('express');
const router = express.Router();
const {protect} =require("../middleware/authMiddleware");
const { 
  register, 
  login, 
  verifyEmail,
  getMe 
} = require('../controllers/authController');
const {verifyCaptcha} = require('../middleware/verifyCaptcha');
router.post('/register', register);
router.post('/login',verifyCaptcha,login);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', protect, getMe);
module.exports = router;