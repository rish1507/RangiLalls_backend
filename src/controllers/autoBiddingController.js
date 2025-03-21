// controllers/autoBiddingController.js
const AutoBidding = require('../models/autoBidding');

// Save auto-bidding settings
exports.saveAutoBiddingSettings = async (req, res) => {
  try {
    const { auctionId, enabled, maxAmount, increment } = req.body;
    const userId = req.user._id;

    // First check if user already has auto-bidding enabled
    const existingSettings = await AutoBidding.findOne({ userId, auctionId });
    
    // If auto-bidding is already enabled, prevent disabling it
    if (existingSettings && existingSettings.enabled && !enabled) {
      return res.status(403).json({
        success: false,
        error: 'Auto-bidding cannot be disabled once activated'
      });
    }

    // If enabling auto-bidding, check if the maximum is higher than all existing auto-bids
    if (enabled) {
      // Get all enabled auto-bids for this auction, sorted by maxAmount descending
      const highestAutoBid = await AutoBidding.findOne({ 
        auctionId, 
        enabled: true,
        userId: { $ne: userId } // Exclude the current user's bid
      }).sort({ maxAmount: -1 });
      
      // If there's a highest auto-bid and the new amount isn't higher
      if (highestAutoBid && maxAmount <= highestAutoBid.maxAmount) {
        return res.status(400).json({
          success: false,
          error: 'AutoBid limit reached, Please entered different amount'
        });
      }
      
    }

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
    if (enabled) {
      // Get latest auto-bid info to determine new minimum bid amounts
      const autoBids = await AutoBidding.find({ 
        auctionId, 
        enabled: true 
      }).sort({ maxAmount: -1 });
      
      // Calculate minimum manual bid based on second highest auto-bid
      let minManualBid = 0;
      if (autoBids.length >= 2) {
        minManualBid = autoBids[1].maxAmount + 1;
      }
      
      // Get the socket server instance
      const io = req.app.get('socketio');
      
      // Broadcast the updated minimum bid amount to all users in this auction room
      if (io) {
        io.to(auctionId).emit('min-bid-update', {
          minManualBid: minManualBid
        });
      }
    }
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
// Helper function to get auto-bid information for an auction
const fetchAutoBidInfo = async (auctionId) => {
  try {
    // Get all enabled auto-bids for this auction, sorted by maxAmount descending
    const autoBids = await AutoBidding.find({ 
      auctionId, 
      enabled: true 
    }).sort({ maxAmount: -1 });

    // Return info about the highest and second highest auto-bids
    return {
      highestAutoBid: autoBids.length > 0 ? autoBids[0].maxAmount : 0,
      secondHighestAutoBid: autoBids.length > 1 ? autoBids[1].maxAmount : 0,
      hasAutoBids: autoBids.length > 0
    };
  } catch (error) {
    console.error('Error getting auto-bid info:', error);
    return { 
      highestAutoBid: 0, 
      secondHighestAutoBid: 0, 
      hasAutoBids: false 
    };
  }
};

// Endpoint to get auto-bid information for frontend guidance
exports.getAutoBidInfo = async (req, res) => {
  try {
    const { auctionId } = req.params;
    
    // Get highest auto-bid without revealing who set it
    const autoBidInfo = await fetchAutoBidInfo(auctionId);
    
    res.json({
      success: true,
      hasAutoBids: autoBidInfo.hasAutoBids,
      // Only tell them what the minimum should be for new auto-bids
      minAutoBidAmount: autoBidInfo.highestAutoBid > 0 ? 
                      autoBidInfo.highestAutoBid + 1 : 0,
      // For manual bids, they need to be higher than second highest auto-bid
      minManualBid: autoBidInfo.secondHighestAutoBid > 0 ? 
                    autoBidInfo.secondHighestAutoBid + 1 : 0
    });
  } catch (error) {
    console.error('Error fetching auto-bid info:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching auto-bid information'
    });
  }
};