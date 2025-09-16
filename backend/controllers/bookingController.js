const db = require('../db');
const jwt = require('jsonwebtoken'); // 1. Import the jsonwebtoken library

exports.createBooking = async (req, res) => {
    // 2. Get the token from the request header
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied.' });
    }

    // Notice: user_id is no longer taken from the body
    const { slot_id, notes } = req.body;
    if (!slot_id) {
        return res.status(400).json({ message: 'Slot ID is required.' });
    }

    try {
        // 3. Verify the token to get the real user's ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user_id = decoded.user.id;

        // --- All the previous booking logic now uses the secure user_id ---

        // Check for existing bookings on the same day
        const [targetSlots] = await db.query('SELECT slot_date FROM TimeSlots WHERE slot_id = ?', [slot_id]);
        if (targetSlots.length === 0) {
            return res.status(404).json({ message: 'Time slot not found.' });
        }
        const bookingDate = targetSlots[0].slot_date;

        const [existingBookings] = await db.query(
            `SELECT b.booking_id FROM Bookings b
             JOIN TimeSlots ts ON b.slot_id = ts.slot_id
             WHERE b.user_id = ? AND ts.slot_date = ? AND b.status = 'confirmed'`,
            [user_id, bookingDate]
        );
        if (existingBookings.length > 0) {
            return res.status(409).json({ message: 'You already have a booking for this day.' });
        }

        // Check if the slot has capacity
        const [slots] = await db.query(
            `SELECT capacity, COUNT(b.booking_id) AS current_bookings
             FROM TimeSlots ts
             LEFT JOIN Bookings b ON ts.slot_id = b.slot_id
             WHERE ts.slot_id = ?
             GROUP BY ts.slot_id`, [slot_id]
        );
        if (slots.length === 0 || slots[0].current_bookings >= slots[0].capacity) {
            return res.status(409).json({ message: 'Slot is no longer available.' });
        }

        // Create the new booking
        await db.query(
            'INSERT INTO Bookings (user_id, slot_id, notes, status) VALUES (?, ?, ?, ?)',
            [user_id, slot_id, notes, 'confirmed']
        );

        res.status(201).json({ message: 'Booking successful!' });

    } catch (error) {
        console.error(error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token is not valid.' });
        }
        res.status(500).json({ message: 'Error creating booking.' });
    }
};

// ... (keep the getAvailableSlots function)
exports.getAvailableSlots = async (req, res) => {
    res.json({ message: "This route's logic is handled in officeRoutes.js" });
};