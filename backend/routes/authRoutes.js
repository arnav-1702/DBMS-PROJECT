// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// ROUTE 1: User Registration (Existing)
router.post('/register', async (req, res) => {
    const { fullName, email, phoneNumber, password } = req.body;

    if (!fullName || !email || !phoneNumber || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await db.query(
            'INSERT INTO Users (full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?)',
            [fullName, email, phoneNumber, passwordHash]
        );

        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});


// ROUTE 2: User Login (Existing)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const payload = {
            user: { id: user.user_id, name: user.full_name, role: user.role }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// --- NEW ROUTE ---
// ROUTE 3: Get Logged-in User's Dashboard Data
// GET /api/auth/dashboard
router.get('/dashboard', async (req, res) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        // Fetch user details
        const [users] = await db.query('SELECT user_id, full_name, email, phone_number FROM Users WHERE user_id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Fetch user's bookings with details
        const [bookings] = await db.query(
            `SELECT 
                b.booking_id, b.status,
                ts.slot_date, ts.start_time,
                s.service_name,
                o.office_name
             FROM Bookings b
             JOIN TimeSlots ts ON b.slot_id = ts.slot_id
             JOIN Services s ON ts.service_id = s.service_id
             JOIN Offices o ON ts.office_id = o.office_id
             WHERE b.user_id = ?
             ORDER BY ts.slot_date, ts.start_time`,
            [userId]
        );

        res.json({
            user: users[0],
            bookings: bookings
        });

    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Token is not valid' });
    }
});


module.exports = router;