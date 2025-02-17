const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const errorMiddleware = require('./middleware/errorHandler');
const app = express();
const  propertyRoutes = require('./routes/propertyRoutes')
// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties',propertyRoutes)
app.use(errorMiddleware);

module.exports = app;