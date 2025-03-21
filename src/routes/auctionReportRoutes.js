// routes/auctionReportRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAuctionReports, 
  getAuctionReportById
} = require('../controllers/biddingReportController');
const { protect } = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// Get all auction reports
router.get('/auction-reports', protect, adminAuth, getAuctionReports);

// Get auction report for a specific auction
router.get('/auction-reports/:auctionId', protect, adminAuth, getAuctionReportById);

module.exports = router;