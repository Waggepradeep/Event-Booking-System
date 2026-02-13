const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/db');
const Booking = require('../models/bookingModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
const PaymentTransaction = require('../models/paymentTransactionModel');
const { isSeatLockExpired, releaseExpiredSeatLocks } = require('../utils/seatLock');
const generateTicketPDF = require('../utils/pdfGenerator');
const sendEmail = require('../utils/emailSender');

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function amountToMinorUnits(amount) {
  return Math.round(Number(amount || 0) * 100);
}

async function markPaymentSucceededAndSendTicket(bookingId, providerPaymentId, payload) {
  let booking;
  let event;

  await sequelize.transaction(async (t) => {
    booking = await Booking.findByPk(bookingId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [{ model: User, as: 'user' }, { model: Event, as: 'event' }]
    });

    if (!booking) return;

    event = booking.event || await Event.findByPk(booking.event_id, { transaction: t });

    if (booking.payment_status !== 'paid') {
      booking.payment_status = 'paid';
      booking.payment_id = providerPaymentId || booking.payment_id || uuidv4();
      await booking.save({ transaction: t });
    }

    const amount = parseFloat(event?.price || 0) * Number(booking.seats_booked || 1);

    await PaymentTransaction.create({
      booking_id: booking.id,
      user_id: booking.user_id,
      event_id: booking.event_id,
      provider: providerPaymentId && providerPaymentId.startsWith('pi_') ? 'stripe' : 'mock',
      provider_payment_id: providerPaymentId || booking.payment_id,
      amount,
      currency: 'INR',
      status: 'succeeded',
      refund_status: 'none',
      raw_payload: payload || null,
    }, { transaction: t });
  });

  if (!booking) return;

  let pdfPath = null;
  try {
    pdfPath = await generateTicketPDF(booking, booking.event || event);
  } catch (pdfErr) {
    console.error('PDF generation failed after payment:', pdfErr);
  }

  try {
    await sendEmail(
      booking.user?.email,
      'Your Event Ticket',
      `Hello ${booking.user?.name || ''}! Your booking is confirmed. Booking ID: ${booking.id}`,
      pdfPath
    );
  } catch (emailErr) {
    console.error('Email sending failed after payment:', emailErr);
  }
}

async function markPaymentFailedAndReleaseSeats(bookingId, reason, payload) {
  await sequelize.transaction(async (t) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
      include: [{ model: Event, as: 'event' }]
    });

    if (!booking) return;

    if (booking.payment_status === 'pending') {
      const evt = booking.event || await Event.findByPk(booking.event_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (evt) {
        const nextSeats = Number(evt.available_seats || 0) + Number(booking.seats_booked || 0);
        const maxSeats = Number(evt.total_seats || nextSeats);
        evt.available_seats = Math.min(nextSeats, maxSeats);
        await evt.save({ transaction: t });
      }
      booking.payment_status = 'failed';
      await booking.save({ transaction: t });
    }

    await PaymentTransaction.create({
      booking_id: booking.id,
      user_id: booking.user_id,
      event_id: booking.event_id,
      provider: 'stripe',
      amount: parseFloat(booking.event?.price || 0) * Number(booking.seats_booked || 1),
      currency: 'INR',
      status: 'failed',
      refund_status: 'none',
      failure_reason: reason || null,
      raw_payload: payload || null,
    }, { transaction: t });
  });
}

async function initiateRefundForBooking(booking, reason) {
  const stripe = getStripeClient();
  const paymentTx = await PaymentTransaction.findOne({
    where: { booking_id: booking.id },
    order: [['id', 'DESC']]
  });

  if (!paymentTx) {
    return {
      provider: 'none',
      refundStatus: 'failed',
      message: 'No payment transaction found for refund',
    };
  }

  if (!stripe || paymentTx.provider !== 'stripe' || !paymentTx.provider_payment_id) {
    paymentTx.refund_status = 'initiated';
    paymentTx.status = 'refund_processing';
    paymentTx.failure_reason = null;
    paymentTx.raw_payload = { mode: 'mock_refund', reason: reason || 'requested_by_customer' };
    await paymentTx.save();
    return {
      provider: 'mock',
      refundStatus: 'initiated',
      message: 'Refund initiated (mock mode).',
    };
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentTx.provider_payment_id,
    metadata: {
      booking_id: String(booking.id),
      event_id: String(booking.event_id),
      user_id: String(booking.user_id),
    },
    reason: 'requested_by_customer',
  });

  paymentTx.provider_refund_id = refund.id;
  paymentTx.refund_status = ['pending', 'requires_action'].includes(refund.status) ? 'processing' : (refund.status === 'succeeded' ? 'refunded' : 'initiated');
  paymentTx.status = paymentTx.refund_status === 'refunded' ? 'refunded' : 'refund_processing';
  paymentTx.failure_reason = null;
  paymentTx.raw_payload = refund;
  await paymentTx.save();

  return {
    provider: 'stripe',
    refundStatus: paymentTx.refund_status,
    refundId: refund.id,
    message: 'Refund request accepted.',
  };
}

exports.makePayment = async (req, res, next) => {
  try {
    const bookingId = Number(req.body?.bookingId);
    if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID' });

    let booking;
    let event;

    await sequelize.transaction(async (t) => {
      await releaseExpiredSeatLocks({ transaction: t });

      booking = await Booking.findByPk(bookingId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        include: [{ model: User, as: 'user' }, { model: Event, as: 'event' }]
      });

      if (!booking) throw createHttpError(404, 'Booking not found');
      if (booking.payment_status === 'paid') throw createHttpError(400, 'Booking already paid');
      if (booking.payment_status !== 'pending') throw createHttpError(400, 'Booking is no longer payable');

      if (isSeatLockExpired(booking)) {
        const lockedEvent = await Event.findByPk(booking.event_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (lockedEvent) {
          const nextSeats = Number(lockedEvent.available_seats || 0) + Number(booking.seats_booked || 0);
          const maxSeats = Number(lockedEvent.total_seats || nextSeats);
          lockedEvent.available_seats = Math.min(nextSeats, maxSeats);
          await lockedEvent.save({ transaction: t });
        }
        booking.payment_status = 'failed';
        await booking.save({ transaction: t });
        throw createHttpError(400, 'Seat lock expired. Please book again.');
      }

      booking.payment_status = 'paid';
      booking.payment_id = uuidv4();
      await booking.save({ transaction: t });

      event = booking.event || await Event.findByPk(booking.event_id, { transaction: t });

      await PaymentTransaction.create({
        booking_id: booking.id,
        user_id: booking.user_id,
        event_id: booking.event_id,
        provider: 'mock',
        provider_payment_id: booking.payment_id,
        amount: parseFloat(event?.price || 0) * Number(booking.seats_booked || 1),
        currency: 'INR',
        status: 'succeeded',
        refund_status: 'none',
      }, { transaction: t });
    });

    let pdfPath = null;
    try {
      pdfPath = await generateTicketPDF(booking, booking.event || event);
    } catch (pdfErr) {
      console.error('PDF generation failed after payment:', pdfErr);
    }

    try {
      await sendEmail(
        booking.user?.email,
        'Your Event Ticket',
        `Hello ${booking.user?.name || ''}! Your booking is confirmed. Booking ID: ${booking.id}`,
        pdfPath
      );

      return res.json({
        message: 'Payment successful, ticket sent to email',
        paymentId: booking.payment_id,
        booking: {
          id: booking.id,
          eventTitle: event ? event.title : (booking.event ? booking.event.title : 'N/A'),
          status: booking.payment_status,
        }
      });
    } catch (emailErr) {
      console.error('Email sending failed after payment:', emailErr);
      return res.status(200).json({
        message: 'Payment successful but ticket email failed to send',
        paymentId: booking.payment_id,
        booking: {
          id: booking.id,
          eventTitle: event ? event.title : (booking.event ? booking.event.title : 'N/A'),
          status: booking.payment_status,
        },
        emailError: String(emailErr.message || emailErr),
        pdfGenerated: !!pdfPath,
      });
    }
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

exports.createStripePaymentIntent = async (req, res, next) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(400).json({ message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' });
    }

    const bookingId = Number(req.body?.bookingId);
    if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID' });

    let booking;
    let event;

    await sequelize.transaction(async (t) => {
      await releaseExpiredSeatLocks({ transaction: t });

      booking = await Booking.findByPk(bookingId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        include: [{ model: Event, as: 'event' }]
      });

      if (!booking) throw createHttpError(404, 'Booking not found');
      if (booking.user_id !== req.user.id) throw createHttpError(403, 'Forbidden');
      if (booking.payment_status === 'paid') throw createHttpError(400, 'Booking already paid');
      if (booking.payment_status !== 'pending') throw createHttpError(400, 'Booking is no longer payable');

      if (isSeatLockExpired(booking)) {
        booking.payment_status = 'failed';
        await booking.save({ transaction: t });
        throw createHttpError(400, 'Seat lock expired. Please book again.');
      }

      event = booking.event || await Event.findByPk(booking.event_id, { transaction: t });
    });

    const amount = parseFloat(event?.price || 0) * Number(booking.seats_booked || 1);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountToMinorUnits(amount),
      currency: 'inr',
      metadata: {
        booking_id: String(booking.id),
        user_id: String(booking.user_id),
        event_id: String(booking.event_id),
      },
      automatic_payment_methods: { enabled: true },
    });

    await PaymentTransaction.create({
      booking_id: booking.id,
      user_id: booking.user_id,
      event_id: booking.event_id,
      provider: 'stripe',
      provider_payment_id: paymentIntent.id,
      amount,
      currency: 'INR',
      status: paymentIntent.status,
      refund_status: 'none',
      raw_payload: paymentIntent,
    });

    return res.json({
      message: 'Payment intent created. Confirm this intent on client side.',
      bookingId: booking.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: 'INR',
      provider: 'stripe',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

exports.handleStripeWebhook = async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).send('Stripe webhook not configured');
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Invalid Stripe webhook signature:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const bookingId = Number(intent.metadata?.booking_id || 0);
      if (bookingId) {
        await markPaymentSucceededAndSendTicket(bookingId, intent.id, intent);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const bookingId = Number(intent.metadata?.booking_id || 0);
      if (bookingId) {
        await markPaymentFailedAndReleaseSeats(bookingId, intent.last_payment_error?.message || 'Payment failed', intent);
      }
    }

    if (event.type === 'charge.refunded' || event.type === 'refund.updated') {
      const obj = event.data.object;
      const paymentIntentId = obj.payment_intent || obj.payment_intent_id;
      if (paymentIntentId) {
        const tx = await PaymentTransaction.findOne({ where: { provider_payment_id: paymentIntentId }, order: [['id', 'DESC']] });
        if (tx) {
          tx.provider_refund_id = obj.id || tx.provider_refund_id;
          tx.refund_status = obj.status === 'succeeded' ? 'refunded' : (obj.status === 'failed' ? 'failed' : 'processing');
          tx.status = tx.refund_status === 'refunded' ? 'refunded' : (tx.refund_status === 'failed' ? 'refund_failed' : 'refund_processing');
          tx.failure_reason = obj.failure_reason || tx.failure_reason;
          tx.raw_payload = obj;
          await tx.save();
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook processing error:', err);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

exports.requestRefund = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.bookingId || req.body?.bookingId);
    if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID' });

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: User, as: 'user' }, { model: Event, as: 'event' }]
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (booking.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Only paid bookings can be refunded' });
    }

    const refund = await initiateRefundForBooking(booking, req.body?.reason);
    return res.json({
      message: 'Refund request processed',
      bookingId: booking.id,
      refund,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentStatus = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.bookingId);
    if (!bookingId) return res.status(400).json({ message: 'Invalid booking ID' });

    const booking = await Booking.findByPk(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const tx = await PaymentTransaction.findOne({
      where: { booking_id: bookingId },
      order: [['id', 'DESC']],
    });

    if (!tx) {
      return res.status(404).json({ message: 'No transaction found for this booking' });
    }

    return res.json({
      bookingId,
      paymentStatus: tx.status,
      refundStatus: tx.refund_status,
      provider: tx.provider,
      providerPaymentId: tx.provider_payment_id,
      providerRefundId: tx.provider_refund_id,
      amount: Number(tx.amount),
      currency: tx.currency,
      failureReason: tx.failure_reason,
      updatedAt: tx.updated_at,
    });
  } catch (err) {
    next(err);
  }
};

exports.initiateRefundForBooking = initiateRefundForBooking;
