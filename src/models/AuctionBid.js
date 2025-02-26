const mongoose = require('mongoose');

const auctionBidSchema = new mongoose.Schema({
  auctionId: {
    type: String,  // Using String to match your JSON data structure
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
auctionBidSchema.index({ auctionId: 1, timestamp: -1 });

module.exports = mongoose.model('AuctionBid', auctionBidSchema);