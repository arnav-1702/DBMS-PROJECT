const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// This allows your frontend to make requests to your backend
app.use(cors()); 
// This allows the server to understand JSON data sent in requests
app.use(express.json()); 

// API Routes
// Connects all the different parts of your API
app.use('/api/offices', require('./routes/officeRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));


// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
