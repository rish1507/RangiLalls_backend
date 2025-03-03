// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {uploadProperties} = require('../controllers/adminController');
const {protect} = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// Configure multer for file upload (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Admin routes
router.post('/upload-properties', protect, adminAuth, upload.single('propertiesFile'), uploadProperties);

module.exports = router;