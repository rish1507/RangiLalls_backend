const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

        // Broadcast bid update
        io.to(auctionId).emit('bid-update', bidInfo);

        // Store bid in database
        await AuctionBid.create({
          auctionId,
          userId: socket.user._id,
          amount: bidAmount
        });
      } catch (error) {
        console.error('Error placing bid:', error);
        socket.emit('bid-error', 'Error processing bid');
      }
    });

    // Handle auction timer updates
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