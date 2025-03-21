const express = require('express');
const cors = require('cors');
const http = require('http'); // Add this
const initializeSocket = require('./socket/socketServer'); // Add this
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const auctionRoutes = require('./routes/auctionRegistration');
const bidRoutes=require('./routes/proertyBidRoutes');
const autoBiddingRoutes=require('./routes/autoBiddingRoutes')
const errorMiddleware = require('./middleware/errorHandler');
const adminRoutes = require('./routes/adminRoutes');
const app = express();

// Create HTTP server
const server = http.createServer(app); // Add this

// Initialize Socket.IO
const io = initializeSocket(server); // Add this
app.set('socketio', io);
// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/bids',bidRoutes);
app.use('/api/auto-bidding', autoBiddingRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorMiddleware);

// Export both app and server
module.exports = { app, server };