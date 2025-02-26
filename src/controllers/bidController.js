// src/controllers/bidController.js
const AuctionBid = require('../models/AuctionBid');

// Get bid history for an auction
exports.getBidHistory = async (req, res) => {
  try {
    const bids = await AuctionBid.find({ auctionId: req.params.auctionId })
      .sort({ timestamp: -1 })
      .populate('userId', 'firstName lastName')
      .limit(50);

    res.json({
      success: true,
      data: bids
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching bid history'
    });
  }
};

// Get user's bid history
exports.getUserBids = async (req, res) => {
  try {
    const bids = await AuctionBid.find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .populate('userId', 'firstName lastName');

    res.json({
      success: true,
      data: bids
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching your bids'
    });
  }
};
