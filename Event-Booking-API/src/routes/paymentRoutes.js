// src/routes/paymentRoutes.js
const express = require('express');
const {
  makePayment,
  createStripePaymentIntent,
  requestRefund,
  getPaymentStatus,
} = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Legacy simulated pay flow
router.post('/pay', authenticate, makePayment);
// Real gateway flow (Stripe PaymentIntent)
router.post('/intent', authenticate, createStripePaymentIntent);
router.post('/refund/:bookingId', authenticate, requestRefund);
router.get('/status/:bookingId', authenticate, getPaymentStatus);

module.exports = router;
