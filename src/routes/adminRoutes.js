// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {uploadProperties,getAllRegistrations,updateRegistrationStatus,getDashboardStats,getAuctionRegistrations} = require('../controllers/adminController');
const {protect} = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// Configure multer for file upload (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Admin routes
router.post('/upload-properties', protect, adminAuth, upload.single('propertiesFile'), uploadProperties);
// routes/adminRoutes.js - add these routes

// Get all registrations
router.get('/registrations', protect, adminAuth, getAllRegistrations);

// Update registration status
router.put('/registrations/:registrationId/status', protect, adminAuth, updateRegistrationStatus);

// In adminRoutes.js
router.get('/dashboard-stats', protect, adminAuth, getDashboardStats);
router.get('/auctions/:auctionId/registrations',getAuctionRegistrations);
module.exports = router;