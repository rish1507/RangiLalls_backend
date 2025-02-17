const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Borrowers Details
  borrowerDetails: {
    name: {
      type: String,
      required: [true, 'Borrower name is required'],
      trim: true
    },
    address: {
      type: String,
      default: 'N/A'
    }
  },

  // Notice Details
  noticeDetails: {
    issuedBy: {
      type: String,
      required: [true, 'Notice issuer is required'],
      trim: true
    },
    issuedBranch: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true
    }
  },

  // Auction Description
  auctionId: {
    type: String,
    required: [true, 'Auction ID is required'],
    unique: true,
    trim: true
  },
  auctionTitle: {
    type: String,
    required: [true, 'Auction title is required'],
    trim: true
  },
  auctionDate: {
    type: Date,
    required: [true, 'Auction date is required']
  },
  description: {
    type: String,
    default: 'N/A'
  },
  outstandingAmount: {
    type: Number,
    required: [true, 'Outstanding amount is required']
  },
  reservePrice: {
    type: Number,
    required: [true, 'Reserve price is required']
  },
  earnestMoney: {
    type: Number,
    required: [true, 'Earnest money is required']
  },
  incrementalValue: {
    type: Number,
    required: [true, 'Incremental value is required']
  },
  bidTimeDetails: {
    timeIn: {
      type: String,
      required: [true, 'Time in is required']
    },
    time: {
      type: String,
      required: [true, 'Time is required']
    },
    limit: {
      type: String,
      default: 'infinity times'
    }
  },
  tenderPrice: {
    type: Number,
    default: 0
  },
  participationClosingDate: {
    date: {
      type: Date,
      required: [true, 'Participation closing date is required']
    },
    time: {
      type: String,
      required: [true, 'Participation closing time is required']
    }
  },
  helpLineNo: {
    type: String,
    required: [true, 'Help line number is required']
  },
  zoneName: {
    type: String,
    required: [true, 'Zone name is required']
  },
  assetType: {
    type: String,
    required: [true, 'Asset type is required'],
    default: 'Property'
  },

  // Property Address
  propertyAddress: {
    type: String,
    required: [true, 'Property address is required'],
    trim: true
  },

  // Property Location Coordinates
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },

  // Status and Tracking
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create index for location-based queries
propertySchema.index({ location: '2dsphere' });

// Create index for auction ID
propertySchema.index({ auctionId: 1 }, { unique: true });

module.exports = mongoose.model('Property', propertySchema);