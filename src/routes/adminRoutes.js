// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const {getAuctionReportById,getAuctionReports,uploadProperties,getAllRegistrations,
    updateRegistrationStatus,getDashboardStats,getAuctionRegistrations,updateAuction,deleteAuction,addProperty} = require('../controllers/adminController');
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
router.get('/auctions/:auctionId/registrations',protect,adminAuth,getAuctionRegistrations);
router.put('/auctions/:auctionId',protect, adminAuth ,updateAuction);
router.delete('/auctions/:auctionId', protect, adminAuth,deleteAuction);
router.post('/add-property', protect, adminAuth,addProperty);
router.get('/auction-reports', protect, adminAuth, getAuctionReports);

// Get auction report for a specific auction
router.get('/auction-reports/:auctionId', protect, adminAuth, getAuctionReportById);
module.exports = router;