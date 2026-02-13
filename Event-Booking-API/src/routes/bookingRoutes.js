// src/routes/bookingRoutes.js
const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const { createBooking, listUserBookings, cancelBooking } = require('../controllers/bookingController');

const router = express.Router();

router.post('/', authenticate, createBooking);
router.get('/', authenticate, listUserBookings);
router.delete('/:id', authenticate, cancelBooking);

module.exports = router;
