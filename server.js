require('dotenv').config();
const { app, server } = require('./src/app'); // Modified this line
const connectDB = require('./src/config/db');

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});