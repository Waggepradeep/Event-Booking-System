// src/routes/adminRoutes.js
const express = require('express');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
  stats,
  popularEvents,
  getLogs,
  getOccupancyDashboard,
  getFilteredBookings,
  resendTicketEmail,
  resendRefundEmail,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/stats', authenticate, authorize('admin'), stats);
router.get('/popular-events', authenticate, authorize('admin'), popularEvents);
router.get('/logs', authenticate, authorize('admin'), getLogs);
router.get('/occupancy', authenticate, authorize('admin'), getOccupancyDashboard);
router.get('/bookings', authenticate, authorize('admin'), getFilteredBookings);
router.post('/bookings/:bookingId/resend-ticket', authenticate, authorize('admin'), resendTicketEmail);
router.post('/bookings/:bookingId/resend-refund-email', authenticate, authorize('admin'), resendRefundEmail);

module.exports = router;
