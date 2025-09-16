// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
// const authMiddleware = require('../middleware/auth'); // A middleware to protect routes

// Get available slots for a service on a specific date
router.get('/slots', bookingController.getAvailableSlots);

// Create a new booking (protected route)
router.post('/', /* authMiddleware, */ bookingController.createBooking);

module.exports = router;