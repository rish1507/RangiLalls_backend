const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  loanAccountNo: {
    type: String,
    required: true,
    trim: true
  },
  cifId: {
    type: Number,
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  zone:{
    type:String,
    required:true,
    trim :true
  },
  region :{
    type:String,
    required:true,
    trim :true
  },
  propertyLocation: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  propertyType: {
    type: String,
    required: true
  },
  possessionType: {
    type: String,
    required: true
  },
  reservePrice: {
    type: Number,
    required: true
  },
  vendor: {
    type: String,
    required: true
  },
  emdSubmission: {
    type: Date,
    required: true
  },
  auctionDate: {
    type: Date,
    required: true
  },
  propertySchedule: {
    type: String,
    required: true
  },
  auctionStartTime: {
    type: Date
  },
  auctionEndTime: {
    type: Date
  },
  auctionExtensionCount: {
    type: Number,
    default: 0
  },
  auctionExtensionHistory: [{
    extendedAt: Date,
    previousEndTime: Date,
    newEndTime: Date,
    triggeringBidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuctionBid'
    }
  }]
}, {
  timestamps: true
});

propertySchema.pre('save', function(next) {
  // If auctionDate exists but times aren't set, set defaults
  if (this.auctionDate && (!this.auctionStartTime || !this.auctionEndTime)) {
    // Default auction start time is 10 AM on auction date
    if (!this.auctionStartTime) {
      const startTime = new Date(this.auctionDate);
      startTime.setHours(10, 0, 0, 0);
      this.auctionStartTime = startTime;
    }
    
    // Default auction end time is 5 PM on auction date
    if (!this.auctionEndTime) {
      const endTime = new Date(this.auctionDate);
      endTime.setHours(17, 0, 0, 0);
      this.auctionEndTime = endTime;
    }
  }
  
  next();
});

module.exports = mongoose.model('properties', propertySchema);