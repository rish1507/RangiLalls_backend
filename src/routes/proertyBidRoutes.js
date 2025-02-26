// src/routes/bidRoutes.js
const express = require('express');
const router = express.Router();
const { getBidHistory, getUserBids } = require('../controllers/bidController');
const {protect} = require('../middleware/authMiddleware');

// Get bid history for an auction
router.get('/:auctionId/history', protect, getBidHistory);

// Get user's bid history
router.get('/my-bids', protect, getUserBids);

module.exports = router;