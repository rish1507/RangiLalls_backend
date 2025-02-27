// models/AutoBidding.js
const mongoose = require('mongoose');

const autoBiddingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  auctionId: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  maxAmount: {
    type: Number,
    required: true
  },
  increment: {
    type: Number,
    default: 1000
  }
}, { timestamps: true });

// Compound index for faster lookups
autoBiddingSchema.index({ userId: 1, auctionId: 1 }, { unique: true });

module.exports = mongoose.model('AutoBidding', autoBiddingSchema);