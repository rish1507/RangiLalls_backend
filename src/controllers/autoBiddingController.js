// controllers/autoBiddingController.js
const AutoBidding = require('../models/autoBidding');

// Save auto-bidding settings
exports.saveAutoBiddingSettings = async (req, res) => {
  try {
    const { auctionId, enabled, maxAmount, increment } = req.body;
    const userId = req.user._id;

    // Find and update or create new settings
    const settings = await AutoBidding.findOneAndUpdate(
      { userId, auctionId },
      { 
        enabled, 
        maxAmount: enabled ? maxAmount : 0,
        increment: enabled ? increment : 1000
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error saving auto-bidding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Error saving auto-bidding settings'
    });
  }
};

// Get auto-bidding settings
exports.getAutoBiddingSettings = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user._id;

    const settings = await AutoBidding.findOne({ userId, auctionId });

    if (!settings) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          maxAmount: 0,
          increment: 1000
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching auto-bidding settings:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching auto-bidding settings'
    });
  }
};