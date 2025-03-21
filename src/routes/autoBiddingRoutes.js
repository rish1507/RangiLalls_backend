// routes/autoBiddingRoutes.js
const express = require('express');
const router = express.Router();
const autoBiddingController = require('../controllers/autoBiddingController');
const {protect} = require('../middleware/authMiddleware');

// Save auto-bidding settings
router.post('/settings', protect, autoBiddingController.saveAutoBiddingSettings);
router.get('/info/:auctionId', protect, autoBiddingController.getAutoBidInfo);

// Get auto-bidding settings
router.get('/settings/:auctionId', protect, autoBiddingController.getAutoBiddingSettings);

module.exports = router;