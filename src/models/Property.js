// models/Property.js
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  "Loan Account No": {
    type: String,
    required: [true, 'Loan Account Number is required'],
    trim: true
  },
  "CIF ID": {
    type: Number,
    required: [true, 'CIF ID is required']
  },
  "CUSTOMER NAME": {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  "ZONE": {
    type: String,
    required: [true, 'Zone is required'],
    trim: true
  },
  "REGION": {
    type: String,
    required: [true, 'Region is required'],
    trim: true
  },
  "Property Location (City)": {
    type: String,
    required: [true, 'Property location city is required'],
    trim: true
  },
  "State": {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  "Property Type": {
    type: String,
    required: [true, 'Property type is required'],
    trim: true
  },
  "Types of Possession": {
    type: String,
    required: [true, 'Possession type is required'],
    trim: true
  },
  "Reserve Price (Rs.)": {
    type: Number,
    required: [true, 'Reserve price is required']
  },
  "EMD Submission": {
    type: String,
    required: [true, 'EMD submission date is required'],
    trim: true
  },
  "Auction Date": {
    type: String,
    required: [true, 'Auction date is required'],
    trim: true
  },
  "Vendor": {
    type: String,
    required: [true, 'Vendor is required'],
    trim: true
  },
  "Auction ID": {
    type: Number,
    required: [true, 'Auction ID is required'],
    unique: true
  },
  "Property Schedule": {
    type: String,
    trim: true
  },
  "Date": {
    type: String,
    trim: true
  },
  // Additional fields to support auction functionality
  bids: [{
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
  }],
  winningBid: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: Number,
    timestamp: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for faster querying
propertySchema.index({ "Auction ID": 1 }, { unique: true });
propertySchema.index({ "EMD Submission": 1 });
propertySchema.index({ "Auction Date": 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ "ZONE": 1, "REGION": 1 });
propertySchema.index({ "State": 1, "Property Location (City)": 1 });
propertySchema.index({ "Property Type": 1 });

module.exports = mongoose.model('Property', propertySchema);