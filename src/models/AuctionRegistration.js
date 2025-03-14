// models/AuctionRegistration.js
const mongoose = require('mongoose');

const auctionRegistrationSchema = new mongoose.Schema({
  // User Reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Buyer Details
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  organizationName: { type: String, required: true },
  address: String,
  country: { type: String, default: 'India' },
  state: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  landline: { type: String},
  mobile: { type: String, required: true },
  fax: String,
  
  // Document Details
  pancardFile: { type: String, required: true }, // File path/URL
  addressProof: { type: String, required: true }, // File path/URL
  
  // Bank Details
  bankName: { type: String, required: true },
  accountNo: { type: String, required: true },
  ifscCode: { type: String, required: true },
  offerValue: { type: Number, required: true },
  paymentMode: { 
    type: String, 
    required: true,
    enum: ['Neft - Rtgs', 'Demand Draft', 'Payorder', 'Cheque']
  },
  utrNo: String,
  paymentReceipt: String, // File path/URL
  
  // EMD Details
  emdAmount: { type: Number, required: true },
  challanNo: { type: String, required: true },
  confirmationCode: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Auction Details
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
    },
  
  auctionDate: { type: Date, required: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add indexes for better query performance
auctionRegistrationSchema.index({ user: 1 });
auctionRegistrationSchema.index({ challanNo: 1 });
auctionRegistrationSchema.index({ auctionId: 1 });
auctionRegistrationSchema.index({ status: 1 });

module.exports = mongoose.model('AuctionRegistration', auctionRegistrationSchema);