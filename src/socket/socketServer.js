const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Property = require("../models/Property");
const AuctionBid = require('../models/AuctionBid');
const AuctionRegistration = require('../models/AuctionRegistration');

// Store active auctions in memory
const activeAuctions = new Map();
// Helper function to validate bid
const validateBid = async (auctionId, userId, bidAmount) => {
  try {
    // Check if user is registered for this auction
    const registration = await AuctionRegistration.findOne({
      auctionId,
      user: userId,
      status: 'approved'
    });

    if (!registration) {
      return { isValid: false, error: 'You are not registered for this auction' };
    }

    const auctionData = activeAuctions.get(auctionId);
    if (!auctionData) {
      return { isValid: false, error: 'Auction is not active' };
    }

    if (bidAmount <= auctionData.currentBid) {
      return { 
        isValid: false, 
        error: `Bid must be higher than current bid of ₹${auctionData.currentBid.toLocaleString()}` 
      };
    }

    // Get auto-bid information
    // Import or require AutoBidding model at the top of the file
    const AutoBidding = require('../models/autoBidding');
    
    // Get all enabled auto-bids for this auction, sorted by maxAmount descending
    const autoBids = await AutoBidding.find({ 
      auctionId, 
      enabled: true 
    }).sort({ maxAmount: -1 });
    
    // Check if this is a manual bid (not from auto-bidding)
    const isManualBid = true; // Assume all bids validated here are manual bids
    
    if (isManualBid && autoBids.length >= 2) {
      // If there are at least 2 auto-bids, manual bids should be > second highest auto-bid
      const secondHighestAutoBid = autoBids[1].maxAmount;
      
      if (bidAmount <= secondHighestAutoBid) {
        return {
          isValid: false,
          error: `Your bid must be at least ₹${(secondHighestAutoBid + 1).toLocaleString()} to be competitive`
        };
      }
    } else if (isManualBid && autoBids.length === 1) {
      // If there's only one auto-bid, just make sure the bid is valid (already checked above)
      // No additional validation needed here
    }

    return { isValid: true };
  } catch (error) {
    console.error('Bid validation error:', error);
    return { isValid: false, error: 'Error validating bid' };
  }
};

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"]
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.email}`);

    // Join auction room
    socket.on('join-auction', async (auctionId) => {
      try {
        socket.join(auctionId);
        
        // Initialize auction data if not exists
        if (!activeAuctions.has(auctionId)) {
          // Get the highest bid for this auction
          const highestBid = await AuctionBid.findOne({ auctionId })
            .sort({ amount: -1 });
          activeAuctions.set(auctionId, {
            currentBid: highestBid ? highestBid.amount : 0,
            currentBidder: highestBid ? {
              id: highestBid.userId,
              name: 'Previous Bidder'
            } : null,
            lastBidTime: highestBid ? highestBid.timestamp : new Date(),
            participants: new Set(),
            recentBids: []
          });

          // Get recent bids
          const recentBids = await AuctionBid.find({ auctionId })
            .sort({ timestamp: -1 })
            .limit(50)
            .populate('userId', 'firstName lastName');

          activeAuctions.get(auctionId).recentBids = recentBids.map(bid => ({
            currentBid: bid.amount,
            currentBidder: {
              id: bid.userId._id,
              name: `${bid.userId.firstName} ${bid.userId.lastName}`
            },
            timestamp: bid.timestamp
          }));
        }

        const auctionData = activeAuctions.get(auctionId);
        auctionData.participants.add(socket.user._id.toString());

        // Send current auction status
        socket.emit('auction-status', {
          currentBid: auctionData.currentBid,
          currentBidder: auctionData.currentBidder,
          participants: auctionData.participants.size,
          recentBids: auctionData.recentBids
        });

        // Notify others about new participant
        io.to(auctionId).emit('participant-update', {
          count: auctionData.participants.size
        });
      } catch (error) {
        console.error('Error joining auction:', error);
        socket.emit('auction-error', 'Error joining auction');
      }
    });

    // Handle bid placement
    // In your socketServer.js file, update the place-bid handler

// Inside the socket.on('place-bid', ...) handler, after the bid is stored
socket.on('place-bid', async ({ auctionId, bidAmount }) => {
  try {
    const validation = await validateBid(auctionId, socket.user._id, bidAmount);
         
    if (!validation.isValid) {
      socket.emit('bid-error', validation.error);
      return;
    }
    
    const auctionData = activeAuctions.get(auctionId);
    const timestamp = new Date();
    
    // Create bid info
    const bidInfo = {
      currentBid: bidAmount,
      currentBidder: {
        id: socket.user._id,
        name: `${socket.user.firstName} ${socket.user.lastName}`
      },
      timestamp
    };
    
    // Update auction data
    auctionData.currentBid = bidAmount;
    auctionData.currentBidder = bidInfo.currentBidder;
    auctionData.lastBidTime = timestamp;
    auctionData.recentBids.unshift(bidInfo);
    
    // Keep only last 50 bids in memory
    if (auctionData.recentBids.length > 50) {
      auctionData.recentBids.pop();
    }
    
    // Store bid in database
    const newBid = await AuctionBid.create({
      auctionId,
      userId: socket.user._id,
      amount: bidAmount
    });
    
    // ================ AUCTION EXTENSION LOGIC ================
    // Check if this bid is within the last 6 minutes of the auction
    const property = await Property.findById(auctionId);
    if (property) {
      const now = new Date();
      
      // Get auction end time (use stored end time or default to 5 PM)
      const auctionEndTime = property.auctionEndTime || new Date(property.auctionDate);
      if (!property.auctionEndTime) {
        auctionEndTime.setHours(17, 0, 0, 0);
      }
      
      // Calculate time remaining
      const timeRemainingMs = auctionEndTime - now;
      const sixMinutesMs = 6 * 60 * 1000;
      
      // If less than 6 minutes remaining and auction is still open, extend it
      if (timeRemainingMs > 0 && timeRemainingMs < sixMinutesMs) {
        // Calculate new end time (current time + 6 minutes)
        const previousEndTime = new Date(auctionEndTime);
        const newEndTime = new Date(Math.max(
          previousEndTime.getTime(),
          now.getTime() + sixMinutesMs
        ));
        
        // Cap the end time at 11:59 PM on auction date
        const maxEndTime = new Date(property.auctionDate);
        maxEndTime.setHours(23, 59, 59, 999);
        
        if (newEndTime > maxEndTime) {
          newEndTime.setTime(maxEndTime.getTime());
        }
        
        // Update the property in database
        property.auctionEndTime = newEndTime;
        property.auctionExtensionCount = (property.auctionExtensionCount || 0) + 1;
        
        // Add to extension history if the field exists
        if (Array.isArray(property.auctionExtensionHistory)) {
          property.auctionExtensionHistory.push({
            extendedAt: now,
            previousEndTime: previousEndTime,
            newEndTime: newEndTime,
            triggeringBidId: newBid._id
          });
        }
        
        await property.save();
        
        // Notify all participants in this auction room about the extension
        io.to(auctionId).emit('auction-extended', newEndTime.toISOString());
        
        console.log(`Auction ${auctionId} extended to ${newEndTime}`);
      }
    }
    // ================ END AUCTION EXTENSION LOGIC ================
    
    // Broadcast bid update
    io.to(auctionId).emit('bid-update', bidInfo);
    
  } catch (error) {
    console.error('Error placing bid:', error);
    socket.emit('bid-error', 'Error processing bid');
  }
});

    //Handle auction timer updates
    socket.on('auction-timer', ({ auctionId, timeLeft }) => {
      io.to(auctionId).emit('timer-update', timeLeft);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.email}`);
      
      // Remove user from active auctions
      activeAuctions.forEach((data, auctionId) => {
        if (data.participants.delete(socket.user._id.toString())) {
          // Notify remaining participants
          io.to(auctionId).emit('participant-update', {
            count: data.participants.size
          });
          
          // Clean up auction data if no participants
          if (data.participants.size === 0) {
            activeAuctions.delete(auctionId);
          }
        }
      });
    });
  });

  return io;
};

module.exports = initializeSocket;