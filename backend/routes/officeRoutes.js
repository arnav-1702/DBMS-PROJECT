const express = require('express');
const router = express.Router();
const db = require('../db');

// ROUTE 1: Get ALL offices
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Offices');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching offices' });
  }
});

// ROUTE 2: Get a SINGLE office and its services
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Get office details
    const [officeRows] = await db.query('SELECT * FROM Offices WHERE office_id = ?', [id]);
    // Get services for that office
    const [serviceRows] = await db.query('SELECT * FROM Services WHERE office_id = ?', [id]);

    if (officeRows.length === 0) {
      return res.status(404).json({ message: 'Office not found' });
    }

    // Ensure the response has both 'details' and 'services' keys
    res.json({
      details: officeRows[0],
      services: serviceRows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching office details' });
  }
});

// ROUTE 3: Get available SLOTS for an office
router.get('/:officeId/slots', async (req, res) => {
    try {
        const { officeId } = req.params;
        const { serviceId, date } = req.query;

        if (!serviceId || !date) {
            return res.status(400).json({ message: 'Service ID and date are required' });
        }

        const sqlQuery = `
            SELECT 
                ts.slot_id, ts.start_time, ts.end_time, ts.capacity,
                COUNT(b.booking_id) AS current_bookings
            FROM TimeSlots ts
            LEFT JOIN Bookings b ON ts.slot_id = b.slot_id
            WHERE ts.office_id = ? AND ts.service_id = ? AND ts.slot_date = ?
            GROUP BY ts.slot_id
            HAVING current_bookings < ts.capacity;
        `;
        
        const [slots] = await db.query(sqlQuery, [officeId, serviceId, date]);
        
        const slotsWithVacancy = slots.map(slot => ({
            ...slot,
            vacant_slots: slot.capacity - slot.current_bookings
        }));

        res.json(slotsWithVacancy);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching slots' });
    }
});

module.exports = router;